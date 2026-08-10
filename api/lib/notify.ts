/**
 * Outbound notifications.
 *
 * This project has no mail transport. There is no mail library in
 * package.json, no SMTP or API credentials in the environment, and nothing that
 * has ever sent an email. Adding one is a decision with consequences beyond
 * code: which provider, which sending domain, and the SPF/DKIM records that stop
 * the mail landing in spam.
 *
 * So this module is the seam, not the implementation. Right now a new ticket is
 * written to the log, which the admin dashboard already surfaces under the
 * "Support widget" source, and the customer is answered inside the widget, which
 * needs no email at all.
 *
 * To turn email on, install a provider, set the two variables below, and fill in
 * `sendEmail`. Nothing else in the codebase needs to change: every caller
 * already goes through here and already tolerates failure.
 *
 *   SUPPORT_NOTIFY_EMAIL=you@example.com     where new tickets are announced
 *   MAIL_FROM="AIVideo <support@yourdomain>"  the envelope sender
 */

import { createLogger } from "./logger";

const log = createLogger({ path: "notify" });

export interface OutboundEmail {
  to: string;
  subject: string;
  /** Plain text. Whatever provider goes in here can add HTML later. */
  body: string;
}

/** Whether email can actually be sent in this deployment. */
export function emailConfigured(): boolean {
  return false;
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
  if (!emailConfigured()) {
    log.info("Email not configured; notification skipped", {
      to: mail.to,
      subject: mail.subject.slice(0, 80),
    });
    return false;
  }

  // Provider call goes here once one is chosen.
  return false;
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
