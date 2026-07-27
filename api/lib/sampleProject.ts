/**
 * A ready-made project so a new user can see a finished video immediately.
 *
 * First run previously required finding screenshots, uploading them, writing or
 * generating scripts, choosing a voice and rendering — all before the product
 * had shown what it does. This produces a complete, editable project in one
 * click: three mock UI screenshots, scripts, zoom points and a caption.
 *
 * The screenshots are drawn with FFmpeg rather than shipped as binary assets so
 * there is nothing to keep in the repo, and they render at whatever resolution
 * the project needs.
 */

import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { nanoid } from "nanoid";
import ffmpegPath from "ffmpeg-static";
import { saveLocalFile } from "./localStore";
import { getFontPath } from "./ffmpeg";
import { createLogger } from "./logger";

const log = createLogger({ path: "sampleProject" });
const execFileAsync = promisify(execFile);

const W = 1920;
const H = 1080;

interface SampleScene {
  heading: string;
  /** Panel label drawn into the mock UI, and the thing the zoom points at. */
  focus: { label: string; x: number; y: number; w: number; h: number };
  description: string;
  script: string;
}

/** The three scenes, written to demonstrate a real zoom-and-narrate flow. */
export const SAMPLE_SCENES: SampleScene[] = [
  {
    heading: "Dashboard",
    focus: { label: "New project", x: 1480, y: 150, w: 300, h: 90 },
    description: "Open the dashboard and start a new project",
    script:
      "Start on the dashboard. Everything you have made lives here, and a new project begins with the button in the top right.",
  },
  {
    heading: "Editor",
    focus: { label: "Zoom tool", x: 90, y: 430, w: 240, h: 80 },
    description: "Pick the zoom tool and place a zoom point",
    script:
      "The editor is where a screenshot becomes a shot. Pick the zoom tool, then click whatever you want the camera to move to.",
  },
  {
    heading: "Export",
    focus: { label: "Render video", x: 1450, y: 880, w: 340, h: 96 },
    description: "Render the finished video",
    script:
      "When the scenes look right, render. The video is built on our servers, so you can close the tab and come back to it.",
  },
];

/** Escape text for FFmpeg's drawtext filter. */
function esc(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/'/g, "\u2019").replace(/:/g, "\\:").replace(/%/g, "\\%");
}

/**
 * Draw one mock application screenshot: title bar, sidebar, content cards, and
 * a highlighted control for the scene's zoom to land on.
 */
async function drawScene(scene: SampleScene, outPath: string): Promise<void> {
  if (!ffmpegPath) throw new Error("ffmpeg-static path is undefined");
  const font = getFontPath();
  const f = scene.focus;

  const filters = [
    // Window chrome
    `drawbox=x=0:y=0:w=${W}:h=96:color=0x111c1a:t=fill`,
    `drawbox=x=0:y=96:w=340:h=${H - 96}:color=0x16211f:t=fill`,
    `drawtext=fontfile='${font}':text='${esc(scene.heading)}':fontcolor=0xe8f0ee:fontsize=40:x=64:y=28`,
    // Sidebar items
    ...[0, 1, 2, 3].map(
      (i) => `drawbox=x=64:y=${180 + i * 90}:w=210:h=44:color=0x24322f:t=fill`
    ),
    // Content cards
    ...[0, 1].flatMap((row) =>
      [0, 1, 2].map(
        (col) =>
          `drawbox=x=${420 + col * 460}:y=${190 + row * 330}:w=400:h=270:color=0x1b2725:t=fill`
      )
    ),
    // The control this scene is about
    `drawbox=x=${f.x}:y=${f.y}:w=${f.w}:h=${f.h}:color=0x0d9488:t=fill`,
    `drawtext=fontfile='${font}':text='${esc(f.label)}':fontcolor=0xffffff:fontsize=30:` +
      `x=${f.x}+(${f.w}-text_w)/2:y=${f.y}+(${f.h}-text_h)/2`,
  ].join(",");

  await execFileAsync(
    ffmpegPath,
    [
      "-y",
      "-f", "lavfi",
      "-i", `color=c=0x0e1917:s=${W}x${H}`,
      "-vf", filters,
      "-frames:v", "1",
      outPath,
    ],
    { timeout: 60000 }
  );
}

export interface SampleStepSeed {
  order: number;
  screenshotPath: string;
  description: string;
  script: string;
  zoomTargetX: number;
  zoomTargetY: number;
  multiZooms: Array<{
    id: string;
    targetX: number;
    targetY: number;
    zoomScale: number;
    duration: number;
    script: string;
  }>;
}

/**
 * Generate the sample screenshots and return everything needed to insert steps.
 *
 * Images go through the same local-storage path as real uploads, so a sample
 * project behaves identically to a user's own from here on — including cleanup.
 */
export async function buildSampleSteps(userId: number): Promise<SampleStepSeed[]> {
  const tmpDir = path.join(os.tmpdir(), "aivideo-sample");
  await fs.mkdir(tmpDir, { recursive: true });

  const seeds: SampleStepSeed[] = [];

  for (let i = 0; i < SAMPLE_SCENES.length; i++) {
    const scene = SAMPLE_SCENES[i];
    const tmp = path.join(tmpDir, `sample_${nanoid(8)}.png`);
    try {
      await drawScene(scene, tmp);
      const bytes = await fs.readFile(tmp);
      const key = await saveLocalFile(bytes, {
        userId,
        folder: "screenshots",
        filename: `sample_${i + 1}.png`,
      });

      // Centre of the highlighted control, as a percentage.
      const cx = ((scene.focus.x + scene.focus.w / 2) / W) * 100;
      const cy = ((scene.focus.y + scene.focus.h / 2) / H) * 100;

      seeds.push({
        order: i + 1,
        screenshotPath: key,
        description: scene.description,
        script: scene.script,
        zoomTargetX: cx,
        zoomTargetY: cy,
        // A single zoom point per scene: enough to show the camera working
        // without walking a new user into the multi-point timing trap.
        multiZooms: [
          {
            id: nanoid(8),
            targetX: cx,
            targetY: cy,
            zoomScale: 1.8,
            duration: 3,
            script: scene.script,
          },
        ],
      });
    } finally {
      await fs.unlink(tmp).catch(() => {});
    }
  }

  log.info(`Built ${seeds.length} sample scenes for user ${userId}`);
  return seeds;
}
