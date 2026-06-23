import { useEffect } from "react";
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
    <div className="theme-3d-immersive min-h-screen lg:h-screen relative overflow-x-hidden lg:overflow-hidden font-sans flex flex-col items-center">
      <SpaceBackground />
      <div className="relative z-10 flex-1 flex flex-row items-stretch justify-center h-full w-full lg:overflow-hidden">
        {/* Centered Main Content Wrapper */}
        <div className="flex flex-col lg:overflow-hidden h-full w-full max-w-6xl">
        {/* Header */}
        <header className="w-full px-4 pt-4 flex-shrink-0">
          <div className="max-w-6xl mx-auto rounded-full bg-[var(--space-card)]/85 backdrop-blur-lg border border-[var(--space-border)] shadow-[0_10px_35px_rgba(0,0,0,0.06)] px-6 py-1">
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

        {/* Stepper (Mobile only) */}
        <div className="w-full px-4 mt-3 lg:hidden flex-shrink-0">
          <div className="max-w-6xl mx-auto rounded-2xl bg-[var(--space-card)]/20 backdrop-blur-md border border-[var(--space-border)] py-4 px-6">
            <div className="flex items-center justify-between max-w-4xl mx-auto relative">
              {/* Connecting line */}
              <div className="absolute top-4 left-0 right-0 h-0.5 bg-[var(--space-border)] -z-10 mx-4" />
              {stepOrder.map((s, i) => {
                const isCompleted = i < currentStepIdx;
                const isActive = i === currentStepIdx;

                return (
                  <div
                    key={s}
                    className="flex flex-col items-center gap-2 cursor-pointer group"
                    onClick={() => {
                      if (isCompleted) goToStep(s);
                    }}
                  >
                    <div
                      className={`w-9 h-9 flex items-center justify-center border transition-all rounded-full ${
                        isCompleted
                          ? "bg-teal-500 border-teal-500 text-white"
                          : isActive
                            ? "border-teal-500 bg-teal-500/10 text-teal-400"
                            : "border-[var(--space-border)] bg-[var(--space-card)] text-[var(--space-text-subtle)]"
                      } ${isCompleted ? "cursor-pointer hover:opacity-80" : ""}`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : isActive ? (
                        <div className="w-2.5 h-2.5 bg-teal-400 rounded-full animate-pulse" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </div>
                    <span
                      className={`font-mono text-[10px] uppercase tracking-wider hidden sm:block ${
                        isActive
                          ? "text-[var(--space-text)] font-bold"
                          : isCompleted
                            ? "text-[var(--space-text-muted)]"
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
        <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden max-w-6xl w-full mx-auto px-4 mt-4 gap-4">
          <main className="flex-1 lg:overflow-y-auto p-6 glass-panel rounded-2xl border border-[var(--space-border)]">
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
              <div className="flex flex-col gap-4 relative">
                {/* Connecting line */}
                <div className="absolute left-[18px] top-4 bottom-4 w-0.5 bg-[var(--space-border)]/50 -z-10" />
                {stepOrder.map((s, i) => {
                  const isCompleted = i < currentStepIdx;
                  const isActive = i === currentStepIdx;

                  return (
                    <div
                      key={s}
                      className="flex items-center gap-3 cursor-pointer group"
                      onClick={() => {
                        if (isCompleted) goToStep(s);
                      }}
                    >
                      <div
                        className={`w-9 h-9 flex items-center justify-center border transition-all rounded-full flex-shrink-0 ${
                          isCompleted
                            ? "bg-teal-500 border-teal-500 text-white"
                            : isActive
                              ? "border-teal-500 bg-teal-500/10 text-teal-400"
                              : "border-[var(--space-border)] bg-[var(--space-card)] text-[var(--space-text-subtle)]"
                        } ${isCompleted ? "cursor-pointer hover:opacity-80" : ""}`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : isActive ? (
                          <div className="w-2.5 h-2.5 bg-teal-400 rounded-full animate-pulse" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </div>
                      <span
                        className={`font-mono text-xs uppercase tracking-wider ${
                          isActive
                            ? "text-[var(--space-text)] font-bold"
                            : isCompleted
                              ? "text-[var(--space-text-muted)]"
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

        {/* Footer */}
        <footer className="w-full px-4 pt-4 pb-4 mt-auto flex-shrink-0">
          <div className="max-w-6xl mx-auto rounded-full bg-[var(--space-card)]/80 backdrop-blur-lg border border-[var(--space-border)] px-6 py-3 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => {
                if (canGoBack) {
                  goToStep(stepOrder[currentStepIdx - 1]);
                } else {
                  navigate("/dashboard");
                }
              }}
              className="glass-btn glass-btn-secondary"
            >
              <ChevronLeft className="w-4 h-4" />
              {canGoBack ? "Back" : "Dashboard"}
            </Button>

            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[var(--space-text-muted)]">
                {currentStepIdx + 1} / {stepOrder.length}
              </span>
            </div>
          </div>
        </footer>
        </div> {/* Closes Centered Main Content Wrapper */}

        {/* Floating Stepper in Right Blank Space - Desktop XL only */}
        <div className="hidden xl:flex flex-col justify-center py-4 pl-4 flex-shrink-0 z-20">
          <div className="rounded-full bg-[var(--space-card)]/85 backdrop-blur-lg border border-[var(--space-border)] py-10 px-3 flex flex-col items-center justify-between shadow-[0_10px_35px_rgba(0,0,0,0.06)] relative min-h-[520px] w-20">
            {/* Connecting line */}
            <div className="absolute top-14 bottom-14 w-0.5 bg-[var(--space-border)]/50 -z-10" />
            {stepOrder.map((s, i) => {
              const isCompleted = i < currentStepIdx;
              const isActive = i === currentStepIdx;

              return (
                <div
                  key={s}
                  className="flex flex-col items-center gap-1.5 cursor-pointer group"
                  onClick={() => {
                    if (isCompleted) goToStep(s);
                  }}
                >
                  <div
                    className={`w-9 h-9 flex items-center justify-center border transition-all rounded-full flex-shrink-0 ${
                      isCompleted
                        ? "bg-teal-500 border-teal-500 text-white"
                        : isActive
                          ? "border-teal-500 bg-teal-500/10 text-teal-400"
                          : "border-[var(--space-border)] bg-[var(--space-card)] text-[var(--space-text-subtle)]"
                    } ${isCompleted ? "cursor-pointer hover:opacity-80" : ""}`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : isActive ? (
                      <div className="w-2.5 h-2.5 bg-teal-400 rounded-full animate-pulse" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </div>
                  <span
                    className={`font-mono text-[9px] uppercase tracking-wider text-center select-none ${
                      isActive
                        ? "text-[var(--space-text)] font-bold"
                        : isCompleted
                          ? "text-[var(--space-text-muted)]"
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
