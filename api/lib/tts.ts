import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { nanoid } from "nanoid";

const execFileAsync = promisify(execFile);

import { EdgeTTS } from "node-edge-tts";

/**
 * ──────────────────────────────────────────────────────────────────
 * Two free TTS engines:
 *
 * 1. Edge TTS (default) — Microsoft neural voices, free, fast.
 *    We default to the newer "Multilingual" voices (Andrew, Ava, Emma,
 *    Brian) which sound dramatically more human than the older
 *    Aria/Guy voices.
 *
 * 2. Kokoro (local) — open-source 82M model via kokoro-js, runs on the
 *    server CPU. Arguably the most human-sounding free TTS available.
 *    Voice IDs are prefixed "kokoro:", e.g. "kokoro:af_heart".
 *    The model (~80MB, q8) downloads from HuggingFace on first use.
 * ──────────────────────────────────────────────────────────────────
 */

const DEFAULT_EDGE_VOICE = "en-US-AndrewMultilingualNeural";

// ─── Kokoro (lazy singleton — only loaded if a kokoro voice is used) ───
let kokoroInstance: any = null;
let kokoroLoadFailed = false;

async function getKokoro(): Promise<any> {
  if (kokoroInstance) return kokoroInstance;
  if (kokoroLoadFailed) throw new Error("Kokoro previously failed to load");
  try {
    const { KokoroTTS } = await import("kokoro-js");
    kokoroInstance = await KokoroTTS.from_pretrained(
      "onnx-community/Kokoro-82M-v1.0-ONNX",
      { dtype: "q8", device: "cpu" }
    );
    console.log("[TTS] Kokoro model loaded");
    return kokoroInstance;
  } catch (err: any) {
    kokoroLoadFailed = true;
    throw new Error(`Failed to load Kokoro: ${err.message || err}`);
  }
}

/**
 * Light text cleanup so scripts read naturally through TTS:
 * - smart quotes → plain quotes (some voices spell them out)
 * - em dashes → comma-pause (Edge reads "—" inconsistently)
 * - collapse 4+ dots to "..." (a real thinking pause)
 * - strip markdown leftovers (*, #, backticks)
 */
export function prepareTextForTTS(text: string): string {
  return text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s*--\s*/g, ", ")
    .replace(/\.{4,}/g, "...")
    .replace(/[*_`#]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Tiny deterministic per-text variation so consecutive steps don't sound
 * like identical robot takes: rate ±3%, pitch ±3Hz. A human narrator never
 * delivers two takes at exactly the same speed and pitch.
 */
function humanVariation(text: string): { ratePct: number; pitchHz: number } {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  const r = Math.abs(hash);
  return {
    ratePct: (r % 7) - 3, // -3 .. +3 (%)
    pitchHz: (Math.floor(r / 7) % 7) - 3, // -3 .. +3 (Hz)
  };
}

/**
 * Generate TTS audio. Routes to Kokoro for "kokoro:*" voice IDs,
 * otherwise uses Edge TTS. Falls back to Edge if Kokoro fails.
 *
 * Returns the path to the generated audio file in a temp directory.
 */
export async function generateTTSAudio(
  text: string,
  opts?: {
    voice?: string;
    rate?: string; // e.g. "+10%", "-20%", "+0%"
    outputDir?: string;
  }
): Promise<{ filePath: string; duration: number }> {
  const voice = opts?.voice || DEFAULT_EDGE_VOICE;
  const outDir = opts?.outputDir || path.join(os.tmpdir(), "aivideo-tts");
  await fs.mkdir(outDir, { recursive: true });

  const cleanText = prepareTextForTTS(text);

  if (voice.startsWith("kokoro:")) {
    try {
      return await generateKokoroAudio(cleanText, voice.slice("kokoro:".length), opts?.rate, outDir);
    } catch (err: any) {
      console.warn("[TTS] Kokoro failed, falling back to Edge TTS:", err.message);
      return generateEdgeAudio(cleanText, DEFAULT_EDGE_VOICE, opts?.rate, outDir);
    }
  }

  return generateEdgeAudio(cleanText, voice, opts?.rate, outDir);
}

/**
 * Edge TTS generation with humanized rate/pitch variation.
 */
async function generateEdgeAudio(
  text: string,
  voice: string,
  rate: string | undefined,
  outDir: string
): Promise<{ filePath: string; duration: number }> {
  const outputPath = path.join(outDir, `tts_${nanoid(12)}.mp3`);

  // Combine the user's chosen speed with a small per-step human variation
  const baseRatePct = rate ? parseInt(rate.replace(/[+%]/g, ""), 10) || 0 : 0;
  const variation = humanVariation(text);
  const finalRatePct = Math.max(-40, Math.min(60, baseRatePct + variation.ratePct));
  const rateStr = finalRatePct >= 0 ? `+${finalRatePct}%` : `${finalRatePct}%`;
  const pitchStr = variation.pitchHz >= 0 ? `+${variation.pitchHz}Hz` : `${variation.pitchHz}Hz`;

  try {
    const tts = new EdgeTTS({
      voice,
      rate: rateStr,
      pitch: pitchStr,
    });
    await tts.ttsPromise(text, outputPath);
  } catch (err: any) {
    // Retry once without pitch (older node-edge-tts versions may reject it)
    try {
      const tts = new EdgeTTS({ voice, rate: rateStr });
      await tts.ttsPromise(text, outputPath);
    } catch (err2: any) {
      throw new Error(`TTS generation failed: ${err2.message || err2}`);
    }
  }

  const stat = await fs.stat(outputPath);
  if (stat.size === 0) throw new Error("TTS generated an empty audio file");

  const duration = await probeAudioDuration(outputPath);
  return { filePath: outputPath, duration };
}

/**
 * Kokoro local TTS generation (most human-sounding free option).
 */
async function generateKokoroAudio(
  text: string,
  kokoroVoice: string,
  rate: string | undefined,
  outDir: string
): Promise<{ filePath: string; duration: number }> {
  const tts = await getKokoro();
  const outputPath = path.join(outDir, `tts_${nanoid(12)}.wav`);

  // Map "+10%" style rate to Kokoro's speed multiplier
  const ratePct = rate ? parseInt(rate.replace(/[+%]/g, ""), 10) || 0 : 0;
  const speed = Math.max(0.7, Math.min(1.4, 1 + ratePct / 100));

  const audio = await tts.generate(text, {
    voice: kokoroVoice as any,
    speed,
  });
  await audio.save(outputPath);

  const stat = await fs.stat(outputPath);
  if (stat.size === 0) throw new Error("Kokoro generated an empty audio file");

  const duration = await probeAudioDuration(outputPath);
  return { filePath: outputPath, duration };
}

import ffprobeStatic from "ffprobe-static";

/**
 * Get the duration of an audio file in seconds using ffprobe.
 */
export async function probeAudioDuration(filePath: string): Promise<number> {
  try {
    if (!ffprobeStatic.path) throw new Error("ffprobe-static path is undefined");
    const { stdout } = await execFileAsync(ffprobeStatic.path, [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "csv=p=0",
      filePath,
    ], {
      timeout: 10000,
      });

    const duration = parseFloat(stdout.trim());
    if (isNaN(duration)) {
      throw new Error(`ffprobe returned non-numeric duration: ${stdout}`);
    }
    return duration;
  } catch (err: any) {
    // Fallback: estimate duration from file size based on file type
    try {
      const stat = await fs.stat(filePath);
      const isWav = filePath.toLowerCase().endsWith(".wav");
      // WAV: 44100 Hz stereo 16-bit = ~176400 bytes/sec
      // MP3: ~128kbps = ~16000 bytes/sec
      const bytesPerSec = isWav ? 176400 : 16000;
      const estimatedDuration = stat.size / bytesPerSec;
      console.warn(`ffprobe not available, estimating duration: ${estimatedDuration.toFixed(2)}s (${isWav ? "WAV" : "MP3"})`);
      return Math.max(estimatedDuration, 1);
    } catch {
      return 3; // default fallback
    }
  }
}

/**
 * Convert a speed multiplier (0.8 - 1.3) to edge-tts rate string.
 */
export function speedToRate(speed: number): string {
  const pct = Math.round((speed - 1) * 100);
  return pct >= 0 ? `+${pct}%` : `${pct}%`;
}

/**
 * List available voices (Edge neural + Kokoro local).
 * The "Multilingual" Edge voices are the most natural-sounding.
 */
export async function listVoices(): Promise<string[]> {
  return [
    // Edge TTS — newer, most humanlike
    "en-US-AndrewMultilingualNeural",
    "en-US-AvaMultilingualNeural",
    "en-US-BrianMultilingualNeural",
    "en-US-EmmaMultilingualNeural",
    // Edge TTS — classic
    "en-US-AriaNeural",
    "en-US-GuyNeural",
    "en-GB-SoniaNeural",
    "en-GB-RyanNeural",
    "en-AU-NatashaNeural",
    // Kokoro — local, ultra-realistic
    "kokoro:af_heart",
    "kokoro:af_bella",
    "kokoro:am_michael",
    "kokoro:bf_emma",
  ];
}
