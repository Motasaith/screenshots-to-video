import {
  Crosshair,
  EyeOff,
  Mic,
  Smartphone,
  Subtitles,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/site/Reveal";

/**
 * Six things the product does, stated plainly.
 *
 * This section used to be six animated illustrations built from roughly
 * twenty-one `repeat: Infinity` framer-motion timelines, several of them
 * animating `borderColor` and `width`, which force a repaint every frame.
 * They ran for as long as the tab was open and were the main reason the page
 * stuttered on a slow machine. An icon says the same thing for free.
 */

interface Feature {
  Icon: LucideIcon;
  title: string;
  body: string;
}

const features: Feature[] = [
  {
    Icon: Crosshair,
    title: "Zoom that lands on the right pixel",
    body: "Drop a target on a screenshot and the camera pushes in on it, holds while the narration explains it, then pulls back for the next step.",
  },
  {
    Icon: Mic,
    title: "Narration in twelve voices",
    body: "Four of them are ultra-realistic. Pro adds the ElevenLabs catalogue. Change one line of the script and only that line is re-recorded.",
  },
  {
    Icon: EyeOff,
    title: "Blur that stays put",
    body: "Mask an email address or an API key once. The blur is tied to the region, so it survives a re-render and a change of aspect ratio.",
  },
  {
    Icon: Wand2,
    title: "A script drafted from your screens",
    body: "Each step gets a suggested line written from what is actually visible in that screenshot plus whatever note you left on it.",
  },
  {
    Icon: Smartphone,
    title: "Every aspect ratio from one project",
    body: "16:9 for YouTube, 9:16 for TikTok and Reels, 1:1 and 4:5 for feeds. Reframe and re-render without redoing the annotations.",
  },
  {
    Icon: Subtitles,
    title: "Captions, burned in or separate",
    body: "Timed to the narration because they come from the same script. Take them baked into the picture or as an SRT file alongside it.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="section">
      <div className="container-site">
        <Reveal className="max-w-2xl">
          <h2 className="h2">Built for the videos nobody wants to record twice</h2>
          <p className="lede mt-4">
            Onboarding walkthroughs, release notes, support answers, internal documentation.
            The kind that go stale the moment the UI changes.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ Icon, title, body }, i) => (
            <Reveal key={title} delay={(i % 3) * 60}>
              <div className="flex h-full flex-col">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-brand-tint">
                  <Icon className="h-[18px] w-[18px] text-brand" strokeWidth={1.8} />
                </span>
                <h3 className="mt-4 text-[16.5px] font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-body">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
