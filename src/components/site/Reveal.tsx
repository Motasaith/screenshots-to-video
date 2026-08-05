import { useEffect, useRef, type ElementType, type ReactNode } from "react";

/**
 * The site's only entrance animation.
 *
 * One IntersectionObserver is shared by every Reveal on the page instead of
 * one per element, and each element is unobserved the moment it has played.
 * A page with forty reveals therefore ends up with zero observers and zero
 * running animations once you have scrolled past them, which is the whole
 * point: the previous landing page kept roughly twenty `repeat: Infinity`
 * framer-motion timelines alive for as long as the tab was open, several of
 * them animating paint-triggering properties like `borderColor` and `width`.
 *
 * The transition itself is opacity plus translateY only. Those are the two
 * properties the compositor can handle without asking the main thread to lay
 * out or paint anything, which is why this stays smooth on a slow machine
 * while a blur or a box-shadow transition would not.
 */

let observer: IntersectionObserver | null = null;

function getObserver() {
  if (observer) return observer;
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        el.classList.add("reveal-in");
        observer?.unobserve(el);
      }
    },
    // Fires slightly before the element scrolls in, so the motion reads as
    // "already settling" rather than "started because you looked at it".
    { rootMargin: "0px 0px -8% 0px", threshold: 0.01 }
  );
  return observer;
}

interface RevealProps {
  children: ReactNode;
  /** Renders as this tag. Defaults to a plain div. */
  as?: ElementType;
  className?: string;
  /** Stagger in milliseconds, for reveals that sit in a row or a grid. */
  delay?: number;
  id?: string;
}

export function Reveal({ children, as: Tag = "div", className = "", delay = 0, id }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Anything already on screen at mount (the hero, most of the time) is
    // shown immediately. Waiting for an observer callback would mean a frame
    // of blank space at the top of every first paint.
    if (el.getBoundingClientRect().top < window.innerHeight) {
      el.classList.add("reveal-in");
      return;
    }

    const io = getObserver();
    io.observe(el);
    return () => io.unobserve(el);
  }, []);

  return (
    <Tag
      ref={ref}
      id={id}
      className={`reveal ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
