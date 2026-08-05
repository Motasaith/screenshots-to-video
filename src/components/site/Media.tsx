import { useEffect, useRef, useState, type ReactNode } from "react";
import { ImageIcon, Play } from "lucide-react";
import { mediaUrl, mediaSrcSet, DEFAULT_SIZES } from "@/lib/siteMedia";

/**
 * Media on this site is always optional.
 *
 * Every slot below reserves its own aspect ratio up front and draws its own
 * frame, so the page has its final layout before any picture or clip arrives
 * and there is no shift when one does. If a slot has nothing to show it
 * renders a placeholder built from two flat gradients and a hairline grid,
 * which costs no requests and still reads as a deliberate part of the design.
 * That is what lets us ship the marketing pages before the screenshots and
 * demo clips are recorded, and what keeps the page usable if a CDN is slow.
 */

interface FrameProps {
  /** `width / height`. Reserves the box before the media loads. */
  ratio?: number;
  className?: string;
  /** Drops the large ambient shadow, for media that sits inside a card. */
  flat?: boolean;
  /** Drops the border and radius too, for media nested inside another frame. */
  bare?: boolean;
  children?: ReactNode;
}

function frameClass(flat: boolean, bare: boolean, className: string) {
  return ["frame", bare ? "frame-bare" : "", flat || bare ? "" : "frame-shadow", className]
    .filter(Boolean)
    .join(" ");
}

/* ------------------------------------------------------------------ image */

interface ShotProps extends FrameProps {
  src?: string;
  alt: string;
  /** Set on the one image above the fold. Everything else stays lazy. */
  priority?: boolean;
  sizes?: string;
  /** Shown inside the placeholder when `src` is absent. */
  placeholder?: string;
}

export function Shot({
  src,
  alt,
  ratio = 16 / 10,
  className = "",
  flat = false,
  bare = false,
  priority = false,
  sizes = DEFAULT_SIZES,
  placeholder = "Screenshot",
}: ShotProps) {
  return (
    <div className={frameClass(flat, bare, className)} style={{ aspectRatio: String(ratio) }}>
      {src ? (
        <img
          src={mediaUrl(src)}
          srcSet={mediaSrcSet(src)}
          sizes={sizes}
          alt={alt}
          // `async` decoding keeps a large image off the main thread, which is
          // the difference between a stutter and a clean scroll on a weak GPU.
          decoding="async"
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
        />
      ) : (
        <div className="frame-empty">
          <ImageIcon className="h-6 w-6 opacity-40" strokeWidth={1.5} />
          <span className="text-[13px] font-medium">{placeholder}</span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ video */

interface ClipProps extends FrameProps {
  src?: string;
  poster?: string;
  /** Muted looping background clip. Otherwise it waits for a click. */
  loop?: boolean;
  label?: string;
}

export function Clip({
  src,
  poster,
  ratio = 16 / 9,
  className = "",
  flat = false,
  bare = false,
  loop = false,
  label = "Watch the demo",
}: ClipProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  // A looping clip plays only while it is on screen. Left running off-screen
  // it would keep decoding frames for a picture nobody can see, which on a
  // low-end machine is the single most expensive thing a marketing page does.
  useEffect(() => {
    const el = ref.current;
    if (!el || !loop || !src) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.play().catch(() => {
            /* autoplay refused; the poster stays up, which is fine */
          });
        } else {
          el.pause();
        }
      },
      { threshold: 0.25 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [loop, src]);

  // An empty video slot is drawn as a dark player surface rather than the pale
  // grid used for images. A washed-out light rectangle at this size reads as a
  // failed load; a dark one reads as a video that has not started.
  if (!src) {
    return (
      <div
        className={`${frameClass(flat, bare, className)} frame-video grid place-items-center`}
        style={{ aspectRatio: String(ratio) }}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 ring-1 ring-inset ring-white/15">
            <Play className="ml-1 h-5 w-5 text-white" fill="currentColor" strokeWidth={0} />
          </span>
          <span className="text-[13.5px] font-medium text-white/60">{label}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${frameClass(flat, bare, className)} frame-video`}
      style={{ aspectRatio: String(ratio) }}
    >
      <video
        ref={ref}
        // `preload="none"` means the browser fetches nothing until playback
        // is asked for. The poster is a still image and carries the layout.
        preload="none"
        poster={poster ? mediaUrl(poster) : undefined}
        muted={loop}
        loop={loop}
        playsInline
        controls={!loop && started}
        onPlay={() => setStarted(true)}
      >
        <source src={mediaUrl(src)} type="video/mp4" />
      </video>

      {!loop && !started && (
        <button
          type="button"
          onClick={() => {
            setStarted(true);
            ref.current?.play();
          }}
          className="absolute inset-0 grid place-items-center bg-ink/10 transition-colors hover:bg-ink/0"
          aria-label={label}
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lift transition-transform duration-150 hover:scale-105">
            <Play className="ml-1 h-5 w-5 text-ink" fill="currentColor" strokeWidth={0} />
          </span>
        </button>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- chrome */

/**
 * Wraps a screenshot in a browser window drawn in CSS. Means the screenshots
 * themselves can be plain viewport captures with no window furniture, and it
 * gives an empty slot enough structure to still look like a product shot.
 */
export function BrowserFrame({
  url = "app.aivideo.ai",
  className = "",
  flat = false,
  children,
}: {
  url?: string;
  className?: string;
  flat?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`chrome ${flat ? "" : "shadow-lift"} ${className}`}>
      <div className="chrome-bar">
        <span className="chrome-dot" />
        <span className="chrome-dot" />
        <span className="chrome-dot" />
        <span className="chrome-address">{url}</span>
      </div>
      {children}
    </div>
  );
}
