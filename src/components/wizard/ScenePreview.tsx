import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, X } from "lucide-react";
import {
  cameraStateAt,
  computeSceneTiming,
  MW_MIN_HOLD,
} from "@contracts/sceneTiming";

/**
 * Plays a scene's camera move in the browser, before spending a credit.
 *
 * Rendering used to be expensive enough that "just export and see" was the only
 * option, which made every zoom decision a leap of faith. This runs the same
 * choreography the renderer will: shared easing and phase timing from
 * contracts/sceneTiming: so what plays here is what gets exported, minus the
 * narration and annotations.
 *
 * Client-side rather than a real render on purpose: it is instant, it costs
 * nothing, and it can be scrubbed. A server preview would be more faithful but
 * would reintroduce the wait this exists to remove.
 */
export function ScenePreview({
  screenshotUrl,
  zoomPoints,
  narrationSec,
  aspect,
  onClose,
}: {
  screenshotUrl: string;
  zoomPoints: Array<{ targetX: number; targetY: number; zoomScale?: number; duration?: number }>;
  narrationSec: number;
  /** Output aspect, e.g. "16:9": the preview box matches the video frame. */
  aspect: string;
  onClose: () => void;
}) {
  const [playing, setPlaying] = useState(true);
  const [t, setT] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const offsetRef = useRef<number>(0);

  const timing = computeSceneTiming(
    zoomPoints.length,
    zoomPoints.map((z) => z.duration ?? MW_MIN_HOLD),
    narrationSec
  );
  const total = Math.max(timing.sceneSec, 0.1);

  const waypoints = zoomPoints.map((z) => ({
    x: z.targetX / 100,
    y: z.targetY / 100,
    hold: z.duration ?? MW_MIN_HOLD,
    zoom: z.zoomScale ?? 2,
  }));

  useEffect(() => {
    if (!playing) return;
    startedAtRef.current = performance.now() - offsetRef.current * 1000;

    const tick = () => {
      const elapsed = (performance.now() - startedAtRef.current) / 1000;
      if (elapsed >= total) {
        offsetRef.current = 0;
        setT(total);
        setPlaying(false);
        return;
      }
      offsetRef.current = elapsed;
      setT(elapsed);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, total]);

  const cam = waypoints.length
    ? cameraStateAt(t, waypoints)
    : { zoom: 1, cx: 0.5, cy: 0.5 };

  // Move the focus point to the centre, then scale about the centre. Written in
  // this order because CSS applies transforms right to left.
  const transform =
    `scale(${cam.zoom.toFixed(4)}) ` +
    `translate(${((0.5 - cam.cx) * 100).toFixed(3)}%, ${((0.5 - cam.cy) * 100).toFixed(3)}%)`;

  const [aw, ah] = aspect.split(":").map(Number);
  const restart = () => {
    offsetRef.current = 0;
    setT(0);
    setPlaying(true);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-label="Scene preview"
    >
      <div
        className="w-full max-w-3xl rounded-xl border border-[var(--sketch-border-color)]/40 bg-[var(--sketch-surface)] p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--sketch-fg)]">Scene preview</h3>
            <p className="text-[11px] text-[var(--sketch-fg-subtle)]">
              Camera move only. No narration or annotations. Costs nothing.
            </p>
          </div>
          <button
            onClick={onClose}
            title="Close preview"
            aria-label="Close preview"
            className="rounded p-1 text-[var(--sketch-fg-muted)] hover:bg-[var(--sketch-fg-subtle)]/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* The frame, at the project's aspect ratio. */}
        <div
          className="relative w-full overflow-hidden rounded-lg bg-black"
          style={{ aspectRatio: `${aw || 16} / ${ah || 9}` }}
        >
          <img
            src={screenshotUrl}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full select-none object-contain"
            style={{ transform, transformOrigin: "center", willChange: "transform" }}
          />
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => (t >= total ? restart() : setPlaying((p) => !p))}
            title={playing ? "Pause" : "Play"}
            aria-label={playing ? "Pause preview" : "Play preview"}
            className="rounded-full bg-brand p-2 text-white hover:bg-brand-hover"
          >
            {t >= total ? (
              <RotateCcw className="h-4 w-4" />
            ) : playing ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>

          <input
            type="range"
            min={0}
            max={total}
            step={0.02}
            value={t}
            aria-label="Scrub preview"
            onChange={(e) => {
              const v = Number(e.target.value);
              offsetRef.current = v;
              setT(v);
              setPlaying(false);
            }}
            className="h-1 flex-1 cursor-pointer accent-brand"
          />

          <span className="w-24 text-right font-mono text-[11px] text-[var(--sketch-fg-subtle)]">
            {t.toFixed(1)}s / {total.toFixed(1)}s
          </span>
        </div>

        {timing.silenceSec > 1.5 && (
          <p className="mt-2 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-700 ">
            {timing.silenceSec.toFixed(1)}s of this scene has no narration. Give each
            zoom point its own script, or shorten the holds.
          </p>
        )}
      </div>
    </div>
  );
}
