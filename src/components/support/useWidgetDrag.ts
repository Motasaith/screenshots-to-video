import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Lets the support widget be moved out of the way.
 *
 * Only used in the editor. Everywhere else the bottom-right corner is empty, but
 * the editor has a vertical tool strip against the right edge and a toolbar
 * along the bottom, and no fixed position is clear of both on every screen size.
 * Shifting the default inset helped and did not solve it, so the person using it
 * gets to decide.
 *
 * The position is an offset from the normal corner rather than absolute
 * coordinates. That way the widget still anchors itself correctly when the window
 * is resized, and a position stored on a large monitor does not put it off screen
 * on a laptop.
 *
 * The offset lives in a ref and is written straight to the element's transform,
 * not held in state. A drag would otherwise re-render the whole widget on every
 * pointer move, and the position has to be applied when the element mounts
 * anyway, since the launcher and the open panel are different elements.
 */

const STORAGE_KEY = "aivideo:support:offset";

/** Distance from the viewport edge the widget is never dragged past. */
const EDGE_GAP = 8;

/** Pointer travel below this is a click, not a drag. */
const CLICK_SLOP = 4;

interface DragOffset {
  x: number;
  y: number;
}

const ORIGIN: DragOffset = { x: 0, y: 0 };

function readStored(): DragOffset {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return ORIGIN;
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof (parsed as DragOffset).x === "number" &&
      typeof (parsed as DragOffset).y === "number"
    ) {
      return { x: (parsed as DragOffset).x, y: (parsed as DragOffset).y };
    }
  } catch {
    // Unreadable storage just means it starts in the corner.
  }
  return ORIGIN;
}

function clamp(value: number, min: number, max: number): number {
  // `min` can exceed `max` when the element is larger than the viewport, in which
  // case the top-left edge wins and the far edge is allowed to overflow.
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

export interface WidgetDrag {
  /** True while a drag is in progress, for the cursor and handle colour. */
  isDragging: boolean;
  /** Attach to whatever should be grabbable. */
  onPointerDown: (event: React.PointerEvent) => void;
  /** True if the last pointer interaction moved, so a click can be ignored. */
  wasDragged: () => boolean;
  /** Put it back in the corner. */
  reset: () => void;
  /** Attach to the fixed wrapper being positioned. */
  attachRef: (node: HTMLDivElement | null) => void;
  /** Whether this widget can be moved at all. */
  enabled: boolean;
}

export function useWidgetDrag(
  enabled: boolean,
  /**
   * Anything that changes the widget's size. Opening the panel turns a 52px
   * button into a 400px window, which can push a stored offset off screen, so
   * the bounds have to be rechecked when it changes.
   */
  settleOn?: unknown
): WidgetDrag {
  const [isDragging, setIsDragging] = useState(false);

  const element = useRef<HTMLDivElement | null>(null);
  const offset = useRef<DragOffset>(ORIGIN);
  /**
   * When a drag last moved the widget.
   *
   * A timestamp rather than a boolean. A boolean set by the drag has to be
   * cleared by something, and the click that follows a drag does not always
   * reach the launcher button: the pointer went down on the grip, so the click
   * lands on their common ancestor instead. The flag then stayed set and every
   * later click was swallowed, leaving a widget that could no longer be opened.
   */
  const draggedAt = useRef(0);
  /** Removes the listeners for the gesture in progress, if there is one. */
  const detach = useRef<(() => void) | null>(null);
  /** Storage is read once, the first time dragging becomes available. */
  const restored = useRef(false);

  /** Position the element. The only place the transform is written. */
  const paint = useCallback(() => {
    const node = element.current;
    if (!node) return;
    const { x, y } = offset.current;
    node.style.transform = x === 0 && y === 0 ? "" : `translate3d(${x}px, ${y}px, 0)`;
  }, []);

  const persist = useCallback((next: DragOffset) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Position simply does not survive the session.
    }
  }, []);

  /** Keep the element within the viewport, moving it as little as possible. */
  const settle = useCallback(() => {
    const node = element.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const now = offset.current;

    const next = {
      x: clamp(
        now.x,
        now.x + (EDGE_GAP - rect.left),
        now.x + (window.innerWidth - EDGE_GAP - rect.right)
      ),
      y: clamp(
        now.y,
        now.y + (EDGE_GAP - rect.top),
        now.y + (window.innerHeight - EDGE_GAP - rect.bottom)
      ),
    };
    if (next.x === now.x && next.y === now.y) return;

    offset.current = next;
    paint();
    persist(next);
  }, [paint, persist]);

  /**
   * The element arriving is what triggers the first paint.
   *
   * The widget mounts once at the app root, before the editor has registered
   * itself, so a stored position cannot be read during the first render. It is
   * read here instead, and re-applied whenever the element is swapped, which is
   * what opening and closing the panel does.
   */
  const attachRef = useCallback(
    (node: HTMLDivElement | null) => {
      element.current = node;
      if (!node || !enabled) return;

      if (!restored.current) {
        restored.current = true;
        offset.current = readStored();
      }
      paint();
    },
    [enabled, paint]
  );

  /**
   * Listeners are attached here, imperatively, rather than in an effect keyed on
   * `isDragging`.
   *
   * An effect only runs after React commits the render, and the pointer moves can
   * all arrive before that: a quick drag moved nothing at all, because the
   * listeners went on after the gesture was already over. Attaching them inside
   * the handler means they exist before the next event can be delivered.
   */
  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (!enabled) return;
      const node = element.current;
      if (!node) return;

      detach.current?.();

      const rect = node.getBoundingClientRect();
      const from = offset.current;
      // Bounds in offset space, measured from where the widget is right now.
      const bounds = {
        minX: from.x + (EDGE_GAP - rect.left),
        maxX: from.x + (window.innerWidth - EDGE_GAP - rect.right),
        minY: from.y + (EDGE_GAP - rect.top),
        maxY: from.y + (window.innerHeight - EDGE_GAP - rect.bottom),
      };
      const pointerX = event.clientX;
      const pointerY = event.clientY;

      const move = (e: { clientX: number; clientY: number }) => {
        const dx = e.clientX - pointerX;
        const dy = e.clientY - pointerY;
        if (Math.abs(dx) > CLICK_SLOP || Math.abs(dy) > CLICK_SLOP) draggedAt.current = Date.now();
        offset.current = {
          x: clamp(from.x + dx, bounds.minX, bounds.maxX),
          y: clamp(from.y + dy, bounds.minY, bounds.maxY),
        };
        paint();
      };

      const remove = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", end);
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", end);
        detach.current = null;
      };

      const end = () => {
        remove();
        setIsDragging(false);
        persist(offset.current);
      };

      // Mouse events as well as pointer events: some input paths and automation
      // deliver only the mouse pair. Both call the same handler, which is
      // idempotent for a given cursor position.
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", end);
      detach.current = remove;

      setIsDragging(true);
      // Stops the drag from also selecting the label text beside the handle.
      event.preventDefault();
    },
    [enabled, paint, persist]
  );

  /** Never leave listeners behind if the widget unmounts mid-drag. */
  useEffect(() => () => detach.current?.(), []);

  /**
   * Recheck the bounds after the window changes shape, or after the panel opens
   * at a size the stored offset was never measured against. A widget parked off
   * the edge with no way to reach it is worse than one in the corner.
   */
  useEffect(() => {
    if (!enabled) return;

    // After layout, so the rect is the real one.
    const id = requestAnimationFrame(settle);
    window.addEventListener("resize", settle);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", settle);
    };
    // Re-runs when the widget changes size, which is what opening it does.
  }, [enabled, settle, settleOn]);

  const reset = useCallback(() => {
    offset.current = ORIGIN;
    paint();
    persist(ORIGIN);
  }, [paint, persist]);

  /**
   * True only for the click the browser synthesises at the end of a drag, which
   * arrives in the same moment the pointer is released.
   */
  const wasDragged = useCallback(() => Date.now() - draggedAt.current < 150, []);

  return { isDragging, onPointerDown, wasDragged, reset, attachRef, enabled };
}
