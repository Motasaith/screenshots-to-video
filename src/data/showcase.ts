/**
 * Everything the homepage shows about the product lives here.
 *
 * `image` and `video` are both optional on purpose. Leave one out and the slot
 * renders a framed placeholder that still looks like part of the design, so
 * the page can ship before the captures exist and a panel can be swapped
 * without touching a component.
 *
 * When you do add media:
 *  - Screenshots: capture at 2560px wide, export WebP or AVIF, drop in
 *    /public/images/. Point `image` at the path.
 *  - Clips: keep them under ~15 seconds and under ~3 MB, H.264 MP4, and always
 *    export a `poster` still alongside. The poster is what people actually see
 *    first; the video only downloads once it is on screen or clicked.
 *  - Once there is real traffic, set VITE_MEDIA_CDN and the same paths get
 *    served resized and re-encoded from the edge. See src/lib/siteMedia.ts.
 */

export interface ShowcasePanel {
  id: string;
  tab: string;
  title: string;
  body: string;
  bullets: string[];
  image?: string;
  video?: string;
  poster?: string;
  /** Fake URL drawn in the browser chrome above the media. */
  url?: string;
}

export const showcasePanels: ShowcasePanel[] = [
  {
    id: "upload",
    tab: "Start a project",
    title: "Bring the screenshots you already took",
    body: "Pick a folder, a ZIP, or a pile of loose images. They get sorted by filename, so the order you saved them in is the order they appear in the video.",
    bullets: ["Folders and ZIPs unpack automatically", "Up to 50 screenshots per project", "Presets for YouTube, TikTok and Teams"],
    image: "/images/steps/step1.png",
    url: "app.aivideo.ai/create",
  },
  {
    id: "editor",
    tab: "Editor",
    title: "Mark up each screen the way you would in person",
    body: "Draw a box around the button you want people to click. Blur the account number. Add an arrow, a caption, a step number. Everything you place is remembered when you re-render.",
    bullets: ["Highlight, blur, arrow, text and shape tools", "Blur travels with the region, not the pixel", "Undo history per scene"],
    image: "/images/steps/step3.png",
    url: "app.aivideo.ai/create/editor",
  },
  {
    id: "camera",
    tab: "Zoom and camera",
    title: "The camera moves to whatever matters",
    body: "Set a zoom target on a screenshot and the render pushes in on it, holds, then pulls back out for the next step. It reads like someone recorded their screen, except nothing was recorded.",
    bullets: ["Zoom targets per scene", "Pan between two points on one screenshot", "Transition and hold timing per step"],
    image: "/images/steps/step5.png",
    url: "app.aivideo.ai/create/preview",
  },
  {
    id: "voice",
    tab: "Voiceover",
    title: "Narration written from what is on the screen",
    body: "The script is generated per step from the screenshot and your notes, then read out loud. Rewrite any line you disagree with and only that line is re-recorded.",
    bullets: ["Script drafted per step", "Edit a line, re-record just that line", "Captions burned in or kept as a sidecar file"],
    image: "/images/steps/step7.png",
    url: "app.aivideo.ai/create/voice",
  },
  {
    id: "render",
    tab: "Render",
    title: "One MP4, ready to publish",
    body: "Rendering happens on our machines, not yours. Close the tab if you want. When it is done you get an MP4 at the aspect ratio you picked, with the music bed and captions baked in.",
    bullets: ["16:9, 9:16, 1:1 and 4:5", "Runs server-side, survives a closed tab", "Download or share a link"],
    image: "/images/steps/step8.png",
    url: "app.aivideo.ai/create/export",
  },
];

/**
 * The one clip on the page. Leave `video` undefined until it is recorded and
 * the section renders a framed still with a play affordance instead.
 */
export const demoReel = {
  video: undefined as string | undefined,
  poster: undefined as string | undefined,
  caption: "A three minute onboarding walkthrough, built from eleven screenshots.",
};
