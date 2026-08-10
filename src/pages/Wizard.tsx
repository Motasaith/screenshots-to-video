import { useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useWizardStore, stepOrder, stepIndex, stepLabels, type WizardStep } from "@/hooks/useWizardStore";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/providers/trpc";
import {
  Loader2,
  ArrowLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import StepPreview from "@/components/wizard/StepPreview";
import StepRender from "@/components/wizard/StepRender";
import StepExport from "@/components/wizard/StepExport";



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

  if (authLoading) {
    return (
      <div className="min-h-screen relative overflow-x-hidden font-sans flex items-center justify-center">
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
      <div className="w-screen h-dvh overflow-hidden bg-[var(--sketch-bg)] text-[var(--sketch-fg)] flex flex-col font-body">
        {stepComponents.preview}
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-dvh relative overflow-x-hidden lg:overflow-hidden font-sans flex flex-col pb-2">
      
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
                {/* Step indicator.
                    Was 14px dots with 7.5px numerals and 8.5px mono labels,
                    and the active label used text-teal-300, a tint meant for a
                    dark background. On white it was unreadable. Sizes are now
                    legible and the active step is the accent on a tinted pill
                    rather than pale text. */}
                <div className="mt-1 flex items-center gap-1">
                  {stepOrder.map((s, i) => {
                    const isCompleted = i < currentStepIdx;
                    const isActive = i === currentStepIdx;
                    const label = stepLabels[s];
                    // "render" is a process screen, not a place. Landing on it
                    // starts a render, so it must never be a navigation target.
                    const canNavigate = isCompleted && s !== "render";
                    return (
                      <div key={s} className="flex items-center gap-1">
                        <button
                          disabled={!canNavigate}
                          title={canNavigate ? `Back to ${label}` : label}
                          onClick={() => canNavigate && goToStep(s)}
                          aria-current={isActive ? "step" : undefined}
                          className={`flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2 text-[12px] font-medium transition-colors ${
                            isActive
                              ? "bg-brand/10 text-brand"
                              : isCompleted
                                ? "text-ink-body hover:bg-mat"
                                : "text-ink-muted"
                          } ${canNavigate ? "cursor-pointer" : "cursor-default"}`}
                        >
                          <span
                            className={`grid h-[18px] w-[18px] flex-none place-items-center rounded-full text-[10px] font-semibold ${
                              isCompleted
                                ? "bg-brand text-white"
                                : isActive
                                  ? "bg-brand text-white"
                                  : "border border-line-strong text-ink-muted"
                            }`}
                          >
                            {isCompleted ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                          </span>
                          <span className="hidden sm:inline">{label}</span>
                        </button>
                        {i < stepOrder.length - 1 && (
                          <ChevronRight className="hidden h-3.5 w-3.5 flex-none text-ink-muted/50 sm:inline" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* The stepper beside the title already names the current step and
                shows the position, so a "Step 2 of 3" badge was the same fact a
                second time. Kept as a spacer so the title stays centred. */}
            <div className="w-[92px] flex-shrink-0" aria-hidden />
          </div>
        </div>
      </header>
 
      <div className="relative z-10 flex-1 flex flex-row items-stretch justify-center h-full w-full px-2 lg:px-3 lg:overflow-hidden gap-2 mt-2">
        {/* Centered Main Content Wrapper */}
        <div className="flex flex-col lg:overflow-hidden h-full flex-grow w-full">


          {/* Content Pane Layout */}
          <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden w-full mt-2 gap-4 pb-2">


            <main className="flex-1 glass-panel rounded-2xl border border-[var(--space-border)] p-4 sm:p-6 overflow-y-auto">
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

    </div>
  );
}
