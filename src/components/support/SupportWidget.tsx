import { useCallback, useEffect, useRef, useState } from "react";
import {
  ImagePlus,
  Loader2,
  Mic,
  MessageCircle,
  Send,
  Sparkles,
  Square,
  Plus,
  Trash2,
  UserRound,
  GripHorizontal,
  Volume2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { compressImages } from "@/lib/imageCompress";
import { useAuth } from "@/hooks/useAuth";
import { useSupportContext } from "./supportContext";
import { useSpeechInput } from "./useSpeechInput";
import { ChatMarkdown } from "./ChatMarkdown";
import { HumanHandoffForm } from "./HumanHandoff";
import { wantsHuman } from "./wantsHuman";
import { useWidgetDrag, type WidgetDrag } from "./useWidgetDrag";
import { outOfScopeEdit, outOfScopeNote } from "./editScope";

/**
 * Customer support chat, bottom-right, on every page.
 *
 * Replaces the AI guide that used to live in the editor's right sidebar. Same
 * product knowledge behind it, but reachable by a visitor who has not signed up
 * and able to look at a screenshot of whatever has gone wrong.
 *
 * Inside the editor it also picks up the scene context the editor publishes (see
 * supportContext), so "why is my caption huge" is answered from the actual
 * settings rather than in general terms.
 */

interface Attachment {
  /** data: URI, which is what the vision model is sent. */
  dataUrl: string;
  name: string;
}

interface VoiceNote {
  /** Object URL for playback of what the user recorded. */
  url: string;
  durationMs: number;
}

interface Turn {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: Attachment[];
  note?: VoiceNote;
  /** Populated lazily when the user asks to hear a reply. */
  audioUrl?: string;
  /**
   * Set on a turn rebuilt from history, whose attachment no longer exists.
   * Renders a short note in place of the image or player.
   */
  restoredAttachment?: "image" | "note";
  /**
   * Example questions offered under an answer, as one-tap chips.
   *
   * Set when the assistant was asked something unrelated to the product: a bare
   * "that is not what I do" leaves the visitor no better off, so it comes with
   * things it can actually answer.
   */
  suggestions?: string[];
  /**
   * A reply from an actual person, not the assistant. Labelled, because
   * "someone will get back to you" followed by an unlabelled message is
   * indistinguishable from the bot answering again.
   */
  fromHuman?: boolean;
}

/**
 * Where an anonymous visitor's thread lives.
 *
 * sessionStorage rather than localStorage: it survives a reload, which is the
 * case that matters when a page errors mid-conversation, but it does not leave a
 * stranger's support conversation sitting on a shared machine indefinitely.
 * Signed-in users get the server-side history instead.
 */
const ANON_STORAGE_KEY = "aivideo:support:thread";

/**
 * Tickets an anonymous visitor is waiting on an answer for.
 *
 * localStorage, unlike the thread above, because the whole point is a reply that
 * arrives minutes or hours later, possibly in a new tab. What is stored is only
 * an id and a key, never the conversation, so closing the tab does not leave a
 * stranger's support chat readable on a shared machine.
 */
const TRACKED_TICKETS_KEY = "aivideo:support:tickets";

interface TrackedTicket {
  ticketId: number;
  accessKey: string;
}

function readTrackedTickets(): TrackedTicket[] {
  try {
    const raw = localStorage.getItem(TRACKED_TICKETS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (t): t is TrackedTicket =>
          !!t && typeof (t as TrackedTicket).ticketId === "number" && typeof (t as TrackedTicket).accessKey === "string"
      )
      .slice(0, 3);
  } catch {
    return [];
  }
}

/** Only what survives a reload. Images and voice notes cannot, so they become flags. */
interface StoredTurn {
  role: "user" | "assistant";
  content: string;
  images?: number;
  note?: boolean;
}

function toStored(turns: Turn[]): StoredTurn[] {
  return turns
    .filter((t) => t.id !== "greeting" && (t.content || t.images?.length || t.note))
    .map((t) => ({
      role: t.role,
      content: t.content,
      ...(t.images?.length ? { images: t.images.length } : {}),
      ...(t.note ? { note: true } : {}),
    }));
}

/**
 * Rebuild a transcript from stored turns.
 *
 * The attachments are gone, so a note is left in their place. Saying "you sent a
 * screenshot here" is honest; silently dropping the turn would make the reply
 * that follows it look like a non-sequitur.
 */
function fromStored(stored: StoredTurn[]): Turn[] {
  return stored.map((t) => ({
    id: crypto.randomUUID(),
    role: t.role,
    content:
      t.content ||
      (t.images ? `(${t.images} screenshot${t.images === 1 ? "" : "s"} attached)` : "") ||
      (t.note ? "(voice note)" : ""),
    restoredAttachment: t.images ? "image" : t.note ? "note" : undefined,
  }));
}

const GREETING =
  "Hi. Ask me anything about AIVideo, or send a screenshot of what you are stuck on.";

/**
 * In the editor the widget can also act, so the opening line says so. Otherwise
 * the "Edit scene" tab above is the only hint that it does more than answer.
 */
const GREETING_EDITOR =
  "Hi. Ask me anything about this scene. Switch to Edit scene and I can change what is " +
  "on the canvas for you: zoom, highlight, blur, redact, overlay text, crop and the like. " +
  "The script, captions, voice and rendering are panels you use yourself, and I will show you where they are.";

const SUGGESTIONS = [
  "Why is my video shorter than my narration?",
  "How do I blur an email address?",
  "What do I get on Pro?",
];

/**
 * How far in from the right edge the widget sits.
 *
 * The editor puts a 64px vertical tab strip against the right edge (Properties,
 * Script, Voiceover, Media and the rest). At the default inset the launcher
 * landed directly on top of its lower tabs and their scroll arrows, so the
 * bottom of that strip could not be clicked at all.
 *
 * Only shifted from `md` up, which is exactly where that strip exists: below
 * that breakpoint it is hidden and becomes a horizontal row elsewhere, so the
 * default corner is already clear.
 */
const RIGHT_INSET = "right-4";
const RIGHT_INSET_EDITOR = "right-4 md:right-20";

export function SupportWidget() {
  const { isOpen, open, close, editor, consumePendingPrompt } = useSupportContext();

  const [turns, setTurns] = useState<Turn[]>([
    { id: "greeting", role: "assistant", content: GREETING },
  ]);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  /** Deleting a transcript is not undoable, so it asks first. */
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  /** Shows the contact form inline, either asked for or offered. */
  const [showHandoff, setShowHandoff] = useState(false);
  /** Ticket ids whose admin replies have already been shown, so they appear once. */
  const shownReplies = useRef<Set<string>>(new Set());

  /**
   * "Ask" answers questions. "Edit scene" turns the message into canvas
   * operations via ai.editScene and applies them through the editor bridge.
   *
   * An explicit mode rather than guessing from the wording: acting on a scene
   * when someone only asked a question is a worse failure than making them
   * flip a switch.
   */
  const [mode, setMode] = useState<"ask" | "edit">("ask");

  const { user } = useAuth();
  const signedIn = !!user;

  const chat = trpc.support.chat.useMutation();
  const editScene = trpc.ai.editScene.useMutation();
  const speak = trpc.support.speak.useMutation();
  const utils = trpc.useUtils();
  const caps = trpc.support.capabilities.useQuery(undefined, {
    // Asked once and reused: whether a microphone exists does not change while
    // someone is on the page.
    staleTime: Infinity,
    enabled: isOpen,
  });

  const history = trpc.support.history.useQuery(undefined, {
    enabled: isOpen && signedIn,
    staleTime: Infinity,
  });
  const saveHistory = trpc.support.saveHistory.useMutation();
  const newConversation = trpc.support.newConversation.useMutation();
  const deleteHistory = trpc.support.deleteHistory.useMutation();

  /**
   * Admin replies to this customer's tickets.
   *
   * Polled while the widget is open, which is what makes a human answer land in
   * the chat without a reload. 15 seconds is frequent enough to feel like a
   * conversation and slow enough to be free.
   */
  const myTickets = trpc.support.myTickets.useQuery(undefined, {
    enabled: isOpen && signedIn,
    refetchInterval: isOpen && signedIn ? 15_000 : false,
  });
  const markTicketRead = trpc.support.markTicketRead.useMutation();

  /**
   * The same thing for a visitor with no account, who has no userId to match on
   * and, without this, no way to ever receive the answer.
   */
  const [tracked, setTracked] = useState<TrackedTicket[]>(() => readTrackedTickets());
  const pollAnon = isOpen && !signedIn && tracked.length > 0;
  const trackedTickets = trpc.support.trackedTickets.useQuery(
    { tickets: tracked },
    { enabled: pollAnon, refetchInterval: pollAnon ? 15_000 : false }
  );
  const markTrackedRead = trpc.support.markTrackedTicketRead.useMutation();

  /** Start watching a ticket this browser just raised anonymously. */
  const rememberTicket = useCallback((ticket: TrackedTicket) => {
    setTracked((prev) => {
      const next = [ticket, ...prev.filter((t) => t.ticketId !== ticket.ticketId)].slice(0, 3);
      try {
        localStorage.setItem(TRACKED_TICKETS_KEY, JSON.stringify(next));
      } catch {
        // A browser refusing storage only costs the in-widget reply for this
        // visit; the ticket itself is already saved server-side.
      }
      return next;
    });
  }, []);

  const speech = useSpeechInput({ serverFallbackAvailable: caps.data?.serverTranscription });

  /** True once a thread has been restored, so it is not restored over. */
  const restoredRef = useRef(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /* Keep the newest turn in view. */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, chat.isPending]);

  /* Something elsewhere asked to open the widget with a question ready. */
  useEffect(() => {
    if (!isOpen) return;
    const pending = consumePendingPrompt();
    if (pending) setDraft(pending);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [isOpen, consumePendingPrompt]);

  /*
   * Restore the previous conversation the first time the widget is opened.
   *
   * Signed-in users get it from the server, everyone else from sessionStorage.
   * Guarded by a ref so a later refetch cannot overwrite a live conversation.
   */
  useEffect(() => {
    if (!isOpen || restoredRef.current) return;

    if (signedIn) {
      if (!history.data) return;
      restoredRef.current = true;
      const stored = history.data.messages as StoredTurn[];
      if (stored.length) setTurns((prev) => [...prev, ...fromStored(stored)]);
      return;
    }

    restoredRef.current = true;
    try {
      const raw = sessionStorage.getItem(ANON_STORAGE_KEY);
      const stored = raw ? (JSON.parse(raw) as StoredTurn[]) : [];
      if (Array.isArray(stored) && stored.length) {
        setTurns((prev) => [...prev, ...fromStored(stored)]);
      }
    } catch {
      /* unreadable or full; start fresh */
    }
  }, [isOpen, signedIn, history.data]);

  /*
   * Persist after every exchange, debounced.
   *
   * Only turns with real content are stored; attachments become flags because
   * neither a multi-megabyte data URI nor a blob URL is worth keeping.
   */
  useEffect(() => {
    if (!restoredRef.current) return;
    const stored = toStored(turns);
    if (stored.length === 0) return;

    const timer = setTimeout(() => {
      if (signedIn) {
        saveHistory.mutate({ messages: stored.slice(-60) });
      } else {
        try {
          sessionStorage.setItem(ANON_STORAGE_KEY, JSON.stringify(stored.slice(-40)));
        } catch {
          /* quota or private mode; the thread just will not survive a reload */
        }
      }
    }, 800);
    return () => clearTimeout(timer);
    // `saveHistory` is a stable mutation handle; including it would re-run this
    // on every render of the widget.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turns, signedIn]);

  /*
   * Pick the greeting when the widget opens, not when it mounts.
   *
   * The widget is mounted once at the app root and never unmounts, so anything
   * decided at mount time is decided before the visitor has been anywhere: they
   * land on the homepage or the dashboard, and the editor does not exist yet.
   * Choosing on open is what makes the editor greeting actually appear.
   *
   * Only ever rewrites the untouched greeting. Once there is a real exchange in
   * the transcript, editing the first message would be rewriting history.
   */
  useEffect(() => {
    if (!isOpen) return;
    const wanted = editor ? GREETING_EDITOR : GREETING;
    setTurns((prev) => {
      if (prev.length !== 1 || prev[0].id !== "greeting" || prev[0].content === wanted) return prev;
      return [{ ...prev[0], content: wanted }];
    });
  }, [isOpen, editor]);

  /*
   * Drop any unseen admin reply into the transcript.
   *
   * Keyed by ticket id plus reply index so a reply is shown once, and only ever
   * appended: a human answer arriving must not disturb what is already there.
   */
  useEffect(() => {
    const signedInTickets = myTickets.data ?? [];
    const anonTickets = trackedTickets.data ?? [];
    if (!signedInTickets.length && !anonTickets.length) return;

    const incoming: Turn[] = [];

    const ingest = (
      ticket: { id: number; replies: Array<{ from: string; content: string }> | null; unreadForCustomer: number },
      clearUnread: () => void
    ) => {
      (ticket.replies ?? []).forEach((reply, index) => {
        if (reply.from !== "admin") return;
        const key = `${ticket.id}:${index}`;
        if (shownReplies.current.has(key)) return;
        shownReplies.current.add(key);
        incoming.push({
          id: `admin-${key}`,
          role: "assistant",
          content: reply.content,
          fromHuman: true,
        });
      });

      if ((ticket.unreadForCustomer ?? 0) > 0) clearUnread();
    };

    for (const ticket of signedInTickets) {
      ingest(ticket, () => markTicketRead.mutate({ ticketId: ticket.id }));
    }
    for (const ticket of anonTickets) {
      const key = tracked.find((t) => t.ticketId === ticket.id)?.accessKey;
      ingest(ticket, () => {
        if (key) markTrackedRead.mutate({ ticketId: ticket.id, accessKey: key });
      });
    }

    if (incoming.length) setTurns((prev) => [...prev, ...incoming]);
    // The mutation handles are stable; including them would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myTickets.data, trackedTickets.data]);

  /** Clear the thread and start a fresh conversation. */
  const startNewChat = useCallback(async () => {
    turns.forEach((t) => t.note && URL.revokeObjectURL(t.note.url));
    audioRef.current?.pause();
    setTurns([
      { id: "greeting", role: "assistant", content: editor ? GREETING_EDITOR : GREETING },
    ]);
    setDraft("");
    setAttachments([]);

    if (signedIn) {
      try {
        await newConversation.mutateAsync();
        // The previous thread is kept server-side; this query must not hand the
        // old messages straight back on the next open.
        await utils.support.history.invalidate();
      } catch {
        toast.error("Could not start a new chat. Please try again.");
      }
    } else {
      try {
        sessionStorage.removeItem(ANON_STORAGE_KEY);
      } catch {
        /* nothing to clear */
      }
    }
  }, [turns, editor, signedIn, newConversation, utils]);

  /**
   * Remove every stored conversation, not just the visible one.
   *
   * Distinct from "New chat", which archives: that leaves the old transcript in
   * the database, which is not what someone asking to delete their history
   * means.
   */
  const deleteAllHistory = useCallback(async () => {
    turns.forEach((t) => t.note && URL.revokeObjectURL(t.note.url));
    audioRef.current?.pause();
    setConfirmingDelete(false);
    setTurns([
      { id: "greeting", role: "assistant", content: editor ? GREETING_EDITOR : GREETING },
    ]);
    setDraft("");
    setAttachments([]);

    if (signedIn) {
      try {
        await deleteHistory.mutateAsync();
        await utils.support.history.invalidate();
        toast.success("Chat history deleted.");
      } catch {
        toast.error("Could not delete your history. Please try again.");
      }
    } else {
      try {
        sessionStorage.removeItem(ANON_STORAGE_KEY);
      } catch {
        /* nothing stored */
      }
      toast.success("Chat cleared.");
    }
  }, [turns, editor, signedIn, deleteHistory, utils]);

  /* Object URLs for voice notes are revoked when the widget unmounts. */
  useEffect(() => {
    return () => {
      setTurns((prev) => {
        prev.forEach((t) => t.note && URL.revokeObjectURL(t.note.url));
        return prev;
      });
      audioRef.current?.pause();
    };
  }, []);

  const addImages = useCallback(async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) {
      toast.error("Only images can be attached.");
      return;
    }
    const room = 3 - attachments.length;
    if (room <= 0) {
      toast.error("Three images per message is the limit.");
      return;
    }

    // Reuses the pipeline the uploader already uses: a phone screenshot is
    // several megabytes, and a base64 copy of that in a JSON body is slow
    // to send and slow for the model to accept.
    const compressed = await compressImages(images.slice(0, room));
    const next = await Promise.all(
      compressed.map(
        (file) =>
          new Promise<Attachment>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve({ dataUrl: String(reader.result), name: file.name });
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          })
      )
    );
    setAttachments((prev) => [...prev, ...next].slice(0, 3));
  }, [attachments.length]);

  const send = useCallback(
    async (text: string, opts?: { note?: VoiceNote }) => {
      const body = text.trim();
      if (!body && attachments.length === 0 && !opts?.note) return;

      const userTurn: Turn = {
        id: crypto.randomUUID(),
        role: "user",
        content: body,
        images: attachments.length ? attachments : undefined,
        note: opts?.note,
      };

      const history = [...turns, userTurn];
      setTurns(history);
      setDraft("");
      setAttachments([]);

      // Asked for a person: offer the form straight away rather than letting the
      // assistant have another go at a question it has already been told it
      // cannot answer.
      if (wantsHuman(body)) {
        setShowHandoff(true);
        setTurns((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content:
              "Of course. Fill this in and a person will pick it up, and your conversation so far goes with it.",
          },
        ]);
        return;
      }

      // Asked in Edit scene for something the canvas operations cannot do. Send
      // it down the question path instead of attempting an edit that will
      // silently do nothing, and say plainly what the edits do cover.
      const beyondEditing = mode === "edit" && editor ? outOfScopeEdit(body) : null;

      // Edit mode goes to the ops endpoint instead of the support model. That
      // endpoint is authenticated and checks scene ownership server-side.
      if (mode === "edit" && editor && !beyondEditing) {
        try {
          const res = await editScene.mutateAsync({
            stepId: editor.stepId,
            instruction: body,
            current: editor.current(),
          });

          if (res.ops.length > 0) {
            editor.applyOps(res.ops as never);
          }

          setTurns((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content:
                res.ops.length > 0
                  ? `${res.summary}

Ctrl+Z undoes it if that was not what you wanted.`
                  : res.summary,
            },
          ]);
        } catch (err) {
          setTurns((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content:
                err instanceof Error
                  ? err.message
                  : "I could not turn that into an edit. Try naming the tool, for example \"add a blur over the email field\".",
            },
          ]);
        }
        return;
      }

      try {
        const res = await chat.mutateAsync({
          // The greeting is ours, not part of the conversation, and the model
          // does not need to be told what it already said.
          messages: history
            .filter((t) => t.id !== "greeting")
            .slice(-12)
            .map((t) => ({
              role: t.role,
              content: t.content,
              images: t.images?.map((a) => a.dataUrl),
            })),
          editorContext: editor?.describe() ?? undefined,
        });

        setTurns((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: beyondEditing
              ? `${outOfScopeNote(beyondEditing.subject)}

${res.reply}`
              : res.reply,
            suggestions: res.suggestions?.length ? res.suggestions : undefined,
          },
        ]);

        // The assistant cannot reach anyone, so when it has nothing useful the
        // app opens the form that can. This is what makes "a person will pick
        // this up" true rather than something it merely said.
        if (res.needHuman) setShowHandoff(true);
      } catch (err) {
        setTurns((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content:
              err instanceof Error
                ? err.message
                : "Something went wrong reaching the assistant. Please try again.",
          },
        ]);
      }
    },
    [attachments, turns, chat, editor, mode, editScene]
  );

  /* Hold-to-record, released to send as a voice note. */
  const finishRecording = useCallback(async () => {
    const { text, blob, durationMs, reason } = await speech.stop();

    if (!text) {
      // `reason` comes back from stop() rather than being read off
      // `speech.error`: that state was captured in this closure before stop()
      // ran, so it is always the previous value. Reading it is why a specific
      // cause could be known and the user still got the generic line.
      toast.error(reason || "I did not catch that. Try again, or type it.");
      return;
    }

    const note = blob ? { url: URL.createObjectURL(blob), durationMs } : undefined;
    await send(text, { note });
  }, [speech, send]);

  const playReply = useCallback(
    async (turn: Turn) => {
      audioRef.current?.pause();

      if (turn.audioUrl) {
        const audio = new Audio(turn.audioUrl);
        audioRef.current = audio;
        setSpeakingId(turn.id);
        audio.onended = () => setSpeakingId(null);
        await audio.play().catch(() => setSpeakingId(null));
        return;
      }

      setSpeakingId(turn.id);
      try {
        const res = await speak.mutateAsync({ text: turn.content.slice(0, 2000), speed: 1 });
        setTurns((prev) =>
          prev.map((t) => (t.id === turn.id ? { ...t, audioUrl: res.audioData } : t))
        );
        const audio = new Audio(res.audioData);
        audioRef.current = audio;
        audio.onended = () => setSpeakingId(null);
        await audio.play();
      } catch {
        setSpeakingId(null);
        toast.error("Could not read that aloud.");
      }
    },
    [speak]
  );

  const inEditor = !!editor;

  /**
   * Moving the widget is offered in the editor only. That is the one place with
   * something underneath worth uncovering.
   */
  const drag = useWidgetDrag(inEditor, isOpen);
  const isBusy = chat.isPending || editScene.isPending;
  const canSend = (draft.trim().length > 0 || attachments.length > 0) && !isBusy;

  /* ------------------------------------------------------------- launcher */

  if (!isOpen) {
    return <SupportLauncher onOpen={open} inEditor={inEditor} drag={drag} />;
  }

  /* ---------------------------------------------------------------- panel */

  return (
    <div
      // The hook writes the transform straight to this node, so a drag does not
      // re-render the conversation on every pointer move.
      ref={drag.attachRef}
      className={`fixed bottom-4 ${inEditor ? RIGHT_INSET_EDITOR : RIGHT_INSET} z-[70] flex h-[min(620px,calc(100dvh-2rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-lift`}
      role="dialog"
      aria-label="Support chat"
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setIsDragging(false);
        void addImages(Array.from(e.dataTransfer.files));
      }}
    >
      {/* The grab bar exists only in the editor, and it says what it is: a grip
          icon alone is a convention plenty of people have never had to learn. */}
      {drag.enabled ? (
        <div
          onPointerDown={drag.onPointerDown}
          onDoubleClick={drag.reset}
          role="separator"
          aria-label="Drag to move this window. Double click to put it back in the corner."
          title="Drag to move. Double click to reset."
          className={`flex flex-none items-center justify-center gap-1.5 border-b border-line bg-mat py-1 text-[11px] font-medium text-ink-muted select-none ${
            drag.isDragging ? "cursor-grabbing bg-brand-tint text-brand" : "cursor-grab hover:text-ink"
          }`}
        >
          <GripHorizontal className="h-3.5 w-3.5" />
          Drag to move
        </div>
      ) : null}

      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-brand-tint">
            <Sparkles className="h-4 w-4 text-brand" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-ink">Support</p>
            <p className="truncate text-[11.5px] text-ink-muted">
              {inEditor ? "Knows the scene you are editing" : "Usually replies instantly"}
            </p>
          </div>
        </div>
        <div className="flex flex-none items-center gap-1">
          {turns.length > 1 ? (
            <>
              <button
                onClick={() => void startNewChat()}
                aria-label="Start a new chat"
                title="Start a new chat, keeping this one in your history"
                className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-mat hover:text-ink"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={() => setConfirmingDelete(true)}
                aria-label="Delete chat history"
                title={
                  signedIn
                    ? "Delete all of your saved chat history"
                    : "Clear this conversation"
                }
                className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-mat hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          ) : null}
          <button
            onClick={close}
            aria-label="Close support chat"
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-mat hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {confirmingDelete ? (
        <div className="flex items-center gap-2 border-b border-line bg-red-50 px-3 py-2">
          <p className="flex-1 text-[12.5px] text-red-800">
            {signedIn
              ? "Delete all saved chat history? This cannot be undone."
              : "Clear this conversation?"}
          </p>
          <button
            onClick={() => setConfirmingDelete(false)}
            className="rounded-md px-2 py-1 text-[12.5px] font-medium text-ink-body hover:bg-white"
          >
            Cancel
          </button>
          <button
            onClick={() => void deleteAllHistory()}
            disabled={deleteHistory.isPending}
            className="rounded-md bg-red-600 px-2.5 py-1 text-[12.5px] font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleteHistory.isPending ? "Deleting…" : "Delete"}
          </button>
        </div>
      ) : null}

      {inEditor ? (
        <div className="flex gap-1 border-b border-line bg-mat px-3 py-2">
          {([
            ["ask", "Ask"],
            ["edit", "Edit scene"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              aria-pressed={mode === value}
              className={`rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors ${
                mode === value ? "bg-ink text-white" : "text-ink-body hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
          <span className="ml-auto self-center text-[11.5px] text-ink-muted">
            {mode === "edit"
              ? "Canvas only: zoom, highlight, blur, text. Undoable with Ctrl+Z"
              : "Answers only"}
          </span>
        </div>
      ) : null}

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {turns.map((turn) => (
          <div
            key={turn.id}
            className={turn.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed ${
                turn.role === "user"
                  ? "bg-brand text-white"
                  : "border border-line bg-mat text-ink"
              }`}
            >
              {turn.fromHuman ? (
                <p className="mb-1 flex items-center gap-1.5 text-[11.5px] font-semibold text-brand">
                  <UserRound className="h-3 w-3" />
                  From the AIVideo team
                </p>
              ) : null}

              {turn.images?.length ? (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {turn.images.map((img) => (
                    <img
                      key={img.dataUrl.slice(-24)}
                      src={img.dataUrl}
                      alt={img.name}
                      className="h-20 w-20 rounded-lg border border-white/25 object-cover"
                    />
                  ))}
                </div>
              ) : null}

              {turn.note ? (
                <audio
                  src={turn.note.url}
                  controls
                  className="mb-1.5 h-9 w-[220px] max-w-full"
                />
              ) : null}

              {turn.restoredAttachment ? (
                <p className="mb-1 text-[11.5px] opacity-70">
                  {turn.restoredAttachment === "image"
                    ? "Screenshot from an earlier session, no longer stored"
                    : "Voice note from an earlier session, no longer stored"}
                </p>
              ) : null}

              {turn.content ? (
                // The user's own text is shown verbatim: they typed it, and
                // rendering their asterisks as bold would be rewriting it.
                // Assistant replies go through the markdown renderer.
                turn.role === "assistant" ? (
                  <div className="chat-prose">
                    <ChatMarkdown text={turn.content} />
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{turn.content}</p>
                )
              ) : null}

              {/* One tap to ask something answerable, rather than leaving a
                  visitor to guess what this thing is for. */}
              {turn.suggestions?.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {turn.suggestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => void send(q)}
                      disabled={isBusy}
                      className="rounded-full border border-line-strong bg-white px-2.5 py-1 text-left text-[12px] font-medium text-ink-body transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              ) : null}

              {turn.role === "assistant" && turn.id !== "greeting" && turn.content ? (
                <button
                  onClick={() => void playReply(turn)}
                  className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-muted transition-colors hover:text-brand"
                >
                  {speakingId === turn.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5" />
                  )}
                  {speakingId === turn.id ? "Playing" : "Listen"}
                </button>
              ) : null}
            </div>
          </div>
        ))}

        {showHandoff ? (
          <HumanHandoffForm
            prefill={{ email: user?.email ?? undefined, name: user?.name ?? undefined }}
            transcript={toStored(turns).map((t) => ({ role: t.role, content: t.content }))}
            onSent={({ message, tracking }) => {
              setShowHandoff(false);
              // Anonymous tickets come back with a key; without recording it the
              // reply would have nowhere to arrive.
              if (tracking) rememberTicket(tracking);
              setTurns((prev) => [
                ...prev,
                { id: crypto.randomUUID(), role: "assistant", content: message },
              ]);
            }}
            onCancel={() => setShowHandoff(false)}
          />
        ) : null}

        {isBusy ? (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl border border-line bg-mat px-3.5 py-2.5 text-[13.5px] text-ink-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {mode === "edit" ? "Working on the scene" : "Thinking"}
            </div>
          </div>
        ) : null}

        {turns.length === 1 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => void send(s)}
                className="rounded-full border border-line bg-white px-3 py-1.5 text-left text-[12.5px] text-ink-body transition-colors hover:border-line-strong hover:text-ink"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* ------------------------------------------------------- composer */}
      <div className="border-t border-line px-3 pb-3 pt-2.5">
        {isDragging ? (
          <p className="mb-2 rounded-lg border border-dashed border-brand bg-brand-tint px-3 py-2 text-center text-[12.5px] font-medium text-brand">
            Drop an image to attach it
          </p>
        ) : null}

        {attachments.length ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {attachments.map((a, i) => (
              <span key={a.dataUrl.slice(-24)} className="relative">
                <img src={a.dataUrl} alt={a.name} className="h-14 w-14 rounded-lg border border-line object-cover" />
                <button
                  onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                  aria-label={`Remove ${a.name}`}
                  className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink text-white"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        {speech.isRecording ? (
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-brand/40 bg-brand-tint px-3 py-2">
            <span className="flex h-6 flex-1 items-end gap-[2px] overflow-hidden">
              {speech.levels.length === 0 ? (
                <span className="text-[12px] text-ink-muted">Listening…</span>
              ) : (
                speech.levels.map((v, i) => (
                  <span
                    key={i}
                    className="w-[3px] flex-none rounded-full bg-brand"
                    style={{ height: `${Math.max(8, v * 100)}%` }}
                  />
                ))
              )}
            </span>
            <button onClick={speech.cancel} className="text-[12px] font-medium text-ink-muted hover:text-ink">
              Cancel
            </button>
            <button
              onClick={() => void finishRecording()}
              className="grid h-8 w-8 place-items-center rounded-full bg-brand text-white"
              aria-label="Stop recording and send"
            >
              <Square className="h-3 w-3" fill="currentColor" />
            </button>
          </div>
        ) : null}

        {speech.interim ? (
          <p className="mb-1.5 px-1 text-[12.5px] italic text-ink-muted">{speech.interim}</p>
        ) : null}

        <div className="flex items-end gap-1.5">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void addImages(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            aria-label="Attach an image"
            title="Attach a screenshot"
            className="grid h-9 w-9 flex-none place-items-center rounded-lg text-ink-muted transition-colors hover:bg-mat hover:text-ink"
          >
            <ImagePlus className="h-[18px] w-[18px]" />
          </button>

          {speech.engine !== "none" ? (
            <button
              onClick={() => (speech.isRecording ? void finishRecording() : void speech.start())}
              aria-label={speech.isRecording ? "Stop recording" : "Record a voice note"}
              title={
                speech.engine === "server" && !caps.data?.serverTranscription
                  ? "Voice notes need server transcription, which is not set up"
                  : "Record a voice note"
              }
              disabled={speech.isTranscribing}
              className={`grid h-9 w-9 flex-none place-items-center rounded-lg transition-colors ${
                speech.isRecording
                  ? "bg-brand text-white"
                  : "text-ink-muted hover:bg-mat hover:text-ink"
              }`}
            >
              {speech.isTranscribing ? (
                <Loader2 className="h-[18px] w-[18px] animate-spin" />
              ) : (
                <Mic className="h-[18px] w-[18px]" />
              )}
            </button>
          ) : null}

          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onPaste={(e) => {
              // Pasting a screenshot straight from the clipboard is how most
              // people will actually attach one.
              const files = Array.from(e.clipboardData.files);
              if (files.some((f) => f.type.startsWith("image/"))) {
                e.preventDefault();
                void addImages(files);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (canSend) void send(draft);
              }
            }}
            rows={1}
            placeholder={
              mode === "edit"
                ? "Describe the change, e.g. blur the email field…"
                : inEditor
                  ? "Ask about this scene…"
                  : "Ask anything…"
            }
            className="max-h-28 min-h-9 flex-1 resize-none rounded-lg border border-line-strong bg-white px-3 py-2 text-[14px] text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint"
          />

          <button
            onClick={() => void send(draft)}
            disabled={!canSend}
            aria-label="Send"
            className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-brand text-white transition-colors hover:bg-brand-hover disabled:opacity-40"
          >
            <Send className="h-[16px] w-[16px]" />
          </button>
        </div>

        {speech.error ? (
          <p className="mt-1.5 px-1 text-[12px] text-amber-600">{speech.error}</p>
        ) : null}

        {/* Always available, because the phrase matching that offers the form
            automatically is a heuristic and will miss ways of asking. */}
        {!showHandoff ? (
          <button
            onClick={() => setShowHandoff(true)}
            className="mt-1.5 inline-flex items-center gap-1 px-1 text-[11.5px] text-ink-muted transition-colors hover:text-brand"
          >
            <UserRound className="h-3 w-3" />
            Talk to a person instead
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- launcher */

/**
 * The closed state: a round button with a label beside it.
 *
 * The label says something different in the editor, because the widget can do
 * something different there. On the marketing pages it only answers questions,
 * so "Ask me anything" is the whole truth. In the editor it can also act on the
 * scene, and a launcher that only advertises questions leaves that undiscovered.
 *
 * Two lines rather than one long sentence: a single-line version of this is wide
 * enough to sit over the properties panel while the widget is closed, which is
 * the problem we just finished fixing for the button itself.
 *
 * Hidden below `sm` in both cases, where a pill wide enough to read would cover
 * a usable part of the page.
 */
function SupportLauncher({
  onOpen,
  inEditor,
  drag,
}: {
  onOpen: () => void;
  inEditor: boolean;
  drag: WidgetDrag;
}) {
  const [dismissedLabel, setDismissedLabel] = useState(false);
  const { attachRef, enabled: canDrag, isDragging, onPointerDown, reset, wasDragged } = drag;

  return (
    <div
      ref={attachRef}
      className={`fixed bottom-4 ${inEditor ? RIGHT_INSET_EDITOR : RIGHT_INSET} z-[70] flex items-center gap-2`}
    >
      {!dismissedLabel ? (
        <span
          className={`hidden items-center gap-2 border border-line bg-white py-2 pl-3.5 pr-2 font-medium text-ink shadow-soft sm:flex ${
            inEditor ? "rounded-2xl" : "rounded-full"
          }`}
        >
          {inEditor ? (
            <span className="leading-tight">
              <span className="block text-[13.5px]">Ask me anything</span>
              <span className="block text-[12px] text-ink-muted">
                or to zoom, highlight or blur something
              </span>
              <span className="block text-[11px] text-ink-muted">
                In the way? Drag the grip to move me.
              </span>
            </span>
          ) : (
            <span className="text-[13.5px]">Ask me anything</span>
          )}
          <button
            onClick={() => setDismissedLabel(true)}
            aria-label="Hide this label"
            className="grid h-5 w-5 flex-none place-items-center self-start rounded-full text-ink-muted transition-colors hover:bg-mat hover:text-ink"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ) : null}

      <span className="relative flex-none">
        <button
          onClick={() => {
            // A drag that ends over the button is not a click. Without this the
            // widget opens every time it is moved.
            if (wasDragged()) return;
            onOpen();
          }}
          aria-label={
            inEditor
              ? "Open support chat: ask a question or ask for a small edit to this scene"
              : "Open support chat, ask me anything"
          }
          className="grid place-items-center rounded-full bg-brand text-white shadow-lift transition-transform duration-150 hover:scale-105 active:scale-95"
          style={{ height: 52, width: 52 }}
        >
          <MessageCircle className="h-[22px] w-[22px]" />
        </button>

        {/* The grip sits on the bubble rather than beside it, so it cannot be
            mistaken for a second button that does something else. */}
        {canDrag ? (
          <span
            onPointerDown={onPointerDown}
            onDoubleClick={reset}
            role="separator"
            aria-label="Drag to move the support button. Double click to put it back in the corner."
            title="Drag to move. Double click to reset."
            className={`absolute -left-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full border border-line bg-white text-ink-muted shadow-soft select-none ${
              isDragging ? "cursor-grabbing text-brand" : "cursor-grab hover:text-ink"
            }`}
          >
            <GripHorizontal className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </span>
    </div>
  );
}
