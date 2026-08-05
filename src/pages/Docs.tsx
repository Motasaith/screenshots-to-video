import { PageShell } from "@/components/site/PageShell";

export default function Docs() {
  return (
    <PageShell
      title="Documentation"
      description="How to build a narrated tutorial video from screenshots with AIVideo."
      canonical="https://aivideo.ai/docs"
      lede="Everything from your first project to the parts of the render engine most people never touch."
    >
      <div className="copy">
        <h2>Your first video</h2>
        <ol>
          <li>
            <strong>Create a project.</strong> Give it a name, pick a platform preset (YouTube,
            TikTok, Teams) and an aspect ratio. Upload your screenshots as loose files, a folder,
            or a ZIP.
          </li>
          <li>
            <strong>Annotate.</strong> In the canvas editor, add highlight boxes, blur anything
            sensitive, set zoom targets, and add captions, watermarks or step numbers.
          </li>
          <li>
            <strong>Check the script.</strong> Each step gets a narration line drafted from the
            screenshot and your description. Edit any line you disagree with.
          </li>
          <li>
            <strong>Set the motion.</strong> Choose transitions between steps, pick a voice and a
            speaking speed, and add an intro or outro if you want one.
          </li>
          <li>
            <strong>Render.</strong> FFmpeg compiles the annotated screenshots, narration, zooms
            and transitions into an MP4. This runs server-side, so you can close the tab.
          </li>
          <li>
            <strong>Download.</strong> The finished file appears in your library.
          </li>
        </ol>

        <h2>Getting good screenshots</h2>
        <ul>
          <li>Capture the whole application window rather than a cropped detail. Zoom targets do the cropping later, and they can only zoom into pixels that exist.</li>
          <li>Use the same window size for every screenshot in a project. Mismatched sizes force letterboxing between steps.</li>
          <li>Close unrelated tabs and dismiss notifications before capturing.</li>
          <li>Name files so they sort in the order you want: <code>01-login.png</code>, <code>02-dashboard.png</code>. Sorting is natural, so <code>step2</code> comes before <code>step10</code>.</li>
        </ul>

        <h2>Writing descriptions</h2>
        <ul>
          <li>Describe the single action happening on that screen, not the whole feature.</li>
          <li>Use active voice. &ldquo;Click Submit&rdquo; reads better out loud than &ldquo;the Submit button should be clicked&rdquo;.</li>
          <li>Leave out anything already visible in the screenshot. The script generator can see it.</li>
        </ul>

        <h2>Zoom and camera</h2>
        <p>
          Setting a target coordinate on a screenshot tells the render engine to interpolate from
          the full frame to roughly a 2.5x zoom centred on that point, hold while the narration
          for that step plays, then ease back out. The easing is applied to the whole move, so it
          reads as a camera rather than a jump cut.
        </p>
        <p>
          Two targets on one screenshot produce a pan between them instead of a push in. Timing
          for the hold and the transition is per step.
        </p>

        <h2>Copyright checking</h2>
        <p>
          Before a render starts, a vision model scans the uploaded screenshots for material that
          would put a monetised upload at risk. It flags rather than blocks, so you decide what
          to do about anything it finds.
        </p>

        <h2>Aspect ratios</h2>
        <p>
          A project renders to 16:9, 9:16, 1:1 or 4:5. Annotations are stored relative to the
          screenshot rather than to the output frame, so changing the ratio and rendering again
          keeps every highlight and blur where you put it.
        </p>
      </div>
    </PageShell>
  );
}
