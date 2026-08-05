/**
 * Helpers for reading what a stored media key points at.
 *
 * Storage keys carry their type in two different ways depending on where they
 * came from: uploads keep a real extension (`local:users/1/bumpers/ab12.mp4`),
 * while media imported from Pexels is tagged with a `#video` fragment because
 * the CDN URL has no useful extension. Anything deciding "is this a clip or a
 * still" has to handle both, so the rule lives here rather than being
 * re-derived: inconsistent copies are how a video ends up being treated as an
 * image in one place and a video in another.
 */

/** Whether a stored path points at video rather than a still image. */
export function isVideoPath(p: string | null | undefined): boolean {
  if (!p) return false;
  return p.includes("#video") || /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(p);
}
