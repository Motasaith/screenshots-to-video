import { motion } from "framer-motion";

const companies = [
  "Vercel",
  "Stripe",
  "Notion",
  "Linear",
  "Figma",
  "Supabase",
  "Twilio",
  "Railway",
];

export default function SocialProofSection() {
  return (
    <section className="py-10 border-y-2 border-[var(--sketch-fg-subtle)] bg-[var(--sketch-bg)]">
      <div className="w-full px-6 lg:px-12">
        <p className="text-center font-body text-xs text-[var(--sketch-fg-subtle)] uppercase tracking-widest mb-6">
          Trusted by technical teams at
        </p>
        <div className="relative overflow-hidden">
          <div className="flex items-center gap-16 animate-marquee">
            {[...companies, ...companies].map((company, i) => (
              <motion.span
                key={i}
                className="font-body font-bold text-xl text-[var(--sketch-fg-subtle)] whitespace-nowrap flex-shrink-0"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                {company}
              </motion.span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
