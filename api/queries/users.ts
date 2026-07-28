import { eq } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertUser } from "@db/schema";
import { getDb } from "./connection";
import { env } from "../lib/env";
import { decryptSecret, encryptSecret, secretHint } from "../lib/secrets";

export async function findUserByUnionId(unionId: string) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.unionId, unionId))
    .limit(1);
  return rows.at(0);
}

/**
 * Fetch and decrypt a user's own ElevenLabs API key. Returns null if the user
 * hasn't set one (or if decryption fails, e.g. after APP_SECRET rotation).
 * Used server-side only — the plaintext key must never be sent to the client.
 */
export async function getUserElevenLabsKey(userId: number): Promise<string | null> {
  const rows = await getDb()
    .select({ enc: schema.users.elevenlabsApiKey })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  return decryptSecret(rows.at(0)?.enc);
}

/** Presence + display hint for a user's ElevenLabs key (no secret material). */
export async function getUserElevenLabsKeyStatus(
  userId: number,
): Promise<{ hasKey: boolean; hint: string | null }> {
  const rows = await getDb()
    .select({ enc: schema.users.elevenlabsApiKey, hint: schema.users.elevenlabsKeyHint })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  const row = rows.at(0);
  return { hasKey: Boolean(row?.enc), hint: row?.hint ?? null };
}

/** Encrypt and store a user's ElevenLabs API key (with a last-4 display hint). */
export async function setUserElevenLabsKey(userId: number, plainKey: string): Promise<void> {
  await getDb()
    .update(schema.users)
    .set({
      elevenlabsApiKey: encryptSecret(plainKey),
      elevenlabsKeyHint: secretHint(plainKey),
    })
    .where(eq(schema.users.id, userId));
}

/** Remove a user's stored ElevenLabs API key. */
export async function clearUserElevenLabsKey(userId: number): Promise<void> {
  await getDb()
    .update(schema.users)
    .set({ elevenlabsApiKey: null, elevenlabsKeyHint: null })
    .where(eq(schema.users.id, userId));
}

export async function upsertUser(data: InsertUser) {
  const values = { ...data };
  const updateSet: Partial<InsertUser> = {
    lastSignInAt: new Date(),
    ...data,
  };

  if (
    values.role === undefined &&
    ((values.unionId && values.unionId === env.ownerUnionId) || 
     (values.email && values.email === env.ownerUnionId))
  ) {
    values.role = "admin";
    updateSet.role = "admin";
    values.plan = "pro";
    updateSet.plan = "pro";
  }

  await getDb()
    .insert(schema.users)
    .values(values)
    .onDuplicateKeyUpdate({ set: updateSet });
}
