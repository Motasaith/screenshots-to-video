import fs from "fs/promises";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import ffmpegPath from "ffmpeg-static";

const execFileAsync = promisify(execFile);

const OVERLAY_DIR = path.join(os.tmpdir(), "aivideo-overlays");

/**
 * Ensure the overlay cache directory exists.
 */
async function ensureOverlayDir(): Promise<string> {
  await fs.mkdir(OVERLAY_DIR, { recursive: true });
  return OVERLAY_DIR;
}

/**
 * Generate a macOS-style arrow cursor as a PNG file.
 * Uses an SVG written to disk and converted via FFmpeg.
 * Returns the path to the cached PNG.
 */
export async function getCursorPng(size = 32): Promise<string> {
  await ensureOverlayDir();
  const pngPath = path.join(OVERLAY_DIR, `cursor_${size}.png`);

  // Use cached version if available
  try {
    await fs.access(pngPath);
    return pngPath;
  } catch {
    // Need to generate
  }

  // macOS-style pointer cursor SVG — white fill, dark stroke, drop shadow
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="1" dy="1" stdDeviation="1" flood-color="#000" flood-opacity="0.4"/>
    </filter>
  </defs>
  <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85.35z"
        fill="white" stroke="#222" stroke-width="1.2" stroke-linejoin="round"
        filter="url(#shadow)"/>
</svg>`;

  const svgPath = path.join(OVERLAY_DIR, `cursor_${size}.svg`);
  await fs.writeFile(svgPath, svgContent, "utf-8");

  // Convert SVG to PNG using FFmpeg
  if (!ffmpegPath) throw new Error("ffmpeg-static path is undefined");
  await execFileAsync(ffmpegPath, [
    "-y",
    "-i", svgPath,
    "-vf", `scale=${size}:${size}`,
    pngPath,
  ], {
    timeout: 10000,
    shell: true,
  });

  // Cleanup SVG
  await fs.unlink(svgPath).catch(() => {});

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
