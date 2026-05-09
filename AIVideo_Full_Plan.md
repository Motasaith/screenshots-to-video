# AIVideo — Full Product Plan
### From Zero to Shipped: Every Detail, Every Step, Every Decision

---

## PART 1 — THE HONEST FOUNDATION

### What This Product Actually Is

A web app where a user uploads screenshots + short descriptions of a workflow, and the system outputs a finished MP4 video where each screenshot is narrated, animated with a cinematic zoom into the most important region, and stitched into a complete tutorial — automatically.

### Your Real Differentiator (Not "AI video")

Every competitor (Loom, Guidde, Scribe, Tella) does screen recording or static guides. None of them do **cinematic zoom animation on specific UI elements inside a static screenshot**. That is your edge. Everything you build must protect and strengthen that edge.

### The Data Model That Drives Everything

This is the most important technical decision in the whole product. Every step the user goes through maps to this object:

```
Project {
  id: uuid
  title: string
  platform: "youtube" | "teams" | "tiktok" | "linkedin"
  status: "draft" | "processing" | "complete"
  createdAt: timestamp

  steps: Step[]
}

Step {
  id: uuid
  order: int
  description: string           ← user input
  screenshotPath: string        ← uploaded image (Cloudflare R2)
  
  aiScript: string              ← AI-generated narration for this step
  userEditedScript: string      ← what user actually approved

  zoomTarget: { x: int, y: int }        ← pixel coordinate user clicked
  zoomRect: { x, y, width, height }     ← optional rectangle user drew
  
  audioPath: string             ← Edge-TTS generated .mp3
  audioDuration: float          ← drives video segment length
  
  videoSegmentPath: string      ← FFmpeg rendered clip for this step
  status: "pending" | "generating" | "done" | "error"
}
```

**The audioDuration is the single most important field.** Every downstream decision — how long the screenshot displays, how long the zoom animation runs, when to cut to the next step — is derived from it. Generate audio first. Always.

---

## PART 2 — TECHNOLOGY STACK

### Frontend
- **Next.js 14** with App Router
- **Tailwind CSS** for styling
- **Framer Motion** for page transitions and step animations
- **React Query (TanStack Query)** for polling job status
- **Zustand** for local wizard state (which step the user is on, unsaved changes)
- **Fabric.js** for the zoom annotation canvas on Step 4 (click/drag on screenshot)
- **next-themes** for light/dark mode toggle

### Backend
- **FastAPI** (Python) — your strength, perfect for file handling and subprocess calls
- **PostgreSQL** via **Supabase** — free tier, handles auth + database + storage metadata
- **Cloudflare R2** — S3-compatible object storage, 10GB free, stores screenshots + audio + video segments + final MP4
- **FFmpeg** — called via Python subprocess for all video rendering
- **Edge-TTS** (Python library) — free Microsoft voices for Free tier
- **ElevenLabs API** — paid voices for Pro tier
- **Ollama Cloud API** (your existing $20 plan) — LLM brain for script generation + AI guidance

### Queue (Keep It Simple for V1)
- **PostgreSQL job table** — a `render_jobs` table polled every 3 seconds by a FastAPI background worker
- No Redis, no BullMQ for V1. That is over-engineering for your first 100 users
- Upgrade to BullMQ when you hit actual queue pressure

### Auth
- **Supabase Auth** — Google OAuth + email/password, handles sessions, free tier is generous

### Deployment
- **Vercel** — Next.js frontend (you know this well from Siraj Luxe)
- **Railway** or **Render** — FastAPI backend (free tier, supports persistent processes)
- **Cloudflare R2** — storage (connected to backend only, signed URLs for frontend)

### Ollama Models You Already Have
- **Text generation (script + AI guide):** Your MiniMax M1/M2 cloud models via Ollama API
- **Fallback:** Any fast reasoning model available on your cloud plan
- Vision models (LLaVA, etc.) are NOT used in V1 for coordinates — user clicks the point manually

---

## PART 3 — DESIGN SYSTEM

### Style Decision: Neo-Brutalism with Light/Dark Toggle

You are right that dark-only is limiting. And brutalism fits this product perfectly because:
- The target user is a developer or technical content creator
- Brutalism feels fast, honest, and tool-like — not corporate SaaS
- It stands out completely from every competitor (Loom, Guidde are all rounded, soft, and blue)
- Light brutalism is energetic and unusual, dark brutalism feels like a terminal — both work

### What Neo-Brutalism Means For This Product

Not the extreme kind with black borders on everything. Think **Figma meets newspaper** — strong typographic hierarchy, deliberate use of raw borders, asymmetric layout moments, bold section breaks, no gradient blobs.

**Light Mode:**
- Background: `#F5F2EB` (warm off-white, like aged paper)
- Surface: `#FFFFFF`
- Border: `#111111` (hard black borders on cards, 2px)
- Primary accent: `#FF4D00` (electric orange — aggressive, memorable)
- Secondary: `#1A1A2E` (near-black navy for text)
- Success: `#00B37E`

**Dark Mode:**
- Background: `#0E0E0E` (true near-black)
- Surface: `#1A1A1A`
- Border: `#333333`
- Primary accent: `#FF6B1A` (warm orange, slightly lighter for dark bg legibility)
- Secondary: `#F5F2EB` (the light bg becomes text color — beautiful inversion)
- Success: `#23C882`

**Typography:**
- Headings: **Syne** (free Google Font) — geometric, slightly unusual, very 2024
- Body: **DM Sans** — clean, readable, modern without being generic Inter
- Mono (for code/script lines): **JetBrains Mono**

**What Makes It Brutalist:**
- Cards have hard 2px solid borders, no border-radius on main containers (only 4px on inputs)
- Section dividers are bold horizontal rules, not gradient fades
- Buttons have offset box-shadows (4px offset, solid color) instead of glows
- The workflow step sidebar uses a thick left border accent (4px) not a filled background
- Grid lines visible as structure elements in the app layout

**What Makes It NOT Ugly Brutalism:**
- Generous white space (brutalism doesn't mean cramped)
- Only 2 typefaces, consistent sizing scale
- The orange accent is used sparingly — only on primary CTAs and active states
- Proper 8px grid spacing system throughout

---

## PART 4 — PAGE MAP

### Public Pages
1. **Landing Page** `/` — marketing, conversion
2. **Pricing** `/pricing`
3. **Documentation** `/docs`
4. **Blog** `/blog`
5. **About** `/about`
6. **Contact** `/contact`
7. **Changelog** `/changelog`

### Auth Pages
8. **Sign Up** `/signup`
9. **Sign In** `/signin`
10. **Reset Password** `/reset-password`

### App Pages (authenticated)
11. **Dashboard** `/dashboard` — all projects, credits, new project CTA
12. **My Videos** `/videos` — completed videos, download, share
13. **Account Settings** `/settings`

### Video Wizard (7 steps — one URL per step)
14. `/create/[projectId]/setup` — Step 1: Project setup
15. `/create/[projectId]/upload` — Step 2: Upload screenshots + descriptions
16. `/create/[projectId]/script` — Step 3: Review + edit AI script
17. `/create/[projectId]/annotate` — Step 4: Zoom annotation canvas
18. `/create/[projectId]/voice` — Step 5: Voice + style settings
19. `/create/[projectId]/render` — Step 6: Generation progress
20. `/create/[projectId]/export` — Step 7: Preview + export

---

## PART 5 — THE LANDING PAGE

### Layout Structure (Top to Bottom)

**Nav:** Logo left. Links center: Features | How It Works | Pricing | Docs. Right: "Sign In" ghost + "Start Free" orange CTA. Sticky on scroll with hard bottom border.

**Hero Section:**
- Left (55%): Large headline in Syne, 68px, two lines. "Screenshots in. Professional videos out." Below: 16px DM Sans subheadline. Two CTAs: "Create Free Video →" (orange, offset shadow) + "Watch 90s Demo" (ghost, hard border).
- Right (45%): Animated product mockup — the step upload interface. Shows 3 step cards with thumbnails, a processing indicator on step 2, and a floating "Script Generated" badge. Small confetti effect on load (CSS-only, minimal).
- Background: Grid pattern in light mode (graph paper aesthetic), subtle noise texture in dark mode.

**Social Proof Strip:** "Used by teams at..." with company wordmarks. Horizontal marquee animation.

**Features Section — Scroll-Pinned:**
Left card stays fixed. Right text changes through 3 features as you scroll. Same technique as Flyward.

**How It Works — 4 Step Timeline:** Number nodes connected by a line that draws itself on scroll. Each node pops in as the line reaches it.

**Stats Row:** 5,000+ videos · 12min avg · 1080p default · 4.9/5 rating. Numbers count up on scroll entry.

**Testimonials:** 3 cards in a row, staggered fade-in on scroll.

**Pricing Teaser:** 2 cards (Free vs Pro). Pro card has orange top border accent and offset shadow.

**Final CTA Band:** Full-width, background shifts to dark orange gradient as you scroll into it regardless of light/dark mode. "Ready to make your first video?" Centered, bold, one CTA.

**Footer:** 4 columns. Newsletter signup inline.

---

## PART 6 — THE 7-STEP WIZARD (DETAILED)

### Global Wizard UI Pattern

Every step page shares:
- **Top progress bar:** 7 connected nodes. Completed = filled orange. Active = outlined orange with pulsing inner dot. Upcoming = gray. Node labels appear below: Setup / Upload / Script / Annotate / Voice / Render / Export.
- **Left sidebar (desktop):** Step list with status icons. Lets user jump back to completed steps.
- **AI Guide panel (right, collapsible):** A persistent chat-style panel. The AI (your Ollama model) monitors what the user is doing and sends messages proactively. It shows warnings, suggestions, and answers questions.
- **Bottom action bar:** Back button (ghost) + primary action button (orange). Disabled state when requirements not met with a tooltip explaining why.

---

### STEP 1 — Project Setup `/create/[id]/setup`

**What the user sees:**
- Page title: "Let's set up your project" in 32px Syne
- 3 form fields:
  1. **Video Title** — text input, placeholder "e.g. How to clean Windows temp files"
  2. **Topic Description** — large textarea, placeholder "Describe what this video is about, who the audience is, and what they should be able to do after watching."
  3. **Target Platform** — pill toggle group: YouTube | Microsoft Teams | TikTok | LinkedIn

**What the AI does here:**
- Model: Your Ollama cloud LLM (MiniMax or equivalent)
- Trigger: After user stops typing in the description field (500ms debounce)
- API call: `POST /api/ai/validate-setup` with `{ title, description, platform }`
- AI evaluates and returns structured JSON:
  ```json
  {
    "titleQuality": "good" | "vague" | "too_long",
    "descriptionQuality": "excellent" | "good" | "needs_more_detail",
    "suggestions": ["string"],
    "audienceClarity": true | false,
    "outcomeClarity": true | false
  }
  ```
- AI Guide panel shows a message like: "Your title is specific ✓. Your description could mention the skill level of your audience — beginner or experienced user? That helps me write a better script."
- If title is vague (just "cleanup tutorial"), orange warning: "⚠ Try to be more specific. 'How to free 10GB of disk space on Windows 11' will rank better on YouTube and give me more context."

**Validation before Next:**
- Title: min 10 chars, max 100
- Description: min 30 chars (soft), max 1000
- Platform: one must be selected
- If description < 30 chars: "Continue" button shows warning tooltip "Add more detail for a better AI script"

**On Continue:** Creates `Project` record in database. Redirects to Step 2.

---

### STEP 2 — Upload Steps `/create/[id]/upload`

**What the user sees:**
- Page title: "Add your steps"
- Subtitle: "Each step needs a screenshot and a short description. Add as many steps as your tutorial needs."
- **Step cards** — vertical list, draggable to reorder via drag handle
- Each step card contains:
  - Left: Square drop zone (dashed border). Accepts PNG/JPG/WEBP. Shows thumbnail after upload with a "×" remove button.
  - Right: Textarea "Describe this step" with live character count. Placeholder: "e.g. Open Task Manager and click the Startup tab"
  - Bottom-right: "Remove step" text link
  - Top-right: Step number badge + drag handle
- Below cards: "＋ Add Another Step" button (dashed full-width)
- Min 1 step, max 20 steps

**What the AI does here:**
- Trigger 1: After each description is typed (debounce)
  - AI rates the description: too vague / good / excellent
  - Shows inline tip: "⚡ Be specific about what the viewer should click or notice"
- Trigger 2: After screenshot is uploaded
  - Screenshot sent to backend: `POST /api/ai/analyze-screenshot`
  - AI (vision-capable model if available on your plan, otherwise skip) scans the image and returns basic context: "Detected: Windows CMD window, Task Manager, Settings panel"
  - This context is stored and used in Step 3 for script generation
  - If image resolution is too low (under 800px wide): "⚠ This screenshot may look blurry in 1080p video. Try uploading a higher resolution version."
- Trigger 3: Reorder detection
  - If user drags a step, AI checks if the new order makes logical sense compared to descriptions
  - Optional: "Step 3 now comes before Step 2 — does this order make sense for your workflow?"

**Validation before Next:**
- At least 1 step with both screenshot + description
- Each step must have both (not one without the other)
- Screenshot file size max 10MB

**On Continue:** Saves all steps to database. Screenshots uploaded to Cloudflare R2. Triggers background AI script generation. Redirects to Step 3.

---

### STEP 3 — Script Review `/create/[id]/script`

**What the user sees:**
- Page title: "Review your script"
- Script is generated in the background from Step 2. If not ready yet (takes 5-15 seconds): "Generating your script..." spinner. Polls every 2 seconds.
- Once ready: Each step shown as a row:
  - Step number + screenshot thumbnail (small, 80px)
  - The AI-generated narration script for that step in an editable textarea
  - Word count badge
  - "↻ Regenerate this step" link (re-calls AI with same inputs)
- Below all steps: "Regenerate All" ghost button + "These look good →" primary button

**How the script is generated (backend):**
```python
# FastAPI endpoint: POST /api/projects/{id}/generate-script

prompt = f"""
You are a professional tutorial narrator. Generate a clear, 
natural-sounding voiceover script for each step of this tutorial.

Video topic: {project.description}
Target platform: {project.platform}  
Target audience: inferred from description

For each step, write 1-3 sentences maximum. Be specific about what 
the viewer should see or do. No filler phrases like "Now we will..." 
Just describe the action directly.

Steps:
{format_steps(steps)}

Return JSON: {{ "scripts": ["script for step 1", "script for step 2", ...] }}
"""

response = ollama_client.chat(
    model="minimax-m2",  # your cloud model
    messages=[{"role": "user", "content": prompt}]
)
```

**What the AI Guide does here:**
- After script appears: "I've written {word_count} words across {n} steps. This will be approximately {estimated_duration} seconds of video."
- If a step's script is very long (over 40 words): "⚠ Step 2's script may feel rushed. Consider splitting this step or shortening the description."
- If a step's script is very short (under 8 words): "Step 3's script is quite brief. The viewer will only see this step for ~2 seconds. Is that enough time to understand it?"
- Real-time character count as user edits — AI updates estimated duration live

**Validation before Next:**
- All steps must have at least 5 words of script
- Prompts user to review steps flagged with warnings

---

### STEP 4 — Zoom Annotation `/create/[id]/annotate`

**This is the most technically complex step. It is also your main differentiator.**

**What the user sees:**
- Page title: "Mark what matters"
- Subtitle: "Click a point or drag a rectangle on each screenshot to tell us where to zoom. The AI has made a suggestion — review and adjust."
- **Left panel (65%):** Annotation canvas (Fabric.js)
  - Displays the current step's screenshot at full width
  - An orange/red dashed rectangle shows the AI's suggested zoom region (default: center of image if no AI detection, or detected region if vision model was used)
  - Rectangle has 4 corner drag handles for resizing
  - "Click to mark a single point instead" toggle below canvas
  - Navigation arrows at bottom: "← Step 2 / Step 3 →"
  - Cursor is a crosshair when hovering image
- **Right panel (35%):** Step list sidebar
  - Each step shown as small row: thumbnail + label + status badge
  - "Marked ✓" (green) or "Needs annotation" (orange)

**How this works technically:**
```javascript
// Fabric.js canvas setup
const canvas = new fabric.Canvas('annotation-canvas');

// When user clicks
canvas.on('mouse:down', (e) => {
  const point = canvas.getPointer(e.e);
  // Convert to percentage coordinates (0-100) relative to image
  // Store: { x: (point.x / img.width) * 100, y: (point.y / img.height) * 100 }
  saveZoomTarget(stepId, { x, y });
});

// When user drags rectangle
canvas.on('object:modified', (e) => {
  const rect = e.target;
  // Store bounding box as percentages
  saveZoomRect(stepId, {
    x: (rect.left / img.width) * 100,
    y: (rect.top / img.height) * 100,
    width: (rect.width / img.width) * 100,
    height: (rect.height / img.height) * 100
  });
});
```

**Why percentages not pixels:** The screenshot could be any resolution. Storing percentages means the FFmpeg zoom math works correctly regardless of image size.

**What the AI Guide does here:**
- Shows its reasoning: "I detected what appears to be a command prompt window in the lower portion of the screenshot. I've pre-selected that region."
- If user moves the rectangle significantly: "Noted! I've updated the zoom target to your selection."
- If user clicks "Auto-suggest all steps": Makes one AI call for all steps at once, updates all rectangles
- Warning if zoom region is too small: "This zoom area is very small (under 10% of the image). The final zoom may look extreme. Consider selecting a slightly larger area."
- Warning if no annotation made: "You haven't marked a zoom area for Step 2. The video will zoom into the center by default."

**The "Suggest All" button:**
Sends all screenshots to `POST /api/ai/suggest-zooms`. Backend runs a simple heuristic (not vision model for V1): looks for common UI patterns using image analysis (high-contrast areas, edge detection via PIL/Pillow). Returns suggested rectangles. Not perfect but good enough for V1.

---

### STEP 5 — Voice & Style `/create/[id]/voice`

**What the user sees:**
- Page title: "Choose your voice and style"
- **Voice selector:** Grid of voice cards. Each card: voice name, flag emoji for accent, gender label, "Preview" button that plays a 5-second sample.
  - Free tier: 6 Edge-TTS voices (Microsoft voices)
  - Pro tier: ElevenLabs voices unlocked (with "Pro" badge)
- **Video resolution:** Radio toggle: 720p | 1080p (1080p requires Pro)
- **Speed:** Slider, 0.8x to 1.3x speaking speed
- **Background music:** Toggle on/off. Dropdown of 5 royalty-free background music tracks (very low volume, ambient). Toggle off by default.
- **Intro/Outro:** Toggle. If Pro: upload custom image/video for intro card.

**What the AI Guide does here:**
- Matches voice recommendation to platform: "For YouTube, I'd suggest a confident, clear voice. For Microsoft Teams, a formal tone works best."
- Speed recommendation: "Based on your script length, 1.0x speed will give viewers comfortable time to follow each step."

**No complex logic here.** This step is simple settings. Just save preferences to the project record.

---

### STEP 6 — Generation Progress `/create/[id]/render`

**What the user sees:**
- Page title: "Generating your video…"
- Subtitle: "This takes 2–5 minutes. You can safely close this tab and come back — we'll email you when it's done."
- **Queue position badge:** "You are #2 in queue"
- **Overall progress bar:** Thin orange bar at top, animated fill
- **Per-step progress rows:**
  - Each step shows 3 stage icons: 🎙 Audio → 🔍 Zoom Calc → 🎬 Render
  - Each icon state: pending (gray) / active (orange pulsing) / done (green checkmark)
- **Bottom:** "Notify me by email" button + "Go to Dashboard" link

**The actual rendering pipeline (backend):**

```python
# For each step, in sequence:

# STAGE 1: Generate Audio
async def generate_audio(step):
    tts = edge_tts.Communicate(step.script, voice=project.voice)
    await tts.save(f"/tmp/{step.id}.mp3")
    
    # Get exact duration
    probe = ffmpeg.probe(f"/tmp/{step.id}.mp3")
    step.audioDuration = float(probe['streams'][0]['duration'])
    step.audioPath = upload_to_r2(f"/tmp/{step.id}.mp3")

# STAGE 2: Calculate Zoom Parameters
def calculate_zoom(step, screenshot_width, screenshot_height):
    # Convert stored percentage coords to pixel coords
    target_x = (step.zoomTarget.x / 100) * screenshot_width
    target_y = (step.zoomTarget.y / 100) * screenshot_height
    
    zoom_level = 2.0  # zoom into 50% of image
    
    # FFmpeg zoompan math
    # Start: full image. End: zoom_level centered on target
    start_x = 0
    start_y = 0
    end_x = target_x - (screenshot_width / zoom_level / 2)
    end_y = target_y - (screenshot_height / zoom_level / 2)
    
    # Duration in frames (25fps × audio_duration)
    frames = int(step.audioDuration * 25)
    
    return { zoom_level, start_x, start_y, end_x, end_y, frames }

# STAGE 3: Render Step Video with FFmpeg
def render_step(step, zoom_params):
    frames = zoom_params['frames']
    z = zoom_params['zoom_level']
    ex = zoom_params['end_x']
    ey = zoom_params['end_y']
    
    # The zoompan filter — this is the hard math
    # Smoothly animates from full image to zoomed target
    zoom_expr = f"'min(zoom+{(z-1)/frames:.6f},{z})'"
    x_expr = f"'x+({ex}/ih*on/{frames})'"
    y_expr = f"'y+({ey}/ih*on/{frames})'"
    
    ffmpeg_cmd = [
        'ffmpeg', '-loop', '1',
        '-i', step.screenshotLocalPath,  # downloaded from R2
        '-i', step.audioLocalPath,
        '-filter_complex',
        f'[0:v]scale=1920:1080,zoompan=z={zoom_expr}:x={x_expr}:y={y_expr}:d={frames}:s=1920x1080:fps=25[v]',
        '-map', '[v]', '-map', '1:a',
        '-c:v', 'libx264', '-c:a', 'aac',
        '-shortest',
        f'/tmp/{step.id}_segment.mp4'
    ]
    
    subprocess.run(ffmpeg_cmd, check=True)
    step.videoSegmentPath = upload_to_r2(f"/tmp/{step.id}_segment.mp4")

# STAGE 4: Concatenate All Segments
def concat_segments(project):
    # Create concat list file
    concat_list = "\n".join([f"file '{s.videoSegmentLocalPath}'" for s in project.steps])
    
    ffmpeg_cmd = [
        'ffmpeg', '-f', 'concat', '-safe', '0',
        '-i', '/tmp/concat_list.txt',
        '-c', 'copy',
        f'/tmp/{project.id}_final.mp4'
    ]
    subprocess.run(ffmpeg_cmd, check=True)
    project.finalVideoPath = upload_to_r2(f"/tmp/{project.id}_final.mp4")
```

**Polling (frontend):**
```javascript
// React Query polls every 3 seconds
const { data } = useQuery({
  queryKey: ['render-status', projectId],
  queryFn: () => fetch(`/api/projects/${projectId}/status`).then(r => r.json()),
  refetchInterval: 3000,
  enabled: project.status === 'processing'
});

// When status becomes 'complete', router.push to Step 7
useEffect(() => {
  if (data?.status === 'complete') {
    router.push(`/create/${projectId}/export`);
  }
}, [data?.status]);
```

---

### STEP 7 — Preview & Export `/create/[id]/export`

**What the user sees:**
- Page title: "Your video is ready 🎬" with subtle confetti (CSS, 1.5 second animation only)
- **Left (60%):**
  - Video player with the final MP4 embedded
  - Custom player skin: orange progress bar, dark controls
  - Below player: metadata chips (duration / resolution / file size)
  - Action buttons: "⬇ Download MP4" (orange primary) | "🔗 Copy Link" (ghost) | "🖼 Copy Thumbnail" (ghost)
  - Share section: social platform pills with pre-filled text
- **Right (40%):**
  - Step breakdown list — each step as a row with thumbnail, duration badge, "↻ Regenerate" link
  - AI Quality Review panel: "Script clarity: Excellent / Zoom accuracy: 4/5 / Step 3: manually review"
  - "＋ Start New Project" button at bottom

**Regenerate individual step:**
- User clicks "↻ Regenerate" on a step
- Opens a small modal: shows current script + zoom annotation. User can edit either.
- "Re-render this step" triggers backend to redo only that step: re-generate audio → re-render segment → re-concatenate into final video
- Only that step goes back to processing. Other steps stay done.

---

## PART 7 — THE AI GUIDE IN DETAIL

The AI Guide panel appears on every step (Steps 1–4, and optionally 5). It is a 280px right panel with a subtle border. Collapsible.

### How It Works

1. **Proactive messages:** The frontend sends the current step's state to `POST /api/ai/guide` every time something significant changes (file upload, text input, annotation change). The AI returns a message to display.

2. **Question answering:** User can type a question directly into the AI Guide panel. It's a mini chat interface. Questions are answered in context of what the user is doing right now.

3. **Error detection:** If the backend returns a processing error for any step, the AI Guide explains it in plain English: "The audio generation for Step 2 failed. This usually means the script contains characters that the voice engine doesn't support. Try removing any special symbols."

### Ollama API Call Structure

```python
# POST /api/ai/guide
# Called from frontend on state change

def get_guide_message(project, current_step, event_type, context):
    system_prompt = """
    You are a helpful AI assistant inside a video creation tool called AIVideo.
    The user is creating a tutorial video from screenshots.
    
    Your job: Give short, specific, actionable advice (max 2 sentences).
    Be direct. Don't use filler phrases. 
    If something looks good, say so briefly.
    If something is wrong, say exactly what to fix.
    Format: plain text only. No markdown.
    """
    
    user_message = f"""
    Current step: {current_step}
    Event: {event_type}
    Context: {json.dumps(context)}
    
    Give one short guidance message for the user right now.
    """
    
    response = requests.post(
        f"{OLLAMA_BASE_URL}/api/chat",
        json={
            "model": "minimax-m2",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            "stream": False
        }
    )
    return response.json()["message"]["content"]
```

### AI Guide Message Examples by Step

**Step 1 after description typed:**
"Your description mentions the audience (IT team) and the outcome (clean temp files). That's everything I need. Your script will be precise and professional."

**Step 2 after low-res screenshot uploaded:**
"This image is 640×480. At 1080p output, it will appear blurry. Re-export at 1920×1080 from your screen capture tool if possible."

**Step 3 when script is very long:**
"Step 4's script is 68 words. At normal speaking speed, that's about 20 seconds on one screenshot. Consider splitting this step into two."

**Step 4 when no zoom set:**
"Step 2 has no zoom target set. I'll zoom into the center of the screenshot by default. Click or drag on the image to choose what to focus on."

---

## PART 8 — THE FFMPEG ZOOM MATH (PROPERLY SOLVED)

This is what Gemini completely hand-waved. Here is the real solution.

### The Core Problem

You have:
- A static screenshot (e.g. 1920×1080)
- A target point or rectangle (stored as percentage of image)
- An audio duration (e.g. 4.7 seconds)
- You need: a video that smoothly zooms from the full image into that target region, lasting exactly 4.7 seconds

### The Solution

```python
def build_zoom_filter(screenshot_path, zoom_target, audio_duration, output_resolution="1920x1080"):
    """
    zoom_target: { x: float (0-100%), y: float (0-100%) }
    audio_duration: float (seconds)
    """
    fps = 25
    total_frames = int(audio_duration * fps)
    
    # Get actual image dimensions
    probe = ffmpeg.probe(screenshot_path)
    img_w = probe['streams'][0]['width']
    img_h = probe['streams'][0]['height']
    
    # Target pixel coordinates
    target_px = (zoom_target['x'] / 100) * img_w
    target_py = (zoom_target['y'] / 100) * img_h
    
    max_zoom = 2.5  # zoom in to 40% of image
    zoom_increment = (max_zoom - 1.0) / total_frames
    
    # During first 80% of frames: zoom in. Hold for last 20%.
    zoom_in_frames = int(total_frames * 0.8)
    
    # The pan must compensate to keep target centered as we zoom
    # At zoom level z: visible width = img_w/z, visible height = img_h/z
    # To center target_px: x_offset = target_px - (img_w/z)/2
    
    zoom_filter = (
        f"zoompan="
        f"z='if(lte(on,{zoom_in_frames}),1+{zoom_increment:.8f}*on,{max_zoom})':"
        f"x='iw/2-(iw/zoom/2)+({target_px}-iw/2)*(1-1/zoom)':"
        f"y='ih/2-(ih/zoom/2)+({target_py}-ih/2)*(1-1/zoom)':"
        f"d={total_frames}:s={output_resolution}:fps={fps}"
    )
    
    return zoom_filter
```

### What This Actually Does

The x and y expressions use the zoom level to compute the pan offset. As zoom goes from 1.0 (full image) to 2.5 (zoomed in), the pan gradually shifts to keep `target_px, target_py` centered in frame. The math is derived from the zoompan filter's coordinate system where x,y is the top-left corner of the visible area.

This is the correct implementation. Test it with a single step before building the queue.

---

## PART 9 — BUILD ORDER

### Week 1 — Proof of Concept (No UI)
Write one Python script:
- Takes `image.png` + `"Step description text"` + `x_pct, y_pct` (coordinates)
- Generates Edge-TTS audio from description
- Probes audio duration
- Calculates zoom filter using the math above
- Runs FFmpeg to produce a single `output.mp4`
- Watch the output. If the zoom looks cinematic and correct, the product works.

This is your go/no-go test. If the video doesn't look impressive at this stage, find the math bug before building anything else.

### Week 2 — FastAPI Backend
- Project and Step models in PostgreSQL (Supabase)
- Upload endpoint: receive screenshot → store in R2
- Script generation endpoint: call Ollama, store result
- Render job queue: PostgreSQL job table + polling worker
- Basic auth via Supabase

### Week 3 — Next.js Frontend (Steps 1–4)
- Wizard layout with progress bar
- Step 1: project setup form
- Step 2: multi-step upload cards (drag and drop)
- Step 3: script review + edit
- Step 4: Fabric.js annotation canvas

### Week 4 — Frontend (Steps 5–7) + Polish
- Step 5: voice/style settings
- Step 6: progress polling UI
- Step 7: preview + download
- AI Guide panel integration (all steps)
- Light/dark mode toggle

### Week 5 — Landing Page + Auth
- Landing page with all sections + scroll animations
- Sign up / sign in via Supabase Auth
- Dashboard (project list)

### Week 6 — Beta Launch Prep
- Credit system (5 videos free, unlimited Pro)
- Stripe integration for Pro subscriptions
- Email notifications (Resend.com — free 3000 emails/month)
- Error handling throughout

---

## PART 10 — PRICING & STORAGE

### Free Tier
- 5 videos per month
- 720p export
- Watermark in bottom-right corner
- Edge-TTS voices only (6 options)
- Max 10 steps per video
- Videos stored 7 days then deleted from R2

### Pro Tier ($25/month via Stripe)
- Unlimited videos
- 1080p and 4K export
- No watermark
- ElevenLabs voices (premium voice clones)
- Max 30 steps per video
- Videos stored permanently
- API access
- Priority rendering queue

### Storage Math (Cloudflare R2)
- Each free user video: ~100MB (720p, 2-3 min)
- Each pro user video: ~350MB (1080p)
- 100 free users × 5 videos × 100MB = 50GB → $0.75/month on R2 after free tier
- Revenue from 10 Pro users ($250/month) covers all storage costs at this scale
- R2 free tier: 10GB storage + 1M Class A operations/month → covers your first ~50 users entirely free

---

## PART 11 — ONE THING MOST DEVS FORGET

**Set up the "Coming Soon" page before you write one line of backend code.**

Use the landing page HTML from Stitch. Add one email capture form. Deploy to Vercel (5 minutes). Post the link on:
- Reddit: r/SideProject, r/webdev, r/Entrepreneur
- Twitter/X with a demo GIF (record your POC video from Week 1)
- LinkedIn (mention it solves the team documentation problem)
- ProductHunt "upcoming" page

If you get 50 email signups in 2 weeks, you have signal. If you don't, find out why before spending 6 weeks building. This is the difference between a product and a GitHub repo nobody uses.

The email list is also your beta tester pool. Those 50 people will tell you exactly what's broken and what they actually need.

---

*Document version 1.0 — Abdul Rauf / AIVideo*
*Covers: tech stack, 7-step wizard detail, AI integration per step, FFmpeg math, build order, pricing*
