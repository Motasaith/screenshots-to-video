import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";
import { SEO, createBreadcrumbSchema } from "@/components/SEO";
import { SpaceBackground } from "@/components/shared/SpaceBackground";

export default function Privacy() {
  const breadcrumbJsonLd = createBreadcrumbSchema([
    { name: "Home", url: "https://aivideo.ai/" },
    { name: "Privacy Policy", url: "https://aivideo.ai/privacy" },
  ]);

  return (
    <div className="theme-3d-immersive min-h-screen relative overflow-x-hidden font-sans">
      <SEO
        title="Privacy Policy"
        description="AIVideo's Privacy Policy — learn how we collect, use, and protect your data."
        canonical="https://aivideo.ai/privacy"
        noindex
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
              Privacy Policy
            </h1>
            <p className="text-sm text-[var(--space-text-subtle)] font-mono">
              Effective Date: June 11, 2026
            </p>
          </motion.div>

          <div className="glass-panel p-8 bg-[var(--space-card)]/80 border border-[var(--space-border)] space-y-8 text-[var(--space-text-muted)] leading-relaxed rounded-2xl">
            <section>
              <h2 className="font-bold text-2xl mb-4 text-teal-600 dark:text-teal-400">1. Information We Collect</h2>
              <p className="mb-4">
                When you use AIVideo, we may collect the following types of information:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-sm">
                <li><strong>Account Information:</strong> Name, email address, and authentication data via Google OAuth.</li>
                <li><strong>Content Data:</strong> Screenshots, text prompts, video scripts, generated audio, and final MP4 files uploaded or generated through our service.</li>
                <li><strong>Usage Data:</strong> Information about how you interact with our application, browser type, and device information.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-2xl mb-4 text-teal-600 dark:text-teal-400">2. How We Use Your Information</h2>
              <p className="text-sm">
                The information we collect is used to provide, maintain, and improve our services; to process your video generation requests (including sending data to AI text and Vision models, and FFmpeg workers); and to communicate with you about your account or support inquiries.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-2xl mb-4 text-teal-600 dark:text-teal-400">3. Data Storage and Security</h2>
              <p className="text-sm">
                Your screenshots and videos are securely stored using R2/B2 cloud storage. While we implement industry-standard security measures to protect your data, no method of transmission over the internet or electronic storage is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-2xl mb-4 text-teal-600 dark:text-teal-400">4. Sharing Your Information & AI Providers</h2>
              <p className="text-sm">
                We do not sell your personal data. We share necessary data with third-party AI models (for script generation, Vision copyright scanning, and Proactive Guide chats) and services (like ElevenLabs or edge-tts) strictly for the purpose of generating your requested video content. We do not permit these providers to use your private data to train their base models.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-2xl mb-4 text-teal-600 dark:text-teal-400">5. Contact Us</h2>
              <p className="text-sm">
                If you have any questions about this Privacy Policy, please contact us at <strong className="text-[var(--space-text)] font-mono">hello@aivideo.ai</strong>.
              </p>
            </section>
          </div>
        </main>
        <FooterSection />
      </div>
    </div>
  );
}
