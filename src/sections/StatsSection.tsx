import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Sparkles, Cpu, Award, Zap } from "lucide-react";

const stats = [
  {
    value: 5000,
    suffix: "+",
    label: "Videos Rendered",
    icon: Cpu,
    percentage: 87,
    strokeColor: "#0d9488",
    gradient: "from-teal-600 to-teal-400 dark:from-teal-400 dark:to-teal-600",
  },
  {
    value: 12,
    suffix: "min",
    label: "Avg. Build Time",
    icon: Zap,
    percentage: 92,
    strokeColor: "#0d9488",
    gradient: "from-teal-600 to-teal-400 dark:from-teal-400 dark:to-teal-600",
  },
  {
    value: 1080,
    suffix: "p",
    label: "Output Format",
    icon: Sparkles,
    percentage: 100,
    strokeColor: "#0d9488",
    gradient: "from-teal-600 to-teal-400 dark:from-teal-400 dark:to-teal-600",
  },
  {
    value: 4.9,
    suffix: "/5",
    label: "User Satisfaction",
    icon: Award,
    decimals: 1,
    percentage: 98,
    strokeColor: "#0d9488",
    gradient: "from-teal-600 to-teal-400 dark:from-teal-400 dark:to-teal-600",
  },
];

function OdometerDigit({ digit, delay }: { digit: string; delay: number }) {
  return (
    <motion.span
      initial={{ y: 20, opacity: 0, filter: "blur(4px)" }}
      animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
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
  gradient,
}: {
  value: number;
  suffix: string;
  decimals?: number;
  isInView: boolean;
  gradient: string;
}) {
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isInView) return;
    const duration = 2200;
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
    <span className={`font-sans font-black text-3xl lg:text-4xl bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
      {done
        ? displayValue.split("").map((d, i) => (
            <OdometerDigit key={`${d}-${i}`} digit={d} delay={i * 0.04} />
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
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width="110" height="110" className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
      {/* Track ring */}
      <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--space-border)" strokeWidth="3" />
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
        transition={{ duration: 2, delay: delay + 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{ filter: `drop-shadow(0 0 6px ${strokeColor})` }}
      />
    </svg>
  );
}

export default function StatsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-14 lg:py-20 relative overflow-hidden" ref={ref}>
      {/* Scan line animation on enter */}
      {isInView && <div className="animate-scan-line" />}

      {/* HUD corner labels */}
      <div className="absolute top-6 left-8 hud-label hidden lg:block">SYS: ONLINE</div>
      <div className="absolute top-6 right-8 hud-label hidden lg:block">RENDER ENGINE v4.2</div>
      <div className="absolute bottom-6 left-8 hud-label hidden lg:block">UPTIME: 99.97%</div>
      <div className="absolute bottom-6 right-8 hud-label hidden lg:block">LATENCY: 12ms</div>

      {/* Horizontal HUD guide lines */}
      <div className="absolute top-1/2 left-0 right-0 h-px opacity-[0.04] pointer-events-none" style={{ backgroundColor: 'var(--space-text)' }} />
      <div className="absolute top-[30%] left-0 w-24 h-px opacity-[0.06] pointer-events-none" style={{ backgroundColor: 'var(--neon-cyan)' }} />
      <div className="absolute top-[70%] right-0 w-24 h-px opacity-[0.06] pointer-events-none" style={{ backgroundColor: 'var(--neon-cyan)' }} />

      <div className="w-full px-6 lg:px-12 relative z-10">
        {/* Statistics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.85, y: 20 }}
                animate={isInView ? { opacity: 1, scale: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.12, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center text-center relative group"
              >
                {/* Gauge ring container */}
                <div className="relative w-[110px] h-[110px] flex items-center justify-center mb-5">
                  <GaugeRing
                    percentage={stat.percentage}
                    strokeColor={stat.strokeColor}
                    isInView={isInView}
                    delay={index * 0.12}
                  />
                  {/* Icon in center */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center z-10 border"
                    style={{
                      borderColor: `${stat.strokeColor}33`,
                      backgroundColor: `${stat.strokeColor}10`,
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: stat.strokeColor }} />
                  </div>
                </div>

                {/* Animated counter */}
                <AnimatedCounter
                  value={stat.value}
                  suffix={stat.suffix}
                  decimals={stat.decimals}
                  isInView={isInView}
                  gradient={stat.gradient}
                />

                {/* Label */}
                <p className="font-sans text-xs text-[var(--space-text-subtle)] mt-2 font-medium tracking-wider uppercase">
                  {stat.label}
                </p>

                {/* Percentage micro-label */}
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={isInView ? { opacity: 0.4 } : {}}
                  transition={{ delay: 1.5 + index * 0.1 }}
                  className="mt-1 text-[9px] font-mono text-[var(--space-text-subtle)]"
                >
                  {stat.percentage}% capacity
                </motion.span>
              </motion.div>
            );
          })}
        </div>
      </div>

    </section>
  );
}
