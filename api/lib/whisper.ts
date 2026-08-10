/**
 * Speech to text via whisper.cpp, used as the fallback when a browser has no
 * Web Speech API (Firefox, and anything locked down).
 *
 * Deliberately shells out to a binary rather than pulling in an npm package
 * that compiles whisper.cpp during `npm install`. A deploy that has to build
 * C++ is a deploy that breaks on a VPS at the worst moment, and the model file
 * is 150 MB of binary that has no business in a git repo. Both are configured
 * by env, and if either is missing this module reports itself unavailable so
 * the client can fall back to the browser instead of the request failing.
 *
 * Setup on the server:
 *
 *   git clone https://github.com/ggml-org/whisper.cpp /opt/whisper.cpp
 *   cd /opt/whisper.cpp && cmake -B build && cmake --build build -j --config Release
 *   ./models/download-ggml-model.sh base.en
 *
 * then in .env:
 *
 *   WHISPER_BIN=/opt/whisper.cpp/build/bin/whisper-cli
 *   WHISPER_MODEL=/opt/whisper.cpp/models/ggml-base.en.bin
 *
 * `base.en` is the sweet spot for support notes: noticeably better than `tiny`
 * on accents and background noise, and still a few seconds for a short clip on
 * CPU. Move to `small.en` only if accuracy is actually the complaint, since it
 * is roughly three times slower.
 */

import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { nanoid } from "nanoid";
import ffmpegPath from "ffmpeg-static";
import { env } from "./env";
import { createLogger } from "./logger";

const execFileAsync = promisify(execFile);
const log = createLogger({ path: "whisper" });

/** Longest clip we will transcribe. Support notes are short; this is a guard. */
const MAX_SECONDS = 120;

/** Cheap existence check, so `unavailable` is accurate rather than optimistic. */
export async function whisperAvailable(): Promise<boolean> {
  const bin = env.whisperBin;
  const model = env.whisperModel;
  if (!bin || !model) return false;
  try {
    await Promise.all([fs.access(bin), fs.access(model)]);
    return true;
  } catch {
    return false;
  }
}

export interface TranscriptionResult {
  text: string;
  /** Which engine produced it, so the client can say so if it matters. */
  engine: "whisper";
}

/**
 * Transcribe a recorded clip.
 *
 * The browser hands us whatever its MediaRecorder produced, usually WebM/Opus,
 * which whisper.cpp cannot read. ffmpeg converts it to the 16 kHz mono signed
 * 16-bit WAV that whisper wants; anything else and it either refuses or
 * transcribes noise.
 */
export async function transcribeAudio(
  audio: Buffer,
  opts?: { mimeType?: string }
): Promise<TranscriptionResult> {
  const bin = env.whisperBin;
  const model = env.whisperModel;

  if (!bin || !model) {
    throw new Error("Server transcription is not configured");
  }
  if (!ffmpegPath) {
    throw new Error("ffmpeg is unavailable, cannot convert audio for transcription");
  }

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "aivideo-stt-"));
  const id = nanoid(8);
  // The extension is a hint for ffmpeg's demuxer; it sniffs the content anyway.
  const inputPath = path.join(dir, `in_${id}${extensionFor(opts?.mimeType)}`);
  const wavPath = path.join(dir, `in_${id}.wav`);

  try {
    await fs.writeFile(inputPath, audio);

    await execFileAsync(
      ffmpegPath,
      [
        "-hide_banner",
        "-loglevel", "error",
        "-i", inputPath,
        "-t", String(MAX_SECONDS),
        "-ar", "16000",   // whisper.cpp requires 16 kHz
        "-ac", "1",       // mono
        "-c:a", "pcm_s16le",
        "-y", wavPath,
      ],
      { timeout: 60_000 }
    );

    // `-nt` no timestamps, `-np` no progress: we want the transcript on stdout
    // and nothing else to parse around.
    const { stdout } = await execFileAsync(
      bin,
      ["-m", model, "-f", wavPath, "-nt", "-np", "-l", "auto"],
      { timeout: 180_000, maxBuffer: 8 * 1024 * 1024 }
    );

    const text = stdout
      .split("\n")
      // whisper prints bracketed non-speech markers such as [BLANK_AUDIO],
      // [MUSIC] and [SOUND]. They are not something a user said.
      .map((line) => line.replace(/\[[A-Z_ ]+\]/g, "").trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    log.info("Transcribed audio", { bytes: audio.length, chars: text.length });
    return { text, engine: "whisper" };
  } finally {
    // Recordings are user speech. They do not linger on disk.
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

function extensionFor(mimeType?: string): string {
  if (!mimeType) return ".webm";
  if (mimeType.includes("ogg")) return ".ogg";
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return ".m4a";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return ".mp3";
  if (mimeType.includes("wav")) return ".wav";
  return ".webm";
}
