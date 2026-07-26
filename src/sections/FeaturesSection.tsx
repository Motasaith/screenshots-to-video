import { useState, useRef, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { useTheme } from "next-themes";
import {
  Target,
  Mic,
  ShieldCheck,
  MessageSquare,
  Smartphone,
  Edit3,
} from "lucide-react";

/**
 * Mounts its children only while they are near the viewport.
 *
 * The illustrations below run ~21 `repeat: Infinity` animations between them,
 * most of which drive paint-triggering properties (borderColor, backgroundColor,
 * width, pathLength). framer-motion starts those on mount and never stops them,
 * so scrolling anywhere on the landing page competed with animation work for
 * cards several screens away.
 *
 * Unmounting is what actually stops the work — pausing is not something these
 * animations expose. Four of the six illustrations size themselves from their
 * content, so the height is measured before the first unmount and held while
 * the children are gone; without that the card would collapse and the page
 * would shift under the scroll. `rootMargin` mounts them before they are
 * visible, so nothing ever pops in.
 */
function IllustrationSlot({
  className,
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Starts mounted so the very first layout is correct and measurable; the
  // observer unmounts the off-screen ones on its first callback.
  const [visible, setVisible] = useState(true);
  const [reservedHeight, setReservedHeight] = useState<number>();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          const h = el.offsetHeight;
          if (h > 0) setReservedHeight(h);
        }
        setVisible(entry.isIntersecting);
      },
      { rootMargin: "300px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={!visible && reservedHeight ? { ...style, height: reservedHeight } : style}
    >
      {visible ? children : null}
    </div>
  );
}

// Mini animated illustrations for each card
function UIProcessingIllustration() {
  return (
    <div className="relative w-full h-[180px] flex items-center justify-center p-3 select-none">
      {/* Editor Window (Wide format) */}
      <div className="w-[94%] h-full rounded-xl border border-[var(--space-border)] bg-[var(--space-card)] flex overflow-hidden shadow-sm relative">
        
        {/* Left Toolbar */}
        <div className="w-8 border-r border-[var(--space-border)] bg-slate-50 dark:bg-slate-950/40 flex flex-col items-center py-2.5 gap-2 text-[var(--space-text-subtle)]">
          {/* Box Tool */}
          <motion.div 
            className="p-1 rounded border"
            animate={{
              borderColor: ["rgba(0,0,0,0)", "rgba(13, 148, 136, 0.3)", "rgba(13, 148, 136, 0.3)", "rgba(0,0,0,0)", "rgba(0,0,0,0)"],
              backgroundColor: ["rgba(0,0,0,0)", "rgba(13, 148, 136, 0.08)", "rgba(13, 148, 136, 0.08)", "rgba(0,0,0,0)", "rgba(0,0,0,0)"],
              color: ["currentColor", "var(--teal-600)", "var(--teal-600)", "currentColor", "currentColor"]
            }}
            transition={{ duration: 9, repeat: Infinity, times: [0, 0.06, 0.28, 0.30, 1] }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>
          </motion.div>
          {/* Arrow Tool */}
          <motion.div 
            className="p-1 rounded border"
            animate={{
              borderColor: ["rgba(0,0,0,0)", "rgba(0,0,0,0)", "rgba(13, 148, 136, 0.3)", "rgba(13, 148, 136, 0.3)", "rgba(0,0,0,0)"],
              backgroundColor: ["rgba(0,0,0,0)", "rgba(0,0,0,0)", "rgba(13, 148, 136, 0.08)", "rgba(13, 148, 136, 0.08)", "rgba(0,0,0,0)"],
              color: ["currentColor", "currentColor", "var(--teal-600)", "var(--teal-600)", "currentColor"]
            }}
            transition={{ duration: 9, repeat: Infinity, times: [0, 0.32, 0.38, 0.60, 1] }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </motion.div>
          {/* Blur Tool */}
          <motion.div 
            className="p-1 rounded border"
            animate={{
              borderColor: ["rgba(0,0,0,0)", "rgba(0,0,0,0)", "rgba(0,0,0,0)", "rgba(13, 148, 136, 0.3)", "rgba(0,0,0,0)"],
              backgroundColor: ["rgba(0,0,0,0)", "rgba(0,0,0,0)", "rgba(0,0,0,0)", "rgba(13, 148, 136, 0.08)", "rgba(0,0,0,0)"],
              color: ["currentColor", "currentColor", "currentColor", "var(--teal-600)", "currentColor"]
            }}
            transition={{ duration: 9, repeat: Infinity, times: [0, 0.62, 0.68, 0.88, 1] }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </motion.div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 bg-slate-100/50 dark:bg-slate-950/20 relative p-2 overflow-hidden flex items-center justify-center">
          
          {/* Mock Screenshot (Wide) */}
          <div className="w-[96%] h-[92%] rounded border border-dashed border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/60 p-2 flex justify-between gap-4 relative">
            
            {/* Left Mock UI Column (Card) */}
            <div className="flex-1 flex flex-col justify-center gap-1.5 pl-1">
              <div className="w-16 h-2 bg-slate-200 dark:bg-slate-800 rounded" />
              {/* Highlight Target Card */}
              <div className="border border-slate-100 dark:border-white/5 rounded p-1.5 flex flex-col gap-1 bg-slate-50/50 dark:bg-slate-900/30 w-36 h-12 relative">
                <div className="w-10 h-1.5 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="w-20 h-2 bg-slate-200 dark:bg-slate-800 rounded mt-0.5" />
              </div>
            </div>

            {/* Right Mock UI Column (Sensitive Data) */}
            <div className="w-32 border-l border-slate-100 dark:border-white/5 pl-3 flex flex-col justify-center gap-1.5 pr-2">
              <div className="w-10 h-2 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-6 rounded border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/40 flex items-center px-1.5 justify-between relative overflow-hidden">
                {/* Sensitive Text underneath */}
                <span className="text-[6px] font-mono text-[var(--space-text-subtle)] leading-none select-none">
                  sk_live_9a2f...
                </span>
                
                {/* Backdrop Blur Overlay Box */}
                <motion.div
                  className="absolute left-0 top-0 bottom-0 bg-slate-400/10 backdrop-blur-[2.5px] border-l border-cyan-400/50"
                  animate={{
                    width: [0, 0, 0, 0, "100%", "100%", 0],
                    opacity: [0, 0, 0, 0, 1, 1, 0]
                  }}
                  transition={{ duration: 9, repeat: Infinity, times: [0, 0.68, 0.70, 0.72, 0.82, 0.95, 1], ease: "easeInOut" }}
                />
              </div>
            </div>

            {/* DRAWING OVERLAYS */}
            {/* 1. Drawn Highlight Box */}
            <motion.div
              className="absolute border-2 border-teal-500 bg-teal-500/5 rounded-sm"
              style={{
                left: "14px",
                top: "17px",
              }}
              animate={{
                width: [0, 0, 148, 148, 148, 148, 0],
                height: [0, 0, 52, 52, 52, 52, 0],
                opacity: [0, 0, 1, 1, 1, 1, 0]
              }}
              transition={{
                duration: 9,
                repeat: Infinity,
                times: [0, 0.12, 0.24, 0.26, 0.88, 0.95, 1],
                ease: "easeInOut"
              }}
            >
              {/* Tooltip: Highlight Box */}
              <div className="absolute -top-4 left-0 px-1 py-0.5 rounded bg-teal-500 text-white font-mono text-[5px] select-none shadow">
                Highlight Area
              </div>
            </motion.div>

            {/* 2. Drawn Arrow */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
              <defs>
                <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="4" refY="2" orient="auto">
                  <polygon points="0 0, 6 2, 0 4" fill="#06b6d4" />
                </marker>
              </defs>
              <motion.path
                d="M 215 18 L 172 38"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1.5"
                markerEnd="url(#arrowhead)"
                initial={{ pathLength: 0 }}
                animate={{
                  pathLength: [0, 0, 0, 1, 1, 1, 0],
                  opacity: [0, 0, 0, 1, 1, 1, 0]
                }}
                transition={{
                  duration: 9,
                  repeat: Infinity,
                  times: [0, 0.44, 0.46, 0.54, 0.88, 0.95, 1],
                  ease: "easeInOut"
                }}
              />
            </svg>

            {/* 3. Mouse Pointer Cursor */}
            <motion.div
              className="absolute w-4 h-4 z-30 flex flex-col items-start gap-0.5"
              animate={{
                x: [0, -10, 14, 162, -10, 215, 172, -10, 275, 360, 0],
                y: [80, 12, 17, 69, 32, 18, 38, 52, 45, 45, 80]
              }}
              transition={{
                duration: 9,
                repeat: Infinity,
                times: [0, 0.06, 0.12, 0.24, 0.32, 0.44, 0.54, 0.62, 0.68, 0.82, 0.95],
                ease: "easeInOut"
              }}
            >
              {/* Cursor Icon SVG */}
              <svg width="12" height="12" viewBox="0 0 24 24" className="text-teal-500 drop-shadow-md">
                <path
                  d="M3 3 L3 21 L8.5 15.5 L14.5 24 L17.5 22 L11.5 13.5 L18 13.5 Z"
                  fill="currentColor"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>

              {/* Coordinates Indicator */}
              <motion.div
                className="px-1 py-0.5 rounded bg-slate-900/90 text-white font-mono text-[4.5px] whitespace-nowrap shadow border border-white/10"
                animate={{
                  opacity: [0, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0]
                }}
                transition={{
                  duration: 9,
                  repeat: Infinity,
                  times: [0, 0.08, 0.12, 0.24, 0.26, 0.44, 0.54, 0.56, 0.68, 0.82, 0.95]
                }}
              >
                Drawing...
              </motion.div>
            </motion.div>

          </div>
        </div>

      </div>
    </div>
  );
}

function ZoomPathIllustration() {
  return (
    <div className="relative w-full h-[300px] flex items-center justify-center bg-[var(--space-bg)]/20 p-3 select-none">
      {/* Mock Program Editor Window */}
      <div className="w-full h-full rounded-xl border border-[var(--space-border)] bg-[var(--space-card)] flex flex-col overflow-hidden shadow-md">
        
        {/* Editor Titlebar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--space-border)] bg-slate-100/60 dark:bg-slate-900/60 text-[9px] font-mono text-[var(--space-text-subtle)]">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="ml-2 font-semibold text-[var(--space-text-muted)]">AIVideo - Zoom Studio</span>
          </div>
          <span className="opacity-60">1920 × 1080 (100%)</span>
        </div>

        {/* Editor Menu Bar */}
        <div className="flex items-center gap-3 px-3 py-1 border-b border-[var(--space-border)] bg-slate-50 dark:bg-slate-950/40 text-[8px] font-sans text-[var(--space-text-subtle)]">
          <span className="hover:text-[var(--space-text)] cursor-pointer">File</span>
          <span className="hover:text-[var(--space-text)] cursor-pointer font-bold text-teal-600">Select Area</span>
          <span className="hover:text-[var(--space-text)] cursor-pointer">Transitions</span>
          <span className="hover:text-[var(--space-text)] cursor-pointer">Audio</span>
        </div>

        {/* Main Editor Body */}
        <div className="flex-1 flex relative bg-slate-100/50 dark:bg-slate-950/20 overflow-hidden">
          
          {/* Left Toolbar */}
          <div className="w-8 border-r border-[var(--space-border)] bg-slate-50 dark:bg-slate-950/40 flex flex-col items-center py-2 gap-2 text-[var(--space-text-subtle)]">
            <div className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>
            </div>
            <div className="p-1 rounded bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-400">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>
            </div>
            <div className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
          </div>

          {/* Screenshot Canvas Area */}
          <div className="flex-1 relative p-3 flex items-center justify-center">
            
            {/* Mock Dashboard Screenshot in Background */}
            <div className="w-[85%] h-[85%] rounded border border-dashed border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900/60 p-2.5 flex flex-col gap-2 relative pointer-events-none select-none opacity-60">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-1.5">
                <div className="w-12 h-2.5 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="w-6 h-2.5 bg-slate-100 dark:bg-slate-800 rounded" />
              </div>
              
              <div className="grid grid-cols-2 gap-2 flex-1">
                <div className="border border-slate-100 dark:border-white/5 rounded p-1.5 flex flex-col gap-1.5 bg-slate-50/50 dark:bg-slate-900/40">
                  <div className="w-8 h-2 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="w-14 h-4 bg-slate-100 dark:bg-slate-800 rounded" />
                </div>
                <div className="border border-teal-500/10 bg-teal-500/5 rounded p-1.5 flex flex-col gap-1.5 items-center justify-center relative">
                  <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800" />
                  <div className="w-12 h-2 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
              </div>
            </div>

            {/* Drawing Area Canvas Overlay (absolute coordinates) */}
            <div className="absolute inset-0 w-full h-full pointer-events-none">
              
              {/* Selection rectangle representing the Zoom path camera region */}
              <motion.div
                className="absolute border-2 border-cyan-400 bg-cyan-500/10 rounded-sm"
                style={{
                  left: "98px",
                  top: "62px",
                }}
                animate={{
                  width: [0, 0, 105, 105, 0],
                  height: [0, 0, 80, 80, 0],
                  opacity: [0, 0, 1, 1, 0]
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  times: [0, 0.25, 0.5, 0.85, 1],
                  ease: "easeInOut"
                }}
              >
                {/* Selection handles (tiny corner boxes to look like a drawing tool) */}
                <div className="absolute -top-1 -left-1 w-2 h-2 border border-cyan-500 bg-white rounded-sm" />
                <div className="absolute -top-1 -right-1 w-2 h-2 border border-cyan-500 bg-white rounded-sm" />
                <div className="absolute -bottom-1 -left-1 w-2 h-2 border border-cyan-500 bg-white rounded-sm" />
                <div className="absolute -bottom-1 -right-1 w-2 h-2 border border-cyan-500 bg-white rounded-sm" />
                <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 border border-cyan-500 bg-white rounded-sm" />
                <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 border border-cyan-500 bg-white rounded-sm" />
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 border border-cyan-500 bg-white rounded-sm" />
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 border border-cyan-500 bg-white rounded-sm" />
                
                {/* Target badge overlay */}
                <div className="absolute -top-5 left-0 px-1 py-0.5 rounded bg-cyan-500 text-white font-mono text-[6px] shadow-sm select-none z-30">
                  Target Zoom: 1.5x
                </div>
              </motion.div>

              {/* Cursor Drawing the Area */}
              <motion.div
                className="absolute w-4 h-4 z-40 flex flex-col items-start gap-1"
                animate={{
                  x: [40, 98, 203, 203, 40],
                  y: [40, 62, 142, 142, 40]
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  times: [0, 0.25, 0.5, 0.85, 1],
                  ease: "easeInOut"
                }}
              >
                {/* Mouse Pointer Cursor SVG */}
                <svg width="14" height="14" viewBox="0 0 24 24" className="text-cyan-500 drop-shadow-md">
                  <path
                    d="M3 3 L3 21 L8.5 15.5 L14.5 24 L17.5 22 L11.5 13.5 L18 13.5 Z"
                    fill="currentColor"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>

                {/* Coordinate Tooltip (looks like an editor readout) */}
                <motion.div
                  className="px-1 py-0.5 rounded bg-slate-900/90 text-white font-mono text-[5px] whitespace-nowrap shadow border border-white/10"
                  animate={{
                    opacity: [0, 0, 1, 1, 0]
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    times: [0, 0.23, 0.25, 0.85, 1]
                  }}
                >
                  X: 98, Y: 62 | W: 105, H: 80
                </motion.div>
              </motion.div>

              {/* Guide Crosshair Lines (drawing aids) */}
              <motion.div
                className="absolute top-0 left-0 w-px h-full bg-cyan-400/15 border-dashed border-l border-cyan-400/25"
                animate={{
                  left: [40, 98, 203, 203, 40],
                  opacity: [0, 0.6, 0.6, 0.6, 0]
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  times: [0, 0.25, 0.5, 0.85, 1],
                  ease: "easeInOut"
                }}
              />
              <motion.div
                className="absolute top-0 left-0 w-full h-px bg-cyan-400/15 border-dashed border-t border-cyan-400/25"
                animate={{
                  top: [40, 62, 142, 142, 40],
                  opacity: [0, 0.6, 0.6, 0.6, 0]
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  times: [0, 0.25, 0.5, 0.85, 1],
                  ease: "easeInOut"
                }}
              />
            </div>

          </div>
        </div>

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
                ? "bg-teal-500/10 border-teal-500/20 text-teal-600 dark:text-teal-400"
                : "bg-cyan-500/10 border-cyan-500/20 text-cyan-600 dark:text-cyan-400"
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
  const waveHeights = [
    12, 16, 28, 42, 18, 10, 8, 22, 36, 45, 52, 38, 20, 12, 28, 40, 48, 55, 32, 15, 10, 24, 38, 46,
    58, 40, 18, 12, 30, 44, 50, 42, 25, 15, 8, 20, 36, 42, 28, 12, 16, 25, 30, 18, 10, 14, 18, 12, 8, 10
  ];

  const words = [
    { text: "Ultra-realistic", start: 0.05, end: 0.25 },
    { text: "AI", start: 0.26, end: 0.35 },
    { text: "voiceovers", start: 0.36, end: 0.52 },
    { text: "paced", start: 0.53, end: 0.62 },
    { text: "to", start: 0.63, end: 0.68 },
    { text: "your", start: 0.69, end: 0.74 },
    { text: "video", start: 0.75, end: 0.85 }
  ];

  const [time, setTime] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = ((Date.now() - startTime) / 1000) % 6; // 6s loop
      if (elapsed < 4.8) {
        setTime(elapsed);
      } else {
        setTime(4.8);
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-[180px] flex items-center justify-center p-3 select-none">
      {/* Editor Window (Wide format) */}
      <div className="w-[94%] h-full rounded-xl border border-[var(--space-border)] bg-[var(--space-card)] flex flex-col overflow-hidden shadow-sm relative">
        
        {/* Titlebar / Ruler Header */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--space-border)] bg-slate-50 dark:bg-slate-950/40 text-[8px] font-mono text-[var(--space-text-subtle)]">
          <div className="flex items-center gap-1.5 font-bold">
            <Mic className="w-2.5 h-2.5 text-orange-500 animate-pulse" />
            <span>ElevenLabs Audio Editor</span>
          </div>
          {/* Time indicator */}
          <span className="tabular-nums font-mono">
            {time.toFixed(1)}s
          </span>
        </div>

        {/* Timeline Tracks Area */}
        <div className="flex-1 flex bg-slate-100/50 dark:bg-slate-950/20 overflow-hidden relative">
          
          {/* Left Track Info Panel */}
          <div className="w-24 border-r border-[var(--space-border)] bg-slate-50 dark:bg-slate-950/40 p-2 flex flex-col justify-between text-[7px] font-sans text-[var(--space-text-subtle)]">
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-[var(--space-text)] truncate">Voice Track 1</span>
              <span className="text-[6px] opacity-75 truncate">Adam (Male Tech)</span>
            </div>
            
            {/* Control Badges */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[6px] text-emerald-600 dark:text-emerald-400">API Active</span>
              </div>
              <div className="flex items-center justify-between bg-slate-200/50 dark:bg-slate-800/50 px-1 py-0.5 rounded border border-[var(--space-border)]">
                <span>Speed:</span>
                <span className="font-mono text-teal-600 dark:text-teal-400">1.05x</span>
              </div>
            </div>
          </div>

          {/* Timeline Waveform Area */}
          <div className="flex-1 relative p-2.5 flex flex-col justify-between overflow-hidden">
            
            {/* Waveform Track Container */}
            <div className="h-16 relative flex items-center bg-slate-200/20 dark:bg-slate-900/30 rounded border border-[var(--space-border)] px-3 overflow-hidden">
              
              {/* Background Waveform (Muted Gray) */}
              <div className="absolute inset-x-3 inset-y-0 flex items-center justify-between gap-[2px] opacity-15">
                {waveHeights.map((h, i) => (
                  <div
                    key={i}
                    className="w-[3px] bg-slate-400 dark:bg-slate-700 rounded-full"
                    style={{ height: `${h * 0.9}%` }}
                  />
                ))}
              </div>

              {/* Active Waveform Container (with sweeping width) */}
              <motion.div
                className="absolute inset-y-0 left-3 flex items-center overflow-hidden pointer-events-none select-none z-10"
                animate={{
                  width: ["0%", "100%", "100%", "0%"]
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  times: [0, 0.8, 0.9, 1],
                  ease: "linear"
                }}
                style={{ width: "0%" }}
              >
                {/* Colored Waveform (Identical layout to align perfectly) */}
                <div className="h-full flex items-center justify-between gap-[2px] min-w-[200px] sm:min-w-[260px] md:min-w-[340px]">
                  {waveHeights.map((h, i) => (
                    <div
                      key={i}
                      className="w-[3px] bg-gradient-to-t from-orange-500 to-rose-500 rounded-full flex-shrink-0"
                      style={{ height: `${h * 0.9}%` }}
                    />
                  ))}
                </div>
              </motion.div>

              {/* Vertical Playhead Cursor line */}
              <motion.div
                className="absolute top-0 bottom-0 w-px bg-rose-500 z-20 flex flex-col items-center"
                animate={{
                  left: ["12px", "calc(100% - 12px)", "calc(100% - 12px)", "12px"]
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  times: [0, 0.8, 0.9, 1],
                  ease: "linear"
                }}
                style={{ left: "12px" }}
              >
                {/* Glowing playhead head */}
                <div className="w-2.5 h-2.5 -mt-0.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] border border-white" />
              </motion.div>
            </div>

            {/* Subtitle / Script Transcript Box */}
            <div className="h-7 border border-[var(--space-border)] bg-[var(--space-card)] rounded flex items-center px-2 text-[7.5px] font-mono text-[var(--space-text-subtle)] relative overflow-hidden">
              <span className="text-[6px] text-teal-600 dark:text-teal-400 font-bold tracking-wider uppercase mr-2 border-r border-[var(--space-border)] pr-2 select-none">
                Narration
              </span>
              <div className="flex flex-wrap items-center">
                {words.map((w, idx) => (
                  <motion.span
                    key={idx}
                    animate={{
                      color: [
                        "var(--space-text-muted)",
                        "var(--space-text-muted)",
                        "var(--teal-500)",
                        "var(--teal-500)",
                        "var(--space-text-muted)"
                      ]
                    }}
                    transition={{
                      duration: 6,
                      repeat: Infinity,
                      times: [0, w.start, w.start + 0.05, w.end, w.end + 0.08],
                      ease: "easeInOut"
                    }}
                    className="font-medium mr-1 transition-colors"
                  >
                    {w.text}
                  </motion.span>
                ))}
              </div>
            </div>

          </div>

          {/* Right Volume Unit Level Meter */}
          <div className="w-12 border-l border-[var(--space-border)] bg-slate-50 dark:bg-slate-950/40 p-2 flex flex-col justify-between items-center text-[6px] font-mono text-[var(--space-text-subtle)]">
            <span className="opacity-80">VU</span>
            
            {/* Meter Channel Bars */}
            <div className="flex-1 my-1.5 flex gap-[1.5px]">
              {[0, 1].map((channel) => (
                <div key={channel} className="w-[3px] h-full bg-slate-200 dark:bg-slate-900 rounded-sm overflow-hidden flex flex-col justify-end">
                  {/* Active bouncing meter */}
                  <motion.div
                    className="w-full bg-gradient-to-t from-emerald-500 via-amber-400 to-red-500 rounded-sm"
                    animate={{
                      height: ["15%", "90%", "30%", "85%", "10%", "95%", "20%", "75%", "15%"]
                    }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: channel * 0.15
                    }}
                    style={{ height: "15%" }}
                  />
                </div>
              ))}
            </div>

            <span className="font-semibold text-[6px] text-emerald-600 dark:text-emerald-400">-6dB</span>
          </div>

        </div>

      </div>
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
    icon: Edit3,
    title: "Interactive UI Canvas",
    description: "Draw custom highlighting boxes, pointer arrows, or blur private credentials directly on your screens using our secure, drag-and-drop annotation editor.",
    tag: "Canvas Editor",
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
    color: "from-teal-600 to-teal-500",
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

          <h3 className="font-sans font-bold text-lg text-[var(--space-text)] mb-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
            {feature.title}
          </h3>

          <p className="text-sm text-[var(--space-text-muted)] leading-relaxed font-sans">
            {feature.description}
          </p>
        </div>

        {/* Animated illustration, speeds up on hover. Only runs while near the
            viewport — see IllustrationSlot. */}
        <IllustrationSlot
          className="mt-4 rounded-lg border border-[var(--space-border)] bg-[var(--space-card)] overflow-hidden"
          style={{
            animationDuration: isHovered ? "0.5s" : "1s",
          }}
        >
          <Illustration />
        </IllustrationSlot>
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
          <h2 className="font-extrabold text-3xl lg:text-5xl tracking-tight text-[var(--space-text)] max-w-2xl mx-auto leading-tight">
            Built for professional technical content creators
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
