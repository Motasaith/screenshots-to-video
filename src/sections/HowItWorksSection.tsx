import { Reveal } from "@/components/site/Reveal";
import { Shot } from "@/components/site/Media";

const steps = [
  {
    n: "1",
    title: "Upload your screenshots",
    body: "Drop a folder or a ZIP. They are sorted by filename, and that order becomes the order of the video. Pick an aspect ratio and you have a project.",
    image: "/images/steps/step1.png",
  },
  {
    n: "2",
    title: "Mark up what matters",
    body: "Box the button someone should click. Blur what should not be public. Set a zoom target. Write or accept the narration for each step.",
    image: "/images/steps/step3.png",
  },
  {
    n: "3",
    title: "Render and download",
    body: "We stitch the screenshots, narration, zooms and music into one MP4 on our machines. Close the tab; it will be waiting in your library.",
    image: "/images/steps/step8.png",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="mat section border-y border-line">
      <div className="container-site">
        <Reveal className="max-w-2xl">
          <h2 className="h2">Three steps, about ten minutes</h2>
          <p className="lede mt-4">
            The slow part of a tutorial video is recording it, then recording it again because
            you said the wrong thing halfway through. This skips both.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-8 md:grid-cols-3 md:gap-6">
          {steps.map((step, i) => (
            <Reveal key={step.n} delay={i * 70}>
              <article className="card card-lift h-full overflow-hidden">
                <Shot
                  src={step.image}
                  alt={step.title}
                  ratio={16 / 10}
                  bare
                  placeholder={`Step ${step.n}`}
                  sizes="(max-width: 768px) 100vw, 360px"
                />
                <div className="border-t border-line p-6">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-[13px] font-semibold text-white">
                    {step.n}
                  </span>
                  <h3 className="mt-4 text-[17px] font-semibold text-ink">{step.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-body">{step.body}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
