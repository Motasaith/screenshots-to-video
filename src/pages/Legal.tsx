import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";
import { Shield, FileText, Lock } from "lucide-react";
import { Link } from "react-router";

export default function Legal() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto pt-32 pb-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="font-body font-bold text-6xl tracking-tight mb-4 text-[var(--sketch-fg)]">
            Legal & <span className="text-[var(--sketch-accent)]">Compliance</span>
          </h1>
          <p className="font-body text-xl text-[var(--sketch-fg-muted)]">
            Everything you need to know about how we protect your data and the rules of our platform.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          <Link to="/privacy" className="sketch-card p-8 bg-[var(--sketch-card-bg)] block hover:border-[var(--sketch-accent)] transition-colors group">
            <Shield className="w-10 h-10 text-[var(--sketch-accent)] mb-6" />
            <h2 className="font-body font-bold text-2xl mb-3 group-hover:text-[var(--sketch-accent)] transition-colors text-[var(--sketch-fg)]">Privacy Policy</h2>
            <p className="font-body text-[var(--sketch-fg-muted)] leading-relaxed">
              Learn how we collect, store, and process your data. We believe in total transparency regarding your screenshots, generated scripts, and MP4 assets.
            </p>
          </Link>
          
          <Link to="/terms" className="sketch-card p-8 bg-[var(--sketch-card-bg)] block hover:border-[var(--sketch-accent)] transition-colors group">
            <FileText className="w-10 h-10 text-[var(--sketch-accent)] mb-6" />
            <h2 className="font-body font-bold text-2xl mb-3 group-hover:text-[var(--sketch-accent)] transition-colors text-[var(--sketch-fg)]">Terms of Service</h2>
            <p className="font-body text-[var(--sketch-fg-muted)] leading-relaxed">
              The rules, obligations, and guidelines for using the AIVideo platform, including intellectual property rights and AI generation boundaries.
            </p>
          </Link>
        </div>

        <div className="mt-12 sketch-card p-8 bg-[var(--sketch-card-bg)] border-2">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-[#FBBF24]/10 rounded-sm sketch-border-sm">
              <Lock className="w-6 h-6 text-[#1E1B4B]" />
            </div>
            <h2 className="font-body font-bold text-2xl text-[var(--sketch-fg)]">Security & Compliance</h2>
          </div>
          <p className="font-body text-[var(--sketch-fg)] leading-relaxed mb-4">
            We store all uploaded media securely via UploadThing. We use advanced LLMs (including Vision models for copyright scanning and Text models for script generation). We do not use your private project data to train base foundational AI models without your explicit, opt-in consent.
          </p>
          <p className="font-body text-[var(--sketch-fg-muted)] text-sm">
            For specific DPA (Data Processing Agreement) requests or compliance audits, please reach out to our team at legal@aivideo.ai.
          </p>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
