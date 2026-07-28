import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import * as cookie from "cookie";
import { createRouter, authedQuery, rateLimitByUser } from "./middleware";
import {
  getUserElevenLabsKey,
  getUserElevenLabsKeyStatus,
  setUserElevenLabsKey,
  clearUserElevenLabsKey,
} from "./queries/users";
import { getElevenLabsCredits, validateElevenLabsKey } from "./lib/tts";
import { getDb } from "./queries/connection";
import { projects, steps, renderJobs, users } from "@db/schema";
import { getSessionCookieOptions } from "./lib/cookies";
import { Session } from "@contracts/constants";

/**
 * Per-user settings — currently the "bring your own key" ElevenLabs
 * integration. Premium voices are BYOK: the plaintext key is validated against
 * ElevenLabs, encrypted at rest, and never returned to the client (only a
 * masked last-4 hint and live credit balance are exposed).
 */
export const settingsRouter = createRouter({
  /** Whether the user has a saved key + a masked hint for display. Cheap (no external call). */
  elevenLabsKeyStatus: authedQuery
    .use(rateLimitByUser(60_000, 60))
    .query(async ({ ctx }) => {
      return getUserElevenLabsKeyStatus(ctx.user!.id);
    }),

  /** Live credit balance for the user's saved key (calls ElevenLabs). Null if no/invalid key. */
  elevenLabsCredits: authedQuery
    .use(rateLimitByUser(60_000, 30))
    .query(async ({ ctx }) => {
      const key = (await getUserElevenLabsKey(ctx.user!.id)) ?? undefined;
      if (!key) return null;
      return getElevenLabsCredits(key);
    }),

  /** Validate a key against ElevenLabs and, if valid, encrypt + store it. */
  setElevenLabsKey: authedQuery
    .use(rateLimitByUser(60_000, 10))
    .input(z.object({ apiKey: z.string().min(8).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const apiKey = input.apiKey.trim();
      const credits = await validateElevenLabsKey(apiKey);
      if (!credits) {
        throw new Error(
          "That ElevenLabs API key was rejected. Double-check you copied the full key from elevenlabs.io.",
        );
      }
      await setUserElevenLabsKey(ctx.user!.id, apiKey);
      return { ok: true as const, credits, hint: apiKey.slice(-4) };
    }),

  /** Remove the user's saved key (premium voices revert to free Edge TTS). */
  removeElevenLabsKey: authedQuery
    .use(rateLimitByUser(60_000, 10))
    .mutation(async ({ ctx }) => {
      await clearUserElevenLabsKey(ctx.user!.id);
      return { ok: true as const };
    }),

  /**
   * Permanently delete the signed-in user's account: all their projects (and
   * the steps/render jobs beneath them) and the user row, then clear the
   * session cookie. Mirrors the cascading delete used by project.deleteAll.
   */
  deleteAccount: authedQuery
    .use(rateLimitByUser(300_000, 3))
    .input(z.object({ confirm: z.literal(true) }))
    .mutation(async ({ ctx }) => {
      const uid = ctx.user!.id;

      const userProjects = await getDb()
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.userId, uid));
      const projectIds = userProjects.map((p) => p.id);

      if (projectIds.length > 0) {
        await getDb().delete(renderJobs).where(inArray(renderJobs.projectId, projectIds));
        await getDb().delete(steps).where(inArray(steps.projectId, projectIds));
        await getDb().delete(projects).where(eq(projects.userId, uid));
      }
      await getDb().delete(users).where(eq(users.id, uid));

      // Invalidate the session so the deleted account can't keep browsing.
      const opts = getSessionCookieOptions(ctx.req.headers);
      ctx.resHeaders.append(
        "set-cookie",
        cookie.serialize(Session.cookieName, "", {
          httpOnly: opts.httpOnly,
          path: opts.path,
          sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
          secure: opts.secure,
          maxAge: 0,
        }),
      );
      return { success: true as const };
    }),
});
