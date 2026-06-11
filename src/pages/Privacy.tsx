import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";
import { SEO, createBreadcrumbSchema } from "@/components/SEO";

export default function Privacy() {
  const breadcrumbJsonLd = createBreadcrumbSchema([
    { name: "Home", url: "https://aivideo.ai/" },
    { name: "Privacy Policy", url: "https://aivideo.ai/privacy" },
  ]);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Privacy Policy"
        description="AIVideo's Privacy Policy — learn how we collect, use, and protect your data."
        canonical="https://aivideo.ai/privacy"
        noindex
        jsonLd={breadcrumbJsonLd}
      />
      <Navbar />
      <main className="max-w-4xl mx-auto pt-32 pb-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="font-body font-bold text-5xl tracking-tight mb-4 text-[var(--sketch-fg)]">
            Privacy Policy
          </h1>
          <p className="font-body text-[var(--sketch-fg-muted)]">
            Effective Date: June 11, 2026
          </p>
        </motion.div>

        <div className="sketch-card p-8 bg-[var(--sketch-card-bg)] border-2 space-y-8 font-body text-[var(--sketch-fg)] leading-relaxed">
          <section>
            <h2 className="font-body font-bold text-2xl mb-4 text-[var(--sketch-accent)]">1. Information We Collect</h2>
            <p className="mb-4">
              When you use AIVideo, we may collect the following types of information:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Information:</strong> Name, email address, and authentication data via Google OAuth.</li>
              <li><strong>Content Data:</strong> Screenshots, text prompts, video scripts, generated audio, and final MP4 files uploaded or generated through our service.</li>
              <li><strong>Usage Data:</strong> Information about how you interact with our application, browser type, and device information.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-body font-bold text-2xl mb-4 text-[var(--sketch-accent)]">2. How We Use Your Information</h2>
            <p>
              The information we collect is used to provide, maintain, and improve our services; to process your video generation requests (including sending data to AI text and Vision models, and FFmpeg workers); and to communicate with you about your account or support inquiries.
            </p>
          </section>

          <section>
            <h2 className="font-body font-bold text-2xl mb-4 text-[var(--sketch-accent)]">3. Data Storage and Security</h2>
            <p>
              Your screenshots and videos are securely stored using UploadThing and Supabase. While we implement industry-standard security measures to protect your data, no method of transmission over the internet or electronic storage is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="font-body font-bold text-2xl mb-4 text-[var(--sketch-accent)]">4. Sharing Your Information & AI Providers</h2>
            <p>
              We do not sell your personal data. We share necessary data with third-party AI models (for script generation, Vision copyright scanning, and Proactive Guide chats) and services (like ElevenLabs or edge-tts) strictly for the purpose of generating your requested video content. We do not permit these providers to use your private data to train their base models.
            </p>
          </section>

          <section>
            <h2 className="font-body font-bold text-2xl mb-4 text-[var(--sketch-accent)]">5. Contact Us</h2>
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
