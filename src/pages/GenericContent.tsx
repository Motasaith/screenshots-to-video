import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { SpaceBackground } from "@/components/shared/SpaceBackground";
import FooterSection from "@/sections/FooterSection";

export default function GenericContent({ title, description }: { title: string, description: string }) {
  return (
    <div className="theme-3d-immersive min-h-screen relative overflow-x-hidden font-sans">
      <SpaceBackground />
      <div className="relative z-10">
        <Navbar />
        <main className="max-w-4xl mx-auto pt-32 pb-20 px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <h1 className="font-extrabold text-4xl lg:text-5xl tracking-tight mb-4 text-[var(--space-text)]">
              {title}
            </h1>
            <p className="text-lg text-[var(--space-text-muted)] leading-relaxed">
              {description}
            </p>
          </motion.div>
          
          <div className="glass-panel p-12 text-center border border-[var(--space-border)]">
            <p className="text-[var(--space-text-muted)] font-medium">
              This section is currently under development. Check back soon for updates.
            </p>
          </div>
        </main>
        <FooterSection />
      </div>
    </div>
  );
}
