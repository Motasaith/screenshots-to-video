import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { nanoid } from "nanoid";

import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import {
  concatenateSegments,
  resolutionToSize,
  cleanupTempFiles,
  RENDER_FPS,
  AUDIO_LEAD_IN,
  AUDIO_TAIL,
  getFontPath,
  buildCaptionsFilter,
} from "./ffmpeg";

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

/** Shared audio treatment: lead-in/tail silence + loudness normalization. */
function studioAudioFilter(): string {
  const delayMs = Math.round(AUDIO_LEAD_IN * 1000);
  return (
    `adelay=${delayMs}:all=1,` +
    `apad=pad_dur=${AUDIO_TAIL},` +
    `loudnorm=I=-16:TP=-1.5:LRA=11`
  );
}

// Captions filter helper is now imported from ./ffmpeg

/**
 * Render a scene from a static image with a documentary-style Ken Burns
 * effect: a gentle eased zoom with a slow drift, rendered on a supersampled
 * canvas so the motion is jitter-free (zoompan rounds pan offsets to whole
 * pixels — supersampling gives sub-pixel precision at the output size).
 */
export async function renderSceneWithImage(opts: {
  imagePath: string | null;
  audioPath: string;
  audioDuration: number;
  outputRes?: string;
  captions?: { text: string; style: string; size: string; position: string; color: string; enabled: boolean };
}): Promise<string> {
  await ensureWorkDir();

  const outputPath = path.join(WORK_DIR, `studio_img_${nanoid(12)}.mp4`);
  const outputRes = opts.outputRes || "1920x1080";
  const [outW, outH] = outputRes.split("x").map(Number);
  const paddedDuration = opts.audioDuration + AUDIO_LEAD_IN + AUDIO_TAIL;

  let args: string[];

  if (!opts.imagePath) {
    // Generate a black frame with the audio overlaid
    args = [
      "-y",
      "-f", "lavfi",
      "-i", `color=c=black:s=${outW}x${outH}:r=${RENDER_FPS}:d=${paddedDuration.toFixed(3)}`,
      "-i", opts.audioPath,
      "-filter_complex", `[1:a]${studioAudioFilter()}[a]`,
      "-map", "0:v",
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
  } else {
    const totalFrames = Math.max(Math.ceil(paddedDuration * RENDER_FPS), RENDER_FPS);

    // Supersampled canvas (2x, even dimensions) to eliminate zoompan jitter
    const ssFactor = Math.min(2, 4200 / outW);
    const ssW = 2 * Math.round((outW * ssFactor) / 2);
    const ssH = 2 * Math.round((outH * ssFactor) / 2);

    // Gentle Ken Burns: ease from 1.0 to ~1.18 over the whole scene.
    // Smoothstep start/end so the motion breathes instead of marching.
    const maxZoom = 1.18;
    const t = `min(on/${totalFrames},1)`;
    const eased = `(3*(${t})*(${t})-2*(${t})*(${t})*(${t}))`;
    const zoomExpr = `1+${(maxZoom - 1).toFixed(6)}*${eased}`;

    // Slow horizontal drift (≈4% of width) while staying vertically centered
    const driftExpr = `(iw*0.04)*${eased}`;
    const xExpr = `max(0,min(iw-iw/zoom,iw/2-(iw/zoom/2)+${driftExpr}))`;
    const yExpr = `ih/2-(ih/zoom/2)`;

    const captionsFilter = opts.captions?.enabled ? `,${buildCaptionsFilter(opts.captions.text, opts.captions.style, opts.captions.size, opts.captions.position, opts.captions.color, outW, outH, opts.audioDuration)}` : "";

    const zoomFilter =
      `zoompan=z='${zoomExpr}':` +
      `x='${xExpr}':` +
      `y='${yExpr}':` +
      `d=${totalFrames}:s=${outputRes}:fps=${RENDER_FPS}`;

    args = [
      "-y",
      "-loop", "1",
      "-i", opts.imagePath,
      "-i", opts.audioPath,
      "-filter_complex",
      `[0:v]scale=${ssW}:${ssH}:force_original_aspect_ratio=increase:flags=lanczos,` +
        `crop=${ssW}:${ssH},${zoomFilter}${captionsFilter},format=yuv420p[v];` +
        `[1:a]${studioAudioFilter()}[a]`,
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
  }

  try {
    if (!ffmpegPath) throw new Error("ffmpeg-static path is undefined");
    await execFileAsync(ffmpegPath, args, {
      timeout: 300000,
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
  captions?: { text: string; style: string; size: string; position: string; color: string; enabled: boolean };
}): Promise<string> {
  await ensureWorkDir();

  const outputPath = path.join(WORK_DIR, `studio_vid_${nanoid(12)}.mp4`);
  const outputRes = opts.outputRes || "1920x1080";
  const [outW, outH] = outputRes.split("x").map(Number);
  const paddedDuration = opts.audioDuration + AUDIO_LEAD_IN + AUDIO_TAIL;

  // Probe the video duration
  const videoDuration = await probeVideoDuration(opts.videoPath);

  let inputArgs: string[];

  if (videoDuration < paddedDuration) {
    // Loop the video to match audio duration
    const loopCount = Math.ceil(paddedDuration / videoDuration);
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

  const captionsFilter = opts.captions?.enabled ? `,${buildCaptionsFilter(opts.captions.text, opts.captions.style, opts.captions.size, opts.captions.position, opts.captions.color, outW, outH, opts.audioDuration)}` : "";

  const args = [
    "-y",
    ...inputArgs,
    "-i", opts.audioPath,
    "-filter_complex",
    `[0:v]scale=${outW}:${outH}:force_original_aspect_ratio=decrease,` +
      `pad=${outW}:${outH}:(ow-iw)/2:(oh-ih)/2,fps=${RENDER_FPS}${captionsFilter},format=yuv420p[v];` +
      `[1:a]${studioAudioFilter()}[a]`,
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
      timeout: 300000,
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
