/**
 * Where marketing images and videos come from.
 *
 * The reason a site like Canva or CapCut can put a full-bleed screenshot and
 * an autoplaying clip on its homepage without the page crawling is not that
 * their media is small. It is that the browser never downloads the big
 * original:
 *
 *  1. Images go through an image CDN that re-encodes on the fly. The browser
 *     asks for the size it is actually going to paint (via `srcset`/`sizes`)
 *     and gets back AVIF or WebP at that exact width. A 2400px PNG that would
 *     have been 1.8 MB becomes a 340px AVIF of about 12 KB on a phone.
 *  2. The bytes are served from an edge node near the visitor rather than
 *     from the origin, so latency stays flat wherever they are.
 *  3. Everything below the fold is deferred: `loading="lazy"` on images,
 *     `preload="none"` on video. Only the hero is fetched eagerly.
 *  4. Video is never a raw MP4 dropped into a `<video src>`. It is either a
 *     short muted clip of a megabyte or two, or an adaptive stream, and it
 *     always has a `poster` so the first paint is a still image.
 *
 * Set `VITE_MEDIA_CDN` to switch this project onto that path. Anything left
 * unset keeps serving from `/public`, which is fine for a handful of
 * screenshots and means the site works with no CDN account at all.
 *
 * Providers this shape works with as-is:
 *   Cloudflare Images   https://<zone>/cdn-cgi/image
 *   imgix / bunny.net   https://<zone>.b-cdn.net
 *   Cloudinary          https://res.cloudinary.com/<cloud>/image/fetch
 *
 * For video, the equivalent is Cloudflare Stream, Mux or bunny Stream: give
 * them the file once, embed the playback URL, and they handle the bitrate
 * ladder and the edge caching.
 */

const CDN = (import.meta.env.VITE_MEDIA_CDN as string | undefined)?.replace(/\/$/, "");

/** Widths offered to the browser. Covers phone through 2x desktop. */
const WIDTHS = [480, 768, 1024, 1440, 1920];

/** A single URL at the given width. Falls back to the raw path with no CDN. */
export function mediaUrl(path: string, width?: number): string {
  if (!path) return path;
  if (/^https?:\/\//.test(path) || !CDN) return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  return width ? `${CDN}/w=${width},f=auto,q=82${clean}` : `${CDN}/f=auto,q=82${clean}`;
}

/**
 * `srcset` across the width ladder. Returns undefined without a CDN, which is
 * the correct thing to hand React: a `srcset` listing the same file five times
 * would just let the browser pick the biggest one.
 */
export function mediaSrcSet(path: string): string | undefined {
  if (!CDN || !path || /^https?:\/\//.test(path)) return undefined;
  return WIDTHS.map((w) => `${mediaUrl(path, w)} ${w}w`).join(", ");
}

/**
 * Default `sizes`. Says: full viewport width on phones, and never wider than
 * the site container on desktop. Without this the browser assumes 100vw and
 * downloads a 1920px file to paint it 560px wide.
 */
export const DEFAULT_SIZES = "(max-width: 768px) 100vw, (max-width: 1200px) 92vw, 1180px";
