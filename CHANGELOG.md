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

- **A guided setup pass replaces meeting the editor cold.** After the import
  dialog, each screenshot is shown on its own with one instruction - drag a box
  around the button or field this step is about - and three ways out: skip this
  screenshot, skip the whole pass and do it in the editor, or finish. The box
  becomes that scene's highlight and its camera move. One screenshot, one
  gesture, no timeline and no tool palette; the opposite of arriving in a
  fifteen-tool editor with a blank project and no idea what is wanted.
- **`step.applyFocus`** stores hand-drawn boxes in exactly the shape the vision
  path writes, so a project framed by hand and one framed automatically are
  indistinguishable afterwards and edit in the same places.
- **`ai.suggestZooms` does something.** It was `const targetX = 30 +
  Math.random() * 40` - a random point near the middle of every frame, commented
  "V1: use center-weighted random suggestions" - and nothing called it. It now
  asks the vision model via `suggestScreenshotFocus` for a box around the element
  each step is about, discarding boxes that come back inverted, off-frame,
  microscopic, or covering most of the shot. It is not run automatically - the
  guided pass asks the person instead - but it is real, and ready behind a
  "suggest these for me" affordance.
- **The narration is written after the guided pass.** "Writing your narration"
  runs once framing is done, and the editor opens with scripts already in it.
  The overlay says the lines are editable and where. It is dismissable while
  generation continues behind it, and on failure the scenes are untouched and
  the editor opens normally.
- **Scripts can be generated from screenshots alone.** `generateScript` refused
  to run unless every scene had a typed description - but the homepage importer
  creates scenes with `description: ""` by design, so the exact flow the
  homepage advertises ("drop in the screenshots you already have, AIVideo writes
  the narration") failed on its first click with *"Step 1 has no description.
  Please write a description for this step first."* A description is now
  required only for a scene with no screenshot. Where screenshots exist the
  request goes to `generateHybridScripts`, which sends the images to the vision
  model - a function that was already written, tested by nothing, and called
  from nowhere.

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

### Changed

- **The create-project dialog opens prefilled.** It opened empty on "120 more
  characters needed" in red, which reads as a wall rather than a prompt - the
  first thing a new project asked for was an essay. Title and description now
  start from `ProjectDefaults`, a real sentence that already clears the floor, so
  the job is "change this to describe your video" rather than "write 120
  characters". Both fields select their default text on first focus, so replacing
  it is one keystroke. The default is deliberately generic and says "Replace
  this": the narration is written from it, so a description left untouched should
  read as unfinished rather than as a decision. The homepage importer now uses
  the same constant, so the two entry points cannot drift.

- **Scenes are screenshots only.** A video could arrive as a scene from three
  places - the file picker (`accept="image/*,video/*"`), a canvas drop, and the
  stock search, which defaulted to `mediaType: "both"` and returned clips
  unasked. Eleven of the fifteen editor tools do nothing to a video scene, so
  those were three routes to a scene most of the editor cannot annotate. All
  three now take pictures, and a dropped video says where it does belong:
  "Videos can be an intro or outro, not a scene."

  **Nothing about video support was removed.** `renderVideoSegment`, the `#video`
  marker, time-anchored camera keyframes and the intro/outro clip upload are all
  untouched, and the stock endpoint still accepts `video` and `both`. Turning
  scene video back on is a one-line change per entry point when there is an
  editor behind it worth having.
- **The intro and outro buttons say what they are.** They were 20px tiles with
  7px labels and their state hidden in a tooltip, reading as decoration between
  the toolbar and the scenes rather than as the controls for the opening and
  closing of the video. Now scene-sized, with INTRO/OUTRO always legible and the
  state written underneath - a duration, "clip", or "None - add".
- **The scene strip is bigger.** It is the spine of the product and it was a row
  of 96px stamps with 8px labels. Tiles are 144px, the scene number and duration
  are legible, and the strip has room to breathe.
- **The guided setup has one obvious next step, and one findable way out.** The
  escape has been wrong in both directions: first "Do this in the editor" in the
  top-right corner styled like every other control, so the way *out* read as the
  way *through*; then a bare underlined "Skip setup" that nobody would find. It is
  now plainly a button - outlined rather than filled, so it does not compete with
  the primary at the bottom right - and it names its destination rather than only
  what it abandons: **"Skip to the full editor / Everything here is there too"**.
  The header calls the setup "the quick way to set up highlights and zooms", so
  its relationship to the editor is stated rather than inferred, and the footer
  says the work can be fine-tuned there afterwards. The forward button is larger
  and reads "Next screenshot" or "Done"; the per-screenshot skip is an outline
  button rather than the same weight as the primary.

- **The selected tool is visible.** Its entire active state was a 15% tint of
  the accent colour, which on a mid-tone toolbar is close to invisible. It is now
  a filled chip - solid accent, white icon, ring - and carries `aria-pressed`.
- **The properties panel is a distinct section.** It was a run of controls
  separated from everything above it by a hairline and a 10px muted label, on the
  same background as its surroundings, so nothing marked where one section ended
  and the next began. It is now a bordered surface with a titled header naming
  the active tool in words rather than its internal mode string.

### Fixed

- **The guided setup only existed for the homepage uploader.** It was launched
  from the import dialog's save handler, and that dialog only opens on
  `?imported=true` - so a project created from the dashboard went straight to the
  editor and never met the setup, however many screenshots were added afterwards.
  It now also opens when a project gains its first scenes while you are looking
  at it, which is exactly the dashboard path: create, land in an empty editor,
  upload, setup follows. Deliberately not on mount for an existing unframed
  project, or it would reappear on every page load until completed. A "Set up
  highlights" button in the timeline reopens it for any project at any time, so
  skipping it is no longer permanent.
- **"No zoom" was forgotten as soon as another box was drawn.** The zoom was
  held next to the box list as "which index is the zoom", using `null` for both
  "nobody has chosen yet" and "the user chose no zoom" - so an explicit choice
  was indistinguishable from an unset one, and the next box drawn claimed the
  camera. Zoom is now a boolean on each box, which cannot carry that ambiguity,
  and the control sits on the box it belongs to: each highlight has its own
  magnifier toggle, defaulting on for the first box on a screenshot and off for
  every one after it. Nothing ever reassigns a box that has been decided about.
  Several boxes on one screenshot can be zoomed into, which `editorMultiZooms`
  and the worker's multi-waypoint renderer already supported.
- **Every box in the guided pass was drawn twice.** `handleMouseUp` called
  `setBoxes` from inside the `setDraft` updater, which makes the updater impure.
  React's StrictMode deliberately invokes updaters twice to surface exactly that,
  so each drag appended its box twice: two drags produced four identical boxes
  stacked on top of one another, and the count read four while only two were
  visible. All the state updates now happen in the handler body.
- **The relationship between a box and the zoom was invisible.** Nothing said
  what a box was for, or that the zoom is one *of* the boxes rather than a
  separate thing to draw - so four boxes and a "zooming into 3" reasonably read
  as "two of these must be zooms". The header now names both ideas before asking
  for either, the box the camera moves to is labelled ZOOM on the image rather
  than carrying a 10px magnifier glyph, and the picker reads "N boxes
  highlighted. Camera zooms into:" instead of a bare "Zoom into:".
- **The guided pass allowed only one highlight, never mentioned zoom, and lost
  what was drawn.** Three faults in one screen. It kept a single box per
  screenshot, so a second drag replaced the first. It silently turned that box
  into the camera move as well, so nothing ever asked about zoom and there was no
  way to highlight something without moving the camera to it. And the editor is
  mounted underneath the framing overlay, seeding its annotations once and
  re-reading the server only when the SET of step ids changes - adding highlights
  to existing scenes changes no id, so the boxes reached the database and never
  reached the editor. Now: any number of boxes per screenshot, each removable,
  with an explicit "Zoom into" row for choosing which one the camera moves to or
  none at all; and the editor is held back until the framing is written, so it
  reads the highlights on its first pass.
- **The guided pass showed no screenshots.** It was fed from
  `step.listByProject`, which returns raw storage keys - only
  `project.getById` runs `signStepUrls` - so every image was
  `<img src="local:users/2/...">` and rendered nothing. It now reads
  `project.steps`, which is signed and already ordered. A failed image also says
  so now, with the drawing surface disabled behind it: a blank canvas looks
  exactly like a working one until you try to drag on it, which is what made
  this take a screenshot to spot.
- **Generated narration never appeared in the Script panel.** The panel synced a
  scene's text from the server only `if (!next[s.id])` - only when it had never
  heard of that scene. The intent was to protect half-typed edits from a
  refetch, but the guard tested presence rather than editing, so the empty entry
  created on mount stayed empty forever: generation would finish, invalidate,
  and every scene would be skipped on the refetch. Only scenes the user has
  actually typed into are protected now.
- **Nothing said the script could be edited.** It arrives written, which reads
  as finished. The Script panel now says so above the controls, and the
  generation overlay names the panel to look in.
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
