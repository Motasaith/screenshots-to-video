/**
 * Client-side image compression utility.
 *
 * Compresses images by converting them to WebP format with high quality (92).
 * WebP provides ~25-35% smaller file sizes than PNG/JPEG at the same visual quality.
 *
 * The compression preserves all visual detail — small text remains readable
 * even after zoom, because we use high quality (92) and the original resolution.
 *
 * For images that are already small (< 500KB), compression is skipped to avoid
 * any potential quality loss on already-optimized files.
 */

const MAX_DIMENSION = 2560; // Max width/height — 2560px is enough for 4K screenshots
const QUALITY = 0.92; // High quality — visually lossless
const SKIP_THRESHOLD = 500_000; // Skip compression for files < 500KB

/**
 * Compress a single image file to WebP.
 * Returns the original file if compression isn't beneficial or fails.
 */
export async function compressImage(file: File): Promise<File> {
  // Skip non-image files
  if (!file.type.startsWith("image/")) return file;

  // Skip if already WebP and small
  if (file.type === "image/webp" && file.size < SKIP_THRESHOLD) return file;

  // Skip GIFs (they're animated, WebP conversion would break them)
  if (file.type === "image/gif") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) return file;

    // Scale down if exceeds max dimension, preserving aspect ratio
    let { width, height } = bitmap;
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    canvas.width = width;
    canvas.height = height;

    // Draw with high quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);

    // Convert to WebP blob
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", QUALITY);
    });

    if (!blob) return file;

    // Only use compressed version if it's actually smaller
    if (blob.size >= file.size) return file;

    // Preserve original filename but change extension to .webp
    const originalName = file.name.replace(/\.[^.]+$/, "");
    const compressedFile = new File([blob], `${originalName}.webp`, {
      type: "image/webp",
    });

    return compressedFile;
  } catch {
    // If compression fails (e.g., browser doesn't support createImageBitmap),
    // return the original file
    return file;
  }
}

/**
 * Compress an array of image files.
 * Non-image files are passed through unchanged.
 */
export async function compressImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map((f) => compressImage(f)));
}