import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";

export default function GenericContent({ title, description }: { title: string, description: string }) {
  return (
    <div className="min-h-screen dot-grid">
      <Navbar />
      <main className="max-w-4xl mx-auto pt-32 pb-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="font-body font-bold text-5xl tracking-tight mb-4 text-[var(--sketch-fg)]">
            {title}
          </h1>
          <p className="font-body text-lg text-[var(--sketch-fg-muted)]">
            {description}
          </p>
        </motion.div>
        
        <div className="sketch-card p-12 text-center">
          <p className="font-body text-[var(--sketch-fg-muted)]">
            This section is currently under development. Check back soon for updates.
          </p>
        </div>
      </main>
    </div>
  );
}
