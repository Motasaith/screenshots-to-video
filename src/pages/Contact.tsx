import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SEO, createBreadcrumbSchema } from "@/components/SEO";
import { AdSensePlaceholder } from "@/components/shared/AdSensePlaceholder";
import { SpaceBackground } from "@/components/shared/SpaceBackground";

export default function Contact() {
  const breadcrumbJsonLd = createBreadcrumbSchema([
    { name: "Home", url: "https://aivideo.ai/" },
    { name: "Contact", url: "https://aivideo.ai/contact" },
  ]);

  return (
    <div className="theme-3d-immersive min-h-screen relative overflow-x-hidden font-sans">
      <SEO
        title="Contact Us"
        description="Get in touch with the AIVideo team. Questions, feedback, or enterprise inquiries: we'd love to hear from you."
        canonical="https://aivideo.ai/contact"
        jsonLd={breadcrumbJsonLd}
      />
      <SpaceBackground />
      <div className="relative z-10">
        <Navbar />
        <main className="max-w-4xl mx-auto pt-32 pb-20 px-6">
          <div className="grid gap-16 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h1 className="font-extrabold text-5xl lg:text-6xl tracking-tight mb-6 text-[var(--space-text)]">
                Get in <span className="text-teal-600 dark:text-teal-400">Touch</span>
              </h1>
              <p className="text-lg text-[var(--space-text-muted)] mb-8 leading-relaxed">
                Have a question about our cinematic zoom technology? Need a custom enterprise plan? Or just want to say hi? We'd love to hear from you.
              </p>
              
              <div className="space-y-6">
                <div className="glass-panel p-6 border border-[var(--space-border)]">
                  <h3 className="font-bold text-xl mb-2 text-[var(--space-text)]">Email</h3>
                  <p className="text-[var(--space-text-muted)] font-mono text-sm">hello@aivideo.ai</p>
                </div>
                <div className="glass-panel p-6 border border-[var(--space-border)]">
                  <h3 className="font-bold text-xl mb-2 text-[var(--space-text)]">Twitter / X</h3>
                  <p className="text-[var(--space-text-muted)] font-mono text-sm">@aivideo_ai</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-panel p-8 border border-[var(--space-border)]"
            >
              <form className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-semibold text-sm text-[var(--space-text)]">Your Name</Label>
                  <Input id="name" placeholder="John Doe" className="w-full bg-[var(--space-card)] border-[var(--space-border)] text-[var(--space-text)] rounded-xl py-3 px-4 focus:ring-teal-500 focus:border-teal-500" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-semibold text-sm text-[var(--space-text)]">Email Address</Label>
                  <Input id="email" type="email" placeholder="john@example.com" className="w-full bg-[var(--space-card)] border-[var(--space-border)] text-[var(--space-text)] rounded-xl py-3 px-4 focus:ring-teal-500 focus:border-teal-500" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message" className="font-semibold text-sm text-[var(--space-text)]">Message</Label>
                  <Textarea id="message" placeholder="Tell us what's on your mind..." className="w-full bg-[var(--space-card)] border-[var(--space-border)] text-[var(--space-text)] rounded-xl py-3 px-4 focus:ring-teal-500 focus:border-teal-500 min-h-[150px]" />
                </div>
                <Button className="w-full glass-btn glass-btn-primary py-4 font-semibold text-sm rounded-xl">
                  Send Message →
                </Button>
              </form>
            </motion.div>
          </div>
        </main>
        <div className="container mx-auto px-4 mb-12"><AdSensePlaceholder size="leaderboard" /></div>
        <FooterSection />
      </div>
    </div>
  );
}
