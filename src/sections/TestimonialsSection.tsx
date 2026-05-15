import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "DevRel Lead at Vercel",
    content:
      "We create 20+ tutorial videos per month. AIVideo cut our production time by 80%. The zoom animation on UI elements is exactly what was missing from every other tool.",
    rating: 5,
  },
  {
    name: "Marcus Johnson",
    role: "Technical Writer at Stripe",
    content:
      "The AI script generation is surprisingly good. It understands technical workflows and writes concise narration. I spend more time reviewing than writing now.",
    rating: 5,
  },
  {
    name: "Aiko Tanaka",
    role: "Product Designer at Figma",
    content:
      "I use this for internal team tutorials. The brutalist UI is fast and doesn't get in the way. Five videos free per month is generous for our team's needs.",
    rating: 5,
  },
];

export default function TestimonialsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-24 lg:py-32 border-y-2 border-[var(--sketch-fg-subtle)] bg-[var(--sketch-bg)]" ref={ref}>
      <div className="w-full px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="font-mono text-xs text-[var(--sketch-fg-muted)] uppercase tracking-widest bg-[#FBBF24]/20 px-2 py-1 sketch-border-sm inline-block">
            Testimonials
          </span>
          <h2 className="font-body font-bold text-3xl lg:text-5xl mt-3 tracking-tight text-[var(--sketch-fg)]">
            Loved by technical teams
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="sketch-card-hover p-6 lg:p-8 bg-[var(--sketch-card-bg)]"
            >
              <Quote className="w-8 h-8 text-[#FBBF24]/40 mb-4" />
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 text-[#FBBF24] fill-[#FBBF24]"
                  />
                ))}
              </div>
              <p className="font-body text-sm leading-relaxed mb-6 text-[var(--sketch-fg-muted)]">
                {testimonial.content}
              </p>
              <div className="border-t border-[var(--sketch-fg-subtle)] pt-4">
                <p className="font-body font-semibold text-sm text-[var(--sketch-fg)]">
                  {testimonial.name}
                </p>
                <p className="font-body text-xs text-[var(--sketch-fg-subtle)]">
                  {testimonial.role}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
