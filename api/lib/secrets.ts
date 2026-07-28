import crypto from "crypto";
import { env } from "./env";

/**
 * Symmetric encryption for secrets stored at rest (e.g. a user's own
 * ElevenLabs API key). The key is derived from APP_SECRET so no extra env var
 * is needed; rotating APP_SECRET invalidates all stored secrets (users just
 * re-enter their key).
 *
 * Format: "<ivB64>:<authTagB64>:<ciphertextB64>" using AES-256-GCM.
 */
const ENCRYPTION_KEY = crypto
  .createHash("sha256")
  .update(env.appSecret || "dev-insecure-secret")
  .digest(); // 32 bytes

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptSecret(payload: string | null | undefined): string | null {
  if (!payload) return null;
  try {
    const [ivB64, tagB64, dataB64] = payload.split(":");
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      ENCRYPTION_KEY,
      Buffer.from(ivB64, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]);
    return dec.toString("utf8");
  } catch {
    return null;
  }
}

/** Last 4 characters of a secret, for non-sensitive UI display ("••••1a2b"). */
export function secretHint(plain: string): string {
  return plain.slice(-4);
}
