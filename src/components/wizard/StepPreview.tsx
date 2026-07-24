import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { useWizardStore, type TransitionType } from "@/hooks/useWizardStore";
import { trpc } from "@/providers/trpc";
import {
  StepEditorPanel,
  type EditorExportOptions,
} from "./StepEditorPanel";
import OnboardingTour from "./OnboardingTour";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function StepPreview() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const projectIdNum = Number(projectId) || 0;

  const [searchParams, setSearchParams] = useSearchParams();
  const imported = searchParams.get("imported") === "true";
  const focusPanel =
    searchParams.get("focus") === "voiceover"
      ? "voiceover"
      : searchParams.get("focus") === "script"
        ? "script"
        : undefined;
  const focusScriptMode =
    searchParams.get("scriptMode") === "manual" ? "manual" : "ai";
  const [showImportModal, setShowImportModal] = useState(imported);

  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1" | "4:5">("16:9");
  const [validationError, setValidationError] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

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
  const trpcUtils = trpc.useUtils();

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

  // Prefill import modal fields if project data is loaded
  useEffect(() => {
    if (project && showImportModal) {
      if (project.title && project.title !== "Imported Video") {
        setProjectName(project.title);
      }
      if (project.description && project.description !== "Screenshots imported from folder uploader.") {
        setProjectDesc(project.description);
      }
      if (project.aspectRatio) {
        setAspectRatio(project.aspectRatio as any);
      }
    }
  }, [project, showImportModal]);

  const handleSaveImportModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (projectName.trim().length < 3) {
      setValidationError("Project title must be at least 3 characters.");
      return;
    }
    if (projectDesc.trim().length < 10) {
      setValidationError("Project description must be at least 10 characters.");
      return;
    }

    setIsSavingSettings(true);
    try {
      const rawPlatform =
        aspectRatio === "16:9"
          ? "youtube"
          : aspectRatio === "9:16"
            ? "tiktok"
            : aspectRatio === "4:5"
              ? "instagram"
              : "linkedin";
      const platform = rawPlatform === "instagram" ? "linkedin" : rawPlatform;

      await updateProject.mutateAsync({
        id: projectIdNum,
        title: projectName.trim(),
        description: projectDesc.trim(),
        aspectRatio: aspectRatio,
        platform: platform as "youtube" | "teams" | "tiktok" | "linkedin",
      });

      // Invalidate queries so editor state updates
      trpcUtils.project.getById.invalidate({ id: projectIdNum });

      // Clear imported param and close modal
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("imported");
      setSearchParams(newParams);

      setShowImportModal(false);
    } catch (err: any) {
      console.error(err);
      setValidationError(err.message || "Failed to update project settings.");
    } finally {
      setIsSavingSettings(false);
    }
  };

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

  const handleContinue = (options: EditorExportOptions = {}) => {
    const exportCaptionsEnabled =
      options.captionsEnabled ?? captionsEnabled;

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
      captionsEnabled: exportCaptionsEnabled,
      captionStyle,
      captionSize,
      captionPosition,
      captionColor,
    });

    navigate(
      `/create/${projectIdNum}/render${options.allowSilent ? "?allowSilent=true" : ""}`,
    );
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
          focusPanel={focusPanel}
          focusScriptMode={focusScriptMode}
        />
      </div>

      {/* First-time user onboarding tour */}
      <OnboardingTour />

      {/* Mandatory Project Details Popup */}
      <Dialog open={showImportModal} onOpenChange={() => {}}>
        <DialogContent
          className="max-w-md glass-panel border border-[var(--space-border)] bg-[var(--space-card)]/95 backdrop-blur-xl text-[var(--space-text)] [&>button]:hidden shadow-2xl rounded-2xl"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold tracking-tight">Configure Your Imported Project</DialogTitle>
            <DialogDescription className="text-xs text-[var(--space-text-subtle)] mt-1 font-sans">
              Give your video a name, description, and choose the layout aspect ratio to initialize the editor.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveImportModal} className="space-y-4 pt-2 font-sans">
            <div className="space-y-1.5">
              <Label htmlFor="import-title" className="text-xs font-semibold text-[var(--space-text-muted)]">
                Project Title
              </Label>
              <Input
                id="import-title"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Clean partition tutorial"
                className="bg-slate-100/80 dark:bg-slate-950/40 border-[var(--space-border)] focus:border-teal-500/50 rounded-xl text-[var(--space-text)] placeholder:text-[var(--space-text-subtle)]"
                required
                disabled={isSavingSettings}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="import-desc" className="text-xs font-semibold text-[var(--space-text-muted)]">
                Project Description
              </Label>
              <Textarea
                id="import-desc"
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
                placeholder="Describe what this video shows..."
                className="bg-slate-100/80 dark:bg-slate-950/40 border-[var(--space-border)] focus:border-teal-500/50 rounded-xl min-h-[90px] resize-none text-[var(--space-text)] placeholder:text-[var(--space-text-subtle)]"
                required
                disabled={isSavingSettings}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[var(--space-text-muted)]">Aspect Ratio</Label>
              <div className="grid grid-cols-4 gap-2">
                {(["16:9", "9:16", "1:1", "4:5"] as const).map((ratio) => {
                  const labelMap = {
                    "16:9": "YouTube",
                    "9:16": "TikTok",
                    "1:1": "Square",
                    "4:5": "Insta",
                  };
                  return (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAspectRatio(ratio)}
                      disabled={isSavingSettings}
                      className={`py-2 px-1 rounded-xl border text-[10px] font-semibold flex flex-col items-center justify-center transition-all cursor-pointer ${
                        aspectRatio === ratio
                          ? "bg-teal-500/15 border-teal-500 text-teal-700 dark:text-teal-300 shadow-sm font-bold"
                          : "bg-slate-100/80 dark:bg-slate-950/20 border-[var(--space-border)] text-[var(--space-text-subtle)] hover:border-teal-500/30 hover:text-[var(--space-text)]"
                      }`}
                    >
                      <span className="text-sm font-bold">{ratio}</span>
                      <span className="opacity-70 mt-0.5">{labelMap[ratio]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {validationError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <span className="font-semibold">Error:</span> {validationError}
              </div>
            )}

            <Button
              type="submit"
              className="w-full glass-btn glass-btn-primary py-5 text-xs font-bold rounded-xl mt-2 cursor-pointer flex items-center justify-center gap-2"
              disabled={isSavingSettings}
            >
              {isSavingSettings ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving Settings...
                </>
              ) : (
                "Start Editing"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
