import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { nanoid } from "nanoid";

const execFileAsync = promisify(execFile);

import { EdgeTTS } from "node-edge-tts";

/**
 * Generate TTS audio using node-edge-tts.
 *
 * Returns the path to the generated .mp3 file in a temp directory.
 */
export async function generateTTSAudio(
  text: string,
  opts?: {
    voice?: string;
    rate?: string; // e.g. "+10%", "-20%", "+0%"
    outputDir?: string;
  }
): Promise<{ filePath: string; duration: number }> {
  const voice = opts?.voice || "en-US-AriaNeural";
  const rate = opts?.rate || "+0%";
  const outDir = opts?.outputDir || path.join(os.tmpdir(), "aivideo-tts");

  await fs.mkdir(outDir, { recursive: true });

  const filename = `tts_${nanoid(12)}.mp3`;
  const outputPath = path.join(outDir, filename);

  try {
    const tts = new EdgeTTS({
      voice: voice,
      rate: rate,
    });
    
    await tts.ttsPromise(text, outputPath);
  } catch (err: any) {
    throw new Error(`TTS generation failed: ${err.message || err}`);
  }

  // Verify the file was created
  const stat = await fs.stat(outputPath);
  if (stat.size === 0) {
    throw new Error("TTS generated an empty audio file");
  }

  // Probe audio duration
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
      shell: true,
    });

    const duration = parseFloat(stdout.trim());
    if (isNaN(duration)) {
      throw new Error(`ffprobe returned non-numeric duration: ${stdout}`);
    }
    return duration;
  } catch (err: any) {
    // Fallback: estimate duration from file size
    // Average MP3 bitrate ~128kbps = ~16KB/sec
    try {
      const stat = await fs.stat(filePath);
      const estimatedDuration = stat.size / 16000;
      console.warn(`ffprobe not available, estimating duration: ${estimatedDuration}s`);
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
 * List available edge-tts voices.
 */
export async function listVoices(): Promise<string[]> {
  // Return default voices since node-edge-tts doesn't have a listVoices method
  return [
    "en-US-AriaNeural",
    "en-GB-SoniaNeural",
    "en-US-GuyNeural",
    "en-GB-RyanNeural",
    "en-US-JennyNeural",
    "en-AU-NatashaNeural",
  ];
}
