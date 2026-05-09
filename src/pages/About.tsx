import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto pt-32 pb-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="font-syne font-bold text-5xl tracking-tight mb-4">
            About AIVideo
          </h1>
          <p className="font-dm text-lg text-muted-foreground">
            We are revolutionizing how technical teams share knowledge.
          </p>
        </motion.div>
        
        <div className="grid gap-8 md:grid-cols-2">
          <div className="neo-card p-8 bg-primary/5">
            <h2 className="font-syne font-bold text-2xl mb-4">Our Mission</h2>
            <p className="font-dm text-foreground leading-relaxed">
              We believe that creating high-quality, professional video documentation shouldn't require a film degree. Our mission is to empower developers, support agents, and technical writers to turn simple screenshots into cinematic masterpieces in minutes.
            </p>
          </div>
          <div className="neo-card p-8 bg-card">
            <h2 className="font-syne font-bold text-2xl mb-4">The Platform</h2>
            <p className="font-dm text-foreground leading-relaxed">
              AIVideo combines cutting-edge edge-tts technology with robust FFmpeg rendering. By automating the zoom-panning and narration, we ensure your videos always look crisp, engaging, and professional.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
