/**
 * URL for a step's server-generated thumbnail.
 *
 * The editor lists and timeline strip draw screenshots at 40-96px. Pointing
 * them at the full-resolution upload meant downloading and decoding a
 * multi-megapixel image per scene to fill a postage stamp; at 96px the same
 * image is about 200x smaller on the wire.
 *
 * Returns null when there is nothing for the server to resize — an unsaved
 * local `blob:` preview, or no screenshot at all — so callers can fall back to
 * the raw path.
 */
export function stepThumbUrl(
  stepId: number | undefined,
  screenshotPath: string | null | undefined,
  width: 96 | 192 | 384 = 96
): string | null {
  if (!stepId || !screenshotPath) return null;
  if (screenshotPath.startsWith("blob:") || screenshotPath.startsWith("data:")) return null;
  return `/api/thumb?stepId=${stepId}&w=${width}`;
}
