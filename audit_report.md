# AIVideo — Project Audit: Done vs. Remaining

## Summary

Your project has a **solid scaffold** — the Vite + Hono/tRPC architecture, database schema, design system, all 7 wizard steps, landing page sections, and API routes are built. But almost everything is **UI-only with mock/simulated data**. The actual backend pipeline (file uploads, AI LLM calls, TTS, FFmpeg rendering) is not implemented yet. Below is the full breakdown.

---

## ✅ What's Done

### Tech Stack / Infrastructure
| Item | Status | Notes |
|------|--------|-------|
| Vite + React frontend | ✅ Done | Using Vite 7, React 19, TypeScript |
| Hono + tRPC backend | ✅ Done | API server with typed routes |
| Drizzle ORM + MySQL schema | ✅ Done | `projects`, `steps`, `renderJobs`, `users` tables |
| Tailwind CSS + Design System | ✅ Done | Neo-brutalism theme, Syne/DM Sans/JetBrains Mono fonts |
| Light/Dark mode CSS variables | ✅ Done | HSL color tokens matching the plan |
| Neo-brutalism component classes | ✅ Done | `neo-card`, `neo-btn-primary`, `neo-btn-ghost`, grid pattern |
| Framer Motion animations | ✅ Done | Page transitions, step animations, fade-ins |
| Zustand wizard store | ✅ Done | Step state management across wizard |
| React Router routes | ✅ Done | `/`, `/login`, `/dashboard`, `/pricing`, `/settings`, `/create/:id/:step` |
| Dockerfile | ✅ Done | Basic Docker setup present |

### Frontend Pages
| Page | Status | Notes |
|------|--------|-------|
| Landing Page `/` | ✅ Done | All 9 sections: Hero, Social Proof, Features, How It Works, Stats, Testimonials, Pricing Teaser, CTA, Footer |
| Navbar | ✅ Done | Sticky, scroll-aware, mobile hamburger, auth-aware |
| Pricing `/pricing` | ✅ Done | 3 tiers (Free/Pro/Team), brutalist cards |
| Login `/login` | ✅ Done | Kimi OAuth flow (not standard Supabase Auth) |
| Dashboard `/dashboard` | ✅ Done | Project list, stats cards, delete confirmation, empty state |
| Settings `/settings` | ✅ Done | Profile, billing, preferences, danger zone |
| 404 Not Found | ✅ Done | Custom page |

### 7-Step Wizard (All UI Built)
| Step | Status | Notes |
|------|--------|-------|
| Step 1 — Setup | ✅ Done | Title, description, platform selector, AI validation feedback |
| Step 2 — Upload | ✅ Done | Multi-step cards, file picker, descriptions, add/remove |
| Step 3 — Script | ✅ Done | Script display, inline editing, word count, regenerate |
| Step 4 — Annotate | ✅ Done | Canvas with point/rect modes, drag-to-draw, step sidebar |
| Step 5 — Voice | ✅ Done | Voice grid, speed slider, resolution, music toggle |
| Step 6 — Render | ✅ Done | Progress bar, stage indicators, polling simulation |
| Step 7 — Export | ✅ Done | Video placeholder, metadata, step breakdown, AI quality review |
| AI Guide Panel | ✅ Done | Chat interface, quick questions, collapsible, messages |
| Progress Bar | ✅ Done | 7 connected nodes with completed/active/upcoming states |

### Backend API Routes
| Route | Status | Notes |
|------|--------|-------|
| `project.list` | ✅ Done | Fetches user projects |
| `project.getById` | ✅ Done | Fetches project + steps |
| `project.create` | ✅ Done | Creates project record |
| `project.update` | ✅ Done | Updates project fields |
| `project.delete` | ✅ Done | Cascading delete (jobs → steps → project) |
| `step.create` | ✅ Done | Creates step record |
| `step.update` | ✅ Done | Updates step fields (zoom, script, etc.) |
| `step.delete` | ✅ Done | Deletes step |
| `ai.validateSetup` | ✅ Done | **Mock** — heuristic title/desc quality, no LLM |
| `ai.generateScript` | ✅ Done | **Mock** — returns hardcoded platform scripts |
| `ai.suggestZooms` | ✅ Done | **Mock** — random coordinates |
| `ai.guide` | ✅ Done | **Mock** — canned responses by event type |
| `render.start` | ✅ Done | Creates render job, sets status |
| `render.status` | ✅ Done | Returns job + step statuses |
| `render.simulateProgress` | ✅ Done | **Fake** — advances stage every call |
| `render.regenerateStep` | ✅ Done | **Fake** — sets random paths |
| Auth (Kimi OAuth) | ✅ Done | OAuth flow, session, middleware |

---

## ❌ What's Still Left (Grouped by Priority)

### 🔴 P0 — Core Pipeline (The Product Doesn't Work Without These)

#### 1. Real File Upload to Cloud Storage
- **Current state:** Screenshots are stored as `blob:` URLs in browser memory. `screenshotPath` gets a blob URL or empty string.
- **What's needed:**
  - Upload endpoint that accepts `multipart/form-data`
  - Store files to Cloudflare R2 (S3-compatible)
  - Return signed URLs for frontend display
  - Add `@aws-sdk/client-s3` upload logic (package already installed)
  - Generate pre-signed download URLs via `@aws-sdk/s3-request-presigner` (already installed)

#### 2. Real AI/LLM Integration (Script Generation)
- **Current state:** `ai.generateScript` returns hardcoded strings per platform. No LLM call.
- **What's needed:**
  - Integrate with Ollama Cloud API or any OpenAI-compatible endpoint
  - Send project description + step descriptions as context
  - Parse structured JSON response for per-step scripts
  - Environment variable for `OLLAMA_BASE_URL` / `OLLAMA_MODEL`

#### 3. Real AI Guide (LLM-powered)
- **Current state:** `ai.guide` returns canned strings from a lookup table. `ai.validateSetup` uses string length heuristics.
- **What's needed:**
  - Wire up actual LLM calls for contextual guidance
  - `validateSetup` should send title/description to LLM for real quality assessment
  - `guide` should be context-aware (knows current step, project state)

#### 4. TTS Audio Generation (Edge-TTS)
- **Current state:** No audio generation at all. `audioPath` gets set to fake paths like `/audio/step_1.mp3`.
- **What's needed:**
  - Install/integrate `edge-tts` (Python) or a Node.js TTS library
  - Generate `.mp3` from each step's script text
  - Probe audio duration (ffprobe or audio library)
  - Upload audio to R2, store path + duration in DB
  - **This is the most critical backend piece** — video duration depends on it

#### 5. FFmpeg Video Rendering Pipeline
- **Current state:** `render.simulateProgress` fakes progress by advancing stages in DB. No actual video processing.
- **What's needed:**
  - Install FFmpeg on the server (Docker image should include it)
  - Implement the zoompan filter pipeline from the plan
  - Per-step: screenshot + audio → video segment with zoom animation
  - Concatenate all segments into final MP4
  - Upload final video to R2
  - Update project with real `finalVideoPath`

#### 6. Real Render Job Queue / Worker
- **Current state:** "Rendering" is simulated client-side via polling `simulateProgress` mutation.
- **What's needed:**
  - Background worker that polls `render_jobs` table
  - Processes each queued job: download assets from R2 → generate audio → render segments → concatenate → upload
  - Updates job status/stage as it progresses
  - Frontend polling already works — just needs real data

---

### 🟡 P1 — Important Features (Product Feels Incomplete Without)

#### 7. Actual Video Preview Player
- **Current state:** Step 7 (Export) shows a placeholder div saying "Video preview would play here".
- **What's needed:** `<video>` element with the final MP4 signed URL, custom player controls

#### 8. Real File Download
- **Current state:** "Download MP4" button does nothing.
- **What's needed:** Generate signed R2 URL, trigger browser download

#### 9. Drag-and-Drop Reorder (Step 2)
- **Current state:** Drag handle icon exists but dragging doesn't work.
- **What's needed:** Implement actual drag-and-drop reorder (e.g., `@dnd-kit/core` or native HTML5)

#### 10. Light/Dark Mode Toggle
- **Current state:** CSS variables defined for both themes, `darkMode: ["class"]` in Tailwind config, `next-themes` is installed.
- **What's missing:** No toggle button anywhere in the UI. No `ThemeProvider` wrapping the app.

#### 11. Missing Public Pages
Per the plan, these pages are listed but not implemented:
- `/docs` — Documentation (navbar links to it but 404s)
- `/blog` — Blog
- `/about` — About
- `/contact` — Contact
- `/changelog` — Changelog

#### 12. Separate Auth Pages
- **Current state:** Single `/login` page with Kimi OAuth.
- **Plan calls for:** `/signup`, `/signin`, `/reset-password` as separate routes.
- **Using Kimi OAuth** instead of Supabase Auth — this is a deliberate deviation from the plan.

#### 13. My Videos Page `/videos`
- **Plan calls for:** A dedicated completed videos page. Currently, completed videos are accessed through the dashboard.

---

### 🟢 P2 — Polish & Business Logic (Pre-Launch)

#### 14. Credit System / Usage Limits
- Free tier: 5 videos/month, 720p only, watermark
- Pro tier: unlimited, 1080p/4K, no watermark
- **Current state:** No usage tracking, no limits enforced

#### 15. Stripe Payment Integration
- Pro subscription at $25/month
- **Current state:** Pricing page exists but "Upgrade" buttons do nothing

#### 16. Email Notifications
- "Email when render completes" toggle exists in Settings but no email service connected
- Plan mentions Resend.com

#### 17. Watermark on Free Tier
- No watermark logic in video rendering

#### 18. Video Expiry (7-day for Free)
- No cleanup job for free-tier video storage

#### 19. Copy Link / Share Functionality
- "Copy Link" button in Export step does nothing
- No social sharing implementation

#### 20. ElevenLabs Voice Integration (Pro Tier)
- Voice cards exist but all use Edge-TTS names
- No ElevenLabs API integration for premium voices

#### 21. Voice Preview (Play Sample)
- Voice cards have a Play button but it doesn't play any audio

#### 22. Background Music
- Music toggle works in UI but no actual music tracks or mixing logic

#### 23. Intro/Outro Cards
- Mentioned in plan for Pro tier, not implemented

#### 24. SEO Meta Tags
- `index.html` has a generic title "Vite + React + TS"
- No meta descriptions, no proper title tags per page

---

## Architecture Differences from Plan

| Plan Says | Actual Implementation |
|-----------|----------------------|
| Next.js 14 + App Router | **Vite + React Router** (fine, simpler) |
| FastAPI (Python) backend | **Hono + tRPC (TypeScript)** (fine, unified stack) |
| PostgreSQL + Supabase | **MySQL + Drizzle ORM** |
| Supabase Auth | **Kimi OAuth** |
| Fabric.js for annotation | **Custom HTML/CSS canvas** (mouse events on div, works) |
| React Query for polling | **tRPC + React Query** (built-in, works) |

> [!NOTE]
> These deviations are **fine**. The TypeScript monorepo with Vite + Hono is actually cleaner than the Python + Next.js split. The core plan logic is preserved.

---

## Recommended Build Order (What to Do Next)

### Phase 1: Make It Real (the backend pipeline)
1. **File upload to R2** — wire up the S3 SDK already in package.json
2. **LLM integration** — connect Ollama/OpenAI for script generation + AI guide
3. **TTS audio generation** — Edge-TTS via a Node wrapper or Python subprocess
4. **FFmpeg rendering** — implement zoompan pipeline, background worker
5. **Video preview + download** — serve signed URLs, embed `<video>` player

### Phase 2: Polish the Frontend
6. **Dark mode toggle** — add ThemeProvider + toggle button
7. **Drag-and-drop reorder** — Step 2
8. **Voice preview playback** — generate/cache voice samples
9. **SEO meta tags** — per-page titles and descriptions
10. **Missing public pages** — at minimum `/docs` and `/about`

### Phase 3: Business Logic
11. **Usage tracking + credit system**
12. **Stripe integration**
13. **Email notifications**
14. **Watermark + video expiry**

---

> [!IMPORTANT]
> **Bottom line:** You have an impressive UI shell. The entire frontend wizard flow, landing page, dashboard, and design system are complete. What's missing is the **backend brain** — real file storage, real AI calls, real audio generation, and real video rendering. That's the hard part, but the scaffolding is solid.
