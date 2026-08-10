import { useState } from "react";
import { Loader2, UserRound } from "lucide-react";
import { trpc } from "@/providers/trpc";

/**
 * Turns a server error into something a customer can act on.
 *
 * The rate limiter reports "Retry after 1959s", which is accurate and useless to
 * the person reading it.
 */
function humanReadableError(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  const retry = /retry after (\d+)s/i.exec(message);
  if (retry) {
    const minutes = Math.max(1, Math.round(Number(retry[1]) / 60));
    return `You have already sent a few requests. Please try again in about ${minutes} minute${
      minutes === 1 ? "" : "s"
    }, or email us directly.`;
  }
  if (/rate limit/i.test(message)) {
    return "You have already sent a few requests. Please try again a little later.";
  }
  return message || "Could not send that. Please try again.";
}

export interface HandoffPrefill {
  email?: string;
  name?: string;
  subject?: string;
}

/**
 * The form that reaches a person.
 *
 * Rendered inline in the transcript rather than as a separate screen, so the
 * conversation that led here stays visible while it is filled in, and so the
 * transcript can be attached without the customer having to explain it again.
 */
export function HumanHandoffForm({
  prefill,
  transcript,
  onSent,
  onCancel,
}: {
  prefill?: HandoffPrefill;
  /** Text-only snapshot of the chat so far, attached to the ticket. */
  transcript: Array<{ role: "user" | "assistant"; content: string }>;
  /** Called with the server's confirmation, plus a tracking key for anonymous tickets. */
  onSent: (result: { message: string; tracking: { ticketId: number; accessKey: string } | null }) => void;
  onCancel: () => void;
}) {
  const createTicket = trpc.support.createTicket.useMutation();

  const [email, setEmail] = useState(prefill?.email ?? "");
  const [name, setName] = useState(prefill?.name ?? "");
  const [subject, setSubject] = useState(prefill?.subject ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const canSend =
    emailValid && subject.trim().length >= 3 && message.trim().length >= 10 && !createTicket.isPending;

  const submit = async () => {
    setError(null);
    try {
      const res = await createTicket.mutateAsync({
        email: email.trim(),
        name: name.trim() || undefined,
        subject: subject.trim(),
        message: message.trim(),
        transcript: transcript.slice(-40),
        pageUrl: window.location.pathname.slice(0, 500),
      });
      onSent({ message: res.message, tracking: res.tracking });
    } catch (err) {
      setError(humanReadableError(err));
    }
  };

  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="mb-2 flex items-center gap-2">
        <UserRound className="h-4 w-4 text-brand" />
        <p className="text-[13.5px] font-semibold text-ink">Talk to a person</p>
      </div>
      <p className="mb-3 text-[12.5px] leading-relaxed text-ink-body">
        Leave this with us and someone will reply here in the chat. Your conversation so far is
        attached, so you do not need to repeat it.
      </p>

      <div className="space-y-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Your email"
          autoComplete="email"
          className="w-full rounded-lg border border-line-strong px-2.5 py-1.5 text-[13px] text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (optional)"
          autoComplete="name"
          className="w-full rounded-lg border border-line-strong px-2.5 py-1.5 text-[13px] text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint"
        />
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="What is this about?"
          maxLength={200}
          className="w-full rounded-lg border border-line-strong px-2.5 py-1.5 text-[13px] text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={4000}
          placeholder="Tell us what you need. Include a project name if it helps."
          className="w-full resize-none rounded-lg border border-line-strong px-2.5 py-1.5 text-[13px] text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint"
        />
      </div>

      {error ? <p className="mt-2 text-[12px] text-red-600">{error}</p> : null}

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[11.5px] text-ink-muted">
          {message.trim().length < 10
            ? "A sentence or two is plenty"
            : !emailValid
              ? "An email so we can reach you"
              : "Ready to send"}
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={onCancel}
            className="rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-ink-body hover:bg-mat"
          >
            Not now
          </button>
          <button
            onClick={() => void submit()}
            disabled={!canSend}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-brand-hover disabled:opacity-40"
          >
            {createTicket.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Send to support
          </button>
        </div>
      </div>
    </div>
  );
}
