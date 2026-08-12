/**
 * Sending mail, through Brevo's SMTP relay.
 *
 * Two kinds of message, kept apart on purpose:
 *
 *   - **Transactional**: a render finished, a render failed, support replied.
 *     Sent to anyone who asked for the thing that triggered it, and not subject to
 *     marketing consent. It still respects a hard bounce, because continuing to
 *     mail a dead address is how a sending domain gets its reputation ruined.
 *   - **Promotional**: campaigns an admin writes. Requires consent, carries an
 *     unsubscribe link, and is skipped for anyone who opted out or bounced.
 *
 * Mixing those two is the single fastest way to land in spam folders, so
 * `sendTransactional` and `sendPromotional` are separate functions with different
 * rules rather than one function with a flag.
 *
 * A missing configuration is not an error. Nothing in the app depends on mail
 * succeeding: a render still completes, a ticket still reaches the dashboard. The
 * send is logged and skipped, which is what let this ship before the credentials
 * existed.
 */

import nodemailer, { type Transporter } from "nodemailer";
import { and, eq, inArray } from "drizzle-orm";
import { emailSuppressions, users } from "@db/schema";
import { getDb } from "../queries/connection";
import { createLogger } from "./logger";

const log = createLogger({ path: "mailer" });

export interface MailAddress {
  email: string;
  name?: string | null;
}

export interface OutboundMail {
  to: MailAddress;
  subject: string;
  /** Plain text. Required: a text part is what keeps spam scores down. */
  text: string;
  /** Optional HTML. Generated from `text` when absent. */
  html?: string;
}

/** Everything the relay needs, or nothing if it is not configured. */
function smtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_KEY?.trim();
  const from = process.env.MAIL_FROM?.trim();

  if (!host || !user || !pass || !from) return null;

  const port = Number(process.env.SMTP_PORT) || 587;
  return {
    host,
    port,
    // Brevo uses STARTTLS on 587 and 2525, and implicit TLS only on 465.
    secure: port === 465,
    auth: { user, pass },
    from,
  };
}

export function emailConfigured(): boolean {
  return smtpConfig() !== null;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const config = smtpConfig();
  if (!config) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      // One connection reused across a campaign, rather than one per message.
      pool: true,
      maxConnections: 3,
      maxMessages: 50,
    });
  }
  return transporter;
}

/** Verify the credentials without sending anything. For the admin dashboard. */
export async function verifyMailer(): Promise<{ ok: boolean; error?: string }> {
  const t = getTransporter();
  if (!t) return { ok: false, error: "SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_KEY and MAIL_FROM." };
  try {
    await t.verify();
    return { ok: true };
  } catch (err) {
    // 535 almost always means an API key was pasted where the SMTP key belongs,
    // or the key carries a trailing space.
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** A very plain HTML wrapper. Deliberately boring: heavy HTML lands in spam. */
function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#14181d">${escaped
    .split("\n\n")
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("")}</div>`;
}

/** Whether this address must not be mailed at all. */
async function isSuppressed(email: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ email: emailSuppressions.email })
    .from(emailSuppressions)
    .where(eq(emailSuppressions.email, email.toLowerCase()))
    .limit(1);
  return !!row;
}

export async function suppress(email: string, reason: string): Promise<void> {
  await getDb()
    .insert(emailSuppressions)
    .values({ email: email.toLowerCase(), reason })
    .onDuplicateKeyUpdate({ set: { reason } });
  log.info("Address suppressed", { reason });
}

async function send(mail: OutboundMail, kind: "transactional" | "promotional"): Promise<boolean> {
  const config = smtpConfig();
  const t = getTransporter();

  if (!config || !t) {
    log.info("Mail not configured, send skipped", { kind, subject: mail.subject.slice(0, 80) });
    return false;
  }

  if (await isSuppressed(mail.to.email)) {
    log.info("Mail skipped, address suppressed", { kind });
    return false;
  }

  try {
    await t.sendMail({
      from: config.from,
      to: mail.to.name ? `"${mail.to.name.replace(/"/g, "")}" <${mail.to.email}>` : mail.to.email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html ?? textToHtml(mail.text),
    });
    log.info("Mail sent", { kind, subject: mail.subject.slice(0, 80) });
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // A permanent rejection means the address is dead. Suppress it rather than
    // trying again every week, which is what damages a sending reputation.
    if (/\b5\d\d\b/.test(message) && /(no such user|does not exist|invalid recipient|unknown)/i.test(message)) {
      await suppress(mail.to.email, `hard bounce: ${message.slice(0, 120)}`);
    }
    log.warn("Mail failed", { kind, error: message.slice(0, 200) });
    return false;
  }
}

/**
 * Something the recipient asked for by using the product.
 *
 * Not gated on marketing consent, because unsubscribing from newsletters is not a
 * request to stop being told your render failed.
 */
export function sendTransactional(mail: OutboundMail): Promise<boolean> {
  return send(mail, "transactional");
}

/**
 * A campaign. Consent required, unsubscribe link appended.
 *
 * The footer is added here rather than trusted to whoever wrote the campaign, so
 * a message can never go out without a way off the list.
 */
export async function sendPromotional(
  mail: OutboundMail,
  unsubscribeUrl: string
): Promise<boolean> {
  const footer = `\n\n---\nYou are receiving this because you have an AIVideo account.\nUnsubscribe: ${unsubscribeUrl}`;
  return send(
    {
      ...mail,
      text: `${mail.text}${footer}`,
      html: `${mail.html ?? textToHtml(mail.text)}<hr style="border:none;border-top:1px solid #dfe4e9;margin:24px 0"><p style="font-size:12px;color:#66707c">You are receiving this because you have an AIVideo account. <a href="${unsubscribeUrl}">Unsubscribe</a></p>`,
    },
    "promotional"
  );
}

/**
 * Everyone who may receive a campaign.
 *
 * Excludes anyone who opted out and anyone on the suppression list, in one query
 * each rather than per recipient.
 */
export async function promotionalAudience(): Promise<Array<{ id: number; email: string; name: string | null }>> {
  const db = getDb();
  const rows = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.marketingEmails, true));

  // An account can exist without an email (some sign-in paths), and there is
  // nowhere to send a campaign for those.
  const candidates = rows.filter(
    (r): r is { id: number; email: string; name: string | null } => !!r.email
  );
  if (candidates.length === 0) return [];

  const suppressed = await db
    .select({ email: emailSuppressions.email })
    .from(emailSuppressions)
    .where(
      inArray(
        emailSuppressions.email,
        candidates.map((c) => c.email.toLowerCase())
      )
    );
  const blocked = new Set(suppressed.map((s) => s.email));

  return candidates.filter((c) => !blocked.has(c.email.toLowerCase()));
}

/** Look up a user by their unsubscribe token, for the one-click link. */
export async function userByUnsubscribeToken(token: string) {
  if (!token || token.length < 16) return null;
  const [row] = await getDb()
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(and(eq(users.unsubscribeToken, token), eq(users.marketingEmails, true)))
    .limit(1);
  return row ?? null;
}
