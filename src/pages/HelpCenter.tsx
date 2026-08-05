import { Link } from "react-router";
import { PageShell } from "@/components/site/PageShell";

const faqs = [
  {
    q: "How many screenshots can one video have?",
    a: "Fifty per project. Past that the render gets long enough that people stop watching anyway, so it is worth splitting into two videos.",
  },
  {
    q: "What order do my screenshots end up in?",
    a: "Sorted by filename, naturally, so step2 comes before step10. Name them 01-, 02-, 03- if you want to be certain.",
  },
  {
    q: "Can I change the narration?",
    a: "Yes. Every step has an editable script line. Change one and only that line is re-recorded, so fixing a single sentence does not mean regenerating the whole voiceover.",
  },
  {
    q: "Does the blur survive a re-render?",
    a: "Yes. Blur is stored as a region on the screenshot, not as baked pixels, so it holds through re-renders and through changing the aspect ratio.",
  },
  {
    q: "Do I need to keep the tab open while it renders?",
    a: "No. Rendering runs on our machines. Close the tab and the finished MP4 will be in your library.",
  },
  {
    q: "My render failed. What now?",
    a: "Check that every screenshot is under 50 MB and is a PNG, JPG, WebP or GIF. If they all are, send us the project ID through the feedback form and we will look at the logs.",
  },
  {
    q: "What does the copyright checker actually do?",
    a: "A vision model scans your screenshots before a render for material that would put a monetised upload at risk. It flags things rather than blocking them; the decision stays yours.",
  },
  {
    q: "Can I get one video in more than one aspect ratio?",
    a: "Yes. Change the ratio on the project and render again. Annotations are stored relative to the screenshot, so nothing moves.",
  },
];

export default function HelpCenter() {
  return (
    <PageShell
      title="Help centre"
      description="Answers to the questions people ask most about AIVideo."
      canonical="https://aivideo.ai/help"
      lede="The things people ask most. If yours is not here, the docs go deeper."
    >
      <div className="divide-y divide-line border-y border-line">
        {faqs.map((faq) => (
          <details key={faq.q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-medium text-ink">
              {faq.q}
              <span className="grid h-6 w-6 flex-none place-items-center rounded-full border border-line text-ink-muted transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-ink-body">{faq.a}</p>
          </details>
        ))}
      </div>

      <div className="card card-pad mt-12">
        <h2 className="text-[17px] font-semibold text-ink">Still stuck?</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-body">
          The <Link to="/docs" className="text-brand hover:underline">documentation</Link> covers
          the render pipeline in more detail, and{" "}
          <Link to="/contact" className="text-brand hover:underline">
            contacting us
          </Link>{" "}
          reaches a person.
        </p>
      </div>
    </PageShell>
  );
}
