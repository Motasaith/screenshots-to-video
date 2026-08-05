/**
 * Cut a crop region permanently out of a screenshot, in the browser.
 *
 * The editor's crop was previously a *pending instruction*: the canvas kept
 * showing the whole screenshot with the discarded part dimmed, and FFmpeg did
 * the cutting at render time. That left the canvas and the export disagreeing
 * about what the video frame contains: most visibly with watermarks and
 * captions, which FFmpeg positions against the cropped frame while the editor
 * drew them against the full image.
 *
 * Baking the crop into the image removes the disagreement rather than papering
 * over it: afterwards there is no crop pending, so both sides are looking at
 * the same picture. It also means annotations placed after the crop use
 * coordinates that mean the same thing everywhere.
 */

/** Crop rectangle as percentages of the source image, 0-100. */
export interface CropRectPercent {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Produce a new image file containing only the crop region.
 *
 * Uses the natural pixel dimensions, so the result keeps the screenshot's full
 * resolution rather than whatever size it happened to be displayed at.
 */
export async function cropImageFile(
  imageUrl: string,
  rect: CropRectPercent,
  filename = "cropped.png"
): Promise<File> {
  const img = await loadImage(imageUrl);

  const sx = Math.round((rect.x / 100) * img.naturalWidth);
  const sy = Math.round((rect.y / 100) * img.naturalHeight);
  // At least 1px, and never past the edge: a crop dragged slightly outside
  // the image would otherwise produce an empty or errored canvas.
  const sw = Math.max(1, Math.min(Math.round((rect.w / 100) * img.naturalWidth), img.naturalWidth - sx));
  const sh = Math.max(1, Math.min(Math.round((rect.h / 100) * img.naturalHeight), img.naturalHeight - sy));

  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get a 2D canvas context");
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

  const blob = await new Promise<Blob | null>((resolve) =>
    // PNG, not JPEG: this is a screenshot with text and hard edges, and it is
    // re-encoded to WebP by the upload path anyway.
    canvas.toBlob(resolve, "image/png")
  );
  if (!blob) throw new Error("Could not read the cropped image back from the canvas");

  return new File([blob], filename, { type: "image/png" });
}

/**
 * Load an image for canvas use.
 *
 * `crossOrigin` is required or the canvas is tainted and `toBlob` throws a
 * security error. Same-origin `/api/file` URLs are unaffected either way.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the screenshot for cropping"));
    img.src = src;
  });
}
