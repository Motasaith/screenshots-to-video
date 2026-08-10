/**
 * Detects a request for a person.
 *
 * A heuristic on the customer's own words rather than asking the model to
 * classify. Two reasons: the reply is free text so a machine-readable signal
 * would have to be parsed out of prose, and a second model call to classify
 * doubles the latency of every message to catch a minority of them.
 *
 * Being a heuristic, it will miss phrasings. That is why the option is also
 * permanently available from the widget footer: detection is a convenience, not
 * the only route to a human.
 */
const HANDOFF_PATTERNS: RegExp[] = [
  /\b(real|actual|human|live)\s+(person|human|agent|someone|support|rep)\b/i,
  /\b(talk|speak|chat|connect)\s+(me\s+)?(to|with)\s+(a|an|the\s+)?\s*(someone|somebody|human|person|agent|admin|support|staff|team|rep)\b/i,
  /\b(contact|reach|email|message)\s+(a\s+|the\s+)?(support|admin|team|human|someone|somebody|customer service)\b/i,
  // "can someone from support contact me" - the other direction, but only when
  // it is a person being asked for, so "email me the video" is left alone.
  /\b(someone|somebody|support|admin|a human|a person|the team)\b[^.?!]{0,40}\b(contact|email|call|reach)\s+me\b/i,
  /\b(raise|open|file|submit)\s+(a\s+)?(ticket|request|complaint|case)\b/i,
  /\bcustomer (service|support)\b/i,
  /\b(is|are)\s+(there|any)\s+(a\s+)?(human|person|someone)\b/i,
  /\b(not|isn.?t|no)\s+helping\b|\byou.?re\s+(not\s+)?(useless|no help)\b/i,
  /\bescalate\b/i,
  /\bspeak to (a|the) (manager|owner|admin)\b/i,
  /\bhuman\s*\?/i,
];

export function wantsHuman(text: string): boolean {
  const t = text.trim();
  if (t.length < 4) return false;
  return HANDOFF_PATTERNS.some((re) => re.test(t));
}
