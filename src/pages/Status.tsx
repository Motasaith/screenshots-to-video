import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";
import { CheckCircle2 } from "lucide-react";

const SYSTEMS = [
  { name: "Web Application", status: "operational", uptime: "99.99%" },
  { name: "API Services", status: "operational", uptime: "99.98%" },
  { name: "FFmpeg Render Workers", status: "degraded", uptime: "98.50%" },
  { name: "Vision Copyright LLM", status: "operational", uptime: "99.99%" },
  { name: "UploadThing Storage", status: "operational", uptime: "100%" },
];

export default function Status() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-3xl mx-auto pt-32 pb-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="font-body font-bold text-6xl tracking-tight mb-4 text-[var(--sketch-fg)]">
            System Status
          </h1>
          <div className="sketch-card p-4 bg-green-100/50 dark:bg-green-900/20 border-green-500 border-2 flex items-center gap-3">
            <CheckCircle2 className="text-green-600 dark:text-green-400 w-6 h-6" />
            <span className="font-body font-bold text-green-800 dark:text-green-300">All Systems Operational</span>
          </div>
        </motion.div>

        <div className="space-y-4">
          {SYSTEMS.map((sys) => (
            <div key={sys.name} className="sketch-card p-6 bg-[var(--sketch-card-bg)] flex items-center justify-between">
              <div>
                <h3 className="font-body font-bold text-xl mb-1 text-[var(--sketch-fg)]">{sys.name}</h3>
                <p className="font-body text-sm text-[var(--sketch-fg-muted)]">Uptime (30 days): {sys.uptime}</p>
              </div>
              <div className="flex items-center gap-2">
                {sys.status === "operational" ? (
                  <>
                    <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                    <span className="font-body font-bold text-green-600">Operational</span>
                  </>
                ) : (
                  <>
                    <span className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" />
                    <span className="font-body font-bold text-yellow-600">Degraded Performance</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
