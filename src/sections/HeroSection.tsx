import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router";
import { useTheme } from "next-themes";
import { 
  ArrowRight, 
  Play, 
  Sparkles, 
  Zap, 
  Check, 
  Upload, 
  Volume2, 
  Target, 
  Cpu, 
  Loader2, 
  RefreshCw,
  Video,
  Pause
} from "lucide-react";

type SimulatorStep = "idle" | "screenshot" | "script" | "zoom" | "render" | "play";

// Staggered word animation for the h1
const headlineWords = [
  { text: "Screenshots", style: "text-[var(--space-text)]" },
  { text: "in.", style: "text-[var(--space-text)]" },
  { text: "\n", style: "" },
  { text: "Cinematic", style: "text-gradient-neon" },
  { text: "\n", style: "" },
  { text: "tutorials", style: "text-[var(--space-text)]" },
  { text: "out.", style: "text-[var(--space-text)]" },
];



// Typing text component
function TypingText({ text, speed = 25 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        setDone(true);
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {!done && <span className="typing-cursor" />}
    </span>
  );
}

export default function HeroSection() {
  const { resolvedTheme } = useTheme();
  const [activeStep, setActiveStep] = useState<SimulatorStep>("idle");
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY, currentTarget } = e;
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    const x = (clientX - left) / width - 0.5;
    const y = (clientY - top) / height - 0.5;
    setCoords({ x, y });
  };

  const handleMouseLeave = () => {
    setCoords({ x: 0, y: 0 });
  };

  const runSimulation = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsPlayingDemo(true);
    
    const steps: SimulatorStep[] = ["screenshot", "script", "zoom", "render", "play"];
    let curIndex = 0;
    setActiveStep(steps[curIndex]);

    timerRef.current = setInterval(() => {
      curIndex++;
      if (curIndex < steps.length) {
        setActiveStep(steps[curIndex]);
      } else {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsPlayingDemo(false);
      }
    }, 2800);
  };

  const handleStepClick = (step: SimulatorStep) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsPlayingDemo(false);
    setActiveStep(step);
  };

  const resetSimulation = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsPlayingDemo(false);
    setActiveStep("idle");
  };

  return (
    <section className="relative pt-24 pb-8 lg:pt-32 lg:pb-10 overflow-hidden">
      <div className="w-full px-6 lg:px-12 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Heading & Copy */}
          <div>
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--space-card)] border border-[var(--space-border)] mb-6 backdrop-blur-md"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-500 animate-pulse" />
              <span className="font-sans text-xs font-semibold text-[var(--space-text-muted)]">
                AI Screenshot-to-Video Engine
              </span>
            </motion.div>

            {/* Staggered Word Headline */}
            <h1 className="font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight">
              {headlineWords.map((word, i) => {
                if (word.text === "\n") return <br key={i} />;
                return (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{
                      duration: 0.6,
                      delay: 0.3 + i * 0.12,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className={`inline-block mr-[0.25em] ${word.style}`}
                  >
                    {word.text}
                  </motion.span>
                );
              })}
            </h1>

            {/* Typing Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3, duration: 0.4 }}
              className="mt-6 text-lg lg:text-xl text-[var(--space-text-muted)] max-w-xl font-sans leading-relaxed"
            >
              <TypingText
                text="Upload screenshots of your web or mobile app, write a simple script, and let our AI compile them into a professional video tutorial with cinematic zooms, panning camera effects, and natural voiceover narration."
                speed={18}
              />
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6, duration: 0.5 }}
              className="mt-8 flex flex-wrap gap-4 items-center"
            >
              <Link to="/login" className="glass-btn glass-btn-primary group relative animate-breathing-glow">
                <span className="animate-ripple" />
                Create Free Video
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button 
                onClick={runSimulation}
                className="glass-btn glass-btn-secondary"
              >
                <Play className="w-4 h-4" style={{ fill: 'var(--space-text)' }} />
                {isPlayingDemo ? "Playing Demo..." : "Watch 3D Simulation"}
              </button>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2, duration: 0.5 }}
              className="mt-8 flex flex-wrap items-center gap-6 text-sm text-[var(--space-text-muted)]"
            >
              {["No credit card required", "5 free videos / month", "ElevenLabs Voices"].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 2.1 + i * 0.15 }}
                  className="flex items-center gap-2"
                >
                  <Check className="w-4 h-4 text-cyan-500" />
                  <span className="font-sans">{item}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Right Column: Interactive 3D Editor Console */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="perspective-3d relative w-full h-[520px] flex items-center justify-center"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Ambient Background Glow behind the 3D panel */}
            <div className="absolute w-[80%] h-[80%] bg-teal-600/10 rounded-full blur-[60px] pointer-events-none" />

            {/* Interactive 3D Editor Board */}
            <motion.div
              style={{
                rotateY: coords.x * 24,
                rotateX: -coords.y * 24,
                transformStyle: "preserve-3d",
              }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
              className="w-full max-w-[460px] h-[480px] glass-panel rounded-2xl border border-[var(--space-border)] p-5 relative flex flex-col justify-between"
            >
              {/* Specular Glare Reflection Layer */}
              <div 
                className="absolute inset-0 pointer-events-none select-none z-30 transition-opacity duration-300"
                style={{
                  background: `radial-gradient(circle 220px at ${50 + coords.x * 25}% ${50 - coords.y * 25}%, rgba(255, 255, 255, ${resolvedTheme === 'dark' ? 0.08 : 0.22}), transparent)`,
                  mixBlendMode: "overlay",
                  borderRadius: "inherit"
                }}
              />

              {/* Header Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-[var(--space-border)] select-none">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-[10px] font-mono tracking-wider text-[var(--space-text-subtle)] uppercase ml-2">
                    aivideo-editor-v1.5
                  </span>
                </div>
                {activeStep !== "idle" && (
                  <button 
                    onClick={resetSimulation}
                    className="p-1 rounded bg-[var(--space-card)] border border-[var(--space-border)] text-[9px] font-mono text-[var(--space-text-muted)] hover:text-[var(--space-text)] flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    Reset
                  </button>
                )}
              </div>

              {/* Main Interactive Screen Area */}
              <div className="flex-1 my-4 relative flex items-center justify-center overflow-hidden rounded-lg border border-[var(--space-border)] bg-slate-50 dark:bg-slate-900/90">
                <AnimatePresence mode="wait">
                  {/* STEP: IDLE / START */}
                  {activeStep === "idle" && (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="text-center p-6 flex flex-col items-center justify-center h-full"
                    >
                      <div className="w-14 h-14 rounded-full bg-[var(--space-card)] border border-[var(--space-border)] flex items-center justify-center mb-4 text-teal-500 shadow-[0_0_20px_rgba(13,148,136,0.15)]">
                        <Upload className="w-6 h-6 animate-bounce" />
                      </div>
                      <h3 className="text-sm font-semibold text-[var(--space-text)]">Drag or Upload Screenshot</h3>
                      <p className="text-xs text-[var(--space-text-subtle)] mt-2 max-w-xs leading-relaxed">
                        Click below or watch the 3D simulator build a professional guide step-by-step.
                      </p>
                      <button 
                        onClick={() => setActiveStep("screenshot")}
                        className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition-all shadow-[0_4px_15px_rgba(13,148,136,0.3)] border border-white/10"
                      >
                        Load Sample Screenshot
                      </button>
                    </motion.div>
                  )}

                  {/* STEP: SCREENSHOT UPLOADED */}
                  {activeStep === "screenshot" && (
                    <motion.div
                      key="screenshot"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="w-full h-full p-4 flex flex-col justify-between"
                      style={{ transform: "translateZ(15px)" }}
                    >
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg p-2.5 flex-1 relative overflow-hidden flex items-center justify-center">
                        <div className="w-full space-y-2">
                          <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-1/3" />
                          <div className="h-6 bg-slate-100 dark:bg-white/5 rounded border border-slate-200 dark:border-white/5 flex items-center px-2 justify-between">
                            <div className="w-2.5 h-2.5 rounded bg-cyan-400" />
                            <div className="h-2 bg-slate-200 dark:bg-white/10 rounded w-[80%]" />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="h-10 bg-slate-100 dark:bg-white/5 rounded border border-slate-200 dark:border-white/5 flex flex-col items-center justify-center">
                              <span className="w-2 h-2 rounded bg-violet-400 mb-1" />
                              <span className="h-1.5 bg-slate-200 dark:bg-white/10 rounded w-[60%]" />
                            </div>
                            <div className="h-10 bg-slate-100 dark:bg-white/5 rounded border border-slate-200 dark:border-white/5 flex flex-col items-center justify-center">
                              <span className="w-2 h-2 rounded bg-amber-400 mb-1" />
                              <span className="h-1.5 bg-slate-200 dark:bg-white/10 rounded w-[50%]" />
                            </div>
                            <div className="h-10 bg-slate-100 dark:bg-white/5 rounded border border-slate-200 dark:border-white/5 flex flex-col items-center justify-center">
                              <span className="w-2 h-2 rounded bg-rose-400 mb-1" />
                              <span className="h-1.5 bg-slate-200 dark:bg-white/10 rounded w-[70%]" />
                            </div>
                          </div>
                        </div>
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-cyan-400/10 border border-cyan-400/20 text-[8px] font-mono text-cyan-400">
                          Active Scene
                        </div>
                      </div>
                      <div className="pt-3 text-center">
                        <span className="text-[10px] font-mono text-cyan-400">Step 1: Screenshot Imported (Aspect 16:9)</span>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP: SCRIPT & VOICE GENERATION */}
                  {activeStep === "script" && (
                    <motion.div
                      key="script"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="w-full h-full p-4 flex flex-col justify-between"
                      style={{ transform: "translateZ(25px)" }}
                    >
                      <div className="flex-1 flex flex-col gap-3 justify-center">
                        <div className="bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-white/10 rounded-xl p-4 shadow-[0_10px_25px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
                          <div className="flex items-center gap-2 text-xs text-teal-600 dark:text-teal-400 font-semibold mb-2">
                            <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                            <span>AI Narration Script Generated</span>
                          </div>
                          <p className="text-[11px] text-slate-700 dark:text-slate-300 italic leading-relaxed">
                            "Now, choose the system drive partition (C:) and hit OK to scan for cleaning targets."
                          </p>
                          <div className="flex gap-1 items-center justify-center mt-3 pt-3 border-t border-white/5">
                            {[1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4, 3, 2, 1, 2, 3, 4, 5, 6, 7, 5, 3, 2, 1].map((_, i) => (
                              <div 
                                key={i} 
                                className="sound-bar" 
                                style={{ animationDelay: `${i * 0.05}s` }} 
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] font-mono text-teal-400">Step 2: Script Synthesis (ElevenLabs Voice)</span>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP: CINEMATIC ZOOM TARGETING */}
                  {activeStep === "zoom" && (
                    <motion.div
                      key="zoom"
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="w-full h-full p-4 flex flex-col justify-between relative"
                      style={{ transform: "translateZ(35px)" }}
                    >
                      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg relative overflow-hidden flex items-center justify-center">
                        <motion.div 
                          animate={{ scale: [1, 1.4, 1.4, 1], x: [0, -15, -15, 0], y: [0, -10, -10, 0] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                          className="w-full p-6 space-y-3"
                        >
                          <div className="h-5 bg-slate-200 dark:bg-white/10 rounded w-1/3" />
                          <div className="h-8 bg-cyan-500/10 dark:bg-cyan-500/5 border-2 border-cyan-500 dark:border-cyan-400 rounded flex items-center px-3 justify-between relative shadow-[0_0_15px_rgba(6,182,212,0.05)] dark:shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                            <div className="w-3.5 h-3.5 rounded bg-cyan-500 dark:bg-cyan-400" />
                            <div className="h-3 bg-slate-300 dark:bg-white/20 rounded w-[80%]" />
                            <div className="absolute -inset-1 border border-dashed border-cyan-400/80 rounded animate-ping pointer-events-none" />
                          </div>
                        </motion.div>
                        
                        <div className="absolute inset-0 border border-cyan-400/30 bg-cyan-400/5 flex flex-col justify-between p-2 pointer-events-none">
                          <div className="flex justify-between">
                            <span className="border-t border-l border-cyan-400 w-2.5 h-2.5" />
                            <span className="border-t border-r border-cyan-400 w-2.5 h-2.5" />
                          </div>
                          <div className="self-center flex items-center gap-1.5 px-2 py-0.5 rounded bg-white dark:bg-slate-950/80 border border-cyan-200 dark:border-cyan-400/30 text-[8px] text-cyan-600 dark:text-cyan-400 font-mono shadow-sm">
                            <Target className="w-2.5 h-2.5" /> Focal zoom set: 1.4x
                          </div>
                          <div className="flex justify-between">
                            <span className="border-b border-l border-cyan-400 w-2.5 h-2.5" />
                            <span className="border-b border-r border-cyan-400 w-2.5 h-2.5" />
                          </div>
                        </div>
                      </div>
                      <div className="pt-3 text-center">
                        <span className="text-[10px] font-mono text-cyan-400">Step 3: Auto-Camera Target Coordinates Configured</span>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP: RENDER PROGRESS */}
                  {activeStep === "render" && (
                    <motion.div
                      key="render"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="w-full h-full p-6 flex flex-col justify-between"
                      style={{ transform: "translateZ(20px)" }}
                    >
                      <div className="flex-1 flex flex-col justify-center items-center">
                        <div className="w-12 h-12 rounded-full bg-teal-600/10 border border-teal-500/30 flex items-center justify-center mb-4 text-teal-400">
                          <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                        <h4 className="text-xs font-semibold text-[var(--space-text)]">Rendering Video Elements...</h4>
                        <div className="w-full max-w-xs bg-slate-200 dark:bg-slate-900 border border-slate-300/40 dark:border-white/5 rounded-full h-2 mt-4 overflow-hidden relative">
                          <motion.div 
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 2.8, ease: "easeInOut" }}
                            className="h-full bg-gradient-to-r from-teal-500 to-cyan-400"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 mt-3 text-[10px] font-mono text-[var(--space-text-muted)] dark:text-[var(--space-text-subtle)]">
                          <Cpu className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" /> FFmpeg merging tracks...
                        </div>
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] font-mono text-teal-400">Step 4: Compiling Vision & Narration Assets</span>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP: PLAYBACK VIDEO OUTPUT */}
                  {activeStep === "play" && (
                    <motion.div
                      key="play"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="w-full h-full p-4 flex flex-col justify-between"
                      style={{ transform: "translateZ(40px)" }}
                    >
                      <div className="flex-1 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 dark:border-white/10 relative flex flex-col justify-between shadow-[0_12px_30px_rgba(0,0,0,0.2)] dark:shadow-[0_12px_30px_rgba(0,0,0,0.6)]">
                        <div className="bg-slate-900/80 p-2 border-b border-white/5 flex items-center justify-between text-[10px]">
                          <span className="font-sans text-slate-300 truncate max-w-[150px]">Clean Partition Tutorial</span>
                          <span className="text-emerald-400 font-mono text-[8px] bg-emerald-500/10 px-1 rounded border border-emerald-500/20">Render Complete</span>
                        </div>
                        
                        <div className="flex-1 relative flex items-center justify-center bg-black">
                          <motion.div 
                            animate={{ scale: [1, 1.12, 1.12, 1], x: [0, -10, -10, 0] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                            className="w-[80%] h-[60%] bg-slate-800 rounded border border-white/10 p-2 flex flex-col justify-center"
                          >
                            <div className="h-3 bg-white/10 rounded w-1/3 mb-1" />
                            <div className="h-5 bg-cyan-500/20 border-2 border-cyan-400 rounded shadow-[0_0_10px_rgba(6,182,212,0.3)] flex items-center px-1" />
                          </motion.div>

                          <div className="absolute bottom-2 left-2 right-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <motion.div 
                              animate={{ width: ["0%", "100%"] }}
                              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                              className="h-full bg-cyan-400"
                            />
                          </div>

                          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20 group">
                            <div className="w-10 h-10 rounded-full bg-slate-950/70 border border-white/20 flex items-center justify-center text-white backdrop-blur-sm cursor-pointer shadow-[0_4px_10px_rgba(0,0,0,0.4)]">
                              <Pause className="w-4 h-4 fill-white" />
                            </div>
                          </div>
                        </div>

                        <div className="bg-slate-950 p-2 border-t border-white/5 flex items-center justify-between text-[9px] text-[var(--space-text-subtle)] font-mono">
                          <div className="flex items-center gap-1.5">
                            <Video className="w-3 h-3 text-cyan-400" />
                            <span>1080p60</span>
                          </div>
                          <span>00:14 / 00:30</span>
                        </div>
                      </div>
                      <div className="pt-3 text-center flex items-center justify-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
                        <span className="text-[10px] font-mono text-emerald-400">Cinematic Video Exported</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom Step Toggles */}
              <div className="flex items-center justify-between gap-1 select-none border-t border-[var(--space-border)] pt-3">
                {(["screenshot", "script", "zoom", "render", "play"] as SimulatorStep[]).map((step, idx) => (
                  <button
                    key={step}
                    onClick={() => handleStepClick(step)}
                    className={`flex-1 text-[9px] font-mono py-1 rounded transition-all ${
                      activeStep === step
                        ? "bg-teal-600/25 border border-teal-500/50 text-[var(--space-text)] font-semibold"
                        : "bg-[var(--space-card)] border border-transparent text-[var(--space-text-subtle)] hover:text-[var(--space-text)] hover:bg-[var(--space-card-hover)]"
                    }`}
                  >
                    0{idx + 1}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Float 3D Badges */}
            <motion.div
              style={{ translateZ: 50 }}
              className="absolute -top-3 right-6 bg-[var(--space-card)] backdrop-blur-md border border-[var(--space-border)] rounded-xl px-3 py-2 text-xs flex items-center gap-2 shadow-[0_10px_25px_rgba(0,0,0,0.06)] pointer-events-none select-none"
            >
              <Cpu className="w-4 h-4 text-cyan-500" />
              <div>
                <div className="font-semibold text-[var(--space-text)] text-[10px]">AI Director</div>
                <div className="text-[9px] text-[var(--space-text-subtle)]">Copyright Safe</div>
              </div>
            </motion.div>

            <motion.div
              style={{ translateZ: 40 }}
              className="absolute -bottom-4 left-6 bg-[var(--space-card)] backdrop-blur-md border border-[var(--space-border)] rounded-xl px-3 py-2 text-xs flex items-center gap-2 shadow-[0_10px_25px_rgba(0,0,0,0.06)] pointer-events-none select-none"
            >
              <Zap className="w-4 h-4 text-yellow-500 animate-pulse" />
              <div>
                <div className="font-semibold text-[var(--space-text)] text-[10px]">Edge-TTS</div>
                <div className="text-[9px] text-[var(--space-text-subtle)]">12 Speakers</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
