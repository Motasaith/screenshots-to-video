import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  highlightSelector?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to the Editor! 👋",
    description: "This is where you turn your screenshots into a professional video. Let's take a quick tour of the key features.",
    icon: <Sparkles className="w-6 h-6 text-[#FBBF24]" />,
  },
  {
    title: "Upload Screenshots",
    description: "Drag and drop screenshot files here, or use the upload button. You can also drag a whole folder of screenshots — they'll be sorted automatically.",
    icon: <ChevronRight className="w-6 h-6 text-teal-500" />,
  },
  {
    title: "AI Script Generation",
    description: "Click the AI button on any step to automatically generate a voiceover script from your screenshot. You can edit the script before rendering.",
    icon: <Sparkles className="w-6 h-6 text-purple-500" />,
  },
  {
    title: "Zoom Tool",
    description: "Use the Zoom tool (Z) to click on important areas of your screenshot. The camera will smoothly zoom into that point during the video. Add multiple zoom points for a panning effect.",
    icon: <ChevronRight className="w-6 h-6 text-blue-500" />,
  },
  {
    title: "Highlight & Annotate",
    description: "Use the Highlight tool (H) to draw colored boxes around UI elements. Use Blur (U), Redact (R), or Pixelate (P) to hide sensitive information like passwords or API keys.",
    icon: <ChevronRight className="w-6 h-6 text-amber-500" />,
  },
  {
    title: "Text & Badges",
    description: "Add text overlays (T) for labels and callouts. Use Badges (B) to add numbered step indicators. Add a Watermark (W) to protect your content.",
    icon: <ChevronRight className="w-6 h-6 text-pink-500" />,
  },
  {
    title: "Voice & Narration",
    description: "Click the microphone icon to generate AI voiceover for each step. Choose from multiple voices and adjust the speaking speed.",
    icon: <ChevronRight className="w-6 h-6 text-green-500" />,
  },
  {
    title: "Render & Export",
    description: "When you're happy with your edits, click 'Render Video' to generate the final MP4. The render happens in the background — you'll get a notification when it's ready. Then you can download and share it!",
    icon: <ChevronRight className="w-6 h-6 text-teal-500" />,
  },
];

const STORAGE_KEY = "aivideo_tour_completed";

export default function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    // Check if this is a first-time user (imported=true query param or no tour completed)
    const urlParams = new URLSearchParams(window.location.search);
    const isImported = urlParams.get("imported") === "true";
    const tourCompleted = localStorage.getItem(STORAGE_KEY);

    if (isImported && !tourCompleted) {
      setIsOpen(true);
    }
  }, []);

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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Tour card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-[90%] max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sketch-card p-6 bg-[var(--sketch-card-bg)] border-2 border-[var(--sketch-border-color)] shadow-2xl">
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-[var(--sketch-fg-subtle)]/20 transition-colors"
                title="Skip tour"
              >
                <X className="w-4 h-4 text-[var(--sketch-fg-muted)]" />
              </button>

              {/* Step icon */}
              <div className="w-14 h-14 rounded-2xl bg-[var(--sketch-card-bg)] border-2 border-[var(--sketch-border-color)] flex items-center justify-center mb-4">
                {step.icon}
              </div>

              {/* Step content */}
              <h3 className="font-body font-bold text-xl mb-2 text-[var(--sketch-fg)]">
                {step.title}
              </h3>
              <p className="font-body text-sm text-[var(--sketch-fg-muted)] leading-relaxed mb-6">
                {step.description}
              </p>

              {/* Progress dots */}
              <div className="flex items-center gap-1.5 mb-4">
                {TOUR_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentStep
                        ? "w-6 bg-[#FBBF24]"
                        : i < currentStep
                        ? "w-1.5 bg-[#FBBF24]/40"
                        : "w-1.5 bg-[var(--sketch-fg-subtle)]/30"
                    }`}
                  />
                ))}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[var(--sketch-fg-subtle)]">
                  {currentStep + 1} / {TOUR_STEPS.length}
                </span>
                <div className="flex gap-2">
                  {currentStep > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePrev}
                      className="sketch-btn-ghost"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleNext}
                    className="sketch-btn-primary"
                  >
                    {isLast ? "Start Creating" : "Next"}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Skip link */}
              {!isLast && (
                <button
                  onClick={handleClose}
                  className="w-full text-center text-xs text-[var(--sketch-fg-subtle)] hover:text-[var(--sketch-fg)] mt-3 transition-colors"
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