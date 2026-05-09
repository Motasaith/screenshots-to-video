import { UTApi } from "uploadthing/server";
import { env } from "./env";
import path from "path";
import { nanoid } from "nanoid";

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

/**
 * Upload a buffer to UploadThing.
 * Returns the storage URL.
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

  const file = new File([buffer as any], name, {
    type: opts.contentType || "application/octet-stream",
  });

  const response = await getUtapi().uploadFiles(file);

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data.url;
}

/**
 * Generate a download URL. UploadThing URLs are public by default.
 */
export async function getSignedDownloadUrl(
  key: string,
  _expiresIn = 3600
): Promise<string> {
  if (!key) return "";

  // If the key is already a full URL, return it
  if (key.startsWith("http://") || key.startsWith("https://")) return key;

  return `https://utfs.io/f/${key}`;
}

/**
 * Delete an object from UploadThing.
 */
export async function deleteFromR2(key: string): Promise<void> {
  if (!key) return;

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
  } catch {
    return false;
  }
}

/**
 * Download an object from UploadThing as a buffer.
 */
export async function downloadFromR2(key: string): Promise<Buffer> {
  const url = await getSignedDownloadUrl(key);
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Check if storage is configured and available.
 */
export function isR2Configured(): boolean {
  return !!env.uploadthingSecret;
}
