import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useWizardStore, stepOrder, stepIndex, stepLabels, type WizardStep } from "@/hooks/useWizardStore";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/providers/trpc";
import { useTheme } from "next-themes";
import {
  Loader2,
  ArrowLeft,
  Sun,
  Moon,
  ChevronLeft,
} from "lucide-react";
import StepPreview from "@/components/wizard/StepPreview";
import StepRender from "@/components/wizard/StepRender";
import StepExport from "@/components/wizard/StepExport";
import AIGuide from "@/components/wizard/AIGuide";
import { SpaceBackground } from "@/components/shared/SpaceBackground";



export default function Wizard() {
  const { setTheme, resolvedTheme } = useTheme();
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

  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

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
    preview: <StepPreview />,
    render: <StepRender />,
    export: <StepExport />,
  };

  if (currentStep === "preview") {
    return (
      <div className="w-screen h-screen overflow-hidden bg-[var(--sketch-bg)] text-[var(--sketch-fg)] flex flex-col font-body">
        {stepComponents.preview}
      </div>
    );
  }

  return (
    <div className="theme-3d-immersive min-h-screen lg:h-screen relative overflow-x-hidden lg:overflow-hidden font-sans flex flex-col pb-2">
      <SpaceBackground />
      
      {/* Header */}
      <header className="w-full px-2 lg:px-3 pt-2 flex-shrink-0 z-20">
        <div className="w-full rounded-xl bg-[var(--space-card)]/85 backdrop-blur-lg border border-[var(--space-border)] shadow-[0_10px_35px_rgba(0,0,0,0.06)] px-2 sm:px-4 py-1.5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-[var(--space-text-muted)] hover:text-[var(--space-text)] transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-medium">Dashboard</span>
            </button>
            {project && (
              <div className="flex flex-col items-center justify-center min-w-0">
                <span className="text-sm font-semibold text-[var(--space-text)] leading-tight truncate max-w-[120px] sm:max-w-none">
                  {project.title}
                </span>
                {/* Horizontal Stepper */}
                <div className="flex items-center gap-1.5 mt-0.5">
                  {stepOrder.map((s, i) => {
                    const isCompleted = i < currentStepIdx;
                    const isActive = i === currentStepIdx;
                    const label = stepLabels[s];
                    return (
                      <div key={s} className="flex items-center gap-1">
                        <button
                          disabled={!isCompleted}
                          onClick={() => goToStep(s)}
                          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7.5px] font-bold border transition-all ${
                            isCompleted
                              ? "bg-teal-500 border-teal-500 text-white shadow-[0_0_4px_rgba(20,184,166,0.3)]"
                              : isActive
                                ? "border-teal-400 bg-teal-500/20 text-teal-300 border-2"
                                : "border-[var(--space-border)] bg-[var(--space-card)] text-[var(--space-text-subtle)]"
                          } ${isCompleted ? "cursor-pointer hover:opacity-80" : ""}`}
                        >
                          {isCompleted ? "✓" : i + 1}
                        </button>
                        <span className={`hidden sm:inline text-[8.5px] font-mono tracking-tight ${isActive ? "text-teal-300 font-semibold" : isCompleted ? "text-[var(--space-text-muted)]" : "text-[var(--space-text-muted)]/50"}`}>
                          {label}
                        </span>
                        {i < stepOrder.length - 1 && (
                          <span className="hidden sm:inline text-[8.5px] text-[var(--space-border)]/40 mx-0.5">/</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline font-mono text-xs text-[var(--space-text-muted)] bg-teal-500/10 px-2.5 py-1 rounded-md border border-[var(--space-border)]">
                Step {currentStepIdx + 1} of {stepOrder.length}
              </span>
              <button
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="p-2 rounded-xl bg-[var(--space-card)] border border-[var(--space-border)] hover:bg-[var(--space-card-hover)] hover:border-teal-500/50 transition-colors focus:outline-none cursor-pointer"
                aria-label="Toggle dark mode"
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="w-4 h-4 text-teal-400" />
                ) : (
                  <Moon className="w-4 h-4 text-[var(--space-text-muted)]" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>
 
      <div className="relative z-10 flex-1 flex flex-row items-stretch justify-center h-full w-full px-2 lg:px-3 lg:overflow-hidden gap-2 mt-2">
        {/* Centered Main Content Wrapper */}
        <div className="flex flex-col lg:overflow-hidden h-full flex-grow w-full">


          {/* Content Pane Layout */}
          <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden w-full mt-2 gap-4 pb-2">


            <main className="flex-1 glass-panel rounded-2xl border border-[var(--space-border)] p-6 lg:overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className=""
                >
                  {stepComponents[currentStep]}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </div> {/* Closes Centered Main Content Wrapper */}
      </div> {/* Closes relative z-10 flex-1 flex flex-row ... */}

      {/* Floating AI Guide Drawer (Slides out from right) */}
      <AnimatePresence>
        {isGuideOpen ? (
          <motion.div
            initial={{ x: "110%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "110%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed right-4 top-[92px] bottom-6 z-50 w-80 max-w-[calc(100vw-32px)] glass-panel rounded-3xl border border-[var(--space-border)] bg-[var(--space-card)]/95 backdrop-blur-xl shadow-[0_15px_50px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden"
          >
            <AIGuide onCollapse={() => setIsGuideOpen(false)} />
          </motion.div>
        ) : (
          <motion.button
            initial={{ x: "100%", opacity: 0, y: "-50%" }}
            animate={{ x: 0, opacity: 1, y: "-50%" }}
            exit={{ x: "100%", opacity: 0, y: "-50%" }}
            onClick={() => setIsGuideOpen(true)}
            className="fixed right-0 top-1/2 z-40 bg-[var(--space-card)]/95 backdrop-blur-md border border-r-0 border-teal-500/40 w-7 h-28 rounded-l-xl shadow-[0_0_15px_rgba(20,184,166,0.35)] flex flex-col items-center justify-center hover:bg-teal-500/10 hover:border-teal-400 hover:shadow-[0_0_20px_rgba(45,212,191,0.5)] transition-all duration-300 group cursor-pointer"
          >
            <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full border border-teal-500 bg-teal-500 shadow-[0_0_12px_rgba(45,212,191,0.6)]">
              <ChevronLeft className="w-3.5 h-3.5 text-white group-hover:-translate-x-0.5 transition-transform" />
            </div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--space-text-muted)] group-hover:text-teal-300 font-bold select-none whitespace-nowrap rotate-90 pl-1.5">
              AI Guide
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
