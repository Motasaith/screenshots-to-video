import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { useWizardStore, type TransitionType } from "@/hooks/useWizardStore";
import { trpc } from "@/providers/trpc";
import {
  StepEditorPanel,
  type EditorExportOptions,
} from "./StepEditorPanel";
import OnboardingTour from "./OnboardingTour";
import GuidedFraming, { type FramingResult } from "./GuidedFraming";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { detectGibberish } from "@/lib/gibberish";
import { ProjectDescription } from "@contracts/constants";

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
  const generateScript = trpc.ai.generateScript.useMutation();
  const applyFocus = trpc.step.applyFocus.useMutation();

  /**
   * Writing the narration for a freshly imported project, before the editor
   * opens.
   *
   * The homepage promises "drop in the screenshots you already have, AIVideo
   * writes the narration". It then dropped people into a fifteen-tool editor
   * with empty scripts and left them to find the button, which is the "I gave
   * it my screenshots, why is there no video?" moment. The generation runs on
   * its own now, and the editor opens with the scripts already in it.
   *
   * `null` means not running. A failure is not fatal: the scenes and their
   * screenshots are already saved, so the editor still opens and the script
   * button is still there.
   */
  const [draftState, setDraftState] = useState<"writing" | "failed" | null>(null);

  /**
   * Whether the guided "point at the thing" pass is on screen.
   *
   * It runs between the import dialog and the editor, so the first thing a new
   * person does is one drag on one screenshot rather than meeting fifteen tools
   * at once.
   */
  const [showFraming, setShowFraming] = useState(false);

  /**
   * Offer the guided pass once per project, when its screenshots first arrive.
   *
   * It used to be launched only from the import dialog, which only opens on
   * `?imported=true` - so it existed solely for the homepage uploader. A project
   * created from the dashboard starts with no scenes at all, lands straight in
   * the editor, and never saw the setup no matter how many screenshots were
   * added afterwards.
   *
   * The trigger is the transition from no scenes to some, so it fires after the
   * first upload rather than on an empty project where there would be nothing to
   * frame. It stays quiet for a project that has been framed before, and the
   * button in the timeline reopens it on demand.
   */
  const framingOfferedRef = useRef(false);
  const hadStepsRef = useRef<boolean | null>(null);

  /** Reopen the guided pass from the timeline, for any project at any time. */
  const openFraming = () => {
    framingOfferedRef.current = true;
    setShowFraming(true);
  };

  /**
   * Draft the narration from the screenshots, after the guided pass.
   *
   * Runs whether or not anything was framed: the scripts are written from the
   * pictures, not from the boxes. A failure is not fatal - the scenes and their
   * screenshots are saved, and the Script panel can generate them on demand.
   */
  const writeNarration = async () => {
    setDraftState("writing");
    try {
      await generateScript.mutateAsync({ projectId: projectIdNum });
      setDraftState(null);
    } catch (err) {
      console.error("Auto script generation failed:", err);
      setDraftState("failed");
    } finally {
      await trpcUtils.project.getById.invalidate({ id: projectIdNum });
      await trpcUtils.step.listByProject.invalidate({ projectId: projectIdNum });
    }
  };
  const trpcUtils = trpc.useUtils();

  const { data: project } = trpc.project.getById.useQuery(
    { id: projectIdNum },
    { enabled: projectIdNum > 0 }
  );
  const { data: steps } = trpc.step.listByProject.useQuery({ projectId: projectIdNum });

  useEffect(() => {
    const list = project?.steps;
    if (!list) return;

    const hasSteps = list.length > 0;
    const firstLook = hadStepsRef.current === null;
    const wasEmpty = hadStepsRef.current === false;
    hadStepsRef.current = hasSteps;

    // The first look only records the starting point. Opening an existing
    // project that happens to have no highlights is not a reason to launch the
    // setup over it - that would fire on every page load until it was done.
    // Only a project that gains its first scenes while open has just been
    // started, and that is the moment worth interrupting.
    if (firstLook || !wasEmpty || !hasSteps) return;
    if (framingOfferedRef.current || showFraming || showImportModal) return;

    // Anything already framed means this is not a first run.
    const alreadyFramed = list.some(
      (s) => Array.isArray(s.editorHighlights) && s.editorHighlights.length > 0
    );
    framingOfferedRef.current = true;
    if (!alreadyFramed) setShowFraming(true);
  }, [project?.steps, showFraming, showImportModal]);


  // Seed caption and transition settings from the project ONCE.
  //
  // This used to run on every change of the `project` object, which is a new
  // identity after each refetch. The editor invalidates project.getById on
  // every annotation autosave, so a few seconds after picking a caption colour
  // the refetch landed and this effect wrote the database value back over the
  // choice. That is the "caption colour resets by itself" report, and it is
  // also why caption settings looked like they did nothing: they were reverted
  // before anything saved them.
  const seededFromProject = useRef(false);
  useEffect(() => {
    if (!project || seededFromProject.current) return;
    seededFromProject.current = true;
    setTransitionDuration(project.transitionDuration ?? 0.5);
    setCaptionsEnabled(project.captionsEnabled === 1);
    setCaptionStyle(project.captionStyle || "standard");
    setCaptionSize(project.captionSize || "medium");
    setCaptionPosition(project.captionPosition || "bottom");
    setCaptionColor(project.captionColor || "#FFFFFF");
  }, [project]);

  // Persist caption settings when they change.
  //
  // They were previously written only by the pre-render save, so between
  // choosing them and pressing Export they lived nowhere but component state
  // and any reload lost them. Debounced, and skipped until the seed above has
  // run so the initial values are not written straight back.
  useEffect(() => {
    if (projectIdNum <= 0 || !seededFromProject.current || !project) return;

    const unchanged =
      project.captionsEnabled === (captionsEnabled ? 1 : 0) &&
      (project.captionStyle || "standard") === captionStyle &&
      (project.captionSize || "medium") === captionSize &&
      (project.captionPosition || "bottom") === captionPosition &&
      (project.captionColor || "#FFFFFF") === captionColor;
    if (unchanged) return;

    const timer = setTimeout(() => {
      updateProject.mutate({
        id: projectIdNum,
        captionsEnabled,
        captionStyle,
        captionSize,
        captionPosition,
        captionColor,
      });
    }, 600);
    return () => clearTimeout(timer);
    // `project` is intentionally read but not depended on: it changes identity
    // on every refetch, which would restart the timer forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captionsEnabled, captionStyle, captionSize, captionPosition, captionColor, projectIdNum]);

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

  // Live validity for the import dialog, so the counter, the hint and the
  // submit button all read one source instead of the button waiting for a
  // click to reveal a problem.
  const descTrimmed = projectDesc.trim();
  const descShort = descTrimmed.length < ProjectDescription.min;
  const descGibberish = descTrimmed.length >= ProjectDescription.min
    ? detectGibberish(projectDesc).reason ?? null
    : null;
  const canStartEditing =
    projectName.trim().length >= 3 &&
    !descShort &&
    projectDesc.length <= ProjectDescription.max &&
    !descGibberish;

  const handleSaveImportModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (projectName.trim().length < 3) {
      setValidationError("Project title must be at least 3 characters.");
      return;
    }
    if (projectDesc.trim().length < ProjectDescription.min) {
      setValidationError(
        `Project description must be at least ${ProjectDescription.min} characters.`
      );
      return;
    }
    if (projectDesc.length > ProjectDescription.max) {
      setValidationError(
        `Project description must be under ${ProjectDescription.max} characters.`
      );
      return;
    }
    if (detectGibberish(projectDesc).isGibberish) {
      setValidationError(
        detectGibberish(projectDesc).reason ?? "Please write a real description."
      );
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

      // Hand over to the guided pass rather than the editor. The person says
      // what matters on each screenshot themselves - one screenshot, one drag -
      // and the narration is written from those screenshots afterwards.
      framingOfferedRef.current = true;
      setShowFraming(true);
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
      {/* Full immersive editor: sidebar + canvas + timeline.
          Held back until the guided pass is done. The editor seeds its
          annotation state once and only re-reads the server when the SET of
          step ids changes - adding highlights to existing scenes does not change
          any id, so an editor mounted underneath the framing overlay would keep
          the empty annotations it started with and the boxes just drawn would
          never appear. Mounting it after the write means it reads them on its
          first pass. */}
      <div id="preview-editor" className="flex-1 min-h-0">
        {!showFraming && <StepEditorPanel
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
          onOpenFraming={openFraming}
        />}
      </div>

      {/* First-time user onboarding tour */}
      {/* Fed from `project.steps`, not the `step.listByProject` query beside it.
          Only project.getById runs signStepUrls; listByProject returns the raw
          storage keys, so `<img src="local:users/2/...">` renders nothing. */}
      {showFraming && project?.steps && project.steps.length > 0 && (
        <GuidedFraming
          steps={project.steps.map((s) => ({
            id: s.id,
            order: s.order,
            screenshotPath: s.screenshotPath,
          }))}
          onSkipAll={() => {
            setShowFraming(false);
            void writeNarration();
          }}
          onDone={async (result: Record<number, FramingResult>) => {
            const frames = Object.entries(result).map(([stepId, r]) => ({
              stepId: Number(stepId),
              highlights: r.highlights,
            }));
            if (frames.length > 0) {
              try {
                await applyFocus.mutateAsync({ projectId: projectIdNum, frames });
                // Before the editor mounts, so it seeds its annotations from
                // data that already has the highlights in it.
                await trpcUtils.project.getById.invalidate({ id: projectIdNum });
                await trpcUtils.step.listByProject.invalidate({ projectId: projectIdNum });
              } catch (err) {
                // The boxes are lost but nothing else is; the editor can still
                // place them, so this must not block the narration pass.
                console.error("Could not save the framing:", err);
                toast.error("Could not save your highlights. You can add them in the editor.");
              }
            }
            setShowFraming(false);
            void writeNarration();
          }}
        />
      )}

      {/* Shown between "start editing" and the editor appearing, so the wait
          reads as the product working rather than as nothing happening. */}
      {draftState && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-[var(--sketch-border-color)] bg-[var(--sketch-surface)] p-6 text-center shadow-2xl">
            {draftState !== "failed" ? (
              <>
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--sketch-accent)]" />
                <h2 className="mt-4 text-base font-semibold text-[var(--sketch-fg)]">
                  Writing your narration
                </h2>
                <p className="mt-1.5 text-sm text-[var(--sketch-fg-muted)]">
                  Reading your {steps?.length ?? 0} screenshots and drafting what
                  to say for each scene. You can edit every line afterwards in
                  the <span className="font-medium text-[var(--sketch-fg)]">Script</span> panel.
                </p>
                {/* Dismissable on purpose. The generation keeps running and the
                    scripts appear when it lands, so a slow model never traps
                    anyone behind a modal they cannot close. */}
                <button
                  onClick={() => setDraftState(null)}
                  className="mt-4 text-xs text-[var(--sketch-fg-muted)] underline underline-offset-2 hover:text-[var(--sketch-fg)]"
                >
                  Skip and start editing
                </button>
              </>
            ) : (
              <>
                <h2 className="text-base font-semibold text-[var(--sketch-fg)]">
                  Could not write the narration
                </h2>
                <p className="mt-1.5 text-sm text-[var(--sketch-fg-muted)]">
                  Your screenshots are saved and the project is ready. You can
                  write the script yourself, or try generating it again from the
                  Script panel.
                </p>
                <button
                  onClick={() => setDraftState(null)}
                  className="btn btn-primary mt-4 w-full"
                >
                  Open the editor
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <OnboardingTour deferUntilReady={showImportModal} />

      {/* Mandatory Project Details Popup */}
      <Dialog open={showImportModal} onOpenChange={() => {}}>
        <DialogContent
          className="max-w-md glass-panel border border-[var(--space-border)] bg-[var(--sketch-surface)] text-[var(--space-text)] [&>button]:hidden shadow-2xl rounded-2xl"
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
                className="bg-[var(--sketch-input-bg)]  border-[var(--space-border)] focus:border-teal-500/50 rounded-xl text-[var(--space-text)] placeholder:text-[var(--space-text-subtle)]"
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
                placeholder={`Describe what this video covers, who it is for, and what they should be able to do afterwards. At least ${ProjectDescription.min} characters, because the narration is written from this.`}
                maxLength={ProjectDescription.max}
                className="bg-[var(--sketch-input-bg)]  border-[var(--space-border)] focus:border-teal-500/50 rounded-xl min-h-[90px] resize-none text-[var(--space-text)] placeholder:text-[var(--space-text-subtle)]"
                required
                disabled={isSavingSettings}
              />
              {/* Same counter the create dialog shows. This dialog had none, so
                  the only feedback was an error after pressing Start Editing. */}
              <div className="flex items-start justify-between gap-3 px-0.5">
                <span className="text-[10px] leading-4">
                  {descShort ? (
                    <span className="text-amber-600 font-semibold">
                      {ProjectDescription.min - projectDesc.trim().length} more character
                      {ProjectDescription.min - projectDesc.trim().length === 1 ? "" : "s"} needed
                    </span>
                  ) : descGibberish ? (
                    <span className="text-red-500 font-semibold">{descGibberish}</span>
                  ) : (
                    <span className="text-emerald-600 font-semibold">Looks good</span>
                  )}
                </span>
                <span
                  className={`text-[10px] font-mono flex-shrink-0 ${
                    descShort || projectDesc.length >= ProjectDescription.max
                      ? "text-amber-600 font-bold"
                      : "text-[var(--space-text-subtle)]"
                  }`}
                >
                  {projectDesc.length}/{ProjectDescription.max}
                </span>
              </div>
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
                          ? "bg-teal-500/15 border-teal-500 text-teal-700  shadow-sm font-bold"
                          : "bg-[var(--sketch-input-bg)]  border-[var(--space-border)] text-[var(--space-text-subtle)] hover:border-teal-500/30 hover:text-[var(--space-text)]"
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
              disabled={isSavingSettings || !canStartEditing}
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
