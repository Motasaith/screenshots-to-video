import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";
import { Shield, FileText, Lock } from "lucide-react";
import { Link } from "react-router";
import { SpaceBackground } from "@/components/shared/SpaceBackground";

export default function Legal() {
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
              Legal & <span className="text-teal-650">Compliance</span>
            </h1>
            <p className="text-lg text-[var(--space-text-muted)] max-w-xl mx-auto leading-relaxed">
              Everything you need to know about how we protect your data and the rules of our platform.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2">
            <Link to="/privacy" className="glass-panel p-8 bg-[var(--space-card)]/80 block border border-[var(--space-border)] hover:border-teal-500 hover:scale-[1.02] transition-all duration-300 group rounded-2xl">
              <Shield className="w-10 h-10 text-teal-500 mb-6 group-hover:scale-110 transition-transform" />
              <h2 className="font-bold text-2xl mb-3 group-hover:text-teal-650 transition-colors text-[var(--space-text)]">Privacy Policy</h2>
              <p className="text-[var(--space-text-muted)] text-sm leading-relaxed">
                Learn how we collect, store, and process your data. We believe in total transparency regarding your screenshots, generated scripts, and MP4 assets.
              </p>
            </Link>
            
            <Link to="/terms" className="glass-panel p-8 bg-[var(--space-card)]/80 block border border-[var(--space-border)] hover:border-teal-500 hover:scale-[1.02] transition-all duration-300 group rounded-2xl">
              <FileText className="w-10 h-10 text-teal-500 mb-6 group-hover:scale-110 transition-transform" />
              <h2 className="font-bold text-2xl mb-3 group-hover:text-teal-650 transition-colors text-[var(--space-text)]">Terms of Service</h2>
              <p className="text-[var(--space-text-muted)] text-sm leading-relaxed">
                The rules, obligations, and guidelines for using the AIVideo platform, including intellectual property rights and AI generation boundaries.
              </p>
            </Link>
          </div>

          <div className="mt-12 glass-panel p-8 bg-[var(--space-card)]/80 border border-[var(--space-border)] rounded-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-teal-500/10 rounded-xl border border-teal-500/20">
                <Lock className="w-6 h-6 text-teal-500" />
              </div>
              <h2 className="font-bold text-2xl text-[var(--space-text)]">Security & Compliance</h2>
            </div>
            <p className="text-[var(--space-text-muted)] text-sm leading-relaxed mb-4">
              We store all uploaded media securely via R2/B2 cloud storage. We use advanced LLMs (including Vision models for copyright scanning and Text models for script generation). We do not use your private project data to train base foundational AI models without your explicit, opt-in consent.
            </p>
            <p className="text-[var(--space-text-subtle)] text-xs font-mono">
              For specific DPA (Data Processing Agreement) requests or compliance audits, please reach out to our team at legal@aivideo.ai.
            </p>
          </div>
        </main>
        <FooterSection />
      </div>
    </div>
  );
}
