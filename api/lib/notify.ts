/**
 * Notifications about things that already happened.
 *
 * A thin layer over `mailer.ts`, kept separate because callers here are announcing
 * an event rather than composing a message: the render finished, a ticket arrived,
 * support replied. Every one returns a boolean instead of throwing, since the thing
 * being announced has already succeeded and a failed notification must not undo it.
 *
 * Everything is a no-op until Brevo's credentials are set, and the send is logged
 * either way, so a ticket is still discoverable in the admin log viewer.
 *
 *   SUPPORT_NOTIFY_EMAIL=you@example.com   where new tickets are announced
 */

import { createLogger } from "./logger";
import { emailConfigured as mailerConfigured, sendTransactional } from "./mailer";

const log = createLogger({ path: "notify" });

export interface OutboundEmail {
  to: string;
  subject: string;
  /** Plain text. The mailer generates a plain HTML part from it. */
  body: string;
  /** Shown before the address in the recipient header. */
  name?: string | null;
}

/** Whether email can actually be sent in this deployment. */
export function emailConfigured(): boolean {
  return mailerConfigured();
}

/**
 * Send an email, if this deployment can.
 *
 * Returns whether it was sent rather than throwing, because every caller is
 * notifying about something that has already happened successfully. A ticket
 * that is saved but not announced is a much better outcome than a ticket lost
 * because the mail server was down.
 */
export async function sendEmail(mail: OutboundEmail): Promise<boolean> {
  return sendTransactional({
    to: { email: mail.to, name: mail.name ?? null },
    subject: mail.subject,
    text: mail.body,
  });
}

/**
 * Tell whoever handles support that a ticket has arrived.
 *
 * Logged unconditionally so the ticket is discoverable in the admin log viewer
 * even with no email set up, and emailed as well once it is.
 */
export async function notifyAdminOfTicket(ticket: {
  subject: string;
  email: string;
  signedIn: boolean;
}): Promise<void> {
  log.info("New support ticket awaiting a human", {
    subject: ticket.subject.slice(0, 120),
    from: ticket.email,
    signedIn: ticket.signedIn,
  });

  const to = process.env.SUPPORT_NOTIFY_EMAIL;
  if (!to) return;

  await sendEmail({
    to,
    subject: `Support request: ${ticket.subject}`.slice(0, 180),
    body: [
      `${ticket.signedIn ? "A customer" : "A visitor"} has asked to talk to a person.`,
      ``,
      `From: ${ticket.email}`,
      `Subject: ${ticket.subject}`,
      ``,
      `Open the Support tab in the admin dashboard to read the conversation and reply.`,
    ].join("\n"),
  }).catch((err) => {
    log.warn("Ticket notification failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

/**
 * Tell a customer their ticket has an answer.
 *
 * The reply is already visible in their widget, so this is only for someone who
 * has closed the tab. A no-op until email is configured.
 */
export async function notifyCustomerOfReply(args: {
  to: string;
  subject: string;
  reply: string;
}): Promise<boolean> {
  return sendEmail({
    to: args.to,
    subject: `Re: ${args.subject}`.slice(0, 180),
    body: [
      `Someone from AIVideo has replied to your support request:`,
      ``,
      args.reply,
      ``,
      `You can carry on the conversation in the support chat on the site.`,
    ].join("\n"),
  });
}
