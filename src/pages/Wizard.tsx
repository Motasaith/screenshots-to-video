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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  const stepComponents: Record<string, React.ReactNode> = {
    setup: <StepSetup />,
    upload: <StepUpload />,
    script: <StepScript />,
    annotate: <StepAnnotate />,
    voice: <StepVoice />,
    render: <StepRender />,
    export: <StepExport />,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b-2 border-border bg-card">
        <div className="w-full px-6 lg:px-12">
          <div className="flex items-center justify-between h-14">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-dm text-sm">Dashboard</span>
            </button>
            {project && (
              <span className="font-syne font-semibold text-sm truncate max-w-xs hidden sm:block">
                {project.title}
              </span>
            )}
            <span className="font-mono text-xs text-muted-foreground">
              Step {currentStepIdx + 1} of 7
            </span>
          </div>
        </div>
      </header>

      <div className="w-full px-6 lg:px-12 py-4 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
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
                  className={`w-8 h-8 flex items-center justify-center border-2 transition-all ${
                    isCompleted
                      ? "bg-primary border-primary text-primary-foreground"
                      : isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted text-muted-foreground"
                  } ${isCompleted ? "cursor-pointer hover:opacity-80" : ""}`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : isActive ? (
                    <div className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </div>
                <span
                  className={`font-mono text-[10px] uppercase tracking-wider hidden sm:block ${
                    isActive
                      ? "text-primary font-semibold"
                      : isCompleted
                        ? "text-foreground"
                        : "text-muted-foreground"
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

        <aside className="w-full lg:w-80 border-l border-border bg-muted/10 flex-shrink-0 overflow-y-auto">
          <AIGuide />
        </aside>
      </div>

      <footer className="border-t-2 border-border bg-card px-6 lg:px-12 py-4">
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
            className="border-2 border-border"
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
