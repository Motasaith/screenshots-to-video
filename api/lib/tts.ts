import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { nanoid } from "nanoid";

const execFileAsync = promisify(execFile);

/**
 * Generate TTS audio using edge-tts (Python) subprocess.
 * Requires: pip install edge-tts
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
    // Use edge-tts Python command
    await execFileAsync("edge-tts", [
      "--voice", voice,
      "--rate", rate,
      "--text", text,
      "--write-media", outputPath,
    ], {
      timeout: 30000,
      shell: true,
    });
  } catch (err: any) {
    // If edge-tts isn't available, try python -m edge_tts
    try {
      await execFileAsync("python", [
        "-m", "edge_tts",
        "--voice", voice,
        "--rate", rate,
        "--text", text,
        "--write-media", outputPath,
      ], {
        timeout: 30000,
        shell: true,
      });
    } catch (innerErr: any) {
      throw new Error(
        `edge-tts is not available. Install it with: pip install edge-tts\n` +
        `Original error: ${innerErr.message}`
      );
    }
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

/**
 * Get the duration of an audio file in seconds using ffprobe.
 */
export async function probeAudioDuration(filePath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
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
  try {
    const { stdout } = await execFileAsync("edge-tts", ["--list-voices"], {
      timeout: 10000,
      shell: true,
    });
    return stdout.split("\n").filter((line) => line.includes("Name:")).map((line) =>
      line.replace("Name: ", "").trim()
    );
  } catch {
    // Return default voices if edge-tts isn't available
    return [
      "en-US-AriaNeural",
      "en-GB-SoniaNeural",
      "en-US-GuyNeural",
      "en-GB-RyanNeural",
      "en-US-JennyNeural",
      "en-AU-NatashaNeural",
    ];
  }
}
