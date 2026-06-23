import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useWizardStore, stepOrder, stepIndex, stepLabels, type WizardStep } from "@/hooks/useWizardStore";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/providers/trpc";
import {
  CheckCircle,
  Circle,
  Loader2,
  ChevronLeft,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import StepSetup from "@/components/wizard/StepSetup";
import StepUpload from "@/components/wizard/StepUpload";
import StepScript from "@/components/wizard/StepScript";
import StepPreview from "@/components/wizard/StepPreview";
import StepVoice from "@/components/wizard/StepVoice";
import StepRender from "@/components/wizard/StepRender";
import StepExport from "@/components/wizard/StepExport";
import AIGuide from "@/components/wizard/AIGuide";
import { Button } from "@/components/ui/button";
import { SpaceBackground } from "@/components/shared/SpaceBackground";

const stepSections: Record<string, Array<{ id: string; label: string }>> = {
  setup: [
    { id: "setup-title", label: "Video Title" },
    { id: "setup-description", label: "Topic Description" },
    { id: "setup-platform", label: "Target Platform" },
    { id: "setup-aspect", label: "Aspect Ratio" },
  ],
  upload: [
    { id: "upload-list", label: "Uploaded Steps" },
    { id: "upload-add", label: "Add Step Options" },
  ],
  script: [
    { id: "script-timeline", label: "Script Timeline" },
  ],
  preview: [
    { id: "preview-editor", label: "Canvas Editor" },
    { id: "preview-transitions", label: "Slide Transitions" },
    { id: "preview-captions", label: "Captions Styles" },
  ],
  voice: [
    { id: "voice-standard", label: "Standard Voices" },
    { id: "voice-elevenlabs", label: "ElevenLabs Premium" },
    { id: "voice-speed", label: "Speaking Speed" },
    { id: "voice-resolution", label: "Video Resolution" },
    { id: "voice-music", label: "Background Music" },
    { id: "voice-randomize", label: "Randomization" },
  ],
  render: [
    { id: "render-progress", label: "Rendering Progress" },
  ],
  export: [
    { id: "export-player", label: "Video Preview" },
    { id: "export-breakdown", label: "Step Breakdown" },
  ],
};

export default function Wizard() {
  const { projectId: pid, step } = useParams<{
    projectId: string;
    step: string;
  }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const {
    currentStep,
    setCurrentStep,
    setProjectId,
  } = useWizardStore();

  const projectIdNum = Number(pid) || 0;
  const currentStepIdx = stepIndex(currentStep);

  const [activeSection, setActiveSection] = useState<string>("");
  const isScrollingRef = useRef(false);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<any>(null);
  const scrollEndTimerRef = useRef<any>(null);

  useEffect(() => {
    const sections = stepSections[currentStep] || [];
    if (sections.length === 0) {
      setActiveSection("");
      return;
    }

    setActiveSection(sections[0].id);

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingRef.current) return;
        
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { 
        root: mainScrollRef.current,
        rootMargin: "-10% 0px -50% 0px",
        threshold: 0.1 
      }
    );

    const timer = setTimeout(() => {
      sections.forEach((s) => {
        const el = document.getElementById(s.id);
        if (el) observer.observe(el);
      });
    }, 300);

    // Scroll listener for bottom-out detection and scroll end detection
    const handleScroll = () => {
      // If programmatically scrolling, extend the scroll lock
      if (isScrollingRef.current) {
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        clearTimeout(scrollEndTimerRef.current);
        scrollEndTimerRef.current = setTimeout(() => {
          isScrollingRef.current = false;
          // Clear active ring highlights
          sections.forEach((s) => {
            const el = document.getElementById(s.id);
            if (el) {
              el.classList.remove("ring-2", "ring-teal-500/50", "ring-offset-1");
            }
          });
        }, 200);
        return;
      }

      const main = mainScrollRef.current;
      if (!main) return;

      const isAtBottom = main.scrollTop + main.clientHeight >= main.scrollHeight - 30;
      if (isAtBottom && sections.length > 0) {
        setActiveSection(sections[sections.length - 1].id);
      }
    };

    const mainEl = mainScrollRef.current;
    if (mainEl) {
      mainEl.addEventListener("scroll", handleScroll);
    }

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      if (mainEl) {
        mainEl.removeEventListener("scroll", handleScroll);
      }
    };
  }, [currentStep]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      // Clear any pending scroll end/fallback timers
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);

      isScrollingRef.current = true;
      setActiveSection(id);
      
      // Scroll to start (top alignment) of the container
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      
      // Remove ring from all others first
      const sections = stepSections[currentStep] || [];
      sections.forEach((s) => {
        const el = document.getElementById(s.id);
        if (el) {
          el.classList.remove("ring-2", "ring-teal-500/50", "ring-offset-1");
        }
      });

      element.classList.add("ring-2", "ring-teal-500/50", "ring-offset-1");
      
      // Fallback timer if scroll is extremely fast or doesn't trigger scroll events (e.g. already in position)
      scrollTimeoutRef.current = setTimeout(() => {
        element.classList.remove("ring-2", "ring-teal-500/50", "ring-offset-1");
        isScrollingRef.current = false;
      }, 1000);
    }
  };

  const { data: project } = trpc.project.getById.useQuery(
    { id: projectIdNum },
    { enabled: projectIdNum > 0 && !!user }
  );

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (
      step &&
      stepOrder.includes(step as WizardStep)
    ) {
      setCurrentStep(step as WizardStep);
    }
  }, [step, setCurrentStep]);

  useEffect(() => {
    if (projectIdNum > 0) {
      setProjectId(projectIdNum);
    }
  }, [projectIdNum, setProjectId]);

  const goToStep = (step: typeof stepOrder[number]) => {
    navigate(`/create/${projectIdNum}/${step}`);
  };

  const canGoBack = currentStepIdx > 0;

  if (authLoading) {
    return (
      <div className="theme-3d-immersive min-h-screen relative overflow-x-hidden font-sans flex items-center justify-center">
        <SpaceBackground />
        <div className="relative z-10">
          <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const stepComponents: Record<string, React.ReactNode> = {
    setup: <StepSetup />,
    upload: <StepUpload />,
    script: <StepScript />,
    preview: <StepPreview />,
    voice: <StepVoice />,
    render: <StepRender />,
    export: <StepExport />,
  };

  return (
    <div className="theme-3d-immersive min-h-screen lg:h-screen relative overflow-x-hidden lg:overflow-hidden font-sans flex flex-col items-center pb-4">
      <SpaceBackground />
      
      {/* Header */}
      <header className="w-full px-6 pt-4 flex-shrink-0 z-20">
        <div className="w-full rounded-full bg-[var(--space-card)]/85 backdrop-blur-lg border border-[var(--space-border)] shadow-[0_10px_35px_rgba(0,0,0,0.06)] px-6 py-1">
          <div className="flex items-center justify-between h-14">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-[var(--space-text-muted)] hover:text-[var(--space-text)] transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-medium">Dashboard</span>
            </button>
            {project && (
              <span className="text-lg font-semibold text-[var(--space-text)] truncate max-w-xs hidden sm:block">
                {project.title}
              </span>
            )}
            <span className="font-mono text-xs text-[var(--space-text-muted)] bg-teal-500/10 px-2.5 py-1 rounded-md border border-[var(--space-border)]">
              Step {currentStepIdx + 1} of {stepOrder.length}
            </span>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex-1 flex flex-row items-stretch justify-center h-full w-full px-6 lg:overflow-hidden gap-4 mt-2">
        {/* Floating Table of Contents in Left Blank Space - Desktop XL only */}
        <div className="hidden xl:flex flex-col justify-center py-2 flex-shrink-0 z-20">
          <div className="rounded-3xl bg-[var(--space-card)]/85 backdrop-blur-lg border border-[var(--space-border)] py-6 px-4 flex flex-col shadow-[0_10px_35px_rgba(0,0,0,0.06)] relative h-[calc(100vh-160px)] min-h-[500px] max-h-[720px] w-52 z-0">
            <div className="flex items-center gap-2 mb-4 border-b border-[var(--space-border)]/50 pb-3">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span className="font-mono text-xs uppercase tracking-widest text-[var(--space-text)] font-semibold">
                On This Step
              </span>
            </div>
            {stepSections[currentStep] && stepSections[currentStep].length > 0 ? (
              <div className="flex flex-col gap-2 relative z-10 overflow-y-auto pr-1">
                {stepSections[currentStep].map((sec) => {
                  const isActive = activeSection === sec.id;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => scrollToSection(sec.id)}
                      className={`flex items-center gap-3 text-left group transition-all duration-300 py-1.5 px-2.5 rounded-xl border w-full ${
                        isActive
                          ? "bg-teal-500/10 border-teal-500/30 text-teal-300 font-bold shadow-sm"
                          : "border-transparent text-[var(--space-text-muted)] hover:text-[var(--space-text)] hover:bg-[var(--space-border)]/5"
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full transition-all duration-300 flex-shrink-0 ${
                          isActive
                            ? "bg-teal-400 scale-125 shadow-[0_0_8px_#2dd4bf]"
                            : "bg-[var(--space-border)] group-hover:bg-[var(--space-text-subtle)]"
                        }`}
                      />
                      <span className="font-mono text-[11px] uppercase tracking-wider select-none truncate">
                        {sec.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60 px-2">
                <Sparkles className="w-6 h-6 text-[var(--space-text-subtle)] mb-2" />
                <span className="font-mono text-[10px] text-[var(--space-text-subtle)] uppercase tracking-wider">
                  No sub-sections
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Centered Main Content Wrapper */}
        <div className="flex flex-col lg:overflow-hidden h-full flex-grow w-full">
          {/* Stepper (Mobile only) */}
          <div className="w-full px-4 mt-3 lg:hidden flex-shrink-0">
            <div className="max-w-6xl mx-auto rounded-2xl bg-[var(--space-card)]/20 backdrop-blur-md border border-[var(--space-border)] py-4 px-6">
              <div className="flex items-center justify-between max-w-4xl mx-auto relative z-0">
                {/* Connecting line */}
                <div className="absolute top-[18px] left-0 right-0 h-0.5 bg-[var(--space-border)]/50 mx-4 z-0">
                  <motion.div
                    className="h-full bg-teal-500 shadow-[0_0_8px_rgba(45,212,191,0.4)] rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: `${(currentStepIdx / (stepOrder.length - 1)) * 100}%` }}
                    transition={{ type: "spring", stiffness: 80, damping: 15 }}
                  />
                </div>
                {stepOrder.map((s, i) => {
                  const isCompleted = i < currentStepIdx;
                  const isActive = i === currentStepIdx;

                  return (
                    <div
                      key={s}
                      className="flex flex-col items-center gap-2 cursor-pointer group relative z-10"
                      onClick={() => {
                        if (isCompleted) goToStep(s);
                      }}
                    >
                      <div
                        className={`w-9 h-9 flex items-center justify-center border transition-all duration-500 rounded-full ${
                          isCompleted
                            ? "bg-teal-500 border-teal-500 text-white shadow-[0_0_8px_rgba(20,184,166,0.4)]"
                            : isActive
                              ? "border-teal-400 bg-teal-500/20 text-teal-300 shadow-[0_0_10px_rgba(45,212,191,0.3)] border-2"
                              : "border-[var(--space-border)] bg-[var(--space-card)] text-[var(--space-text-subtle)]"
                        } ${isCompleted ? "cursor-pointer hover:opacity-80" : ""}`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : isActive ? (
                          <motion.div
                            className="w-2.5 h-2.5 bg-teal-400 rounded-full shadow-[0_0_6px_#2dd4bf]"
                            animate={{ scale: [0.9, 1.1, 0.9] }}
                            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                          />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </div>
                      <span
                        className={`font-mono text-[10px] uppercase tracking-wider hidden sm:block transition-all duration-500 ${
                          isActive
                            ? "text-white font-bold drop-shadow-[0_0_4px_rgba(45,212,191,0.4)]"
                            : isCompleted
                              ? "text-teal-300 drop-shadow-[0_0_4px_rgba(20,184,166,0.3)]"
                              : "text-[var(--space-text-subtle)]"
                        }`}
                      >
                        {stepLabels[s]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Content Pane Layout */}
          <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden w-full mt-2 gap-4 pb-2">
            <main ref={mainScrollRef} className="flex-1 lg:overflow-y-auto p-6 glass-panel rounded-2xl border border-[var(--space-border)]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {stepComponents[currentStep] || <StepSetup />}
                </motion.div>
              </AnimatePresence>
            </main>

            <aside className="w-full lg:w-80 flex flex-col gap-4 flex-shrink-0 lg:overflow-hidden lg:h-full">
              {/* Stepper container (Desktop, below XL only) */}
              <div className="hidden lg:block xl:hidden glass-panel rounded-2xl border border-[var(--space-border)] bg-[var(--space-card)]/15 backdrop-blur-sm p-5 flex-shrink-0">
                <div className="flex flex-col gap-4 relative z-0">
                  {/* Connecting line container */}
                  <div className="absolute left-[18px] top-[18px] bottom-[18px] w-0.5 z-0">
                    {/* Background track */}
                    <div className="absolute inset-0 bg-[var(--space-border)]/50 rounded-full" />
                    {/* Glowing active path */}
                    <motion.div 
                      className="absolute top-0 left-0 right-0 bg-teal-500 shadow-[0_0_8px_rgba(45,212,191,0.4)] rounded-full"
                      initial={{ height: "0%" }}
                      animate={{ height: `${(currentStepIdx / (stepOrder.length - 1)) * 100}%` }}
                      transition={{ type: "spring", stiffness: 80, damping: 15 }}
                    />
                  </div>
                  {stepOrder.map((s, i) => {
                    const isCompleted = i < currentStepIdx;
                    const isActive = i === currentStepIdx;

                    return (
                      <div
                        key={s}
                        className="flex items-center gap-3 cursor-pointer group relative z-10"
                        onClick={() => {
                          if (isCompleted) goToStep(s);
                        }}
                      >
                        <div
                          className={`w-9 h-9 flex items-center justify-center border transition-all duration-500 rounded-full flex-shrink-0 ${
                            isCompleted
                              ? "bg-teal-500 border-teal-500 text-white shadow-[0_0_8px_rgba(20,184,166,0.4)]"
                              : isActive
                                ? "border-teal-400 bg-teal-500/20 text-teal-300 shadow-[0_0_10px_rgba(45,212,191,0.3)] border-2"
                                : "border-[var(--space-border)] bg-[var(--space-card)] text-[var(--space-text-subtle)]"
                          } ${isCompleted ? "cursor-pointer hover:opacity-80" : ""}`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : isActive ? (
                            <motion.div
                              className="w-2.5 h-2.5 bg-teal-400 rounded-full shadow-[0_0_6px_#2dd4bf]"
                              animate={{ scale: [0.9, 1.1, 0.9] }}
                              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                            />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </div>
                        <span
                          className={`font-mono text-xs uppercase tracking-wider transition-all duration-500 ${
                            isActive
                              ? "text-white font-bold drop-shadow-[0_0_4px_rgba(45,212,191,0.4)]"
                              : isCompleted
                                ? "text-teal-300 drop-shadow-[0_0_4px_rgba(20,184,166,0.3)]"
                                : "text-[var(--space-text-subtle)]"
                          }`}
                        >
                          {stepLabels[s]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Guide container */}
              <div className="flex-1 glass-panel rounded-2xl border border-[var(--space-border)] bg-[var(--space-card)]/10 backdrop-blur-sm flex flex-col overflow-hidden">
                <AIGuide />
              </div>
            </aside>
          </div>
        </div> {/* Closes Centered Main Content Wrapper */}

        {/* Floating Stepper in Right Blank Space - Desktop XL only */}
        <div className="hidden xl:flex flex-col justify-center py-2 flex-shrink-0 z-20">
          <div className="rounded-full bg-[var(--space-card)]/85 backdrop-blur-lg border border-[var(--space-border)] py-10 px-2 flex flex-col items-center justify-between shadow-[0_10px_35px_rgba(0,0,0,0.06)] relative h-[calc(100vh-160px)] min-h-[500px] max-h-[720px] w-18 z-0">
            {/* Connecting line container */}
            <div className="absolute top-[58px] bottom-[58px] w-0.5 left-1/2 -translate-x-1/2 z-0">
              {/* Background track */}
              <div className="absolute inset-0 bg-[var(--space-border)]/50 rounded-full" />
              {/* Glowing active path */}
              <motion.div 
                className="absolute top-0 left-0 right-0 bg-teal-500 shadow-[0_0_8px_rgba(45,212,191,0.4)] rounded-full"
                initial={{ height: "0%" }}
                animate={{ height: `${(currentStepIdx / (stepOrder.length - 1)) * 100}%` }}
                transition={{ type: "spring", stiffness: 80, damping: 15 }}
              />
            </div>
            {stepOrder.map((s, i) => {
              const isCompleted = i < currentStepIdx;
              const isActive = i === currentStepIdx;

              return (
                <div
                  key={s}
                  className="relative flex flex-col items-center justify-center w-9 h-9 cursor-pointer group z-10"
                  onClick={() => {
                    if (isCompleted) goToStep(s);
                  }}
                >
                  <div
                    className={`w-9 h-9 flex items-center justify-center border transition-all duration-500 rounded-full flex-shrink-0 ${
                      isCompleted
                        ? "bg-teal-500 border-teal-500 text-white shadow-[0_0_8px_rgba(20,184,166,0.4)]"
                        : isActive
                          ? "border-teal-400 bg-teal-500/20 text-teal-300 shadow-[0_0_10px_rgba(45,212,191,0.3)] border-2"
                          : "border-[var(--space-border)] bg-[var(--space-card)] text-[var(--space-text-subtle)]"
                    } ${isCompleted ? "cursor-pointer hover:opacity-80" : ""}`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : isActive ? (
                      <motion.div
                        className="w-2.5 h-2.5 bg-teal-400 rounded-full shadow-[0_0_6px_#2dd4bf]"
                        animate={{ scale: [0.9, 1.1, 0.9] }}
                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                      />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </div>
                  <span
                    className={`absolute top-11 left-1/2 -translate-x-1/2 font-mono text-[9px] uppercase tracking-wider text-center select-none whitespace-nowrap transition-all duration-500 bg-white dark:bg-[#051f1c] px-1.5 py-0.5 rounded border border-[var(--space-border)]/30 shadow-sm ${
                      isActive
                        ? "text-white font-bold drop-shadow-[0_0_4px_rgba(45,212,191,0.4)]"
                        : isCompleted
                          ? "text-teal-300 drop-shadow-[0_0_4px_rgba(20,184,166,0.3)]"
                          : "text-[var(--space-text-subtle)]"
                    }`}
                  >
                    {stepLabels[s]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div> {/* Closes relative z-10 flex-1 flex flex-row ... */}
    </div>
  );
}
