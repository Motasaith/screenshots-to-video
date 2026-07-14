import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";
import { MessageSquare, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpaceBackground } from "@/components/shared/SpaceBackground";

export default function Community() {
  return (
    <div className="theme-3d-immersive min-h-screen relative overflow-x-hidden font-sans">
      <SpaceBackground />
      <div className="relative z-10">
        <Navbar />
        <main className="max-w-4xl mx-auto pt-32 pb-20 px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="font-extrabold text-5xl lg:text-6xl tracking-tight mb-4 text-[var(--space-text)]">
              Join the <span className="text-teal-600">Community</span>
            </h1>
            <p className="text-lg text-[var(--space-text-muted)] max-w-xl mx-auto leading-relaxed">
              Connect with other creators, share your videos, and learn new technical documentation and AI Video generation techniques.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="glass-panel p-8 border border-[var(--space-border)] bg-[var(--space-card)]/80 flex flex-col items-center text-center">
              <MessageSquare className="w-12 h-12 text-[#5865F2] mb-6 animate-pulse" />
              <h2 className="font-bold text-2xl mb-4 text-[var(--space-text)]">Discord Server</h2>
              <p className="text-[var(--space-text-muted)] text-sm mb-8 leading-relaxed">
                Our main hub for real-time chat, feature requests, and showcasing your latest cinematic tutorials.
              </p>
              <Button className="w-full font-bold py-6 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-xl text-sm shadow-md transition-all">
                Join Discord Server
              </Button>
            </div>

            <div className="glass-panel p-8 border border-[var(--space-border)] bg-[var(--space-card)]/80 flex flex-col items-center text-center">
              <Github className="w-12 h-12 text-[var(--space-text)] mb-6 hover:rotate-12 transition-transform" />
              <h2 className="font-bold text-2xl mb-4 text-[var(--space-text)]">GitHub Discussions</h2>
              <p className="text-[var(--space-text-muted)] text-sm mb-8 leading-relaxed">
                The best place for bug reports, API integrations, and developer-focused conversations.
              </p>
              <Button className="w-full font-bold py-6 glass-btn glass-btn-primary rounded-xl text-sm transition-all">
                View Discussions
              </Button>
            </div>
          </div>
        </main>
        <FooterSection />
      </div>
    </div>
  );
}
