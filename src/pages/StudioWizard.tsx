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
import { SpaceBackground } from "@/components/shared/SpaceBackground";

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
    describe: <StudioDescribe />,
    script: <StudioScript />,
    media: <StudioMedia />,
    preview: <StudioPreview />,
    voice: <StudioVoice />,
    render: <StudioRender />,
    export: <StudioExport />,
  };

  return (
    <div className="theme-3d-immersive min-h-screen relative overflow-x-hidden font-sans flex flex-col">
      <SpaceBackground />
      <div className="relative z-10 flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-[var(--space-border)] bg-[var(--space-card)]/30 backdrop-blur-md relative">
          <div className="w-full px-6 lg:px-12">
            <div className="flex items-center justify-between h-16">
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2 text-[var(--space-text-muted)] hover:text-[var(--space-text)] transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium">Dashboard</span>
              </button>
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-teal-400" />
                <span className="font-semibold text-sm text-[var(--space-text)]">
                  AI Video Studio
                </span>
              </div>
              <span className="font-mono text-xs text-[var(--space-text-muted)] bg-teal-500/10 px-2.5 py-1 rounded-md border border-[var(--space-border)]">
                Step {currentStepIdx + 1} of 7
              </span>
            </div>
          </div>
        </header>

        {/* Stepper */}
        <div className="w-full px-6 lg:px-12 py-5 border-b border-[var(--space-border)] bg-[var(--space-card)]/10 backdrop-blur-sm">
          <div className="flex items-center justify-between max-w-4xl mx-auto relative">
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-[var(--space-border)] -z-10 mx-4" />
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
        <footer className="border-t border-[var(--space-border)] bg-[var(--space-card)]/20 backdrop-blur-md px-6 lg:px-12 py-4 relative">
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
              className="glass-btn glass-btn-secondary"
            >
              <ChevronLeft className="w-4 h-4" />
              {canGoBack ? "Back" : "Dashboard"}
            </Button>

            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[var(--space-text-muted)]">
                {currentStepIdx + 1} / 7
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
