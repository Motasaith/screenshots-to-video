import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";

export default function Privacy() {
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
            Privacy Policy
          </h1>
          <p className="font-dm text-muted-foreground">
            Effective Date: May 9, 2026
          </p>
        </motion.div>

        <div className="neo-card p-8 bg-card border-2 space-y-8 font-dm text-foreground leading-relaxed">
          <section>
            <h2 className="font-syne font-bold text-2xl mb-4">1. Information We Collect</h2>
            <p className="mb-4">
              When you use AIVideo, we may collect the following types of information:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Information:</strong> Name, email address, and authentication data via Google OAuth.</li>
              <li><strong>Content Data:</strong> Screenshots, video scripts, generated audio, and final MP4 files uploaded or generated through our service.</li>
              <li><strong>Usage Data:</strong> Information about how you interact with our application, browser type, and device information.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-syne font-bold text-2xl mb-4">2. How We Use Your Information</h2>
            <p>
              The information we collect is used to provide, maintain, and improve our services; to process your video generation requests (including sending data to AI models and FFmpeg workers); and to communicate with you about your account or support inquiries.
            </p>
          </section>

          <section>
            <h2 className="font-syne font-bold text-2xl mb-4">3. Data Storage and Security</h2>
            <p>
              Your screenshots and videos are securely stored using Cloudflare R2 and Supabase. While we implement industry-standard security measures to protect your data, no method of transmission over the internet or electronic storage is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="font-syne font-bold text-2xl mb-4">4. Sharing Your Information</h2>
            <p>
              We do not sell your personal data. We may share necessary data with third-party service providers (like ElevenLabs or edge-tts) strictly for the purpose of generating your requested video content.
            </p>
          </section>

          <section>
            <h2 className="font-syne font-bold text-2xl mb-4">5. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at <strong>hello@aivideo.ai</strong>.
            </p>
          </section>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
