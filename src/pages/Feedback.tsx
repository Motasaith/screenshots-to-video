import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SpaceBackground } from "@/components/shared/SpaceBackground";

export default function Feedback() {
  return (
    <div className="theme-3d-immersive min-h-screen relative overflow-x-hidden font-sans">
      <SpaceBackground />
      <div className="relative z-10">
        <Navbar />
        <main className="max-w-2xl mx-auto pt-32 pb-20 px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="font-extrabold text-5xl tracking-tight mb-4 text-center text-[var(--space-text)]">
              Send Feedback
            </h1>
            <p className="text-[var(--space-text-muted)] text-center mb-12">
              Your ideas help shape the future of AIVideo. Let us know what we can improve.
            </p>

            <form className="glass-panel p-8 border border-[var(--space-border)] bg-[var(--space-card)]/80 space-y-6">
              <div className="space-y-4">
                <Label className="font-bold text-sm text-[var(--space-text)]">What kind of feedback is this?</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Button type="button" variant="outline" className="h-12 bg-[var(--space-card)] border-[var(--space-border)] hover:border-teal-500 hover:text-teal-500 text-[var(--space-text)] rounded-xl transition-all">Bug Report</Button>
                  <Button type="button" variant="outline" className="h-12 bg-[var(--space-card)] border-[var(--space-border)] hover:border-teal-500 hover:text-teal-500 text-[var(--space-text)] rounded-xl transition-all">Feature Request</Button>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <Label className="font-bold text-sm text-[var(--space-text)]">Details</Label>
                <Textarea 
                  placeholder="Please provide as much detail as possible..." 
                  className="min-h-[200px] w-full bg-[var(--space-card)] border-[var(--space-border)] text-[var(--space-text)] rounded-xl py-3 px-4 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <Button className="w-full glass-btn glass-btn-primary py-6 text-sm font-semibold rounded-xl transition-all">
                Submit Feedback
              </Button>
            </form>
          </motion.div>
        </main>
        <FooterSection />
      </div>
    </div>
  );
}
