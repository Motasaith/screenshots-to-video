import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";
import { CheckCircle2 } from "lucide-react";
import { SpaceBackground } from "@/components/shared/SpaceBackground";

const SYSTEMS = [
  { name: "Web Application", status: "operational", uptime: "99.99%" },
  { name: "API Services", status: "operational", uptime: "99.98%" },
  { name: "FFmpeg Render Workers", status: "operational", uptime: "99.95%" },
  { name: "Vision Copyright LLM", status: "operational", uptime: "99.99%" },
  { name: "R2/B2 Storage", status: "operational", uptime: "100%" },
];

export default function Status() {
  return (
    <div className="theme-3d-immersive min-h-screen relative overflow-x-hidden font-sans">
      <SpaceBackground />
      <div className="relative z-10">
        <Navbar />
        <main className="max-w-3xl mx-auto pt-32 pb-20 px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <h1 className="font-extrabold text-5xl tracking-tight mb-4 text-[var(--space-text)]">
              System Status
            </h1>
            <div className="glass-panel p-4 bg-emerald-500/5 border border-emerald-500/25 flex items-center gap-3 rounded-2xl shadow-sm">
              <CheckCircle2 className="text-emerald-500 w-6 h-6 animate-pulse" />
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">All Systems Operational</span>
            </div>
          </motion.div>

          <div className="space-y-4">
            {SYSTEMS.map((sys) => (
              <div key={sys.name} className="glass-panel p-6 border border-[var(--space-border)] bg-[var(--space-card)]/80 flex items-center justify-between rounded-2xl">
                <div>
                  <h3 className="font-bold text-xl mb-1 text-[var(--space-text)]">{sys.name}</h3>
                  <p className="text-sm text-[var(--space-text-muted)]">Uptime (30 days): {sys.uptime}</p>
                </div>
                <div className="flex items-center gap-2">
                  {sys.status === "operational" ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">Operational</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                      <span className="font-semibold text-amber-600 dark:text-amber-400 text-sm">Degraded</span>
                    </>
                  )}
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
