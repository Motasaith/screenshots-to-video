/**
 * Turning a model reply into something the app can act on.
 *
 * Two jobs, both about the same failure. The assistant cannot contact anyone,
 * but it kept telling customers "I have forwarded this to our team", which is
 * the worst thing a support bot can say: the customer stops chasing, and nobody
 * ever picks it up.
 *
 * So the prompt asks for a marker instead of a promise, and this module reads
 * it. The marker is stripped before the text is shown, because it is an
 * instruction to the app, not a sentence for a person to read.
 *
 * The false-claim sweep after it is a safety net, not the main defence. Prompts
 * are followed most of the time, not all of the time, and this particular slip
 * is bad enough to be worth catching in code as well.
 */

import { REPLY_MARKERS } from "./productKnowledge";

export interface ParsedReply {
  /** What the customer sees, with markers removed. */
  reply: string;
  /** The app should open the contact form. */
  needHuman: boolean;
  /** The app should offer example questions instead of an answer. */
  offTopic: boolean;
}

/**
 * Claims of having contacted someone.
 *
 * Deliberately narrow: it looks for the act of passing something on, not for the
 * words "team" or "support" on their own, so "our team keeps the files for 90
 * days" or "contact support if it happens again" are left alone.
 */
const FALSE_CLAIM = new RegExp(
  [
    // "I have forwarded / passed / escalated / sent / relayed / reported ..."
    String.raw`\b(?:i|we)(?:'ve|'ll|'m going to| have| will| am going to| shall)?\s+(?:just\s+|now\s+|already\s+)?`,
    String.raw`(?:forward(?:ed|ing)?|pass(?:ed|ing)?\s+(?:this|it|that)?\s*(?:on|along)?|escalat(?:ed|ing|e)|relay(?:ed|ing)?|report(?:ed|ing)?|submitt?(?:ed|ing)?|log(?:ged|ging)?|rais(?:ed|ing|e)|notif(?:ied|ying|y)|alert(?:ed|ing)?|email(?:ed|ing)?|contact(?:ed|ing)?|sen[dt](?:ing)?)`,
    // Plurals matter: "our engineers" is the same claim as "our engineer".
    String.raw`\b[^.!?\n]*?\b(?:teams?|humans?|persons?|people|support|admins?|staff|colleagues?|someone|somebody|engineers?|developers?|devs?)\b`,
  ].join(""),
  "i"
);

/** "Someone will get back to you", said as a fact the assistant cannot arrange. */
const FALSE_PROMISE =
  /\b(?:someone|a (?:human|person|team member|colleague)|our team|the team|support)\s+(?:will|should|is going to)\s+(?:get back to|contact|reach out to|email|respond to|reply to)\b/i;

/** What to say instead. True, because the app opens the form on `needHuman`. */
const HONEST_REPLACEMENT =
  "I cannot reach anyone myself, so I have opened the form below: fill it in and a real person will pick it up.";

/**
 * Split a reply into sentences, keeping their punctuation.
 *
 * Crude on purpose. It only has to be good enough to drop the one sentence
 * making the false claim without mangling the useful advice around it.
 */
function sentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/);
}

export function parseSupportReply(raw: string): ParsedReply {
  let text = raw.trim();

  const needMarker = text.includes(REPLY_MARKERS.needHuman);
  const offMarker = text.includes(REPLY_MARKERS.offTopic);

  for (const marker of Object.values(REPLY_MARKERS)) {
    text = text.split(marker).join(" ");
  }
  text = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  // Sweep any surviving claim of having contacted someone.
  let claimed = false;
  const kept = sentences(text).filter((sentence) => {
    if (FALSE_CLAIM.test(sentence) || FALSE_PROMISE.test(sentence)) {
      claimed = true;
      return false;
    }
    return true;
  });

  if (claimed) {
    text = [...kept, HONEST_REPLACEMENT].map((s) => s.trim()).filter(Boolean).join(" ");
  }

  return {
    reply: text.trim(),
    // A caught claim implies they wanted a person, whatever the model marked.
    needHuman: needMarker || claimed,
    // An off-topic answer that also wants a human is a contradiction; the
    // request for a person is the more useful of the two to honour.
    offTopic: offMarker && !(needMarker || claimed),
  };
}
