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
          <h1 className="font-syne font-bold text-6xl tracking-tight mb-4">
            Legal & <span className="text-primary">Compliance</span>
          </h1>
          <p className="font-dm text-xl text-muted-foreground">
            Everything you need to know about how we protect your data and the rules of our platform.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          <Link to="/privacy" className="neo-card p-8 bg-card block hover:border-primary transition-colors group">
            <Shield className="w-10 h-10 text-primary mb-6" />
            <h2 className="font-syne font-bold text-2xl mb-3 group-hover:text-primary transition-colors">Privacy Policy</h2>
            <p className="font-dm text-muted-foreground leading-relaxed">
              Learn how we collect, store, and process your data. We believe in total transparency regarding your screenshots, generated scripts, and MP4 assets.
            </p>
          </Link>
          
          <Link to="/terms" className="neo-card p-8 bg-card block hover:border-primary transition-colors group">
            <FileText className="w-10 h-10 text-primary mb-6" />
            <h2 className="font-syne font-bold text-2xl mb-3 group-hover:text-primary transition-colors">Terms of Service</h2>
            <p className="font-dm text-muted-foreground leading-relaxed">
              The rules, obligations, and guidelines for using the AIVideo platform, including intellectual property rights and liability boundaries.
            </p>
          </Link>
        </div>

        <div className="mt-12 neo-card p-8 bg-card border-2">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-primary/10 rounded-sm">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-syne font-bold text-2xl">Security & Compliance</h2>
          </div>
          <p className="font-dm text-foreground leading-relaxed mb-4">
            We store all uploaded media securely via Cloudflare R2 and utilize edge-tts securely through ephemeral workers. We do not use your private project data to train base foundational AI models without your explicit, opt-in consent.
          </p>
          <p className="font-dm text-muted-foreground text-sm">
            For specific DPA (Data Processing Agreement) requests or compliance audits, please reach out to our team at legal@aivideo.ai.
          </p>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
