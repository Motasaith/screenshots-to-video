import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { createLogger } from "./logger";

const log = createLogger({ path: "tts" });
import { nanoid } from "nanoid";

const execFileAsync = promisify(execFile);

import { EdgeTTS } from "node-edge-tts";
import { env } from "./env";
import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";

const MIN_GENERATED_AUDIO_BYTES = 256;
const AUDIO_FILE_READY_TIMEOUT_MS = 2_000;
const AUDIO_FILE_READY_POLL_MS = 100;

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

/**
 * `engine` names what actually spoke, which is not always what was asked for:
 * Kokoro can fail to load and a premium voice needs a key. Callers can then
 * tell the user their preview is a stand-in instead of leaving them wondering
 * why the voice sounds nothing like the one they picked.
 */
export interface TtsResult {
  filePath: string;
  duration: number;
  engine?: "edge" | "kokoro" | "elevenlabs" | "silence";
  /** Set when `engine` is not the engine the requested voice belongs to. */
  fellBackFrom?: string;
}

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
    log.info("Kokoro model loaded");
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
 * ElevenLabs TTS generation (premium-quality voices via API).
 * Voice IDs are prefixed "elevenlabs:", e.g. "elevenlabs:pNInz6obpgDQGcFmaJgB".
 *
 * Premium voices are BRING-YOUR-OWN-KEY: the caller must pass the user's own
 * ElevenLabs API key. Throws if no key is supplied (the caller falls back to
 * free Edge TTS).
 */
async function generateElevenLabsAudio(
  text: string,
  voiceId: string,
  rate: string | undefined,
  outDir: string,
  apiKey: string
): Promise<{ filePath: string; duration: number }> {
  if (!apiKey) {
    throw new Error("No ElevenLabs API key provided (premium voices require your own key)");
  }

  // Map "+10%" style rate to ElevenLabs speed multiplier (0.7 - 1.2)
  const ratePct = rate ? parseInt(rate.replace(/[^-\d]/g, ""), 10) || 0 : 0;
  const speed = Math.max(0.7, Math.min(1.2, 1 + ratePct / 100));

  const outputPath = path.join(outDir, `tts_${nanoid(12)}.mp3`);

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      "Accept": "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2_5",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        speed,
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(`ElevenLabs API error ${response.status}: ${errBody.slice(0, 200)}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(outputPath, Buffer.from(arrayBuffer));

  const { duration } = await validateAudioFile(outputPath);
  return { filePath: outputPath, duration };
}

export interface ElevenLabsCredits {
  used: number;
  limit: number;
  remaining: number;
  tier: string;
}

/**
 * Get remaining ElevenLabs character credits for a given API key.
 * Falls back to the server-configured key when none is passed (legacy/admin).
 * Returns null if no key is available or the key is invalid.
 */
export async function getElevenLabsCredits(
  apiKey?: string,
): Promise<ElevenLabsCredits | null> {
  const key = apiKey || env.elevenlabsApiKey;
  if (!key) return null;

  try {
    const response = await fetch("https://api.elevenlabs.io/v1/user", {
      headers: { "xi-api-key": key },
    });
    if (!response.ok) return null;

    const data: any = await response.json();
    const used = data.subscription?.character_count ?? 0;
    const limit = data.subscription?.character_limit ?? 0;
    return {
      used,
      limit,
      remaining: Math.max(0, limit - used),
      tier: data.subscription?.tier ?? "unknown",
    };
  } catch {
    return null;
  }
}

/**
 * Validate an ElevenLabs API key by calling the account endpoint. Returns the
 * account's credits/tier on success, or null if the key is rejected/unreachable.
 * Used when a user saves their own key so we never store an invalid one.
 */
export async function validateElevenLabsKey(
  apiKey: string,
): Promise<ElevenLabsCredits | null> {
  if (!apiKey || apiKey.trim().length < 8) return null;
  return getElevenLabsCredits(apiKey.trim());
}

/**
 * Generate TTS audio. Routes to:
 *  - "elevenlabs:<voiceId>" → ElevenLabs API (falls back to Edge on failure)
 *  - "kokoro:<voice>"       → Kokoro local model (falls back to Edge on failure)
 *  - everything else         → Edge TTS (Microsoft neural voices)
 *
 * Returns the path to the generated audio file in a temp directory.
 */
async function generateSilenceAudio(
  duration: number,
  outDir: string
): Promise<{ filePath: string; duration: number }> {
  const safeDuration = Number.isFinite(duration)
    ? Math.max(0.5, Math.min(duration, 60 * 60))
    : 3;
  const outputPath = path.join(outDir, `silence_${nanoid(12)}.mp3`);
  const args = [
    "-f", "lavfi",
    "-i", "anullsrc=r=44100:cl=mono",
    "-t", safeDuration.toString(),
    "-acodec", "libmp3lame",
    "-b:a", "64k",
    "-ar", "44100",
    "-ac", "1",
    "-y",
    outputPath
  ];

  if (!ffmpegPath) {
    throw new Error("ffmpeg-static path is undefined");
  }

  await execFileAsync(ffmpegPath, args, { timeout: 30_000 });
  const validated = await validateAudioFile(outputPath);
  return { filePath: outputPath, duration: validated.duration };
}

/**
 * Generate TTS audio. Routes to:
 *  - "elevenlabs:<voiceId>" → ElevenLabs API (falls back to Edge on failure)
 *  - "kokoro:<voice>"       → Kokoro local model (falls back to Edge on failure)
 *  - everything else         → Edge TTS (Microsoft neural voices)
 *
 * Returns the path to the generated audio file in a temp directory.
 */
export async function generateTTSAudio(
  text: string,
  opts?: {
    voice?: string;
    rate?: string; // e.g. "+10%", "-20%", "+0%"
    outputDir?: string;
    silenceDuration?: number;
    /**
     * The user's own ElevenLabs API key. Premium ("elevenlabs:") voices are
     * bring-your-own-key: without it, we transparently fall back to free Edge
     * TTS rather than billing a shared server key.
     */
    elevenlabsApiKey?: string;
  }
): Promise<TtsResult> {
  const voice = opts?.voice?.trim() || DEFAULT_EDGE_VOICE;
  const outDir = opts?.outputDir || path.join(os.tmpdir(), "aivideo-tts");
  await fs.mkdir(outDir, { recursive: true });

  const cleanText = prepareTextForTTS(text);

  if (voice.toLowerCase() === "none" || !cleanText) {
    return { ...(await generateSilenceAudio(opts?.silenceDuration ?? 3.0, outDir)), engine: "silence" };
  }

  if (voice.startsWith("elevenlabs:")) {
    // BYOK: premium voices require the user's own key. No key → free Edge TTS.
    if (!opts?.elevenlabsApiKey) {
      log.warn("Premium voice requested without a user ElevenLabs key; using Edge TTS", { voice });
      return { ...(await generateEdgeAudio(cleanText, fallbackVoiceFor(voice), opts?.rate, outDir)), engine: "edge", fellBackFrom: voice };
    }
    try {
      return { ...(await generateElevenLabsAudio(cleanText, voice.slice("elevenlabs:".length), opts?.rate, outDir, opts.elevenlabsApiKey)), engine: "elevenlabs" };
    } catch (err: any) {
      log.warn("ElevenLabs failed, falling back to Edge TTS", { error: err.message, voice });
      return { ...(await generateEdgeAudio(cleanText, fallbackVoiceFor(voice), opts?.rate, outDir)), engine: "edge", fellBackFrom: voice };
    }
  }

  if (voice.startsWith("kokoro:")) {
    try {
      return { ...(await generateKokoroAudio(cleanText, voice.slice("kokoro:".length), opts?.rate, outDir)), engine: "kokoro" };
    } catch (err: any) {
      log.warn("Kokoro failed, falling back to Edge TTS", { error: err.message, voice });
      return { ...(await generateEdgeAudio(cleanText, fallbackVoiceFor(voice), opts?.rate, outDir)), engine: "edge", fellBackFrom: voice };
    }
  }

  return { ...(await generateEdgeAudio(cleanText, voice, opts?.rate, outDir)), engine: "edge" };
}

/**
 * Per-voice fallback to Edge TTS.
 *
 * Every fallback path used to land on DEFAULT_EDGE_VOICE, a male US voice. So
 * when Kokoro could not load, or a premium voice had no key, all of them played
 * back as the same person: "Heart", "Emma B." and "Bella" are female (and Emma
 * is British) but every one of them came out as Andrew. That is why the voice
 * previews did not match the voices.
 *
 * Mapping each voice to an Edge voice of the same gender and accent means a
 * fallback still sounds like the voice that was chosen, and the four
 * ultra-realistic voices remain distinguishable from one another.
 */
const FALLBACK_EDGE_VOICE: Record<string, string> = {
  // Kokoro (local model)
  "kokoro:af_heart": "en-US-AvaMultilingualNeural",     // US female
  "kokoro:af_bella": "en-US-EmmaMultilingualNeural",    // US female, distinct from Ava
  "kokoro:am_michael": "en-US-BrianMultilingualNeural", // US male
  "kokoro:bf_emma": "en-GB-SoniaNeural",                // UK female
};

/**
 * Best Edge voice to stand in for `voice`. Falls back on gender where the id
 * is not in the table, so a newly added premium voice still lands on something
 * closer than "always Andrew".
 */
function fallbackVoiceFor(voice: string, femaleHint?: boolean): string {
  const mapped = FALLBACK_EDGE_VOICE[voice];
  if (mapped) return mapped;
  // Kokoro ids encode gender in the second character: af_/bf_ female, am_/bm_ male.
  const kokoroFemale = /^kokoro:[ab]f_/.test(voice);
  if (kokoroFemale || femaleHint) return "en-US-AvaMultilingualNeural";
  return DEFAULT_EDGE_VOICE;
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
  let lastError: any = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const outputPath = path.join(outDir, `tts_${nanoid(12)}.mp3`);
    const baseRatePct = rate ? parseInt(rate.replace(/[+%]/g, ""), 10) || 0 : 0;
    const variation = humanVariation(text);
    const finalRatePct = Math.max(-40, Math.min(60, baseRatePct + variation.ratePct));
    const rateStr = finalRatePct >= 0 ? `+${finalRatePct}%` : `${finalRatePct}%`;
    const pitchStr = variation.pitchHz >= 0 ? `+${variation.pitchHz}Hz` : `${variation.pitchHz}Hz`;

    try {
      // A node-edge-tts timeout can leave its file stream alive. Never retry
      // into the same path: two writers can otherwise truncate/corrupt the MP3.
      // The final attempt omits pitch for compatibility with older services.
      const tts = attempt === 3
        ? new EdgeTTS({ voice, rate: rateStr })
        : new EdgeTTS({ voice, rate: rateStr, pitch: pitchStr });
      await tts.ttsPromise(text, outputPath);

      const { duration } = await validateAudioFile(outputPath);
      return { filePath: outputPath, duration };
    } catch (err: any) {
      lastError = err;
      await fs.unlink(outputPath).catch(() => {});
      const message = err instanceof Error ? err.message : String(err);
      log.warn(`Edge TTS attempt ${attempt} failed: ${message}. Retrying...`);
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      }
    }
  }

  const lastMessage = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Edge TTS generation failed after 3 attempts. Last error: ${lastMessage}`);
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
  let lastError: any = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const tts = await getKokoro();
    const outputPath = path.join(outDir, `tts_${nanoid(12)}.wav`);

    // Map "+10%" style rate to Kokoro's speed multiplier
    const ratePct = rate ? parseInt(rate.replace(/[+%]/g, ""), 10) || 0 : 0;
    const speed = Math.max(0.7, Math.min(1.4, 1 + ratePct / 100));

    try {
      const audio = await tts.generate(text, {
        voice: kokoroVoice as any,
        speed,
      });
      await audio.save(outputPath);

      const { duration } = await validateAudioFile(outputPath);
      return { filePath: outputPath, duration };
    } catch (err: any) {
      lastError = err;
      await fs.unlink(outputPath).catch(() => {});
      const message = err instanceof Error ? err.message : String(err);
      log.warn(`Kokoro TTS attempt ${attempt} failed: ${message}. Retrying...`);
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      }
    }
  }

  const lastMessage = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Kokoro TTS generation failed after 3 attempts. Last error: ${lastMessage}`);
}

async function waitForAudioFile(filePath: string): Promise<number> {
  const deadline = Date.now() + AUDIO_FILE_READY_TIMEOUT_MS;
  let lastSize = -1;
  let stableChecks = 0;

  while (Date.now() <= deadline) {
    try {
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) {
        throw new Error("Generated audio path is not a file");
      }
      if (stat.size >= MIN_GENERATED_AUDIO_BYTES) {
        stableChecks = stat.size === lastSize ? stableChecks + 1 : 0;
        lastSize = stat.size;
        if (stableChecks >= 1) return stat.size;
      } else {
        lastSize = stat.size;
      }
    } catch (err: any) {
      if (err?.code !== "ENOENT") throw err;
    }

    await new Promise((resolve) => setTimeout(resolve, AUDIO_FILE_READY_POLL_MS));
  }

  if (lastSize === 0) {
    throw new Error("Generated audio file is empty (0 bytes)");
  }
  if (lastSize > 0) {
    throw new Error(`Generated audio file is incomplete (${lastSize} bytes)`);
  }
  throw new Error("Generated audio file was not created");
}

/**
 * Verify that a generated file is non-empty, stable on disk, contains an
 * audio stream, and has a real positive duration. This is intentionally
 * stricter than probeAudioDuration's best-effort fallback because corrupt
 * TTS must never be passed into the render pipeline.
 */
export async function validateAudioFile(
  filePath: string
): Promise<{ duration: number; size: number }> {
  const size = await waitForAudioFile(filePath);
  if (!ffprobeStatic.path) {
    throw new Error("ffprobe-static path is undefined");
  }

  let stdout: string;
  try {
    ({ stdout } = await execFileAsync(ffprobeStatic.path, [
      "-v", "error",
      "-select_streams", "a:0",
      "-show_entries", "stream=codec_type:format=duration",
      "-of", "json",
      filePath,
    ], {
      timeout: 10_000,
    }));
  } catch (err: any) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Generated audio file is unreadable: ${message}`);
  }

  let metadata: any;
  try {
    metadata = JSON.parse(stdout);
  } catch {
    throw new Error("ffprobe returned invalid metadata for generated audio");
  }

  const hasAudioStream = Array.isArray(metadata?.streams)
    && metadata.streams.some((stream: any) => stream?.codec_type === "audio");
  const duration = Number.parseFloat(metadata?.format?.duration);
  if (!hasAudioStream) {
    throw new Error("Generated audio file contains no audio stream");
  }
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("Generated audio file has no valid duration");
  }

  return { duration, size };
}

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
  } catch {
    // Fallback: estimate duration from file size based on file type
    try {
      const stat = await fs.stat(filePath);
      const isWav = filePath.toLowerCase().endsWith(".wav");
      // WAV: 44100 Hz stereo 16-bit = ~176400 bytes/sec
      // MP3: ~128kbps = ~16000 bytes/sec
      const bytesPerSec = isWav ? 176400 : 16000;
      const estimatedDuration = stat.size / bytesPerSec;
      log.warn(`ffprobe not available, estimating duration: ${estimatedDuration.toFixed(2)}s (${isWav ? "WAV" : "MP3"})`);
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
