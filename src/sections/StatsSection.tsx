import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Sparkles, Cpu, Award, Zap } from "lucide-react";

const stats = [
  {
    value: 1080,
    suffix: "p",
    label: "Max Output Quality",
    icon: Cpu,
    percentage: 100,
    strokeColor: "var(--teal-600)",
  },
  {
    value: 4,
    suffix: "",
    label: "Aspect Ratios",
    icon: Zap,
    percentage: 85,
    strokeColor: "var(--teal-600)",
  },
  {
    value: 30,
    suffix: "+",
    label: "Editor Tools",
    icon: Sparkles,
    percentage: 90,
    strokeColor: "var(--teal-600)",
  },
  {
    value: 100,
    suffix: "%",
    label: "AI Narration",
    icon: Award,
    percentage: 100,
    strokeColor: "var(--teal-600)",
  },
];

function OdometerDigit({ digit, delay }: { digit: string; delay: number }) {
  return (
    <motion.span
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="inline-block"
    >
      {digit}
    </motion.span>
  );
}

function AnimatedCounter({
  value,
  suffix,
  decimals = 0,
  isInView,
}: {
  value: number;
  suffix: string;
  decimals?: number;
  isInView: boolean;
}) {
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isInView) return;
    const duration = 1500;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setCount(eased * value);
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDone(true);
      }
    };
    requestAnimationFrame(animate);
  }, [isInView, value]);

  const displayValue = decimals > 0 ? count.toFixed(decimals) : String(Math.round(count));

  return (
    <span className="font-sans font-black text-2xl lg:text-3xl text-teal-600 dark:text-teal-400">
      {done
        ? displayValue.split("").map((d, i) => (
            <OdometerDigit key={`${d}-${i}`} digit={d} delay={i * 0.03} />
          ))
        : displayValue}
      {suffix}
    </span>
  );
}

function GaugeRing({
  percentage,
  strokeColor,
  isInView,
  delay = 0,
}: {
  percentage: number;
  strokeColor: string;
  isInView: boolean;
  delay?: number;
}) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width="96" height="96" className="absolute inset-0 -rotate-90 animate-wiggle" style={{ animationDuration: '6s' }} viewBox="0 0 100 100">
      {/* Track ring */}
      <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--space-border)" strokeWidth="2.5" />
      {/* Progress ring */}
      <motion.circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke={strokeColor}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={isInView ? { strokeDashoffset: offset } : {}}
        transition={{ duration: 1.5, delay: delay + 0.2, ease: [0.16, 1, 0.3, 1] }}
        style={{ filter: `drop-shadow(0 0 4px var(--neon-cyan))` }}
      />
    </svg>
  );
}

export default function StatsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-10 lg:py-16 relative overflow-hidden" ref={ref}>
      <div className="w-full px-6 lg:px-12 relative z-10">
        
        {/* Cohesive Glassmorphic Console Panel */}
        <div className="glass-panel max-w-5xl mx-auto rounded-2xl border border-[var(--space-border)] bg-white/40 dark:bg-slate-900/20 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.03)] dark:shadow-[0_30px_60px_rgba(0,0,0,0.4)] overflow-hidden">
          
          {/* Console Header Top Bar */}
          <div className="flex flex-wrap items-center justify-between px-5 py-3.5 border-b border-[var(--space-border)] bg-slate-50/50 dark:bg-slate-950/40 select-none">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="font-mono text-[10px] tracking-wider text-[var(--space-text-muted)] uppercase font-semibold">
                SYSTEM TELEMETRY: OPTIMAL
              </span>
            </div>
            
            <div className="hidden sm:flex items-center gap-4 text-[10px] font-mono text-[var(--space-text-subtle)]">
              <span>UPTIME: 99.99%</span>
              <span>•</span>
              <span>LATENCY: 8ms</span>
              <span>•</span>
              <span>ENGINE: V4.2</span>
            </div>

            <div>
              <span className="font-mono text-[10px] tracking-wider text-teal-600 dark:text-teal-400 font-bold uppercase">
                Active Render Cluster
              </span>
            </div>
          </div>

          {/* Console Body: Grid of Telemetry Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-y divide-x lg:divide-y-0 divide-[var(--space-border)]">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className="flex flex-col items-center text-center p-8 lg:p-10 hover:bg-slate-50/20 dark:hover:bg-slate-950/10 transition-colors"
                >
                  {/* Gauge ring container */}
                  <div className="relative w-[96px] h-[96px] flex items-center justify-center mb-4">
                    <GaugeRing
                      percentage={stat.percentage}
                      strokeColor={stat.strokeColor}
                      isInView={isInView}
                      delay={index * 0.1}
                    />
                    {/* Icon in center */}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center z-10 border border-teal-500/20 bg-teal-500/5">
                      <Icon className="w-4.5 h-4.5 text-teal-600 dark:text-teal-400" />
                    </div>
                  </div>

                  {/* Animated counter */}
                  <AnimatedCounter
                    value={stat.value}
                    suffix={stat.suffix}
                    isInView={isInView}
                  />

                  {/* Label */}
                  <p className="font-sans text-xs text-[var(--space-text-subtle)] mt-2 font-medium tracking-wider uppercase">
                    {stat.label}
                  </p>

                  {/* Capacity percentage indicator bar */}
                  <div className="w-16 bg-[var(--space-border)] h-1 rounded-full mt-3 overflow-hidden relative">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-teal-500/60 dark:bg-teal-400/60 rounded-full"
                      initial={{ width: 0 }}
                      animate={isInView ? { width: `${stat.percentage}%` } : {}}
                      transition={{ duration: 1.5, delay: index * 0.1 }}
                    />
                  </div>
                  <span className="mt-1 text-[8px] font-mono text-[var(--space-text-subtle)] opacity-60">
                    Load: {stat.percentage}%
                  </span>
                </div>
              );
            })}
          </div>

          {/* Console Footer Bottom Bar */}
          <div className="flex items-center justify-between px-5 py-2.5 border-t border-[var(--space-border)] bg-slate-50/20 dark:bg-slate-950/10 text-[8px] font-mono text-[var(--space-text-subtle)] select-none">
            <span>NODE: GPU_CLUSTER_US_EAST</span>
            <span className="animate-pulse">● CONNECTION SECURE</span>
            <span>CLOCK: OK</span>
          </div>
          
        </div>
      </div>
    </section>
  );
}
