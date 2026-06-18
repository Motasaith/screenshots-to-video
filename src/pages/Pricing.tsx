import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Check, Zap, ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";
import { SEO, createBreadcrumbSchema } from "@/components/SEO";
import { AdSensePlaceholder } from "@/components/shared/AdSensePlaceholder";
import { SpaceBackground } from "@/components/shared/SpaceBackground";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for getting started",
    features: [
      "5 videos per month",
      "720p export resolution",
      "Proactive AI Chat Guide",
      "All Aspect Ratios (16:9, 9:16, etc.)",
      "12 Voices (including 4 Ultra-Realistic Kokoro)",
      "Basic AI script generation",
      "Community support",
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
      "Vision Copyright Checker",
      "ElevenLabs premium voices",
      "Cinematic Scene Transitions",
      "Custom intro/outro",
      "Priority render queue",
      "Advanced AI suggestions",
      "Background music library",
      "API access",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    popular: true,
  },
  {
    name: "Team",
    price: "$99",
    period: "/month",
    description: "For teams and agencies",
    features: [
      "Everything in Pro",
      "Unlimited team members",
      "Shared project library",
      "Brand templates",
      "Team analytics",
      "SSO authentication",
      "Dedicated support",
      "Custom integrations",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function Pricing() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const breadcrumbJsonLd = createBreadcrumbSchema([
    { name: "Home", url: "https://aivideo.ai/" },
    { name: "Pricing", url: "https://aivideo.ai/pricing" },
  ]);

  return (
    <div className="theme-3d-immersive min-h-screen relative overflow-x-hidden font-sans">
      <SEO
        title="Pricing"
        description="Simple, transparent pricing for AIVideo. Start free and upgrade when you need more power. No hidden fees."
        canonical="https://aivideo.ai/pricing"
        jsonLd={breadcrumbJsonLd}
      />
      <SpaceBackground />
      <div className="relative z-10">
        <Navbar />
        <main className="pt-28 pb-20" ref={ref}>
          <div className="w-full px-6 lg:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-[var(--space-text-subtle)] hover:text-[var(--space-text)] transition-colors mb-6 font-mono text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to home
              </Link>
              <h1 className="font-extrabold text-4xl lg:text-6xl tracking-tight text-[var(--space-text)] leading-tight">
                Simple, transparent pricing
              </h1>
              <p className="text-[var(--space-text-muted)] mt-4 max-w-lg mx-auto">
                Start free. Upgrade when you need more power. No hidden fees.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
              {plans.map((plan, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                  className={`relative flex flex-col ${plan.popular ? "md:-mt-4 md:mb-4" : ""}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-500 text-white px-4 py-1 text-[10px] font-semibold font-mono rounded-full border border-teal-400/20 shadow-md z-20">
                      <Zap className="w-3 h-3 inline mr-1 -mt-0.5 animate-pulse" />
                      Most Popular
                    </div>
                  )}
                  <div
                    className={`h-full p-6 lg:p-8 flex flex-col justify-between rounded-2xl border ${
                      plan.popular
                        ? "border-teal-500 bg-teal-500/5 shadow-[0_0_30px_rgba(13,148,136,0.1)]"
                        : "border-[var(--space-border)] bg-[var(--space-card)]"
                    }`}
                  >
                    <div>
                      <h3 className="font-bold text-xl text-[var(--space-text)]">{plan.name}</h3>
                      <div className="mt-4 flex items-baseline gap-1">
                        <span className="font-extrabold text-4xl text-[var(--space-text)]">
                          {plan.price}
                        </span>
                        <span className="text-sm text-[var(--space-text-muted)]">
                          {plan.period}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--space-text-muted)] mt-2">
                        {plan.description}
                      </p>

                      <ul className="mt-6 space-y-3.5 border-t border-[var(--space-border)] pt-6">
                        {plan.features.map((feature, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-3 text-sm text-[var(--space-text-muted)]"
                          >
                            <Check className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      disabled
                      className={`mt-8 w-full glass-btn py-3.5 text-center font-semibold text-xs opacity-60 cursor-not-allowed ${
                        plan.popular ? "glass-btn-primary" : "glass-btn-secondary"
                      }`}
                    >
                      Coming Soon
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="container mx-auto px-4 mt-12"><AdSensePlaceholder size="leaderboard" /></div>
          </div>
        </main>
        <FooterSection />
      </div>
    </div>
  );
}
