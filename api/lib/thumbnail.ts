/**
 * On-demand screenshot thumbnails.
 *
 * The editor's timeline strip and scene lists render screenshots at ~64-96px,
 * but were pointing straight at the full-resolution upload — a 2560px-wide
 * image decoded into a thumbnail slot, once per scene. Opening a ten-scene
 * project pulled several megabytes to draw a row of postage stamps.
 *
 * Thumbnails are derived rather than stored: no schema column, no migration,
 * and every project that already exists is covered the moment this ships.
 * FFmpeg is already a dependency, so it does the resizing.
 */

import { execFile } from "child_process";
import { promisify } from "util";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import os from "os";
import ffmpegPath from "ffmpeg-static";
import { downloadFromR2 } from "./r2";
import { localFilePath } from "./localStore";
import { createLogger } from "./logger";

const log = createLogger({ path: "thumbnail" });
const execFileAsync = promisify(execFile);

const CACHE_DIR = path.join(os.tmpdir(), "aivideo-thumbs");

/**
 * Widths the endpoint will produce.
 *
 * Restricted deliberately: an open width parameter lets a caller fill the disk
 * with near-identical renders of the same image.
 */
export const ALLOWED_THUMB_WIDTHS = [96, 192, 384] as const;
export type ThumbWidth = (typeof ALLOWED_THUMB_WIDTHS)[number];

export function isAllowedThumbWidth(w: number): w is ThumbWidth {
  return (ALLOWED_THUMB_WIDTHS as readonly number[]).includes(w);
}

/** In-flight generations, so concurrent requests share one FFmpeg run. */
const inFlight = new Map<string, Promise<Buffer>>();

/**
 * Stable identity for a thumbnail.
 *
 * Derived from the stored path, not the step id: replacing a step's screenshot
 * changes the hash and therefore the ETag, so clients revalidate onto the new
 * image instead of holding a stale one. Two steps sharing an upload share the
 * cache entry.
 */
export function thumbnailETag(screenshotPath: string, width: number): string {
  const h = crypto.createHash("sha1").update(`${screenshotPath}|${width}`).digest("hex");
  return h.slice(0, 20);
}

/**
 * Return a WebP thumbnail for the given stored screenshot, generating and
 * caching it on first request.
 */
export async function getThumbnail(screenshotPath: string, width: ThumbWidth): Promise<Buffer> {
  const tag = thumbnailETag(screenshotPath, width);
  const cachePath = path.join(CACHE_DIR, `${tag}.webp`);

  try {
    return await fs.readFile(cachePath);
  } catch {
    // not cached yet
  }

  const existing = inFlight.get(tag);
  if (existing) return existing;

  const job = generate(screenshotPath, width, cachePath).finally(() => inFlight.delete(tag));
  inFlight.set(tag, job);
  return job;
}

async function generate(screenshotPath: string, width: number, cachePath: string): Promise<Buffer> {
  if (!ffmpegPath) throw new Error("ffmpeg-static path is undefined");
  await fs.mkdir(CACHE_DIR, { recursive: true });

  // Frontend markers like "#video" are not part of the storage key.
  const storageKey = screenshotPath.split("#")[0];
  const isVideo = screenshotPath.includes("#video");

  // Locally stored originals are read in place; only remote ones need staging.
  const inPlace = await localFilePath(storageKey);
  let srcPath = inPlace;
  if (!srcPath) {
    const source = await downloadFromR2(storageKey);
    srcPath = path.join(CACHE_DIR, `src_${crypto.randomBytes(8).toString("hex")}`);
    await fs.writeFile(srcPath, source);
  }

  try {
    await execFileAsync(ffmpegPath, [
      "-y",
      // For a video source, one frame in avoids a black or half-faded opener.
      ...(isVideo ? ["-ss", "0.5"] : []),
      "-i", srcPath,
      "-frames:v", "1",
      // -2 keeps the height even, which some encoders require.
      "-vf", `scale=${width}:-2:flags=lanczos`,
      "-c:v", "libwebp",
      "-quality", "80",
      cachePath,
    ], { timeout: 30000 });

    return await fs.readFile(cachePath);
  } catch (err: any) {
    log.warn("Thumbnail generation failed", {
      error: err?.message ?? String(err),
      key: storageKey.slice(0, 80),
    });
    throw err;
  } finally {
    // Never unlink the stored original — only a staged copy.
    if (!inPlace) await fs.unlink(srcPath).catch(() => {});
  }
}
