import { useRef, useState, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, Film, Play } from "lucide-react";
import { Link } from "react-router";

const cycleTexts = [
  { icon: Play, text: "No credit card required" },
  { icon: Film, text: "5 free credits per month" },
  { icon: Sparkles, text: "Join 2,400+ creators" },
];

const confettiColors = ["#0d9488", "#14b8a6", "#2dd4bf", "#0f766e", "#64748b", "#334155"];

export default function CTASection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [cycleIndex, setCycleIndex] = useState(0);
  const [confettiParticles, setConfettiParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    color: string;
  }>>([]);

  // Text cycling timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCycleIndex((prev) => (prev + 1) % cycleTexts.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Confetti burst on click
  const triggerConfetti = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const particles = Array.from({ length: 12 }).map((_, i) => ({
      id: Date.now() + i,
      x: cx,
      y: cy,
      color: confettiColors[i % confettiColors.length],
    }));

    setConfettiParticles(particles);
    setTimeout(() => setConfettiParticles([]), 700);
  };

  return (
    <section className="py-14 lg:py-20 relative overflow-hidden" ref={ref}>
      {/* Rotating light beams background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
        <motion.div
          className="absolute w-[800px] h-[800px]"
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          style={{
            background: `conic-gradient(
              from 0deg,
              transparent 0deg,
              rgba(13, 148, 136, 0.03) 15deg,
              transparent 30deg,
              transparent 90deg,
              rgba(20, 184, 166, 0.03) 105deg,
              transparent 120deg,
              transparent 180deg,
              rgba(45, 212, 191, 0.03) 195deg,
              transparent 210deg,
              transparent 270deg,
              rgba(15, 118, 110, 0.02) 285deg,
              transparent 300deg,
              transparent 360deg
            )`,
            maskImage: "radial-gradient(circle, black 30%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(circle, black 30%, transparent 70%)",
          }}
        />
      </div>

      {/* Energy lines converging toward center */}
      {isInView && (
        <div className="absolute inset-0 pointer-events-none z-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-px left-0 right-0"
              style={{
                top: `${20 + i * 12}%`,
                background: `linear-gradient(90deg, transparent, var(--neon-cyan), transparent)`,
                opacity: 0.06,
              }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: [0, 1, 0] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.4,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      )}

      <div className="w-full px-6 lg:px-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="max-w-3xl mx-auto"
        >
          {/* Main Glass CTA Panel */}
          <div className="glass-panel rounded-3xl p-8 lg:p-14 text-center relative overflow-hidden border border-[var(--space-border)] shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            {/* Gloss reflection overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.01] via-transparent to-white/[0.02] pointer-events-none" />

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-teal-500" />
              <span className="font-mono text-xs font-semibold text-teal-600 dark:text-teal-300 uppercase tracking-wider">
                Instant Access
              </span>
            </div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="font-extrabold text-3xl sm:text-4xl lg:text-5xl text-[var(--space-text)] tracking-tight leading-tight"
            >
              Ready to create your
              <br />
              <span className="text-gradient-neon">first cinematic tutorial?</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="font-sans text-base lg:text-lg text-[var(--space-text-muted)] mt-4 max-w-xl mx-auto leading-relaxed"
            >
              Join thousands of creators who turn screenshots into studio-grade videos with automated camera zooms, scripting, and voiceovers.
            </motion.p>

            {/* CTA Button with breathing glow + ripple + confetti */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-8 flex justify-center"
            >
              <Link
                to="/dashboard"
                className="glass-btn glass-btn-primary px-8 py-4 text-sm font-semibold shadow-lg group relative animate-breathing-glow"
                onClick={triggerConfetti}
              >
                {/* Ripple ring */}
                <span className="animate-ripple" />

                Create Free Video
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />

                {/* Confetti particles */}
                {confettiParticles.map((p) => {
                  const angle = Math.random() * Math.PI * 2;
                  const distance = 40 + Math.random() * 60;
                  return (
                    <span
                      key={p.id}
                      className="confetti-particle"
                      style={{
                        left: p.x,
                        top: p.y,
                        backgroundColor: p.color,
                        "--confetti-x": `${Math.cos(angle) * distance}px`,
                        "--confetti-y": `${Math.sin(angle) * distance}px`,
                      } as React.CSSProperties}
                    />
                  );
                })}
              </Link>
            </motion.div>

            {/* Cycling text badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mt-8 flex items-center justify-center h-6"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={cycleIndex}
                  initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-2 text-xs text-[var(--space-text-subtle)] font-sans"
                >
                  {(() => {
                    const CycleIcon = cycleTexts[cycleIndex].icon;
                    return <CycleIcon className="w-3.5 h-3.5 text-teal-500" />;
                  })()}
                  <span>{cycleTexts[cycleIndex].text}</span>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
