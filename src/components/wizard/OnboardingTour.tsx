import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Compass,
  Frame,
  Download,
  MousePointer,
  Move,
  Crop,
  Square,
  Target,
  Type,
  BadgeCheck,
  Stamp,
  Aperture,
  Shield,
  Grid3x3,
  Sun,
  Palette,
  Settings2,
  Film,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Tour Step Definition ─────────────────────────────────────
interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  /** CSS selector for the element to highlight. If null, show centered card. */
  targetSelector: string | null;
  /** Where to position the tooltip relative to the target */
  placement: "bottom" | "top" | "left" | "right" | "center";
}

const TOUR_STEPS: TourStep[] = [
  // 0. Welcome (no target: centered)
  {
    title: "Welcome to the editor",
    description:
      "This is where you turn your screenshots into a professional video. Let's walk through each section of the editor so you know exactly where everything is.",
    icon: <Compass className="w-6 h-6 text-brand" />,
    targetSelector: null,
    placement: "center",
  },
  // 1. Header bar
  {
    title: "Header Bar",
    description:
      "The top bar shows your project title (click to rename), auto-save status, the Export button, and light/dark mode toggle. Use File, Edit, and View menus for quick actions.",
    icon: <Settings2 className="w-5 h-5 text-teal-400" />,
    targetSelector: "[data-tour='header']",
    placement: "bottom",
  },
  // 2. Toolbar overview
  {
    title: "Toolbar: your annotation tools",
    description:
      "This ribbon contains all the tools you need. Let's go through each one.",
    icon: <Sliders className="w-5 h-5 text-teal-400" />,
    targetSelector: "[data-tour='toolbar']",
    placement: "bottom",
  },
  // 3. Select tool
  {
    title: "Select Tool",
    description:
      "Click to select and move any annotation on the canvas: highlights, text, badges, zoom points and so on. Drag to reposition them.",
    icon: <MousePointer className="w-5 h-5 text-slate-300" />,
    targetSelector: "[data-tour='tool-select']",
    placement: "bottom",
  },
  // 4. Pan tool
  {
    title: "Pan Tool",
    description:
      "Drag to scroll around the canvas when zoomed in. Hold Space to temporarily activate pan mode from any tool.",
    icon: <Move className="w-5 h-5 text-slate-300" />,
    targetSelector: "[data-tour='tool-pan']",
    placement: "bottom",
  },
  // 5. Crop tool
  {
    title: "Crop Tool",
    description:
      "Drag the handles to crop your screenshot. Only the cropped area will appear in the final video.",
    icon: <Crop className="w-5 h-5 text-slate-300" />,
    targetSelector: "[data-tour='tool-crop']",
    placement: "bottom",
  },
  // 6. Highlight tool
  {
    title: "Highlight Tool",
    description:
      "Draw colored rectangles around important parts of your screenshot to draw the viewer's attention. Choose colors from the Properties panel.",
    icon: <Square className="w-5 h-5 text-amber-400" />,
    targetSelector: "[data-tour='tool-highlight']",
    placement: "bottom",
  },
  // 7. Zoom tool
  {
    title: "Zoom Tool",
    description:
      "Click on an area to set a zoom target. During the video, the camera smoothly zooms into that point. Add multiple zoom points for a cinematic pan-and-zoom effect.",
    icon: <Target className="w-5 h-5 text-blue-400" />,
    targetSelector: "[data-tour='tool-zoom']",
    placement: "bottom",
  },
  // 8. Text Overlay
  {
    title: "Text Overlay",
    description:
      "Click on the canvas to place a text label. Great for titles, callouts, and annotations. Edit the text and style in the Properties panel.",
    icon: <Type className="w-5 h-5 text-pink-400" />,
    targetSelector: "[data-tour='tool-overlay']",
    placement: "bottom",
  },
  // 9. Badge
  {
    title: "Badge Tool",
    description:
      "Click to add a numbered step badge. Badges auto-number so viewers can follow along. Perfect for tutorials and step-by-step guides.",
    icon: <BadgeCheck className="w-5 h-5 text-pink-400" />,
    targetSelector: "[data-tour='tool-badge']",
    placement: "bottom",
  },
  // 10. Watermark
  {
    title: "Watermark",
    description:
      "Add a text watermark to protect your content. Choose the position, opacity, and text from the Properties panel.",
    icon: <Stamp className="w-5 h-5 text-pink-400" />,
    targetSelector: "[data-tour='tool-watermark']",
    placement: "bottom",
  },
  // 11. Blur
  {
    title: "Blur Tool",
    description:
      "Draw a rectangle to blur sensitive information: passwords, emails, API keys. The blur is baked into the final video.",
    icon: <Aperture className="w-5 h-5 text-purple-400" />,
    targetSelector: "[data-tour='tool-blur']",
    placement: "bottom",
  },
  // 12. Redact
  {
    title: "Redact Tool",
    description:
      "Draw a rectangle to completely black out an area. Use for PII, confidential data, or anything you want hidden.",
    icon: <Shield className="w-5 h-5 text-red-400" />,
    targetSelector: "[data-tour='tool-redact']",
    placement: "bottom",
  },
  // 13. Pixelate
  {
    title: "Pixelate Tool",
    description:
      "Draw a rectangle to pixelate an area. Less harsh than blur, and good for obscuring faces or secondary details.",
    icon: <Grid3x3 className="w-5 h-5 text-cyan-400" />,
    targetSelector: "[data-tour='tool-pixelate']",
    placement: "bottom",
  },
  // 14. Spotlight
  {
    title: "Spotlight Tool",
    description:
      "Draw a rectangle to create a bright spotlight effect. Everything outside the spotlight is dimmed, focusing the viewer's attention.",
    icon: <Sun className="w-5 h-5 text-yellow-400" />,
    targetSelector: "[data-tour='tool-spotlight']",
    placement: "bottom",
  },
  // 15. Filter
  {
    title: "Filter Tool",
    description:
      "Apply visual filters like grayscale, sepia, brightness, or invert to the entire screenshot. Great for stylistic effects.",
    icon: <Palette className="w-5 h-5 text-green-400" />,
    targetSelector: "[data-tour='tool-filter']",
    placement: "bottom",
  },
  // 16. Canvas
  {
    title: "Canvas",
    description:
      "This is your main workspace. Your screenshot is displayed here. Use the tools to annotate it, or zoom/pan to navigate. The canvas zoom level can be changed from the toolbar dropdown.",
    icon: <Frame className="w-5 h-5 text-teal-400" />,
    targetSelector: "[data-tour='canvas']",
    placement: "top",
  },
  // 17. Timeline
  {
    title: "Timeline",
    description:
      "All your scenes (screenshots) appear here as clips. Drag to reorder, click to select, and use the + button to add more. You can also drag-and-drop files directly onto the timeline.",
    icon: <Film className="w-5 h-5 text-teal-400" />,
    targetSelector: "[data-tour='timeline']",
    placement: "top",
  },
  // 18. Right sidebar tab strip
  {
    title: "Sidebar Panels",
    description:
      "Use these tabs to open different panels: Properties (step settings), Script (voiceover text), Voiceover (AI narration), Transitions, Captions, Intro/Outro, AI Guide, and more.",
    icon: <Settings2 className="w-5 h-5 text-teal-400" />,
    targetSelector: "[data-tour='sidebar-tabs']",
    placement: "left",
  },
  // 19. Export button
  {
    title: "Export Button",
    description:
      "When you're ready, click Export to render your final MP4 video. The render runs in the background. You'll get a notification when it's done, then you can download and share it.",
    icon: <Download className="w-5 h-5 text-brand" />,
    targetSelector: "[data-tour='export-btn']",
    placement: "bottom",
  },
];

const STORAGE_KEY = "aivideo_tour_completed";

/** Window event used to (re)open the tour from anywhere in the app. */
const TOUR_REPLAY_EVENT = "aivideo:start-tour";

/** Reopen the onboarding tour from the beginning, regardless of completion state. */
export function startOnboardingTour() {
  window.dispatchEvent(new CustomEvent(TOUR_REPLAY_EVENT));
}

interface OnboardingTourProps {
  /** When true the tour is deferred: it won't open until this flips to false. */
  deferUntilReady?: boolean;
}

export default function OnboardingTour({
  deferUntilReady = false,
}: OnboardingTourProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const shouldShowRef = useRef(false);
  const hasCheckedRef = useRef(false);

  // Track the highlighted element's bounding rect
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number>(0);

  // Measured tooltip size: needed to keep the card inside the viewport.
  // Seeded with a typical size so the first paint lands close to its final spot.
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [tooltipSize, setTooltipSize] = useState({ w: 360, h: 260 });

  // ─── Eligibility check ─────────────────────────────────────
  // Runs on the user's first visit to the editor, however they got here.
  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    if (localStorage.getItem(STORAGE_KEY)) return;

    shouldShowRef.current = true;
    if (!deferUntilReady) {
      shouldShowRef.current = false;
      setIsOpen(true);
    }
  }, []);

  // When the defer flag drops from true → false, open the tour
  useEffect(() => {
    if (!deferUntilReady && shouldShowRef.current) {
      shouldShowRef.current = false;
      setIsOpen(true);
    }
  }, [deferUntilReady]);

  // ─── Manual replay (Help → Replay Tour, header button) ─────
  useEffect(() => {
    const onReplay = () => {
      shouldShowRef.current = false;
      setCurrentStep(0);
      setIsOpen(true);
    };
    window.addEventListener(TOUR_REPLAY_EVENT, onReplay);
    return () => window.removeEventListener(TOUR_REPLAY_EVENT, onReplay);
  }, []);

  // ─── Track target element position ─────────────────────────
  const updateTargetRect = useCallback(() => {
    if (!isOpen) return;
    const step = TOUR_STEPS[currentStep];
    if (!step.targetSelector) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(step.targetSelector);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep]);

  useEffect(() => {
    updateTargetRect();
    // Re-measure on scroll / resize
    const onUpdate = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateTargetRect);
    };
    window.addEventListener("resize", onUpdate);
    window.addEventListener("scroll", onUpdate, true);
    // Re-measure periodically for layout shifts
    const interval = setInterval(updateTargetRect, 300);
    return () => {
      window.removeEventListener("resize", onUpdate);
      window.removeEventListener("scroll", onUpdate, true);
      clearInterval(interval);
      cancelAnimationFrame(rafRef.current);
    };
  }, [updateTargetRect]);

  // ─── Track the tooltip's own size ──────────────────────────
  // offsetWidth/Height are layout sizes, so the enter animation's scale
  // transform doesn't skew the measurement.
  useLayoutEffect(() => {
    const el = tooltipRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      setTooltipSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen, currentStep]);

  // ─── Handlers ──────────────────────────────────────────────
  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_STEPS.length - 1;
  const hasTarget = !!step.targetSelector && !!targetRect;

  // ─── Calculate tooltip position ────────────────────────────
  const PAD = 12; // padding around the highlighted element
  const TOOLTIP_OFFSET = 16; // gap between highlight and tooltip
  const MARGIN = 16; // minimum breathing room against the viewport edge

  const getTooltipStyle = (): React.CSSProperties => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const { w: tw, h: th } = tooltipSize;
    const clamp = (v: number, lo: number, hi: number) =>
      Math.max(lo, Math.min(v, hi));

    // Numeric centering rather than translate(-50%,-50%): framer-motion drives
    // `transform` for the enter animation and would clobber an inline one.
    const centered: React.CSSProperties = {
      position: "fixed",
      top: Math.max(MARGIN, (vh - th) / 2),
      left: Math.max(MARGIN, (vw - tw) / 2),
    };

    if (!hasTarget || !targetRect) return centered;

    const gap = PAD + TOOLTIP_OFFSET;
    const fits = {
      bottom: vh - targetRect.bottom - gap >= th + MARGIN,
      top: targetRect.top - gap >= th + MARGIN,
      right: vw - targetRect.right - gap >= tw + MARGIN,
      left: targetRect.left - gap >= tw + MARGIN,
    };

    // Prefer the authored side, then any side with room. Targets that fill the
    // viewport (the canvas) leave no room anywhere: center over them instead.
    const order: (keyof typeof fits)[] =
      step.placement === "center"
        ? []
        : [step.placement, "bottom", "top", "right", "left"];
    const side = order.find((s) => fits[s]);

    if (!side) return centered;

    let top: number;
    let left: number;

    switch (side) {
      case "bottom":
        top = targetRect.bottom + gap;
        left = targetRect.left + targetRect.width / 2 - tw / 2;
        break;
      case "top":
        top = targetRect.top - gap - th;
        left = targetRect.left + targetRect.width / 2 - tw / 2;
        break;
      case "right":
        top = targetRect.top + targetRect.height / 2 - th / 2;
        left = targetRect.right + gap;
        break;
      case "left":
        top = targetRect.top + targetRect.height / 2 - th / 2;
        left = targetRect.left - gap - tw;
        break;
    }

    return {
      position: "fixed",
      top: clamp(top, MARGIN, vh - th - MARGIN),
      left: clamp(left, MARGIN, vw - tw - MARGIN),
    };
  };

  // SVG overlay with a cutout for the highlighted element
  const renderOverlay = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (!hasTarget || !targetRect) {
      // Simple dark overlay, no cutout
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-[2px]"
          onClick={handleClose}
        />
      );
    }

    // Cutout rectangle with padding
    const cx = Math.max(0, targetRect.left - PAD);
    const cy = Math.max(0, targetRect.top - PAD);
    const cw = targetRect.width + PAD * 2;
    const ch = targetRect.height + PAD * 2;
    const cr = 8; // border-radius for cutout

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100]"
        onClick={handleClose}
      >
        <svg
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          className="absolute inset-0"
          style={{ pointerEvents: "auto" }}
        >
          <defs>
            <mask id="tour-spotlight-mask">
              <rect x="0" y="0" width={w} height={h} fill="white" />
              <rect
                x={cx}
                y={cy}
                width={cw}
                height={ch}
                rx={cr}
                ry={cr}
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width={w}
            height={h}
            fill="rgba(0,0,0,0.65)"
            mask="url(#tour-spotlight-mask)"
          />
        </svg>
        {/* Glowing border around cutout */}
        <div
          className="absolute pointer-events-none border-2 border-brand/70 rounded-lg shadow-[0_0_20px_rgb(var(--brand-rgb)/0.3)]"
          style={{
            left: cx,
            top: cy,
            width: cw,
            height: ch,
          }}
        />
      </motion.div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay with spotlight cutout */}
          {renderOverlay()}

          {/* Tooltip card */}
          <motion.div
            key={currentStep}
            ref={tooltipRef}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="z-[101] w-[360px] max-w-[calc(100vw-32px)]"
            style={getTooltipStyle()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sketch-card p-5 bg-[var(--sketch-surface)] border-2 border-[var(--sketch-border-color)] shadow-2xl rounded-xl">
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-lg hover:bg-[var(--sketch-fg-subtle)]/20 transition-colors"
                title="Skip tour"
              >
                <X className="w-4 h-4 text-[var(--sketch-fg-muted)]" />
              </button>

              {/* Step icon + title */}
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-[var(--sketch-card-bg)] border border-[var(--sketch-border-color)] flex items-center justify-center flex-shrink-0">
                  {step.icon}
                </div>
                <h3 className="font-body font-bold text-base text-[var(--sketch-fg)] leading-tight pr-6">
                  {step.title}
                </h3>
              </div>

              {/* Description */}
              <p className="font-body text-sm text-[var(--sketch-fg-muted)] leading-relaxed mb-4 pl-[52px]">
                {step.description}
              </p>

              {/* Progress dots */}
              <div className="flex items-center gap-1 mb-3 pl-[52px]">
                {TOUR_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentStep
                        ? "w-5 bg-brand"
                        : i < currentStep
                          ? "w-1.5 bg-brand/40"
                          : "w-1.5 bg-[var(--sketch-fg-subtle)]/30"
                    }`}
                  />
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between pl-[52px]">
                <span className="text-[10px] font-mono text-[var(--sketch-fg-subtle)]">
                  {currentStep + 1} / {TOUR_STEPS.length}
                </span>
                <div className="flex gap-2">
                  {currentStep > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePrev}
                      className="sketch-btn-ghost h-8 text-xs"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Back
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleNext}
                    className="sketch-btn-primary h-8 text-xs"
                  >
                    {isLast ? "Start Creating" : "Next"}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Skip link */}
              {!isLast && (
                <button
                  onClick={handleClose}
                  className="w-full text-center text-[10px] text-[var(--sketch-fg-subtle)] hover:text-[var(--sketch-fg)] mt-2 transition-colors"
                >
                  Skip tour
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}