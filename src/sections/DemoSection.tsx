import { Reveal } from "@/components/site/Reveal";
import { Clip } from "@/components/site/Media";
import { demoReel } from "@/data/showcase";

const specs = [
  { value: "1080p", label: "Export quality, 4K on Pro" },
  { value: "4", label: "Aspect ratios from one project" },
  { value: "30+", label: "Tools in the editor" },
  { value: "12", label: "Narration voices" },
];

/**
 * One video, and it downloads nothing until someone asks for it.
 *
 * `Clip` renders with `preload="none"`, so what loads with the page is the
 * poster image and nothing else. Until a clip is recorded, the frame draws a
 * placeholder that keeps the section looking finished.
 */
export default function DemoSection() {
  return (
    <section className="section">
      <div className="container-site">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="h2">See one that was made this way</h2>
          <p className="lede mt-4">{demoReel.caption}</p>
        </Reveal>

        <Reveal className="mx-auto mt-10 max-w-4xl">
          <Clip src={demoReel.video} poster={demoReel.poster} label="Play the sample video" />
        </Reveal>

        <Reveal className="mt-14">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-8 border-t border-line pt-10 md:grid-cols-4">
            {specs.map((spec) => (
              <div key={spec.label}>
                <dt className="text-[30px] font-semibold leading-none tracking-[-0.03em] text-ink">
                  {spec.value}
                </dt>
                <dd className="mt-2 text-[14px] leading-snug text-ink-body">{spec.label}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
