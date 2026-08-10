import { create } from "zustand";

/**
 * How the editor lends its context to the support widget.
 *
 * The widget is mounted once at the app root so it can follow the user across
 * every page. The editor is mounted deep inside a route. Rather than thread
 * props through the whole tree, or move the widget inside the editor and lose it
 * everywhere else, the editor registers a small bridge here while it is open and
 * removes it when it unmounts.
 *
 * Two capabilities, deliberately separate:
 *
 *  - `describe()` is read-only text that goes into the system prompt, so the
 *    assistant can answer "why is my caption huge" with the actual settings
 *    rather than a generic answer.
 *  - `applyOps` is the one that acts. It is what the old sidebar guide used to
 *    do, and keeping it means "blur the email field" still works from the
 *    widget. Only present while the editor is open, so on the marketing pages
 *    the widget is plainly a support chat with nothing to drive.
 */

export interface EditorOp {
  op: string;
  [key: string]: unknown;
}

export interface EditorBridge {
  /** The scene the user is looking at, for ownership checks server-side. */
  stepId: number;
  /** Human-readable state summary. Goes into the prompt. */
  describe: () => string;
  /** Raw annotation state, for the ops endpoint to reason about. */
  current: () => Record<string, unknown>;
  /** Apply operations the model returned. Returns a summary to show the user. */
  applyOps: (ops: EditorOp[]) => void;
}

interface SupportContextStore {
  editor: EditorBridge | null;
  /** Called by the editor on mount and whenever the active scene changes. */
  setEditor: (bridge: EditorBridge) => void;
  clearEditor: () => void;

  /** Opening the widget from elsewhere, e.g. a "need help?" link. */
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  /** Seeded into the composer when something opens the widget with a question. */
  pendingPrompt: string | null;
  openWith: (prompt: string) => void;
  consumePendingPrompt: () => string | null;
}

export const useSupportContext = create<SupportContextStore>((set, get) => ({
  editor: null,
  setEditor: (bridge) => set({ editor: bridge }),
  clearEditor: () => set({ editor: null }),

  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),

  pendingPrompt: null,
  openWith: (prompt) => set({ isOpen: true, pendingPrompt: prompt }),
  consumePendingPrompt: () => {
    const p = get().pendingPrompt;
    if (p !== null) set({ pendingPrompt: null });
    return p;
  },
}));
