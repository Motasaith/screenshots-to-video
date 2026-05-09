import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";
import { Github, ExternalLink } from "lucide-react";

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
        
        <div className="grid gap-8 md:grid-cols-2 mb-12">
          <div className="neo-card p-8 bg-primary/5 border-2">
            <h2 className="font-syne font-bold text-2xl mb-4">Our Mission</h2>
            <p className="font-dm text-foreground leading-relaxed">
              We believe that creating high-quality, professional video documentation shouldn't require a film degree. Our mission is to empower developers, support agents, and technical writers to turn simple screenshots into cinematic masterpieces in minutes.
            </p>
          </div>
          <div className="neo-card p-8 bg-card border-2">
            <h2 className="font-syne font-bold text-2xl mb-4">The Platform</h2>
            <p className="font-dm text-foreground leading-relaxed">
              AIVideo combines cutting-edge edge-tts technology with robust FFmpeg rendering. By automating the zoom-panning and narration, we ensure your videos always look crisp, engaging, and professional.
            </p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="neo-card p-8 bg-card border-2"
        >
          <h2 className="font-syne font-bold text-3xl mb-6 flex items-center gap-3">
            The Creator
          </h2>
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-1 space-y-4">
              <h3 className="font-syne font-bold text-2xl text-primary">Abdul Rauf Azhar</h3>
              <p className="font-dm text-foreground leading-relaxed">
                Full stack developer with deep knowledge of AI and AI-integrated applications. 
                Currently a Data Science student at KFUEIT University.
              </p>
              <p className="font-dm text-muted-foreground leading-relaxed">
                I built AIVideo to solve a real problem: making technical communication 
                visually engaging without the massive time investment of traditional video editing.
              </p>
              <div className="pt-4">
                <a 
                  href="https://github.com/Motasaith" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-syne font-bold hover:text-primary transition-colors"
                >
                  <Github className="w-5 h-5" />
                  View my GitHub Profile
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
      <FooterSection />
    </div>
  );
}
