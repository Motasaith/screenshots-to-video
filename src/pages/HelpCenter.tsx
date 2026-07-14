import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";
import { Search, Book, MessageCircle, PlayCircle, Settings, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SpaceBackground } from "@/components/shared/SpaceBackground";

const CATEGORIES = [
  { icon: PlayCircle, title: "Getting Started", desc: "Learn the basics of creating your first video from screenshots." },
  { icon: MessageCircle, title: "AI Script Guide", desc: "How to use AI-generated scripts and edit them for your narration." },
  { icon: Book, title: "Copyright Checker", desc: "Understanding how the Vision LLM scans your project." },
  { icon: Settings, title: "Editor Tools", desc: "Master zoom, highlights, blur, captions, and transitions." },
  { icon: HelpCircle, title: "Troubleshooting", desc: "Fixing render errors and common issues." },
];

export default function HelpCenter() {
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
              How can we <span className="text-teal-600">help?</span>
            </h1>
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--space-text-subtle)] w-5 h-5" />
              <Input 
                placeholder="Search for answers..." 
                className="pl-12 py-6 text-lg bg-[var(--space-card)] border-[var(--space-border)] text-[var(--space-text)] rounded-2xl focus:ring-teal-500 focus:border-teal-500 shadow-sm"
              />
            </div>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <div key={idx} className="glass-panel p-6 cursor-pointer group hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border border-[var(--space-border)]">
                  <Icon className="w-8 h-8 text-teal-500 mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="font-bold text-xl mb-2 text-[var(--space-text)] group-hover:text-teal-600 transition-colors">
                    {cat.title}
                  </h3>
                  <p className="text-[var(--space-text-muted)] text-sm leading-relaxed">{cat.desc}</p>
                </div>
              );
            })}
          </div>
        </main>
        <FooterSection />
      </div>
    </div>
  );
}
