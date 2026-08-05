import { Github, ExternalLink } from "lucide-react";
import { PageShell } from "@/components/site/PageShell";

export default function About() {
  return (
    <PageShell
      title="About AIVideo"
      description="Why AIVideo exists, and who builds it."
      canonical="https://aivideo.ai/about"
      lede="A tool for people who write documentation and would rather not spend an afternoon recording it."
    >
      <div className="copy">
        <h2>Why this exists</h2>
        <p>
          Every team has the same problem with tutorial videos. The screenshots already exist
          somewhere, but turning them into a video means booking time, recording a screen, saying
          the wrong thing four minutes in, and starting over. Then the interface changes and the
          whole recording is stale.
        </p>
        <p>
          AIVideo works from the screenshots instead. You annotate them the way you would if you
          were explaining over someone&rsquo;s shoulder, and the render handles the camera work
          and the narration. When the interface changes you swap one screenshot and render again,
          rather than re-recording twenty minutes of screen.
        </p>

        <h2>How it works</h2>
        <p>
          Screenshots are annotated in a canvas editor in your browser. The narration script is
          drafted per step from the screenshot and your notes, then spoken by a voice you pick.
          Rendering runs on our servers through FFmpeg, which handles the zoom interpolation,
          transitions, music bed and captions, and hands back a single MP4.
        </p>
        <p>
          None of that depends on your machine staying open. Start a render, close the tab, and
          the finished file will be waiting in your library.
        </p>
      </div>

      <div className="card card-pad mt-14">
        <h2 className="text-[17px] font-semibold text-ink">Who builds it</h2>
        <p className="mt-4 text-[16px] font-medium text-ink">Abdul Rauf Azhar</p>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-body">
          Full stack developer working on AI-integrated applications, and a data science student
          at KFUEIT University. AIVideo started as a fix for a problem I kept running into:
          technical writing that would be much clearer as a video, and never was, because
          recording one takes a whole afternoon.
        </p>
        <a
          href="https://github.com/Motasaith"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 text-[15px] font-medium text-brand hover:underline"
        >
          <Github className="h-4 w-4" />
          GitHub profile
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </PageShell>
  );
}
