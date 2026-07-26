import { UTApi } from "uploadthing/server";
import { env } from "./env";
import path from "path";
import { nanoid } from "nanoid";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createLogger } from "./logger";
import { isLocalKey, readLocalFile, deleteLocalFile, localFilePath } from "./localStore";

const log = createLogger({ path: "r2" });

let utapi: UTApi | null = null;

function getUtapi() {
  if (!utapi) {
    if (!env.uploadthingSecret) {
      throw new Error(
        "UploadThing is not configured. Set UPLOADTHING_SECRET in .env"
      );
    }
    
    let token = env.uploadthingSecret;
    if (token.startsWith("sk_")) {
      token = Buffer.from(
        JSON.stringify({
          apiKey: env.uploadthingSecret,
          appId: env.uploadthingAppId || "",
          regions: ["sea1"],
        })
      ).toString("base64");
    }

    utapi = new UTApi({ token });
  }
  return utapi;
}

const B2_KEY_ID = process.env.B2_KEY_ID || "";
const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY || "";
const B2_BUCKET = process.env.B2_BUCKET || "";
const B2_ENDPOINT = process.env.B2_ENDPOINT || "";
const B2_REGION = process.env.B2_REGION || "";

let s3Client: S3Client | null = null;

function getB2S3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: B2_ENDPOINT,
      region: B2_REGION,
      credentials: {
        accessKeyId: B2_KEY_ID,
        secretAccessKey: B2_APPLICATION_KEY,
      },
    });
  }
  return s3Client;
}

/**
 * Upload a buffer to UploadThing with Backblaze B2 fallback.
 * Returns the storage key/URL.
 */
export async function uploadToR2(
  buffer: Buffer | Uint8Array,
  opts: {
    folder: string; // e.g. "screenshots", "audio", "video"
    filename?: string;
    contentType?: string;
  }
): Promise<string> {
  const ext = opts.filename ? path.extname(opts.filename) : "";
  const name = opts.filename || `${nanoid(16)}${ext}`;

  try {
    const file = new File([buffer as any], name, {
      type: opts.contentType || "application/octet-stream",
    });

    const response = await getUtapi().uploadFiles(file);

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data.ufsUrl || response.data.url;
  } catch (err: any) {
    log.warn(`UploadThing failed, falling back to Backblaze B2`, { error: err.message || String(err) });
    
    // B2 Upload fallback
    const key = `${opts.folder}/${name}`;
    const s3 = getB2S3Client();
    await s3.send(new PutObjectCommand({
      Bucket: B2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: opts.contentType || "application/octet-stream",
      // Every key we write embeds a nanoid or a step id and is never rewritten
      // in place, so the bytes behind a key are immutable. Without this header
      // B2 sends no Cache-Control at all and browsers re-fetch on every load.
      CacheControl: "public, max-age=31536000, immutable",
    }));

    log.info(`Successfully uploaded to B2: ${key}`);
    return `b2:${key}`;
  }
}

/**
 * Cache of B2 presigned URLs, keyed by storage key.
 *
 * A presigned URL embeds the signing timestamp, so generating one per request
 * produced a *different URL string for the same bytes* every time the client
 * asked. The browser treats each as a new resource, so every screenshot was
 * re-downloaded on every page load and the HTTP cache never once hit. Handing
 * back the same URL until it nears expiry is what makes caching possible at all.
 */
const signedUrlCache = new Map<string, { url: string; refreshAfter: number }>();

/** SigV4 caps presigned URL lifetime at 7 days. Sign for 6, reissue after 5. */
const SIGNED_URL_TTL_SEC = 6 * 24 * 60 * 60;
const SIGNED_URL_REUSE_MS = 5 * 24 * 60 * 60 * 1000;

/** Bound the cache so a long-lived worker process can't grow it forever. */
const SIGNED_URL_CACHE_MAX = 5000;

function rememberSignedUrl(realKey: string, url: string): void {
  if (signedUrlCache.size >= SIGNED_URL_CACHE_MAX) {
    // Map iterates in insertion order, so this drops the oldest entries.
    for (const k of signedUrlCache.keys()) {
      signedUrlCache.delete(k);
      if (signedUrlCache.size < SIGNED_URL_CACHE_MAX * 0.9) break;
    }
  }
  signedUrlCache.set(realKey, { url, refreshAfter: Date.now() + SIGNED_URL_REUSE_MS });
}

/**
 * Generate a download URL.
 *
 * `_expiresIn` is honoured only as a floor: callers asking for a short-lived
 * URL still get the long-lived cached one, because a stable URL is worth more
 * than a tight expiry for assets that are already access-controlled by the
 * unguessable key.
 */
export async function getSignedDownloadUrl(
  key: string,
  _expiresIn = 3600,
): Promise<string> {
  if (!key) return "";

  // Files kept on the server's own disk are served by /api/file, which applies
  // the same ownership check the object-storage signature used to stand in for.
  if (isLocalKey(key)) return `/api/file?key=${encodeURIComponent(key)}`;

  // If the key starts with b2:, generate pre-signed URL
  if (key.startsWith("b2:")) {
    const realKey = key.slice("b2:".length);

    const cached = signedUrlCache.get(realKey);
    if (cached && cached.refreshAfter > Date.now()) return cached.url;

    const s3 = getB2S3Client();
    try {
      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: B2_BUCKET,
          Key: realKey,
        }),
        { expiresIn: Math.max(_expiresIn, SIGNED_URL_TTL_SEC) }
      );
      rememberSignedUrl(realKey, url);
      return url;
    } catch (err: any) {
      log.error(`Failed to generate B2 signed URL for ${realKey}`, err);
      return "";
    }
  }

  // If the key is already a full URL, return it
  if (key.startsWith("http://") || key.startsWith("https://")) return key;

  return `https://utfs.io/f/${key}`;
}

/**
 * Delete an object.
 */
export async function deleteFromR2(key: string): Promise<void> {
  if (!key) return;

  if (isLocalKey(key)) return deleteLocalFile(key);

  if (key.startsWith("b2:")) {
    const realKey = key.slice("b2:".length);
    signedUrlCache.delete(realKey); // don't hand out URLs to deleted objects
    const s3 = getB2S3Client();
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: B2_BUCKET,
          Key: realKey,
        })
      );
      log.info(`Deleted B2 object: ${realKey}`);
    } catch (err: any) {
      log.error(`Failed to delete B2 object ${realKey}`, err);
    }
    return;
  }

  // Extract the file key from the URL if needed
  const fileKey = key.startsWith("http") ? key.split("/").pop() : key;
  
  if (fileKey) {
    await getUtapi().deleteFiles([fileKey]);
  }
}

/**
 * Check if an object exists.
 */
export async function existsInR2(key: string): Promise<boolean> {
  if (isLocalKey(key)) return (await localFilePath(key)) !== null;

  const url = await getSignedDownloadUrl(key);
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch (err) {
    log.warn(`existsInR2 HEAD failed for ${key}`, { error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

/**
 * Download an object as a buffer.
 */
export async function downloadFromR2(key: string): Promise<Buffer> {
  if (isLocalKey(key)) return readLocalFile(key);

  const url = await getSignedDownloadUrl(key);
  log.info(`Downloading from: ${url.substring(0, 120)}...`);

  const maxRetries = 2;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(60000) });

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      log.info(`Downloaded ${buffer.length} bytes`);
      return buffer;
    } catch (err: any) {
      log.error(`Download attempt ${attempt}/${maxRetries} failed for key: ${key.substring(0, 80)}...`, err);
      if (attempt === maxRetries) {
        throw new Error(`Download failed after ${maxRetries} attempts: ${err.message}`);
      }
      // Wait 2 seconds before retry
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw new Error("Download failed: all retries exhausted");
}

/**
 * Check if storage is configured and available.
 */
export function isR2Configured(): boolean {
  return !!env.uploadthingSecret || (!!B2_KEY_ID && !!B2_APPLICATION_KEY);
}
