import type { EditorOp } from "@contracts/editorOps";

/**
 * Fold AI-proposed operations into a scene's annotation state.
 *
 * Returns a NEW annotation object rather than mutating, so the caller hands it
 * to `pushHistory` exactly like a manual edit. That is the whole safety story:
 * an AI change lands on the undo stack, so Ctrl+Z reverses it and nothing it
 * does is unrecoverable.
 *
 * Unknown operations are ignored rather than throwing: the server already
 * validated against the schema, and a scene half-edited by a future op name is
 * worse than one edit silently skipped.
 */
/** Annotation values are heterogeneous JSON, so reads are narrowed explicitly. */
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const asNumber = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

export function applyEditorOps<T extends Record<string, unknown>>(
  current: T,
  ops: EditorOp[],
  makeId: () => string
): T {
  const next: Record<string, unknown> = { ...current };

  for (const op of ops) {
    switch (op.op) {
      case "addZoomPoint":
        next.editorMultiZooms = [
          ...asArray(next.editorMultiZooms),
          {
            id: makeId(),
            targetX: op.targetX,
            targetY: op.targetY,
            zoomScale: op.zoomScale,
            duration: op.duration,
            ...(op.script ? { script: op.script } : {}),
          },
        ];
        // A zoom point is inert unless the scene's zoom is enabled at all.
        next.editorZoomScale = Math.max(asNumber(next.editorZoomScale, 1), op.zoomScale);
        next.zoomTargetX = op.targetX;
        next.zoomTargetY = op.targetY;
        break;

      case "clearZoomPoints":
        next.editorMultiZooms = [];
        break;

      case "addHighlight":
        next.editorHighlights = [
          ...asArray(next.editorHighlights),
          { id: makeId(), x: op.x, y: op.y, w: op.w, h: op.h, color: op.color ?? "#FF0099" },
        ];
        break;

      case "addBlur":
        next.editorBlurs = [
          ...asArray(next.editorBlurs),
          { id: makeId(), x: op.x, y: op.y, w: op.w, h: op.h, intensity: op.intensity ?? 20 },
        ];
        break;

      case "addRedact":
        // Appends, like addBlur and addHighlight. This used to write the single
        // `editorRedactX..H` rectangle, so two addRedact ops in one response
        // left only the last one: the model would ask to cover a password and a
        // token and only the token got covered.
        next.editorRedacts = [
          ...asArray(next.editorRedacts),
          { id: makeId(), x: op.x, y: op.y, w: op.w, h: op.h, color: "#000000" },
        ];
        break;

      case "setCrop":
        next.editorCropX = op.x;
        next.editorCropY = op.y;
        next.editorCropW = op.w;
        next.editorCropH = op.h;
        break;

      case "setOverlayText":
        next.editorOverlayText = op.text;
        next.editorOverlayX = op.x;
        next.editorOverlayY = op.y;
        break;

      case "setWatermark":
        next.editorWatermarkText = op.text;
        next.editorWatermarkPosition = op.position;
        break;

      case "setColorFilter":
        next.editorColorFilter = op.filter;
        break;

      case "setDuration":
        next.editorDuration = op.seconds;
        break;
    }
  }

  return next as T;
}

/** Plain-English description of an op, for showing what the AI is about to do. */
export function describeOp(op: EditorOp): string {
  switch (op.op) {
    case "addZoomPoint":
      return `Zoom to ${Math.round(op.targetX)}%, ${Math.round(op.targetY)}% at ${op.zoomScale}x for ${op.duration}s`;
    case "clearZoomPoints": return "Remove all zoom points";
    case "addHighlight": return "Add a highlight box";
    case "addBlur": return "Blur a region";
    case "addRedact": return "Redact a region";
    case "setCrop": return "Crop the scene";
    case "setOverlayText": return `Add text: "${op.text}"`;
    case "setWatermark": return `Watermark "${op.text}" (${op.position})`;
    case "setColorFilter": return `Colour filter: ${op.filter}`;
    case "setDuration": return `Set duration to ${op.seconds}s`;
    default: return "Edit the scene";
  }
}
