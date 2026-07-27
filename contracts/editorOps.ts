/**
 * The edits the AI guide is allowed to make.
 *
 * Deliberately a closed set with a strict schema rather than "let the model
 * write annotation JSON". A model that can emit arbitrary state can emit
 * nonsense state, and the editor would happily save it. Every operation here
 * maps onto something a user could do by hand, is range-checked, and is applied
 * through the same history stack as a manual edit — so undo already covers it
 * and nothing the AI does is unrecoverable.
 */

import { z } from "zod";

/** 0-100, the coordinate space every annotation already uses. */
const pct = z.number().min(0).max(100);

export const editorOpSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("addZoomPoint"),
    targetX: pct,
    targetY: pct,
    zoomScale: z.number().min(1).max(4).default(2),
    duration: z.number().min(1).max(30).default(3),
    script: z.string().max(600).optional(),
  }),
  z.object({ op: z.literal("clearZoomPoints") }),
  z.object({
    op: z.literal("addHighlight"),
    x: pct, y: pct, w: pct, h: pct,
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  }),
  z.object({
    op: z.literal("addBlur"),
    x: pct, y: pct, w: pct, h: pct,
    intensity: z.number().min(2).max(60).optional(),
  }),
  z.object({
    op: z.literal("addRedact"),
    x: pct, y: pct, w: pct, h: pct,
  }),
  z.object({
    op: z.literal("setCrop"),
    x: pct, y: pct, w: pct, h: pct,
  }),
  z.object({
    op: z.literal("setOverlayText"),
    text: z.string().min(1).max(120),
    x: pct, y: pct,
  }),
  z.object({
    op: z.literal("setWatermark"),
    text: z.string().min(1).max(60),
    position: z.enum(["top-left", "top-right", "bottom-left", "bottom-right", "center"]),
  }),
  z.object({
    op: z.literal("setColorFilter"),
    filter: z.enum(["none", "grayscale", "sepia", "warm", "cool", "contrast"]),
  }),
  z.object({ op: z.literal("setScript"), text: z.string().min(1).max(2000) }),
  z.object({ op: z.literal("setDuration"), seconds: z.number().min(1).max(120) }),
]);

export type EditorOp = z.infer<typeof editorOpSchema>;

export const editorOpsResponseSchema = z.object({
  /** One sentence the user sees, describing what was changed. */
  summary: z.string().max(300),
  ops: z.array(editorOpSchema).max(12),
});

export type EditorOpsResponse = z.infer<typeof editorOpsResponseSchema>;

/** Describes the operations to the model. Kept next to the schema so they cannot drift. */
export const EDITOR_OPS_REFERENCE = `
Available operations. Coordinates are percentages of the screenshot, 0-100,
where x/y is the TOP-LEFT of a region and w/h are its size.

- addZoomPoint   {targetX, targetY, zoomScale?, duration?, script?}
    Camera moves to this point. targetX/targetY are the CENTRE of what to look
    at. zoomScale 1.5 is gentle, 2 is standard, 3 is tight. Give it a "script"
    when the user says what should be said there.
- clearZoomPoints {}
- addHighlight   {x, y, w, h, color?}   coloured box around a UI element
- addBlur        {x, y, w, h, intensity?}
- addRedact      {x, y, w, h}           solid block, for secrets
- setCrop        {x, y, w, h}           keep only this region
- setOverlayText {text, x, y}           label on the screenshot
- setWatermark   {text, position}       fixed to a frame corner
- setColorFilter {filter}
- setScript      {text}                 the scene's narration
- setDuration    {seconds}

Rules:
- Every zoom point lengthens the scene by at least 2s of hold plus 2.5s of pan.
  Do not add more than the user asked for.
- Use addRedact, not addBlur, for passwords, keys and tokens.
- If the request is ambiguous about WHERE, do not guess coordinates: return no
  ops and ask in the summary.
`.trim();
