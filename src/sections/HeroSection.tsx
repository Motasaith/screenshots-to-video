import { motion } from "framer-motion";
import { Link } from "react-router";
import { ArrowRight, Play, Sparkles, Zap, Check } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative pt-28 pb-20 lg:pt-36 lg:pb-28 overflow-hidden grid-pattern">
      <div className="w-full px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <h1 className="font-syne font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight text-foreground">
              Screenshots in.
              <br />
              <span className="text-primary">Professional</span>
              <br />
              videos out.
            </h1>

            <p className="mt-6 text-base lg:text-lg text-muted-foreground max-w-lg font-dm leading-relaxed">
              Upload screenshots, add descriptions, and let AI generate
              cinematic tutorial videos with intelligent zoom animations on the
              exact elements that matter.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/login" className="neo-btn-primary">
                Create Free Video
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button className="neo-btn-ghost">
                <Play className="w-4 h-4" />
                Watch 90s Demo
              </button>
            </div>

            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                <span className="font-dm">No credit card</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                <span className="font-dm">5 free videos</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                <span className="font-dm">1080p export</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="relative"
          >
            <div className="relative bg-card border-2 border-border shadow-[6px_6px_0px_0px_hsl(var(--border))] rounded-sm overflow-hidden">
              <div className="bg-muted border-b-2 border-border px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <div className="w-3 h-3 rounded-full border border-border bg-muted-foreground/30" />
                  <div className="w-3 h-3 rounded-full bg-accent" />
                </div>
                <span className="font-mono text-xs text-muted-foreground ml-2">
                  AIVideo Editor — Tutorial Project
                </span>
              </div>

              <div className="p-5 space-y-3">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-primary/10 border border-primary flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-syne font-semibold text-sm">
                      How to Clean Windows Temp Files
                    </div>
                    <div className="font-dm text-xs text-muted-foreground">
                      5 steps — YouTube — 1080p
                    </div>
                  </div>
                </div>

                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex gap-3 p-3 border border-border bg-background"
                  >
                    <div className="w-14 h-14 bg-muted border border-border flex-shrink-0 flex items-center justify-center">
                      <span className="font-mono text-xs text-muted-foreground">
                        IMG
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-dm text-xs font-medium text-muted-foreground">
                        Step {i}
                      </div>
                      <div className="font-dm text-sm truncate">
                        {i === 1
                          ? "Open Disk Cleanup from Start menu"
                          : i === 2
                            ? "Select the system drive (C:)"
                            : "Check temporary files checkbox"}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {i === 2 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-mono text-primary">
                            <Zap className="w-3 h-3" />
                            Script Generated
                          </span>
                        ) : (
                          <span className="text-xs font-mono text-accent">
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
                className="absolute top-16 -right-3 bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold border-2 border-border shadow-[3px_3px_0px_0px_hsl(var(--border))]"
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
