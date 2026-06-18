import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import {
  Settings,
  Upload,
  Target,
  FileText,
  Volume2,
  Video,
  Cpu,
  Download,
  Sparkles,
  ChevronRight,
  Eye,
  CheckCircle2
} from "lucide-react";

interface StepConfig {
  number: string;
  title: string;
  tag: string;
  description: string;
  icon: React.ComponentType<any>;
  imagePath: string;
  accentColor: string;
  accentClass: string;
  borderClass: string;
  glowColor: string;
}

const steps: StepConfig[] = [
  {
    number: "01",
    title: "Project Setup",
    tag: "Initialization",
    description: "Define your project name, target platform preset (YouTube, TikTok, Teams), and choose a screen aspect ratio (16:9 or 9:16).",
    icon: Settings,
    imagePath: "/images/steps/step1.png",
    accentColor: "#0d9488",
    accentClass: "text-teal-600 dark:text-teal-400",
    borderClass: "border-l-teal-600 dark:border-l-teal-400",
    glowColor: "rgba(13, 148, 136, 0.12)",
  },
  {
    number: "02",
    title: "Asset Import",
    tag: "File Upload",
    description: "Upload high-resolution screenshots of your application UI. The asset manager supports sequential order organization.",
    icon: Upload,
    imagePath: "/images/steps/step2.png",
    accentColor: "#0d9488",
    accentClass: "text-teal-600 dark:text-teal-400",
    borderClass: "border-l-teal-600 dark:border-l-teal-400",
    glowColor: "rgba(13, 148, 136, 0.12)",
  },
  {
    number: "03",
    title: "UI Annotation",
    tag: "Canvas Editor",
    description: "Draw highlighting boxes, arrows, or blur private credentials directly on your screens with our secure editor.",
    icon: Target,
    imagePath: "/images/steps/step3.png",
    accentColor: "#0d9488",
    accentClass: "text-teal-600 dark:text-teal-400",
    borderClass: "border-l-teal-600 dark:border-l-teal-400",
    glowColor: "rgba(13, 148, 136, 0.12)",
  },
  {
    number: "04",
    title: "AI Scripting",
    tag: "Copywriting",
    description: "Our AI model analyzes your screenshot fields and drafts a natural technical voiceover script, which you can fully customize.",
    icon: FileText,
    imagePath: "/images/steps/step4.png",
    accentColor: "#0d9488",
    accentClass: "text-teal-600 dark:text-teal-400",
    borderClass: "border-l-teal-600 dark:border-l-teal-400",
    glowColor: "rgba(13, 148, 136, 0.12)",
  },
  {
    number: "05",
    title: "Voice Narration",
    tag: "ElevenLabs AI",
    description: "Choose from professional AI voice profiles. Adjust audio reading speed and select background ambient audio tracks.",
    icon: Volume2,
    imagePath: "/images/steps/step5.png",
    accentColor: "#0d9488",
    accentClass: "text-teal-600 dark:text-teal-400",
    borderClass: "border-l-teal-600 dark:border-l-teal-400",
    glowColor: "rgba(13, 148, 136, 0.12)",
  },
  {
    number: "06",
    title: "Camera Zoom & Transitions",
    tag: "Cinematics",
    description: "Define focal coordinates on your screens. The engine applies smooth camera pans, zoom adjustments, and slide transitions.",
    icon: Video,
    imagePath: "/images/steps/step6.png",
    accentColor: "#0d9488",
    accentClass: "text-teal-600 dark:text-teal-400",
    borderClass: "border-l-teal-600 dark:border-l-teal-400",
    glowColor: "rgba(13, 148, 136, 0.12)",
  },
  {
    number: "07",
    title: "Cloud Rendering",
    tag: "FFmpeg Compiler",
    description: "Our high-speed cloud graphics pipeline compiles the image frame buffers, audio synthesis layers, and transitions.",
    icon: Cpu,
    imagePath: "/images/steps/step7.png",
    accentColor: "#0d9488",
    accentClass: "text-teal-600 dark:text-teal-400",
    borderClass: "border-l-teal-600 dark:border-l-teal-400",
    glowColor: "rgba(13, 148, 136, 0.12)",
  },
  {
    number: "08",
    title: "Export & Share",
    tag: "MP4 Video",
    description: "Download the completed 1080p MP4 tutorial video immediately, or copy a public shareable video dashboard link.",
    icon: Download,
    imagePath: "/images/steps/step8.png",
    accentColor: "#0d9488",
    accentClass: "text-teal-600 dark:text-teal-400",
    borderClass: "border-l-teal-600 dark:border-l-teal-400",
    glowColor: "rgba(13, 148, 136, 0.12)",
  },
];

export default function HowItWorksSection() {
  const { resolvedTheme } = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto rotation timer when not actively hovering the dashboard
  const [isHoveringDashboard, setIsHoveringDashboard] = useState(false);

  useEffect(() => {
    if (isHoveringDashboard) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [isHoveringDashboard]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY, currentTarget } = e;
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    const x = (clientX - left) / width - 0.5;
    const y = (clientY - top) / height - 0.5;
    setCoords({ x, y });
  };

  const handleMouseLeave = () => {
    setCoords({ x: 0, y: 0 });
    setIsHoveringDashboard(false);
  };

  const activeStepData = steps[activeStep];
  const StepIcon = activeStepData.icon;

  return (
    <section id="how-it-works" className="py-14 lg:py-20 relative overflow-hidden" ref={containerRef}>
      {/* Background Separator Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] dark:opacity-[0.04] bg-[radial-gradient(#8b5cf6_1px,transparent_1px)] [background-size:24px_24px] z-0" />

      <div className="w-full px-6 lg:px-12 relative z-10">

        {/* Section Header */}
        <div className="text-center mb-16 lg:mb-24">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span className="font-mono text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
              Interactive Workflow
            </span>
          </div>
          <h2 className="font-extrabold text-3xl lg:text-5xl mt-3 tracking-tight text-[var(--space-text)] max-w-2xl mx-auto leading-tight">
            How it works:
            <br />
            <span className="text-gradient-neon">From screenshots to finished tutorials</span>
          </h2>
          <p className="mt-4 text-base lg:text-lg text-[var(--space-text-muted)] max-w-xl mx-auto font-sans leading-relaxed">
            Follow our 8-step automated production wizard. Our AI engine builds, scripts, narrates, and compiles everything on high-performance cloud GPUs.
          </p>
        </div>

        {/* Dashboard Walkthrough Grid */}
        <div className="grid lg:grid-cols-12 gap-10 items-start max-w-6xl mx-auto">

          {/* Left Side: Steps Navigation */}
          <div className="lg:col-span-5 flex flex-col gap-3 order-2 lg:order-1">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = idx === activeStep;

              return (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveStep(idx);
                    setIsHoveringDashboard(true);
                  }}
                  className={`w-full text-left rounded-xl p-4 transition-all duration-300 border flex gap-4 items-start ${isActive
                      ? `bg-[var(--space-card-hover)] border-[var(--space-border-hover)] border-l-4 ${step.borderClass} shadow-[0_8px_30px_rgba(0,0,0,0.04)]`
                      : "bg-[var(--space-card)]/40 border-[var(--space-border)] opacity-60 hover:opacity-90 hover:bg-[var(--space-card)]"
                    }`}
                >
                  {/* Step Number & Icon */}
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border transition-all ${isActive
                        ? `${step.accentClass} bg-[var(--space-bg)] border-[rgba(0,0,0,0.06)] shadow-sm`
                        : "text-[var(--space-text-muted)] border-transparent bg-transparent"
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Step Metadata */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--space-text-subtle)]">
                        Step {step.number} • {step.tag}
                      </span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                    </div>
                    <h3 className="font-sans font-bold text-sm text-[var(--space-text)] flex items-center gap-1.5">
                      {step.title}
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-[var(--space-text-subtle)]" />}
                    </h3>
                    {isActive && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="text-sm text-[var(--space-text-muted)] font-sans leading-relaxed mt-1"
                      >
                        {step.description}
                      </motion.p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Side: Mockup Image Frame */}
          <div className="lg:col-span-7 order-1 lg:order-2 flex flex-col justify-center">

            {/* Desktop Mockup Board */}
            <div
              className="perspective-3d relative w-full h-[380px] sm:h-[460px] flex items-center justify-center"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onMouseEnter={() => setIsHoveringDashboard(true)}
            >
              {/* Specular Ambient Glow */}
              <div
                className="absolute w-[85%] h-[85%] rounded-full blur-[70px] pointer-events-none transition-all duration-500"
                style={{
                  backgroundColor: `${activeStepData.accentColor}08`,
                }}
              />

              {/* 3D Dashboard Frame */}
              <motion.div
                style={{
                  rotateY: coords.x * 15,
                  rotateX: -coords.y * 15,
                  transformStyle: "preserve-3d",
                }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                className="w-full h-full glass-panel rounded-2xl border border-[var(--space-border)] p-4 relative flex flex-col justify-between overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.08)] bg-[var(--space-card)]/90"
              >
                {/* Specular glare */}
                <div
                  className="absolute inset-0 pointer-events-none select-none z-30 transition-opacity duration-300"
                  style={{
                    background: `radial-gradient(circle 240px at ${50 + coords.x * 25}% ${50 - coords.y * 25}%, rgba(255, 255, 255, ${resolvedTheme === 'dark' ? 0.08 : 0.22}), transparent)`,
                    mixBlendMode: "overlay",
                    borderRadius: "inherit"
                  }}
                />

                {/* Simulated Window Top Bar */}
                <div className="flex items-center justify-between pb-2.5 border-b border-[var(--space-border)] select-none z-20">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <span className="text-[9px] font-mono tracking-wider text-[var(--space-text-subtle)] uppercase ml-2">
                      Wizard Stage: Step {activeStepData.number}/08
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {steps.map((_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === activeStep
                            ? "bg-teal-500 w-3"
                            : i < activeStep
                              ? "bg-emerald-500/60"
                              : "bg-[var(--space-border)]"
                          }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Screenshot Display Screen Workspace */}
                <div className="flex-1 my-3 relative overflow-hidden rounded-lg border border-[var(--space-border)] bg-slate-100 dark:bg-slate-950/20 flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeStep}
                      initial={{ opacity: 0, scale: 0.96, filter: "blur(4px)" }}
                      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                      exit={{ opacity: 0, scale: 0.96, filter: "blur(4px)" }}
                      transition={{ duration: 0.4 }}
                      className="w-full h-full relative"
                    >
                      <img
                        src={activeStepData.imagePath}
                        alt={activeStepData.title}
                        className="w-full h-full object-cover select-none pointer-events-none"
                      />

                      {/* Mockup Overlay Animations to bring it alive */}
                      {activeStep === 0 && (
                        <div className="absolute inset-0 bg-blue-500/5 pointer-events-none">
                          <motion.div
                            className="absolute top-[40%] left-[25%] w-1.5 h-4 bg-blue-500"
                            animate={{ opacity: [1, 0, 1] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                          />
                        </div>
                      )}

                      {activeStep === 1 && (
                        <div className="absolute inset-0 bg-cyan-500/5 flex items-center justify-center pointer-events-none">
                          <motion.div
                            className="px-3 py-1.5 rounded-lg border border-cyan-200 dark:border-cyan-800 bg-white/95 dark:bg-slate-900/90 text-cyan-600 dark:text-cyan-400 text-[10px] font-mono shadow-[0_4px_15px_rgba(6,182,212,0.1)] dark:shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center gap-2"
                            animate={{ scale: [1, 1.05, 1], y: [0, -4, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <Upload className="w-3.5 h-3.5 animate-bounce" />
                            <span>dashboard_main.png uploaded</span>
                          </motion.div>
                        </div>
                      )}

                      {activeStep === 2 && (
                        <div className="absolute inset-0 pointer-events-none">
                          <motion.div
                            className="absolute top-[28%] left-[25%] right-[25%] bottom-[28%] border-2 border-dashed border-teal-500 rounded shadow-[0_0_15px_rgba(13,148,136,0.3)]"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                          />
                          <div className="absolute top-[28%] left-[25%] bg-teal-500 text-white text-[7px] font-mono px-1 rounded-br">
                            FOCAL POINT
                          </div>
                        </div>
                      )}

                      {activeStep === 3 && (
                        <div className="absolute bottom-4 inset-x-4 bg-white/95 dark:bg-slate-950/90 border border-black/5 dark:border-white/10 rounded-lg p-2 flex items-center gap-2 pointer-events-none shadow-xl">
                          <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                          <span className="text-[9px] font-mono text-teal-600 dark:text-teal-300 italic truncate">
                            "Now, let's navigate to the main billing settings page..."
                          </span>
                        </div>
                      )}

                      {activeStep === 4 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="bg-white/95 dark:bg-slate-900/95 border border-teal-200 dark:border-teal-800/30 rounded-lg px-3 py-1.5 flex items-center gap-2.5">
                            {Array.from({ length: 10 }).map((_, i) => (
                              <motion.div
                                key={i}
                                className="w-1 bg-teal-500 rounded-full"
                                animate={{ height: [4, 18, 4] }}
                                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.1 }}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {activeStep === 5 && (
                        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 border border-teal-400/20">
                          <div className="flex justify-between w-full">
                            <span className="border-t border-l border-teal-400 w-2 h-2" />
                            <span className="border-t border-r border-teal-400 w-2 h-2" />
                          </div>
                          <div className="self-center bg-white/95 dark:bg-slate-900/90 border border-teal-200 dark:border-teal-450/30 px-2.5 py-1 rounded text-[8px] text-teal-600 dark:text-teal-400 font-mono flex items-center gap-1.5">
                            <Eye className="w-3 h-3" /> Cam Path zoom: 1.5x
                          </div>
                          <div className="flex justify-between w-full">
                            <span className="border-b border-l border-teal-400 w-2 h-2" />
                            <span className="border-b border-r border-teal-400 w-2 h-2" />
                          </div>
                        </div>
                      )}

                      {activeStep === 6 && (
                        <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/60 flex flex-col items-center justify-center gap-3 pointer-events-none">
                          <div className="w-8 h-8 rounded-full border border-teal-500/40 border-t-teal-500 animate-spin" />
                          <span className="text-[10px] font-mono text-teal-600 dark:text-teal-400 bg-white dark:bg-slate-950 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-500/20">
                            Stitching frames: 85%
                          </span>
                        </div>
                      )}

                      {activeStep === 7 && (
                        <div className="absolute top-2 right-2 pointer-events-none">
                          <motion.div
                            className="bg-emerald-500 text-white font-mono text-[8px] px-2 py-0.5 rounded-full flex items-center gap-1.5 shadow-lg border border-emerald-400"
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            <CheckCircle2 className="w-2.5 h-2.5" /> Render Complete
                          </motion.div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Mockup Bottom Info bar */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--space-border)] select-none z-20">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center"
                      style={{
                        backgroundColor: `${activeStepData.accentColor}10`,
                      }}
                    >
                      <StepIcon className="w-3.5 h-3.5" style={{ color: activeStepData.accentColor }} />
                    </div>
                    <span className="text-[10px] font-sans font-bold text-[var(--space-text)]">
                      {activeStepData.title}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-[var(--space-text-subtle)]">
                    output_1080p.mp4
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Mobile/Tablet inline details block */}
            <div className="mt-8 text-center lg:hidden">
              <span className="inline-block text-[10px] font-mono text-teal-500 font-bold uppercase tracking-wider bg-teal-500/5 px-2 py-1 rounded border border-teal-500/10 mb-2">
                Active Step Info
              </span>
              <p className="text-base font-sans text-[var(--space-text-muted)] max-w-md mx-auto leading-relaxed">
                {activeStepData.description}
              </p>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
