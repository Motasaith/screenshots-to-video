import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SEO, createBreadcrumbSchema } from "@/components/SEO";

export default function Contact() {
  const breadcrumbJsonLd = createBreadcrumbSchema([
    { name: "Home", url: "https://aivideo.ai/" },
    { name: "Contact", url: "https://aivideo.ai/contact" },
  ]);

  return (
    <div className="min-h-screen dot-grid">
      <SEO
        title="Contact Us"
        description="Get in touch with the AIVideo team. Questions, feedback, or enterprise inquiries — we'd love to hear from you."
        canonical="https://aivideo.ai/contact"
        jsonLd={breadcrumbJsonLd}
      />
      <Navbar />
      <main className="max-w-4xl mx-auto pt-32 pb-20 px-6">
        <div className="grid gap-16 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="font-body font-bold text-6xl tracking-tight mb-6 text-[var(--sketch-fg)]">
              Get in <span className="text-[var(--sketch-accent)]">Touch</span>
            </h1>
            <p className="font-body text-lg text-[var(--sketch-fg-muted)] mb-8 leading-relaxed">
              Have a question about our cinematic zoom technology? Need a custom enterprise plan? Or just want to say hi? We'd love to hear from you.
            </p>
            
            <div className="space-y-6">
              <div className="sketch-card p-6">
                <h3 className="font-body font-bold text-xl mb-2 text-[var(--sketch-fg)]">Email</h3>
                <p className="font-body text-[var(--sketch-fg-muted)]">hello@aivideo.ai</p>
              </div>
              <div className="sketch-card p-6">
                <h3 className="font-body font-bold text-xl mb-2 text-[var(--sketch-fg)]">Twitter / X</h3>
                <p className="font-body text-[var(--sketch-fg-muted)]">@aivideo_ai</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="sketch-card p-8"
          >
            <form className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-body font-bold text-[var(--sketch-fg)]">Your Name</Label>
                <Input id="name" placeholder="John Doe" className="sketch-input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="font-body font-bold text-[var(--sketch-fg)]">Email Address</Label>
                <Input id="email" type="email" placeholder="john@example.com" className="sketch-input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message" className="font-body font-bold text-[var(--sketch-fg)]">Message</Label>
                <Textarea id="message" placeholder="Tell us what's on your mind..." className="sketch-input min-h-[150px]" />
              </div>
              <Button className="w-full font-body font-bold py-6 text-lg sketch-btn-primary">
                Send Message →
              </Button>
            </form>
          </motion.div>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
