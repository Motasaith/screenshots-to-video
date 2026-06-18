import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { Users } from "lucide-react";

const integrations = [
  { name: "YouTube Presets" },
  { name: "ElevenLabs Voice AI" },
  { name: "TikTok Vertical Video" },
  { name: "LinkedIn Posts" },
  { name: "FFmpeg Cloud GPU" },
  { name: "Edge-TTS Engine" },
  { name: "Microsoft Teams Guides" },
  { name: "Universal MP4 Output" },
];

function AnimatedCount({ target, isInView }: { target: number; isInView: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const duration = 2000;
    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isInView, target]);

  return <span>{count.toLocaleString()}</span>;
}

export default function SocialProofSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section
      ref={ref}
      className="pt-8 pb-10 border-y border-[var(--space-border)] backdrop-blur-md relative overflow-hidden select-none"
      style={{ backgroundColor: 'var(--space-card)' }}
    >
      {/* Decorative top/bottom glow lines */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-500/10 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-500/10 to-transparent" />
      
      <div className="w-full px-6 lg:px-12 relative z-10">
        {/* Counter badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center gap-3 mb-6"
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--space-card)] border border-[var(--space-border)] backdrop-blur-md shadow-[0_4px_15px_rgba(0,0,0,0.02)]">
            <div className="w-7 h-7 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            </div>
            <span className="font-sans text-sm font-bold text-[var(--space-text)]">
              <AnimatedCount target={2400} isInView={isInView} />+
            </span>
            <span className="font-sans text-xs text-[var(--space-text-muted)]">creators worldwide</span>
          </div>
        </motion.div>

        <p className="text-center font-sans text-[10px] text-[var(--space-text-subtle)] uppercase tracking-[0.25em] mb-6">
          compatibility & export presets
        </p>
        
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
