import { useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useWizardStore, stepOrder, stepIndex, stepLabels } from "@/hooks/useWizardStore";
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
import StepAnnotate from "@/components/wizard/StepAnnotate";
import StepPreview from "@/components/wizard/StepPreview";
import StepVoice from "@/components/wizard/StepVoice";
import StepRender from "@/components/wizard/StepRender";
import StepExport from "@/components/wizard/StepExport";
import AIGuide from "@/components/wizard/AIGuide";
import { Button } from "@/components/ui/button";

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
      stepOrder.includes(step as any)
    ) {
      setCurrentStep(step as any);
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
      <div className="min-h-screen dot-grid flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--sketch-fg)]" />
      </div>
    );
  }

  if (!user) return null;

  const stepComponents: Record<string, React.ReactNode> = {
    setup: <StepSetup />,
    upload: <StepUpload />,
    script: <StepScript />,
    annotate: <StepAnnotate />,
    preview: <StepPreview />,
    voice: <StepVoice />,
    render: <StepRender />,
    export: <StepExport />,
  };

  return (
    <div className="min-h-screen dot-grid flex flex-col">
      {/* Sketchbook Header */}
      <header className="border-b-2 border-[var(--sketch-border-color)] bg-[var(--sketch-navbar-bg)] backdrop-blur-sm relative">
        {/* Hand-drawn accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--sketch-accent)]/60" />
        <div className="w-full px-6 lg:px-12">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-[var(--sketch-fg-muted)] hover:text-[var(--sketch-fg)] transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="font-body text-sm">Dashboard</span>
            </button>
            {project && (
              <span className="font-hand text-lg text-[var(--sketch-fg)] truncate max-w-xs hidden sm:block animate-float">
                {project.title}
              </span>
            )}
            <span className="font-mono text-xs text-[var(--sketch-fg-muted)] bg-[#FBBF24]/20 px-2 py-1 sketch-border-sm">
              Step {currentStepIdx + 1} of 7
            </span>
          </div>
        </div>
      </header>

      {/* Sketchbook Stepper */}
      <div className="w-full px-6 lg:px-12 py-5 border-b-2 border-[var(--sketch-fg-subtle)] bg-[var(--sketch-card-bg)]/80">
        <div className="flex items-center justify-between max-w-4xl mx-auto relative">
          {/* Connecting line */}
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-[var(--sketch-fg-subtle)] -z-10 mx-4" />
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
                  className={`w-9 h-9 flex items-center justify-center border-2 transition-all ${
                    isCompleted
                      ? "bg-[var(--sketch-fg)] border-[var(--sketch-fg)] text-[var(--sketch-bg)]"
                      : isActive
                        ? "border-[var(--sketch-border-color)] bg-[#FBBF24]/20 text-[var(--sketch-fg)]"
                        : "border-[var(--sketch-fg-subtle)] bg-[var(--sketch-card-bg)] text-[var(--sketch-fg-subtle)]"
                  } ${isCompleted ? "cursor-pointer hover:opacity-80" : ""}`}
                  style={{ borderRadius: isActive ? "255px 15px 225px 15px/15px 225px 15px 255px" : "50%" }}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : isActive ? (
                    <div className="w-2.5 h-2.5 bg-[#FBBF24] rounded-full animate-pulse" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </div>
                <span
                  className={`font-mono text-[10px] uppercase tracking-wider hidden sm:block ${
                    isActive
                      ? "text-[var(--sketch-fg)] font-bold"
                      : isCompleted
                        ? "text-[var(--sketch-fg)]"
                        : "text-[var(--sketch-fg-subtle)]"
                  }`}
                >
                  {stepLabels[s]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
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

        <aside className="w-full lg:w-80 border-l-2 border-[var(--sketch-fg-subtle)] bg-[var(--sketch-card-bg)]/60 flex-shrink-0 overflow-y-auto">
          <AIGuide />
        </aside>
      </div>

      {/* Sketchbook Footer */}
      <footer className="border-t-2 border-[var(--sketch-border-color)] bg-[var(--sketch-bg)] px-6 lg:px-12 py-4 relative">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#FBBF24]/40" />
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => {
              if (canGoBack) {
                goToStep(stepOrder[currentStepIdx - 1]);
              } else {
                navigate("/dashboard");
              }
            }}
            className="sketch-btn-ghost"
          >
            <ChevronLeft className="w-4 h-4" />
            {canGoBack ? "Back" : "Dashboard"}
          </Button>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              {currentStepIdx + 1} / 7
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
