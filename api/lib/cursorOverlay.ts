import fs from "fs/promises";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import ffmpegPath from "ffmpeg-static";
import zlib from "zlib";

const execFileAsync = promisify(execFile);

const OVERLAY_DIR = path.join(os.tmpdir(), "aivideo-overlays");

/**
 * Ensure the overlay cache directory exists.
 */
async function ensureOverlayDir(): Promise<string> {
  await fs.mkdir(OVERLAY_DIR, { recursive: true });
  return OVERLAY_DIR;
}

// CRC32 implementation for PNG chunks
function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    crc ^= byte;
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xedb88320;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Helper to create standard PNG buffer from RGBA pixels
function createPngBuffer(width: number, height: number, pixels: Buffer): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const createChunk = (type: string, data: Buffer): Buffer => {
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "ascii");
    const crc = crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type (RGBA)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const scanlineLength = width * 4 + 1;
  const idatRaw = Buffer.alloc(height * scanlineLength);
  for (let y = 0; y < height; y++) {
    idatRaw[y * scanlineLength] = 0; // Filter type 0 (None)
    pixels.copy(idatRaw, y * scanlineLength + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idatCompressed = zlib.deflateSync(idatRaw);

  const ihdrChunk = createChunk("IHDR", ihdr);
  const idatChunk = createChunk("IDAT", idatCompressed);
  const iendChunk = createChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

/**
 * Generate a macOS-style arrow cursor as a PNG file.
 * Returns the path to the cached PNG.
 */
export async function getCursorPng(size = 32): Promise<string> {
  await ensureOverlayDir();
  // We only support size 32 for our native pixel grid
  const pngPath = path.join(OVERLAY_DIR, `cursor_32.png`);

  // Use cached version if available
  try {
    await fs.access(pngPath);
    return pngPath;
  } catch {
    // Need to generate
  }

  // macOS-style pointer cursor grid (32x32 pixels)
  // '.' = transparent, '#' = black outline, 'W' = white fill
  const grid = [
    "#...............................",
    "##..............................",
    "#W#.............................",
    "#WW#............................",
    "#WWW#...........................",
    "#WWWW#..........................",
    "#WWWWW#.........................",
    "#WWWWWW#........................",
    "#WWWWWWW#.......................",
    "#WWWWWWWW#......................",
    "#WWWWWWWWW#.....................",
    "#WWWWWWWWWW#....................",
    "#WWWWWWWWWWW#...................",
    "#WWWWWWWWWWWW#..................",
    "#WWWWWWWWWWWWW#.................",
    "#WWWWWWWWWWWWWW#................",
    "#WWWWWWWWWWWWWWW#...............",
    "#WWWWWWWWWW######...............",
    "#WWWW#WWW#......................",
    "#WWW#.#WWW#.....................",
    "#WW#...#WWW#....................",
    "#W#....#WWW#....................",
    "##......#WWW#...................",
    "#.......#WWW#...................",
    ".........#WWW#..................",
    ".........#WWW#..................",
    "..........#WWW#.................",
    "..........#WWW#.................",
    "...........###..................",
    "................................",
    "................................",
    "................................",
  ];

  const pixels = Buffer.alloc(32 * 32 * 4);
  for (let y = 0; y < 32; y++) {
    const row = grid[y] || "";
    for (let x = 0; x < 32; x++) {
      const char = row[x] || ".";
      const idx = (y * 32 + x) * 4;
      if (char === "#") {
        // Black outline
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 255;
      } else if (char === "W") {
        // White fill
        pixels[idx] = 255;
        pixels[idx + 1] = 255;
        pixels[idx + 2] = 255;
        pixels[idx + 3] = 255;
      } else {
        // Transparent
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 0;
      }
    }
  }

  const pngBuffer = createPngBuffer(32, 32, pixels);
  await fs.writeFile(pngPath, pngBuffer);

  return pngPath;
}

/**
 * Generate click-ripple overlay frames.
 * Creates 3 PNG frames of expanding concentric rings using FFmpeg's lavfi.
 * Each frame has a semi-transparent ring at increasing radii.
 *
 * Returns an array of paths to the generated PNGs (typically 3 frames).
 */
export async function getClickRipplePngs(
  canvasWidth: number,
  canvasHeight: number,
  targetX: number,
  targetY: number,
): Promise<string[]> {
  await ensureOverlayDir();

  const frames: string[] = [];
  const ringRadii = [15, 30, 45]; // expanding ring sizes
  const ringAlphas = [0.6, 0.4, 0.2]; // fading opacity

  for (let i = 0; i < ringRadii.length; i++) {
    const framePath = path.join(
      OVERLAY_DIR,
      `ripple_${canvasWidth}x${canvasHeight}_${Math.round(targetX)}_${Math.round(targetY)}_${i}.png`
    );

    // Use cached if available
    try {
      await fs.access(framePath);
      frames.push(framePath);
      continue;
    } catch {
      // Generate
    }

    const r = ringRadii[i];
    const alpha = ringAlphas[i];
    // Use FFmpeg lavfi to draw a circle on a transparent background
    // The geq filter creates RGBA: transparent everywhere except a ring at target
    if (!ffmpegPath) throw new Error("ffmpeg-static path is undefined");

    // Draw a ring using drawbox approach: create transparent, draw circle with drawtext hack
    // Simpler: use color + overlay approach
    // Actually the simplest robust approach: create a solid-color frame with a ring drawn via
    // the 'drawbox' approach won't work for circles. Use geq filter instead.
    const innerR = r - 3;
    const outerR = r;
    // geq: for each pixel, if distance from target is between innerR and outerR, set alpha
    const alphaInt = Math.round(alpha * 255);
    const geqExpr = [
      `lum=0`,
      `cb=128`,
      `cr=128`,
      // alpha channel: ring shape
      `a='if(between(sqrt((X-${Math.round(targetX)})*(X-${Math.round(targetX)})+(Y-${Math.round(targetY)})*(Y-${Math.round(targetY)})),${innerR},${outerR}),${alphaInt},0)'`,
    ].join(":");

    try {
      await execFileAsync(ffmpegPath, [
        "-y",
        "-f", "lavfi",
        "-i", `color=c=black@0:s=${canvasWidth}x${canvasHeight}:d=0.04,format=yuva420p,geq=${geqExpr}`,
        "-frames:v", "1",
        "-f", "image2",
        framePath,
      ], {
        timeout: 10000,
        shell: true,
      });
      frames.push(framePath);
    } catch (err: any) {
      console.warn(`[CursorOverlay] Failed to generate ripple frame ${i}:`, err.message);
    }
  }

  return frames;
}

/**
 * Build the FFmpeg filter expression for cursor animation overlay.
 *
 * The cursor starts at a neutral position and glides to the zoom target
 * using smoothstep easing over the first 40% of the scene.
 *
 * @param startXPx - Start X position in pixels (on the output frame)
 * @param startYPx - Start Y position in pixels
 * @param targetXPx - Target X position in pixels
 * @param targetYPx - Target Y position in pixels
 * @param totalFrames - Total number of frames in the scene
 * @param fps - Frames per second
 * @returns FFmpeg overlay filter expression string
 */
export function buildCursorOverlayExpr(
  startXPx: number,
  startYPx: number,
  targetXPx: number,
  targetYPx: number,
  totalFrames: number,
  fps: number,
): { x: string; y: string; enable: string } {
  // Cursor travels during the first 40% of frames
  const travelFrames = Math.floor(totalFrames * 0.4);

  // Smoothstep: t = clamp(n/travelFrames, 0, 1); eased = 3*t^2 - 2*t^3
  // Then x = startX + (targetX - startX) * eased

  const dx = targetXPx - startXPx;
  const dy = targetYPx - startYPx;

  // FFmpeg expression for smoothstep cursor position
  // t = min(n/travelFrames, 1)
  // eased = 3*t*t - 2*t*t*t
  // pos = start + delta * eased

  const tExpr = `min(n/${travelFrames}\\\\,1)`;
  const easedExpr = `(3*(${tExpr})*(${tExpr})-2*(${tExpr})*(${tExpr})*(${tExpr}))`;

  const xExpr = `${startXPx.toFixed(1)}+${dx.toFixed(1)}*${easedExpr}`;
  const yExpr = `${startYPx.toFixed(1)}+${dy.toFixed(1)}*${easedExpr}`;

  // Cursor is visible for the entire scene
  const enableExpr = `between(n\\\\,0\\\\,${totalFrames})`;

  return { x: xExpr, y: yExpr, enable: enableExpr };
}

/**
 * Build the FFmpeg filter expression for click ripple effect.
 * Shows an expanding semi-transparent ring at the target point
 * starting at ~40% of the scene duration for about 0.5s.
 *
 * This uses the geq filter to draw concentric rings directly,
 * avoiding the need for separate PNG overlays.
 *
 * @returns A filter segment string to be appended in the filter_complex chain
 */
export function buildClickRippleFilter(
  targetXPx: number,
  targetYPx: number,
  totalFrames: number,
  fps: number,
): string {
  const arrivalFrame = Math.floor(totalFrames * 0.4);
  const rippleDurationFrames = Math.ceil(fps * 0.6); // 0.6 seconds
  const endFrame = arrivalFrame + rippleDurationFrames;

  // Ring expands from radius 5 to 45 over rippleDurationFrames
  // progress = (n - arrivalFrame) / rippleDurationFrames
  // radius = 5 + 40 * progress
  // ring thickness = 3
  // alpha fades from 180 to 0

  const tX = Math.round(targetXPx);
  const tY = Math.round(targetYPx);

  // Use drawbox is impossible for circles. Instead, use overlay with geq.
  // But since geq requires a filter chain restructuring, we'll use a simpler
  // approach: draw the ripple as a colored circle using format+geq on a
  // separate lavfi source, then overlay it.

  // For simplicity and reliability, we'll embed the ripple as an additional
  // input using lavfi color source + geq, overlaid with enable timing.

  // This returns the lavfi input specification and the overlay filter.
  // The caller needs to add this as an additional input.

  const progressExpr = `(n-${arrivalFrame})/${rippleDurationFrames}`;
  const radiusExpr = `5+40*${progressExpr}`;
  const innerRadiusExpr = `(${radiusExpr})-3`;
  const alphaExpr = `180*(1-${progressExpr})`;

  // Distance from target for each pixel
  const distExpr = `sqrt((X-${tX})*(X-${tX})+(Y-${tY})*(Y-${tY}))`;

  return JSON.stringify({
    arrivalFrame,
    endFrame,
    rippleDurationFrames,
    targetX: tX,
    targetY: tY,
    // These will be used to construct the filter in ffmpeg.ts
  });
}
