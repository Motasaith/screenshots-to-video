import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { nanoid } from "nanoid";

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
  const { stdout } = await execFileAsync("ffprobe", [
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
 * Build the FFmpeg zoompan filter expression.
 *
 * The zoom smoothly transitions from full-image (zoom=1) to a target zoom level,
 * panning to keep the target point centered.
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
  const maxZoom = 2.5;

  // Zoom in during first 80% of frames, hold for last 20%
  const zoomInFrames = Math.floor(totalFrames * 0.8);

  // Target pixel coordinates
  const targetPx = (targetXPct / 100) * imgWidth;
  const targetPy = (targetYPct / 100) * imgHeight;

  // Zoom expression: linearly increase from 1.0 to maxZoom over zoomInFrames, then hold
  const zoomExpr = `if(lte(on\\,${zoomInFrames})\\,1+${((maxZoom - 1) / zoomInFrames).toFixed(8)}*on\\,${maxZoom})`;

  // Pan expressions: keep target point centered as zoom increases
  // At zoom z: visible_width = iw/z, visible_height = ih/z
  // To center target_px: x = target_px - (iw/z)/2 = target_px - iw/(2*z)
  // But we also want to start at center of image, so we interpolate:
  // x = (iw/2 - iw/(2*zoom)) + (target_px - iw/2) * (1 - 1/zoom)
  //   = iw/2 * (1 - 1/zoom) + (target_px - iw/2) * (1 - 1/zoom)
  //   = (1 - 1/zoom) * target_px
  // Simplified: x = target_px - iw/(2*zoom)  [but clamped to valid range]
  const xExpr = `max(0\\,min(iw-iw/zoom\\,${targetPx.toFixed(1)}-iw/(2*zoom)))`;
  const yExpr = `max(0\\,min(ih-ih/zoom\\,${targetPy.toFixed(1)}-ih/(2*zoom)))`;

  return (
    `zoompan=z='${zoomExpr}':` +
    `x='${xExpr}':` +
    `y='${yExpr}':` +
    `d=${totalFrames}:s=${outputRes}:fps=${fps}`
  );
}

/**
 * Render a single step: screenshot + audio → video segment with zoom animation.
 */
export async function renderStepVideo(opts: {
  screenshotPath: string;
  audioPath: string;
  audioDuration: number;
  zoomTargetX: number; // percentage 0-100
  zoomTargetY: number; // percentage 0-100
  outputRes?: string;
}): Promise<string> {
  await ensureWorkDir();

  const outputPath = path.join(WORK_DIR, `segment_${nanoid(12)}.mp4`);
  const outputRes = opts.outputRes || "1920x1080";
  const [outW, outH] = outputRes.split("x").map(Number);

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

  // Build the zoom filter
  const zoomFilter = buildZoomFilter(
    opts.zoomTargetX,
    opts.zoomTargetY,
    imgWidth,
    imgHeight,
    opts.audioDuration,
    outputRes
  );

  // Construct the FFmpeg command
  // 1. Loop the image for the duration of audio
  // 2. Apply scale → zoompan filter
  // 3. Map audio
  const args = [
    "-y",
    "-loop", "1",
    "-i", opts.screenshotPath,
    "-i", opts.audioPath,
    "-filter_complex",
    `[0:v]scale=${outW}:${outH}:force_original_aspect_ratio=decrease,pad=${outW}:${outH}:(ow-iw)/2:(oh-ih)/2,${zoomFilter}[v]`,
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
    await execFileAsync("ffmpeg", args, {
      timeout: 120000, // 2 min per step
      shell: true,
    });
  } catch (err: any) {
    throw new Error(`FFmpeg render failed: ${err.stderr || err.message}`);
  }

  // Verify output
  const stat = await fs.stat(outputPath);
  if (stat.size === 0) throw new Error("FFmpeg produced an empty video file");

  return outputPath;
}

/**
 * Concatenate multiple video segments into a final MP4.
 */
export async function concatenateSegments(
  segmentPaths: string[]
): Promise<string> {
  await ensureWorkDir();

  if (segmentPaths.length === 0) throw new Error("No segments to concatenate");
  if (segmentPaths.length === 1) return segmentPaths[0];

  // Create a concat file listing
  const concatId = nanoid(8);
  const concatFile = path.join(WORK_DIR, `concat_${concatId}.txt`);
  const outputPath = path.join(WORK_DIR, `final_${concatId}.mp4`);

  const concatContent = segmentPaths
    .map((p) => `file '${p.replace(/\\/g, "/")}'`)
    .join("\n");

  await fs.writeFile(concatFile, concatContent, "utf-8");

  try {
    await execFileAsync("ffmpeg", [
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
