import { useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import {
  useStudioStore,
  studioStepOrder,
  studioStepIndex,
  studioStepLabels,
  type StudioStep,
} from "@/hooks/useStudioStore";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/providers/trpc";
import {
  CheckCircle,
  Circle,
  Loader2,
  ChevronLeft,
  ArrowLeft,
  Wand2,
} from "lucide-react";
import StudioDescribe from "@/components/studio/StudioDescribe";
import StudioScript from "@/components/studio/StudioScript";
import StudioMedia from "@/components/studio/StudioMedia";
import StudioPreview from "@/components/studio/StudioPreview";
import StudioVoice from "@/components/studio/StudioVoice";
import StudioRender from "@/components/studio/StudioRender";
import StudioExport from "@/components/studio/StudioExport";
import { Button } from "@/components/ui/button";

export default function StudioWizard() {
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
    projectId,
  } = useStudioStore();

  const projectIdNum = Number(pid) || 0;
  const currentStepIdx = studioStepIndex(currentStep);

  trpc.studio.getById.useQuery(
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
      studioStepOrder.includes(step as StudioStep)
    ) {
      setCurrentStep(step as StudioStep);
    }
  }, [step, setCurrentStep]);

  useEffect(() => {
    if (projectIdNum > 0) {
      setProjectId(projectIdNum);
    }
  }, [projectIdNum, setProjectId]);

  const goToStep = (step: StudioStep) => {
    const id = projectId || projectIdNum;
    if (id > 0) {
      navigate(`/studio/${id}/${step}`);
    }
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
    describe: <StudioDescribe />,
    script: <StudioScript />,
    media: <StudioMedia />,
    preview: <StudioPreview />,
    voice: <StudioVoice />,
    render: <StudioRender />,
    export: <StudioExport />,
  };

  return (
    <div className="min-h-screen dot-grid flex flex-col">
      {/* Header */}
      <header className="border-b-2 border-[var(--sketch-border-color)] bg-[var(--sketch-navbar-bg)] backdrop-blur-sm relative">
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FBBF24]/60" />
        <div className="w-full px-6 lg:px-12">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-[var(--sketch-fg-muted)] hover:text-[var(--sketch-fg)] transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="font-body text-sm">Dashboard</span>
            </button>
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-[#FBBF24]" />
              <span className="font-body font-semibold text-sm text-[var(--sketch-fg)]">
                AI Video Studio
              </span>
            </div>
            <span className="font-mono text-xs text-[var(--sketch-fg-muted)] bg-[#FBBF24]/20 px-2 py-1 sketch-border-sm">
              Step {currentStepIdx + 1} of 6
            </span>
          </div>
        </div>
      </header>

      {/* Stepper */}
      <div className="w-full px-6 lg:px-12 py-5 border-b-2 border-[var(--sketch-fg-subtle)] bg-[var(--sketch-card-bg)]/80">
        <div className="flex items-center justify-between max-w-4xl mx-auto relative">
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-[var(--sketch-fg-subtle)] -z-10 mx-4" />
          {studioStepOrder.map((s, i) => {
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
                  style={{
                    borderRadius: isActive
                      ? "255px 15px 225px 15px/15px 225px 15px 255px"
                      : "50%",
                  }}
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
                  {studioStepLabels[s]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {stepComponents[currentStep] || <StudioDescribe />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-[var(--sketch-border-color)] bg-[var(--sketch-bg)] px-6 lg:px-12 py-4 relative">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#FBBF24]/40" />
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => {
              if (canGoBack) {
                goToStep(studioStepOrder[currentStepIdx - 1]);
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
              {currentStepIdx + 1} / 6
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
