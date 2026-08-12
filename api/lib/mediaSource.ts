/**
 * Load a stored media key into a data URI for a vision model.
 *
 * Screenshot paths come in three forms depending on when and how they were
 * uploaded: a `local:` key for local storage, a bare object-storage key for
 * projects that predate it, and occasionally an absolute URL. Anything that
 * wants to show a screenshot to a model has to handle all three, and that logic
 * was previously inlined in the copyright checker where nothing else could use
 * it.
 */

import { downloadFromR2 } from "./r2";
import { localContentType, readLocalFile } from "./localStore";
import { parseMediaRef } from "./mediaRef";
import { createLogger } from "./logger";

const log = createLogger({ path: "mediaSource" });

/** Roughly 6 MB of image. Past this the upstream call starts timing out. */
const MAX_BYTES = 6 * 1024 * 1024;

export interface LoadedMedia {
  dataUri: string;
  mime: string;
  bytes: number;
}

/** True for keys the editor marks as video rather than a still. */
export function isVideoKey(key: string): boolean {
  return key.includes("#video") || /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(key);
}

/**
 * Returns null rather than throwing when the media cannot be loaded.
 *
 * A caller showing a screenshot to a model should degrade to a text-only prompt
 * if the file is missing, not fail the whole request: the user asked a question,
 * and "I could not open your screenshot" is a better answer than an error.
 */
export async function loadMediaAsDataUri(
  rawKey: string | null | undefined
): Promise<LoadedMedia | null> {
  if (!rawKey || rawKey.startsWith("blob:")) return null;

  // Strip the frontend's markers and cache-busting query strings.
  const key = rawKey.split("#")[0].split("?")[0];
  if (!key) return null;

  try {
    let buffer: Buffer;
    let mime = "image/png";

    // Anything that is not one of our own storage keys is refused. This used to
    // fetch any http(s) URL, which a client could set as a step's screenshot
    // path, making the server issue requests into its own network.
    const ref = parseMediaRef(key);
    if (!ref) {
      log.warn("Refusing a media reference that is not a storage key");
      return null;
    }

    if (ref.kind === "local") {
      buffer = await readLocalFile(ref.key);
      mime = localContentType(ref.key);
    } else {
      buffer = await downloadFromR2(ref.key);
      if (/\.webp$/i.test(key)) mime = "image/webp";
      else if (/\.jpe?g$/i.test(key)) mime = "image/jpeg";
      else if (/\.gif$/i.test(key)) mime = "image/gif";
    }

    if (buffer.length === 0) return null;
    if (buffer.length > MAX_BYTES) {
      log.warn("Media too large to send to a model", { bytes: buffer.length });
      return null;
    }

    return {
      dataUri: `data:${mime};base64,${buffer.toString("base64")}`,
      mime,
      bytes: buffer.length,
    };
  } catch (err) {
    log.warn("Could not load media", { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}
