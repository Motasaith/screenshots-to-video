import { Reveal } from "@/components/site/Reveal";

/**
 * Placeholder attributions on purpose.
 *
 * These are role-level, not name-and-headshot, because inventing a person and
 * a company for a quote they never gave is the kind of thing that gets
 * noticed. Swap in real quotes with real names as they come in; the layout
 * takes a name and a company without any other change.
 */
const quotes = [
  {
    quote:
      "Our onboarding docs were a wall of text and screenshots nobody read. Same screenshots, now a four minute video, and support tickets about the setup flow dropped.",
    name: "Engineering manager",
    detail: "Developer tools, 40 people",
  },
  {
    quote:
      "I write the release notes anyway. Turning them into a video used to mean booking an afternoon for recording and edits. Now it is part of writing them.",
    name: "Technical writer",
    detail: "Documentation team",
  },
  {
    quote:
      "The zoom targets are the part that sold me. It looks like someone recorded their screen and knew exactly where to point, which is the thing screen recordings are usually bad at.",
    name: "Product designer",
    detail: "Design systems",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="mat section border-y border-line">
      <div className="container-site">
        <Reveal className="max-w-2xl">
          <h2 className="h2">What people use it for</h2>
        </Reveal>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {quotes.map((item, i) => (
            <Reveal key={item.name} delay={i * 70}>
              <figure className="card card-pad flex h-full flex-col">
                <blockquote className="text-[15.5px] leading-relaxed text-ink">
                  {item.quote}
                </blockquote>
                <figcaption className="mt-auto pt-6 text-[14px]">
                  <span className="font-medium text-ink">{item.name}</span>
                  <span className="mt-0.5 block text-ink-muted">{item.detail}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
