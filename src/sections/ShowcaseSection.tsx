import { useState } from "react";
import { Check } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { BrowserFrame, Shot } from "@/components/site/Media";
import { showcasePanels } from "@/data/showcase";

/**
 * The product, shown rather than described.
 *
 * Tabs switch on click and nothing rotates on a timer. An auto-advancing
 * carousel moves the thing someone is reading out from under them, and it
 * means the page is doing work every few seconds forever.
 *
 * Only the first panel's screenshot is in the DOM at a time, so switching tabs
 * downloads one image instead of the browser fetching five up front.
 */
/**
 * Every homepage shot is 1600x795, so this one number fits all of them.
 *
 * It has to be one number. The shots appear side by side in a three-card grid
 * and in a tabbed panel that swaps between them, and the frame reserves its box
 * before the image loads - so a per-image ratio gave cards of different heights
 * and a panel that jumped as you changed tab. The images were padded onto a
 * common canvas rather than declaring a ratio the picture does not have.
 */
const SHOT_RATIO = 1600 / 795;

export default function ShowcaseSection() {
  const [active, setActive] = useState(0);
  const panel = showcasePanels[active];

  return (
    <section id="showcase" className="section">
      <div className="container-site">
        <Reveal className="max-w-2xl">
          <h2 className="h2">Everything happens in one editor</h2>
          <p className="lede mt-4">
            Upload, annotate, narrate and render without leaving the browser or opening a
            timeline.
          </p>
        </Reveal>

        <Reveal className="mt-9">
          <div
            role="tablist"
            aria-label="Product tour"
            className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0"
          >
            {showcasePanels.map((item, i) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={i === active}
                aria-controls={`panel-${item.id}`}
                onClick={() => setActive(i)}
                className={`flex-none rounded-full border px-4 py-2 text-[14px] font-medium transition-colors ${
                  i === active
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-white text-ink-body hover:border-line-strong hover:text-ink"
                }`}
              >
                {item.tab}
              </button>
            ))}
          </div>
        </Reveal>

        <div
          id={`panel-${panel.id}`}
          role="tabpanel"
          className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.5fr] lg:items-center lg:gap-12"
        >
          {/* `key` on the copy makes React swap the subtree on tab change, so
              the short fade plays again instead of the text changing in place. */}
          <div key={panel.id} className="animate-rise-in">
            <h3 className="h3">{panel.title}</h3>
            <p className="mt-3 text-[16px] leading-relaxed text-ink-body">{panel.body}</p>
            <ul className="mt-6 space-y-3">
              {panel.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2.5 text-[15px] text-ink-body">
                  <Check className="mt-0.5 h-4 w-4 flex-none text-brand" strokeWidth={2.5} />
                  {bullet}
                </li>
              ))}
            </ul>
          </div>

          <BrowserFrame url={panel.url}>
            <Shot
              key={panel.id}
              src={panel.image}
              alt={panel.title}
              ratio={SHOT_RATIO}
              bare
              placeholder={panel.tab}
              sizes="(max-width: 1024px) 100vw, 700px"
            />
          </BrowserFrame>
        </div>
      </div>
    </section>
  );
}
