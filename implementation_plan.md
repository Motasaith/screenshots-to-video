# Step 4 Preview & Editor — Video-Editor-Style Redesign

## Goal

Transform Step 4 (Preview & Editor) from a scrollable, vertically-stacked form layout into a **professional video-editor-style interface** with:

- A **left sidebar** containing all tools, tool properties, transitions, and captions settings (no scrolling through cards below the canvas)
- A **right main area** with the canvas on top and a **horizontal timeline** strip at the bottom showing all screenshots with drag-and-drop transition slots between them
- Everything visible at once — no scrolling to find settings

## Current Architecture Summary

| Component | File | Role |
|---|---|---|
| `StepPreview` | [StepPreview.tsx](file:///d:/try/ai_video_05/src/components/wizard/StepPreview.tsx) | Step 4 wrapper — renders header, `<StepEditorPanel>`, transitions card, captions card, and nav buttons |
| `StepEditorPanel` | [StepEditorPanel.tsx](file:///d:/try/ai_video_05/src/components/wizard/StepEditorPanel.tsx) | 3750-line editor — toolbar row on top, grid with step thumbnails on left + canvas in center, and properties panel below |
| `Wizard` | [Wizard.tsx](file:///d:/try/ai_video_05/src/pages/Wizard.tsx) | Page layout — renders step components inside a `<main>` tag with `overflow-y-auto` |

### Current Layout (Vertical Stack)
```
┌──────────────────────────────────────┐
│  Toolbar (horizontal button strip)    │
├──────────────────────────────────────┤
│  [Step thumbs] │  [Canvas]           │  ← grid cols
├──────────────────────────────────────┤
│  Properties Panel (below canvas)     │  ← must scroll to reach
├──────────────────────────────────────┤
│  Transitions Card                    │  ← must scroll even further
├──────────────────────────────────────┤
│  Captions Card                       │  ← must scroll even further
├──────────────────────────────────────┤
│  Back / Continue buttons             │
└──────────────────────────────────────┘
```

### Proposed Layout (Video Editor)
```
┌──────────────────────────────────────────────────┐
│  Compact Toolbar (undo/redo, save, zoom, step)   │
├──────────┬───────────────────────────────────────┤
│  LEFT    │  RIGHT                                │
│  SIDEBAR │                                       │
│          │  ┌───────────────────────────────┐    │
│  Tools   │  │                               │    │
│  (icons) │  │       CANVAS AREA             │    │
│          │  │                               │    │
│  ─────── │  └───────────────────────────────┘    │
│          │                                       │
│  Props   │  ┌───────────────────────────────┐    │
│  Panel   │  │  TIMELINE                     │    │
│  (active │  │  [1]→⬥→[2]→⬥→[3]→⬥→[4]→⬥→[5]│    │
│   tool)  │  │  ↑ transition slots           │    │
│          │  │  (click to pick transition)    │    │
│  ─────── │  └───────────────────────────────┘    │
│          │                                       │
│ Captions │  [Back]            [Continue]          │
│ Transit  │                                       │
│ settings │                                       │
├──────────┴───────────────────────────────────────┤
```

## Proposed Changes

### StepPreview.tsx

#### [MODIFY] [StepPreview.tsx](file:///d:/try/ai_video_05/src/components/wizard/StepPreview.tsx)

- **Remove** the separate Transitions card (lines 136-277) and Captions card (lines 163-257) — these settings will move **into** the left sidebar inside `StepEditorPanel`
- **Remove** the `<h2>` header, step counter badge, and description paragraph — the editor will be immersive/full-width
- Pass transitions and captions state as **props** to `<StepEditorPanel>` so the sidebar can render their controls
- Keep the `handleContinue` save logic and the Back/Continue buttons, but move them into a compact footer bar

---

### StepEditorPanel.tsx

#### [MODIFY] [StepEditorPanel.tsx](file:///d:/try/ai_video_05/src/components/wizard/StepEditorPanel.tsx)

This is the biggest change. The file restructures from a vertical layout to a **horizontal split layout**:

**1. New top-level layout** — Change from the current `grid-cols-[120px_1fr]` to:
```
flex h-full
  ├── Left Sidebar (w-72, flex-shrink-0, overflow-y-auto)
  │     ├── Tool Icon Grid (compact 2-col grid of tool buttons — icons only, with tooltip labels)
  │     ├── Divider
  │     ├── Active Tool Properties Panel (the existing properties for the active tool)
  │     ├── Divider
  │     ├── Transitions Section (moved from StepPreview — global transition picker + duration slider)
  │     ├── Divider
  │     └── Captions Section (moved from StepPreview — enable/style/size/position/color)
  └── Right Main (flex-1, flex-col)
        ├── Compact toolbar bar (step nav, zoom controls, undo/redo, save)
        ├── Canvas area (flex-1, the existing interactive canvas)
        └── Timeline strip (h-24, flex-shrink-0)
              └── Horizontal scrollable strip of screenshot thumbnails
                  with clickable transition diamonds between each pair
```

**2. Tool buttons** — Convert from horizontal `flex-wrap` row to a **compact icon-only grid** in the sidebar (2 columns). Show tool name on hover as a tooltip instead of inline text. This saves massive horizontal space.

**3. Timeline strip** — New bottom section showing:
- All step screenshots as small thumbnails in a horizontal strip
- Clicking a thumbnail selects that step (replaces the current left-panel thumbnail list)
- Between each pair of thumbnails, a small **diamond/transition icon** that the user can click to pick the transition type for that pair from a dropdown
- Active step is highlighted with a border glow
- The strip scrolls horizontally if there are many steps

**4. Properties panel** — Moves from below the canvas into the left sidebar. All the existing tool properties (caption, zoom, overlay, crop, blur, redact, watermark, pixelate, spotlight, badge, magnify, filter, multizoom) render in the same scrollable sidebar area.

**5. Transitions & Captions controls** — Move from the separate cards in StepPreview into collapsible sections at the bottom of the left sidebar.

**6. Accept new props** — The component will accept optional props for transitions and captions state from StepPreview, so that saving still works correctly.

---

### Wizard.tsx

#### [MODIFY] [Wizard.tsx](file:///d:/try/ai_video_05/src/pages/Wizard.tsx)

- When on the Preview step, the `<main>` wrapper should switch to `overflow-hidden` instead of `overflow-y-auto` to prevent double scrollbars and give the editor full viewport height control.

## Open Questions

> [!IMPORTANT]
> **Per-step transitions**: Currently all steps share a single global transition. The timeline allows setting transitions between *each pair* of screenshots. Should I implement per-step transitions (stored on each step record) or keep a single global transition but allow visual selection from the timeline?
> **I recommend per-step** since the DB already has a `transition` field on each step.

> [!NOTE]
> The step thumbnail sidebar (left column, 120px) currently in StepEditorPanel will be **removed** and replaced by the bottom timeline strip. This is a net improvement — users see all steps at a glance horizontally instead of vertically scrolling a narrow panel.

## Verification Plan

### Automated Tests
```bash
npx tsc --noEmit
npm run build
```

### Manual Verification
- Verify the left sidebar shows all 14+ tools as an icon grid
- Verify clicking a tool shows its properties in the sidebar below
- Verify the canvas still works with all interactions (drag, zoom, pan, draw)
- Verify the timeline shows all screenshots and clicking selects a step
- Verify clicking transition diamonds between screenshots lets user pick a transition
- Verify captions and transitions settings are accessible in the sidebar
- Verify Back/Continue buttons save all data correctly
- Verify the layout does not scroll — everything fits in viewport
