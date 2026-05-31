import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { nanoid } from "nanoid";

import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import { concatenateSegments, resolutionToSize, cleanupTempFiles } from "./ffmpeg";

const execFileAsync = promisify(execFile);
const WORK_DIR = path.join(os.tmpdir(), "aivideo-studio-render");

async function ensureWorkDir(): Promise<string> {
  await fs.mkdir(WORK_DIR, { recursive: true });
  return WORK_DIR;
}

/**
 * Probe video duration using ffprobe.
 */
async function probeVideoDuration(filePath: string): Promise<number> {
  try {
    if (!ffprobeStatic.path) throw new Error("ffprobe-static path is undefined");
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
    if (isNaN(duration)) throw new Error("Non-numeric");
    return duration;
  } catch {
    return 10; // Fallback
  }
}

/**
 * Render a scene from a static image with Ken Burns pan/zoom effect + audio.
 */
export async function renderSceneWithImage(opts: {
  imagePath: string | null;
  audioPath: string;
  audioDuration: number;
  outputRes?: string;
}): Promise<string> {
  await ensureWorkDir();

  const outputPath = path.join(WORK_DIR, `studio_img_${nanoid(12)}.mp4`);
  const outputRes = opts.outputRes || "1920x1080";
  const [outW, outH] = outputRes.split("x").map(Number);
  const fps = 25;

  let args: string[];

  if (!opts.imagePath) {
    // Generate a black frame with the audio overlaid
    args = [
      "-y",
      "-f", "lavfi",
      "-i", `color=c=black:s=${outW}x${outH}:r=${fps}:d=${opts.audioDuration}`,
      "-i", opts.audioPath,
      "-map", "0:v",
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
  } else {
    const totalFrames = Math.max(Math.ceil(opts.audioDuration * fps), fps);

    // Ken Burns effect: gentle zoom from 1.0 to 1.3 with slight pan
    const maxZoom = 1.3;
    const zoomExpr = `1+${((maxZoom - 1) / totalFrames).toFixed(8)}*on`;
    // Pan from center-left to center-right
    const xExpr = `iw/2-(iw/zoom/2)+on*${(0.1 / totalFrames).toFixed(8)}*iw`;
    const yExpr = `ih/2-(ih/zoom/2)`;

    const zoomFilter =
      `zoompan=z='${zoomExpr}':` +
      `x='${xExpr}':` +
      `y='${yExpr}':` +
      `d=${totalFrames}:s=${outputRes}:fps=${fps}`;

    args = [
      "-y",
      "-loop", "1",
      "-i", opts.imagePath,
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
  }

  try {
    if (!ffmpegPath) throw new Error("ffmpeg-static path is undefined");
    await execFileAsync(ffmpegPath, args, {
      timeout: 120000,
      shell: true,
    });
  } catch (err: any) {
    throw new Error(`Studio image render failed: ${err.stderr || err.message}`);
  }

  const stat = await fs.stat(outputPath);
  if (stat.size === 0) throw new Error("Studio image render produced empty file");

  return outputPath;
}

/**
 * Render a scene from a video clip: trim/loop to match audio duration + overlay TTS audio.
 */
export async function renderSceneWithVideo(opts: {
  videoPath: string;
  audioPath: string;
  audioDuration: number;
  outputRes?: string;
}): Promise<string> {
  await ensureWorkDir();

  const outputPath = path.join(WORK_DIR, `studio_vid_${nanoid(12)}.mp4`);
  const outputRes = opts.outputRes || "1920x1080";
  const [outW, outH] = outputRes.split("x").map(Number);

  // Probe the video duration
  const videoDuration = await probeVideoDuration(opts.videoPath);

  let inputArgs: string[];

  if (videoDuration < opts.audioDuration) {
    // Loop the video to match audio duration
    const loopCount = Math.ceil(opts.audioDuration / videoDuration);
    inputArgs = [
      "-stream_loop", String(loopCount),
      "-i", opts.videoPath,
    ];
  } else {
    // Trim the video
    inputArgs = [
      "-i", opts.videoPath,
    ];
  }

  const args = [
    "-y",
    ...inputArgs,
    "-i", opts.audioPath,
    "-filter_complex",
    `[0:v]scale=${outW}:${outH}:force_original_aspect_ratio=decrease,pad=${outW}:${outH}:(ow-iw)/2:(oh-ih)/2[v]`,
    "-map", "[v]",
    "-map", "1:a",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "23",
    "-c:a", "aac",
    "-b:a", "128k",
    "-pix_fmt", "yuv420p",
    "-t", String(opts.audioDuration),
    "-shortest",
    "-movflags", "+faststart",
    outputPath,
  ];

  try {
    if (!ffmpegPath) throw new Error("ffmpeg-static path is undefined");
    await execFileAsync(ffmpegPath, args, {
      timeout: 180000,
      shell: true,
    });
  } catch (err: any) {
    throw new Error(`Studio video render failed: ${err.stderr || err.message}`);
  }

  const stat = await fs.stat(outputPath);
  if (stat.size === 0) throw new Error("Studio video render produced empty file");

  return outputPath;
}

// Re-export shared utilities for convenience
export { concatenateSegments, resolutionToSize, cleanupTempFiles };
