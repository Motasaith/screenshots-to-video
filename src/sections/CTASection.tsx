import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Sparkles, Film, Star } from "lucide-react";
import { Link } from "react-router";

export default function CTASection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-24 lg:py-32 dot-grid relative overflow-hidden" ref={ref}>
      {/* Floating decorative doodles */}
      <motion.div
        animate={{ y: [0, -12, 0], rotate: [0, 5, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-12 left-[10%] text-[var(--sketch-fg-subtle)] hidden lg:block"
      >
        <Film className="w-10 h-10" />
      </motion.div>
      <motion.div
        animate={{ y: [0, 10, 0], rotate: [0, -8, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute top-20 right-[15%] text-[var(--sketch-fg-subtle)] hidden lg:block"
      >
        <Star className="w-8 h-8" />
      </motion.div>
      <motion.div
        animate={{ y: [0, -8, 0], rotate: [0, -5, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-16 left-[20%] text-[var(--sketch-fg-subtle)] hidden lg:block"
      >
        <Sparkles className="w-9 h-9" />
      </motion.div>

      <div className="w-full px-6 lg:px-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto"
        >
          {/* Main CTA Card */}
          <div className="sketch-card p-8 lg:p-12 text-center relative">
            {/* Handwritten floating note */}
            <motion.span
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="font-hand text-xl text-[#FBBF24] rotate-[-2deg] inline-block mb-4"
            >
              What are you waiting for? 🚀
            </motion.span>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="font-body font-extrabold text-3xl lg:text-5xl text-[var(--sketch-fg)] tracking-tight"
            >
              Ready to make your
              <br />
              first video?
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="font-body text-[var(--sketch-fg-muted)] mt-4 max-w-md mx-auto"
            >
              Join thousands of technical content creators who trust AIVideo for
              their tutorials.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-8 flex flex-wrap justify-center gap-4"
            >
              <Link
                to="/login"
                className="sketch-btn-primary text-base px-8 py-4"
              >
                Create Free Video
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>

            {/* Small trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mt-8 flex items-center justify-center gap-6 text-xs text-[var(--sketch-fg-subtle)]"
            >
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#FBBF24]" /> No credit card
              </span>
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#FBBF24]" /> 5 free videos
              </span>
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#FBBF24]" /> Cancel anytime
              </span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
