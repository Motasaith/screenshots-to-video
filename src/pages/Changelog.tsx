import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";

const UPDATES = [
  {
    version: "v1.2.0",
    date: "May 9, 2026",
    changes: [
      { type: "added", text: "Full Video Processing Pipeline: Integrated FFmpeg rendering and worker management." },
      { type: "added", text: "AI Intelligence: LLM integration for automatic script generation and guidance." },
      { type: "added", text: "Wizard UI: Complete 7-step interactive flow from setup to export." },
    ],
  },
  {
    version: "v1.1.0",
    date: "May 8, 2026",
    changes: [
      { type: "fixed", text: "Resolved FFmpeg and TTS dependency issues for stable rendering." },
      { type: "improved", text: "Enhanced UploadThing URL handling for seamless asset management." },
      { type: "added", text: "Automatic script generation based on uploaded screenshots." },
    ],
  },
  {
    version: "v1.0.0",
    date: "May 7, 2026",
    changes: [
      { type: "added", text: "Initial Project Setup: Migration to UploadThing for storage." },
      { type: "added", text: "Core architecture and project documentation established." },
    ],
  },
];

const TYPE_COLORS: Record<string, string> = {
  added: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  fixed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  improved: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

export default function Changelog() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-3xl mx-auto pt-32 pb-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16 text-center"
        >
          <h1 className="font-syne font-bold text-6xl tracking-tight mb-4">
            <span className="text-primary">Changelog</span>
          </h1>
          <p className="font-dm text-xl text-muted-foreground">
            Tracking every improvement, fix, and new feature of AIVideo.
          </p>
        </motion.div>

        <div className="space-y-12">
          {UPDATES.map((update) => (
            <div key={update.version} className="relative pl-8 border-l-2 border-border">
              <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-primary border-4 border-background" />
              
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-syne font-bold text-3xl">{update.version}</h2>
                <span className="font-dm text-muted-foreground">{update.date}</span>
              </div>

              <div className="grid gap-4">
                {update.changes.map((change, cIdx) => (
                  <div 
                    key={cIdx} 
                    className="neo-card p-4 bg-card flex items-start gap-4"
                  >
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-sm shrink-0 ${TYPE_COLORS[change.type]}`}>
                      {change.type}
                    </span>
                    <p className="font-dm text-foreground leading-relaxed">
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
  );
}
