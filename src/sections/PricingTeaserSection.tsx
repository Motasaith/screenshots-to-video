import { useState } from "react";
import { Link } from "react-router";
import { Check } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { teaserPlans } from "@/data/pricing";

export default function PricingTeaserSection() {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="section">
      <div className="container-site">
        <Reveal className="max-w-2xl">
          <h2 className="h2">Free until it is worth paying for</h2>
          <p className="lede mt-4">
            Five videos a month costs nothing and needs no card. Upgrade when five stops being
            enough.
          </p>
        </Reveal>

        <Reveal className="mt-8">
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
        </Reveal>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {teaserPlans.map((plan, i) => {
            const price = yearly && plan.yearlyPrice ? plan.yearlyPrice : plan.price;

            return (
              <Reveal key={plan.id} delay={i * 70}>
                <div
                  className={`card flex h-full flex-col p-7 ${
                    plan.popular ? "border-ink shadow-soft" : "card-lift"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-[17px] font-semibold text-ink">{plan.name}</h3>
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
              </Reveal>
            );
          })}
        </div>

        <Reveal className="mt-6">
          <Link to="/pricing" className="text-[14.5px] font-medium text-brand hover:underline">
            Compare all three plans
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
