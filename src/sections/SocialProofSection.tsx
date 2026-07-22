import { motion } from "framer-motion";
import { useRef } from "react";

const integrations = [
  { name: "YouTube Presets" },
  { name: "ElevenLabs Voice AI" },
  { name: "TikTok Vertical Video" },
  { name: "LinkedIn Presets" },
  { name: "FFmpeg Cloud GPU" },
  { name: "Edge-TTS Engine" },
];

export default function SocialProofSection() {
  const ref = useRef(null);

  return (
    <section
      ref={ref}
      className="py-6 border-y border-[var(--space-border)] backdrop-blur-md relative overflow-hidden select-none"
      style={{ backgroundColor: 'var(--space-card)' }}
    >
      {/* Decorative top/bottom glow lines */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-500/10 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-500/10 to-transparent" />
      
      <div className="w-full px-6 lg:px-12 relative z-10">
        {/* Marquee with CSS mask fade edges */}
        <div
          className="relative overflow-hidden w-full"
          style={{
            maskImage: 'linear-gradient(to right, transparent, black 80px, black calc(100% - 80px), transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 80px, black calc(100% - 80px), transparent)',
          }}
        >
          <div className="flex items-center gap-12 animate-marquee">
            {[...integrations, ...integrations, ...integrations].map((item, i) => (
              <div key={i} className="flex items-center gap-12 flex-shrink-0">
                <motion.span
                  className="font-sans font-bold text-base text-slate-600 dark:text-slate-400 whitespace-nowrap cursor-pointer transition-all duration-300 hover:text-teal-600 dark:hover:text-teal-400"
                  whileHover={{
                    scale: 1.05,
                    y: -1,
                    filter: "drop-shadow(0 0 6px rgba(13, 148, 136, 0.2))",
                  }}
                >
                  {item.name}
                </motion.span>
                {/* Pulsing separator dot */}
                <motion.span
                  className="w-1 h-1 rounded-full bg-[var(--space-text-subtle)] flex-shrink-0"
                  animate={{ opacity: [0.2, 0.6, 0.2], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
