import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";
import { Button } from "@/components/ui/button";
import { ArrowRight, Code, Video, BrainCircuit } from "lucide-react";

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
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-5xl mx-auto pt-32 pb-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="font-body font-bold text-6xl tracking-tight mb-6 text-[var(--sketch-fg)]">
            Help us redefine <span className="text-[var(--sketch-accent)]">documentation.</span>
          </h1>
          <p className="font-body text-xl text-[var(--sketch-fg-muted)] max-w-2xl mx-auto">
            We are a small, fast-shipping team building the future of automated cinematic tutorials and AI video generation. 
            Join us and let's craft tools that creators actually enjoy using.
          </p>
        </motion.div>

        <div className="relative">
          {/* OVERLAY */}
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="sketch-card bg-[var(--sketch-card-bg)] px-10 py-6 transform -rotate-3 text-center max-w-sm w-full mx-4 border-2 border-[var(--sketch-border-color)] shadow-[12px_12px_0px_0px_#FBBF24]">
              <h2 className="font-body font-bold text-4xl uppercase tracking-widest text-[var(--sketch-accent)]">Coming Soon</h2>
              <p className="font-body text-[var(--sketch-fg)] mt-3 font-semibold">We're quietly building our core team right now. Check back later!</p>
            </div>
          </div>

          <div className="blur-[6px] opacity-40 pointer-events-none select-none">
            <div className="mb-16">
              <h2 className="font-body font-bold text-3xl mb-8 border-b-2 border-[var(--sketch-border-color)] pb-4 text-[var(--sketch-fg)]">Open Positions</h2>
              <div className="space-y-6">
                {POSITIONS.map((pos, idx) => {
                  const Icon = pos.icon;
              return (
                <div key={idx} className="sketch-card p-6 bg-[var(--sketch-card-bg)] flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-[#FBBF24]/10 rounded-sm border-2 border-[var(--sketch-border-color)] sketch-border-sm">
                      <Icon className="w-6 h-6 text-[#1E1B4B]" />
                    </div>
                    <div>
                      <h3 className="font-body font-bold text-xl mb-1 text-[var(--sketch-fg)]">{pos.title}</h3>
                      <div className="flex gap-3 mb-2 font-body text-sm text-[var(--sketch-fg-muted)]">
                        <span className="bg-[var(--sketch-bg)] px-2 py-1 rounded-sm border border-[var(--sketch-border-color)]">{pos.type}</span>
                        <span className="bg-[var(--sketch-bg)] px-2 py-1 rounded-sm border border-[var(--sketch-border-color)]">{pos.location}</span>
                      </div>
                      <p className="font-body text-[var(--sketch-fg-muted)]">{pos.desc}</p>
                    </div>
                  </div>
                  <Button className="shrink-0 font-body font-bold border-2 sketch-btn-primary transition-all">
                    Apply Now <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="sketch-card p-10 bg-[#FBBF24]/5 text-center border-2 border-[#FBBF24] border-dashed">
          <h3 className="font-body font-bold text-2xl mb-3 text-[var(--sketch-fg)]">Don't see a fit?</h3>
          <p className="font-body text-[var(--sketch-fg-muted)] mb-6">
            We're always looking for talented folks. Send your resume to hello@aivideo.ai and tell us how you can help.
          </p>
          <Button variant="outline" className="border-2 border-[var(--sketch-border-color)] text-[var(--sketch-fg)] hover:bg-[#FBBF24] hover:text-[#1E1B4B] font-body font-bold px-8 sketch-btn-ghost">
            Send Open Application
          </Button>
        </div>
        </div>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
