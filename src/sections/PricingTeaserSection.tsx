import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useTheme } from "next-themes";
import { Check, Zap } from "lucide-react";

const plans = [
  {
    name: "Free Developer",
    price: "$0",
    period: "forever",
    description: "Perfect for getting started",
    features: [
      "5 rendering credits/month",
      "720p output resolution",
      "Proactive AI Chat Guide",
      "All Aspect Ratios supported",
      "12 Voice profiles (4 Kokoro)",
    ],
    popular: false,
    accentColor: "rgb(13, 148, 136)",
    checkColor: "text-teal-600 dark:text-teal-400",
    btnStyle: "glass-btn-secondary",
  },
  {
    name: "Creator Studio Pro",
    price: "$25",
    period: "/month",
    yearlyPrice: "$20",
    description: "For professional content creators",
    features: [
      "Unlimited rendering credits",
      "1080p & 4K high fidelity render",
      "Vision Copyright scan safety",
      "ElevenLabs Premium voices",
      "Cinematic Scene Transitions",
      "Custom Intro/Outro templates",
      "Priority render queue",
    ],
    popular: true,
    accentColor: "rgb(13, 148, 136)",
    checkColor: "text-teal-600 dark:text-teal-400",
    btnStyle: "glass-btn-primary",
  },
];

function PricingCard({
  plan,
  index,
  isInView,
  resolvedTheme,
  isYearly,
}: {
  plan: (typeof plans)[0];
  index: number;
  isInView: boolean;
  resolvedTheme: string | undefined;
  isYearly: boolean;
}) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty("--mouse-x", `${x}px`);
    el.style.setProperty("--mouse-y", `${y}px`);
    setRotateY((x - rect.width / 2) / (rect.width / 15));
    setRotateX((rect.height / 2 - y) / (rect.height / 15));
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  const displayPrice = isYearly && plan.yearlyPrice ? plan.yearlyPrice : plan.price;
  const displayPeriod = isYearly && plan.yearlyPrice ? "/month" : plan.period;

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.15 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className={`glass-panel rounded-2xl p-8 relative flex flex-col justify-between border group transition-all duration-300 ${
        plan.popular ? "md:-translate-y-4" : ""
      } ${
        plan.popular
          ? "border-teal-500/20 shadow-[0_15px_40px_rgba(13,148,136,0.04)] dark:shadow-[0_15px_40px_rgba(13,148,136,0.15)]"
          : `border-[var(--space-border)] ${!plan.popular ? "border-dashed" : ""}`
      } hover:border-[var(--space-border-hover)]`}
    >
      {/* Clipped inner overlays (Glow and Glare) */}
      <div className="absolute inset-0 overflow-hidden rounded-[inherit] pointer-events-none z-20">
        {/* Cursor glow */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10"
          style={{
            background: `radial-gradient(circle 200px at var(--mouse-x, 50%) var(--mouse-y, 50%), ${plan.popular ? "rgba(13,148,136,0.08)" : "rgba(13,148,136,0.05)"}, transparent)`,
          }}
        />

        {/* Specular glare */}
        <div
          className="absolute inset-0 pointer-events-none select-none z-20"
          style={{
            background: `radial-gradient(circle 180px at ${50 + rotateY * 15}% ${50 - rotateX * 15}%, rgba(255, 255, 255, ${resolvedTheme === "dark" ? 0.05 : 0.18}), transparent)`,
            mixBlendMode: "overlay",
            borderRadius: "inherit",
          }}
        />
      </div>

      {/* Top accent line for popular */}
      {plan.popular && (
        <div className="absolute inset-x-0 -top-px h-[2px] bg-gradient-to-r from-transparent via-teal-500 to-transparent z-30" />
      )}

      {/* Popular Badge */}
      {plan.popular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-teal-600 to-teal-800 text-white px-3.5 py-1 text-[10px] font-bold font-sans rounded-full border border-teal-500/30 shadow-[0_4px_12px_rgba(13,148,136,0.25)] flex items-center gap-1 select-none z-30">
          <Zap className="w-3 h-3 fill-white text-white" />
          Most Popular
        </div>
      )}

      <div style={{ transform: "translateZ(30px)", transformStyle: "preserve-3d" }} className="relative z-30">
        <h3 className="font-sans font-bold text-lg text-[var(--space-text)] group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
          {plan.name}
        </h3>

        <div className="mt-4 flex items-baseline gap-1.5">
          <motion.span
            key={displayPrice}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="font-sans font-black text-4xl text-[var(--space-text)]"
          >
            {displayPrice}
          </motion.span>
          <span className="text-xs text-[var(--space-text-subtle)] font-sans">{displayPeriod}</span>
          {isYearly && plan.yearlyPrice && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="ml-2 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full"
            >
              Save 20%
            </motion.span>
          )}
        </div>

        <p className="text-sm text-[var(--space-text-muted)] mt-2 font-sans">{plan.description}</p>

        {/* Feature List with staggered check-in */}
        <ul className="mt-8 space-y-3.5 border-t border-[var(--space-border)] pt-6">
          {plan.features.map((feature, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -15 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.5 + index * 0.15 + i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-start gap-3 text-xs text-[var(--space-text-muted)]"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={isInView ? { scale: 1 } : {}}
                transition={{
                  delay: 0.5 + index * 0.15 + i * 0.08,
                  type: "spring",
                  stiffness: 400,
                  damping: 15,
                }}
              >
                <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.checkColor}`} />
              </motion.div>
              <span className="font-sans">{feature}</span>
            </motion.li>
          ))}
        </ul>
      </div>

      <div style={{ transform: "translateZ(20px)" }} className="mt-8 relative z-30">
        <button disabled className={`w-full glass-btn ${plan.btnStyle} opacity-60 cursor-not-allowed text-xs`}>
          Coming Soon
        </button>
      </div>
    </motion.div>
  );
}

export default function PricingTeaserSection() {
  const { resolvedTheme } = useTheme();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section id="pricing" className="py-14 lg:py-20 relative overflow-hidden" ref={ref}>
      <div className="w-full px-6 lg:px-12 relative z-10">
        {/* Section Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-extrabold text-3xl lg:text-5xl tracking-tight text-[var(--space-text)] max-w-xl mx-auto leading-tight">
            Plans and pricing
          </h2>
          <p className="text-base lg:text-lg font-sans text-[var(--space-text-muted)] mt-4 max-w-lg mx-auto leading-relaxed">
            Start free. Move up a plan when you need more renders.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className={`text-sm font-sans font-medium ${!isYearly ? "text-[var(--space-text)]" : "text-[var(--space-text-subtle)]"}`}>
              Monthly
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                isYearly ? "bg-teal-500" : "bg-[var(--space-border)]"
              }`}
              aria-label="Toggle yearly billing"
            >
              <motion.div
                className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                animate={{ left: isYearly ? "28px" : "4px" }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
            <span className={`text-sm font-sans font-medium ${isYearly ? "text-[var(--space-text)]" : "text-[var(--space-text-subtle)]"}`}>
              Yearly
            </span>
            {isYearly && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full"
              >
                Save 20%
              </motion.span>
            )}
          </div>
        </motion.div>

        {/* Column Layout */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto items-stretch">
          {plans.map((plan, index) => (
            <PricingCard
              key={index}
              plan={plan}
              index={index}
              isInView={isInView}
              resolvedTheme={resolvedTheme}
              isYearly={isYearly}
            />
          ))}
        </div>
      </div>

    </section>
  );
}
