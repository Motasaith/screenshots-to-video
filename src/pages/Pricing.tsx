import { useState } from "react";
import { Link } from "react-router";
import { Check } from "lucide-react";
import { PageShell } from "@/components/site/PageShell";
import { plansWithLiveLimits } from "@/data/pricing";
import { trpc } from "@/providers/trpc";

const faqs = [
  {
    q: "What counts as a video?",
    a: "One completed render. Re-rendering the same project after an edit counts again, so it is worth previewing before you commit on the free plan.",
  },
  {
    q: "What happens when I run out on the free plan?",
    a: "Nothing breaks. You keep every project and every video you already rendered, and the counter resets at the start of the next month.",
  },
  {
    q: "Can I cancel?",
    a: "Any time, from settings. You keep Pro until the end of the period you have paid for, then drop back to the free plan with your work intact.",
  },
  {
    q: "Do I need my own ElevenLabs account?",
    a: "Only for the ElevenLabs voices. The twelve built-in voices, including the four ultra-realistic ones, need nothing from you.",
  },
];

export default function Pricing() {
  /**
   * The free allowance comes from the server, not from this file.
   *
   * It is editable in the admin dashboard and multiplied while a promotion runs, so a
   * number typed here would be wrong the moment an offer starts. That is the same
   * mistake that had this page saying five a month while the code allowed fourteen a
   * week.
   */
  const { data: config } = trpc.config.useQuery(undefined, { staleTime: 60_000 });
  const plans = plansWithLiveLimits(config?.plan?.freeVideos, config?.plan?.promoLabel, config?.plan?.proRenders);

  const [yearly, setYearly] = useState(false);

  return (
    <PageShell
      title="Pricing"
      description="AIVideo pricing: a free plan, Pro at $25 a month, and Team at $99."
      canonical="https://aivideo.ai/pricing"
      lede={
        // The last hardcoded free-tier number on the site. It said five while the
        // code allowed fourteen a week, and then twenty-four under the promotion.
        config?.plan?.freeVideos
          ? `Start free. Upgrade when ${config.plan.freeVideos} videos a month stops being enough.`
          : "Start free. Upgrade when the free plan stops being enough."
      }
      wide
    >
      <div className="inline-flex rounded-full border border-line bg-mat p-1">
        {[
          { label: "Monthly", value: false },
          { label: "Yearly, save 20%", value: true },
        ].map((option) => (
          <button
            key={option.label}
            onClick={() => setYearly(option.value)}
            className={`rounded-full px-4 py-1.5 text-[13.5px] font-medium transition-colors ${
              yearly === option.value ? "bg-white text-ink shadow-xs" : "text-ink-body hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => {
          const price = yearly && plan.yearlyPrice ? plan.yearlyPrice : plan.price;

          return (
            <div
              key={plan.id}
              className={`card flex flex-col p-7 ${plan.popular ? "border-ink shadow-soft" : "card-lift"}`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-[17px] font-semibold text-ink">{plan.name}</h2>
                {plan.popular && (
                  <span className="rounded-full bg-ink px-2.5 py-1 text-[11.5px] font-medium text-white">
                    Most popular
                  </span>
                )}
              </div>

              <p className="mt-1.5 text-[14.5px] text-ink-body">{plan.tagline}</p>

              <p className="mt-6 flex items-baseline gap-1.5">
                <span className="text-[40px] font-semibold leading-none tracking-[-0.035em] text-ink">
                  {price}
                </span>
                <span className="text-[14px] text-ink-muted">{plan.period}</span>
              </p>

              <ul className="mt-7 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2.5 text-[14.5px] text-ink-body">
                    <Check className="mt-0.5 h-4 w-4 flex-none text-brand" strokeWidth={2.5} />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                to={plan.href}
                className={`btn mt-8 w-full ${plan.popular ? "btn-primary" : "btn-secondary"}`}
              >
                {plan.cta}
              </Link>
            </div>
          );
        })}
      </div>

      <section className="mt-20">
        <h2 className="h3">Questions people ask before paying</h2>
        <div className="mt-6 divide-y divide-line border-y border-line">
          {faqs.map((faq) => (
            <div key={faq.q} className="py-5">
              <h3 className="text-[16px] font-medium text-ink">{faq.q}</h3>
              <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-ink-body">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
