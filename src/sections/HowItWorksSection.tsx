import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Upload, FileText, Target, Mic } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Upload Screenshots",
    description:
      "Drag and drop screenshots for each step of your tutorial. Add a short description for each one.",
    icon: Upload,
  },
  {
    number: "02",
    title: "AI Generates Script",
    description:
      "Our AI writes a professional narration script based on your descriptions. Edit it to match your voice.",
    icon: FileText,
  },
  {
    number: "03",
    title: "Mark Zoom Targets",
    description:
      "Click or drag on each screenshot to mark where the video should zoom. The AI can suggest targets too.",
    icon: Target,
  },
  {
    number: "04",
    title: "Choose Voice & Render",
    description:
      "Pick a voice, set the speed, and hit render. Your cinematic tutorial video is ready in minutes.",
    icon: Mic,
  },
];

export default function HowItWorksSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      id="how-it-works"
      className="py-24 lg:py-32 border-y-2 border-border bg-muted/20"
      ref={ref}
    >
      <div className="w-full px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="font-mono text-xs text-primary uppercase tracking-widest">
            How It Works
          </span>
          <h2 className="font-syne font-bold text-3xl lg:text-5xl mt-3 tracking-tight">
            From screenshots to video
            <br />
            in four steps
          </h2>
        </motion.div>

        <div className="relative">
          <div className="absolute left-8 lg:left-1/2 top-0 bottom-0 w-0.5 bg-border lg:-translate-x-px" />

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
                    className={`neo-card p-6 inline-block ${
                      index % 2 === 0 ? "text-right" : "text-left"
                    }`}
                  >
                    <span className="font-mono text-3xl font-bold text-primary/30">
                      {step.number}
                    </span>
                    <h3 className="font-syne font-bold text-xl mt-2">
                      {step.title}
                    </h3>
                    <p className="font-dm text-sm text-muted-foreground mt-2 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>

                <div className="absolute left-8 lg:left-1/2 w-4 h-4 bg-primary border-2 border-border -translate-x-1.5 mt-6 lg:mt-8" />

                <div className="lg:hidden ml-16">
                  <div className="neo-card p-6">
                    <span className="font-mono text-3xl font-bold text-primary/30">
                      {step.number}
                    </span>
                    <h3 className="font-syne font-bold text-xl mt-2">
                      {step.title}
                    </h3>
                    <p className="font-dm text-sm text-muted-foreground mt-2 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>

                <div
                  className={`hidden lg:flex w-1/2 ${
                    index % 2 === 0 ? "pl-16" : "pr-16 justify-end"
                  }`}
                >
                  <div className="w-16 h-16 bg-primary/10 border-2 border-primary flex items-center justify-center">
                    <step.icon className="w-8 h-8 text-primary" />
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
