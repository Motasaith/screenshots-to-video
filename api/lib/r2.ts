import { UTApi } from "uploadthing/server";
import { env } from "./env";
import path from "path";
import { nanoid } from "nanoid";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Suppress UploadThing SDK deprecation warnings — we already use ufsUrl
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const msg = args.join(" ");
  if (msg.includes("[uploadthing][deprecated]") && (msg.includes("file.url") || msg.includes("file.appUrl"))) {
    return;
  }
  originalWarn.apply(console, args);
};

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
    console.warn(`[Storage] UploadThing failed (${err.message || err}), falling back to Backblaze B2...`);
    
    // B2 Upload fallback
    const key = `${opts.folder}/${name}`;
    const s3 = getB2S3Client();
    await s3.send(new PutObjectCommand({
      Bucket: B2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: opts.contentType || "application/octet-stream",
    }));

    console.log(`[Storage] Successfully uploaded to B2: ${key}`);
    return `b2:${key}`;
  }
}

/**
 * Generate a download URL.
 */
export async function getSignedDownloadUrl(
  key: string,
  _expiresIn = 3600,
): Promise<string> {
  if (!key) return "";

  // If the key starts with b2:, generate pre-signed URL
  if (key.startsWith("b2:")) {
    const realKey = key.slice("b2:".length);
    const s3 = getB2S3Client();
    try {
      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: B2_BUCKET,
          Key: realKey,
        }),
        { expiresIn: _expiresIn }
      );
      return url;
    } catch (err: any) {
      console.error(`[Storage] Failed to generate B2 signed URL for ${realKey}:`, err.message);
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

  if (key.startsWith("b2:")) {
    const realKey = key.slice("b2:".length);
    const s3 = getB2S3Client();
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: B2_BUCKET,
          Key: realKey,
        })
      );
      console.log(`[Storage] Deleted B2 object: ${realKey}`);
    } catch (err: any) {
      console.error(`[Storage] Failed to delete B2 object ${realKey}:`, err.message);
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
  const url = await getSignedDownloadUrl(key);
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch (err) {
    console.warn(`[r2] existsInR2 HEAD failed for ${key}:`, err instanceof Error ? err.message : err);
    return false;
  }
}

/**
 * Download an object as a buffer.
 */
export async function downloadFromR2(key: string): Promise<Buffer> {
  const url = await getSignedDownloadUrl(key);
  console.log(`[R2] Downloading from: ${url.substring(0, 120)}...`);

  const maxRetries = 2;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(60000) });

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      console.log(`[R2] Downloaded ${buffer.length} bytes`);
      return buffer;
    } catch (err: any) {
      console.error(`[R2] Download attempt ${attempt}/${maxRetries} failed for key: ${key.substring(0, 80)}...`, err.message);
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
