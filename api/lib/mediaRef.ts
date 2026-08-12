/**
 * The only sanctioned way to turn a stored media reference into something to read.
 *
 * Screenshot paths arrive from the client as `z.string()` and are written to
 * `steps.screenshotPath` unchanged, so whatever the client sends is later handed
 * to whichever loader needs the bytes. Two loaders trusted that string:
 *
 *   - `api/lib/llm.ts` did `fs.readFile(path.resolve(mediaPath))` on it, which
 *     turned any signed-in account into an arbitrary local file read. A step with
 *     `screenshotPath: "../../.env"` had its contents sent to the model as the
 *     "screenshot", and the generated script could then repeat them back.
 *   - both loaders also did `fetch(mediaPath)` for anything starting `http`,
 *     which is a server-side request forgery into the host's own network.
 *
 * Neither capability was ever needed. Remote media is downloaded at import time
 * by `ai.importMedia`, which is host-allowlisted, so a stored reference is only
 * ever a local storage key or an object storage key. This module enforces exactly
 * that and rejects everything else.
 */

import { isLocalKey } from "./localStore";

export type MediaRef =
  | { kind: "local"; key: string }
  /** An object storage key, resolved by the storage layer, never by the filesystem. */
  | { kind: "object"; key: string };

/** Object keys are produced by this application, so the shape is known. */
const OBJECT_KEY = /^[A-Za-z0-9][A-Za-z0-9/_.-]{0,511}$/;

/**
 * Parse a stored media reference, or return null if it is not one.
 *
 * Returning null rather than throwing keeps the callers' existing behaviour:
 * a missing or unreadable screenshot degrades to a text-only prompt.
 */
export function parseMediaRef(raw: string | null | undefined): MediaRef | null {
  if (!raw) return null;

  // The frontend appends cache-busting queries and fragment markers.
  const trimmed = raw.split("#")[0].split("?")[0].trim();
  if (!trimmed) return null;

  // Any scheme other than our own `local:` prefix is refused outright. This is
  // what closes both the fetch and the filesystem paths, including `file:`,
  // `data:` and ffmpeg's own protocol strings such as `concat:`.
  if (isLocalKey(trimmed)) {
    // The remainder gets the same checks as an object key. localStore's
    // resolveLocalPath would also refuse an escape at read time, but a reference
    // that cannot be read should never be storable either, and a test proved
    // this branch accepted `local:../../../.env` when it merely deferred.
    const remainder = trimmed.slice(trimmed.indexOf(":") + 1);
    return isSafeKeyPath(remainder) ? { kind: "local", key: trimmed } : null;
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return null;
  if (!isSafeKeyPath(trimmed)) return null;

  return { kind: "object", key: trimmed };
}

/** Absolute paths, drive letters, UNC paths and traversal are all refused. */
function isSafeKeyPath(value: string): boolean {
  if (!value) return false;
  if (value.startsWith("/") || value.startsWith("\\")) return false;
  if (value.includes("\\")) return false;
  if (value.split("/").some((part) => part === "..")) return false;
  return OBJECT_KEY.test(value);
}

/**
 * Whether a client may store this string as a media reference.
 *
 * Used at the tRPC boundary so a bad value is rejected where it enters, with a
 * message the user can act on, rather than silently failing at render time.
 */
export function isStorableMediaRef(raw: string): boolean {
  return parseMediaRef(raw) !== null;
}
