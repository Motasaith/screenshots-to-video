# AIVideo — Screenshot to Video Editor

A production-ready, full-stack web application that turns screenshots into professional, AI-narrated video tutorials. Upload screenshots, annotate them with the built-in editor, and let the FFmpeg pipeline render a polished MP4 with zoom animations, captions, transitions, and AI voiceovers.

## 🚀 Key Features

*   **Screenshot-to-Video Workflow:** Upload screenshots, edit with annotations (highlights, blur, zoom, captions, watermarks), and render a complete video.
*   **AI Script Generation:** LLM-powered voiceover scripts automatically generated from your screenshots and descriptions.
*   **Vision Copyright Checker:** A dedicated Vision LLM pipeline that scans uploaded media for known copyrighted material before rendering, ensuring your videos are safe for monetization.
*   **Cinematic Video Rendering:** Uses FFmpeg to automatically apply zoom-and-pan effects, customizable transitions (Fade, Slide, Flip), and dynamic Intro/Outro templates.
*   **Multi-Platform Export:** Dynamically adapts video rendering for YouTube (16:9), TikTok/Reels (9:16), Instagram (1:1), and LinkedIn (4:5).
*   **Automated Voiceovers (TTS):** Native integration with `node-edge-tts` for fast generation, plus an integrated UI for ElevenLabs Ultra-Real Voices.
*   **Cloud Storage:** R2/B2 cloud storage with UploadThing fallback for secure, reliable media storage.
*   **Background Worker:** Robust, asynchronous job polling system to handle heavy audio generation and video rendering without blocking the UI.
*   **Admin Dashboard:** Full admin console with user management, project oversight, render job monitoring, system logs viewer, and maintenance controls.
*   **Structured Logging:** File-based logging with automatic rotation and 30-day retention, viewable from the admin dashboard.
*   **Rate Limiting:** Comprehensive rate limiting across all API endpoints to prevent abuse.

## 🛠️ Tech Stack

**Frontend:**
*   React 19 & Vite 7
*   Tailwind CSS & Framer Motion (Modern, dynamic animations and styling)
*   Radix UI (Accessible, unstyled components via shadcn/ui)
*   tRPC React (End-to-end typesafe APIs)

**Backend:**
*   Hono (Ultra-fast web framework for Node.js)
*   tRPC Server
*   Drizzle ORM (Typesafe database interactions)
*   MySQL (via `mysql2`)

**Media Processing & Infrastructure:**
*   `ffmpeg-static` & `ffprobe-static` (Self-contained video rendering)
*   `node-edge-tts` (Native Node.js TTS generation)
*   UploadThing (Cloud storage)

## ⚙️ Prerequisites

*   **Node.js** (v18 or higher recommended)
*   **MySQL Database** (Local or hosted)
*   **UploadThing Account** (For cloud storage)

## 📦 Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Motasaith/How.git
    cd ai_video_02
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Variables:**
    Create a `.env` file in the root directory and add the following keys:
    ```env
    # Database
    DATABASE_URL="mysql://user:password@localhost:3306/your_database"

    # UploadThing Storage
    UPLOADTHING_SECRET="sk_live_..."
    UPLOADTHING_APP_ID="your_app_id"
    
    # LLM Provider (e.g., Kimi / OpenRouter)
    KIMI_API_URL="https://your-llm-provider.com/v1"
    KIMI_API_KEY="your_api_key"
    ```

4.  **Database Migration:**
    Generate and push the schema to your MySQL database.
    ```bash
    npm run db:generate
    npm run db:push
    ```

5.  **Run the Development Server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`. The background render worker will automatically start alongside the development server.

## 🏗️ Architecture Overview

The platform uses a monolithic full-stack approach with **Vite** serving the React frontend and **Hono** managing the backend API routes. 

*   **`/api/renderRouter.ts`**: Manages the video generation requests.
*   **`/api/lib/worker.ts`**: A dedicated polling background worker that processes jobs from the `render_jobs` database table. It handles the heavy lifting of audio synthesis (`tts.ts`) and video segment compilation (`ffmpeg.ts`).
*   **`/src/components/wizard/`**: Contains the complex, multi-step frontend React components that guide the user through the process.

## 📝 Recent Updates
*   **Dual Mode Architecture**: Separated the workflow into `Wizard.tsx` (Screenshot tutorial mode) and `StudioWizard.tsx` (Text-to-Video mode). Both modes converge on shared AI and Render APIs.
*   **Proactive AI System**: Implemented a heuristic and LLM-based proactive chat guide (`AIGuide.tsx`) that watches user inputs, prevents gibberish with real-time heuristic checks in `aiRouter.ts`, and suggests improvements.
*   **Vision-Powered Copyright Checker**: Replaced a naive mock implementation with a true Vision LLM pipeline (`checkCopyrightImages` in `llm.ts`) that analyzes up to 3 screenshots per project to ensure AdSense monetization safety.
*   **Dynamic Video Transitions**: Added user-selectable transitions (Fade, Slide, Flip) and templates (Intro/Outro) to the preview step, which are now properly handled by the background FFmpeg renderer.
*   **Advanced Audio Capabilities**: Upgraded `node-edge-tts` to support speed controls (0.8x to 1.3x) and integrated a UI placeholder for ElevenLabs Ultra-Real Voices.
*   **Multi-Platform Engine**: The FFmpeg rendering logic dynamically scales and pads the final video output to 16:9, 9:16, 1:1, or 4:5 based on the user's project settings.

## 🤖 Agent Context (For Future AI Assistants)
If you are an AI reading this repository to understand the project state:
1. **Core Data Flow**: The app uses React/Vite (Frontend) and Hono/tRPC (Backend). All major logic is in `src/pages` (Routing), `src/components/wizard` (Step-by-step UI), and `api/` (Backend routes).
2. **LLM Usage**: We use a text-based LLM for scripts/titles (`getChatMessageResponse`, `getGuideMessage`) and a Vision LLM (`checkCopyrightImages`) exclusively for the copyright safety checks on the Preview step. 
3. **Background Jobs**: Video rendering and TTS audio generation are heavy and take time. They are pushed to the `render_jobs` table via `renderRouter.ts` and polled by a background worker (`worker.ts`).
4. **Current Status**: MVP is fully functional. We have integrated advanced creative tooling, dual-mode generation, and monetization safety checks. The focus is currently on polishing these features and refining the FFmpeg zoom/transition engine.

---
*Built with modern web technologies for a seamless video creation experience.*
