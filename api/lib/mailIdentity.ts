/**
 * The two things every outgoing email needs to know about itself.
 *
 * Kept out of `mailer.ts` so that module stays about sending, and out of
 * `adminRouter.ts` so a campaign and a transactional message build their links the
 * same way.
 */

import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { users } from "@db/schema";
import { getDb } from "../queries/connection";

/**
 * Where the app lives, for links in emails.
 *
 * A relative path is useless in an inbox, and getting this wrong means every
 * unsubscribe link in a campaign points at localhost. Falls back to the production
 * domain rather than to something that cannot work.
 */
export function publicBaseUrl(): string {
  const configured = process.env.PUBLIC_BASE_URL?.trim() || process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return "https://narrashot.com";
}

/**
 * The user's unsubscribe token, creating one if they have none.
 *
 * Random rather than derived from the user id, so a link cannot be edited to
 * unsubscribe somebody else. Written once and reused, so a link in an old email
 * keeps working.
 */
export async function ensureUnsubscribeToken(userId: number): Promise<string> {
  const db = getDb();
  const [row] = await db
    .select({ token: users.unsubscribeToken })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (row?.token) return row.token;

  const token = randomBytes(18).toString("base64url");
  await db.update(users).set({ unsubscribeToken: token }).where(eq(users.id, userId));
  return token;
}
