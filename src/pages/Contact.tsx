import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function Contact() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto pt-32 pb-20 px-6">
        <div className="grid gap-16 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="font-syne font-bold text-6xl tracking-tight mb-6">
              Get in <span className="text-primary">Touch</span>
            </h1>
            <p className="font-dm text-lg text-muted-foreground mb-8 leading-relaxed">
              Have a question about our cinematic zoom technology? Need a custom enterprise plan? Or just want to say hi? We'd love to hear from you.
            </p>
            
            <div className="space-y-6">
              <div className="neo-card p-6 bg-card">
                <h3 className="font-syne font-bold text-xl mb-2">Email</h3>
                <p className="font-dm text-muted-foreground">hello@aivideo.ai</p>
              </div>
              <div className="neo-card p-6 bg-card">
                <h3 className="font-syne font-bold text-xl mb-2">Twitter / X</h3>
                <p className="font-dm text-muted-foreground">@aivideo_ai</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="neo-card p-8 bg-card border-2"
          >
            <form className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-syne font-bold">Your Name</Label>
                <Input id="name" placeholder="John Doe" className="border-2" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="font-syne font-bold">Email Address</Label>
                <Input id="email" type="email" placeholder="john@example.com" className="border-2" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message" className="font-syne font-bold">Message</Label>
                <Textarea id="message" placeholder="Tell us what's on your mind..." className="border-2 min-h-[150px]" />
              </div>
              <Button className="w-full font-syne font-bold py-6 text-lg shadow-offset">
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
