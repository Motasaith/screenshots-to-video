import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useWizardStore, type TransitionType } from "@/hooks/useWizardStore";
import { trpc } from "@/providers/trpc";
import {
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const {
    introTemplate = "",
    introText = "",
    introVideoPath = "",
    introDuration = 3.0,
    outroTemplate = "",
    outroText = "",
    outroVideoPath = "",
    outroDuration = 3.0,
  } = previewData;

  const [captionsEnabled, setCaptionsEnabled] = useState(previewData.captionsEnabled ?? true);
  const [captionStyle, setCaptionStyle] = useState(previewData.captionStyle || "standard");
  const [captionSize, setCaptionSize] = useState(previewData.captionSize || "medium");
  const [captionPosition, setCaptionPosition] = useState(previewData.captionPosition || "bottom");
  const [captionColor, setCaptionColor] = useState(previewData.captionColor || "#FFFFFF");

  const updateProject = trpc.project.update.useMutation();
  const updateStep = trpc.step.update.useMutation();
  const { data: steps } = trpc.step.listByProject.useQuery({ projectId: projectIdNum });

  const handleStepTransitionChange = (stepId: number, transition: TransitionType) => {
    setStepTransitions((prev) => ({ ...prev, [stepId]: transition }));
  };

  const handleContinue = async () => {
    // Save project level data
    await updateProject.mutateAsync({
      id: projectIdNum,
      transitionDuration,
      introTemplate,
      introText,
      introVideoPath,
      introDuration,
      outroTemplate,
      outroText,
      outroVideoPath,
      outroDuration,
      captionsEnabled,
      captionStyle,
      captionSize,
      captionPosition,
      captionColor,
    });

    // Save step level data (transitions) — per-step if set, else global
    if (steps) {
      for (const step of steps) {
        const transition = stepTransitions[step.id] || globalTransition;
        await updateStep.mutateAsync({
          id: step.id,
          transition,
        });
      }
    }

    setStepData("preview", {
      stepTransitions,
      transitionDuration,
      introTemplate,
      introText,
      introVideoPath,
      introDuration,
      outroTemplate,
      outroText,
      outroVideoPath,
      outroDuration,
      captionsEnabled,
      captionStyle,
      captionSize,
      captionPosition,
      captionColor,
    });

    navigate(`/create/${projectIdNum}/voice`);
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
          onBack={() => navigate(`/create/${projectIdNum}/script`)}
          onContinue={handleContinue}
          isSaving={updateProject.isPending || updateStep.isPending}
        />
      </div>
    </div>
  );
}
