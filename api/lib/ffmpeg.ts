import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { nanoid } from "nanoid";

// Use static binaries so the user doesn't need to install ffmpeg globally
import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import { getCursorPng, buildCursorOverlayExpr } from "./cursorOverlay";

const execFileAsync = promisify(execFile);

const WORK_DIR = path.join(os.tmpdir(), "aivideo-render");

/**
 * Ensure the work directory exists.
 */
async function ensureWorkDir(): Promise<string> {
  await fs.mkdir(WORK_DIR, { recursive: true });
  return WORK_DIR;
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
    shell: true,
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
      shell: true,
    });
    const duration = parseFloat(stdout.trim());
    if (isNaN(duration)) throw new Error("Non-numeric duration");
    return duration;
  } catch {
    return 10; // Fallback
  }
}

/**
 * Build the FFmpeg zoompan filter expression with SMOOTHSTEP easing.
 *
 * The zoom uses a cubic smoothstep curve (3t² - 2t³) for organic-feeling
 * motion that starts slow, accelerates, then decelerates to a smooth stop.
 *
 * @param targetXPct - Target X as percentage (0-100) of image width
 * @param targetYPct - Target Y as percentage (0-100) of image height
 * @param imgWidth   - Source image width in pixels
 * @param imgHeight  - Source image height in pixels
 * @param audioDuration - Duration of the audio in seconds
 * @param outputRes  - Output resolution string, e.g. "1920x1080"
 */
export function buildZoomFilter(
  targetXPct: number,
  targetYPct: number,
  imgWidth: number,
  imgHeight: number,
  audioDuration: number,
  outputRes = "1920x1080"
): string {
  const fps = 25;
  const totalFrames = Math.max(Math.ceil(audioDuration * fps), fps); // at least 1 second
  const maxZoom = 1.8; // Reduced from 2.5 to avoid pixelation

  // Target pixel coordinates
  const targetPx = (targetXPct / 100) * imgWidth;
  const targetPy = (targetYPct / 100) * imgHeight;

  // ─── Smoothstep eased zoom ───
  // progress = clamp(on / totalFrames, 0, 1)
  // eased = 3 * progress² - 2 * progress³  (smoothstep)
  // zoom = 1 + (maxZoom - 1) * eased
  //
  // This naturally decelerates to a stop — no need for a separate "hold" phase.
  const zoomDelta = (maxZoom - 1).toFixed(6);
  const tExpr = `min(on/${totalFrames},1)`;
  const easedExpr = `(3*(${tExpr})*(${tExpr})-2*(${tExpr})*(${tExpr})*(${tExpr}))`;
  const zoomExpr = `1+${zoomDelta}*${easedExpr}`;

  // Pan expressions: keep target point centered as zoom increases
  // x = target_px - iw/(2*zoom), clamped to valid range
  const xExpr = `max(0,min(iw-iw/zoom,${targetPx.toFixed(1)}-iw/(2*zoom)))`;
  const yExpr = `max(0,min(ih-ih/zoom,${targetPy.toFixed(1)}-ih/(2*zoom)))`;

  return (
    `zoompan=z='${zoomExpr}':` +
    `x='${xExpr}':` +
    `y='${yExpr}':` +
    `d=${totalFrames}:s=${outputRes}:fps=${fps}`
  );
}

/**
 * Render a single step: screenshot + audio → video segment with:
 * 1. Smooth eased zoom animation (smoothstep)
 * 2. Animated cursor gliding to target
 * 3. Click ripple effect at target
 * 4. Optional highlight box
 */
export async function renderStepVideo(opts: {
  screenshotPath: string;
  audioPath: string;
  audioDuration: number;
  zoomTargetX: number; // percentage 0-100
  zoomTargetY: number; // percentage 0-100
  zoomRectX?: number; // percentage 0-100
  zoomRectY?: number; // percentage 0-100
  zoomRectW?: number; // percentage 0-100
  zoomRectH?: number; // percentage 0-100
  outputRes?: string;
}): Promise<string> {
  await ensureWorkDir();

  const outputPath = path.join(WORK_DIR, `segment_${nanoid(12)}.mp4`);
  const outputRes = opts.outputRes || "1920x1080";
  const [outW, outH] = outputRes.split("x").map(Number);
  const fps = 25;
  const totalFrames = Math.max(Math.ceil(opts.audioDuration * fps), fps);

  // Probe the source image dimensions
  let imgWidth: number;
  let imgHeight: number;
  try {
    const dims = await probeImageDimensions(opts.screenshotPath);
    imgWidth = dims.width;
    imgHeight = dims.height;
  } catch {
    // Fallback: assume 1920x1080 if probe fails
    imgWidth = 1920;
    imgHeight = 1080;
  }

  // Draw highlight box if dimensions are provided
  let drawboxFilter = "";
  if (
    opts.zoomRectX !== undefined &&
    opts.zoomRectY !== undefined &&
    opts.zoomRectW !== undefined &&
    opts.zoomRectH !== undefined
  ) {
    // drawbox is applied BEFORE scale+pad, so it sees original image pixels
    const rx = Math.round((opts.zoomRectX / 100) * imgWidth);
    const ry = Math.round((opts.zoomRectY / 100) * imgHeight);
    const rw = Math.round((opts.zoomRectW / 100) * imgWidth);
    const rh = Math.round((opts.zoomRectH / 100) * imgHeight);
    // Draw a prominent orange box around the target region (color #f97316 in Tailwind)
    drawboxFilter = `drawbox=x=${rx}:y=${ry}:w=${rw}:h=${rh}:color=#f97316@1.0:thickness=6,`;
  }

  // ─── Compute zoom target in padded-frame coordinates ───
  const imgAspect = imgWidth / imgHeight;
  const outAspect = outW / outH;

  let scaledImgW: number, scaledImgH: number, padOffsetX: number, padOffsetY: number;
  if (imgAspect > outAspect) {
    // Image is wider → scaled to fill width, padded top/bottom
    scaledImgW = outW;
    scaledImgH = Math.round(outW / imgAspect);
    padOffsetX = 0;
    padOffsetY = Math.round((outH - scaledImgH) / 2);
  } else {
    // Image is taller → scaled to fill height, padded left/right
    scaledImgH = outH;
    scaledImgW = Math.round(outH * imgAspect);
    padOffsetX = Math.round((outW - scaledImgW) / 2);
    padOffsetY = 0;
  }

  // Convert image-relative percentage to padded-frame pixel coordinate
  const zoomTargetPxX = padOffsetX + (opts.zoomTargetX / 100) * scaledImgW;
  const zoomTargetPxY = padOffsetY + (opts.zoomTargetY / 100) * scaledImgH;

  // Convert back to percentage of the full padded frame for buildZoomFilter
  const adjustedZoomXPct = (zoomTargetPxX / outW) * 100;
  const adjustedZoomYPct = (zoomTargetPxY / outH) * 100;

  const zoomFilter = buildZoomFilter(
    adjustedZoomXPct,
    adjustedZoomYPct,
    outW,
    outH,
    opts.audioDuration,
    outputRes
  );

  // ─── Cursor & click ripple setup ───
  let cursorPngPath: string | null = null;
  try {
    cursorPngPath = await getCursorPng(32);
  } catch (err: any) {
    console.warn("[FFmpeg] Cursor PNG generation failed, skipping cursor overlay:", err.message);
  }

  // Cursor animation: starts at an offset position, glides to target
  const cursorStartX = Math.max(0, zoomTargetPxX - outW * 0.15);
  const cursorStartY = Math.max(0, zoomTargetPxY - outH * 0.12);

  // Build the filter_complex chain
  // The cursor and click ripple are composited BEFORE the zoompan
  // so they move with the image during zoom.

  let filterComplex: string;
  const inputArgs: string[] = [
    "-y",
    "-loop", "1",
    "-i", opts.screenshotPath,
    "-i", opts.audioPath,
  ];

  if (cursorPngPath) {
    // Add cursor as 3rd input
    inputArgs.push("-i", cursorPngPath);

    // ─── Cursor overlay expression ───
    const travelFrames = Math.floor(totalFrames * 0.4);
    const tExpr = `min(n/${travelFrames},1)`;
    const easedExpr = `(3*(${tExpr})*(${tExpr})-2*(${tExpr})*(${tExpr})*(${tExpr}))`;

    const cursorDx = zoomTargetPxX - cursorStartX;
    const cursorDy = zoomTargetPxY - cursorStartY;
    const cursorXExpr = `${cursorStartX.toFixed(0)}+${cursorDx.toFixed(0)}*${easedExpr}`;
    const cursorYExpr = `${cursorStartY.toFixed(0)}+${cursorDy.toFixed(0)}*${easedExpr}`;

    // ─── Click ripple: expanding ring drawn with drawbox workaround ───
    // We'll use drawtext to render a "●" character that scales, as a simple
    // and reliable click indicator. It appears at 40% of scene duration for 0.6s.
    const arrivalTime = (opts.audioDuration * 0.4).toFixed(3);
    const rippleEndTime = (opts.audioDuration * 0.4 + 0.6).toFixed(3);

    // Click ripple: draw a fading circle using drawtext with a Unicode circle character
    // We use multiple drawtext filters at different sizes for the expanding ring effect
    const rippleFilters = buildClickRippleDrawtext(
      zoomTargetPxX,
      zoomTargetPxY,
      parseFloat(arrivalTime),
      parseFloat(rippleEndTime),
    );

    filterComplex =
      // Step 1: Scale and pad the screenshot
      `[0:v]${drawboxFilter}scale=${outW}:${outH}:force_original_aspect_ratio=decrease,` +
      `pad=${outW}:${outH}:(ow-iw)/2:(oh-ih)/2[base];` +
      // Step 2: Overlay cursor on base (cursor moves with smoothstep easing)
      `[base][2:v]overlay=x='${cursorXExpr}':y='${cursorYExpr}':` +
      `enable='between(n,0,${totalFrames})'[withcursor];` +
      // Step 3: Apply click ripple effect
      `[withcursor]${rippleFilters}[withripple];` +
      // Step 4: Apply zoompan with smoothstep easing
      `[withripple]${zoomFilter}[v]`;
  } else {
    // No cursor available — just do eased zoom
    filterComplex =
      `[0:v]${drawboxFilter}scale=${outW}:${outH}:force_original_aspect_ratio=decrease,` +
      `pad=${outW}:${outH}:(ow-iw)/2:(oh-ih)/2,${zoomFilter}[v]`;
  }

  // Construct the FFmpeg command
  const args = [
    ...inputArgs,
    "-filter_complex",
    filterComplex,
    "-map", "[v]",
    "-map", "1:a",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "23",
    "-c:a", "aac",
    "-b:a", "128k",
    "-pix_fmt", "yuv420p",
    "-shortest",
    "-movflags", "+faststart",
    outputPath,
  ];

  try {
    if (!ffmpegPath) throw new Error("ffmpeg-static path is undefined");
    await execFileAsync(ffmpegPath, args, {
      timeout: 180000, // 3 min per step (slightly longer due to cursor overlay)
      shell: true,
    });
  } catch (err: any) {
    // If the cursor/ripple filter fails, retry without effects
    console.warn("[FFmpeg] Render with effects failed, retrying without:", err.message);
    return renderStepVideoFallback(opts, outputPath);
  }

  // Verify output
  const stat = await fs.stat(outputPath);
  if (stat.size === 0) throw new Error("FFmpeg produced an empty video file");

  return outputPath;
}

/**
 * Fallback render without cursor/ripple effects (just eased zoom).
 * Used when the full effects pipeline fails.
 */
async function renderStepVideoFallback(
  opts: Parameters<typeof renderStepVideo>[0],
  outputPath: string
): Promise<string> {
  const outputRes = opts.outputRes || "1920x1080";
  const [outW, outH] = outputRes.split("x").map(Number);

  let imgWidth: number, imgHeight: number;
  try {
    const dims = await probeImageDimensions(opts.screenshotPath);
    imgWidth = dims.width;
    imgHeight = dims.height;
  } catch {
    imgWidth = 1920;
    imgHeight = 1080;
  }

  let drawboxFilter = "";
  if (
    opts.zoomRectX !== undefined &&
    opts.zoomRectY !== undefined &&
    opts.zoomRectW !== undefined &&
    opts.zoomRectH !== undefined
  ) {
    const rx = Math.round((opts.zoomRectX / 100) * imgWidth);
    const ry = Math.round((opts.zoomRectY / 100) * imgHeight);
    const rw = Math.round((opts.zoomRectW / 100) * imgWidth);
    const rh = Math.round((opts.zoomRectH / 100) * imgHeight);
    drawboxFilter = `drawbox=x=${rx}:y=${ry}:w=${rw}:h=${rh}:color=#f97316@1.0:thickness=6,`;
  }

  const imgAspect = imgWidth / imgHeight;
  const outAspect = outW / outH;
  let scaledImgW: number, scaledImgH: number, padOffsetX: number, padOffsetY: number;
  if (imgAspect > outAspect) {
    scaledImgW = outW;
    scaledImgH = Math.round(outW / imgAspect);
    padOffsetX = 0;
    padOffsetY = Math.round((outH - scaledImgH) / 2);
  } else {
    scaledImgH = outH;
    scaledImgW = Math.round(outH * imgAspect);
    padOffsetX = Math.round((outW - scaledImgW) / 2);
    padOffsetY = 0;
  }

  const zoomTargetPxX = padOffsetX + (opts.zoomTargetX / 100) * scaledImgW;
  const zoomTargetPxY = padOffsetY + (opts.zoomTargetY / 100) * scaledImgH;
  const adjustedZoomXPct = (zoomTargetPxX / outW) * 100;
  const adjustedZoomYPct = (zoomTargetPxY / outH) * 100;

  const zoomFilter = buildZoomFilter(
    adjustedZoomXPct,
    adjustedZoomYPct,
    outW,
    outH,
    opts.audioDuration,
    outputRes
  );

  const args = [
    "-y",
    "-loop", "1",
    "-i", opts.screenshotPath,
    "-i", opts.audioPath,
    "-filter_complex",
    `[0:v]${drawboxFilter}scale=${outW}:${outH}:force_original_aspect_ratio=decrease,pad=${outW}:${outH}:(ow-iw)/2:(oh-ih)/2,${zoomFilter}[v]`,
    "-map", "[v]",
    "-map", "1:a",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "23",
    "-c:a", "aac",
    "-b:a", "128k",
    "-pix_fmt", "yuv420p",
    "-shortest",
    "-movflags", "+faststart",
    outputPath,
  ];

  if (!ffmpegPath) throw new Error("ffmpeg-static path is undefined");
  await execFileAsync(ffmpegPath, args, {
    timeout: 120000,
    shell: true,
  });

  const stat = await fs.stat(outputPath);
  if (stat.size === 0) throw new Error("FFmpeg produced an empty video file");

  return outputPath;
}

/**
 * Build drawtext-based click ripple filter.
 * Uses a large Unicode bullet "●" character rendered as a fading, color-shifting
 * circle at the target point. Three passes create expanding concentric rings.
 */
function buildClickRippleDrawtext(
  targetX: number,
  targetY: number,
  arrivalTime: number,
  endTime: number,
): string {
  // Three concentric ring pulses using drawtext with "●" at different sizes
  // Each ring starts slightly staggered and fades out
  const rings = [
    { delay: 0.0, size: 20, alpha: 0.7 },
    { delay: 0.1, size: 32, alpha: 0.5 },
    { delay: 0.2, size: 48, alpha: 0.3 },
  ];

  // Build chained drawtext filters
  let filterChain = "";
  for (let i = 0; i < rings.length; i++) {
    const ring = rings[i];
    const startT = (arrivalTime + ring.delay).toFixed(3);
    const endT = (endTime + ring.delay).toFixed(3);

    // Alpha fades from ring.alpha to 0 over the duration
    const duration = parseFloat(endT) - parseFloat(startT);
    // FFmpeg alpha expression: alpha = baseAlpha * (1 - (t - startT) / duration)
    const alphaExpr = `${ring.alpha.toFixed(2)}*(1-(t-${startT})/${duration.toFixed(3)})`;

    filterChain +=
      `drawtext=text='●':fontsize=${ring.size}:fontcolor=white@${ring.alpha.toFixed(1)}:` +
      `x=${Math.round(targetX - ring.size / 4)}:y=${Math.round(targetY - ring.size / 3)}:` +
      `enable='between(t,${startT},${endT})'`;

    if (i < rings.length - 1) {
      filterChain += ",";
    }
  }

  return filterChain;
}

/**
 * Concatenate multiple video segments into a final MP4 with crossfade transitions.
 *
 * Uses the xfade video filter and acrossfade audio filter to create smooth
 * 0.5-second crossfade transitions between consecutive segments.
 *
 * @param segmentPaths - Array of video segment file paths
 * @param segmentDurations - Array of durations (seconds) for each segment.
 *                           If not provided, durations will be probed.
 */
export async function concatenateSegments(
  segmentPaths: string[],
  segmentDurations?: number[],
): Promise<string> {
  await ensureWorkDir();

  if (segmentPaths.length === 0) throw new Error("No segments to concatenate");
  if (segmentPaths.length === 1) return segmentPaths[0];

  const concatId = nanoid(8);
  const outputPath = path.join(WORK_DIR, `final_${concatId}.mp4`);

  // For 2+ segments, use xfade crossfade transitions
  const XFADE_DURATION = 0.5; // seconds

  // Get durations if not provided
  let durations = segmentDurations;
  if (!durations || durations.length !== segmentPaths.length) {
    durations = [];
    for (const segPath of segmentPaths) {
      const dur = await probeMediaDuration(segPath);
      durations.push(dur);
    }
  }

  // Build the input arguments
  const inputArgs: string[] = [];
  for (const segPath of segmentPaths) {
    inputArgs.push("-i", segPath);
  }

  // Build the xfade filter chain
  // For N segments, we need N-1 xfade filters chained together.
  //
  // [0:v][1:v]xfade=transition=fade:duration=0.5:offset=<dur0-0.5>[v01];
  // [v01][2:v]xfade=transition=fade:duration=0.5:offset=<dur0+dur1-1.0>[v012];
  // ...
  //
  // Audio: similar with acrossfade
  let videoFilter = "";
  let audioFilter = "";
  let cumulativeDuration = 0;

  if (segmentPaths.length === 2) {
    // Simple case: just one xfade
    const offset = Math.max(0, durations[0] - XFADE_DURATION);
    videoFilter = `[0:v][1:v]xfade=transition=fade:duration=${XFADE_DURATION}:offset=${offset.toFixed(3)}[vout]`;
    audioFilter = `[0:a][1:a]acrossfade=d=${XFADE_DURATION}:c1=tri:c2=tri[aout]`;
  } else {
    // Chain multiple xfade filters
    let prevVideoLabel = "0:v";
    let prevAudioLabel = "0:a";
    cumulativeDuration = durations[0];

    for (let i = 1; i < segmentPaths.length; i++) {
      const offset = Math.max(0, cumulativeDuration - XFADE_DURATION);
      const isLast = i === segmentPaths.length - 1;
      const outVideoLabel = isLast ? "vout" : `v${i}`;
      const outAudioLabel = isLast ? "aout" : `a${i}`;

      videoFilter += `[${prevVideoLabel}][${i}:v]xfade=transition=fade:duration=${XFADE_DURATION}:offset=${offset.toFixed(3)}[${outVideoLabel}]`;
      audioFilter += `[${prevAudioLabel}][${i}:a]acrossfade=d=${XFADE_DURATION}:c1=tri:c2=tri[${outAudioLabel}]`;

      if (!isLast) {
        videoFilter += ";";
        audioFilter += ";";
      }

      // Each xfade reduces total duration by XFADE_DURATION
      cumulativeDuration += durations[i] - XFADE_DURATION;
      prevVideoLabel = outVideoLabel;
      prevAudioLabel = outAudioLabel;
    }
  }

  const filterComplex = `${videoFilter};${audioFilter}`;

  const args = [
    "-y",
    ...inputArgs,
    "-filter_complex", filterComplex,
    "-map", "[vout]",
    "-map", "[aout]",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "23",
    "-c:a", "aac",
    "-b:a", "128k",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    outputPath,
  ];

  try {
    if (!ffmpegPath) throw new Error("ffmpeg-static path is undefined");
    await execFileAsync(ffmpegPath, args, {
      timeout: 300000, // 5 min for crossfade concatenation (re-encodes)
      shell: true,
    });
  } catch (err: any) {
    // Fallback to simple concat if xfade fails
    console.warn("[FFmpeg] Crossfade concat failed, falling back to hard cut:", err.message);
    return concatenateSegmentsFallback(segmentPaths);
  }

  return outputPath;
}

/**
 * Fallback concatenation without crossfade (simple concat demuxer, hard cut).
 * Used when xfade filter fails.
 */
async function concatenateSegmentsFallback(
  segmentPaths: string[]
): Promise<string> {
  await ensureWorkDir();

  const concatId = nanoid(8);
  const concatFile = path.join(WORK_DIR, `concat_${concatId}.txt`);
  const outputPath = path.join(WORK_DIR, `final_fallback_${concatId}.mp4`);

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
      shell: true,
    });
  } catch (err: any) {
    throw new Error(`FFmpeg concat failed: ${err.stderr || err.message}`);
  }

  // Cleanup concat file
  await fs.unlink(concatFile).catch(() => {});

  return outputPath;
}

/**
 * Convert a resolution string like "720p" or "1080p" to "WIDTHxHEIGHT".
 */
export function resolutionToSize(res: string): string {
  switch (res) {
    case "720p":
      return "1280x720";
    case "4k":
      return "3840x2160";
    case "1080p":
    default:
      return "1920x1080";
  }
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
