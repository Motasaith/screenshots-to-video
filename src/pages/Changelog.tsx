import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";
import { SpaceBackground } from "@/components/shared/SpaceBackground";

const UPDATES = [
  {
    version: "v3.0.0",
    date: "July 13, 2026",
    changes: [
      { type: "added", text: "Production-ready admin dashboard with detailed stats, user management, log viewer, and system controls." },
      { type: "added", text: "Structured file-based logging system with automatic rotation and 30-day retention." },
      { type: "added", text: "Enhanced rate limiting across all endpoints including auth and admin routes." },
      { type: "improved", text: "Removed guest user mode — authentication is now required for all features." },
      { type: "improved", text: "Streamlined to a single 3-step workflow: Create, Edit, Render & Export." },
      { type: "fixed", text: "Removed all dead code, unused files, and legacy studio system." },
    ],
  },
  {
    version: "v2.0.0",
    date: "June 11, 2026",
    changes: [
      { type: "added", text: "Proactive AI Guide: Context-aware chat assistant that monitors input and suggests improvements." },
      { type: "added", text: "Vision Copyright Checker: Dedicated Vision LLM pipeline to scan images for monetization safety." },
      { type: "added", text: "Multi-Platform Export: Native support for 16:9, 9:16, 1:1, and 4:5 aspect ratios." },
      { type: "improved", text: "Cinematic Transitions: Added slide, fade, and flip animations to the FFmpeg engine." },
    ],
  },
  {
    version: "v1.2.0",
    date: "May 9, 2026",
    changes: [
      { type: "added", text: "Full Video Processing Pipeline: Integrated FFmpeg rendering and worker management." },
      { type: "added", text: "AI Intelligence: LLM integration for automatic script generation and guidance." },
      { type: "added", text: "Interactive editor with annotation tools, zoom controls, and caption styling." },
    ],
  },
  {
    version: "v1.1.0",
    date: "May 8, 2026",
    changes: [
      { type: "fixed", text: "Resolved FFmpeg and TTS dependency issues for stable rendering." },
      { type: "improved", text: "Enhanced storage handling with R2/B2 for seamless asset management." },
      { type: "added", text: "Automatic script generation based on uploaded screenshots." },
    ],
  },
  {
    version: "v1.0.0",
    date: "May 7, 2026",
    changes: [
      { type: "added", text: "Initial project setup and core architecture." },
      { type: "added", text: "Core architecture and project documentation established." },
    ],
  },
];

const TYPE_COLORS: Record<string, string> = {
  added: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  fixed: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20",
  improved: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20",
};

export default function Changelog() {
  return (
    <div className="theme-3d-immersive min-h-screen relative overflow-x-hidden font-sans">
      <SpaceBackground />
      <div className="relative z-10">
        <Navbar />
        <main className="max-w-3xl mx-auto pt-32 pb-20 px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-16 text-center"
          >
            <h1 className="font-extrabold text-5xl lg:text-6xl tracking-tight mb-4 text-[var(--space-text)]">
              <span className="text-teal-600">Changelog</span>
            </h1>
            <p className="text-lg text-[var(--space-text-muted)]">
              Tracking every improvement, fix, and new feature of AIVideo.
            </p>
          </motion.div>

          <div className="space-y-12">
            {UPDATES.map((update) => (
              <div key={update.version} className="relative pl-8 border-l border-[var(--space-border)]">
                <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.6)]" />
                
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-bold text-3xl text-[var(--space-text)]">{update.version}</h2>
                  <span className="text-sm text-[var(--space-text-subtle)] font-mono">{update.date}</span>
                </div>

                <div className="grid gap-4">
                  {update.changes.map((change, cIdx) => (
                    <div 
                      key={cIdx} 
                      className="glass-panel p-4 flex items-start gap-4 border border-[var(--space-border)] bg-[var(--space-card)]/80 rounded-2xl"
                    >
                      <span className={`text-[9px] font-mono font-semibold uppercase px-2 py-0.5 rounded shrink-0 ${TYPE_COLORS[change.type]}`}>
                        {change.type}
                      </span>
                      <p className="text-sm text-[var(--space-text-muted)] leading-relaxed">
                        {change.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </main>
        <FooterSection />
      </div>
    </div>
  );
}
