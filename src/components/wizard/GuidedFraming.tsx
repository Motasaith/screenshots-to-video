/**
 * Mark up the screenshots, one at a time, before the editor is ever seen.
 *
 * The editor is fifteen tools, ten panels and a properties sidebar. Meeting it
 * for the first time with a blank project and no idea what the product wanted
 * from you is the "I gave it my screenshots, now what?" moment. This is the
 * same job - say what matters on each screen - reduced to one instruction and
 * one gesture, repeated once per screenshot.
 *
 * Deliberately not the editor:
 *  - one screenshot at a time, so there is no timeline to understand;
 *  - one action, drag a box, so there is no tool to choose;
 *  - skippable per screenshot and as a whole, so nobody is trapped in it.
 *
 * A screenshot can carry as many boxes as it needs, and exactly one of them can
 * be the point the camera moves to. Both are choices the person makes here
 * rather than things inferred for them: the first version drew a single box and
 * silently turned it into the zoom as well, which meant "I cannot add a second
 * highlight" and "it never asked me about zoom" were both true.
 */
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ImageOff,
  MousePointerClick,
  PanelsTopLeft,
  Search,
  SkipForward,
  Trash2,
  X,
} from "lucide-react";

export interface FramingStep {
  id: number;
  order: number;
  screenshotPath: string | null;
}

/** A box in percent of the image, the unit every annotation already uses. */
export interface FramingBox {
  x: number;
  y: number;
  w: number;
  h: number;
  /**
   * Whether the camera moves to this box.
   *
   * Carried by the box, rather than held next to the list as "which box is the
   * zoom". That earlier shape used `null` for both "nobody has chosen yet" and
   * "the user chose No zoom", so an explicit No zoom was indistinguishable from
   * an unset one and the next box drawn silently claimed the camera. A boolean
   * per box cannot have that ambiguity, and it puts the control on the thing it
   * belongs to.
   */
  zoom: boolean;
}

/** What one screenshot ends up with. */
export interface FramingResult {
  highlights: FramingBox[];
}

interface Props {
  steps: FramingStep[];
  /** Called once. Screenshots that were skipped are absent. */
  onDone: (result: Record<number, FramingResult>) => void;
  /** Leave the whole flow and open the editor. Nothing is written. */
  onSkipAll: () => void;
}

/** Enough distinct colours that adjacent boxes never share one. */
const BOX_COLORS = ["#FF0099", "#00B8D9", "#FFAB00", "#36B37E", "#6554C0"];

export default function GuidedFraming({ steps, onDone, onSkipAll }: Props) {
  const framable = steps.filter((s) => s.screenshotPath);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Record<number, FramingResult>>({});

  /** Boxes on the screenshot currently shown. */
  const [boxes, setBoxes] = useState<FramingBox[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  /** The box being dragged out right now, before it is committed to the list. */
  const [draft, setDraft] = useState<Omit<FramingBox, "zoom"> | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const imageWrapRef = useRef<HTMLDivElement>(null);

  /**
   * Whether this screenshot failed to load.
   *
   * Worth showing rather than swallowing: the first version of this screen was
   * fed from `step.listByProject`, which returns raw storage keys instead of
   * signed URLs, so every image was a broken `<img>` on an empty canvas with
   * nothing to say what was wrong. A blank drawing surface looks like a working
   * one until you try to drag on it.
   */
  const [imageFailed, setImageFailed] = useState(false);

  const step = framable[index];
  const isLast = index === framable.length - 1;

  // Restore whatever was drawn on this screenshot before, so stepping back and
  // forward does not lose work.
  useEffect(() => {
    if (!step) return;
    const saved = results[step.id];
    setBoxes(saved?.highlights ?? []);
    setSelected(null);
    setDraft(null);
    setImageFailed(false);
    // Keyed on the screenshot only: depending on `results` would fight editing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id]);

  if (!step) return null;

  /** Pointer position as a percentage of the image, clamped to it. */
  const pointToPercent = (e: React.MouseEvent) => {
    const rect = imageWrapRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Clicks on a box's own controls must not start a new drag underneath them.
    if ((e.target as HTMLElement).closest("[data-box-control]")) return;
    const p = pointToPercent(e);
    if (!p) return;
    e.preventDefault();
    dragStart.current = p;
    setDraft({ x: p.x, y: p.y, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragStart.current) return;
    const p = pointToPercent(e);
    if (!p) return;
    const start = dragStart.current;
    setDraft({
      x: Math.min(start.x, p.x),
      y: Math.min(start.y, p.y),
      w: Math.abs(p.x - start.x),
      h: Math.abs(p.y - start.y),
    });
  };

  const handleMouseUp = () => {
    if (!dragStart.current) return;
    dragStart.current = null;

    // Every setState below is called from the handler, never from inside
    // another updater. Nesting them meant the updater was impure, and React's
    // StrictMode runs updaters twice on purpose to surface exactly that - so a
    // single drag appended the box twice and two drags produced four identical
    // boxes stacked on top of each other.
    if (draft && draft.w > 1 && draft.h > 1) {
      const newIndex = boxes.length;
      // Only the very first box on a screenshot gets the camera by default:
      // zooming somewhere is the point of the product, so the common case needs
      // no clicks. Every box after it starts off, and nothing ever reassigns a
      // box the person has already decided about.
      const box: FramingBox = { ...draft, zoom: newIndex === 0 };
      setBoxes((prev) => [...prev, box]);
      setSelected(newIndex);
    }
    // A click rather than a drag leaves nothing behind.
    setDraft(null);
  };

  const removeBox = (i: number) => {
    setBoxes((prev) => prev.filter((_, n) => n !== i));
    setSelected(null);
  };

  const toggleZoom = (i: number) => {
    setBoxes((prev) => prev.map((b, n) => (n === i ? { ...b, zoom: !b.zoom } : b)));
  };

  const advance = (result: FramingResult | null) => {
    const next = { ...results };
    if (result && result.highlights.length > 0) next[step.id] = result;
    else delete next[step.id];

    if (isLast) {
      onDone(next);
      return;
    }
    setResults(next);
    setIndex((i) => i + 1);
  };


  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--sketch-bg)]">
      {/* Header: where you are, and the way out */}
      <header className="flex items-center justify-between gap-4 border-b border-[var(--sketch-border-color)] px-4 py-3">
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-[var(--sketch-fg)]">
            What should we point at?
          </h1>
          <p className="text-xs text-[var(--sketch-fg-muted)]">
            Screenshot {index + 1} of {framable.length}
            <span className="hidden text-[var(--sketch-fg-subtle)] sm:inline">
              {" "}- the quick way to set up highlights and zooms
            </span>
          </p>
        </div>

        <div className="hidden flex-1 items-center gap-1 sm:flex" aria-hidden>
          {framable.map((s, i) => (
            <span
              key={s.id}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < index
                  ? "bg-[var(--sketch-accent)]"
                  : i === index
                    ? "bg-[var(--sketch-accent)]/50"
                    : "bg-[var(--sketch-fg-subtle)]/20"
              }`}
            />
          ))}
        </div>

        {/* Visible, and it says where it goes.
            This has been wrong in both directions. First it was a corner
            control styled like every other button, so the way OUT read as the
            way THROUGH. Then it became a bare underlined link, which nobody
            would find. It is now plainly a button - outlined rather than
            filled, so it does not compete with "Next screenshot" at the bottom
            right - and it names its destination instead of only naming what it
            abandons. */}
        <button
          onClick={onSkipAll}
          className="flex flex-none items-center gap-2 rounded-md border border-[var(--sketch-border-color)] bg-[var(--sketch-surface)] px-3 py-2 text-left transition-colors hover:border-[var(--sketch-accent)]/60 hover:bg-[var(--sketch-fg-subtle)]/5"
        >
          <PanelsTopLeft className="h-4 w-4 flex-none text-[var(--sketch-fg-muted)]" />
          <span className="leading-tight">
            <span className="block text-xs font-semibold text-[var(--sketch-fg)]">
              Skip to the full editor
            </span>
            <span className="block text-[10px] text-[var(--sketch-fg-muted)]">
              Everything here is there too
            </span>
          </span>
          <ArrowRight className="h-3.5 w-3.5 flex-none text-[var(--sketch-fg-subtle)]" />
        </button>
      </header>

      {/* Two ideas, named once, in the order they are used. "I drew two boxes
          but it says four, is the extra two zoom?" was partly a duplication bug
          and partly this: nothing said what a box was for, or that the zoom was
          one OF the boxes rather than a separate thing to draw. */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 border-b border-[var(--sketch-border-color)]/50 bg-[var(--sketch-fg-subtle)]/[0.06] px-4 py-2 text-center text-xs text-[var(--sketch-fg-muted)]">
        <span className="flex items-center gap-1.5">
          <MousePointerClick className="h-3.5 w-3.5 flex-none text-[var(--sketch-accent)]" />
          <strong className="font-semibold text-[var(--sketch-fg)]">Drag a box</strong>
          around anything worth pointing out
        </span>
        <span className="hidden text-[var(--sketch-fg-subtle)] sm:inline">|</span>
        <span className="flex items-center gap-1.5">
          <Search className="h-3.5 w-3.5 flex-none text-[var(--sketch-accent)]" />
          every box is highlighted; <strong className="font-semibold text-[var(--sketch-fg)]">one of them</strong> can also be where the camera zooms
        </span>
      </div>

      {/* The screenshot */}
      <div className="flex flex-1 items-center justify-center overflow-hidden p-4 sm:p-6">
        <div
          ref={imageWrapRef}
          className={`relative max-h-full select-none ${imageFailed ? "" : "cursor-crosshair"}`}
          onMouseDown={imageFailed ? undefined : handleMouseDown}
          onMouseMove={imageFailed ? undefined : handleMouseMove}
          onMouseUp={imageFailed ? undefined : handleMouseUp}
          onMouseLeave={imageFailed ? undefined : handleMouseUp}
        >
          <img
            src={step.screenshotPath ?? undefined}
            alt={`Screenshot ${index + 1}`}
            draggable={false}
            onError={() => setImageFailed(true)}
            onLoad={() => setImageFailed(false)}
            className={`max-h-[58vh] w-auto rounded-lg border border-[var(--sketch-border-color)] shadow-lg ${imageFailed ? "hidden" : ""}`}
          />

          {imageFailed && (
            <div className="grid h-[40vh] w-[60vw] max-w-2xl place-items-center rounded-lg border border-dashed border-[var(--sketch-border-color)] bg-[var(--sketch-fg-subtle)]/5 p-6 text-center">
              <div>
                <ImageOff className="mx-auto h-7 w-7 text-[var(--sketch-fg-subtle)]" />
                <p className="mt-3 text-sm font-medium text-[var(--sketch-fg)]">
                  This screenshot could not be loaded
                </p>
                <p className="mt-1 text-xs text-[var(--sketch-fg-muted)]">
                  Skip it here and check it in the editor.
                </p>
              </div>
            </div>
          )}

          {/* Committed boxes */}
          {!imageFailed &&
            boxes.map((b, i) => {
              const color = BOX_COLORS[i % BOX_COLORS.length];
              const isZoom = b.zoom;
              return (
                <div
                  key={i}
                  data-box-control
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setSelected(i);
                  }}
                  className="absolute cursor-pointer"
                  style={{
                    left: `${b.x}%`,
                    top: `${b.y}%`,
                    width: `${b.w}%`,
                    height: `${b.h}%`,
                    border: `2px solid ${color}`,
                    boxShadow:
                      selected === i
                        ? `0 0 0 2px rgba(255,255,255,0.95), 0 0 0 4px ${color}66`
                        : "0 0 0 1px rgba(255,255,255,0.85)",
                  }}
                >
                  <span
                    className="absolute -top-5 left-0 flex items-center gap-1 rounded px-1.5 text-[10px] font-bold leading-4 text-white"
                    style={{ backgroundColor: color }}
                  >
                    {i + 1}
                    {/* Spelled out. A bare magnifier glyph at 10px told nobody
                        which box the camera was going to. */}
                    {isZoom && (
                      <>
                        <Search className="h-2.5 w-2.5" />
                        ZOOM
                      </>
                    )}
                  </span>
                  <button
                    data-box-control
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      removeBox(i);
                    }}
                    className="absolute -top-5 right-0 grid h-4 w-4 place-items-center rounded-full bg-red-600 text-[10px] leading-none text-white"
                    aria-label={`Remove box ${i + 1}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              );
            })}

          {/* The box being dragged */}
          {draft && draft.w > 0 && draft.h > 0 && (
            <div
              className="pointer-events-none absolute border-2 border-dashed border-white"
              style={{
                left: `${draft.x}%`,
                top: `${draft.y}%`,
                width: `${draft.w}%`,
                height: `${draft.h}%`,
                backgroundColor: "rgba(255,255,255,0.12)",
              }}
            />
          )}
        </div>
      </div>

      {/* One row per box: what it is, whether the camera goes there, and how to
          get rid of it. Zoom sits on the box rather than in a separate picker,
          so "no zoom on this one" is a state of the box and cannot be
          overwritten by drawing the next one. */}
      {boxes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--sketch-border-color)]/50 bg-[var(--sketch-fg-subtle)]/[0.04] px-4 py-2.5">
          <span className="text-[11px] font-medium text-[var(--sketch-fg-muted)]">
            {boxes.length === 1 ? "1 highlight" : `${boxes.length} highlights`}
            <span className="ml-1 text-[var(--sketch-fg-subtle)]">
              - tap the magnifier to zoom into one
            </span>
          </span>

          {boxes.map((b, i) => (
            <span
              key={i}
              onMouseEnter={() => setSelected(i)}
              className={`flex items-center gap-1.5 rounded-full border py-1 pl-2.5 pr-1.5 text-[11px] font-medium transition-colors ${
                selected === i
                  ? "border-[var(--sketch-fg-muted)] bg-[var(--sketch-fg-subtle)]/10"
                  : "border-[var(--sketch-border-color)]"
              }`}
            >
              <span
                className="h-2 w-2 flex-none rounded-full"
                style={{ backgroundColor: BOX_COLORS[i % BOX_COLORS.length] }}
              />
              <span className="text-[var(--sketch-fg)]">Box {i + 1}</span>

              <button
                onClick={() => toggleZoom(i)}
                aria-pressed={b.zoom}
                title={b.zoom ? "Camera zooms here - click to turn off" : "Zoom into this box"}
                className={`ml-0.5 flex items-center gap-1 rounded-full px-1.5 py-0.5 transition-colors ${
                  b.zoom
                    ? "bg-[var(--sketch-accent)] text-white"
                    : "text-[var(--sketch-fg-subtle)] hover:bg-[var(--sketch-fg-subtle)]/15 hover:text-[var(--sketch-fg)]"
                }`}
              >
                <Search className="h-3 w-3" />
                {b.zoom && <span className="text-[10px] font-bold">ZOOM</span>}
              </button>

              <button
                onClick={() => removeBox(i)}
                title={`Remove box ${i + 1}`}
                aria-label={`Remove box ${i + 1}`}
                className="grid h-4 w-4 place-items-center rounded-full text-[var(--sketch-fg-subtle)] hover:bg-red-500/15 hover:text-red-600"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Actions.
          One primary, sized and coloured so it is obviously the way forward,
          and one plainly-worded skip for this screenshot. Both were previously
          the same size and weight, which left nothing saying which was the
          normal thing to do. */}
      <footer className="flex items-center justify-between gap-3 border-t border-[var(--sketch-border-color)] px-4 py-3">
        <button
          onClick={() => advance(null)}
          className="flex items-center gap-1.5 rounded-md border border-[var(--sketch-border-color)] px-3 py-2.5 text-xs font-medium text-[var(--sketch-fg-muted)] hover:bg-[var(--sketch-fg-subtle)]/10 hover:text-[var(--sketch-fg)]"
        >
          <SkipForward className="h-3.5 w-3.5" />
          Skip this screenshot
        </button>

        <div className="flex items-center gap-3">
          {/* Nobody has to get this right first time. Saying so removes the
              pressure to perfect each box, which is what makes a setup step
              feel long. */}
          <span className="hidden text-[11px] text-[var(--sketch-fg-muted)] sm:inline">
            {boxes.length === 0
              ? "Draw a box to continue"
              : "You can fine-tune all of this in the editor afterwards"}
          </span>
          <button
            onClick={() => advance({ highlights: boxes })}
            disabled={boxes.length === 0}
            className="flex items-center gap-2 rounded-md bg-[var(--sketch-accent)] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLast ? (
              <>
                <Check className="h-4 w-4" />
                Done
              </>
            ) : (
              <>
                Next screenshot
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
