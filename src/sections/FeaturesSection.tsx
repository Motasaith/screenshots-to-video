import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useTheme } from "next-themes";
import {
  Target,
  Mic,
  ShieldCheck,
  MessageSquare,
  Smartphone,
  Zap,
} from "lucide-react";

// Mini animated illustrations for each card
function UIProcessingIllustration() {
  return (
    <div className="relative w-full h-20 flex items-center justify-center">
      <div className="w-48 h-14 rounded-md border border-[var(--space-border)] bg-slate-950/80 p-2.5 flex flex-col justify-between overflow-hidden relative">
        <div className="flex items-center justify-between border-b border-white/5 pb-1">
          <div className="w-10 h-1 bg-white/20 rounded" />
          <div className="w-3 h-3 rounded bg-cyan-400/20 flex items-center justify-center border border-cyan-400/40">
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
          </div>
        </div>
        <div className="flex-1 flex gap-2 items-center my-1 relative">
          <div className="w-16 h-6 rounded border border-dashed border-teal-500/50 bg-teal-500/5 flex items-center justify-center relative">
            <span className="text-[5px] font-mono text-teal-400 select-none">[Button]</span>
            <motion.div
              className="absolute inset-0 bg-teal-500/10"
              animate={{ opacity: [0, 0.5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <div className="flex-1 h-6 rounded border border-dashed border-cyan-500/50 bg-cyan-500/5 flex items-center px-1 justify-between relative">
            <span className="text-[5px] font-mono text-cyan-400 select-none">[Input Box]</span>
            <div className="w-1 h-1 rounded-full bg-cyan-400" />
            <motion.div
              className="absolute inset-x-0 h-px bg-cyan-400/60"
              animate={{ top: ["0%", "100%", "0%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
          </div>
        </div>
        <motion.div
          className="absolute top-0 bottom-0 w-px bg-emerald-400/50 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
          animate={{ left: ["0%", "100%", "0%"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}

function ZoomPathIllustration() {
  return (
    <div className="relative w-full h-20 flex items-center justify-center">
      <div className="w-20 h-14 rounded border border-[var(--space-border)] relative overflow-hidden">
        <motion.div
          className="absolute w-6 h-6 border-2 border-cyan-400 rounded-sm"
          animate={{
            x: [2, 12, 8, 2],
            y: [2, 6, 2, 2],
            scale: [1, 1.3, 1.1, 1],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-1 h-1 rounded-full bg-cyan-400"
          animate={{
            x: [5, 15, 11, 5],
            y: [5, 9, 5, 5],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Crosshair lines */}
        <motion.div
          className="absolute top-0 left-1/2 w-px h-full bg-cyan-400/20"
          animate={{ left: ["30%", "60%", "45%", "30%"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute left-0 top-1/2 w-full h-px bg-cyan-400/20"
          animate={{ top: ["25%", "55%", "35%", "25%"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}

function AIChatIllustration() {
  return (
    <div className="relative w-full h-20 flex flex-col items-center justify-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0, x: i % 2 === 0 ? -10 : 10 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{
            delay: i * 0.8,
            duration: 0.4,
            repeat: Infinity,
            repeatDelay: 2.4 - i * 0.8 + 0.5,
          }}
          className={`flex items-center gap-1 ${i % 2 === 0 ? "self-start ml-4" : "self-end mr-4"}`}
        >
          <div
            className={`px-2 py-1 rounded-lg text-[8px] font-mono border ${
              i % 2 === 0
                ? "bg-teal-500/10 border-teal-500/20 text-teal-400"
                : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
            }`}
          >
            {i === 0 ? "Fix narration?" : i === 1 ? "Adjusting..." : "Done ✓"}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ShieldScanIllustration() {
  return (
    <div className="relative w-full h-20 flex items-center justify-center">
      <div className="relative">
        <svg width="36" height="42" viewBox="0 0 36 42" fill="none">
          <path
            d="M18 2L4 10V22C4 32 18 40 18 40C18 40 32 32 32 22V10L18 2Z"
            stroke="var(--neon-cyan)"
            strokeWidth="1.5"
            strokeLinejoin="round"
            opacity="0.4"
          />
          <motion.path
            d="M12 21L16 25L24 17"
            stroke="var(--neon-cyan)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: [0, 1, 1, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>
        {/* Scan line */}
        <motion.div
          className="absolute inset-x-0 h-px bg-emerald-400/60"
          animate={{ top: ["-10%", "110%"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      </div>
    </div>
  );
}

function WaveformIllustration() {
  return (
    <div className="relative w-full h-20 flex items-center justify-center gap-[3px]">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-gradient-to-t from-orange-500/60 to-rose-400/60"
          animate={{
            height: [
              `${8 + Math.sin(i * 0.6) * 6}px`,
              `${8 + Math.cos(i * 0.4 + 1) * 20}px`,
              `${8 + Math.sin(i * 0.8 + 2) * 10}px`,
            ],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.06,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function DeviceFrameIllustration() {
  return (
    <div className="relative w-full h-20 flex items-center justify-center gap-4">
      {[
        { w: "w-14", h: "h-9", r: "rounded", label: "16:9", delay: 0 },
        { w: "w-5", h: "h-9", r: "rounded-lg", label: "9:16", delay: 0.5 },
        { w: "w-8", h: "h-8", r: "rounded-sm", label: "1:1", delay: 1 },
      ].map((d, i) => (
        <motion.div
          key={i}
          className="flex flex-col items-center gap-1"
          animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, delay: d.delay }}
        >
          <div
            className={`${d.w} ${d.h} ${d.r} border border-teal-400/40 bg-teal-400/5 flex items-center justify-center`}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-teal-400/60" />
          </div>
          <span className="text-[7px] font-mono text-[var(--space-text-subtle)]">{d.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

const features = [
  {
    icon: Target,
    title: "AI UI-Structure Scan",
    description: "Our AI automatically parses your screenshots to identify button positions, headers, and form inputs, calculating the camera's focus path with zero manual positioning.",
    tag: "Computer Vision",
    color: "from-teal-500 to-cyan-500",
    glowColor: "rgba(13, 148, 136, 0.12)",
    illustration: UIProcessingIllustration,
    span: "md:col-span-2 md:row-span-1",
  },
  {
    icon: Target,
    title: "Cinematic Zoom Paths",
    description: "Specify coordinates on screenshots and watch the camera pan, zoom, and sweep automatically with fluid motion curves.",
    tag: "Core Tech",
    color: "from-teal-650 to-teal-500",
    glowColor: "rgba(13, 148, 136, 0.12)",
    illustration: ZoomPathIllustration,
    span: "md:col-span-1 md:row-span-2",
  },
  {
    icon: MessageSquare,
    title: "Proactive AI Guide",
    description: "An assistant embedded in the sidebar that corrects scripts, reviews layout coherence, and prevents technical errors.",
    tag: "Assistant",
    color: "from-teal-600 to-slate-700",
    glowColor: "rgba(13, 148, 136, 0.12)",
    illustration: AIChatIllustration,
    span: "",
  },
  {
    icon: ShieldCheck,
    title: "Vision Copyright Safe",
    description: "Our Vision AI scans files to detect logos, watermarks, or trademarked characters, ensuring monetization safety.",
    tag: "Security",
    color: "from-teal-500 to-emerald-500",
    glowColor: "rgba(13, 148, 136, 0.12)",
    illustration: ShieldScanIllustration,
    span: "",
  },
  {
    icon: Mic,
    title: "Ultra-Real Voiceovers",
    description: "Integration with ElevenLabs Multi-Lingual models and Edge-TTS for human-like narration pacing and tone.",
    tag: "Audio PRO",
    color: "from-teal-600 to-cyan-600",
    glowColor: "rgba(13, 148, 136, 0.12)",
    illustration: WaveformIllustration,
    span: "md:col-span-2 md:row-span-1",
  },
  {
    icon: Smartphone,
    title: "Multi-Platform Export",
    description: "Render instantly in 16:9 Landscape, 9:16 vertical, or 1:1 square. Best for YouTube, TikTok, and presentations.",
    tag: "Render Engine",
    color: "from-teal-700 to-slate-600",
    glowColor: "rgba(13, 148, 136, 0.12)",
    illustration: DeviceFrameIllustration,
    span: "",
  },
];

function BentoCard({
  feature,
  index,
  isInView,
  resolvedTheme,
}: {
  feature: (typeof features)[0];
  index: number;
  isInView: boolean;
  resolvedTheme: string | undefined;
}) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty("--mouse-x", `${x}px`);
    el.style.setProperty("--mouse-y", `${y}px`);
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    setRotateY((x - xc) / (rect.width / 14));
    setRotateX((yc - y) / (rect.height / 14));
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setIsHovered(false);
  };

  const Icon = feature.icon;
  const Illustration = feature.illustration;

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, x: index % 2 === 0 ? -40 : 40, y: 20 }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={() => setIsHovered(true)}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className={`glass-panel-interactive rounded-2xl p-6 relative flex flex-col justify-between group overflow-hidden ${feature.span}`}
    >
      {/* Cursor-following radial glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10"
        style={{
          background: `radial-gradient(circle 180px at var(--mouse-x, 50%) var(--mouse-y, 50%), ${feature.glowColor}, transparent)`,
        }}
      />

      {/* Specular glare */}
      <div
        className="absolute inset-0 pointer-events-none select-none z-20 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle 160px at ${50 + rotateY * 15}% ${50 - rotateX * 15}%, rgba(255, 255, 255, ${resolvedTheme === "dark" ? 0.06 : 0.22}), transparent)`,
          mixBlendMode: "overlay",
          borderRadius: "inherit",
        }}
      />

      <div
        style={{ transform: "translateZ(30px)", transformStyle: "preserve-3d" }}
        className="flex-1 flex flex-col justify-between relative z-30"
      >
        {/* Header row */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} p-0.5 shadow-lg flex items-center justify-center text-white`}
            >
              <div
                className="w-full h-full rounded-[10px] flex items-center justify-center group-hover:bg-transparent transition-all"
                style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <span className="text-[10px] font-mono tracking-wider text-[var(--space-text-subtle)] uppercase px-2 py-0.5 rounded-full bg-[var(--space-card)] border border-[var(--space-border)]">
              {feature.tag}
            </span>
          </div>

          <h3 className="font-sans font-bold text-lg text-[var(--space-text)] mb-2 group-hover:text-teal-600 dark:group-hover:text-teal-450 transition-colors">
            {feature.title}
          </h3>

          <p className="text-sm text-[var(--space-text-muted)] leading-relaxed font-sans">
            {feature.description}
          </p>
        </div>

        {/* Animated illustration — speeds up on hover */}
        <div
          className="mt-4 rounded-lg border border-[var(--space-border)] bg-[var(--space-card)] overflow-hidden"
          style={{
            animationDuration: isHovered ? "0.5s" : "1s",
          }}
        >
          <Illustration />
        </div>
      </div>
    </motion.div>
  );
}


export default function FeaturesSection() {
  const { resolvedTheme } = useTheme();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="features" className="py-14 lg:py-20 relative overflow-hidden" ref={ref}>
      <div className="w-full px-6 lg:px-12 relative z-10">
        {/* Section Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 mb-3">
            <Zap className="w-3.5 h-3.5 text-teal-500" />
            <span className="font-mono text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
              Advanced Tooling
            </span>
          </div>

          <h2 className="font-extrabold text-3xl lg:text-5xl mt-3 tracking-tight text-[var(--space-text)] max-w-2xl mx-auto leading-tight">
            Built for professional
            <br />
            <span className="text-gradient-neon">technical content creators</span>
          </h2>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid md:grid-cols-3 gap-5 max-w-6xl mx-auto auto-rows-auto">
          {features.map((feature, index) => (
            <BentoCard
              key={index}
              feature={feature}
              index={index}
              isInView={isInView}
              resolvedTheme={resolvedTheme}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
