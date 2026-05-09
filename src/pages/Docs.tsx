import { motion } from "framer-motion";
import { Book, Terminal, Settings2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";

export default function Docs() {
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
            Documentation
          </h1>
          <p className="font-dm text-lg text-muted-foreground">
            Learn how to create cinematic, AI-narrated tutorials from your screenshots.
          </p>
        </motion.div>

        <div className="space-y-12">
          <section>
            <h2 className="font-syne font-bold text-2xl mb-4 flex items-center gap-2">
              <Book className="w-6 h-6 text-primary" />
              Quick Start
            </h2>
            <div className="neo-card p-6 prose prose-invert max-w-none">
              <p className="font-dm text-muted-foreground mb-4">
                Creating your first AIVideo is simple and takes less than 5 minutes.
              </p>
              <ol className="list-decimal pl-5 space-y-3 font-dm text-sm text-foreground">
                <li><strong>Project Setup:</strong> Define your tutorial's title, audience, and target platform (YouTube, Teams, etc.). Our AI will help refine your description to maximize impact.</li>
                <li><strong>Upload Screenshots:</strong> Take screenshots of the workflow you want to demonstrate. Upload them in order and provide a brief description of what action the user should take in each step.</li>
                <li><strong>Script Generation:</strong> Our AI will convert your brief descriptions into a professional, conversational script tailored to your chosen platform.</li>
                <li><strong>Cinematic Zooms:</strong> For each screenshot, click the area you want to emphasize. The video will automatically zoom and pan to this location.</li>
                <li><strong>Voice Selection:</strong> Choose an AI voice that matches your brand's tone. Adjust the speaking speed as needed.</li>
                <li><strong>Render & Export:</strong> We compile your screenshots, generate the TTS audio, apply the animations, and render a final MP4 ready for download.</li>
              </ol>
            </div>
          </section>

          <section>
            <h2 className="font-syne font-bold text-2xl mb-4 flex items-center gap-2">
              <Terminal className="w-6 h-6 text-accent" />
              Best Practices
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="neo-card p-5">
                <h3 className="font-syne font-bold text-lg mb-2">Capturing Screenshots</h3>
                <ul className="list-disc pl-5 font-dm text-sm text-muted-foreground space-y-1">
                  <li>Capture the full application window, not just small snippets.</li>
                  <li>Ensure the UI is clean (close unrelated tabs or notifications).</li>
                  <li>Use a consistent window size for all screenshots.</li>
                </ul>
              </div>
              <div className="neo-card p-5">
                <h3 className="font-syne font-bold text-lg mb-2">Writing Descriptions</h3>
                <ul className="list-disc pl-5 font-dm text-sm text-muted-foreground space-y-1">
                  <li>Keep it concise — describe the single action taking place.</li>
                  <li>Use active voice (e.g., "Click the submit button" instead of "The submit button should be clicked").</li>
                  <li>Let the AI handle the transitions and flow.</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-syne font-bold text-2xl mb-4 flex items-center gap-2">
              <Settings2 className="w-6 h-6 text-primary" />
              Advanced Features
            </h2>
            <div className="neo-card p-6">
              <p className="font-dm text-sm text-muted-foreground leading-relaxed">
                AIVideo supports advanced timeline controls and dynamic zoom panning. When you set a target coordinate, the FFmpeg rendering engine automatically calculates a smooth, eased interpolation from the full frame to a 2.5x zoom level focused entirely on your target. This ensures the viewer's attention is exactly where it needs to be without requiring you to manually keyframe animations in complex video editing software.
              </p>
            </div>
          </section>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
