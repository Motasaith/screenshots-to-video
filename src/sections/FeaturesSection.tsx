import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Target,
  FileText,
  Mic,
  Wand2,
  Layout,
  ShieldCheck,
  MessageSquare,
  Smartphone,
} from "lucide-react";

const features = [
  {
    icon: Layout,
    title: "Two Creation Modes",
    description:
      "Build videos your way. Use the Screenshot Tutorial wizard for software guides, or switch to the AI Video Studio for text-to-video creative control.",
    detail: "Our platform adapts to your workflow. The traditional wizard is perfect for 'how-to' technical guides, while the new Studio mode offers a canvas for storytelling and creative video generation.",
  },
  {
    icon: Target,
    title: "Zoom & Transitions",
    description:
      "Automated cinematic zoom combined with customizable slide, fade, and flip transitions between your scenes.",
    detail: "We don't just concatenate images. The FFmpeg pipeline applies smooth pan-and-zoom animations to highlight specific UI elements, seamlessly tied together with professional video transitions and custom Intro/Outro templates.",
  },
  {
    icon: MessageSquare,
    title: "Proactive AI Guide",
    description:
      "A contextual AI assistant sits right next to your canvas, offering real-time tips, script feedback, and preventing gibberish.",
    detail: "Stuck on a title? Typed something random? The AI Guide actively watches your inputs and proactively suggests improvements. It knows exactly which step you are on and what project you are building.",
  },
  {
    icon: ShieldCheck,
    title: "Vision Copyright Checker",
    description:
      "Safe to monetize. Our Vision AI scans your uploaded screenshots to ensure they are free of known copyrighted material.",
    detail: "Before you render, our dedicated Vision LLM analyzes your visual assets. It flags major movie characters, famous video game assets, and non-fair-use logos so you can confidently upload to YouTube and AdSense.",
  },
  {
    icon: Mic,
    title: "Ultra-Real Voiceovers",
    description:
      "Native Edge-TTS for free users, and seamless integration with ElevenLabs Ultra-Real Voices for PRO accounts.",
    detail: "Generate natural-sounding narration with precise timing. Choose your speaker, adjust the pacing (0.8x to 1.3x), and toggle randomization to ensure your YouTube videos remain completely unique.",
  },
  {
    icon: Smartphone,
    title: "Multi-Platform Export",
    description:
      "Export your videos in 16:9, 9:16, 1:1, or 4:5 aspect ratios. Perfect for YouTube, TikTok, LinkedIn, or Instagram Reels.",
    detail: "Don't get locked into a single format. Our FFmpeg renderer dynamically adjusts padding, cropping, and zooming algorithms to perfectly fit your chosen aspect ratio without stretching your media.",
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
