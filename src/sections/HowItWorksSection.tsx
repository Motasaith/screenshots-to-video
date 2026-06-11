import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Upload, FileText, Target, Mic } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Choose Your Canvas",
    description:
      "Upload screenshots for a tutorial guide, or open the Studio Mode to generate video scenes from text prompts.",
    icon: Upload,
  },
  {
    number: "02",
    title: "AI Generates Script",
    description:
      "Our AI writes a professional narration script while the Proactive Chat Guide helps refine your ideas in real-time.",
    icon: FileText,
  },
  {
    number: "03",
    title: "Style & Animate",
    description:
      "Mark zoom targets, select slide transitions, and add custom Intro/Outro templates to make it cinematic.",
    icon: Target,
  },
  {
    number: "04",
    title: "Scan & Render",
    description:
      "Our Vision AI scans for copyright safety, then FFmpeg renders your final video in your chosen aspect ratio.",
    icon: Mic,
  },
];

export default function HowItWorksSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      id="how-it-works"
      className="py-24 lg:py-32 border-y-2 border-[var(--sketch-fg-subtle)] bg-[var(--sketch-bg)]"
      ref={ref}
    >
      <div className="w-full px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="font-mono text-xs text-[var(--sketch-fg-muted)] uppercase tracking-widest bg-[#FBBF24]/20 px-2 py-1 sketch-border-sm inline-block">
            How It Works
          </span>
          <h2 className="font-body font-bold text-3xl lg:text-5xl mt-3 tracking-tight text-[var(--sketch-fg)]">
            From screenshots to video
            <br />
            in four steps
          </h2>
        </motion.div>

        <div className="relative">
          <div className="absolute left-8 lg:left-1/2 top-0 bottom-0 w-0.5 bg-[var(--sketch-fg-subtle)] lg:-translate-x-px" />

          <div className="space-y-12 lg:space-y-16">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className={`relative flex items-start gap-8 lg:gap-0 ${
                  index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                }`}
              >
                <div
                  className={`hidden lg:block w-1/2 ${
                    index % 2 === 0 ? "pr-16 text-right" : "pl-16 text-left"
                  }`}
                >
                  <div
                    className={`sketch-card p-6 inline-block bg-[var(--sketch-card-bg)] ${
                      index % 2 === 0 ? "text-right" : "text-left"
                    }`}
                  >
                    <span className="font-hand text-3xl font-bold text-[#FBBF24]/60">
                      {step.number}
                    </span>
                    <h3 className="font-body font-bold text-xl mt-2 text-[var(--sketch-fg)]">
                      {step.title}
                    </h3>
                    <p className="font-body text-sm text-[var(--sketch-fg-muted)] mt-2 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>

                <div className="absolute left-8 lg:left-1/2 w-4 h-4 bg-[#FBBF24] border-2 border-[var(--sketch-border-color)] -translate-x-1.5 mt-6 lg:mt-8" style={{ borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px" }} />

                <div className="lg:hidden ml-16">
                  <div className="sketch-card p-6 bg-[var(--sketch-card-bg)]">
                    <span className="font-hand text-3xl font-bold text-[#FBBF24]/60">
                      {step.number}
                    </span>
                    <h3 className="font-body font-bold text-xl mt-2 text-[var(--sketch-fg)]">
                      {step.title}
                    </h3>
                    <p className="font-body text-sm text-[var(--sketch-fg-muted)] mt-2 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>

                <div
                  className={`hidden lg:flex w-1/2 ${
                    index % 2 === 0 ? "pl-16" : "pr-16 justify-end"
                  }`}
                >
                  <div className="w-16 h-16 bg-[#FBBF24]/10 border-2 border-[#FBBF24] flex items-center justify-center sketch-border-sm">
                    <step.icon className="w-8 h-8 text-[var(--sketch-fg)]" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
