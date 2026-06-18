import { useRef, useState, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Star, Quote, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "DevRel Lead at Vercel",
    content:
      "We generate 20+ tutorial videos monthly. AIVideo cut production time by 80%. The dynamic camera zoom on visual elements is exactly what technical guides needed.",
    rating: 5,
    initials: "SC",
    gradient: "from-teal-400 to-teal-600",
  },
  {
    name: "Marcus Johnson",
    role: "Technical Writer at Stripe",
    content:
      "The AI script generator is exceptional. It captures technical documentation semantics and outlines concise video narrations. Render outputs are ready to deploy.",
    rating: 5,
    initials: "MJ",
    gradient: "from-slate-400 to-slate-600",
  },
  {
    name: "Aiko Tanaka",
    role: "Product Designer at Figma",
    content:
      "Perfect for internal visual documentation. The editor canvas is lightning fast. Automating narration transitions keeps our guide materials highly consistent.",
    rating: 5,
    initials: "AT",
    gradient: "from-teal-500 to-teal-700",
  },
  {
    name: "David Park",
    role: "Engineering Manager at Linear",
    content:
      "Our onboarding docs went from text walls to cinematic walkthroughs. New engineers ramp 40% faster now. The copyright scanning alone saved us from legal issues.",
    rating: 5,
    initials: "DP",
    gradient: "from-teal-400 to-teal-500",
  },
  {
    name: "Elena Rodriguez",
    role: "Content Lead at Notion",
    content:
      "Studio Mode changed everything for us. We write narration, the AI handles camera work, transitions, and voiceover. It feels like having a production team.",
    rating: 5,
    initials: "ER",
    gradient: "from-slate-500 to-slate-700",
  },
];

function StarRating({ rating, animate }: { rating: number; animate: boolean }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: rating }).map((_, i) => (
        <motion.div
          key={i}
          initial={animate ? { scale: 0, rotate: -180 } : {}}
          animate={animate ? { scale: 1, rotate: 0 } : {}}
          transition={{ delay: 0.1 + i * 0.1, type: "spring", stiffness: 300, damping: 15 }}
          className="relative"
        >
          <Star className="w-4 h-4 text-amber-400 fill-amber-400 filter drop-shadow-[0_0_4px_rgba(251,191,36,0.4)]" />
          {/* Sparkle particle on animation complete */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={animate ? { scale: [0, 1.5, 0], opacity: [0, 1, 0] } : {}}
            transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
            className="absolute -top-1 -right-1 w-2 h-2 bg-amber-300 rounded-full pointer-events-none"
          />
        </motion.div>
      ))}
    </div>
  );
}

export default function TestimonialsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = next, -1 = prev

  const goNext = () => {
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };
  const goPrev = () => {
    setDirection(-1);
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const selectIndex = (index: number) => {
    if (index === activeIndex) return;
    setDirection(index > activeIndex ? 1 : -1);
    setActiveIndex(index);
  };

  // Autoplay timer that resets when user interacts manually
  useEffect(() => {
    const timer = setInterval(() => {
      goNext();
    }, 6000);
    return () => clearInterval(timer);
  }, [activeIndex]);

  // Get cards to show: previous, current, next
  const getCardIndex = (offset: number) =>
    (activeIndex + offset + testimonials.length) % testimonials.length;

  return (
    <section className="py-14 lg:py-20 relative overflow-hidden" ref={ref}>
      <div className="w-full px-6 lg:px-12 relative z-10">
        {/* Section Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-3">
            <MessageSquare className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span className="font-mono text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
              Reviews
            </span>
          </div>
          <h2 className="font-extrabold text-3xl lg:text-5xl mt-3 tracking-tight text-[var(--space-text)] max-w-xl mx-auto leading-tight">
            Loved by leading
            <br />
            <span className="text-gradient-neon">technical teams</span>
          </h2>
        </motion.div>

        {/* 3D Perspective Carousel */}
        <div className="relative max-w-4xl mx-auto">
          {/* Large decorative counter watermark with direction-aware slide */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 pointer-events-none select-none z-0 w-80 h-48 overflow-hidden flex items-center justify-center">
            <AnimatePresence mode="popLayout" custom={direction}>
              <motion.div
                key={activeIndex}
                custom={direction}
                variants={{
                  enter: (dir: number) => ({
                    y: dir > 0 ? 120 : -120,
                    opacity: 0,
                    scale: 0.8,
                    filter: "blur(12px)"
                  }),
                  center: {
                    y: 0,
                    opacity: 0.05,
                    scale: 1,
                    filter: "blur(0px)"
                  },
                  exit: (dir: number) => ({
                    y: dir > 0 ? -120 : 120,
                    opacity: 0,
                    scale: 0.8,
                    filter: "blur(12px)"
                  })
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="absolute font-sans font-black text-[14rem] tracking-tight leading-none text-[var(--space-text)]"
              >
                {`0${activeIndex + 1}`}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Cards in 3D perspective fan */}
          <div className="relative h-[380px] lg:h-[340px] flex items-center justify-center perspective-3d">
            {[-1, 0, 1].map((offset) => {
              const idx = getCardIndex(offset);
              const item = testimonials[idx];
              const isCenter = offset === 0;

              return (
                <motion.div
                  key={`${idx}-${offset}`}
                  initial={false}
                  animate={{
                    x: offset * 280,
                    rotateY: offset * -15,
                    scale: isCenter ? 1 : 0.85,
                    opacity: isCenter ? 1 : 0.4,
                    z: isCenter ? 50 : -50,
                  }}
                  transition={{ type: "spring", stiffness: 200, damping: 25 }}
                  className={`absolute w-full max-w-md glass-panel rounded-2xl p-6 lg:p-8 border border-[var(--space-border)] ${
                    isCenter
                      ? "z-30 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
                      : "z-10 cursor-pointer hover:border-teal-500/30 hidden lg:block"
                  }`}
                  style={{ transformStyle: "preserve-3d" }}
                  onClick={() => {
                    if (offset === -1) goPrev();
                    if (offset === 1) goNext();
                  }}
                >
                  <Quote className="absolute top-6 right-6 w-8 h-8 text-[var(--space-text-subtle)] opacity-10 pointer-events-none" />

                  {/* Star Rating with sparkle */}
                  <StarRating rating={item.rating} animate={isCenter} />

                  {/* Quote content */}
                  <div className="mt-4 mb-6 min-h-[80px]">
                    <AnimatePresence mode="wait">
                      {isCenter && (
                        <motion.p
                          key={activeIndex}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.4 }}
                          className="font-serif italic text-base lg:text-lg leading-relaxed text-[var(--space-text-muted)]"
                        >
                          "{item.content}"
                        </motion.p>
                      )}
                    </AnimatePresence>
                    {!isCenter && (
                      <p className="font-serif italic text-base lg:text-lg leading-relaxed text-[var(--space-text-muted)]">
                        "{item.content}"
                      </p>
                    )}
                  </div>

                  {/* User info footer */}
                  <div className="border-t border-[var(--space-border)] pt-4 flex items-center gap-3">
                    {/* Rotating gradient border avatar */}
                    <div className="relative">
                      <div
                        className={`w-10 h-10 rounded-full bg-gradient-to-br ${item.gradient} p-[2px] shadow-md`}
                      >
                        <div
                          className="w-full h-full rounded-full flex items-center justify-center text-xs font-bold text-[var(--space-text)]"
                          style={{ backgroundColor: "var(--space-bg)" }}
                        >
                          {item.initials}
                        </div>
                      </div>
                      {/* Spinning border ring */}
                      {isCenter && (
                        <motion.div
                          className="absolute -inset-1 rounded-full border border-dashed border-teal-400/30"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        />
                      )}
                    </div>
                    <div>
                      <p className="font-sans font-bold text-sm text-[var(--space-text)]">{item.name}</p>
                      <p className="font-sans text-xs text-[var(--space-text-subtle)]">{item.role}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-6 mt-8">
            <button
              onClick={goPrev}
              className="w-10 h-10 rounded-full border border-[var(--space-border)] bg-[var(--space-card)] flex items-center justify-center hover:border-teal-500/50 hover:bg-[var(--space-card-hover)] transition-all text-[var(--space-text-muted)] hover:text-[var(--space-text)]"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Dot indicators */}
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => selectIndex(i)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i === activeIndex
                      ? "w-6 bg-teal-500"
                      : "bg-[var(--space-text-subtle)] opacity-30 hover:opacity-60"
                  }`}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>

            <button
              onClick={goNext}
              className="w-10 h-10 rounded-full border border-[var(--space-border)] bg-[var(--space-card)] flex items-center justify-center hover:border-teal-500/50 hover:bg-[var(--space-card-hover)] transition-all text-[var(--space-text-muted)] hover:text-[var(--space-text)]"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
