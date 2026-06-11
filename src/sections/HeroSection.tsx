import { motion } from "framer-motion";
import { Link } from "react-router";
import { ArrowRight, Play, Sparkles, Zap, Check } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative pt-28 pb-20 lg:pt-36 lg:pb-28 overflow-hidden dot-grid">
      <div className="w-full px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <span className="font-hand text-xl text-[var(--sketch-fg-muted)] rotate-[-2deg] inline-block animate-float mb-2">
              Turn screenshots & text into stories ✏️
            </span>
            <h1 className="font-body font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight text-[var(--sketch-fg)]">
              Ideas in.
              <br />
              <span className="text-[var(--sketch-fg)] relative">
                <span className="relative z-10">Professional</span>
                <span className="absolute bottom-1 left-0 right-0 h-3 bg-[#FBBF24]/80 -z-0" style={{ borderRadius: "4px" }} />
              </span>
              <br />
              videos out.
            </h1>

            <p className="mt-6 text-base lg:text-lg text-[var(--sketch-fg-muted)] max-w-lg font-body leading-relaxed">
              Upload screenshots for software guides, or use the Studio Mode to generate stories from text. Let AI generate cinematic videos with intelligent zoom animations, automated voiceovers, and transitions.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/login" className="sketch-btn-primary">
                Create Free Video
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button className="sketch-btn-ghost">
                <Play className="w-4 h-4" />
                Watch 90s Demo
              </button>
            </div>

            <div className="mt-8 flex items-center gap-6 text-sm text-[var(--sketch-fg-muted)]">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#FBBF24]" />
                <span className="font-body">No credit card</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#FBBF24]" />
                <span className="font-body">5 free videos</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#FBBF24]" />
                <span className="font-body">1080p export</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="relative"
          >
            <div className="relative bg-[var(--sketch-card-bg)] border-2 border-[var(--sketch-border-color)] shadow-[6px_6px_0px_0px_#FBBF24] sketch-border-lg overflow-hidden">
              <div className="bg-[var(--sketch-card-bg)] border-b-2 border-[var(--sketch-border-color)] px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full border border-[var(--sketch-fg-subtle)] bg-[var(--sketch-fg-subtle)]" />
                  <div className="w-3 h-3 rounded-full bg-[#FBBF24]" />
                </div>
                <span className="font-mono text-xs text-[var(--sketch-fg-subtle)] ml-2">
                  AIVideo Editor — Tutorial Project
                </span>
              </div>

              <div className="p-5 space-y-3">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-[#FBBF24]/10 border-2 border-[#FBBF24] flex items-center justify-center sketch-border-sm">
                    <Sparkles className="w-4 h-4 text-[var(--sketch-fg)]" />
                  </div>
                  <div>
                    <div className="font-body font-semibold text-sm text-[var(--sketch-fg)]">
                      How to Clean Windows Temp Files
                    </div>
                    <div className="font-body text-xs text-[var(--sketch-fg-subtle)]">
                      5 steps — YouTube — 1080p
                    </div>
                  </div>
                </div>

                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex gap-3 p-3 border-2 border-[var(--sketch-fg-subtle)] bg-[var(--sketch-card-bg)]"
                    style={{ borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px" }}
                  >
                    <div className="w-14 h-14 bg-[var(--sketch-card-bg)] border-2 border-[var(--sketch-fg-subtle)] flex-shrink-0 flex items-center justify-center sketch-border-sm">
                      <span className="font-hand text-lg text-[var(--sketch-fg-subtle)]">
                        IMG
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-body text-xs font-medium text-[var(--sketch-fg-subtle)]">
                        Step {i}
                      </div>
                      <div className="font-body text-sm truncate text-[var(--sketch-fg)]">
                        {i === 1
                          ? "Open Disk Cleanup from Start menu"
                          : i === 2
                            ? "Select the system drive (C:)"
                            : "Check temporary files checkbox"}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {i === 2 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-mono text-[var(--sketch-fg)]">
                            <Zap className="w-3 h-3 text-[#FBBF24]" />
                            Script Generated
                          </span>
                        ) : (
                          <span className="text-xs font-mono text-emerald-500">
                            Ready
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1, duration: 0.4 }}
                className="absolute top-16 -right-3 bg-[var(--sketch-fg)] text-[var(--sketch-bg)] px-3 py-1.5 text-xs font-semibold border-2 border-[var(--sketch-border-color)] shadow-[3px_3px_0px_0px_#FBBF24] sketch-border-sm"
              >
                <Sparkles className="w-3 h-3 inline mr-1" />
                AI Powered
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
