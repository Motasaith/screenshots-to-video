import { Link } from "react-router";
import { ArrowRight } from "lucide-react";

export default function CTASection() {
  return (
    <section className="section-tight">
      <div className="container-site">
        <div className="rounded-2xl bg-ink px-7 py-14 text-center md:px-12 md:py-20">
          <h2 className="h2 mx-auto max-w-[18ch] text-white">
            You already have the screenshots
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[16.5px] leading-relaxed text-white/70">
            Five videos a month, free, no card. If the first one is not usable, you have lost
            ten minutes.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/signup"
              className="btn btn-lg bg-white text-ink hover:bg-white/90"
            >
              Make your first video
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/docs"
              className="btn btn-lg border-white/20 bg-transparent text-white hover:bg-white/10"
            >
              Read the docs
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
