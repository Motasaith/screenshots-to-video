/**
 * The customer support widget's backend.
 *
 * Public on purpose: the widget sits on the marketing pages, so a visitor with
 * no account has to be able to ask a question. That means every procedure here
 * is rate limited by IP rather than by user, and nothing reads or writes
 * project data. The one exception is the editor context the client sends, which
 * is treated as untrusted text and only ever pasted into a prompt.
 */

import { z } from "zod";
import { randomUUID } from "node:crypto";
import {
  createRouter,
  publicQuery,
  authedQuery,
  rateLimitByIP,
  rateLimitByUser,
  userError,
} from "./middleware";
import { getDb } from "./queries/connection";
import { supportChats, supportTickets, projects, renderJobs } from "@db/schema";
import { eq, desc, lt, and, count, inArray } from "drizzle-orm";
import { chatCompletion } from "./lib/llm";
import { buildSupportSystemPrompt, SUGGESTED_QUESTIONS } from "./lib/productKnowledge";
import { freeVideoAllowance, getSettings, promoActive } from "./lib/appSettings";
import { parseSupportReply } from "./lib/supportReply";
import { generateTTSAudio, speedToRate } from "./lib/tts";
import { transcribeAudio, whisperAvailable } from "./lib/whisper";
import { createLogger } from "./lib/logger";
import { env } from "./lib/env";
import { emailConfigured, notifyAdminOfTicket } from "./lib/notify";
import fs from "fs/promises";

const log = createLogger({ path: "supportRouter" });

/** Keeps a single request from becoming an unbounded prompt. */
const MAX_TURNS = 16;
const MAX_CHARS_PER_MESSAGE = 4000;
const MAX_IMAGES_PER_MESSAGE = 3;
/** ~8 MB of base64 is about 6 MB of image. Above that the upstream call stalls. */
const MAX_IMAGE_CHARS = 8_000_000;
/** A voice note, not a podcast. 10 MB of base64 is roughly two minutes of Opus. */
const MAX_AUDIO_CHARS = 10_000_000;

const imageSchema = z
  .string()
  .max(MAX_IMAGE_CHARS)
  .refine((v) => /^data:image\/(png|jpe?g|webp|gif);base64,/.test(v), {
    message: "Images must be a base64 data URI",
  });

const turnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(MAX_CHARS_PER_MESSAGE),
  images: z.array(imageSchema).max(MAX_IMAGES_PER_MESSAGE).optional(),
});


/* ------------------------------------------------------------------ history */

/**
 * How much of a conversation is kept.
 *
 * A support thread that has run past this is not a thread any more, and the
 * model only ever sees the last dozen turns regardless.
 */
const MAX_STORED_TURNS = 60;
/** Conversations kept per user before the oldest are dropped. */
const MAX_CONVERSATIONS = 20;

const storedTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(MAX_CHARS_PER_MESSAGE),
  images: z.number().int().min(0).max(MAX_IMAGES_PER_MESSAGE).optional(),
  note: z.boolean().optional(),
});


/**
 * The signed-in customer's real numbers, for the system prompt.
 *
 * Two small queries rather than a join: the project count and the newest render
 * are independent, and running them together in parallel costs one round trip.
 * Returns null for anonymous visitors, who have no account to describe.
 */
async function loadAccountFacts(user: {
  id: number;
  plan: string;
  credits: number;
  videosCreatedThisMonth: number;
}): Promise<import("./lib/productKnowledge").SupportAccountFacts | null> {
  try {
    const db = getDb();

    const [[projectRow], projectIds] = await Promise.all([
      db.select({ value: count() }).from(projects).where(eq(projects.userId, user.id)),
      db.select({ id: projects.id }).from(projects).where(eq(projects.userId, user.id)),
    ]);

    let lastRenderStatus: string | null = null;
    let lastRenderWhen: string | null = null;

    if (projectIds.length > 0) {
      const [job] = await db
        .select({ status: renderJobs.status, stage: renderJobs.stage, createdAt: renderJobs.createdAt })
        .from(renderJobs)
        .where(inArray(renderJobs.projectId, projectIds.map((p) => p.id)))
        .orderBy(desc(renderJobs.id))
        .limit(1);

      if (job) {
        lastRenderStatus = job.status === "processing" ? `in progress (${job.stage ?? "running"})` : job.status;
        lastRenderWhen = relativeTime(job.createdAt);
      }
    }

    return {
      plan: user.plan,
      credits: user.credits,
      videosThisMonth: user.videosCreatedThisMonth,
      projectCount: projectRow?.value ?? 0,
      lastRenderStatus,
      lastRenderWhen,
    };
  } catch (err) {
    // Account context is an enhancement. If these queries fail the chat still
    // answers, just without the numbers.
    log.warn("Could not load account facts for support chat", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/** "3 days ago" rather than a timestamp, which reads badly inside a prompt. */
function relativeTime(when: Date | string): string {
  const then = new Date(when).getTime();
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export const supportRouter = createRouter({
  /**
   * What the widget can offer in this deployment.
   *
   * The client asks once on open so it can decide whether to show a microphone
   * at all, instead of showing one and failing when it is pressed.
   */
  capabilities: publicQuery
    .use(rateLimitByIP(60_000, 30))
    .query(async () => ({
      chat: !!env.llmBaseUrl,
      vision: !!env.llmBaseUrl && !!env.visionLlmModel,
      /** Server-side transcription, for browsers with no Web Speech API. */
      serverTranscription: await whisperAvailable(),
      /** Reading replies aloud always works: TTS is already part of the product. */
      speech: true,
    })),

  /**
   * One conversational turn.
   *
   * Not streamed. tRPC over `httpBatchLink` has no streaming transport here, and
   * adding an SSE endpoint for this would mean a second auth path and a second
   * error path. The widget shows a typing indicator instead; a support answer is
   * short enough that the difference is a second or two.
   */
  chat: publicQuery
    // 20 messages a minute per IP. Generous for a person, useless for a script.
    .use(rateLimitByIP(60_000, 20))
    .input(
      z.object({
        /** Whole visible thread. The widget is stateless server-side. */
        messages: z.array(turnSchema).min(1).max(MAX_TURNS),
        /**
         * Scene summary when the widget is open inside the editor. Untrusted
         * text from the client: it is context for the model, never a command.
         */
        editorContext: z.string().max(4000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!env.llmBaseUrl) {
        throw userError("Support chat is not configured on this server", "PRECONDITION_FAILED");
      }

      const account = ctx.user ? await loadAccountFacts(ctx.user) : null;
      const settings = await getSettings();

      const hasImages = input.messages.some((m) => m.images?.length);

      // The vision model only earns its cost when there is something to look
      // at; text-only turns go to the cheaper, faster text model.
      const model = hasImages ? env.visionLlmModel : env.llmModel;

      const messages = [
        {
          role: "system" as const,
          // `ctx.user` is populated on a public procedure too when a session
          // cookie is present, so a signed-in customer's plan can be named
          // without making the whole endpoint authenticated. Without this the
          // prompt kept saying it did not know whether they had an account,
          // even for a Pro customer asking why 4K was unavailable.
          content: buildSupportSystemPrompt({
            plan: ctx.user?.plan ?? null,
            account,
            editorContext: input.editorContext ?? null,
            // Read live, so the assistant stops quoting a limit the app does not
            // enforce. It used to say "5 videos a month" while the code allowed 14
            // a week.
            freeVideos: freeVideoAllowance(settings),
            promoLabel: promoActive(settings) ? settings.promoLabel : null,
          }),
        },
        ...input.messages.map((m) => {
          if (!m.images?.length) {
            return { role: m.role, content: m.content };
          }
          // Multimodal turns use the content-parts array. Text first: the
          // models follow the instruction more reliably when it precedes the
          // image rather than trailing it.
          return {
            role: m.role,
            content: [
              { type: "text", text: m.content || "What is wrong here?" },
              ...m.images.map((url) => ({ type: "image_url", image_url: { url } })),
            ],
          };
        }),
      ];

      try {
        const reply = await chatCompletion(messages, {
          model,
          temperature: 0.4,
          maxTokens: 600,
        });

        // Markers out, false "I have contacted the team" claims out, so what
        // the customer reads is only ever something that actually happened.
        const parsed = parseSupportReply(reply);

        return {
          reply: parsed.reply || "I did not catch that. Could you rephrase?",
          usedVision: hasImages,
          /** The widget opens the contact form. */
          needHuman: parsed.needHuman,
          /** The widget offers example questions instead. */
          offTopic: parsed.offTopic,
          /** Only sent when they are worth showing, to keep the payload small. */
          suggestions: parsed.offTopic ? [...SUGGESTED_QUESTIONS] : [],
        };
      } catch (err) {
        // A degenerate or corrupt image makes the upstream return a bare 500
        // with no explanation, so the likely cause is named here rather than
        // surfacing "Internal Server Error" to someone asking for help.
        log.error("Support chat failed", err, { hasImages, model });
        throw userError(
          hasImages
            ? "I could not read that image. Try a PNG or JPEG screenshot of the whole window."
            : "The assistant is unavailable right now. Please try again in a moment."
        );
      }
    }),

  /**
   * Transcribe a voice note.
   *
   * Only reached by browsers without the Web Speech API. Where the browser can
   * transcribe, it does, and no audio is uploaded at all.
   */
  transcribe: publicQuery
    .use(rateLimitByIP(60_000, 10))
    .input(
      z.object({
        /** base64 body of the recording, without the data: prefix. */
        audio: z.string().max(MAX_AUDIO_CHARS),
        mimeType: z.string().max(100).optional(),
      })
    )
    .mutation(async ({ input }) => {
      if (!(await whisperAvailable())) {
        throw userError(
          "This browser cannot transcribe speech and the server has no transcriber configured. Please type your message.",
          "PRECONDITION_FAILED"
        );
      }

      const buffer = Buffer.from(input.audio, "base64");
      if (buffer.length === 0) throw userError("That recording was empty.");

      try {
        const { text } = await transcribeAudio(buffer, { mimeType: input.mimeType });
        if (!text) {
          return { text: "", empty: true as const };
        }
        return { text, empty: false as const };
      } catch (err) {
        log.error("Transcription failed", err, { bytes: buffer.length });
        throw userError("I could not make out that recording. Try again, or type it instead.");
      }
    }),

  /**
   * Read a reply aloud, reusing the TTS the product already ships.
   *
   * Returned as a data URI rather than a file, because these clips are
   * throwaway: nothing should accumulate in storage because someone tapped play
   * on a support answer.
   */
  speak: publicQuery
    .use(rateLimitByIP(60_000, 20))
    .input(
      z.object({
        text: z.string().min(1).max(2000),
        speed: z.number().min(0.5).max(2).default(1),
      })
    )
    .mutation(async ({ input }) => {
      const { filePath } = await generateTTSAudio(input.text, {
        // A built-in voice deliberately: reading support answers aloud must not
        // spend a customer's ElevenLabs credits.
        voice: "en-US-AvaMultilingualNeural",
        rate: speedToRate(input.speed),
      });

      try {
        const buffer = await fs.readFile(filePath);
        const mime = filePath.endsWith(".wav") ? "audio/wav" : "audio/mp3";
        return { audioData: `data:${mime};base64,${buffer.toString("base64")}` };
      } finally {
        await fs.unlink(filePath).catch(() => {});
      }
    }),

  /* ---------------------------------------------------------------- history */

  /**
   * The signed-in user's active conversation.
   *
   * Anonymous visitors get nothing here and the widget keeps their thread in
   * sessionStorage instead: persisting chats for people we cannot identify would
   * mean storing them against an IP, which is a worse idea than losing them.
   */
  history: authedQuery
    .use(rateLimitByUser(60_000, 30))
    .query(async ({ ctx }) => {
      const [row] = await getDb()
        .select()
        .from(supportChats)
        .where(eq(supportChats.userId, ctx.user!.id))
        .orderBy(desc(supportChats.id))
        .limit(1);

      if (!row) return { conversationId: null, messages: [], updatedAt: null };

      return {
        conversationId: row.id,
        messages: row.messages ?? [],
        updatedAt: row.updatedAt,
      };
    }),

  /**
   * Replace the active conversation with what the widget currently shows.
   *
   * A whole-thread write rather than an append: the client is the authority on
   * what the transcript looks like, and reconciling per-turn appends against a
   * widget that can also be reset is more moving parts than this is worth.
   */
  saveHistory: authedQuery
    .use(rateLimitByUser(60_000, 60))
    .input(z.object({ messages: z.array(storedTurnSchema).max(MAX_STORED_TURNS) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      const [row] = await db
        .select({ id: supportChats.id })
        .from(supportChats)
        .where(eq(supportChats.userId, ctx.user!.id))
        .orderBy(desc(supportChats.id))
        .limit(1);

      if (row) {
        await db
          .update(supportChats)
          .set({ messages: input.messages })
          .where(eq(supportChats.id, row.id));
        return { conversationId: row.id };
      }

      await db.insert(supportChats).values({
        userId: ctx.user!.id,
        messages: input.messages,
      });

      const [created] = await db
        .select({ id: supportChats.id })
        .from(supportChats)
        .where(eq(supportChats.userId, ctx.user!.id))
        .orderBy(desc(supportChats.id))
        .limit(1);

      return { conversationId: created?.id ?? null };
    }),

  /**
   * Start a new conversation.
   *
   * Inserts an empty row rather than clearing the old one, so the previous
   * thread is still recoverable. Trims the oldest beyond MAX_CONVERSATIONS so
   * this cannot grow without bound.
   */
  newConversation: authedQuery
    .use(rateLimitByUser(60_000, 20))
    .mutation(async ({ ctx }) => {
      const db = getDb();
      await db.insert(supportChats).values({ userId: ctx.user!.id, messages: [] });

      // Keep the newest MAX_CONVERSATIONS. Reading the cutoff id first keeps
      // this to one delete rather than a row-by-row loop.
      const keep = await db
        .select({ id: supportChats.id })
        .from(supportChats)
        .where(eq(supportChats.userId, ctx.user!.id))
        .orderBy(desc(supportChats.id))
        .limit(MAX_CONVERSATIONS);

      const cutoff = keep.at(-1)?.id;
      if (cutoff && keep.length === MAX_CONVERSATIONS) {
        await db
          .delete(supportChats)
          .where(and(eq(supportChats.userId, ctx.user!.id), lt(supportChats.id, cutoff)));
      }

      return { ok: true as const };
    }),

  /**
   * Delete every stored conversation for this user.
   *
   * A true delete rather than the archive that `newConversation` performs. Once
   * we keep transcripts, someone has to be able to remove them, and "start a new
   * chat" quietly leaving the old one in the database is not that.
   */
  deleteHistory: authedQuery
    .use(rateLimitByUser(60_000, 10))
    .mutation(async ({ ctx }) => {
      const result = await getDb()
        .delete(supportChats)
        .where(eq(supportChats.userId, ctx.user!.id));
      log.info("Support history deleted", { userId: ctx.user!.id });
      return { ok: true as const, deleted: (result as unknown as { rowsAffected?: number }).rowsAffected ?? null };
    }),

  /* ------------------------------------------------------- human handoff */

  /**
   * Raise a request for a person.
   *
   * Public, because a visitor evaluating the product is exactly the person most
   * likely to want a human. Signed-in customers get their account attached so an
   * admin does not have to go looking for it.
   */
  createTicket: publicQuery
    // Three an hour per IP. Enough for a genuine back and forth, not enough to
    // be worth using as a mailer.
    .use(rateLimitByIP(3_600_000, 3))
    .input(
      z.object({
        email: z.string().email().max(320),
        name: z.string().max(255).optional(),
        subject: z.string().min(3).max(200),
        message: z.string().min(10).max(4000),
        /** Snapshot of the chat, so the admin sees what was already tried. */
        transcript: z.array(storedTurnSchema).max(40).optional(),
        pageUrl: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const account = ctx.user ? await loadAccountFacts(ctx.user) : null;

      const accountSummary = account
        ? [
            `plan ${account.plan}`,
            `${account.credits} credits`,
            `${account.videosThisMonth} videos this month`,
            `${account.projectCount} projects`,
            account.lastRenderStatus ? `last render ${account.lastRenderStatus}` : "no renders yet",
          ].join(", ")
        : "no account (anonymous visitor)";

      // A visitor with no account has nothing to poll by: `myTickets` matches on
      // userId, and there is no email transport. This key, kept in their
      // browser, is what lets the reply reach them in the widget.
      const accessKey = ctx.user ? null : randomUUID();

      const [inserted] = await getDb().insert(supportTickets).values({
        userId: ctx.user?.id ?? null,
        accessKey,
        email: input.email,
        name: input.name ?? ctx.user?.name ?? null,
        subject: input.subject,
        message: input.message,
        // Only the text is kept. Images and voice notes are already excluded
        // upstream, so a ticket cannot become an attachment store either.
        transcript: (input.transcript ?? []).map((t) => ({ role: t.role, content: t.content })),
        pageUrl: input.pageUrl ?? null,
        accountSummary,
      }).$returningId();

      log.info("Support ticket raised", {
        userId: ctx.user?.id,
        signedIn: !!ctx.user,
        subject: input.subject.slice(0, 60),
      });

      // Notify however this deployment is configured to. Deliberately after the
      // insert and never awaited into the response: a notification that fails
      // must not lose the ticket.
      void notifyAdminOfTicket({
        subject: input.subject,
        email: input.email,
        signedIn: !!ctx.user,
      });

      return {
        ok: true as const,
        /** Present only for anonymous tickets; the widget stores it locally. */
        tracking: accessKey ? { ticketId: inserted.id, accessKey } : null,
        // Only promise the email when one can actually be sent. Saying "we will
        // email you" on a deployment with no mail provider is a broken promise
        // the customer has no way to detect.
        message: emailConfigured()
          ? "Thanks. A person will pick this up and reply here, and by email if you are away."
          : "Thanks. A person will pick this up and reply right here in this chat, so keep an eye on it.",
      };
    }),

  /**
   * The signed-in customer's tickets, including any admin replies.
   *
   * Polled by the widget while it is open, which is what makes an admin answer
   * appear in the chat without the customer reloading. Anonymous visitors cannot
   * poll: without an account there is nothing to key on but an email address,
   * and letting anyone read tickets by guessing addresses would be a leak.
   */
  myTickets: authedQuery
    .use(rateLimitByUser(60_000, 60))
    .query(async ({ ctx }) => {
      const rows = await getDb()
        .select({
          id: supportTickets.id,
          subject: supportTickets.subject,
          status: supportTickets.status,
          replies: supportTickets.replies,
          unreadForCustomer: supportTickets.unreadForCustomer,
          createdAt: supportTickets.createdAt,
          updatedAt: supportTickets.updatedAt,
        })
        .from(supportTickets)
        .where(eq(supportTickets.userId, ctx.user!.id))
        .orderBy(desc(supportTickets.id))
        .limit(5);

      return rows;
    }),

  /**
   * Replies on tickets a visitor is tracking locally.
   *
   * Public, because the ticket may have been raised without an account. The key
   * is the whole authorisation, so a wrong or missing key returns nothing rather
   * than an error that would confirm the ticket exists.
   */
  trackedTickets: publicQuery
    .use(rateLimitByIP(60_000, 60))
    .input(
      z.object({
        tickets: z.array(z.object({ ticketId: z.number(), accessKey: z.string().max(64) })).max(3),
      })
    )
    .query(async ({ input }) => {
      if (input.tickets.length === 0) return [];

      const db = getDb();
      const rows = await db
        .select({
          id: supportTickets.id,
          subject: supportTickets.subject,
          status: supportTickets.status,
          replies: supportTickets.replies,
          unreadForCustomer: supportTickets.unreadForCustomer,
          accessKey: supportTickets.accessKey,
        })
        .from(supportTickets)
        .where(
          inArray(
            supportTickets.id,
            input.tickets.map((t) => t.ticketId)
          )
        );

      // Match the key in the application rather than the query so a timing
      // difference cannot be used to enumerate ticket ids.
      return rows
        .filter((row) => {
          const asked = input.tickets.find((t) => t.ticketId === row.id);
          return !!asked && !!row.accessKey && asked.accessKey === row.accessKey;
        })
        // The key never travels back out; the caller already has it.
        .map((row) => ({
          id: row.id,
          subject: row.subject,
          status: row.status,
          replies: row.replies,
          unreadForCustomer: row.unreadForCustomer,
        }));
    }),

  /** Clear the unread flag on an anonymous ticket the visitor has now seen. */
  markTrackedTicketRead: publicQuery
    .use(rateLimitByIP(60_000, 60))
    .input(z.object({ ticketId: z.number(), accessKey: z.string().max(64) }))
    .mutation(async ({ input }) => {
      await getDb()
        .update(supportTickets)
        .set({ unreadForCustomer: 0 })
        .where(
          and(
            eq(supportTickets.id, input.ticketId),
            eq(supportTickets.accessKey, input.accessKey)
          )
        );
      return { ok: true as const };
    }),

  /** Add the customer's side of a ticket conversation. */
  replyToTicket: authedQuery
    .use(rateLimitByUser(60_000, 20))
    .input(z.object({ ticketId: z.number(), message: z.string().min(1).max(4000) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [ticket] = await db
        .select()
        .from(supportTickets)
        .where(and(eq(supportTickets.id, input.ticketId), eq(supportTickets.userId, ctx.user!.id)))
        .limit(1);

      if (!ticket) throw userError("Ticket not found", "NOT_FOUND");

      const replies = [
        ...(ticket.replies ?? []),
        { from: "customer" as const, content: input.message, at: new Date().toISOString() },
      ];

      await db
        .update(supportTickets)
        .set({ replies, status: ticket.status === "resolved" ? "open" : ticket.status })
        .where(eq(supportTickets.id, ticket.id));

      return { ok: true as const };
    }),

  /** Clear the unread flag once the customer has seen the admin's reply. */
  markTicketRead: authedQuery
    .use(rateLimitByUser(60_000, 60))
    .input(z.object({ ticketId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const result = await getDb()
        .update(supportTickets)
        .set({ unreadForCustomer: 0 })
        .where(and(eq(supportTickets.id, input.ticketId), eq(supportTickets.userId, ctx.user!.id)));

      /*
       * Report what happened rather than always claiming success.
       *
       * The condition above already meant somebody else's ticket was never touched,
       * but the endpoint answered `{ ok: true }` either way, so a caller could not
       * tell "marked as read" from "that is not your ticket". Nothing was leaking; the
       * answer was just untrue.
       */
      const header = Array.isArray(result) ? result[0] : result;
      const affected = Number((header as { affectedRows?: number } | undefined)?.affectedRows ?? 0);
      if (affected === 0) throw userError("Ticket not found", "NOT_FOUND");

      return { ok: true as const };
    }),
});
