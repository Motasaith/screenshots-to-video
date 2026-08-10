import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { createLogger } from "./logger";

const log = createLogger({ path: "ffmpeg" });
import { nanoid } from "nanoid";

// Use static binaries so the user doesn't need to install ffmpeg globally
import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import { getCursorPng } from "./cursorOverlay";
import {
  RENDER_FPS,
  AUDIO_LEAD_IN,
  AUDIO_TAIL,
  MW_ZOOM_IN_HOLD,
  MW_ZOOM_IN_DUR,
  MW_PAN_DUR,
  MW_ZOOM_OUT_DUR,
  MW_MIN_HOLD,
} from "@contracts/sceneTiming";

const execFileAsync = promisify(execFile);

const WORK_DIR = path.join(os.tmpdir(), "aivideo-render");

// ─────────────────────────────────────────────────────────────────
// Rendering constants — tuned to mimic human-edited tutorial videos
// ─────────────────────────────────────────────────────────────────
// Scene timing lives in contracts/ so the editor can show the user the same
// numbers the renderer acts on. Re-exported here to keep existing imports
// working.
export {
  RENDER_FPS,
  AUDIO_LEAD_IN,
  AUDIO_TAIL,
  MW_ZOOM_IN_HOLD,
  MW_ZOOM_IN_DUR,
  MW_PAN_DUR,
  MW_ZOOM_OUT_DUR,
  MW_MIN_HOLD,
} from "@contracts/sceneTiming";

/**
 * Supersampling: zoompan rounds pan offsets to whole input pixels, which causes
 * the infamous "jittery zoom". Rendering the zoom on a 2x-upscaled canvas gives
 * sub-pixel precision at the output size → buttery motion. Capped so 4K outputs
 * don't explode memory.
 */
const MAX_SS_WIDTH = 4200;

/**
 * x264 preset for segment/final encodes.
 *
 * Our source is a still screenshot under slow camera motion — the cheapest
 * content x264 will ever see. `medium` spends 3-5x the CPU of `veryfast`
 * chasing motion-estimation wins that do not exist here; at a fixed CRF the
 * output is visually indistinguishable.
 */
const X264_PRESET = "veryfast";

/**
 * Width used to compute the blurred letterbox backdrop.
 *
 * The backdrop is a 40px-radius blur — all high-frequency detail is destroyed
 * by definition, so computing it at full supersampled resolution is pure waste.
 * We blur a small proxy and upscale it: visually identical, ~4x cheaper
 * (measured 2484ms -> 625ms for the static pre-pass).
 */
const BG_PROXY_WIDTH = 480;
const BG_BLUR_AT_PROXY = 5; // 40px radius scaled down by 3840/480

/**
 * Cut grid for the transition-aware concat.
 *
 * `concatenateSegmentsWithTransitions` stream-copies everything except the
 * transition regions. Copying can only *start* on a keyframe, so every segment
 * is encoded with an IDR frame on this grid and transition durations are
 * snapped to it. 0.5s matches the default transition length exactly, so the
 * common case is lossless in both senses.
 */
export const CUT_GRID_SEC = 0.5;

/** Encoder args that put an IDR frame on every CUT_GRID_SEC boundary. */
function gopArgs(): string[] {
  const gop = String(Math.round(CUT_GRID_SEC * RENDER_FPS));
  // keyint_min == g plus no scene-cut detection makes the placement exact
  // rather than "at most this far apart".
  return ["-g", gop, "-keyint_min", gop, "-sc_threshold", "0"];
}

/**
 * Encoder args placing a single forced keyframe at the concat cut point.
 *
 * Preferred over gopArgs: the split concat only ever starts a stream copy at
 * `td` seconds in, so that is the only position that must be an IDR frame.
 * Blanketing the clip with keyframes instead inflated output by ~73%
 * (11.35 MB vs 6.60 MB on a 52.6s timeline) to no benefit.
 */
function cutPointArgs(td: number | undefined): string[] {
  if (!td || td <= 0) return gopArgs();
  return ["-force_key_frames", `0,${td.toFixed(3)}`];
}

/**
 * Ensure the work directory exists.
 */
async function ensureWorkDir(): Promise<string> {
  await fs.mkdir(WORK_DIR, { recursive: true });
  return WORK_DIR;
}

/**
 * Returns the absolute path to the bundled font file, formatted for FFmpeg's drawtext filter.
 */
export function getFontPath(): string {
  const fontPath = path.join(process.cwd(), "api", "lib", "fonts", "Roboto-Bold.ttf");
  // For FFmpeg drawtext on Windows, we need to escape backslashes and colons,
  // or convert to forward slashes and escape the colon.
  return fontPath.replace(/\\/g, "/").replace(/:/g, "\\:");
}

/**
 * Get image dimensions using ffprobe.
 */
export async function probeImageDimensions(
  imagePath: string
): Promise<{ width: number; height: number }> {
  if (!ffprobeStatic.path) throw new Error("ffprobe-static path is undefined");
  const { stdout } = await execFileAsync(ffprobeStatic.path, [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height",
    "-of", "csv=p=0:s=x",
    imagePath,
  ], {
    timeout: 10000,
    });

  const [w, h] = stdout.trim().split("x").map(Number);
  if (!w || !h) throw new Error(`Failed to probe image dimensions: ${stdout}`);
  return { width: w, height: h };
}

/**
 * Probe the duration of a video/audio file using ffprobe.
 */
export async function probeMediaDuration(filePath: string): Promise<number> {
  if (!ffprobeStatic.path) throw new Error("ffprobe-static path is undefined");
  try {
    const { stdout } = await execFileAsync(ffprobeStatic.path, [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "csv=p=0",
      filePath,
    ], {
      timeout: 10000,
      });
    const duration = parseFloat(stdout.trim());
    if (isNaN(duration)) throw new Error("Non-numeric duration");
    return duration;
  } catch (err) {
    log.warn(`probeMediaDuration failed for ${filePath}, falling back to 10s`, { error: err instanceof Error ? err.message : String(err) });
    return 10; // Fallback
  }
}

/**
 * Smoothstep helper as an FFmpeg expression.
 * t is clamped to [0,1], then eased with 3t² - 2t³.
 */
function smoothstepExpr(frameVar: string, startFrame: number, durFrames: number): string {
  const t = `min(max((${frameVar}-${startFrame})/${Math.max(durFrames, 1)},0),1)`;
  return `(3*(${t})*(${t})-2*(${t})*(${t})*(${t}))`;
}

/**
 * Compute the zoom motion phases for a clip, in seconds.
 *
 * Human tutorial editing pattern:
 *   1. Show the full screen briefly (viewer orients themselves)
 *   2. Quick, smooth zoom into the target (~1s)
 *   3. HOLD on the target while narrating (this is where old code failed —
 *      it zoomed continuously for the whole clip, which screams "AI")
 *   4. Zoom back out just before the cut so the next step starts wide
 */
export function computeZoomPhases(duration: number): {
  holdStart: number; // seconds at z=1 before zooming
  zoomInDur: number;
  zoomOutStart: number; // -1 means "no zoom out" (clip too short)
  zoomOutDur: number;
} {
  let holdStart = 0.7;
  let zoomInDur = 1.1;
  const zoomOutDur = 0.9;

  // Very short clip: tighten everything, skip the zoom-out
  if (duration < 4.2) {
    holdStart = 0.3;
    zoomInDur = 0.8;
    return { holdStart, zoomInDur, zoomOutStart: -1, zoomOutDur: 0 };
  }

  // Need at least ~1s of hold at full zoom for the zoom-out to feel natural
  const zoomOutStart = duration - zoomOutDur - 0.15;
  if (zoomOutStart < holdStart + zoomInDur + 1.0) {
    return { holdStart, zoomInDur, zoomOutStart: -1, zoomOutDur: 0 };
  }

  return { holdStart, zoomInDur, zoomOutStart, zoomOutDur };
}

/**
 * Build the FFmpeg zoompan filter with the human-style in→hold→out motion.
 *
 * IMPORTANT: this expects to run on a SUPERSAMPLED frame (ssW x ssH) and
 * downscales to outputRes inside zoompan, which is what kills the jitter.
 *
 * @param targetXPx - Target X in supersampled-frame pixels
 * @param targetYPx - Target Y in supersampled-frame pixels
 * @param durationSec - Total clip duration (incl. audio padding)
 * @param outputRes - Final output resolution, e.g. "1920x1080"
 * @param maxZoom - Peak zoom level
 */
export function buildZoomFilter(
  targetXPx: number,
  targetYPx: number,
  durationSec: number,
  outputRes: string,
  maxZoom = 1.6
): string {
  const totalFrames = Math.max(Math.ceil(durationSec * RENDER_FPS), RENDER_FPS);
  const phases = computeZoomPhases(durationSec);

  const aF = Math.round(phases.holdStart * RENDER_FPS);
  const bF = Math.round(phases.zoomInDur * RENDER_FPS);

  const zoomDelta = (maxZoom - 1).toFixed(6);
  const pIn = smoothstepExpr("on", aF, bF);

  let zoomExpr: string;
  if (phases.zoomOutStart > 0) {
    const cF = Math.round(phases.zoomOutStart * RENDER_FPS);
    const dF = Math.round(phases.zoomOutDur * RENDER_FPS);
    const pOut = smoothstepExpr("on", cF, dF);
    // z = 1 + Δ·(easeIn − easeOut): rises to maxZoom, holds, returns to 1
    zoomExpr = `1+${zoomDelta}*(${pIn}-${pOut})`;
  } else {
    zoomExpr = `1+${zoomDelta}*${pIn}`;
  }

  // Keep the target point centered as zoom changes, clamped to frame bounds
  const xExpr = `max(0,min(iw-iw/zoom,${targetXPx.toFixed(1)}-iw/(2*zoom)))`;
  const yExpr = `max(0,min(ih-ih/zoom,${targetYPx.toFixed(1)}-ih/(2*zoom)))`;

  return (
    `zoompan=z='${zoomExpr}':` +
    `x='${xExpr}':` +
    `y='${yExpr}':` +
    `d=${totalFrames}:s=${outputRes}:fps=${RENDER_FPS}`
  );
}

/** Fixed (non-hold) motion frames for a multi-waypoint timeline. */
function multiWaypointFixedFrames(numWaypoints: number): number {
  const numPans = Math.max(0, numWaypoints - 1);
  return (
    Math.round(MW_ZOOM_IN_HOLD * RENDER_FPS) +
    Math.round(MW_ZOOM_IN_DUR * RENDER_FPS) +
    numPans * Math.round(MW_PAN_DUR * RENDER_FPS) +
    Math.round(MW_ZOOM_OUT_DUR * RENDER_FPS)
  );
}

/**
 * Total frames a multi-waypoint clip needs so that every hold gets at least its
 * requested time (min MW_MIN_HOLD) AND the fixed motion phases (zoom-in, pans,
 * zoom-out) run at full, uncompressed speed.
 *
 * If the narration audio is shorter than this, the caller should EXTEND the clip
 * (padding the audio with trailing silence) rather than squashing the timeline —
 * squashing is what used to make pans teleport and 3s holds shrink to ~1.5s.
 */
export function computeMultiWaypointTotalFrames(
  waypoints: Array<{ durationFrames: number }>,
  audioFrames: number
): number {
  if (waypoints.length === 0) return audioFrames;
  const minHoldF = Math.round(MW_MIN_HOLD * RENDER_FPS);
  const requestedHoldTotal = waypoints.reduce(
    (s, w) => s + Math.max(w.durationFrames, minHoldF),
    0
  );
  return Math.max(audioFrames, multiWaypointFixedFrames(waypoints.length) + requestedHoldTotal);
}

/**
 * Build a SINGLE zoompan filter that visits multiple waypoints sequentially.
 *
 * Camera motion timeline:
 *   1. Brief wide hold (~0.5s), then zoom IN to waypoint 0 (~1.0s)
 *   2. HOLD at waypoint 0 (>= its requested duration, min MW_MIN_HOLD)
 *   3. Smooth natural PAN to waypoint 1 over MW_PAN_DUR (stays zoomed in!)
 *   4. HOLD at waypoint 1 …
 *   5. Smooth PAN to waypoint 2 …
 *   6. After holding at the last waypoint, zoom OUT (~1.0s, mirrors zoom-in)
 *
 * The motion phases (zoom-in, pans, zoom-out) are FIXED and never compressed —
 * `totalFrames` should be >= computeMultiWaypointTotalFrames(...) so they fit.
 * Any slack beyond the fixed phases is absorbed into the holds (so long
 * narration is never cut off), keeping every pan at a natural, readable speed.
 *
 * Positions use an ADDITIVE smoothstep form: start at waypoint 0 and add each
 * pan's displacement as its own 0→1 ramp. This glides between points instead of
 * teleporting (the old nested-`if` form evaluated every lerp at t=0 during its
 * own pan window, so the camera jumped straight to the destination).
 */
export interface WaypointCamera {
  zoomInHoldF: number;
  zoomInDurF: number;
  panF: number;
  zoomOutF: number;
  holds: number[];
  holdStarts: number[];
  holdEnds: number[];
  maxZoom: number;
  /**
   * The camera's zoom over time.
   *
   * Takes the frame variable because FFmpeg does not use one name for it:
   * inside zoompan it is `on`, in overlay (and most other filters) it is `n`.
   * Reusing a zoompan expression in an overlay silently produces
   * "Error when evaluating the expression" and kills the whole render.
   */
  zoomExprFor: (frameVar: string) => string;
  /** Convenience for the zoompan call site. */
  zoomExpr: string;
}

/**
 * Frame markers and the zoom curve for a multi-waypoint move.
 *
 * Shared by the zoompan filter and the cursor overlay: the cursor has to be
 * placed in screen space, which means undoing the very camera transform this
 * describes. Recomputing it separately would let the two drift apart by a frame
 * and put the pointer somewhere the camera isn't looking.
 */
export function computeWaypointCamera(
  waypoints: Array<{ durationFrames: number; zoomScale: number }>,
  totalFrames: number
): WaypointCamera {
  const maxZoom = Math.max(...waypoints.map((w) => w.zoomScale));
  const zoomDelta = (maxZoom - 1).toFixed(6);

  // ── Fixed motion phases (in frames, never compressed) ──
  const zoomInHoldF = Math.round(MW_ZOOM_IN_HOLD * RENDER_FPS);
  const zoomInDurF = Math.round(MW_ZOOM_IN_DUR * RENDER_FPS);
  const panF = Math.round(MW_PAN_DUR * RENDER_FPS);
  const zoomOutF = Math.round(MW_ZOOM_OUT_DUR * RENDER_FPS);
  const minHoldF = Math.round(MW_MIN_HOLD * RENDER_FPS);

  const fixedFrames = multiWaypointFixedFrames(waypoints.length);

  // ── Hold durations ──
  // Each waypoint holds at least its requested time (floored at MW_MIN_HOLD).
  // Any time left over after the fixed phases (e.g. long narration) is absorbed
  // into the holds proportionally, so the audio is never cut and the motion
  // phases keep their natural pacing.
  const requestedHolds = waypoints.map((w) => Math.max(w.durationFrames, minHoldF));
  const requestedHoldTotal = requestedHolds.reduce((a, b) => a + b, 0);
  const holdBudget = Math.max(totalFrames - fixedFrames, requestedHoldTotal);
  const holdScale = holdBudget / requestedHoldTotal;
  const holds = requestedHolds.map((h) => Math.round(h * holdScale));

  // ── Frame markers for each hold ──
  const holdStarts: number[] = [];
  const holdEnds: number[] = [];
  let cursor = zoomInHoldF + zoomInDurF; // after the initial zoom-in completes
  for (let i = 0; i < waypoints.length; i++) {
    holdStarts.push(cursor);
    cursor += holds[i];
    holdEnds.push(cursor);
    if (i < waypoints.length - 1) cursor += panF; // pan to the next waypoint
  }

  const zoomExprFor = (v: string) =>
    `1+${zoomDelta}*(${smoothstepExpr(v, zoomInHoldF, zoomInDurF)}-` +
    `${smoothstepExpr(v, holdEnds[holdEnds.length - 1], zoomOutF)})`;

  return {
    zoomInHoldF, zoomInDurF, panF, zoomOutF,
    holds, holdStarts, holdEnds, maxZoom,
    zoomExprFor,
    zoomExpr: zoomExprFor("on"),
  };
}

export function buildMultiWaypointZoomFilter(
  waypoints: Array<{ xPx: number; yPx: number; durationFrames: number; zoomScale: number }>,
  totalFrames: number,
  outputRes: string
): string {
  if (waypoints.length === 0) return "";

  const cam = computeWaypointCamera(waypoints, totalFrames);
  const { panF, holdEnds } = cam;

  // ── Zoom expression: ease in at the start, ease out after the last hold ──
  const zoomExpr = cam.zoomExpr;

  // ── Position expressions: additive smoothstep displacement ──
  // Start at waypoint 0, then ADD each pan's displacement as its own ramp that
  // is 0 before the pan, animates 0→1 across the pan (holdEnds[i-1] → +panF),
  // and stays 1 afterward. The camera therefore holds at each waypoint and then
  // glides smoothly to the next — mimicking a real user moving their cursor
  // between UI elements — with no teleporting.
  const buildAxis = (key: "xPx" | "yPx"): string => {
    const terms: string[] = [waypoints[0][key].toFixed(1)];
    for (let i = 1; i < waypoints.length; i++) {
      const panStart = holdEnds[i - 1];
      const ramp = smoothstepExpr("on", panStart, panF);
      const delta = (waypoints[i][key] - waypoints[i - 1][key]).toFixed(1);
      terms.push(`(${delta})*${ramp}`);
    }
    return terms.join("+");
  };
  const rawXExpr = buildAxis("xPx");
  const rawYExpr = buildAxis("yPx");

  // Clamp to frame bounds (standard zoompan safety)
  const xExpr = `max(0,min(iw-iw/zoom,(${rawXExpr})-iw/(2*zoom)))`;
  const yExpr = `max(0,min(ih-ih/zoom,(${rawYExpr})-ih/(2*zoom)))`;

  return (
    `zoompan=z='${zoomExpr}':` +
    `x='${xExpr}':` +
    `y='${yExpr}':` +
    `d=${totalFrames}:s=${outputRes}:fps=${RENDER_FPS}`
  );
}

/**
 * Lay per-waypoint narration clips onto the camera timeline.
 *
 * Each clip is delayed so speech starts just after the camera settles on its
 * waypoint, then everything is mixed into one track padded to the full scene.
 * `amix` rather than concat because the clips sit at absolute offsets with
 * silence between them, not end to end.
 *
 * Returns the path to the combined track.
 */
async function buildWaypointAudioTrack(
  clips: Array<{ path: string; duration: number } | null>,
  holdStartsFrames: number[],
  totalFrames: number,
  normalize: boolean
): Promise<string> {
  if (!ffmpegPath) throw new Error("ffmpeg-static path is undefined");
  await ensureWorkDir();

  const present = clips
    .map((c, i) => (c ? { ...c, index: i } : null))
    .filter((c): c is { path: string; duration: number; index: number } => c !== null);

  const outPath = path.join(WORK_DIR, `wpaudio_${nanoid(10)}.m4a`);
  const totalSec = totalFrames / RENDER_FPS;

  const args: string[] = ["-y"];
  for (const c of present) args.push("-i", c.path);

  const parts: string[] = [];
  present.forEach((c, n) => {
    const startSec = holdStartsFrames[c.index] / RENDER_FPS + AUDIO_LEAD_IN;
    parts.push(`[${n}:a]adelay=${Math.round(startSec * 1000)}:all=1[d${n}]`);
  });

  const mixInputs = present.map((_, n) => `[d${n}]`).join("");
  // normalize=0: amix divides by input count by default, which would make every
  // clip quieter the more waypoints a scene has.
  const mix =
    `${mixInputs}amix=inputs=${present.length}:normalize=0:duration=longest` +
    `,apad=whole_dur=${totalSec.toFixed(3)}` +
    (normalize ? ",loudnorm=I=-16:TP=-1.5:LRA=11" : "");

  args.push(
    "-filter_complex", `${parts.join(";")};${mix}[a]`,
    "-map", "[a]",
    "-c:a", "aac", "-b:a", "160k", "-ar", "44100",
    "-t", totalSec.toFixed(3),
    outPath
  );

  await execFileAsync(ffmpegPath, args, { timeout: 180000 });
  return outPath;
}

/**
 * Screen-space overlay expressions for an animated mouse cursor.
 *
 * The cursor is the one element that has to exist in both coordinate spaces at
 * once. It points at things in the picture, so its path is defined in image
 * space; but it is a pointer, so it must stay a constant size on screen rather
 * than growing with the zoom. And because it moves over time it cannot be baked
 * into the static pre-pass like the other annotations.
 *
 * So it is overlaid after zoompan, with its image-space path pushed back
 * through the camera transform. zoompan crops a window of `iw/z` at `x` and
 * scales it to the output, so a content point maps to screen as:
 *
 *     screenX = (contentX - camX(n)) * z(n) * outW / ssW
 *
 * The cursor also LEADS the camera. It completes each move in a fraction of the
 * pan window, so it arrives and the camera glides after it — which is what a
 * real screen recording looks like. Moving it in lockstep would pin it to the
 * centre of the frame forever, since that is exactly where the camera points.
 */
export function buildCursorOverlayExprs(
  waypoints: Array<{ xPx: number; yPx: number }>,
  cam: WaypointCamera,
  camXExpr: string,
  camYExpr: string,
  ssW: number,
  ssH: number,
  outW: number,
  outH: number,
  cursorSize: number
): { x: string; y: string } {
  // Fraction of the pan the cursor uses. Lower = more lead on the camera.
  const CURSOR_LEAD = 0.45;
  const leadF = Math.max(1, Math.round(cam.panF * CURSOR_LEAD));

  // `n`, not `on`: this expression is evaluated by overlay, not zoompan.
  const path = (key: "xPx" | "yPx"): string => {
    const terms: string[] = [waypoints[0][key].toFixed(1)];
    for (let i = 1; i < waypoints.length; i++) {
      const ramp = smoothstepExpr("n", cam.holdEnds[i - 1], leadF);
      terms.push(`(${(waypoints[i][key] - waypoints[i - 1][key]).toFixed(1)})*${ramp}`);
    }
    return terms.join("+");
  };

  const z = cam.zoomExprFor("n");
  // Anchor the pointer tip, not its centre — a pointer's hotspot is its corner.
  const sx = `((${path("xPx")})-(${camXExpr}))*(${z})*${(outW / ssW).toFixed(6)}`;
  const sy = `((${path("yPx")})-(${camYExpr}))*(${z})*${(outH / ssH).toFixed(6)}`;

  // Keep it inside the frame even if a waypoint sits near an edge.
  return {
    x: `max(0,min(${outW - cursorSize},${sx}))`,
    y: `max(0,min(${outH - cursorSize},${sy}))`,
  };
}

/**
 * Compute geometry for fitting an image into a canvas (letterbox/pillarbox).
 */
function fitGeometry(
  imgW: number,
  imgH: number,
  canvasW: number,
  canvasH: number
): { scaledW: number; scaledH: number; offsetX: number; offsetY: number } {
  const imgAspect = imgW / imgH;
  const canvasAspect = canvasW / canvasH;
  if (imgAspect > canvasAspect) {
    const scaledW = canvasW;
    const scaledH = Math.round(canvasW / imgAspect);
    return { scaledW, scaledH, offsetX: 0, offsetY: Math.round((canvasH - scaledH) / 2) };
  }
  const scaledH = canvasH;
  const scaledW = Math.round(canvasH * imgAspect);
  return { scaledW, scaledH, offsetX: Math.round((canvasW - scaledW) / 2), offsetY: 0 };
}

/**
 * Audio filter shared by all renders:
 *  - lead-in silence (narration never starts abruptly at frame 0)
 *  - tail silence (breathing room before the cut)
 *  - loudness normalization so every step sounds consistent
 *
 * @param normalize pass false for a silent render: loudnorm on a silent track
 *                  costs a filter pass to accomplish nothing, and pushes up
 *                  whatever noise floor the placeholder has.
 */
function buildAudioFilter(fillToDurationSec?: number, normalize = true): string {
  const delayMs = Math.round(AUDIO_LEAD_IN * 1000);
  // When the clip is extended past the narration (multi-waypoint holds), pad the
  // audio with silence up to the whole clip length so it never ends early.
  const pad =
    fillToDurationSec && fillToDurationSec > 0
      ? `apad=whole_dur=${fillToDurationSec.toFixed(3)}`
      : `apad=pad_dur=${AUDIO_TAIL}`;
  return (
    `adelay=${delayMs}:all=1,${pad}` +
    (normalize ? ",loudnorm=I=-16:TP=-1.5:LRA=11" : "")
  );
}

/* ------------------------------------------------------------------ */
/*  Shared filter builders for multi-region blur/pixelate/spotlight    */
/* ------------------------------------------------------------------ */

type EditorOpts = Parameters<typeof renderStepVideo>[0];

/** Clamp a value between min and max. */
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** Clamp a region to stay within image bounds (avoids FFmpeg crop errors). */
function clampRegion(x: number, y: number, w: number, h: number, imgW: number, imgH: number) {
  const cx = Math.max(0, Math.min(x, imgW - 1));
  const cy = Math.max(0, Math.min(y, imgH - 1));
  const cw = Math.max(1, Math.min(w, imgW - cx));
  const ch = Math.max(1, Math.min(h, imgH - cy));
  return { x: cx, y: cy, w: cw, h: ch };
}

/**
 * FFmpeg filter chain for a colour filter at a given strength (0-100).
 *
 * Returns the bare chain with no separators; callers add the comma on
 * whichever side their filter graph needs.
 *
 * Every filter is interpolated from its identity value rather than scaled from
 * zero. `eq=contrast` and `saturation` are neutral at 1.0 and `hue=s` is
 * neutral at 1.0, so multiplying them by the strength would drive the picture
 * towards flat grey as the slider came down instead of easing the effect off.
 * The sepia matrix is lerped against the identity matrix for the same reason.
 *
 * This replaces three copies of the same switch that had to be kept in step by
 * hand, and none of which honoured a strength at all.
 */
function buildColorFilterChain(
  filter: string | null | undefined,
  strength?: number | null
): string {
  if (!filter || filter === "none") return "";
  const t = Math.max(0, Math.min(100, strength ?? 100)) / 100;
  if (t <= 0) return "";

  const lerp = (from: number, to: number) => from + (to - from) * t;
  const n = (v: number) => Number(v.toFixed(4)).toString();

  switch (filter) {
    case "grayscale":
      // s=1 is untouched, s=0 is fully desaturated.
      return `hue=s=${n(1 - t)}`;
    case "sepia": {
      const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
      const sepia = [0.393, 0.769, 0.189, 0.349, 0.686, 0.168, 0.272, 0.534, 0.131];
      const m = identity.map((id, i) => n(lerp(id, sepia[i])));
      return `colorchannelmixer=${m[0]}:${m[1]}:${m[2]}:0:${m[3]}:${m[4]}:${m[5]}:0:${m[6]}:${m[7]}:${m[8]}`;
    }
    case "warm":
      return `colorbalance=rs=${n(0.1 * t)}:gs=${n(-0.05 * t)}:bs=${n(-0.1 * t)}`;
    case "cool":
      return `colorbalance=rs=${n(-0.1 * t)}:gs=${n(0.05 * t)}:bs=${n(0.1 * t)}`;
    case "contrast":
      return `eq=contrast=${n(lerp(1, 1.5))}:saturation=${n(lerp(1, 1.2))}`;
    default:
      return "";
  }
}

function buildBlurFilter(opts: EditorOpts, imgWidth: number, imgHeight: number): string {
  const blurRegions: Array<{ x: number; y: number; w: number; h: number; intensity: number }> = [];
  if (opts.editorBlurs && opts.editorBlurs.length > 0) {
    for (const b of opts.editorBlurs) {
      if (b.w > 0 && b.h > 0) {
        const r = clampRegion(
          Math.round((b.x / 100) * imgWidth),
          Math.round((b.y / 100) * imgHeight),
          Math.round((b.w / 100) * imgWidth),
          Math.round((b.h / 100) * imgHeight),
          imgWidth, imgHeight
        );
        blurRegions.push({ ...r, intensity: Math.max(2, Math.min(60, Math.round(b.intensity ?? 20))) });
      }
    }
  } else if (
    opts.editorBlurX !== undefined && opts.editorBlurY !== undefined &&
    opts.editorBlurW !== undefined && opts.editorBlurH !== undefined &&
    opts.editorBlurW > 0 && opts.editorBlurH > 0
  ) {
    const r = clampRegion(
      Math.round((opts.editorBlurX / 100) * imgWidth),
      Math.round((opts.editorBlurY / 100) * imgHeight),
      Math.round((opts.editorBlurW / 100) * imgWidth),
      Math.round((opts.editorBlurH / 100) * imgHeight),
      imgWidth, imgHeight
    );
    blurRegions.push({ ...r, intensity: Math.max(2, Math.min(60, Math.round(opts.editorBlurIntensity ?? 20))) });
  }
  if (blurRegions.length === 0) return "";
  const parts: string[] = [];
  blurRegions.forEach((b, i) => {
    const isLast = i === blurRegions.length - 1;
    const origLabel = `blur_orig_${i}`;
    const baseLabel = `blur_base_${i}`;
    const cropLabel = `blur_crop_${i}`;
    const outSuffix = isLast ? "" : `[blur_out_${i}]`;
    const splitInput = i === 0 ? "" : `[blur_out_${i - 1}]`;
    parts.push(`${splitInput}split[${origLabel}][${baseLabel}];[${baseLabel}]crop=${b.w}:${b.h}:${b.x}:${b.y},gblur=sigma=${b.intensity}[${cropLabel}];[${origLabel}][${cropLabel}]overlay=${b.x}:${b.y}${outSuffix}`);
  });
  return parts.join(";") + ",";
}

function buildPixelateFilter(opts: EditorOpts, imgWidth: number, imgHeight: number): string {
  const regions: Array<{ x: number; y: number; w: number; h: number; blockSize: number }> = [];
  if (opts.editorPixelates && opts.editorPixelates.length > 0) {
    for (const p of opts.editorPixelates) {
      if (p.w > 0 && p.h > 0) {
        const r = clampRegion(
          Math.round((p.x / 100) * imgWidth),
          Math.round((p.y / 100) * imgHeight),
          Math.round((p.w / 100) * imgWidth),
          Math.round((p.h / 100) * imgHeight),
          imgWidth, imgHeight
        );
        regions.push({ ...r, blockSize: Math.max(2, Math.min(60, Math.round(p.blockSize ?? 20))) });
      }
    }
  } else if (
    opts.editorPixelateX !== undefined && opts.editorPixelateY !== undefined &&
    opts.editorPixelateW !== undefined && opts.editorPixelateH !== undefined &&
    opts.editorPixelateW > 0 && opts.editorPixelateH > 0
  ) {
    const r = clampRegion(
      Math.round((opts.editorPixelateX / 100) * imgWidth),
      Math.round((opts.editorPixelateY / 100) * imgHeight),
      Math.round((opts.editorPixelateW / 100) * imgWidth),
      Math.round((opts.editorPixelateH / 100) * imgHeight),
      imgWidth, imgHeight
    );
    regions.push({ ...r, blockSize: Math.max(2, Math.min(60, Math.round(opts.editorPixelateBlockSize ?? 20))) });
  }
  if (regions.length === 0) return "";
  const parts: string[] = [];
  regions.forEach((p, i) => {
    const isLast = i === regions.length - 1;
    const origLabel = `pix_orig_${i}`;
    const baseLabel = `pix_base_${i}`;
    const scaledLabel = `pix_scaled_${i}`;
    const outSuffix = isLast ? "" : `[pix_out_${i}]`;
    const splitInput = i === 0 ? "" : `[pix_out_${i - 1}]`;
    parts.push(`${splitInput}split[${origLabel}][${baseLabel}];[${baseLabel}]crop=${p.w}:${p.h}:${p.x}:${p.y},scale=iw/${p.blockSize}:ih/${p.blockSize}:flags=neighbor,scale=${p.w}:${p.h}:flags=neighbor[${scaledLabel}];[${origLabel}][${scaledLabel}]overlay=${p.x}:${p.y}${outSuffix}`);
  });
  return parts.join(";") + ",";
}

function buildSpotlightFilter(opts: EditorOpts, imgWidth: number, imgHeight: number): string {
  const regions: Array<{ x: number; y: number; w: number; h: number; intensity: number }> = [];
  if (opts.editorSpotlights && opts.editorSpotlights.length > 0) {
    for (const s of opts.editorSpotlights) {
      if (s.w > 0 && s.h > 0) {
        const r = clampRegion(
          Math.round((s.x / 100) * imgWidth),
          Math.round((s.y / 100) * imgHeight),
          Math.round((s.w / 100) * imgWidth),
          Math.round((s.h / 100) * imgHeight),
          imgWidth, imgHeight
        );
        regions.push({ ...r, intensity: Math.max(0.1, Math.min(0.9, s.intensity ?? 0.6)) });
      }
    }
  } else if (
    opts.editorSpotlightX !== undefined && opts.editorSpotlightY !== undefined &&
    opts.editorSpotlightW !== undefined && opts.editorSpotlightH !== undefined &&
    opts.editorSpotlightW > 0 && opts.editorSpotlightH > 0
  ) {
    const r = clampRegion(
      Math.round((opts.editorSpotlightX / 100) * imgWidth),
      Math.round((opts.editorSpotlightY / 100) * imgHeight),
      Math.round((opts.editorSpotlightW / 100) * imgWidth),
      Math.round((opts.editorSpotlightH / 100) * imgHeight),
      imgWidth, imgHeight
    );
    regions.push({ ...r, intensity: Math.max(0.1, Math.min(0.9, opts.editorSpotlightIntensity ?? 0.6)) });
  }
  if (regions.length === 0) return "";
  if (regions.length === 1) {
    const s = regions[0];
    const intensity = s.intensity.toFixed(2);
    return `drawbox=x=0:y=0:w=iw:h=${s.y}:color=black@${intensity}:t=fill,drawbox=x=0:y=${s.y + s.h}:w=iw:h=ih-(${s.y}+${s.h}):color=black@${intensity}:t=fill,drawbox=x=0:y=${s.y}:w=${s.x}:h=${s.h}:color=black@${intensity}:t=fill,drawbox=x=${s.x + s.w}:y=${s.y}:w=iw-(${s.x}+${s.w}):h=${s.h}:color=black@${intensity}:t=fill,`;
  }
  // Multiple spotlights: darken entire image, then overlay original crops
  const maxIntensity = Math.max(...regions.map(s => s.intensity)).toFixed(2);
  const parts: string[] = [];
  parts.push(`split[spot_dark][spot_orig]`);
  parts.push(`[spot_dark]drawbox=x=0:y=0:w=iw:h=ih:color=black@${maxIntensity}:t=fill[spot_darkened]`);
  let prevLabel = "spot_darkened";
  regions.forEach((s, i) => {
    const isLast = i === regions.length - 1;
    const cropLabel = `spot_crop_${i}`;
    const outLabel = isLast ? "" : `spot_out_${i}`;
    parts.push(`[spot_orig]crop=${s.w}:${s.h}:${s.x}:${s.y}[${cropLabel}]`);
    parts.push(`[${prevLabel}][${cropLabel}]overlay=${s.x}:${s.y}${outLabel ? `[${outLabel}]` : ""}`);
    if (!isLast) prevLabel = outLabel;
  });
  return parts.join(";") + ",";
}

/**
 * Render a single step: screenshot + audio → video segment with:
 * 1. Human-style zoom: hold wide → quick smooth zoom in → hold → zoom out
 * 2. Jitter-free motion via supersampled zoompan at 30fps
 * 3. Optional highlight box around the target region
 * 4. Padded + loudness-normalized narration
 */
export async function renderStepVideo(opts: {
  screenshotPath: string;
  audioPath: string;
  audioDuration: number;
  zoomTargetX?: number; // percentage 0-100 — undefined means no zoom
  zoomTargetY?: number; // percentage 0-100 — undefined means no zoom
  zoomRectX?: number; // percentage 0-100 (legacy single rect)
  zoomRectY?: number; // percentage 0-100
  zoomRectW?: number; // percentage 0-100
  zoomRectH?: number; // percentage 0-100
  editorHighlights?: Array<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    color?: string;
  }>;
  outputRes?: string;
  /** False on a silent render, which skips loudnorm on the placeholder track. */
  normalizeAudio?: boolean;
  captions?: { text: string; style: string; size: string; position: string; color: string; enabled: boolean };
  // ── Canvas editor fields ──
  editorCropX?: number;
  editorCropY?: number;
  editorCropW?: number;
  editorCropH?: number;
  editorBlurX?: number;
  editorBlurY?: number;
  editorBlurW?: number;
  editorBlurH?: number;
  editorBlurIntensity?: number;
  editorBlurs?: Array<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    intensity?: number;
  }>;
  editorZoomScale?: number;
  editorOverlayText?: string;
  editorOverlayX?: number;
  editorOverlayY?: number;
  editorOverlayColor?: string;
  editorOverlaySize?: string;
  editorCaptionText?: string;
  editorCaptionPosition?: string;
  editorCaptionStyle?: string;
  editorCaptionColor?: string;
  editorCaptionSize?: string;
  // ── Redaction ──
  editorRedactX?: number;
  editorRedactY?: number;
  editorRedactW?: number;
  editorRedactH?: number;
  editorRedactColor?: string;
  // ── Watermark ──
  editorWatermarkText?: string;
  editorWatermarkPosition?: string;
  editorWatermarkSize?: string;
  editorWatermarkColor?: string;
  editorWatermarkOpacity?: number;
  // ── Spotlight ──
  editorSpotlightX?: number;
  editorSpotlightY?: number;
  editorSpotlightW?: number;
  editorSpotlightH?: number;
  editorSpotlightIntensity?: number;
  editorSpotlights?: Array<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    intensity?: number;
  }>;
  // ── Badge ──
  editorBadgeNumber?: number;
  editorBadgeX?: number;
  editorBadgeY?: number;
  editorBadgeColor?: string;
  // ── Magnify ──
  editorMagnifyX?: number;
  editorMagnifyY?: number;
  editorMagnifyW?: number;
  editorMagnifyH?: number;
  editorMagnifyScale?: number;
  editorMagnifyCorner?: string;
  // ── Pixelation ──
  editorPixelateX?: number;
  editorPixelateY?: number;
  editorPixelateW?: number;
  editorPixelateH?: number;
  editorPixelateBlockSize?: number;
  editorPixelates?: Array<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    blockSize?: number;
  }>;
  // ── Color Filter ──
  editorColorFilter?: string;
  editorColorFilterStrength?: number;
  // ── Custom zoom filter (injected by multi-waypoint renderer) ──
  customZoomFilter?: string;
  // Force the clip to a specific length (seconds), padding audio with silence.
  // Used by the multi-waypoint renderer to keep holds/pans/zoom-out uncompressed
  // when the narration is shorter than the camera animation needs.
  clipDurationOverride?: number;
  /**
   * Transition length this segment will be concatenated with, in seconds.
   *
   * `concatenateSegmentsWithTransitions` stream-copies the body of each segment
   * starting at this offset, and a copy can only begin on a keyframe. Passing
   * the value here puts exactly one forced IDR frame at that point. Omitting it
   * falls back to a keyframe grid, which also works but costs roughly 70% more
   * bitrate — 2 keyframes per second is a lot to pay for one cut.
   */
  transitionDurationSec?: number;
  /**
   * Animated mouse pointer, composited after the camera move.
   * Built by renderMultiZoomSegments, which is where the waypoints live.
   */
  cursor?: { pngPath: string; xExpr: string; yExpr: string; size: number };
}): Promise<string> {
  await ensureWorkDir();

  const outputPath = path.join(WORK_DIR, `segment_${nanoid(12)}.mp4`);
  const outputRes = opts.outputRes || "1920x1080";
  const [outW, outH] = outputRes.split("x").map(Number);

  // Total clip duration includes silence padding around the narration, unless
  // the caller forces a longer clip to fit an extended camera animation.
  const paddedDuration =
    opts.clipDurationOverride && opts.clipDurationOverride > 0
      ? opts.clipDurationOverride
      : opts.audioDuration + AUDIO_LEAD_IN + AUDIO_TAIL;

  // Supersampled canvas (even dimensions required by most filters)
  const ssFactor = Math.min(2, MAX_SS_WIDTH / outW);
  const ssW = 2 * Math.round((outW * ssFactor) / 2);
  const ssH = 2 * Math.round((outH * ssFactor) / 2);

  // Probe the source image dimensions
  let imgWidth = 1920;
  let imgHeight = 1080;
  try {
    const dims = await probeImageDimensions(opts.screenshotPath);
    imgWidth = dims.width;
    imgHeight = dims.height;
  } catch {
    // keep fallback values
  }

  // Highlight boxes (multiple, drawn on the ORIGINAL image so they zoom with content)
  let drawboxFilter = "";
  // New: multiple highlight boxes from editorHighlights array
  if (opts.editorHighlights && opts.editorHighlights.length > 0) {
    const boxes = opts.editorHighlights.map((hl) => {
      const rx = Math.round((hl.x / 100) * imgWidth);
      const ry = Math.round((hl.y / 100) * imgHeight);
      const rw = Math.round((hl.w / 100) * imgWidth);
      const rh = Math.round((hl.h / 100) * imgHeight);
      const color = (hl.color || "#FF0099").replace("#", "0x");
      const thickness = Math.max(2, Math.round(Math.min(imgWidth, imgHeight) * 0.003));
      return `drawbox=x=${rx}:y=${ry}:w=${rw}:h=${rh}:color=${color}@0.9:t=box:thickness=${thickness}`;
    });
    drawboxFilter = boxes.join(",") + ",";
  }
  // Legacy: single zoomRect highlight box
  else if (
    opts.zoomRectX !== undefined &&
    opts.zoomRectY !== undefined &&
    opts.zoomRectW !== undefined &&
    opts.zoomRectH !== undefined
  ) {
    const rx = Math.round((opts.zoomRectX / 100) * imgWidth);
    const ry = Math.round((opts.zoomRectY / 100) * imgHeight);
    const rw = Math.round((opts.zoomRectW / 100) * imgWidth);
    const rh = Math.round((opts.zoomRectH / 100) * imgHeight);
    drawboxFilter = `drawbox=x=${rx}:y=${ry}:w=${rw}:h=${rh}:color=0xf97316@0.9:t=box:thickness=6,`;
  }

  // ── Canvas editor: crop ──
  let cropFilter = "";
  let cropX = 0, cropY = 0, cropW = imgWidth, cropH = imgHeight;
  if (
    opts.editorCropX !== undefined &&
    opts.editorCropY !== undefined &&
    opts.editorCropW !== undefined &&
    opts.editorCropH !== undefined &&
    opts.editorCropW > 0 &&
    opts.editorCropH > 0
  ) {
    const r = clampRegion(
      Math.round((opts.editorCropX / 100) * imgWidth),
      Math.round((opts.editorCropY / 100) * imgHeight),
      Math.round((opts.editorCropW / 100) * imgWidth),
      Math.round((opts.editorCropH / 100) * imgHeight),
      imgWidth, imgHeight
    );
    cropX = r.x; cropY = r.y; cropW = r.w; cropH = r.h;
    cropFilter = `crop=${r.w}:${r.h}:${r.x}:${r.y},`;
  }

  // Effective image dimensions after crop. This is the region that ends up
  // filling the output frame, so anything sized to look like "N% of the video"
  // has to be measured against it rather than against the raw screenshot.
  const effW = cropW;
  const effH = cropH;

  // ── Canvas editor: blur (supports multiple regions) ──
  const blurFilter = buildBlurFilter(opts, imgWidth, imgHeight);

  // ── Canvas editor: redaction ──
  let redactFilter = "";
  if (
    opts.editorRedactX !== undefined &&
    opts.editorRedactY !== undefined &&
    opts.editorRedactW !== undefined &&
    opts.editorRedactH !== undefined &&
    opts.editorRedactW > 0 &&
    opts.editorRedactH > 0
  ) {
    const rx = Math.round((opts.editorRedactX / 100) * imgWidth);
    const ry = Math.round((opts.editorRedactY / 100) * imgHeight);
    const rw = Math.round((opts.editorRedactW / 100) * imgWidth);
    const rh = Math.round((opts.editorRedactH / 100) * imgHeight);
    const rColor = (opts.editorRedactColor || "#000000").replace("#", "0x");
    redactFilter = `drawbox=x=${rx}:y=${ry}:w=${rw}:h=${rh}:color=${rColor}:t=fill,`;
  }

  // ── Canvas editor: watermark ──
  let watermarkFilter = "";
  if (opts.editorWatermarkText) {
    const fontFile = getFontPath();
    const wmSize = opts.editorWatermarkSize === "small" ? Math.round(outH * 0.03)
      : opts.editorWatermarkSize === "large" ? Math.round(outH * 0.06)
      : Math.round(outH * 0.045);
    const wmColor = (opts.editorWatermarkColor || "#FFFFFF").replace("#", "0x");
    const wmOpacity = Math.max(0.1, Math.min(1, opts.editorWatermarkOpacity ?? 0.5));
    const escapedWmText = opts.editorWatermarkText.replace(/'/g, "’").replace(/:/g, "\\:").replace(/%/g, "\\%");

    let wmX = "w-text_w-20";
    let wmY = "h-text_h-20";
    if (opts.editorWatermarkPosition?.includes("left")) wmX = "20";
    if (opts.editorWatermarkPosition?.includes("top")) wmY = "20";
    if (opts.editorWatermarkPosition === "center") {
      wmX = "(w-text_w)/2";
      wmY = "(h-text_h)/2";
    }

    watermarkFilter = `,drawtext=fontfile='${fontFile}':text='${escapedWmText}':fontcolor=${wmColor}@${wmOpacity.toFixed(2)}:fontsize=${wmSize}:x=${wmX}:y=${wmY}:shadowcolor=0x000000:shadowx=1:shadowy=1`;
  }

  // ── Canvas editor: pixelate (supports multiple regions) ──
  const pixelateFilter = buildPixelateFilter(opts, imgWidth, imgHeight);

  // ── Canvas editor: spotlight (supports multiple regions) ──
  const spotlightFilter = buildSpotlightFilter(opts, imgWidth, imgHeight);

  // ── Canvas editor: badge ──
  //
  // Drawn on the ORIGINAL image, alongside the highlight boxes, so the badge
  // stays attached to whatever UI element it was placed on while the camera
  // moves. It used to be applied after zoompan, which pinned it to the output
  // frame: place a badge on a button, zoom into that button, and the badge sat
  // where it started, pointing at nothing.
  //
  // Being pre-zoom also puts it in the coordinate space its percentages were
  // always measured in. Applied post-zoom, `imgWidth` was the wrong basis for a
  // frame that is `outW` wide — a badge dropped at 50% of a 2560px screenshot
  // landed at 66% of a 1920px frame, at 5.4% of frame height instead of 4%.
  let badgeFilter = "";
  if (
    opts.editorBadgeNumber !== undefined &&
    opts.editorBadgeX !== undefined &&
    opts.editorBadgeY !== undefined
  ) {
    const bx = Math.round((opts.editorBadgeX / 100) * imgWidth);
    const by = Math.round((opts.editorBadgeY / 100) * imgHeight);
    const bColor = (opts.editorBadgeColor || "#FBBF24").replace("#", "0x");
    const fontFile = getFontPath();
    // Sized against the region that will fill the frame, so a cropped render
    // still shows the badge at ~4% of frame height.
    const badgeSize = Math.round(Math.min(effW, effH) * 0.04);
    badgeFilter = `drawbox=x=${bx - badgeSize/2}:y=${by - badgeSize/2}:w=${badgeSize}:h=${badgeSize}:color=${bColor}:t=fill,drawtext=fontfile='${fontFile}':text='${opts.editorBadgeNumber}':fontcolor=0x000000:fontsize=${Math.round(badgeSize * 0.6)}:x=${bx}-text_w/2:y=${by}-text_h/2,`;
  }

  // ── Canvas editor: magnify ──
  //
  // A magnifier is two things in two different coordinate spaces, which is why
  // it was broken in both: the REGION it magnifies is a place on the screenshot,
  // while the INSET it draws is furniture pinned to a corner of the video. The
  // old filter did the whole thing after zoompan using screenshot pixel
  // coordinates, so it cropped the wrong area of the output frame (and could
  // ask for a region outside it entirely) and pinned the inset using the
  // screenshot's dimensions rather than the frame's.
  //
  // Split accordingly: the patch is cut from the annotated image in the static
  // pre-pass (so blurs and redactions are respected inside the magnifier — it
  // must not become a way to read past a redaction), and composited over the
  // finished frame afterwards.
  let magnifyPatchFilter = "";   // pre-pass: produces [patch]
  let magnifyOverlayFilter = ""; // video pass: composites [patch] onto the frame
  let magnifyInset: { x: number; y: number; w: number; h: number } | null = null;
  if (
    opts.editorMagnifyX !== undefined &&
    opts.editorMagnifyY !== undefined &&
    opts.editorMagnifyW !== undefined &&
    opts.editorMagnifyH !== undefined &&
    opts.editorMagnifyW > 0 &&
    opts.editorMagnifyH > 0
  ) {
    // Source region: screenshot space, clamped so a region dragged past the
    // edge cannot produce an out-of-bounds crop.
    const r = clampRegion(
      Math.round((opts.editorMagnifyX / 100) * imgWidth),
      Math.round((opts.editorMagnifyY / 100) * imgHeight),
      Math.round((opts.editorMagnifyW / 100) * imgWidth),
      Math.round((opts.editorMagnifyH / 100) * imgHeight),
      imgWidth, imgHeight
    );

    // Inset: output-frame space, 15% of the short side, in the chosen corner.
    const insetW = 2 * Math.round((Math.min(outW, outH) * 0.15) / 2);
    const insetH = insetW;
    const margin = Math.round(Math.min(outW, outH) * 0.02);
    const corner = opts.editorMagnifyCorner || "bottom-right";
    const insetX = corner.includes("left") ? margin : outW - insetW - margin;
    const insetY = corner.includes("top") ? margin : outH - insetH - margin;

    magnifyInset = { x: insetX, y: insetY, w: insetW, h: insetH };
    magnifyPatchFilter = `crop=${r.w}:${r.h}:${r.x}:${r.y},scale=${insetW}:${insetH}:flags=lanczos`;
    magnifyOverlayFilter = `overlay=${insetX}:${insetY}:format=auto`;
  }

  // ── Canvas editor: color filter ──
  const colorChain = buildColorFilterChain(opts.editorColorFilter, opts.editorColorFilterStrength);
  const colorFilter = colorChain ? `${colorChain},` : "";

  // Zoom target in supersampled-canvas pixels
  const geo = fitGeometry(effW, effH, ssW, ssH);

  // ── Zoom is OPTIONAL ──
  // If zoomTargetX/Y is undefined/null, or editorZoomScale is 1.0 (no zoom),
  // skip the zoompan filter entirely — the video will be a static image.
  let zoomFilter = "";
  if (opts.customZoomFilter) {
    // Multi-waypoint zoom: use the pre-built filter directly
    zoomFilter = opts.customZoomFilter;
  } else {
    const hasZoomTarget = opts.zoomTargetX !== undefined && opts.zoomTargetY !== undefined && opts.zoomTargetX !== null && opts.zoomTargetY !== null;
    // Only zoom if editorZoomScale is explicitly set and > 1.0.
    // No default — if editorZoomScale is undefined, don't zoom.
    const maxZoom = opts.editorZoomScale ?? 1.0;

    if (hasZoomTarget && maxZoom > 1.0) {
      let zoomTargetX = opts.zoomTargetX!;
      let zoomTargetY = opts.zoomTargetY!;
      if (cropFilter) {
        const targetOrigX = (zoomTargetX / 100) * imgWidth;
        const targetOrigY = (zoomTargetY / 100) * imgHeight;
        const localX = targetOrigX - cropX;
        const localY = targetOrigY - cropY;
        zoomTargetX = clamp((localX / effW) * 100, 0, 100);
        zoomTargetY = clamp((localY / effH) * 100, 0, 100);
      }
      const targetXPx = geo.offsetX + (zoomTargetX / 100) * geo.scaledW;
      const targetYPx = geo.offsetY + (zoomTargetY / 100) * geo.scaledH;
      zoomFilter = buildZoomFilter(targetXPx, targetYPx, paddedDuration, outputRes, maxZoom);
    }
  }

  // ── Canvas editor: text overlay ──
  //
  // Like the badge, this is placed against the screenshot in the editor, so it
  // belongs in the pre-zoom chain and travels with the content. Its position is
  // therefore in full-image pixels, not output pixels.
  //
  // Consequence worth knowing: the label is now part of the picture, so the
  // camera scales it. Zooming in makes the text grow, which is right for a
  // label pinned to a UI element and wrong if you wanted fixed-size furniture —
  // that is what the watermark and captions are for.
  let overlayFilter = "";
  if (opts.editorOverlayText && opts.editorOverlayX !== undefined && opts.editorOverlayY !== undefined) {
    const fontFile = getFontPath();
    // Sized against the post-crop region so it still reads as the same
    // proportion of the finished frame.
    const ovSize = opts.editorOverlaySize === "small" ? Math.round(effH * 0.04)
      : opts.editorOverlaySize === "large" ? Math.round(effH * 0.07)
      : Math.round(effH * 0.055);
    const ovColor = (opts.editorOverlayColor || "#FFFFFF").replace("#", "0x");
    const ovX = Math.round((opts.editorOverlayX / 100) * imgWidth);
    const ovY = Math.round((opts.editorOverlayY / 100) * imgHeight);
    const escapedOvText = opts.editorOverlayText.replace(/'/g, "’").replace(/:/g, "\\:").replace(/%/g, "\\%");
    overlayFilter = `drawtext=fontfile='${fontFile}':text='${escapedOvText}':fontcolor=${ovColor}:fontsize=${ovSize}:x=${ovX}-text_w/2:y=${ovY}-text_h/2:shadowcolor=0x000000:shadowx=2:shadowy=2,`;
  }

  // ── Captions: prefer canvas editor caption if set ──
  let captionsFilter = "";
  const captionText = opts.editorCaptionText || opts.captions?.text || "";
  const captionStyle = opts.editorCaptionStyle || opts.captions?.style || "standard";
  const captionSize = opts.editorCaptionSize || opts.captions?.size || "medium";
  const captionPosition = opts.editorCaptionPosition || opts.captions?.position || "bottom";
  const captionColor = opts.editorCaptionColor || opts.captions?.color || "#FFFFFF";

  if (captionText && opts.captions?.enabled) {
    const caps = await buildCaptionsFilter(
      captionText,
      captionStyle,
      captionSize,
      captionPosition,
      captionColor,
      outW,
      outH,
      opts.audioDuration
    );
    if (caps) {
      captionsFilter = `,${caps}`;
    }
  }

  // ── Split the graph into a STATIC pre-pass and a MOTION pass ──
  //
  // `-loop 1 -i image` makes FFmpeg re-run the whole filter graph once per
  // output frame. Every filter below (annotations, crop, letterbox backdrop,
  // the lanczos upscale to the supersampled canvas) depends only on the source
  // still, so it produced a byte-identical result on all ~200-900 frames of the
  // clip. Computing it once into a base frame is where the bulk of the render
  // time went: measured 10.7s -> 3.9s on a 7s 1080p clip.
  //
  // Only filters that vary with time — zoompan and the overlays layered on top
  // of it — stay in the per-frame pass.
  const stripComma = (s: string) => s.replace(/^,+/, "").replace(/,+$/, "");

  // When zoomFilter is empty (no zoom), zoompan doesn't downscale from supersampled
  // to output resolution, so we need an explicit scale step.
  const downscaleFilter = zoomFilter ? "" : `scale=${outW}:${outH}:flags=lanczos`;

  // Only frame furniture stays here — things that belong to the video rather
  // than to the picture, and so must not move when the camera does.
  const postZoomParts = [zoomFilter, watermarkFilter, captionsFilter, downscaleFilter]
    .map(stripComma)
    .filter((f) => f && f.length > 0);
  const postZoomChain = postZoomParts.join(",");

  // Annotations that point at something in the screenshot. Baked into the image
  // before the camera moves, so they stay attached to what they annotate.
  //
  // The crop is deliberately NOT included here: everything above is expressed
  // in full-image coordinates, so the crop has to come after (buildBaseChain
  // appends it), and the magnifier needs to cut its patch from the annotated
  // image before the crop narrows it — after the blurs and redactions, so the
  // magnifier can never be used to read past a redaction.
  const annotationFilters =
    `${drawboxFilter}${blurFilter}${redactFilter}${pixelateFilter}${spotlightFilter}` +
    `${badgeFilter}${overlayFilter}${colorFilter}`;

  // The blurred backdrop only ever shows in the letterbox bars. When the source
  // fits the canvas edge-to-edge (a 16:9 screenshot into a 16:9 video — the
  // common case) it is completely hidden behind the foreground, so skip it.
  const needsBackdrop = geo.offsetX > 1 || geo.offsetY > 1;

  const buildBaseChain = (input: string) =>
    needsBackdrop
      ? `${input}${cropFilter}split=2[bg][fg];` +
        `[bg]scale=${2 * Math.round(BG_PROXY_WIDTH / 2)}:${2 * Math.round((BG_PROXY_WIDTH * ssH) / ssW / 2)}:force_original_aspect_ratio=increase:flags=bilinear,` +
        `crop=${2 * Math.round(BG_PROXY_WIDTH / 2)}:${2 * Math.round((BG_PROXY_WIDTH * ssH) / ssW / 2)},` +
        `boxblur=${BG_BLUR_AT_PROXY}:${BG_BLUR_AT_PROXY},scale=${ssW}:${ssH}:flags=bilinear[bg_blurred];` +
        `[fg]scale=${ssW}:${ssH}:force_original_aspect_ratio=decrease:flags=lanczos[fg_scaled];` +
        `[bg_blurred][fg_scaled]overlay=(W-w)/2:(H-h)/2[base]`
      : `${input}${cropFilter}scale=${ssW}:${ssH}:force_original_aspect_ratio=decrease:flags=lanczos,` +
        `pad=${ssW}:${ssH}:(ow-iw)/2:(oh-ih)/2[base]`;

  const prepassFilter = magnifyPatchFilter
    // Fork the annotated image: one branch becomes the base frame, the other
    // becomes the magnifier patch. Both fall out of the same single pre-pass.
    ? `[0:v]${annotationFilters}split=2[ann_base][ann_mag];` +
      buildBaseChain("[ann_base]") +
      `;[ann_mag]${magnifyPatchFilter}[patch]`
    : buildBaseChain(`[0:v]${annotationFilters}`);

  const basePath = path.join(WORK_DIR, `base_${nanoid(12)}.png`);
  const patchPath = magnifyPatchFilter ? path.join(WORK_DIR, `mag_${nanoid(12)}.png`) : null;

  // The magnifier inset is composited last, over the finished frame, so the
  // camera never moves it.
  const insetBorder = magnifyInset
    ? `,drawbox=x=${magnifyInset.x}:y=${magnifyInset.y}:w=${magnifyInset.w}:h=${magnifyInset.h}:` +
      `color=white@0.8:t=${Math.max(2, Math.round(Math.min(outW, outH) * 0.003))}`
    : "";

  // ── Video pass inputs ──
  // 0 = base frame, 1 = audio, then the optional image inputs in a fixed order.
  // Their indices shift depending on what is present, so they are tracked here
  // rather than hardcoded.
  const extraInputs: string[] = [];
  const patchIdx = patchPath ? 2 + extraInputs.push(patchPath) - 1 : -1;
  const cursorIdx = opts.cursor ? 2 + extraInputs.push(opts.cursor.pngPath) - 1 : -1;

  const audioChain = `[1:a]${buildAudioFilter(
    opts.clipDurationOverride && opts.clipDurationOverride > 0 ? paddedDuration : undefined,
    opts.normalizeAudio !== false
  )}[a]`;

  // Compositing order after the camera move: magnifier inset, then cursor on
  // top of everything — a pointer is never occluded by furniture.
  const stages: string[] = [];
  let last = "vz";
  stages.push(`[0:v]${postZoomChain ? postZoomChain + "," : ""}format=yuv420p[${last}]`);
  if (patchIdx >= 0) {
    stages.push(`[${last}][${patchIdx}:v]${magnifyOverlayFilter}${insetBorder}[vm]`);
    last = "vm";
  }
  if (cursorIdx >= 0) {
    stages.push(`[${last}][${cursorIdx}:v]overlay=x='${opts.cursor!.xExpr}':y='${opts.cursor!.yExpr}'[vc]`);
    last = "vc";
  }
  // Rename the final stage's output to [v] for the mapping below.
  stages[stages.length - 1] = stages[stages.length - 1].replace(
    new RegExp(`\\[${last}\\]$`),
    "[v]"
  );

  const videoFilter = `${stages.join(";")};${audioChain}`;

  try {
    if (!ffmpegPath) throw new Error("ffmpeg-static path is undefined");

    // Pass 1: composite the static base frame once (plus the magnifier patch,
    // as a second output of the same command).
    await execFileAsync(ffmpegPath, [
      "-y",
      "-i", opts.screenshotPath,
      "-filter_complex", prepassFilter,
      "-map", "[base]",
      "-frames:v", "1",
      "-compression_level", "1", // fastest PNG encode; this file is transient
      basePath,
      ...(patchPath ? ["-map", "[patch]", "-frames:v", "1", "-compression_level", "1", patchPath] : []),
    ], { timeout: 120000 });

    // Pass 2: animate the base frame.
    await execFileAsync(ffmpegPath, [
      "-y",
      "-loop", "1",
      "-i", basePath,
      "-i", opts.audioPath,
      ...extraInputs.flatMap((f) => ["-loop", "1", "-i", f]),
      "-filter_complex", videoFilter,
      "-map", "[v]",
      "-map", "[a]",
      "-c:v", "libx264",
      "-preset", X264_PRESET,
      "-crf", "20",
      ...cutPointArgs(opts.transitionDurationSec),
      "-c:a", "aac",
      "-b:a", "160k",
      "-ar", "44100",
      "-pix_fmt", "yuv420p",
      "-t", paddedDuration.toFixed(3),
      "-movflags", "+faststart",
      outputPath,
    ], { timeout: 300000 });
  } catch (err: any) {
    log.warn("Primary render failed, retrying simplified", { error: err.message });
    return renderStepVideoFallback(opts, outputPath, paddedDuration);
  } finally {
    await fs.unlink(basePath).catch(() => {});
    if (patchPath) await fs.unlink(patchPath).catch(() => {});
  }

  // Verify output
  const stat = await fs.stat(outputPath);
  if (stat.size === 0) throw new Error("FFmpeg produced an empty video file");

  return outputPath;
}

/**
 * Fallback render: no supersampling, no loudnorm — just the eased zoom.
 * Used when the full pipeline fails (e.g. low-memory environments).
 */
async function renderStepVideoFallback(
  opts: Parameters<typeof renderStepVideo>[0],
  outputPath: string,
  paddedDuration: number
): Promise<string> {
  const outputRes = opts.outputRes || "1920x1080";
  const [outW, outH] = outputRes.split("x").map(Number);

  let imgWidth = 1920;
  let imgHeight = 1080;
  try {
    const dims = await probeImageDimensions(opts.screenshotPath);
    imgWidth = dims.width;
    imgHeight = dims.height;
  } catch {
    // keep fallback values
  }

  // Highlight boxes (multiple, drawn on the ORIGINAL image so they zoom with content)
  let drawboxFilter = "";
  // New: multiple highlight boxes from editorHighlights array
  if (opts.editorHighlights && opts.editorHighlights.length > 0) {
    const boxes = opts.editorHighlights.map((hl) => {
      const rx = Math.round((hl.x / 100) * imgWidth);
      const ry = Math.round((hl.y / 100) * imgHeight);
      const rw = Math.round((hl.w / 100) * imgWidth);
      const rh = Math.round((hl.h / 100) * imgHeight);
      const color = (hl.color || "#FF0099").replace("#", "0x");
      const thickness = Math.max(2, Math.round(Math.min(imgWidth, imgHeight) * 0.003));
      return `drawbox=x=${rx}:y=${ry}:w=${rw}:h=${rh}:color=${color}@0.9:t=box:thickness=${thickness}`;
    });
    drawboxFilter = boxes.join(",") + ",";
  }
  // Legacy: single zoomRect highlight box
  else if (
    opts.zoomRectX !== undefined &&
    opts.zoomRectY !== undefined &&
    opts.zoomRectW !== undefined &&
    opts.zoomRectH !== undefined
  ) {
    const rx = Math.round((opts.zoomRectX / 100) * imgWidth);
    const ry = Math.round((opts.zoomRectY / 100) * imgHeight);
    const rw = Math.round((opts.zoomRectW / 100) * imgWidth);
    const rh = Math.round((opts.zoomRectH / 100) * imgHeight);
    drawboxFilter = `drawbox=x=${rx}:y=${ry}:w=${rw}:h=${rh}:color=0xf97316@0.9:t=box:thickness=6,`;
  }

  // ── Canvas editor: crop (fallback) ──
  let cropFilter = "";
  let cropX = 0, cropY = 0, cropW = imgWidth, cropH = imgHeight;
  if (
    opts.editorCropX !== undefined &&
    opts.editorCropY !== undefined &&
    opts.editorCropW !== undefined &&
    opts.editorCropH !== undefined &&
    opts.editorCropW > 0 &&
    opts.editorCropH > 0
  ) {
    const r = clampRegion(
      Math.round((opts.editorCropX / 100) * imgWidth),
      Math.round((opts.editorCropY / 100) * imgHeight),
      Math.round((opts.editorCropW / 100) * imgWidth),
      Math.round((opts.editorCropH / 100) * imgHeight),
      imgWidth, imgHeight
    );
    cropX = r.x; cropY = r.y; cropW = r.w; cropH = r.h;
    cropFilter = `crop=${r.w}:${r.h}:${r.x}:${r.y},`;
  }

  // ── Canvas editor: blur (fallback, supports multiple regions) ──
  const blurFilter = buildBlurFilter(opts, imgWidth, imgHeight);

  // ── Canvas editor: redaction (fallback) ──
  let redactFilter = "";
  if (
    opts.editorRedactX !== undefined &&
    opts.editorRedactY !== undefined &&
    opts.editorRedactW !== undefined &&
    opts.editorRedactH !== undefined &&
    opts.editorRedactW > 0 &&
    opts.editorRedactH > 0
  ) {
    const rx = Math.round((opts.editorRedactX / 100) * imgWidth);
    const ry = Math.round((opts.editorRedactY / 100) * imgHeight);
    const rw = Math.round((opts.editorRedactW / 100) * imgWidth);
    const rh = Math.round((opts.editorRedactH / 100) * imgHeight);
    const rColor = (opts.editorRedactColor || "#000000").replace("#", "0x");
    redactFilter = `drawbox=x=${rx}:y=${ry}:w=${rw}:h=${rh}:color=${rColor}:t=fill,`;
  }

  // ── Canvas editor: watermark (fallback) ──
  let watermarkFilter = "";
  if (opts.editorWatermarkText) {
    const fontFile = getFontPath();
    const wmSize = opts.editorWatermarkSize === "small" ? Math.round(outH * 0.03)
      : opts.editorWatermarkSize === "large" ? Math.round(outH * 0.06)
      : Math.round(outH * 0.045);
    const wmColor = (opts.editorWatermarkColor || "#FFFFFF").replace("#", "0x");
    const wmOpacity = Math.max(0.1, Math.min(1, opts.editorWatermarkOpacity ?? 0.5));
    const escapedWmText = opts.editorWatermarkText.replace(/'/g, "’").replace(/:/g, "\\:").replace(/%/g, "\\%");

    let wmX = "w-text_w-20";
    let wmY = "h-text_h-20";
    if (opts.editorWatermarkPosition?.includes("left")) wmX = "20";
    if (opts.editorWatermarkPosition?.includes("top")) wmY = "20";
    if (opts.editorWatermarkPosition === "center") {
      wmX = "(w-text_w)/2";
      wmY = "(h-text_h)/2";
    }

    watermarkFilter = `,drawtext=fontfile='${fontFile}':text='${escapedWmText}':fontcolor=${wmColor}@${wmOpacity.toFixed(2)}:fontsize=${wmSize}:x=${wmX}:y=${wmY}:shadowcolor=0x000000:shadowx=1:shadowy=1`;
  }

  // ── Canvas editor: pixelate (fallback, supports multiple regions) ──
  const pixelateFilter = buildPixelateFilter(opts, imgWidth, imgHeight);

  // ── Canvas editor: spotlight (fallback, supports multiple regions) ──
  const spotlightFilter = buildSpotlightFilter(opts, imgWidth, imgHeight);

  // ── Canvas editor: badge (fallback) ──
  let badgeFilter = "";
  if (
    opts.editorBadgeNumber !== undefined &&
    opts.editorBadgeX !== undefined &&
    opts.editorBadgeY !== undefined
  ) {
    const bx = Math.round((opts.editorBadgeX / 100) * imgWidth);
    const by = Math.round((opts.editorBadgeY / 100) * imgHeight);
    const bColor = (opts.editorBadgeColor || "#FBBF24").replace("#", "0x");
    const fontFile = getFontPath();
    const badgeSize = Math.round(Math.min(cropW, cropH) * 0.04);
    badgeFilter = `drawbox=x=${bx - badgeSize/2}:y=${by - badgeSize/2}:w=${badgeSize}:h=${badgeSize}:color=${bColor}:t=fill,drawtext=fontfile='${fontFile}':text='${opts.editorBadgeNumber}':fontcolor=0x000000:fontsize=${Math.round(badgeSize * 0.6)}:x=${bx}-text_w/2:y=${by}-text_h/2,`;
  }

  // ── Canvas editor: magnify (fallback) ──
  let magnifyFilter = "";
  if (
    opts.editorMagnifyX !== undefined &&
    opts.editorMagnifyY !== undefined &&
    opts.editorMagnifyW !== undefined &&
    opts.editorMagnifyH !== undefined &&
    opts.editorMagnifyW > 0 &&
    opts.editorMagnifyH > 0
  ) {
    // The primary renderer splits this across two passes so the inset stays
    // pinned to the frame. The fallback is a single pass, so it keeps the whole
    // magnifier in image space: the region magnified is correct and the crop can
    // no longer run off the edge, but the inset scales with the camera.
    const r = clampRegion(
      Math.round((opts.editorMagnifyX / 100) * imgWidth),
      Math.round((opts.editorMagnifyY / 100) * imgHeight),
      Math.round((opts.editorMagnifyW / 100) * imgWidth),
      Math.round((opts.editorMagnifyH / 100) * imgHeight),
      imgWidth, imgHeight
    );
    const corner = opts.editorMagnifyCorner || "bottom-right";
    const insetW = 2 * Math.round((Math.min(imgWidth, imgHeight) * 0.15) / 2);
    const insetH = insetW;
    const margin = Math.round(Math.min(imgWidth, imgHeight) * 0.02);
    const insetX = corner.includes("left") ? margin : imgWidth - insetW - margin;
    const insetY = corner.includes("top") ? margin : imgHeight - insetH - margin;
    const border = Math.max(2, Math.round(Math.min(imgWidth, imgHeight) * 0.003));
    magnifyFilter = `split[orig][magbase];[magbase]crop=${r.w}:${r.h}:${r.x}:${r.y},scale=${insetW}:${insetH}:flags=lanczos[mag];[orig][mag]overlay=${insetX}:${insetY}:format=auto,drawbox=x=${insetX}:y=${insetY}:w=${insetW}:h=${insetH}:color=white@0.8:t=${border},`;
  }

  // ── Canvas editor: color filter (fallback) ──
  const colorChain = buildColorFilterChain(opts.editorColorFilter, opts.editorColorFilterStrength);
  const colorFilter = colorChain ? `${colorChain},` : "";

  // Effective image dimensions after crop (for zoom/geometry calculations)
  const effW = cropW;
  const effH = cropH;

  // Remap zoom target from original-image percentage to cropped-image percentage
  let zoomTargetX = opts.zoomTargetX ?? 50;
  let zoomTargetY = opts.zoomTargetY ?? 50;
  if (cropFilter && opts.zoomTargetX !== undefined && opts.zoomTargetY !== undefined) {
    const targetOrigX = (opts.zoomTargetX / 100) * imgWidth;
    const targetOrigY = (opts.zoomTargetY / 100) * imgHeight;
    const localX = targetOrigX - cropX;
    const localY = targetOrigY - cropY;
    zoomTargetX = clamp((localX / effW) * 100, 0, 100);
    zoomTargetY = clamp((localY / effH) * 100, 0, 100);
  }

  // Fallback renders at output resolution (no supersampling), so compute
  // zoom target in output-resolution pixels directly.
  const geo = fitGeometry(effW, effH, outW, outH);
  const maxZoom = opts.editorZoomScale ?? 1.0;
  const hasZoomTarget = opts.zoomTargetX !== undefined && opts.zoomTargetY !== undefined && opts.zoomTargetX !== null && opts.zoomTargetY !== null;
  let zoomFilter = "";
  if (opts.customZoomFilter) {
    zoomFilter = opts.customZoomFilter;
  } else {
    zoomFilter = (hasZoomTarget && maxZoom > 1.0)
      ? buildZoomFilter(geo.offsetX + (zoomTargetX! / 100) * geo.scaledW, geo.offsetY + (zoomTargetY! / 100) * geo.scaledH, paddedDuration, outputRes, maxZoom)
      : "";
  }
  const delayMs = Math.round(AUDIO_LEAD_IN * 1000);

  // ── Canvas editor: text overlay ──
  let overlayFilter = "";
  if (opts.editorOverlayText && opts.editorOverlayX !== undefined && opts.editorOverlayY !== undefined) {
    const fontFile = getFontPath();
    // Image space, matching the primary renderer, so the label stays on what it
    // labels rather than floating over the frame.
    const ovSize = opts.editorOverlaySize === "small" ? Math.round(cropH * 0.04)
      : opts.editorOverlaySize === "large" ? Math.round(cropH * 0.07)
      : Math.round(cropH * 0.055);
    const ovColor = (opts.editorOverlayColor || "#FFFFFF").replace("#", "0x");
    const ovX = Math.round((opts.editorOverlayX / 100) * imgWidth);
    const ovY = Math.round((opts.editorOverlayY / 100) * imgHeight);
    const escapedOvText = opts.editorOverlayText.replace(/'/g, "’").replace(/:/g, "\\:").replace(/%/g, "\\%");
    overlayFilter = `drawtext=fontfile='${fontFile}':text='${escapedOvText}':fontcolor=${ovColor}:fontsize=${ovSize}:x=${ovX}-text_w/2:y=${ovY}-text_h/2:shadowcolor=0x000000:shadowx=2:shadowy=2,`;
  }

  // ── Captions: prefer canvas editor caption if set ──
  let captionsFilter = "";
  const captionText = opts.editorCaptionText || opts.captions?.text || "";
  const captionStyle = opts.editorCaptionStyle || opts.captions?.style || "standard";
  const captionSize = opts.editorCaptionSize || opts.captions?.size || "medium";
  const captionPosition = opts.editorCaptionPosition || opts.captions?.position || "bottom";
  const captionColor = opts.editorCaptionColor || opts.captions?.color || "#FFFFFF";

  if (captionText && opts.captions?.enabled) {
    const caps = await buildCaptionsFilter(
      captionText,
      captionStyle,
      captionSize,
      captionPosition,
      captionColor,
      outW,
      outH,
      opts.audioDuration
    );
    if (caps) {
      captionsFilter = `,${caps}`;
    }
  }

  const stripCommaMz = (s: string) => s.replace(/^,+/, "").replace(/,+$/, "");
  const mzPostZoomParts = [zoomFilter, watermarkFilter, captionsFilter]
    .map(stripCommaMz)
    .filter((f) => f && f.length > 0);
  const mzPostZoomChain = mzPostZoomParts.join(",");

  const args = [
    "-y",
    "-loop", "1",
    "-i", opts.screenshotPath,
    "-i", opts.audioPath,
    "-filter_complex",
    `[0:v]${drawboxFilter}${blurFilter}${redactFilter}${pixelateFilter}${spotlightFilter}${badgeFilter}${overlayFilter}${magnifyFilter}${colorFilter}${cropFilter}scale=${outW}:${outH}:force_original_aspect_ratio=decrease,` +
      `pad=${outW}:${outH}:(ow-iw)/2:(oh-ih)/2${mzPostZoomChain ? "," + mzPostZoomChain : ""},format=yuv420p[v];` +
      `[1:a]adelay=${delayMs}:all=1,${opts.clipDurationOverride && opts.clipDurationOverride > 0 ? `apad=whole_dur=${paddedDuration.toFixed(3)}` : `apad=pad_dur=${AUDIO_TAIL}`}[a]`,
    "-map", "[v]",
    "-map", "[a]",
    "-c:v", "libx264",
    "-preset", X264_PRESET,
    "-crf", "23",
    ...cutPointArgs(opts.transitionDurationSec),
    "-c:a", "aac",
    "-b:a", "128k",
    "-ar", "44100",
    "-pix_fmt", "yuv420p",
    "-t", paddedDuration.toFixed(3),
    "-movflags", "+faststart",
    outputPath,
  ];

  if (!ffmpegPath) throw new Error("ffmpeg-static path is undefined");
  await execFileAsync(ffmpegPath, args, {
    timeout: 180000,
    });

  const stat = await fs.stat(outputPath);
  if (stat.size === 0) throw new Error("FFmpeg produced an empty video file");

  return outputPath;
}

/**
 * Concatenate multiple video segments into a final MP4 with HARD CUTS.
 *
 * Human-edited tutorial videos use clean cuts between steps, not slideshow
 * crossfades. Since every segment is produced by our own renderer with
 * identical codec parameters, the concat demuxer with stream copy is both
 * lossless and near-instant.
 *
 * @param segmentPaths - Array of video segment file paths
 * @param _segmentDurations - kept for call-site compatibility (unused)
 */
export async function concatenateSegments(
  segmentPaths: string[],
  _segmentDurations?: number[],
): Promise<string> {
  void _segmentDurations; // kept for call-site compatibility (unused)
  await ensureWorkDir();

  if (segmentPaths.length === 0) throw new Error("No segments to concatenate");
  if (segmentPaths.length === 1) return segmentPaths[0];

  const concatId = nanoid(8);
  const concatFile = path.join(WORK_DIR, `concat_${concatId}.txt`);
  const outputPath = path.join(WORK_DIR, `final_${concatId}.mp4`);

  const concatContent = segmentPaths
    .map((p) => `file '${p.replace(/\\/g, "/")}'`)
    .join("\n");

  await fs.writeFile(concatFile, concatContent, "utf-8");

  try {
    if (!ffmpegPath) throw new Error("ffmpeg-static path is undefined");
    await execFileAsync(ffmpegPath, [
      "-y",
      "-f", "concat",
      "-safe", "0",
      "-i", concatFile,
      "-c", "copy",
      "-movflags", "+faststart",
      outputPath,
    ], {
      timeout: 120000,
      });
  } catch (err: any) {
    log.warn("Stream-copy concat failed, re-encoding", { error: err.message });
    return concatenateSegmentsReencode(segmentPaths);
  } finally {
    await fs.unlink(concatFile).catch(() => {});
  }

  const stat = await fs.stat(outputPath);
  if (stat.size === 0) throw new Error("FFmpeg produced an empty final video");

  return outputPath;
}

/**
 * Fallback concatenation that re-encodes (handles mismatched segment params).
 */
async function concatenateSegmentsReencode(
  segmentPaths: string[]
): Promise<string> {
  await ensureWorkDir();

  const concatId = nanoid(8);
  const outputPath = path.join(WORK_DIR, `final_reenc_${concatId}.mp4`);

  const inputArgs: string[] = [];
  for (const segPath of segmentPaths) {
    inputArgs.push("-i", segPath);
  }

  // concat filter: [0:v][0:a][1:v][1:a]...concat=n=N:v=1:a=1[v][a]
  const streamRefs = segmentPaths.map((_, i) => `[${i}:v][${i}:a]`).join("");
  const filterComplex = `${streamRefs}concat=n=${segmentPaths.length}:v=1:a=1[v][a]`;

  if (!ffmpegPath) throw new Error("ffmpeg-static path is undefined");
  await execFileAsync(ffmpegPath, [
    "-y",
    ...inputArgs,
    "-filter_complex", filterComplex,
    "-map", "[v]",
    "-map", "[a]",
    "-c:v", "libx264",
    "-preset", X264_PRESET,
    "-crf", "20",
    "-c:a", "aac",
    "-b:a", "160k",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    outputPath,
  ], {
    timeout: 300000,
    });

  const stat = await fs.stat(outputPath);
  if (stat.size === 0) throw new Error("FFmpeg produced an empty final video");

  return outputPath;
}

export function resolutionToSize(res: string, aspectRatio: string = "16:9"): string {
  let shortEdge = 1080;
  if (res === "720p") shortEdge = 720;
  if (res === "4k") shortEdge = 2160;

  switch (aspectRatio) {
    case "9:16":
      return `${shortEdge}x${Math.round(shortEdge * (16 / 9))}`;
    case "1:1":
      return `${shortEdge}x${shortEdge}`;
    case "4:5":
      return `${shortEdge}x${Math.round(shortEdge * (5 / 4))}`;
    case "16:9":
    default:
      // Width is long edge, height is short edge
      return `${Math.round(shortEdge * (16 / 9))}x${shortEdge}`;
  }
}

/**
 * Generate a gradient background video segment with text overlay for Intro/Outro.
 * Uses Windows-compatible FFmpeg filter syntax (0x hex colors, no single-quote wrapping).
 */
export async function renderTextSegment(
  template: string,
  text: string,
  outputRes: string,
  durationSec: number = 3.0
): Promise<string> {
  await ensureWorkDir();
  const outputPath = path.join(WORK_DIR, `text_${nanoid(12)}.mp4`);
  const [, outH] = outputRes.split("x").map(Number);

  // Windows FFmpeg needs 0xRRGGBB instead of #RRGGBB
  let color1 = "0x1e3a8a"; // blue-900
  let textColor = "white";
  switch (template) {
    case "blue-fade":
      color1 = "0x1e3a8a";
      textColor = "white";
      break;
    case "dark-minimal":
      color1 = "0x0a0a0a";
      textColor = "white";
      break;
    case "warm-title":
      color1 = "0x7c2d12";
      textColor = "white";
      break;
    case "teal-glow":
      color1 = "0x042f2e";
      textColor = "white";
      break;
    case "purple-haze":
      color1 = "0x2e1065";
      textColor = "white";
      break;
    case "clean-white":
      color1 = "0xf8fafc";
      textColor = "0x1e293b"; // Dark slate
      break;
  }

  // Use the downloaded Roboto font
  const fontFile = getFontPath();
  // Escape text for FFmpeg drawtext: colons, single-quotes, backslashes
  const escapedText = text.replace(/'/g, "’").replace(/:/g, "\\:").replace(/%/g, "\\%");

  const fontSize = Math.round(outH * 0.07);

  const args = [
    "-y",
    "-f", "lavfi", "-i", `color=c=${color1}:s=${outputRes}:d=${durationSec}:r=30`,
    "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
    "-vf", `drawtext=fontfile=${fontFile}:text='${escapedText}':fontcolor=${textColor}:fontsize=${fontSize}:x=(w-text_w)/2:y=(h-text_h)/2:shadowcolor=0x000000:shadowx=2:shadowy=2`,
    "-c:v", "libx264",
    "-preset", X264_PRESET,
    "-crf", "23",
    ...gopArgs(),
    "-c:a", "aac",
    "-t", durationSec.toString(),
    "-pix_fmt", "yuv420p",
    "-shortest",
    outputPath,
  ];

  if (!ffmpegPath) throw new Error("ffmpeg-static path is undefined");
  try {
    log.info("Rendering text segment", { text: text.substring(0, 50) });
    await execFileAsync(ffmpegPath, args, { timeout: 60000 });
  } catch (err: any) {
    log.warn("drawtext failed, trying plain color fallback", { error: err.message });
    // Fallback: just colored background without text
    const fbArgs = [
      "-y",
      "-f", "lavfi", "-i", `color=c=${color1}:s=${outputRes}:d=${durationSec}:r=30`,
      "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
      "-c:v", "libx264", "-c:a", "aac",
      "-t", durationSec.toString(), "-pix_fmt", "yuv420p", "-shortest",
      outputPath,
    ];
    await execFileAsync(ffmpegPath, fbArgs, { timeout: 60000 });
  }

  return outputPath;
}

/** Map our frontend transition names onto FFmpeg xfade names. */
function xfadeName(requested: string): string {
  switch (requested) {
    case "slide-left": return "slideleft";
    case "slide-right": return "slideright";
    case "slide-up": return "slideup";
    // "flip" has no xfade equivalent; pixelize is the closest in feel
    case "flip": return "pixelize";
    case "dissolve": return "fade";
    default: return "fade";
  }
}

/**
 * Concatenate segments with crossfade transitions, re-encoding ONLY the
 * transition regions.
 *
 * The obvious implementation — one xfade filter chain over every input — makes
 * FFmpeg decode and re-encode the entire timeline to produce a few seconds of
 * actual blending. Measured on 8 scenes / 56s of video: 21.3s, against 0.3s for
 * a stream-copy concat. All that work reproduces frames that were already
 * encoded, slightly worse each time.
 *
 * Instead: cut each segment into a body (stream-copied, free) and a short
 * overlap, encode only the overlaps into transition clips, then concat the
 * whole sequence with the demuxer.
 *
 *   [body0][trans0][body1][trans1][body2] ... [bodyN-1]
 *
 * Copying can only START on a keyframe, which is why segments carry an IDR
 * frame every CUT_GRID_SEC (see gopArgs) and the transition duration is snapped
 * to that grid.
 *
 * Audio deliberately does NOT follow the same split. Every AAC encode prepends
 * priming samples, so encoding each of the ~2n clips separately made the
 * concatenated result drift long by roughly 43ms per clip (measured: 53.15s
 * where 52.50s was expected, across 15 clips). The audio is therefore built in
 * a single pass over the original segments — cheap, since only audio is
 * decoded — and muxed against the copied video at the end. That also preserves
 * true acrossfade blending instead of butt-joining at each cut.
 *
 * Falls back to the single-pass xfade on any failure, and that in turn falls
 * back to a plain concat — output is always produced.
 */
export async function concatenateSegmentsWithTransitions(
  segmentPaths: string[],
  transitions: string[],
  transitionDuration: number = 0.5
): Promise<string> {
  await ensureWorkDir();

  if (segmentPaths.length === 0) throw new Error("No segments to concatenate");
  if (segmentPaths.length === 1) return segmentPaths[0];

  try {
    return await concatViaTransitionClips(segmentPaths, transitions, transitionDuration);
  } catch (err: any) {
    log.warn("Split-encode concat failed, falling back to single-pass xfade", {
      error: err?.message ?? String(err),
    });
  }

  return concatViaSinglePassXfade(segmentPaths, transitions, transitionDuration);
}

/**
 * Fast path: encode only the crossfade regions, stream-copy everything else.
 */
async function concatViaTransitionClips(
  segmentPaths: string[],
  transitions: string[],
  transitionDuration: number
): Promise<string> {
  if (!ffmpegPath) throw new Error("ffmpeg-static path is undefined");

  const n = segmentPaths.length;
  const id = nanoid(8);
  const outputPath = path.join(WORK_DIR, `final_split_${id}.mp4`);
  const scratch: string[] = [];

  // Snap to the keyframe grid the segments were encoded on. The default 0.5s
  // is already a grid multiple, so it is untouched for almost every project.
  const td = Math.max(
    CUT_GRID_SEC,
    Math.round(transitionDuration / CUT_GRID_SEC) * CUT_GRID_SEC
  );

  const durations: number[] = [];
  for (const p of segmentPaths) durations.push(await probeMediaDuration(p));

  // Each segment gives up `td` to the transition before it and `td` to the one
  // after. Without enough left over there is no body to copy, so bail to the
  // single-pass path rather than emitting degenerate clips.
  for (let i = 0; i < n; i++) {
    const consumed = (i === 0 || i === n - 1 ? 1 : 2) * td;
    if (durations[i] - consumed < CUT_GRID_SEC) {
      throw new Error(
        `Segment ${i} (${durations[i].toFixed(2)}s) is too short for ${td}s transitions`
      );
    }
  }

  // A stream copy that starts mid-GOP yields frames referencing data we threw
  // away. Confirm the cut point really is an IDR frame in every segment rather
  // than assuming the encoder honoured the request; if not, fall back.
  for (let i = 1; i < n; i++) {
    if (!(await hasKeyframeAt(segmentPaths[i], td))) {
      throw new Error(`Segment ${i} has no keyframe at ${td}s; cannot stream-copy`);
    }
  }

  const probe = await probeVideoParams(segmentPaths[0]);

  try {
    // ── VIDEO: copy the bodies, encode only the overlaps ──
    const parts: string[] = [];

    for (let i = 0; i < n; i++) {
      const bodyStart = i === 0 ? 0 : td;
      const bodyEnd = i === n - 1 ? durations[i] : durations[i] - td;
      const bodyPath = path.join(WORK_DIR, `body_${id}_${i}.mp4`);
      scratch.push(bodyPath);

      // Cut by frame count, not by `-t`. A time-based cut on a copied stream
      // includes whichever packets fall under the threshold, which drifted the
      // timeline 2 frames long over 8 scenes; a frame count is exact.
      const bodyFrames = Math.round((bodyEnd - bodyStart) * RENDER_FPS);

      await execFileAsync(ffmpegPath, [
        "-y",
        // Input seeking lands on a keyframe, verified above.
        ...(bodyStart > 0 ? ["-ss", bodyStart.toFixed(3)] : []),
        "-i", segmentPaths[i],
        "-frames:v", String(bodyFrames),
        "-map", "0:v:0",
        "-c:v", "copy",
        "-an",
        "-avoid_negative_ts", "make_zero",
        bodyPath,
      ], { timeout: 120000 });

      parts.push(bodyPath);

      if (i < n - 1) {
        const transPath = path.join(WORK_DIR, `trans_${id}_${i}.mp4`);
        scratch.push(transPath);
        const name = xfadeName(transitions[i] || "fade");

        await execFileAsync(ffmpegPath, [
          "-y",
          "-ss", (durations[i] - td).toFixed(3), "-i", segmentPaths[i],
          "-t", td.toFixed(3), "-i", segmentPaths[i + 1],
          "-filter_complex",
          `[0:v]settb=AVTB,fps=${RENDER_FPS},format=yuv420p[x0];` +
            `[1:v]settb=AVTB,fps=${RENDER_FPS},format=yuv420p[x1];` +
            `[x0][x1]xfade=transition=${name}:duration=${td}:offset=0[v]`,
          "-map", "[v]",
          "-an",
          "-c:v", "libx264",
          "-preset", X264_PRESET,
          "-crf", "20",
          ...gopArgs(),
          // Match the copied bodies so the demuxer sees one consistent stream.
          "-profile:v", probe.profile,
          "-pix_fmt", "yuv420p",
          "-frames:v", String(Math.round(td * RENDER_FPS)),
          transPath,
        ], { timeout: 180000 });

        parts.push(transPath);
      }
    }

    const listFile = path.join(WORK_DIR, `split_list_${id}.txt`);
    scratch.push(listFile);
    await fs.writeFile(
      listFile,
      parts.map((p) => `file '${p.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`).join("\n"),
      "utf-8"
    );

    const videoOnly = path.join(WORK_DIR, `vonly_${id}.mp4`);
    scratch.push(videoOnly);
    await execFileAsync(ffmpegPath, [
      "-y",
      "-f", "concat", "-safe", "0", "-i", listFile,
      "-c", "copy",
      videoOnly,
    ], { timeout: 300000 });

    // ── AUDIO: one pass, one encode, real crossfades ──
    const audioOnly = path.join(WORK_DIR, `aonly_${id}.m4a`);
    scratch.push(audioOnly);
    const aArgs = ["-y"];
    for (const p of segmentPaths) aArgs.push("-i", p);
    let aChain = "";
    let lastA = "[0:a]";
    for (let i = 1; i < n; i++) {
      const out = `[ax${i}]`;
      aChain += `${lastA}[${i}:a]acrossfade=d=${td}${out};`;
      lastA = out;
    }
    aArgs.push(
      "-filter_complex", aChain.slice(0, -1),
      "-map", lastA,
      "-c:a", "aac", "-b:a", "160k", "-ar", "44100",
      audioOnly
    );
    await execFileAsync(ffmpegPath, aArgs, { timeout: 300000 });

    // ── MUX ──
    await execFileAsync(ffmpegPath, [
      "-y",
      "-i", videoOnly,
      "-i", audioOnly,
      "-map", "0:v:0", "-map", "1:a:0",
      "-c", "copy",
      "-shortest",
      "-movflags", "+faststart",
      outputPath,
    ], { timeout: 120000 });

    const stat = await fs.stat(outputPath);
    if (stat.size === 0) throw new Error("Split-encode concat produced an empty file");

    return outputPath;
  } finally {
    await cleanupTempFiles(scratch);
  }
}

/** True when the video stream has a keyframe within half a frame of `atSec`. */
async function hasKeyframeAt(filePath: string, atSec: number): Promise<boolean> {
  if (!ffprobeStatic.path) return false;
  const tol = 1 / (2 * RENDER_FPS);
  try {
    // `-skip_frame nokey` decodes only keyframes, so scanning the whole stream
    // costs ~130ms even for a minute of video — cheaper and far more reliable
    // than `-read_intervals`, which seeks back to the preceding keyframe and
    // can read a window that never reaches the point being asked about.
    //
    // `best_effort_timestamp_time` rather than `pts_time`: ffmpeg-static still
    // ships ffprobe 4.0.2, which predates that field name and silently returns
    // blanks for it.
    const { stdout } = await execFileAsync(ffprobeStatic.path, [
      "-v", "error",
      "-select_streams", "v:0",
      "-skip_frame", "nokey",
      "-show_entries", "frame=best_effort_timestamp_time",
      "-of", "csv=p=0",
      filePath,
    ], { timeout: 30000 });

    return stdout
      .trim()
      .split(/\r?\n/)
      .some((line) => Math.abs(parseFloat(line) - atSec) <= tol);
  } catch {
    return false;
  }
}

/** Read the video parameters we need to match when splicing in new clips. */
async function probeVideoParams(filePath: string): Promise<{ profile: string }> {
  if (!ffprobeStatic.path) throw new Error("ffprobe-static path is undefined");
  const { stdout } = await execFileAsync(ffprobeStatic.path, [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=profile",
    "-of", "csv=p=0",
    filePath,
  ], { timeout: 10000 });
  const profile = stdout.trim().toLowerCase();
  // x264 accepts baseline/main/high; anything else we leave to the encoder default.
  return { profile: ["baseline", "main", "high"].includes(profile) ? profile : "high" };
}

/**
 * Original single-pass implementation, kept as the fallback path.
 */
async function concatViaSinglePassXfade(
  segmentPaths: string[],
  transitions: string[],
  transitionDuration: number
): Promise<string> {
  const outputPath = path.join(WORK_DIR, `final_xfade_${nanoid(8)}.mp4`);
  
  // Probe durations
  const durations = [];
  for (const p of segmentPaths) {
    durations.push(await probeMediaDuration(p));
  }

  let filterComplex = "";
  
  // Normalize all video inputs for xfade (timebase and framerate must match exactly)
  for (let i = 0; i < segmentPaths.length; i++) {
    filterComplex += `[${i}:v]settb=AVTB,fps=30[normV${i}];`;
  }

  let currentOffset = durations[0] - transitionDuration;
  
  // Input arguments
  const args = ["-y"];
  for (const p of segmentPaths) {
    args.push("-i", p);
  }

  // Build the xfade filter chain
  // Audio crossfade is also needed
  let lastV = "[normV0]";
  let lastA = "[0:a]";
  
  for (let i = 1; i < segmentPaths.length; i++) {
    const nextV = `[normV${i}]`;
    const nextA = `[${i}:a]`;
    const outV = `[v_xfade${i}]`;
    const outA = `[a_xfade${i}]`;
    
    const tName = xfadeName(transitions[i - 1] || "fade");

    filterComplex += `${lastV}${nextV}xfade=transition=${tName}:duration=${transitionDuration}:offset=${currentOffset.toFixed(3)}${outV};`;
    filterComplex += `${lastA}${nextA}acrossfade=d=${transitionDuration}${outA};`;
    
    lastV = outV;
    lastA = outA;
    currentOffset += durations[i] - transitionDuration;
  }

  args.push("-filter_complex", filterComplex.slice(0, -1)); // remove trailing semicolon
  args.push("-map", lastV);
  args.push("-map", lastA);
  args.push("-c:v", "libx264", "-preset", X264_PRESET, "-crf", "20");
  args.push("-c:a", "aac", "-b:a", "160k");
  args.push("-pix_fmt", "yuv420p");
  args.push("-movflags", "+faststart");
  args.push(outputPath);

  if (!ffmpegPath) throw new Error("ffmpeg-static path is undefined");
  try {
    await execFileAsync(ffmpegPath, args, {
      timeout: 600000, // 10 minutes max for complex xfade
      });
  } catch (err: any) {
    log.warn("xfade concat failed, falling back to simple concat", { error: err.message });
    return concatenateSegments(segmentPaths);
  }

  const stat = await fs.stat(outputPath);
  if (stat.size === 0) throw new Error("FFmpeg produced an empty final video");

  return outputPath;
}

/**
 * Camera keyframes for a video clip.
 *
 * Screenshots and footage need different models. A still has no timeline of its
 * own, so its zoom points are *sequenced* — hold here, pan, hold there — and the
 * choreography decides how long the scene runs. A clip already has a timeline,
 * so its keyframes are *anchored*: "be zoomed here at 4.2 seconds". Trying to
 * reuse the screenshot model would mean the camera dictating the length of
 * footage that already has one.
 *
 * Interpolation is the same additive smoothstep the still path uses, so motion
 * matches across both kinds of scene.
 */
export function buildVideoKeyframeZoom(
  keyframes: Array<{ atSec: number; targetX: number; targetY: number; zoomScale: number }>,
  outW: number,
  outH: number
): string {
  if (keyframes.length === 0) return "";

  // Anchored in time, so order matters and duplicates would break the ramps.
  const kfs = [...keyframes]
    .map((k) => ({ ...k, frame: Math.max(0, Math.round(k.atSec * RENDER_FPS)) }))
    .sort((a, b) => a.frame - b.frame)
    .filter((k, i, arr) => i === 0 || k.frame > arr[i - 1].frame);

  const first = kfs[0];

  // Start wide and ease into the first keyframe, so a clip never opens
  // mid-zoom. Ends by easing back out, matching the still path's grammar.
  const build = (pick: (k: (typeof kfs)[number]) => number, from: number): string => {
    const terms: string[] = [from.toFixed(4)];
    let prevFrame = 0;
    let prevVal = from;

    for (const k of kfs) {
      const span = Math.max(1, k.frame - prevFrame);
      const ramp = smoothstepExpr("on", prevFrame, span);
      const delta = pick(k) - prevVal;
      if (Math.abs(delta) > 1e-6) terms.push(`(${delta.toFixed(4)})*${ramp}`);
      prevFrame = k.frame;
      prevVal = pick(k);
    }
    return terms.join("+");
  };

  // Zoom starts at 1 (wide); position starts at the first keyframe's target so
  // the opening wide shot is already centred on what matters.
  const zExpr = build((k) => k.zoomScale, 1);
  const cxExpr = build((k) => (k.targetX / 100) * outW, (first.targetX / 100) * outW);
  const cyExpr = build((k) => (k.targetY / 100) * outH, (first.targetY / 100) * outH);

  const xExpr = `max(0,min(iw-iw/zoom,(${cxExpr})-iw/(2*zoom)))`;
  const yExpr = `max(0,min(ih-ih/zoom,(${cyExpr})-ih/(2*zoom)))`;

  // d=1: one output frame per input frame, which is what turns zoompan from a
  // still-image animator into a per-frame camera over footage.
  return `zoompan=z='max(1,${zExpr})':x='${xExpr}':y='${yExpr}':d=1:s=${outW}x${outH}:fps=${RENDER_FPS}`;
}

/**
 * Render a scene whose source is a video rather than a screenshot.
 *
 * The still-image path cannot serve here: it composites one frame in a pre-pass
 * and then animates that frame, which is exactly right for a screenshot and
 * exactly wrong for footage. Video steps were silently going through it, so a
 * Pexels clip or a screen recording became a single frozen frame in the export.
 *
 * Narration is mixed over the clip's own audio rather than replacing it, so a
 * recording keeps its original sound with the voiceover on top. The clip is
 * trimmed or held to the narration length so scenes stay in step with the
 * script the user wrote.
 */
export async function renderVideoSegment(opts: {
  videoPath: string;
  audioPath: string;
  audioDuration: number;
  outputRes?: string;
  /** Keep the source's own audio underneath the narration. */
  keepSourceAudio?: boolean;
  normalizeAudio?: boolean;
  transitionDurationSec?: number;
  captions?: { text: string; style: string; size: string; position: string; color: string; enabled: boolean };
  editorWatermarkText?: string;
  editorWatermarkPosition?: string;
  editorWatermarkSize?: string;
  editorWatermarkColor?: string;
  editorWatermarkOpacity?: number;
  editorColorFilter?: string;
  editorColorFilterStrength?: number;
  /** Time-anchored camera keyframes over the footage. */
  keyframes?: Array<{ atSec: number; targetX: number; targetY: number; zoomScale: number }>;
}): Promise<string> {
  if (!ffmpegPath) throw new Error("ffmpeg-static path is undefined");
  await ensureWorkDir();

  const outputRes = opts.outputRes || "1920x1080";
  const [outW, outH] = outputRes.split("x").map(Number);
  const outputPath = path.join(WORK_DIR, `vseg_${nanoid(12)}.mp4`);

  const sourceDuration = await probeMediaDuration(opts.videoPath);
  const narrationDuration = opts.audioDuration + AUDIO_LEAD_IN + AUDIO_TAIL;
  // Hold the last frame if the narration outlasts the footage, rather than
  // cutting the voiceover off mid-sentence.
  const clipDuration = Math.max(sourceDuration, narrationDuration);
  const needsHold = narrationDuration > sourceDuration;

  const hasSourceAudio = opts.keepSourceAudio !== false && (await hasAudioStream(opts.videoPath));

  const videoColorChain = buildColorFilterChain(opts.editorColorFilter, opts.editorColorFilterStrength);
  const colorFilter = videoColorChain ? `,${videoColorChain}` : "";

  // Frame furniture, in output space — same rules as the still path.
  const furniture: string[] = [];
  if (opts.editorWatermarkText) {
    const fontFile = getFontPath();
    const wmSize = opts.editorWatermarkSize === "small" ? Math.round(outH * 0.03)
      : opts.editorWatermarkSize === "large" ? Math.round(outH * 0.06)
      : Math.round(outH * 0.045);
    const wmColor = (opts.editorWatermarkColor || "#FFFFFF").replace("#", "0x");
    const wmOpacity = Math.max(0.1, Math.min(1, opts.editorWatermarkOpacity ?? 0.5));
    const txt = opts.editorWatermarkText.replace(/'/g, "\u2019").replace(/:/g, "\\:").replace(/%/g, "\\%");
    let wmX = "w-text_w-20";
    let wmY = "h-text_h-20";
    if (opts.editorWatermarkPosition?.includes("left")) wmX = "20";
    if (opts.editorWatermarkPosition?.includes("top")) wmY = "20";
    if (opts.editorWatermarkPosition === "center") { wmX = "(w-text_w)/2"; wmY = "(h-text_h)/2"; }
    furniture.push(
      `drawtext=fontfile='${fontFile}':text='${txt}':fontcolor=${wmColor}@${wmOpacity.toFixed(2)}:` +
      `fontsize=${wmSize}:x=${wmX}:y=${wmY}:shadowcolor=0x000000:shadowx=1:shadowy=1`
    );
  }

  if (opts.captions?.enabled && opts.captions.text) {
    const caps = await buildCaptionsFilter(
      opts.captions.text, opts.captions.style, opts.captions.size,
      opts.captions.position, opts.captions.color, outW, outH, opts.audioDuration
    );
    if (caps) furniture.push(caps);
  }

  // Camera keyframes run after the hold, so a held final frame keeps moving
  // with the camera rather than freezing the motion too.
  const keyframeZoom = opts.keyframes?.length
    ? "," + buildVideoKeyframeZoom(opts.keyframes, outW, outH)
    : "";

  const videoChain =
    `[0:v]scale=${outW}:${outH}:force_original_aspect_ratio=decrease:flags=lanczos,` +
    `pad=${outW}:${outH}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${RENDER_FPS}${colorFilter}` +
    (needsHold ? `,tpad=stop_mode=clone:stop_duration=${(narrationDuration - sourceDuration).toFixed(3)}` : "") +
    keyframeZoom +
    // Furniture last: a watermark must not be dragged around by the camera.
    (furniture.length ? `,${furniture.join(",")}` : "") +
    `,format=yuv420p[v]`;

  const narration = `[1:a]${buildAudioFilter()}[narr]`;
  const audioChain = hasSourceAudio
    // Duck the source under the voiceover rather than letting them fight.
    ? `${narration};[0:a]volume=0.25,apad[bed];[bed][narr]amix=inputs=2:normalize=0:duration=longest,apad=whole_dur=${clipDuration.toFixed(3)}[a]`
    : `${narration};[narr]apad=whole_dur=${clipDuration.toFixed(3)}[a]`;

  await execFileAsync(ffmpegPath, [
    "-y",
    "-i", opts.videoPath,
    "-i", opts.audioPath,
    "-filter_complex", `${videoChain};${audioChain}`,
    "-map", "[v]", "-map", "[a]",
    "-c:v", "libx264",
    "-preset", X264_PRESET,
    "-crf", "20",
    ...cutPointArgs(opts.transitionDurationSec),
    "-c:a", "aac", "-b:a", "160k", "-ar", "44100",
    "-pix_fmt", "yuv420p",
    "-t", clipDuration.toFixed(3),
    "-movflags", "+faststart",
    outputPath,
  ], { timeout: 600000 });

  const stat = await fs.stat(outputPath);
  if (stat.size === 0) throw new Error("FFmpeg produced an empty video segment");
  return outputPath;
}

/** Whether a file carries a decodable audio stream. */
async function hasAudioStream(filePath: string): Promise<boolean> {
  if (!ffprobeStatic.path) return false;
  try {
    const { stdout } = await execFileAsync(ffprobeStatic.path, [
      "-v", "error",
      "-select_streams", "a:0",
      "-show_entries", "stream=codec_type",
      "-of", "csv=p=0",
      filePath,
    ], { timeout: 10000 });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Turn an arbitrary user-supplied image or video into a clip the concat can use.
 *
 * Custom intros and outros used to be written to disk and pushed straight into
 * the segment list. Nothing forced them to match the rendered segments, so a
 * phone clip at 60fps in a different resolution — or an image, or a video with
 * no audio track at all — went into a concat that assumes every input shares
 * codec parameters. Best case that fell back to the slow re-encode path; worst
 * case the audio chain referenced a stream that did not exist and the whole
 * concat failed.
 *
 * This normalises everything: output resolution, frame rate, pixel format, an
 * AAC track (silent if the source has none), and the keyframe grid the
 * split-encode concat needs.
 *
 * @param isImage still images are held for `durationSec`; videos always keep
 *                their own length, and `durationSec` is ignored for them
 */
export async function prepareBumperClip(
  sourcePath: string,
  outputRes: string,
  opts: { isImage: boolean; durationSec?: number; transitionDurationSec?: number }
): Promise<{ path: string; duration: number }> {
  if (!ffmpegPath) throw new Error("ffmpeg-static path is undefined");
  await ensureWorkDir();

  const [outW, outH] = outputRes.split("x").map(Number);
  const outPath = path.join(WORK_DIR, `bumper_${nanoid(10)}.mp4`);

  // A still has no length of its own, so one has to be supplied. A video does,
  // and it wins: the editor's duration field defaults to 3s, which was being
  // applied as `-t` and silently cutting a 20-second intro down to three.
  const holdDuration = opts.isImage ? (opts.durationSec ?? 3) : null;

  // Letterbox rather than crop: a bumper is usually branding, and silently
  // cutting someone's logo off is worse than bars.
  const vf =
    `scale=${outW}:${outH}:force_original_aspect_ratio=decrease:flags=lanczos,` +
    `pad=${outW}:${outH}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${RENDER_FPS},format=yuv420p`;

  // Exactly one audio stream has to come out. The concat demuxer requires every
  // input to agree on stream layout, and mapping the source track *and* the
  // silent filler produced two whenever the upload had sound — which a real
  // intro clip usually does.
  const sourceHasAudio = !opts.isImage && (await hasAudioStream(sourcePath));

  const encodeArgs = (useSilentAudio: boolean): string[] => [
    "-y",
    ...(opts.isImage ? ["-loop", "1"] : []),
    "-i", sourcePath,
    ...(useSilentAudio ? ["-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo"] : []),
    "-filter_complex", `[0:v]${vf}[v]`,
    "-map", "[v]",
    "-map", useSilentAudio ? "1:a" : "0:a:0",
    "-c:v", "libx264",
    "-preset", X264_PRESET,
    "-crf", "20",
    ...cutPointArgs(opts.transitionDurationSec),
    "-c:a", "aac", "-b:a", "160k", "-ar", "44100", "-ac", "2",
    ...(holdDuration !== null ? ["-t", holdDuration.toFixed(3)] : []),
    // anullsrc and a looped still both run forever; this bounds them to the
    // real content. Omitted when the source supplies its own audio, where the
    // natural end of the file is already the right answer.
    ...(useSilentAudio ? ["-shortest"] : []),
    "-movflags", "+faststart",
    outPath,
  ];

  try {
    await execFileAsync(ffmpegPath, encodeArgs(!sourceHasAudio), { timeout: 180000 });
  } catch (err) {
    if (!sourceHasAudio) throw err;
    // The source claimed an audio stream ffmpeg then could not decode. Falling
    // back to silence loses the sound but still produces a concat-safe clip,
    // which beats failing the whole render over a bumper.
    log.warn("Bumper audio could not be decoded, substituting silence", {
      error: err instanceof Error ? err.message : String(err),
    });
    await execFileAsync(ffmpegPath, encodeArgs(true), { timeout: 180000 });
  }

  return { path: outPath, duration: await probeMediaDuration(outPath) };
}

/**
 * Clean up temp files for a render.
 */
export async function cleanupTempFiles(paths: string[]): Promise<void> {
  for (const p of paths) {
    try {
      if (p.startsWith(os.tmpdir()) || p.startsWith(WORK_DIR)) {
        await fs.unlink(p);
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Trim an audio file to a specific duration using FFmpeg.
 */
export async function trimAudio(
  audioPath: string,
  outputPath: string,
  durationSec: number,
  startSec = 0
): Promise<string> {
  if (!ffmpegPath) throw new Error("ffmpeg-static path is undefined");
  await execFileAsync(ffmpegPath, [
    "-y",
    "-i", audioPath,
    "-ss", startSec.toFixed(3),
    "-t", durationSec.toFixed(3),
    "-c:a", "copy",
    outputPath,
  ], { timeout: 30000, });
  return outputPath;
}

/**
 * Render multiple zoom segments from one screenshot + audio.
 * Each zoom point gets its own video segment with the same audio slice.
 */
export async function renderMultiZoomSegments(opts: {
  screenshotPath: string;
  audioPath: string;
  audioDuration: number;
  /** Forwarded to renderStepVideo; see the note on its own option. */
  transitionDurationSec?: number;
  /**
   * One narration clip per zoom point, in waypoint order.
   *
   * When supplied, each waypoint holds for as long as its own clip, and the
   * clips are laid onto the camera timeline at the moment the camera arrives.
   * Without it the whole scene shares one clip and any camera time beyond the
   * narration becomes trailing silence.
   *
   * Entries may be null for waypoints with nothing to say.
   */
  waypointAudio?: Array<{ path: string; duration: number } | null>;
  /** Worker already passes this; declared so the option is typed. */
  normalizeAudio?: boolean;
  multiZooms: Array<{
    targetX: number;
    targetY: number;
    rectX?: number;
    rectY?: number;
    rectW?: number;
    rectH?: number;
    zoomScale?: number;
    duration?: number;
  }>;
  outputRes?: string;
  captions?: { text: string; style: string; size: string; position: string; color: string; enabled: boolean };
  editorCropX?: number;
  editorCropY?: number;
  editorCropW?: number;
  editorCropH?: number;
  editorBlurX?: number;
  editorBlurY?: number;
  editorBlurW?: number;
  editorBlurH?: number;
  editorBlurIntensity?: number;
  editorBlurs?: Array<{ id: string; x: number; y: number; w: number; h: number; intensity?: number }>;
  editorRedactX?: number;
  editorRedactY?: number;
  editorRedactW?: number;
  editorRedactH?: number;
  editorRedactColor?: string;
  editorWatermarkText?: string;
  editorWatermarkPosition?: string;
  editorWatermarkSize?: string;
  editorWatermarkColor?: string;
  editorWatermarkOpacity?: number;
  editorPixelateX?: number;
  editorPixelateY?: number;
  editorPixelateW?: number;
  editorPixelateH?: number;
  editorPixelateBlockSize?: number;
  editorPixelates?: Array<{ id: string; x: number; y: number; w: number; h: number; blockSize?: number }>;
  editorSpotlightX?: number;
  editorSpotlightY?: number;
  editorSpotlightW?: number;
  editorSpotlightH?: number;
  editorSpotlightIntensity?: number;
  editorSpotlights?: Array<{ id: string; x: number; y: number; w: number; h: number; intensity?: number }>;
  editorBadgeNumber?: number;
  editorBadgeX?: number;
  editorBadgeY?: number;
  editorBadgeColor?: string;
  editorMagnifyX?: number;
  editorMagnifyY?: number;
  editorMagnifyW?: number;
  editorMagnifyH?: number;
  editorMagnifyScale?: number;
  editorMagnifyCorner?: string;
  editorColorFilter?: string;
  editorColorFilterStrength?: number;
  editorHighlights?: Array<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    color?: string;
  }>;
  editorOverlayText?: string;
  editorOverlayX?: number;
  editorOverlayY?: number;
  editorOverlayColor?: string;
  editorOverlaySize?: string;
  editorCaptionText?: string;
  editorCaptionPosition?: string;
  editorCaptionStyle?: string;
  editorCaptionColor?: string;
  editorCaptionSize?: string;
}): Promise<string[]> {
  const zooms = opts.multiZooms.length > 0 ? opts.multiZooms : [{ targetX: 50, targetY: 50, zoomScale: 1, duration: opts.audioDuration }];
  const outputRes = opts.outputRes || "1920x1080";
  const [outW, outH] = outputRes.split("x").map(Number);
  const paddedDuration = opts.audioDuration + AUDIO_LEAD_IN + AUDIO_TAIL;
  const audioFrames = Math.max(Math.ceil(paddedDuration * RENDER_FPS), RENDER_FPS);

  // ── Probe image dimensions for coordinate mapping ──
  let imgWidth = 1920;
  let imgHeight = 1080;
  try {
    const dims = await probeImageDimensions(opts.screenshotPath);
    imgWidth = dims.width;
    imgHeight = dims.height;
  } catch {
    // keep fallback values
  }

  // ── Account for crop if present ──
  let cropX = 0, cropY = 0, cropW = imgWidth, cropH = imgHeight;
  if (
    opts.editorCropX !== undefined &&
    opts.editorCropY !== undefined &&
    opts.editorCropW !== undefined &&
    opts.editorCropH !== undefined &&
    opts.editorCropW > 0 &&
    opts.editorCropH > 0
  ) {
    const r = clampRegion(
      Math.round((opts.editorCropX / 100) * imgWidth),
      Math.round((opts.editorCropY / 100) * imgHeight),
      Math.round((opts.editorCropW / 100) * imgWidth),
      Math.round((opts.editorCropH / 100) * imgHeight),
      imgWidth, imgHeight
    );
    cropX = r.x; cropY = r.y; cropW = r.w; cropH = r.h;
  }
  const effW = cropW;
  const effH = cropH;

  // ── Compute supersampled geometry for coordinate mapping ──
  const ssFactor = Math.min(2, MAX_SS_WIDTH / outW);
  const ssW = 2 * Math.round((outW * ssFactor) / 2);
  const ssH = 2 * Math.round((outH * ssFactor) / 2);
  const geo = fitGeometry(effW, effH, ssW, ssH);

  // ── Map each waypoint's percentage coords to supersampled-frame pixels ──
  const waypoints = zooms.map((z, i) => {
    let tx = z.targetX;
    let ty = z.targetY;
    // Adjust for crop
    if (cropX > 0 || cropY > 0 || cropW !== imgWidth || cropH !== imgHeight) {
      const origX = (tx / 100) * imgWidth;
      const origY = (ty / 100) * imgHeight;
      tx = clamp(((origX - cropX) / effW) * 100, 0, 100);
      ty = clamp(((origY - cropY) / effH) * 100, 0, 100);
    }
    // Per-waypoint narration, when present, sets the hold: the camera waits
    // exactly as long as there is something to say, plus a short beat either
    // side so speech never begins the instant the pan stops.
    const wpAudio = opts.waypointAudio?.[i] ?? null;
    const spokenHold = wpAudio ? wpAudio.duration + AUDIO_LEAD_IN + AUDIO_TAIL : null;
    const holdSec = spokenHold ?? (z.duration || 3);

    return {
      xPx: geo.offsetX + (tx / 100) * geo.scaledW,
      yPx: geo.offsetY + (ty / 100) * geo.scaledH,
      durationFrames: Math.round(holdSec * RENDER_FPS),
      zoomScale: z.zoomScale ?? 2,
    };
  });

  // ── Extend the clip so holds stay 2-3s and the pans/zoom-out never compress ──
  // When the narration is shorter than the camera animation needs, the segment
  // is lengthened (audio padded with trailing silence) instead of squashing the
  // motion — that squashing is what made pans teleport and holds shrink.
  //
  // With per-waypoint audio the holds already fit their clips, so there is no
  // scene-wide narration to accommodate and the camera timeline stands alone.
  const usingWaypointAudio = !!opts.waypointAudio?.some(Boolean);
  const totalFrames = computeMultiWaypointTotalFrames(
    waypoints,
    usingWaypointAudio ? 0 : audioFrames
  );
  const effectiveDuration = totalFrames / RENDER_FPS;

  // ── Build the single multi-waypoint zoom filter ──
  const customZoomFilter = buildMultiWaypointZoomFilter(waypoints, totalFrames, outputRes);

  // ── Per-waypoint narration ──
  // Built here because it needs the hold markers, which only exist once the
  // waypoints and total length are settled.
  let audioPath = opts.audioPath;
  let audioDurationForRender = opts.audioDuration;
  if (usingWaypointAudio) {
    const cam = computeWaypointCamera(waypoints, totalFrames);
    try {
      audioPath = await buildWaypointAudioTrack(
        opts.waypointAudio!,
        cam.holdStarts,
        totalFrames,
        opts.normalizeAudio !== false
      );
      audioDurationForRender = totalFrames / RENDER_FPS;
    } catch (err: any) {
      // Fall back to the single scene-wide track rather than losing the render.
      log.warn("Per-waypoint audio failed, falling back to the scene track", {
        error: err?.message ?? String(err),
      });
    }
  }

  // ── Animated mouse pointer ──
  //
  // Only for genuine multi-waypoint moves. A single zoom has nothing to travel
  // between, and a pointer sitting motionless in the middle of the frame reads
  // as a rendering artefact rather than a demonstration.
  let cursor: { pngPath: string; xExpr: string; yExpr: string; size: number } | undefined;
  if (waypoints.length > 1) {
    try {
      const cam = computeWaypointCamera(waypoints, totalFrames);

      // The camera's crop-window origin, written with literals. The zoompan
      // expression cannot be reused verbatim: `iw`, `ih` and `zoom` only exist
      // inside zoompan, and in the overlay that follows it `iw` would mean the
      // output frame instead of the supersampled canvas.
      const camAxis = (key: "xPx" | "yPx", span: number): string => {
        const terms: string[] = [waypoints[0][key].toFixed(1)];
        for (let i = 1; i < waypoints.length; i++) {
          const ramp = smoothstepExpr("n", cam.holdEnds[i - 1], cam.panF);
          terms.push(`(${(waypoints[i][key] - waypoints[i - 1][key]).toFixed(1)})*${ramp}`);
        }
        const centre = terms.join("+");
        const z = cam.zoomExprFor("n");
        return `max(0,min(${span}-${span}/(${z}),(${centre})-${span}/(2*(${z}))))`;
      };

      const cursorSize = 32;
      const exprs = buildCursorOverlayExprs(
        waypoints,
        cam,
        camAxis("xPx", ssW),
        camAxis("yPx", ssH),
        ssW, ssH, outW, outH,
        cursorSize
      );
      cursor = {
        pngPath: await getCursorPng(cursorSize),
        xExpr: exprs.x,
        yExpr: exprs.y,
        size: cursorSize,
      };
    } catch (err: any) {
      // A missing pointer is cosmetic; a failed render is not.
      log.warn("Cursor overlay unavailable, rendering without it", {
        error: err?.message ?? String(err),
      });
    }
  }

  // ── Render one single segment with the continuous zoom+pan filter ──
  const segPath = await renderStepVideo({
    cursor,
    screenshotPath: opts.screenshotPath,
    audioPath,
    audioDuration: audioDurationForRender,
    transitionDurationSec: opts.transitionDurationSec,
    clipDurationOverride: effectiveDuration,
    // Use first waypoint as the "target" for highlight box compatibility
    zoomTargetX: zooms[0].targetX,
    zoomTargetY: zooms[0].targetY,
    zoomRectX: zooms[0].rectX,
    zoomRectY: zooms[0].rectY,
    zoomRectW: zooms[0].rectW,
    zoomRectH: zooms[0].rectH,
    editorZoomScale: Math.max(...zooms.map((z) => z.zoomScale ?? 2)),
    outputRes: opts.outputRes,
    captions: opts.captions,
    customZoomFilter,
    editorCropX: opts.editorCropX,
    editorCropY: opts.editorCropY,
    editorCropW: opts.editorCropW,
    editorCropH: opts.editorCropH,
    editorBlurX: opts.editorBlurX,
    editorBlurY: opts.editorBlurY,
    editorBlurW: opts.editorBlurW,
    editorBlurH: opts.editorBlurH,
    editorBlurIntensity: opts.editorBlurIntensity,
    editorBlurs: opts.editorBlurs,
    editorRedactX: opts.editorRedactX,
    editorRedactY: opts.editorRedactY,
    editorRedactW: opts.editorRedactW,
    editorRedactH: opts.editorRedactH,
    editorRedactColor: opts.editorRedactColor,
    editorWatermarkText: opts.editorWatermarkText,
    editorWatermarkPosition: opts.editorWatermarkPosition,
    editorWatermarkSize: opts.editorWatermarkSize,
    editorWatermarkColor: opts.editorWatermarkColor,
    editorWatermarkOpacity: opts.editorWatermarkOpacity,
    editorPixelateX: opts.editorPixelateX,
    editorPixelateY: opts.editorPixelateY,
    editorPixelateW: opts.editorPixelateW,
    editorPixelateH: opts.editorPixelateH,
    editorPixelateBlockSize: opts.editorPixelateBlockSize,
    editorPixelates: opts.editorPixelates,
    editorSpotlightX: opts.editorSpotlightX,
    editorSpotlightY: opts.editorSpotlightY,
    editorSpotlightW: opts.editorSpotlightW,
    editorSpotlightH: opts.editorSpotlightH,
    editorSpotlightIntensity: opts.editorSpotlightIntensity,
    editorSpotlights: opts.editorSpotlights,
    editorBadgeNumber: opts.editorBadgeNumber,
    editorBadgeX: opts.editorBadgeX,
    editorBadgeY: opts.editorBadgeY,
    editorBadgeColor: opts.editorBadgeColor,
    editorMagnifyX: opts.editorMagnifyX,
    editorMagnifyY: opts.editorMagnifyY,
    editorMagnifyW: opts.editorMagnifyW,
    editorMagnifyH: opts.editorMagnifyH,
    editorMagnifyScale: opts.editorMagnifyScale,
    editorMagnifyCorner: opts.editorMagnifyCorner,
    editorColorFilter: opts.editorColorFilter,
    editorColorFilterStrength: opts.editorColorFilterStrength,
    editorHighlights: opts.editorHighlights,
    editorOverlayText: opts.editorOverlayText,
    editorOverlayX: opts.editorOverlayX,
    editorOverlayY: opts.editorOverlayY,
    editorOverlayColor: opts.editorOverlayColor,
    editorOverlaySize: opts.editorOverlaySize,
    editorCaptionText: opts.editorCaptionText,
    editorCaptionPosition: opts.editorCaptionPosition,
    editorCaptionStyle: opts.editorCaptionStyle,
    editorCaptionColor: opts.editorCaptionColor,
    editorCaptionSize: opts.editorCaptionSize,
  });

  return [segPath];
}

/**
 * Download and cache background music MP3 files from public royalty-free URLs.
 */
async function getMusicTrackPath(trackId: string): Promise<string> {
  const musicUrls: Record<string, string> = {
    ambient: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    corporate: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    tech: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    calm: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    upbeat: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
  };
  const url = musicUrls[trackId] || musicUrls.ambient;
  const dir = path.join(os.tmpdir(), "aivideo-music");
  await fs.mkdir(dir, { recursive: true });
  const destPath = path.join(dir, `${trackId}.mp3`);

  try {
    await fs.access(destPath);
    return destPath;
  } catch {
    log.info(`Downloading background music track: ${trackId}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to download music track: status ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    await fs.writeFile(destPath, Buffer.from(arrayBuffer));
    return destPath;
  }
}

/**
 * Mix a background music track into a video containing audio in FFmpeg.
 */
export async function mixBackgroundMusic(
  videoPath: string,
  trackId: string,
  totalDurationSec?: number
): Promise<string> {
  const musicPath = await getMusicTrackPath(trackId);
  const outputPath = path.join(WORK_DIR, `mixed_${nanoid(12)}.mp4`);

  const args = [
    "-y",
    "-i", videoPath,
    "-stream_loop", "-1",
    "-i", musicPath,
    "-filter_complex", "[1:a]volume=0.05[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=2[a]",
    "-map", "0:v",
    "-map", "[a]",
    "-c:v", "copy",
    "-c:a", "aac",
    "-b:a", "160k",
  ];

  if (totalDurationSec && totalDurationSec > 0) {
    args.push("-t", totalDurationSec.toFixed(3));
  } else {
    args.push("-shortest");
  }
  args.push(outputPath);

  if (!ffmpegPath) throw new Error("ffmpeg-static path is undefined");
  await execFileAsync(ffmpegPath, args, {
    timeout: 180000,
    });

  return outputPath;
}

/**
 * Splits a text into lines of approximately maxChars length without breaking words.
 */
export function splitTextIntoLines(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (!word) continue;
    if (currentLine.length + word.length + (currentLine.length > 0 ? 1 : 0) <= maxChars) {
      currentLine += (currentLine.length > 0 ? " " : "") + word;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Builds a chain of drawtext filters for captions, split by timing to match narration.
 */
export async function buildCaptionsFilter(
  text: string,
  style: string,
  size: string,
  position: string,
  color: string,
  outW: number,
  outH: number,
  audioDuration: number
): Promise<string> {
  if (!text) return "";

  // Convert #RRGGBB to 0xRRGGBB for ffmpeg compatibility
  const ffmpegColor = color.replace("#", "0x");

  const fontFile = getFontPath();
  const baseDim = Math.min(outW, outH);

  let fontsize = Math.round(baseDim * 0.07); // medium default
  if (size === "small") fontsize = Math.round(baseDim * 0.05);
  if (size === "large") fontsize = Math.round(baseDim * 0.09);

  let yPos = "h-h/5"; // default bottom
  if (position === "top") yPos = "h/5";
  if (position === "middle") yPos = "(h-text_h)/2";

  const isVertical = outW < outH;
  const maxChars = isVertical ? 20 : 40;

  const lines = splitTextIntoLines(text, maxChars);
  const totalChars = lines.reduce((sum, l) => sum + l.length, 0);

  if (totalChars === 0) return "";

  const drawtextFilters: string[] = [];
  let elapsedDuration = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineDuration = (line.length / totalChars) * audioDuration;

    const start = AUDIO_LEAD_IN + elapsedDuration;
    const end = start + lineDuration;
    elapsedDuration += lineDuration;

    // Write text to a temp file to avoid FFmpeg escaping hell
    const textFile = path.join(WORK_DIR, `caption_${nanoid(8)}.txt`);
    await fs.writeFile(textFile, line, "utf-8");

    let styleOptions = "";
    if (style === "outline") {
      styleOptions = ":borderw=3:bordercolor=black";
    } else if (style === "highlight") {
      styleOptions = ":box=1:boxcolor=black@0.6:boxborderw=10";
    } else {
      styleOptions = ":shadowcolor=black@0.8:shadowx=2:shadowy=2";
    }

    drawtextFilters.push(
      `drawtext=fontfile='${fontFile}':textfile='${textFile.replace(/\\/g, "/").replace(/:/g, "\\:")}':fontcolor=${ffmpegColor}:fontsize=${fontsize}:x=(w-text_w)/2:y=${yPos}:enable='between(t,${start.toFixed(3)},${end.toFixed(3)})'${styleOptions}`
    );
  }

  return drawtextFilters.join(",");
}
