import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useWizardStore, type TransitionType } from "@/hooks/useWizardStore";
import { trpc } from "@/providers/trpc";
import { StepEditorPanel } from "./StepEditorPanel";

export default function StepPreview() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const projectIdNum = Number(projectId) || 0;

  const { stepData, setStepData } = useWizardStore();
  const previewData = stepData.preview;

  const [globalTransition, setGlobalTransition] = useState<TransitionType>("fade");
  const [stepTransitions, setStepTransitions] = useState<Record<number, TransitionType>>({});
  const [transitionDuration, setTransitionDuration] = useState(previewData.transitionDuration || 0.5);

  const [captionsEnabled, setCaptionsEnabled] = useState(previewData.captionsEnabled ?? true);
  const [captionStyle, setCaptionStyle] = useState(previewData.captionStyle || "standard");
  const [captionSize, setCaptionSize] = useState(previewData.captionSize || "medium");
  const [captionPosition, setCaptionPosition] = useState(previewData.captionPosition || "bottom");
  const [captionColor, setCaptionColor] = useState(previewData.captionColor || "#FFFFFF");

  const updateProject = trpc.project.update.useMutation();
  const updateStep = trpc.step.update.useMutation();

  const { data: project } = trpc.project.getById.useQuery(
    { id: projectIdNum },
    { enabled: projectIdNum > 0 }
  );
  const { data: steps } = trpc.step.listByProject.useQuery({ projectId: projectIdNum });

  // Sync state from project query when loaded
  useEffect(() => {
    if (project) {
      setTransitionDuration(project.transitionDuration ?? 0.5);
      setCaptionsEnabled(project.captionsEnabled === 1);
      setCaptionStyle(project.captionStyle || "standard");
      setCaptionSize(project.captionSize || "medium");
      setCaptionPosition(project.captionPosition || "bottom");
      setCaptionColor(project.captionColor || "#FFFFFF");
    }
  }, [project]);

  // Sync step transitions when steps load
  useEffect(() => {
    if (steps) {
      const transitions: Record<number, TransitionType> = {};
      steps.forEach((step) => {
        if (step.transition) {
          transitions[step.id] = step.transition as TransitionType;
        }
      });
      setStepTransitions(transitions);
    }
  }, [steps]);

  const handleStepTransitionChange = (stepId: number, transition: TransitionType) => {
    setStepTransitions((prev) => ({ ...prev, [stepId]: transition }));
  };

  const handleContinue = () => {
    // Save current preview state to wizard store for consistency
    setStepData("preview", {
      stepTransitions,
      transitionDuration,
      introTemplate: project?.introTemplate || "",
      introText: project?.introText || "",
      introVideoPath: project?.introVideoPath || "",
      introDuration: project?.introDuration || 3.0,
      outroTemplate: project?.outroTemplate || "",
      outroText: project?.outroText || "",
      outroVideoPath: project?.outroVideoPath || "",
      outroDuration: project?.outroDuration || 3.0,
      captionsEnabled,
      captionStyle,
      captionSize,
      captionPosition,
      captionColor,
    });

    navigate(`/create/${projectIdNum}/render`);
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Full immersive editor — sidebar + canvas + timeline */}
      <div id="preview-editor" className="flex-1 min-h-0">
        <StepEditorPanel
          stepTransitions={stepTransitions}
          onStepTransitionChange={handleStepTransitionChange}
          globalTransition={globalTransition}
          onGlobalTransitionChange={setGlobalTransition}
          transitionDuration={transitionDuration}
          onTransitionDurationChange={setTransitionDuration}
          captionsEnabled={captionsEnabled}
          onCaptionsEnabledChange={setCaptionsEnabled}
          captionStyle={captionStyle}
          onCaptionStyleChange={setCaptionStyle}
          captionSize={captionSize}
          onCaptionSizeChange={setCaptionSize}
          captionPosition={captionPosition}
          onCaptionPositionChange={setCaptionPosition}
          captionColor={captionColor}
          onCaptionColorChange={setCaptionColor}
          parentSteps={steps?.map((s) => ({
            id: s.id,
            screenshotPath: s.screenshotPath,
            description: s.description,
            transition: s.transition,
          }))}
          onBack={() => navigate("/dashboard")}
          onContinue={handleContinue}
          isSaving={updateProject.isPending || updateStep.isPending}
        />
      </div>
    </div>
  );
}
