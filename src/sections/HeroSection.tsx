import { Link } from "react-router";
import { ArrowRight, Check } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { UploadDropzone } from "./hero/UploadDropzone";

const promises = ["No credit card", "5 videos a month, free", "Voiceover included"];

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      {/* One flat gradient wash. Static, so it costs a single paint at load
          and nothing at all while scrolling. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{
          background:
            "linear-gradient(180deg, var(--brand-tint) 0%, rgba(237,247,245,0.35) 45%, rgba(255,255,255,0) 100%)",
        }}
      />

      <div className="container-site relative pb-16 pt-16 md:pb-24 md:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
          <Reveal>
            <h1 className="display text-ink">
              Screenshots in.
              <br />
              Finished tutorial out.
            </h1>

            <p className="lede mt-6 max-w-[30rem]">
              Drop in the screenshots you already have. AIVideo writes the narration, zooms into
              the right part of each screen, and renders an MP4 you can publish. No screen
              recorder, no retakes.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/signup" className="btn btn-lg btn-primary">
                Make your first video
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#showcase" className="btn btn-lg btn-secondary">
                See it work
              </a>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2.5">
              {promises.map((item) => (
                <li key={item} className="flex items-center gap-2 text-[14.5px] text-ink-body">
                  <Check className="h-4 w-4 flex-none text-brand" strokeWidth={2.5} />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={80}>
            <UploadDropzone />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
