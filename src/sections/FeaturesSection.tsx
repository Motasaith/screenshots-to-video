import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Target,
  FileText,
  Mic,
  Wand2,
} from "lucide-react";

const features = [
  {
    icon: Target,
    title: "Cinematic Zoom",
    description:
      "The only tool that animates zoom into specific UI elements within static screenshots. Click or drag to mark what matters — our FFmpeg pipeline handles the rest.",
    detail: "Competitors record your screen. We make screenshots move. The zoom algorithm smoothly transitions from full image to your target region, creating a professional tutorial feel without any screen recording software.",
  },
  {
    icon: FileText,
    title: "AI Script Generation",
    description:
      "Describe your steps in plain English. Our AI writes clear, natural narration scripts tailored to your audience and platform.",
    detail: "The AI analyzes your topic, target platform, and audience skill level to generate concise narration. Every script is editable — you maintain full control over the final output.",
  },
  {
    icon: Mic,
    title: "Voice Synthesis",
    description:
      "Choose from 6 premium voices. Each script is converted to natural-sounding speech with precise timing that matches your video segments.",
    detail: "Edge-TTS voices for the free tier, ElevenLabs premium voices for Pro. Speaking speed control from 0.8x to 1.3x. The audio duration drives every downstream timing decision.",
  },
  {
    icon: Wand2,
    title: "One-Click Render",
    description:
      "Upload, annotate, and render. The entire pipeline runs automatically — audio generation, zoom calculation, segment rendering, and final concatenation.",
    detail: "No manual editing, no timeline scrubbing. The render queue processes each step in sequence and delivers a finished MP4 file. Background music overlay and custom intros available on Pro.",
  },
];

export default function FeaturesSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="features" className="py-24 lg:py-32 dot-grid" ref={ref}>
      <div className="w-full px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <span className="font-mono text-xs text-[var(--sketch-fg-muted)] uppercase tracking-widest bg-[#FBBF24]/20 px-2 py-1 sketch-border-sm inline-block">
            Why AIVideo
          </span>
          <h2 className="font-body font-bold text-3xl lg:text-5xl mt-3 tracking-tight text-[var(--sketch-fg)]">
            Built for technical
            <br />
            content creators
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:sticky lg:top-32 lg:self-start"
          >
            <div className="sketch-card p-8 bg-[var(--sketch-card-bg)]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#FBBF24]/10 border-2 border-[#FBBF24] flex items-center justify-center sketch-border-sm">
                  {(() => {
                    const Icon = features[activeIndex].icon;
                    return <Icon className="w-6 h-6 text-[#1E1B4B]" />;
                  })()}
                </div>
                <h3 className="font-body font-bold text-2xl text-[var(--sketch-fg)]">
                  {features[activeIndex].title}
                </h3>
              </div>
              <p className="font-body text-[var(--sketch-fg-muted)] leading-relaxed mb-4">
                {features[activeIndex].description}
              </p>
              <p className="font-body text-sm text-[var(--sketch-fg-subtle)] leading-relaxed">
                {features[activeIndex].detail}
              </p>
            </div>
          </motion.div>

          <div className="space-y-4">
            {features.map((feature, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                onClick={() => setActiveIndex(index)}
                className={`w-full text-left p-5 border-2 transition-all duration-200 ${
                  activeIndex === index
                      ? "border-[var(--sketch-border-color)] bg-[#FBBF24]/5 shadow-[4px_4px_0px_0px_#FBBF24]"
                      : "border-[var(--sketch-fg-subtle)] bg-[var(--sketch-card-bg)] hover:border-[var(--sketch-fg-muted)]"
                }`}
                style={{ borderRadius: activeIndex === index ? "255px 15px 225px 15px/15px 225px 15px 255px" : "12px" }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 flex items-center justify-center border-2 flex-shrink-0 ${
                      activeIndex === index
                        ? "border-[#FBBF24] bg-[#FBBF24]/10"
                          : "border-[var(--sketch-fg-subtle)] bg-[var(--sketch-card-bg)]"
                    }`}
                    style={{ borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px" }}
                  >
                    <feature.icon
                      className={`w-5 h-5 ${
                        activeIndex === index ? "text-[var(--sketch-fg)]" : "text-[var(--sketch-fg-subtle)]"
                      }`}
                    />
                  </div>
                  <div>
                    <h4 className="font-body font-semibold text-lg text-[var(--sketch-fg)]">
                      {feature.title}
                    </h4>
                    <p className="font-body text-sm text-[var(--sketch-fg-subtle)] line-clamp-1">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
