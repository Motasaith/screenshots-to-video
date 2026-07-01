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

  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(true);

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
        {/* Floating Stepper in Left Blank Space - Desktop XL only */}
        <div className="hidden xl:flex flex-col justify-center py-2 flex-shrink-0 z-20">
          <div className="rounded-full bg-[var(--space-card)]/85 backdrop-blur-lg border border-[var(--space-border)] py-10 px-4 flex flex-col items-center justify-between shadow-[0_10px_35px_rgba(0,0,0,0.06)] relative h-[calc(100vh-160px)] min-h-[500px] max-h-[720px] w-24 z-0">
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
            {/* Sidebar (Only shown on LG screens below XL to contain the stepper) */}
            <aside className="hidden lg:flex xl:hidden w-80 flex-col gap-4 flex-shrink-0">
              <div className="glass-panel rounded-2xl border border-[var(--space-border)] bg-[var(--space-card)]/15 backdrop-blur-sm p-5 w-full">
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
            </aside>

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
            className="fixed right-0 top-1/2 z-40 bg-[var(--space-card)]/90 backdrop-blur-md border border-r-0 border-[var(--space-border)] py-6 px-3 rounded-l-2xl shadow-[0_10px_35px_rgba(0,0,0,0.15)] flex flex-col items-center gap-4 hover:bg-[var(--space-border)]/20 hover:text-teal-300 transition-all duration-300 group cursor-pointer"
          >
            <div className="relative">
              <Sparkles className="w-5 h-5 text-teal-400" />
              <span className="absolute -top-1.5 -right-1.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--space-text-muted)] group-hover:text-teal-300 font-bold select-none whitespace-nowrap rotate-90 my-6">
              AI Guide
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
