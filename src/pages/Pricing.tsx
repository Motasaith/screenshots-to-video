import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Check, Zap, ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import Navbar from "@/components/Navbar";
import FooterSection from "@/sections/FooterSection";
import { SEO, createBreadcrumbSchema } from "@/components/SEO";

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
    <div className="min-h-screen bg-background">
      <SEO
        title="Pricing"
        description="Simple, transparent pricing for AIVideo. Start free and upgrade when you need more power. No hidden fees."
        canonical="https://aivideo.ai/pricing"
        jsonLd={breadcrumbJsonLd}
      />
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
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 font-dm text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </Link>
            <h1 className="font-syne font-extrabold text-4xl lg:text-6xl tracking-tight">
              Simple, transparent pricing
            </h1>
            <p className="font-dm text-muted-foreground mt-4 max-w-lg mx-auto">
              Start free. Upgrade when you need more power. No hidden fees.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className={`relative ${plan.popular ? "md:-mt-4 md:mb-4" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 text-xs font-semibold font-mono border-2 border-border shadow-[2px_2px_0px_0px_hsl(var(--border))]">
                    <Zap className="w-3 h-3 inline mr-1" />
                    Most Popular
                  </div>
                )}
                <div
                  className={`h-full p-6 lg:p-8 border-2 ${
                    plan.popular
                      ? "border-primary bg-primary/5 shadow-[6px_6px_0px_0px_hsl(var(--primary))]"
                      : "border-border bg-card shadow-[4px_4px_0px_0px_hsl(var(--border))]"
                  }`}
                >
                  <h3 className="font-syne font-bold text-xl">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-syne font-extrabold text-4xl">
                      {plan.price}
                    </span>
                    <span className="font-dm text-sm text-muted-foreground">
                      {plan.period}
                    </span>
                  </div>
                  <p className="font-dm text-sm text-muted-foreground mt-2">
                    {plan.description}
                  </p>

                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 font-dm text-sm"
                      >
                        <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    disabled
                    className={`mt-8 w-full neo-btn text-center block opacity-70 cursor-not-allowed ${
                      plan.popular ? "neo-btn-primary" : "neo-btn-ghost"
                    }`}
                  >
                    Coming Soon
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
