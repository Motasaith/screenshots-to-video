# Changelog

All notable changes to this project are recorded here. The current rollback
point is tracked in [VERSION.md](VERSION.md).

The format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

Baseline for this section: `912372f` — see [VERSION.md](VERSION.md) for how to
return to it.

### Requires a migration

`drizzle/manual/0010_editor_multi_badge_redact.sql` adds two nullable JSON
columns to `steps` (`editorRedacts`, `editorBadges`). Existing rows are
untouched and keep rendering exactly as before, because the renderer falls back
to the old scalar columns whenever the new arrays are absent or empty.

**The code cannot run against a database without these columns.** Drizzle names
every column of `steps` in its INSERT, so until they exist *every* `step.create`
fails - which takes down both the editor upload and the homepage importer, with
the generic "Something went wrong on our side. Quote reference ..." message. If
that message appears, check the server log for `tRPC internal error [<ref>]` and
look for `editorRedacts` in the failed statement.

Applied to the Aiven dev database on 2026-08-29 (959 step rows, all NULL in both
new columns). `deploy.sh` runs `npm run db:push` before restarting, which diffs
`db/schema.ts` against the target and adds the columns there too - adding a
nullable column is a silent, non-destructive change for push.

### Added

- **Insert a scene at any position.** A hover-revealed insert point sits between
  every pair of scenes in the timeline; the "Add Scene" button at the end still
  appends. Previously new scenes could only land at the end, so putting one in
  the middle meant adding it and dragging it back up - straight into the reorder
  bug below.

- **Multiple badges per scene.** `steps.editorBadges` holds the list. Placing a
  badge appends to it, numbering continues from the highest badge already on the
  scene, and each one can be dragged, recoloured and deleted independently.
- **Multiple redaction bars per scene.** `steps.editorRedacts` holds the list,
  with the same drag/resize/delete affordances the blur and pixelate regions
  already had.
- **Per-region strength editing.** Blur, pixelate and spotlight panels now say
  which region they are editing and switch target when a region is clicked on
  the canvas.

### Fixed

- **Reordering scenes was slow, and broke outright on large projects.** The
  editor spliced the list client-side and then awaited one `step.update` per
  scene, serially, for *every* scene rather than the few that moved - and the
  timeline strip has no ordering state of its own, so nothing moved on screen
  until all of them landed and two queries refetched. Measured against live
  data: ~2s of dead time on a 16-scene project, ~13s on a 112-scene one. Worse,
  `step.update` is capped at 30/minute, so the two largest projects here (112
  and 94 scenes) could not complete a single drag: the loop died part way and
  left the ordering half-written. Project 54 is still carrying that damage - 112
  scenes sharing 14 distinct order values, which makes its render sequence
  unstable. There is now a `step.reorder` mutation that takes the whole ordered
  list, writes only the positions that changed, does it in one transaction, and
  costs one rate-limit unit; the cache updates optimistically so the strip
  follows the cursor, and rolls back if the server refuses. The first reorder of
  a damaged project renumbers it back to 1..N.
- **Zoom survived clearing every zoom point.** Placing a point writes three
  things: the point, the legacy `zoomTargetX`/`Y` the single-zoom render path
  reads, and `editorZoomScale`, which is what arms zoom at all. The panel's
  "Clear all" and a point's "Remove" emptied only the array - and with an empty
  array the worker skips the multi-zoom path and falls through to exactly that
  single-zoom fallback, so the scene kept zooming after every point was deleted.
  Emptying the list now disarms the fallback too, which is what the toolbar's own
  "Clear Zoom" had always done; all three routes share one helper so they cannot
  disagree again. An audit found 253 existing steps in this state, including
  three in the project the bug was reported against.
- **The per-scene caption styling controls did nothing.** Position, Style,
  Colour and Size in the scene's caption panel write
  `editorCaptionStyle`/`Size`/`Position`/`Color`, which the renderer reads only
  when the scene has its own caption text - otherwise the scene is subtitling
  narration and the project's settings describe it. Left enabled, they were four
  controls that silently changed nothing, which is what the "caption size does
  not work" report turned out to be. They are now scoped to the caption text
  they belong to, disabled without it, and point at the project Captions panel
  instead. Project-level caption sizing is covered by tests: small/medium/large
  resolve to font sizes 54/76/97 at 1080p.
- **Intro and outro could not be switched off.** The render worker read
  `introVideoPath` before `introTemplate`, so the stored upload outranked the
  dropdown that selects it. Once a project had ever had a custom intro it kept
  rendering one however the dropdown was set: choosing "None" removed nothing,
  and choosing a text template silently played the old clip instead. The
  template is now the choice and the path only the file it points at, which is
  the rule `Timeline.tsx` had always drawn its preview under - hence the editor
  showing no intro while the render still added one. Auditing the live database
  found 3 such decisions across 207 projects: one project set to "None" still
  emitting a clip, and one that had picked `dark-minimal`/`warm-title` and was
  getting its old uploads instead of either. The uploaded file is deliberately
  kept when the template moves away from "custom-video", so switching back
  restores it. Extracted as `api/lib/bumper.ts` with tests, so intro and outro
  cannot drift apart again.
- **"Custom video" with nothing uploaded rendered a stray blue title card.**
  `renderTextSegment` falls back to a default blue card for any template it does
  not recognise, and `custom-video` fell through to it whenever no file had been
  picked yet. No file now means no segment.
- **A badge could only be placed once per scene.** The editor wrote a single
  `editorBadgeNumber`/`editorBadgeX`/`editorBadgeY` triple, so the second badge
  placed on a scene moved the first one instead of joining it. Badges are now a
  list end to end: schema, tRPC input, both FFmpeg render paths and the canvas.
- **A scene could only be redacted in one place.** Identical cause — one
  `editorRedactX..H` rectangle per step — and the same fix. Note that the legacy
  scalars are cleared once migrated, otherwise emptying the list would let the
  renderer's fallback draw the old bar straight back.
- **The AI `addRedact` operation overwrote instead of appending.** Two
  `addRedact` ops in one response left only the last one, so a request to cover
  both a password and a token covered only the token.
- **Blur previewed in the wrong place on large screens.** The preview used
  `backdrop-filter`, which samples whatever is painted behind the element. The
  canvas sits under a `transform: scale()` that is 1.0 only when the viewport
  happens to fit the fixed 640x360 box; on a larger screen the scale rises above
  1 and Chrome sampled the backdrop from the wrong position, smearing content
  from elsewhere in the frame into the box. The preview now blurs a real clipped
  copy of the media, which has no backdrop to misplace and so lands identically
  at any scale.
- **The blur preview covered the whole canvas.** Follow-up to the fix above, and
  a defect introduced by it: the clipping wrapper had `overflow-hidden` but was
  statically positioned, and `overflow` only clips an absolutely positioned child
  when the overflow element sits in that child's containing-block chain. The
  blurred copy resolved against the region wrapper one level up instead, escaped
  the clip entirely, and painted a full-size blurred screenshot over the entire
  scene however small the region was. The wrapper is now `relative`, which makes
  it the containing block and the clip effective. Percentage bases are unchanged,
  since the wrapper is exactly the region's size.
- **Blur preview reworked to pixel geometry and to fail closed.** The clipped
  copy was positioned with a chain of percentages that had to resolve through the
  region box, its border and `box-sizing` before landing on the original. Too
  many ways to be wrong, and one of them was live. It is now placed in pixels
  straight off `bounds`, and the clip wrapper carries an opaque tint so a copy
  that cannot be drawn shows as covered rather than leaving the region
  transparent over the very content it exists to hide.
- **Blur previewed at the wrong strength.** The stored number is the `gblur`
  sigma FFmpeg applies to the full-resolution source, but it was being handed
  straight to CSS. Two conversions were missing: the display scale
  (`visibleW / naturalW`) and the fact that CSS `blur(R)` is a Gaussian of sigma
  `R/2`. Both are applied now.
- **The strength slider changed every region at once.** Each region stores its
  own `intensity` / `blockSize` and both the preview and the filter prefer it, so
  a slider that only wrote the step default looked dead once a region existed.
  The earlier fix for that wrote *all* regions, which is why raising the block
  size on one pixelated area coarsened every other area on the scene. The slider
  now edits the selected region, falling back to the most recently drawn one, and
  writes the step default only when nothing has been drawn yet.
- **Long overlay text ran off both edges of the frame.** `drawtext` neither wraps
  nor clamps, and the filter was a single line at `x=<anchor>-text_w/2`, so "AI
  Powered Video Background Remover & Changer" on a 9:16 frame rendered as
  "...wered Video Background Remov...". The label now wraps to the frame width,
  stacks around the anchor and clamps every line inside the frame. The canvas
  preview runs the same wrap and clamp against the same numbers instead of a
  fixed 12/16/20px unwrapped line, so it agrees with the export.
- **Animated cursor renders silently fell back.** `cursorOverlay.ts` emitted
  `min(n/30\\,1)`, which reaches ffmpeg's expression evaluator as `min(n/30\,1)`
  and is rejected with "Missing ')' or too many args". Every render carrying a
  cursor therefore failed the primary pipeline and dropped to the fallback
  renderer, which has no supersampling and draws no cursor at all. Quoting alone
  protects the comma, which is the form the rest of the file already used. Found
  while verifying the overlay clamp expression against the real binary; not part
  of the reported batch.

## [3.0.0] — 912372f — 2026-08-19

Stable rollback point.

### Fixed

- **Editor uploads never appeared on the canvas.** The timeline upload handler
  created the step first, using a `blob:` object URL as `screenshotPath` for an
  instant preview, then patched in the real storage key once the upload
  finished. `step.create` validates that field with `isStorableMediaRef`, which
  rejects every URL scheme except the app's own `local:` prefix — so the create
  threw on every file, the `catch` logged and moved on, and the upload never
  started. The only symptom was the timeline's "Uploading n…" counter draining
  to zero with nothing added. Now uploads run first and the step is created
  from the returned storage key, matching the homepage importer. Failures
  surface as a per-file toast instead of a silent console line, and the loop is
  paced at 200ms because `/api/upload` and `step.create` are both capped at
  60/minute.
- **Caption size, style, position and colour were ignored on export.** The
  renderer picked each field as `opts.editorCaptionX || opts.captions?.x`, but
  `steps.editorCaptionSize`/`Style`/`Position`/`Color` are `NOT NULL` with
  defaults, so every step carried a truthy value whether or not anyone set one
  and the project-level choice was never reachable. The styling is now selected
  as one group tied to whichever caption *text* won: per-scene styling applies
  only when the scene has its own `editorCaptionText`.
- **Captions and watermarks rendered at half size on scenes without zoom.** The
  filter chain was `[zoom, watermark, captions, downscale]`. Caption font size
  is derived from the output height, but the base frame is a supersampled
  canvas up to 2x that. With no zoom, `zoompan` is absent and the trailing
  `scale` is the only thing returning the frame to output resolution, so text
  was drawn full-size on the 2x canvas and shrunk along with it. Reordered to
  `[zoom, downscale, watermark, captions]`, which also rasterises text at final
  resolution instead of resampling it.
