import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { nanoid } from "nanoid";

// Use static binaries so the user doesn't need to install ffmpeg globally
import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";

const execFileAsync = promisify(execFile);

const WORK_DIR = path.join(os.tmpdir(), "aivideo-render");

// ─────────────────────────────────────────────────────────────────
// Rendering constants — tuned to mimic human-edited tutorial videos
// ─────────────────────────────────────────────────────────────────
export const RENDER_FPS = 30;

/**
 * Supersampling: zoompan rounds pan offsets to whole input pixels, which
 * causes the infamous "jittery zoom". Rendering the zoom on a 2x-upscaled
 * canvas gives sub-pixel precision at the output size → buttery motion.
 * Capped so 4K outputs don't explode memory.
 */
const MAX_SS_WIDTH = 4200;

/** Silence padding around narration so speech never starts on frame 0. */
export const AUDIO_LEAD_IN = 0.4; // seconds of silence before narration
export const AUDIO_TAIL = 0.6; // seconds of silence after narration

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
    console.warn(`[ffmpeg] probeMediaDuration failed for ${filePath}, falling back to 10s:`, err instanceof Error ? err.message : err);
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
 */
function buildAudioFilter(): string {
  const delayMs = Math.round(AUDIO_LEAD_IN * 1000);
  return (
    `adelay=${delayMs}:all=1,` +
    `apad=pad_dur=${AUDIO_TAIL},` +
    `loudnorm=I=-16:TP=-1.5:LRA=11`
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
}): Promise<string> {
  await ensureWorkDir();

  const outputPath = path.join(WORK_DIR, `segment_${nanoid(12)}.mp4`);
  const outputRes = opts.outputRes || "1920x1080";
  const [outW, outH] = outputRes.split("x").map(Number);

  // Total clip duration includes silence padding around the narration
  const paddedDuration = opts.audioDuration + AUDIO_LEAD_IN + AUDIO_TAIL;

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
      const thickness = Math.max(6, Math.round(Math.min(imgWidth, imgHeight) * 0.008));
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
    const badgeSize = Math.round(Math.min(imgWidth, imgHeight) * 0.04);
    badgeFilter = `,drawbox=x=${bx - badgeSize/2}:y=${by - badgeSize/2}:w=${badgeSize}:h=${badgeSize}:color=${bColor}:t=fill,drawtext=fontfile='${fontFile}':text='${opts.editorBadgeNumber}':fontcolor=0x000000:fontsize=${Math.round(badgeSize * 0.6)}:x=${bx}-text_w/2:y=${by}-text_h/2`;
  }

  // ── Canvas editor: magnify ──
  let magnifyFilter = "";
  if (
    opts.editorMagnifyX !== undefined &&
    opts.editorMagnifyY !== undefined &&
    opts.editorMagnifyW !== undefined &&
    opts.editorMagnifyH !== undefined &&
    opts.editorMagnifyW > 0 &&
    opts.editorMagnifyH > 0
  ) {
    const mx = Math.round((opts.editorMagnifyX / 100) * imgWidth);
    const my = Math.round((opts.editorMagnifyY / 100) * imgHeight);
    const mw = Math.round((opts.editorMagnifyW / 100) * imgWidth);
    const mh = Math.round((opts.editorMagnifyH / 100) * imgHeight);
    const corner = opts.editorMagnifyCorner || "bottom-right";
    const insetW = Math.round(Math.min(imgWidth, imgHeight) * 0.15);
    const insetH = insetW;
    let insetX = imgWidth - insetW - 20;
    let insetY = imgHeight - insetH - 20;
    if (corner.includes("left")) insetX = 20;
    if (corner.includes("top")) insetY = 20;
    magnifyFilter = `split[orig][magbase];[magbase]crop=${mw}:${mh}:${mx}:${my},scale=${insetW}:${insetH}:flags=lanczos[mag];[orig][mag]overlay=${insetX}:${insetY}:format=auto,drawbox=x=${insetX}:y=${insetY}:w=${insetW}:h=${insetH}:color=white@0.8:t=3,`;
  }

  // ── Canvas editor: color filter ──
  let colorFilter = "";
  if (opts.editorColorFilter && opts.editorColorFilter !== "none") {
    switch (opts.editorColorFilter) {
      case "grayscale":
        colorFilter = "hue=s=0,";
        break;
      case "sepia":
        colorFilter = "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131,";
        break;
      case "warm":
        colorFilter = "colorbalance=rs=0.1:gs=-0.05:bs=-0.1,";
        break;
      case "cool":
        colorFilter = "colorbalance=rs=-0.1:gs=0.05:bs=0.1,";
        break;
      case "contrast":
        colorFilter = "eq=contrast=1.5:saturation=1.2,";
        break;
    }
  }

  // Effective image dimensions after crop (for zoom/geometry calculations)
  const effW = cropW;
  const effH = cropH;

  // Zoom target in supersampled-canvas pixels
  const geo = fitGeometry(effW, effH, ssW, ssH);

  // ── Zoom is OPTIONAL ──
  // If zoomTargetX/Y is undefined/null, or editorZoomScale is 1.0 (no zoom),
  // skip the zoompan filter entirely — the video will be a static image.
  let zoomFilter = "";
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

  // ── Canvas editor: text overlay ──
  let overlayFilter = "";
  if (opts.editorOverlayText && opts.editorOverlayX !== undefined && opts.editorOverlayY !== undefined) {
    const fontFile = getFontPath();
    const ovSize = opts.editorOverlaySize === "small" ? Math.round(outH * 0.04)
      : opts.editorOverlaySize === "large" ? Math.round(outH * 0.07)
      : Math.round(outH * 0.055);
    const ovColor = (opts.editorOverlayColor || "#FFFFFF").replace("#", "0x");
    const ovX = Math.round((opts.editorOverlayX / 100) * outW);
    const ovY = Math.round((opts.editorOverlayY / 100) * outH);
    const escapedOvText = opts.editorOverlayText.replace(/'/g, "’").replace(/:/g, "\\:").replace(/%/g, "\\%");
    overlayFilter = `,drawtext=fontfile='${fontFile}':text='${escapedOvText}':fontcolor=${ovColor}:fontsize=${ovSize}:x=${ovX}-text_w/2:y=${ovY}-text_h/2:shadowcolor=0x000000:shadowx=2:shadowy=2`;
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

  // Build the filter chain — strip leading commas from each part to avoid double commas
  const overlayChain = `overlay=(W-w)/2:(H-h)/2`;
  // When zoomFilter is empty (no zoom), zoompan doesn't downscale from supersampled
  // to output resolution, so we need an explicit scale step.
  const downscaleFilter = zoomFilter ? "" : `scale=${outW}:${outH}:flags=lanczos`;
  // Build post-zoom filter parts, stripping leading/trailing commas, filtering out empty ones
  const stripComma = (s: string) => s.replace(/^,+/, "").replace(/,+$/, "");
  const postZoomParts = [zoomFilter, overlayFilter, watermarkFilter, badgeFilter, magnifyFilter, captionsFilter, downscaleFilter]
    .map(stripComma)
    .filter((f) => f && f.length > 0);
  const postZoomChain = postZoomParts.join(",");
  const filterComplex =
    `[0:v]${drawboxFilter}${blurFilter}${redactFilter}${pixelateFilter}${spotlightFilter}${colorFilter}${cropFilter}split=2[bg][fg];` +
    `[bg]scale=${ssW}:${ssH}:force_original_aspect_ratio=increase:flags=lanczos,crop=${ssW}:${ssH},boxblur=40:40[bg_blurred];` +
    `[fg]scale=${ssW}:${ssH}:force_original_aspect_ratio=decrease:flags=lanczos[fg_scaled];` +
    `[bg_blurred][fg_scaled]${overlayChain}${postZoomChain ? "," + postZoomChain : ""},format=yuv420p[v];` +
    `[1:a]${buildAudioFilter()}[a]`;

  const args = [
    "-y",
    "-loop", "1",
    "-i", opts.screenshotPath,
    "-i", opts.audioPath,
    "-filter_complex", filterComplex,
    "-map", "[v]",
    "-map", "[a]",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "20",
    "-c:a", "aac",
    "-b:a", "160k",
    "-ar", "44100",
    "-pix_fmt", "yuv420p",
    "-t", paddedDuration.toFixed(3),
    "-movflags", "+faststart",
    outputPath,
  ];

  try {
    if (!ffmpegPath) throw new Error("ffmpeg-static path is undefined");
    await execFileAsync(ffmpegPath, args, {
      timeout: 300000, // supersampled zoompan is heavier — allow 5 min
      });
  } catch (err: any) {
    console.warn("[FFmpeg] Primary render failed, retrying simplified:", err.message);
    return renderStepVideoFallback(opts, outputPath, paddedDuration);
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
      const thickness = Math.max(6, Math.round(Math.min(imgWidth, imgHeight) * 0.008));
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
    const badgeSize = Math.round(Math.min(imgWidth, imgHeight) * 0.04);
    badgeFilter = `,drawbox=x=${bx - badgeSize/2}:y=${by - badgeSize/2}:w=${badgeSize}:h=${badgeSize}:color=${bColor}:t=fill,drawtext=fontfile='${fontFile}':text='${opts.editorBadgeNumber}':fontcolor=0x000000:fontsize=${Math.round(badgeSize * 0.6)}:x=${bx}-text_w/2:y=${by}-text_h/2`;
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
    const mx = Math.round((opts.editorMagnifyX / 100) * imgWidth);
    const my = Math.round((opts.editorMagnifyY / 100) * imgHeight);
    const mw = Math.round((opts.editorMagnifyW / 100) * imgWidth);
    const mh = Math.round((opts.editorMagnifyH / 100) * imgHeight);
    const corner = opts.editorMagnifyCorner || "bottom-right";
    const insetW = Math.round(Math.min(imgWidth, imgHeight) * 0.15);
    const insetH = insetW;
    let insetX = imgWidth - insetW - 20;
    let insetY = imgHeight - insetH - 20;
    if (corner.includes("left")) insetX = 20;
    if (corner.includes("top")) insetY = 20;
    magnifyFilter = `split[orig][magbase];[magbase]crop=${mw}:${mh}:${mx}:${my},scale=${insetW}:${insetH}:flags=lanczos[mag];[orig][mag]overlay=${insetX}:${insetY}:format=auto,drawbox=x=${insetX}:y=${insetY}:w=${insetW}:h=${insetH}:color=white@0.8:t=3,`;
  }

  // ── Canvas editor: color filter (fallback) ──
  let colorFilter = "";
  if (opts.editorColorFilter && opts.editorColorFilter !== "none") {
    switch (opts.editorColorFilter) {
      case "grayscale":
        colorFilter = "hue=s=0,";
        break;
      case "sepia":
        colorFilter = "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131,";
        break;
      case "warm":
        colorFilter = "colorbalance=rs=0.1:gs=-0.05:bs=-0.1,";
        break;
      case "cool":
        colorFilter = "colorbalance=rs=-0.1:gs=0.05:bs=0.1,";
        break;
      case "contrast":
        colorFilter = "eq=contrast=1.5:saturation=1.2,";
        break;
    }
  }

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
  const zoomFilter = (hasZoomTarget && maxZoom > 1.0)
    ? buildZoomFilter(geo.offsetX + (zoomTargetX! / 100) * geo.scaledW, geo.offsetY + (zoomTargetY! / 100) * geo.scaledH, paddedDuration, outputRes, maxZoom)
    : "";
  const delayMs = Math.round(AUDIO_LEAD_IN * 1000);

  // ── Canvas editor: text overlay ──
  let overlayFilter = "";
  if (opts.editorOverlayText && opts.editorOverlayX !== undefined && opts.editorOverlayY !== undefined) {
    const fontFile = getFontPath();
    const ovSize = opts.editorOverlaySize === "small" ? Math.round(outH * 0.04)
      : opts.editorOverlaySize === "large" ? Math.round(outH * 0.07)
      : Math.round(outH * 0.055);
    const ovColor = (opts.editorOverlayColor || "#FFFFFF").replace("#", "0x");
    const ovX = Math.round((opts.editorOverlayX / 100) * outW);
    const ovY = Math.round((opts.editorOverlayY / 100) * outH);
    const escapedOvText = opts.editorOverlayText.replace(/'/g, "’").replace(/:/g, "\\:").replace(/%/g, "\\%");
    overlayFilter = `,drawtext=fontfile='${fontFile}':text='${escapedOvText}':fontcolor=${ovColor}:fontsize=${ovSize}:x=${ovX}-text_w/2:y=${ovY}-text_h/2:shadowcolor=0x000000:shadowx=2:shadowy=2`;
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
  const mzPostZoomParts = [zoomFilter, overlayFilter, watermarkFilter, badgeFilter, magnifyFilter, captionsFilter]
    .map(stripCommaMz)
    .filter((f) => f && f.length > 0);
  const mzPostZoomChain = mzPostZoomParts.join(",");

  const args = [
    "-y",
    "-loop", "1",
    "-i", opts.screenshotPath,
    "-i", opts.audioPath,
    "-filter_complex",
    `[0:v]${drawboxFilter}${blurFilter}${redactFilter}${pixelateFilter}${spotlightFilter}${colorFilter}${cropFilter}scale=${outW}:${outH}:force_original_aspect_ratio=decrease,` +
      `pad=${outW}:${outH}:(ow-iw)/2:(oh-ih)/2${mzPostZoomChain ? "," + mzPostZoomChain : ""},format=yuv420p[v];` +
      `[1:a]adelay=${delayMs}:all=1,apad=pad_dur=${AUDIO_TAIL}[a]`,
    "-map", "[v]",
    "-map", "[a]",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "23",
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
    console.warn("[FFmpeg] Stream-copy concat failed, re-encoding:", err.message);
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
    "-preset", "medium",
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
  if (template.includes("dark") || template.includes("fade")) {
    color1 = "0x000000";
  } else if (template.includes("warm") || template.includes("title")) {
    color1 = "0x7c2d12"; // orange-900
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
    "-vf", `drawtext=fontfile=${fontFile}:text='${escapedText}':fontcolor=white:fontsize=${fontSize}:x=(w-text_w)/2:y=(h-text_h)/2:shadowcolor=0x000000:shadowx=2:shadowy=2`,
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "23",
    "-c:a", "aac",
    "-t", durationSec.toString(),
    "-pix_fmt", "yuv420p",
    "-shortest",
    outputPath,
  ];

  if (!ffmpegPath) throw new Error("ffmpeg-static path is undefined");
  try {
    console.log("[FFmpeg] Rendering text segment:", text.substring(0, 50));
    await execFileAsync(ffmpegPath, args, { timeout: 60000 });
  } catch (err: any) {
    console.warn("[FFmpeg] drawtext failed, trying plain color fallback:", err.message);
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

/**
 * Concatenate segments with FFmpeg xfade transitions.
 */
export async function concatenateSegmentsWithTransitions(
  segmentPaths: string[],
  transitions: string[],
  transitionDuration: number = 0.5
): Promise<string> {
  await ensureWorkDir();

  if (segmentPaths.length === 0) throw new Error("No segments to concatenate");
  if (segmentPaths.length === 1) return segmentPaths[0];

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
    
    // Map transition names from our frontend to ffmpeg xfade names
    // fade, slide-left, slide-right, slide-up, flip, dissolve
    let tName = "fade";
    const reqT = transitions[i - 1] || "fade";
    if (reqT === "slide-left") tName = "slideleft";
    if (reqT === "slide-right") tName = "slideright";
    if (reqT === "slide-up") tName = "slideup";
    if (reqT === "flip") tName = "pixelize"; // flip doesn't exist in basic xfade, use pixelize or wipeleft
    if (reqT === "dissolve") tName = "fade";

    filterComplex += `${lastV}${nextV}xfade=transition=${tName}:duration=${transitionDuration}:offset=${currentOffset.toFixed(3)}${outV};`;
    filterComplex += `${lastA}${nextA}acrossfade=d=${transitionDuration}${outA};`;
    
    lastV = outV;
    lastA = outA;
    currentOffset += durations[i] - transitionDuration;
  }

  args.push("-filter_complex", filterComplex.slice(0, -1)); // remove trailing semicolon
  args.push("-map", lastV);
  args.push("-map", lastA);
  args.push("-c:v", "libx264", "-preset", "medium", "-crf", "20");
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
    console.warn("[FFmpeg] xfade concat failed, falling back to simple concat:", err.message);
    return concatenateSegments(segmentPaths);
  }

  const stat = await fs.stat(outputPath);
  if (stat.size === 0) throw new Error("FFmpeg produced an empty final video");

  return outputPath;
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
  const segments: string[] = [];
  const totalDuration = opts.audioDuration;
  const zooms = opts.multiZooms.length > 0 ? opts.multiZooms : [{ targetX: 50, targetY: 50, zoomScale: 1, duration: totalDuration }];
  const totalZoomDuration = zooms.reduce((sum, z) => sum + (z.duration || 3), 0);
  const timeScale = totalDuration / totalZoomDuration;

  let currentTime = 0;
  for (let i = 0; i < zooms.length; i++) {
    const z = zooms[i];
    const segDuration = Math.max(1, (z.duration || 3) * timeScale);
    const segAudioPath = path.join(WORK_DIR, `mz_audio_${nanoid(8)}.wav`);

    // Trim audio slice for this segment
    await trimAudio(opts.audioPath, segAudioPath, segDuration, currentTime);

    const segPath = await renderStepVideo({
      screenshotPath: opts.screenshotPath,
      audioPath: segAudioPath,
      audioDuration: segDuration,
      zoomTargetX: z.targetX,
      zoomTargetY: z.targetY,
      zoomRectX: z.rectX,
      zoomRectY: z.rectY,
      zoomRectW: z.rectW,
      zoomRectH: z.rectH,
      editorZoomScale: z.zoomScale,
      outputRes: opts.outputRes,
      captions: opts.captions,
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

    segments.push(segPath);
    currentTime += segDuration;
  }

  return segments;
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
    console.log(`[FFmpeg] Downloading background music track: ${trackId} from ${url}`);
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
