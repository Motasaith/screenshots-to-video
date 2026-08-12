/**
 * Taking in a narration recording the customer made themselves.
 *
 * Two things have to be true before an upload can stand in for generated speech.
 *
 * It has to actually be audio. The browser's declared content type is set by the
 * client and means nothing, so the file is probed: if ffprobe finds no audio stream,
 * it is refused. That also rejects anything dressed up as an mp3.
 *
 * It has to match what the render pipeline expects. Segments are concatenated, and
 * concat assumes consistent codec parameters, so an arbitrary 48kHz AAC recording
 * from a phone is transcoded to the same mp3 the TTS path produces rather than
 * handed to ffmpeg and hoped for.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { nanoid } from "nanoid";
import { saveLocalFile } from "./localStore";
import { probeMediaDuration } from "./ffmpeg";
import { createLogger } from "./logger";

const run = promisify(execFile);
const log = createLogger({ path: "voiceover" });

/** What the TTS path produces, so an upload has to match it. */
const TARGET_SAMPLE_RATE = 44100;
const TARGET_CHANNELS = 2;
const TARGET_BITRATE = "128k";

/** Long enough for a scene's narration, short enough not to be a music file. */
export const MAX_VOICEOVER_SECONDS = 300;
export const MAX_VOICEOVER_BYTES = 25 * 1024 * 1024;

export interface IngestedVoiceover {
  /** Storage key for the transcoded mp3. */
  key: string;
  /** Real duration, measured rather than taken from the container header. */
  duration: number;
}

async function ffmpegPath(): Promise<string> {
  // The deploy symlinks the system binary over ffmpeg-static, so this resolves to
  // whichever one the server actually has.
  const mod = await import("ffmpeg-static");
  return (mod.default as unknown as string) || "ffmpeg";
}

/** Whether the file has an audio stream at all. */
async function hasAudioStream(file: string): Promise<boolean> {
  try {
    // ffprobe-static, the same binary probeMediaDuration uses. A bare "ffprobe"
    // would depend on it being on PATH, which it is not on a plain VPS.
    const ffprobe = await import("ffprobe-static");
    const bin = (ffprobe.default as unknown as { path: string }).path;
    const { stdout } = await run(bin, [
      "-v", "error",
      "-select_streams", "a:0",
      "-show_entries", "stream=codec_type",
      "-of", "csv=p=0",
      file,
    ]);
    return stdout.trim().startsWith("audio");
  } catch {
    return false;
  }
}

/**
 * Validate, transcode and store a narration recording.
 *
 * Throws with a message meant for the person who uploaded it, because every failure
 * here is something they can act on: wrong file, too long, silent.
 */
export async function ingestVoiceover(
  buffer: Buffer,
  originalName: string,
  userId: number
): Promise<IngestedVoiceover> {
  if (buffer.byteLength > MAX_VOICEOVER_BYTES) {
    throw new Error(
      `That file is ${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB. The limit is ${MAX_VOICEOVER_BYTES / 1024 / 1024}MB.`
    );
  }
  if (buffer.byteLength < 1024) {
    throw new Error("That recording is empty. Try again, and check your microphone is not muted.");
  }

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "voiceover-"));
  // The extension is only a hint for ffmpeg's demuxer; the content decides.
  const ext = (path.extname(originalName) || ".bin").slice(0, 8).toLowerCase();
  const inputPath = path.join(dir, `in${ext}`);
  const outputPath = path.join(dir, `out.mp3`);

  try {
    await fs.writeFile(inputPath, buffer);

    if (!(await hasAudioStream(inputPath))) {
      throw new Error("That file does not contain any audio. Upload an mp3, wav or m4a.");
    }

    const sourceDuration = await probeMediaDuration(inputPath);
    if (!sourceDuration || sourceDuration < 0.3) {
      throw new Error("That recording is too short to use as narration.");
    }
    if (sourceDuration > MAX_VOICEOVER_SECONDS) {
      throw new Error(
        `That recording is ${Math.round(sourceDuration)}s. A single scene's narration can be up to ${MAX_VOICEOVER_SECONDS}s.`
      );
    }

    // Transcode to the pipeline's format. `-vn` drops any album art, which is a
    // video stream as far as ffmpeg is concerned and would break the concat.
    await run(await ffmpegPath(), [
      "-y",
      "-i", inputPath,
      "-vn",
      "-ac", String(TARGET_CHANNELS),
      "-ar", String(TARGET_SAMPLE_RATE),
      "-b:a", TARGET_BITRATE,
      "-c:a", "libmp3lame",
      outputPath,
    ]);

    const transcoded = await fs.readFile(outputPath);
    if (transcoded.byteLength < 256) {
      throw new Error("That recording could not be converted. Try a different file.");
    }

    // Measure the result, not the source: the transcode is what the render uses, and
    // scene length is computed from this number.
    const duration = (await probeMediaDuration(outputPath)) ?? sourceDuration;

    const key = await saveLocalFile(transcoded, {
      userId,
      folder: "voiceover",
      filename: `voiceover_${nanoid(8)}.mp3`,
    });

    log.info("Voiceover ingested", {
      userId,
      seconds: Number(duration.toFixed(2)),
      bytes: transcoded.byteLength,
    });

    return { key, duration };
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
