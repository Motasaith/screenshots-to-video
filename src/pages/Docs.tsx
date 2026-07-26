import { motion } from "framer-motion";
import { Book, Terminal, Settings2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";
import { SEO, createBreadcrumbSchema } from "@/components/SEO";
import { SpaceBackground } from "@/components/shared/SpaceBackground";

export default function Docs() {
  const breadcrumbJsonLd = createBreadcrumbSchema([
    { name: "Home", url: "https://aivideo.ai/" },
    { name: "Documentation", url: "https://aivideo.ai/docs" },
  ]);

  return (
    <div className="theme-3d-immersive min-h-screen relative overflow-x-hidden font-sans">
      <SEO
        title="Documentation"
        description="Learn how to create cinematic, AI-narrated tutorials from your screenshots with AIVideo's documentation."
        canonical="https://aivideo.ai/docs"
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
              Documentation
            </h1>
            <p className="text-lg text-[var(--space-text-muted)] leading-relaxed">
              Learn how to create cinematic, AI-narrated tutorials from your screenshots.
            </p>
          </motion.div>

          <div className="space-y-12">
            <section>
              <h2 className="font-bold text-2xl mb-4 flex items-center gap-2 text-[var(--space-text)]">
                <Book className="w-6 h-6 text-teal-500 animate-pulse" />
                Quick Start
              </h2>
              <div className="glass-panel p-6 border border-[var(--space-border)] bg-[var(--space-card)]/80 rounded-2xl">
                <p className="text-[var(--space-text-muted)] text-sm mb-4 leading-relaxed">
                  Creating your first AIVideo is simple. Upload screenshots, edit them with our built-in annotation tools, and render a polished video.
                </p>
                <ol className="list-decimal pl-5 space-y-3.5 text-sm text-[var(--space-text-muted)] leading-relaxed">
                  <li><strong>Create a Project:</strong> Name your project, pick a platform preset (YouTube, TikTok, Teams), and choose an aspect ratio (16:9, 9:16, 1:1, or 4:5). Upload your screenshots.</li>
                  <li><strong>Edit & Annotate:</strong> Use the canvas editor to add highlight boxes, blur sensitive data, set zoom targets, add captions, watermarks, and step numbers. AI generates voiceover scripts for each step.</li>
                  <li><strong>AI Scripting:</strong> Our LLM converts your descriptions into a professional, conversational script tailored to your chosen platform. Edit any script to fine-tune the narration.</li>
                  <li><strong>Cinematic Styling:</strong> Set zoom targets, choose slide/fade transitions, and select Intro/Outro templates. Adjust voice and speaking speed.</li>
                  <li><strong>Render:</strong> The FFmpeg engine compiles your annotated screenshots with AI narration, zoom animations, and transitions into a final MP4.</li>
                  <li><strong>Export:</strong> Download the completed video immediately from your dashboard.</li>
                </ol>
              </div>
            </section>

            <section>
              <h2 className="font-bold text-2xl mb-4 flex items-center gap-2 text-[var(--space-text)]">
                <Terminal className="w-6 h-6 text-teal-500" />
                Best Practices
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="glass-panel p-5 border border-[var(--space-border)] bg-[var(--space-card)]/80 rounded-2xl">
                  <h3 className="font-bold text-lg mb-2 text-[var(--space-text)]">Capturing Screenshots</h3>
                  <ul className="list-disc pl-5 text-sm text-[var(--space-text-muted)] space-y-2 leading-relaxed">
                    <li>Capture the full application window, not just small snippets.</li>
                    <li>Ensure the UI is clean (close unrelated tabs or notifications).</li>
                    <li>Use a consistent window size for all screenshots.</li>
                  </ul>
                </div>
                <div className="glass-panel p-5 border border-[var(--space-border)] bg-[var(--space-card)]/80 rounded-2xl">
                  <h3 className="font-bold text-lg mb-2 text-[var(--space-text)]">Writing Descriptions</h3>
                  <ul className="list-disc pl-5 text-sm text-[var(--space-text-muted)] space-y-2 leading-relaxed">
                    <li>Keep it concise: describe the single action taking place.</li>
                    <li>Use active voice (e.g., "Click the submit button").</li>
                    <li>Chat with the Proactive AI Guide if you get stuck.</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-bold text-2xl mb-4 flex items-center gap-2 text-[var(--space-text)]">
                <Settings2 className="w-6 h-6 text-teal-500" />
                Advanced Features
              </h2>
              <div className="glass-panel p-6 border border-[var(--space-border)] bg-[var(--space-card)]/80 rounded-2xl">
                <p className="text-sm text-[var(--space-text-muted)] leading-relaxed">
                  AIVideo supports advanced timeline controls, dynamic zoom panning, and multi-aspect ratio rendering (16:9, 9:16, 1:1, 4:5). When you set a target coordinate, the FFmpeg rendering engine automatically calculates a smooth, eased interpolation from the full frame to a 2.5x zoom level focused entirely on your target. Additionally, the Vision Copyright Checker uses an advanced LLM to scan your media, ensuring your output is completely safe for AdSense monetization before rendering even begins.
                </p>
              </div>
            </section>
          </div>
        </main>
        <FooterSection />
      </div>
    </div>
  );
}
