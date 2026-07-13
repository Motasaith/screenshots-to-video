import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";
import { Github, ExternalLink } from "lucide-react";
import { SEO, createBreadcrumbSchema } from "@/components/SEO";
import { AdSensePlaceholder } from "@/components/shared/AdSensePlaceholder";
import { SpaceBackground } from "@/components/shared/SpaceBackground";

export default function About() {
  const breadcrumbJsonLd = createBreadcrumbSchema([
    { name: "Home", url: "https://aivideo.ai/" },
    { name: "About", url: "https://aivideo.ai/about" },
  ]);

  return (
    <div className="theme-3d-immersive min-h-screen relative overflow-x-hidden font-sans">
      <SEO
        title="About AIVideo"
        description="Learn about AIVideo's mission to revolutionize how technical teams share knowledge through AI-powered video tutorials."
        canonical="https://aivideo.ai/about"
        jsonLd={breadcrumbJsonLd}
      />
      <SpaceBackground />
      <div className="relative z-10">
        <Navbar />
        <main className="max-w-4xl mx-auto pt-32 pb-20 px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <h1 className="font-extrabold text-5xl tracking-tight mb-4 text-[var(--space-text)]">
              About AIVideo
            </h1>
            <div className="container mx-auto px-4 mb-8">
              <AdSensePlaceholder size="leaderboard" />
            </div>
            <p className="text-lg text-[var(--space-text-muted)] leading-relaxed">
              We are revolutionizing how technical teams share knowledge.
            </p>
          </motion.div>
          
          <div className="grid gap-8 md:grid-cols-2 mb-12">
            <div className="glass-panel p-8 border border-[var(--space-border)]">
              <h2 className="font-bold text-2xl mb-4 text-[var(--space-text)]">Our Mission</h2>
              <p className="text-[var(--space-text-muted)] leading-relaxed">
                We believe that creating high-quality, professional video content shouldn't require a film degree. Our mission is to empower developers, creators, and teams to turn simple screenshots into cinematic video masterpieces in minutes.
              </p>
            </div>
            <div className="glass-panel p-8 border border-[var(--space-border)]">
              <h2 className="font-bold text-2xl mb-4 text-[var(--space-text)]">The Platform</h2>
              <p className="text-[var(--space-text-muted)] leading-relaxed">
                AIVideo combines cutting-edge AI (Vision LLMs, Proactive Chat Guides) with robust FFmpeg rendering. By automating zoom-panning, dynamic transitions, and copyright safety checks, we ensure your videos always look crisp, engaging, and ready for monetization.
              </p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel p-8 border border-[var(--space-border)]"
          >
            <h2 className="font-bold text-3xl mb-6 flex items-center gap-3 text-[var(--space-text)]">
              The Creator
            </h2>
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-1 space-y-4">
                <h3 className="font-bold text-2xl text-teal-600 dark:text-teal-400">Abdul Rauf Azhar</h3>
                <p className="text-[var(--space-text)] leading-relaxed">
                  Full stack developer with deep knowledge of AI and AI-integrated applications. 
                  Currently a Data Science student at KFUEIT University.
                </p>
                <p className="text-[var(--space-text-muted)] leading-relaxed">
                  I built AIVideo to solve a real problem: making technical communication 
                  visually engaging without the massive time investment of traditional video editing.
                </p>
                <div className="pt-4">
                  <a 
                    href="https://github.com/Motasaith" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-bold text-teal-600 dark:text-teal-400 hover:text-teal-500 transition-colors"
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
    </div>
  );
}
