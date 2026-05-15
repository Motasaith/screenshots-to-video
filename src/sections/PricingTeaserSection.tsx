import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Check, Zap } from "lucide-react";
import { Link } from "react-router";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for getting started",
    features: [
      "5 videos per month",
      "720p export resolution",
      "6 Edge-TTS voices",
      "Up to 10 steps per video",
      "7-day video storage",
      "AIVideo watermark",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    price: "$25",
    period: "/month",
    description: "For serious content creators",
    features: [
      "Unlimited videos",
      "1080p & 4K export",
      "ElevenLabs premium voices",
      "Up to 30 steps per video",
      "Permanent video storage",
      "No watermark",
      "Custom intro/outro",
      "Priority render queue",
    ],
    cta: "Upgrade to Pro",
    popular: true,
  },
];

export default function PricingTeaserSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="pricing" className="py-24 lg:py-32 dot-grid" ref={ref}>
      <div className="w-full px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="font-mono text-xs text-[var(--sketch-fg-muted)] uppercase tracking-widest bg-[#FBBF24]/20 px-2 py-1 sketch-border-sm inline-block">
            Pricing
          </span>
          <h2 className="font-body font-bold text-3xl lg:text-5xl mt-3 tracking-tight text-[var(--sketch-fg)]">
            Simple, transparent pricing
          </h2>
          <p className="font-body text-[var(--sketch-fg-muted)] mt-4 max-w-lg mx-auto">
            Start free. Upgrade when you need more power.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className={`relative ${
                plan.popular ? "md:-mt-4 md:mb-4" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FBBF24] text-[var(--sketch-fg)] px-4 py-1 text-xs font-semibold font-mono border-2 border-[var(--sketch-border-color)] shadow-[2px_2px_0px_0px_var(--sketch-card-bg)] sketch-border-sm">
                  <Zap className="w-3 h-3 inline mr-1" />
                  Most Popular
                </div>
              )}
              <div
                className={`h-full p-6 lg:p-8 border-2 ${
                  plan.popular
                    ? "border-[var(--sketch-border-color)] bg-[#FBBF24]/5 shadow-[6px_6px_0px_0px_#FBBF24]"
                    : "border-[var(--sketch-fg-subtle)] bg-[var(--sketch-card-bg)] shadow-[4px_4px_0px_0px_var(--sketch-border-color)]"
                }`}
                style={{ borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px" }}
              >
                <h3 className="font-body font-bold text-xl text-[var(--sketch-fg)]">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-body font-extrabold text-4xl text-[var(--sketch-fg)]">
                    {plan.price}
                  </span>
                  <span className="font-body text-sm text-[var(--sketch-fg-subtle)]">
                    {plan.period}
                  </span>
                </div>
                <p className="font-body text-sm text-[var(--sketch-fg-subtle)] mt-2">
                  {plan.description}
                </p>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 font-body text-sm text-[#1E1B4B]/70"
                    >
                      <Check className="w-4 h-4 text-[#FBBF24] flex-shrink-0 mt-0.5" />
                      <span className="text-[var(--sketch-fg-muted)]">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  disabled
                  className={`mt-8 w-full sketch-btn text-center opacity-70 cursor-not-allowed ${
                    plan.popular ? "sketch-btn-primary" : "sketch-btn-ghost"
                  }`}
                >
                  Coming Soon
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
