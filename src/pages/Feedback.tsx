import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function Feedback() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-2xl mx-auto pt-32 pb-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-body font-bold text-5xl tracking-tight mb-4 text-center text-[var(--sketch-fg)]">
            Send Feedback
          </h1>
          <p className="font-body text-[var(--sketch-fg-muted)] text-center mb-12">
            Your ideas help shape the future of AIVideo. Let us know what we can improve.
          </p>

          <form className="sketch-card p-8 bg-[var(--sketch-card-bg)] border-2 space-y-6">
            <div className="space-y-4">
              <Label className="font-body font-bold text-lg text-[var(--sketch-fg)]">What kind of feedback is this?</Label>
              <div className="grid grid-cols-2 gap-4">
                <Button type="button" variant="outline" className="h-12 border-2 hover:border-[var(--sketch-accent)] focus:border-[var(--sketch-accent)] focus:ring-1 focus:ring-[var(--sketch-accent)] font-body text-[var(--sketch-fg)]">Bug Report</Button>
                <Button type="button" variant="outline" className="h-12 border-2 hover:border-[var(--sketch-accent)] focus:border-[var(--sketch-accent)] focus:ring-1 focus:ring-[var(--sketch-accent)] font-body text-[var(--sketch-fg)]">Feature Request</Button>
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <Label className="font-body font-bold text-[var(--sketch-fg)]">Details</Label>
              <Textarea 
                placeholder="Please provide as much detail as possible..." 
                className="min-h-[200px] border-2 sketch-input font-body"
              />
            </div>

            <Button className="w-full font-body font-bold text-lg py-6 sketch-btn-primary">
              Submit Feedback
            </Button>
          </form>
        </motion.div>
      </main>
      <FooterSection />
    </div>
  );
}
