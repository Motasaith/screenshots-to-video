import { useState } from "react";
import { PageShell } from "@/components/site/PageShell";

const KINDS = ["Bug report", "Feature request", "Something else"] as const;

export default function Feedback() {
  const [kind, setKind] = useState<(typeof KINDS)[number]>("Bug report");

  return (
    <PageShell
      title="Feedback"
      description="Report a bug or suggest a feature for AIVideo."
      canonical="https://aivideo.ai/feedback"
      lede="Tell us what broke or what is missing. Both are useful."
    >
      <form
        className="card card-pad"
        onSubmit={(e) => {
          // No backend behind this yet; prevented so nothing typed is lost.
          e.preventDefault();
        }}
      >
        <fieldset>
          <legend className="text-[14px] font-medium text-ink">What kind of feedback is this?</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {KINDS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setKind(option)}
                aria-pressed={kind === option}
                className={`rounded-lg border px-3.5 py-2 text-[14px] font-medium transition-colors ${
                  kind === option
                    ? "border-ink bg-ink text-white"
                    : "border-line-strong bg-white text-ink-body hover:text-ink"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-7">
          <label htmlFor="details" className="mb-1.5 block text-[14px] font-medium text-ink">
            Details
          </label>
          <textarea
            id="details"
            name="details"
            rows={9}
            className="field"
            placeholder={
              kind === "Bug report"
                ? "What did you do, what happened, and what did you expect instead?"
                : "What are you trying to do that the product will not let you do?"
            }
          />
          <p className="mt-2 text-[13px] text-ink-muted">
            For a bug, a project ID and a rough time helps us find it in the logs.
          </p>
        </div>

        <button type="submit" className="btn btn-primary mt-6">
          Send feedback
        </button>
      </form>
    </PageShell>
  );
}
