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
    title: "AI Research Engineer",
    type: "Full-Time",
    location: "Remote",
    icon: BrainCircuit,
    desc: "Improve our layout detection models for smarter automatic zooming."
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
          <h1 className="font-syne font-bold text-6xl tracking-tight mb-6">
            Help us redefine <span className="text-primary">documentation.</span>
          </h1>
          <p className="font-dm text-xl text-muted-foreground max-w-2xl mx-auto">
            We are a small, fast-shipping team building the future of automated cinematic tutorials. 
            Join us and let's craft tools that people actually enjoy using.
          </p>
        </motion.div>

        <div className="relative">
          {/* OVERLAY */}
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="neo-card bg-card border-4 border-primary px-10 py-6 transform -rotate-3 text-center max-w-sm w-full mx-4 shadow-[12px_12px_0px_0px_rgba(255,77,0,1)]">
              <h2 className="font-syne font-bold text-4xl uppercase tracking-widest text-primary">Coming Soon</h2>
              <p className="font-dm text-foreground mt-3 font-semibold">We're quietly building our core team right now. Check back later!</p>
            </div>
          </div>

          <div className="blur-[6px] opacity-40 pointer-events-none select-none">
            <div className="mb-16">
              <h2 className="font-syne font-bold text-3xl mb-8 border-b-2 border-border pb-4">Open Positions</h2>
              <div className="space-y-6">
                {POSITIONS.map((pos, idx) => {
                  const Icon = pos.icon;
              return (
                <div key={idx} className="neo-card p-6 bg-card flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-sm border-2 border-border">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-syne font-bold text-xl mb-1">{pos.title}</h3>
                      <div className="flex gap-3 mb-2 font-dm text-sm">
                        <span className="bg-muted px-2 py-1 rounded-sm border border-border">{pos.type}</span>
                        <span className="bg-muted px-2 py-1 rounded-sm border border-border">{pos.location}</span>
                      </div>
                      <p className="font-dm text-muted-foreground">{pos.desc}</p>
                    </div>
                  </div>
                  <Button className="shrink-0 font-syne font-bold border-2 hover:bg-primary hover:text-primary-foreground group-hover:shadow-offset transition-all">
                    Apply Now <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="neo-card p-10 bg-primary/5 text-center border-2 border-primary border-dashed">
          <h3 className="font-syne font-bold text-2xl mb-3">Don't see a fit?</h3>
          <p className="font-dm text-muted-foreground mb-6">
            We're always looking for talented folks. Send your resume to hello@aivideo.ai and tell us how you can help.
          </p>
          <Button variant="outline" className="border-2 border-primary text-primary hover:bg-primary hover:text-white font-syne font-bold px-8">
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
