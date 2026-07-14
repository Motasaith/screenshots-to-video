import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";
import { Button } from "@/components/ui/button";
import { ArrowRight, Code, Video, BrainCircuit } from "lucide-react";
import { SpaceBackground } from "@/components/shared/SpaceBackground";

const POSITIONS = [
  {
    title: "Senior Full Stack Engineer",
    type: "Full-Time",
    location: "Remote (Global)",
    icon: Code,
    desc: "Help us scale the edge-tts integration and React frontend infrastructure."
  },
  {
    title: "Video Processing Specialist (FFmpeg)",
    type: "Contract",
    location: "Remote",
    icon: Video,
    desc: "Optimize our rendering workers for faster cinematic zoom exports."
  },
  {
    title: "AI Research Engineer (Vision LLMs)",
    type: "Full-Time",
    location: "Remote",
    icon: BrainCircuit,
    desc: "Improve our copyright scanning heuristics and visual content understanding."
  }
];

export default function Careers() {
  return (
    <div className="theme-3d-immersive min-h-screen relative overflow-x-hidden font-sans">
      <SpaceBackground />
      <div className="relative z-10">
        <Navbar />
        <main className="max-w-5xl mx-auto pt-32 pb-20 px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="font-extrabold text-5xl lg:text-6xl tracking-tight mb-6 text-[var(--space-text)]">
              Redefining <span className="text-teal-600">documentation.</span>
            </h1>
            <p className="text-lg text-[var(--space-text-muted)] max-w-2xl mx-auto leading-relaxed">
              We are a small, fast-shipping team building the future of automated cinematic tutorials and AI video generation. 
              Join us and let's craft tools that creators actually enjoy using.
            </p>
          </motion.div>

          <div className="relative">
            {/* OVERLAY */}
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className="glass-panel bg-[var(--space-card)]/90 px-10 py-8 text-center max-w-sm w-full mx-4 border border-teal-500 shadow-[0_0_40px_rgba(13,148,136,0.25)] rounded-2xl">
                <h2 className="font-bold text-3xl uppercase tracking-widest text-teal-500">Coming Soon</h2>
                <p className="text-[var(--space-text)] mt-3 font-medium text-sm leading-relaxed">We're quietly building our core team right now. Check back later!</p>
              </div>
            </div>

            <div className="blur-[5px] opacity-30 pointer-events-none select-none">
              <div className="mb-16">
                <h2 className="font-bold text-3xl mb-8 border-b border-[var(--space-border)] pb-4 text-[var(--space-text)]">Open Positions</h2>
                <div className="space-y-6">
                  {POSITIONS.map((pos, idx) => {
                    const Icon = pos.icon;
                    return (
                      <div key={idx} className="glass-panel p-6 border border-[var(--space-border)] bg-[var(--space-card)]/80 flex flex-col md:flex-row md:items-center justify-between gap-6 group rounded-2xl">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-teal-500/10 rounded-xl border border-teal-500/20">
                            <Icon className="w-6 h-6 text-teal-500" />
                          </div>
                          <div>
                            <h3 className="font-bold text-xl mb-1 text-[var(--space-text)]">{pos.title}</h3>
                            <div className="flex gap-3 mb-2 text-xs text-[var(--space-text-subtle)] font-mono">
                              <span className="bg-[var(--space-card)] px-2 py-0.5 rounded border border-[var(--space-border)]">{pos.type}</span>
                              <span className="bg-[var(--space-card)] px-2 py-0.5 rounded border border-[var(--space-border)]">{pos.location}</span>
                            </div>
                            <p className="text-[var(--space-text-muted)] text-sm leading-relaxed">{pos.desc}</p>
                          </div>
                        </div>
                        <Button className="shrink-0 glass-btn glass-btn-primary rounded-xl text-xs py-3 px-6 font-semibold">
                          Apply Now <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="glass-panel p-10 bg-teal-500/5 text-center border border-dashed border-teal-500/30 rounded-2xl">
                <h3 className="font-bold text-2xl mb-3 text-[var(--space-text)]">Don't see a fit?</h3>
                <p className="text-[var(--space-text-muted)] text-sm mb-6 max-w-lg mx-auto leading-relaxed">
                  We're always looking for talented folks. Send your resume to hello@aivideo.ai and tell us how you can help.
                </p>
                <Button variant="outline" className="border border-[var(--space-border)] bg-[var(--space-card)] text-[var(--space-text)] hover:border-teal-500 hover:text-teal-500 font-semibold px-8 py-3.5 rounded-xl text-sm transition-colors">
                  Send Open Application
                </Button>
              </div>
            </div>
          </div>
        </main>
        <FooterSection />
      </div>
    </div>
  );
}
