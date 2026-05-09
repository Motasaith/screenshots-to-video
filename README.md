# AI Video Generator Platform

A modern, full-stack web application that allows users to create professional tutorial videos from simple screenshots. By leveraging AI-generated scripts, automated Text-to-Speech (TTS), and programmatic video rendering (FFmpeg), users can turn static images into dynamic, engaging video content.

## 🚀 Key Features

*   **Step-by-Step Creation Wizard:** Intuitive UI to guide users through uploading screenshots, writing/generating scripts, annotating zoom targets, and rendering.
*   **AI-Powered Scripting:** Automatically generates tutorial narration and guidance based on the context of the screenshots and project description using LLMs.
*   **Proactive AI Assistant:** A built-in chat guide to provide contextual help and suggestions throughout the video creation process.
*   **Automated Voiceovers (TTS):** Integrated with `node-edge-tts` to generate high-quality, natural-sounding voiceovers without external dependencies.
*   **Cinematic Video Rendering:** Uses FFmpeg to automatically apply "zoom-and-pan" effects to static screenshots, creating a dynamic viewing experience.
*   **Cloud Storage Integration:** Fully integrated with [UploadThing](https://uploadthing.com/) for fast, secure, and reliable media storage.
*   **Background Worker:** Robust, asynchronous job polling system to handle heavy audio generation and video rendering without blocking the UI.

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
*   **Storage Migration**: Transitioned from Cloudflare R2 to UploadThing, drastically improving upload speeds and simplifying infrastructure.
*   **Dependency Freedom**: Swapped external OS-level dependencies (like Python for edge-tts and system-wide FFmpeg) for self-contained NPM packages (`node-edge-tts`, `ffmpeg-static`), making local development incredibly simple and robust.

---
*Built with modern web technologies for a seamless video creation experience.*
