import { PageShell } from "@/components/site/PageShell";

type ChangeType = "added" | "improved" | "fixed";

const UPDATES: Array<{
  version: string;
  date: string;
  changes: Array<{ type: ChangeType; text: string }>;
}> = [
  {
    version: "3.0.0",
    date: "13 July 2026",
    changes: [
      { type: "added", text: "Admin dashboard with usage stats, user management, a log viewer and system controls." },
      { type: "added", text: "File-based logging with automatic rotation and 30 day retention." },
      { type: "added", text: "Rate limiting across every endpoint, including auth and admin routes." },
      { type: "improved", text: "Guest mode removed. An account is now required for all features." },
      { type: "improved", text: "Collapsed the workflow to three steps: create, edit, render." },
      { type: "fixed", text: "Removed dead code and the legacy studio system." },
    ],
  },
  {
    version: "2.0.0",
    date: "11 June 2026",
    changes: [
      { type: "added", text: "Proactive AI guide: a context-aware assistant that watches your input and suggests improvements." },
      { type: "added", text: "Vision copyright checker: scans uploaded images for monetisation risk before a render starts." },
      { type: "added", text: "Native 16:9, 9:16, 1:1 and 4:5 output." },
      { type: "improved", text: "Slide, fade and flip transitions in the render engine." },
    ],
  },
  {
    version: "1.2.0",
    date: "9 May 2026",
    changes: [
      { type: "added", text: "Full render pipeline: FFmpeg compositing and worker management." },
      { type: "added", text: "LLM script generation and in-editor guidance." },
      { type: "added", text: "Interactive editor with annotation tools, zoom controls and caption styling." },
    ],
  },
  {
    version: "1.1.0",
    date: "8 May 2026",
    changes: [
      { type: "fixed", text: "FFmpeg and TTS dependency issues that made rendering unreliable." },
      { type: "improved", text: "Asset storage moved to R2/B2." },
      { type: "added", text: "Automatic script generation from uploaded screenshots." },
    ],
  },
  {
    version: "1.0.0",
    date: "7 May 2026",
    changes: [{ type: "added", text: "First release." }],
  },
];

const TYPE_STYLES: Record<ChangeType, string> = {
  added: "bg-emerald-50 text-emerald-700 border-emerald-200",
  improved: "bg-brand-tint text-teal-800 border-teal-200",
  fixed: "bg-amber-50 text-amber-700 border-amber-200",
};

export default function Changelog() {
  return (
    <PageShell
      title="Changelog"
      description="What shipped in each release of AIVideo."
      canonical="https://aivideo.ai/changelog"
      lede="Every release, with what changed and when."
    >
      <div className="space-y-12">
        {UPDATES.map((update) => (
          <section key={update.version}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
              <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">
                {update.version}
              </h2>
              <span className="text-[13.5px] text-ink-muted">{update.date}</span>
            </div>

            <ul className="mt-5 space-y-3.5">
              {update.changes.map((change, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                  <span
                    className={`rounded-md border px-2 py-0.5 text-[11.5px] font-medium ${TYPE_STYLES[change.type]}`}
                  >
                    {change.type}
                  </span>
                  <p className="flex-1 text-[15px] leading-relaxed text-ink-body">{change.text}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
