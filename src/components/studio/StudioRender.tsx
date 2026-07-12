import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useStudioStore } from "@/hooks/useStudioStore";
import { trpc } from "@/providers/trpc";
import { motion } from "framer-motion";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Film,
  Volume2,
  Scissors,
  Upload,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const stageIcons: Record<string, typeof Loader2> = {
  queued: Loader2,
  downloading_media: Film,
  preparing_scenes: Volume2,
  rendering_scenes: Scissors,
  concatenating: Film,
  finalizing: Upload,
  complete: CheckCircle,
  error: AlertCircle,
};

const stageLabels: Record<string, string> = {
  queued: "Waiting in queue...",
  downloading_media: "Downloading media assets",
  preparing_scenes: "Generating voiceover audio",
  rendering_scenes: "Rendering video scenes",
  concatenating: "Merging scenes together",
  finalizing: "Uploading final video",
  complete: "Done!",
  error: "Render failed",
};

export default function StudioRender() {
  const navigate = useNavigate();
  const { projectId } = useStudioStore();
  const [hasStarted, setHasStarted] = useState(false);

  const startRender = trpc.studio.startRender.useMutation();
  const renderStatus = trpc.studio.renderStatus.useQuery(
    { projectId: projectId! },
    {
      enabled: !!projectId && hasStarted,
      refetchInterval: 3000,
    }
  );

  const handleStartRender = async () => {
    if (!projectId) return;
    try {
      await startRender.mutateAsync({ projectId });
      setHasStarted(true);
    } catch (err) {
      console.error("Render start failed:", err);
    }
  };

  // Auto-navigate to export when complete
  useEffect(() => {
    if (renderStatus.data?.projectStatus === "complete") {
      setTimeout(() => {
        navigate(`/studio/${projectId}/export`);
      }, 2000);
    }
  }, [renderStatus.data?.projectStatus, navigate, projectId]);

  const job = renderStatus.data?.job;
  const stage = job?.stage || "queued";
  const StageIcon = stageIcons[stage] || Loader2;
  const isComplete = stage === "complete";
  const isError = stage === "error";
  const progress = job && job.totalSteps
    ? Math.round(((job.currentStep || 0) / job.totalSteps) * 100)
    : 0;

  return (
    <div className="max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="font-body font-bold text-3xl tracking-tight text-[var(--sketch-fg)]">
          Render Video
        </h2>
        <p className="font-body text-[var(--sketch-fg-muted)] mt-2">
          {hasStarted
            ? "Your video is being generated. This may take a few minutes."
            : "Ready to create your video! Click below to start the render pipeline."}
        </p>

        <div className="mt-8">
          {!hasStarted ? (
            <div className="sketch-card p-8 text-center bg-[var(--sketch-card-bg)]">
              <Sparkles className="w-16 h-16 text-[#FBBF24] mx-auto mb-4 animate-pulse" />
              <h3 className="font-body font-semibold text-xl mb-2 text-[var(--sketch-fg)]">
                Everything is ready
              </h3>
              <p className="font-body text-sm text-[var(--sketch-fg-muted)] mb-6">
                Your script, media, and voice are all set. The render pipeline will:
              </p>
              <div className="text-left max-w-sm mx-auto space-y-2 mb-6">
                {[
                  "Download stock media from Pexels",
                  "Generate voiceover for each scene",
                  "Render video segments with effects",
                  "Merge everything into a final video",
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-2 font-body text-sm text-[var(--sketch-fg-muted)]">
                    <span className="w-5 h-5 flex items-center justify-center bg-[#FBBF24]/20 border border-[var(--sketch-border-color)] rounded-full font-mono text-[10px] font-bold text-[var(--sketch-fg)]">
                      {i + 1}
                    </span>
                    {step}
                  </div>
                ))}
              </div>
              <Button
                onClick={handleStartRender}
                disabled={startRender.isPending}
                className="sketch-btn-primary"
              >
                {startRender.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Starting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Start Rendering
                  </span>
                )}
              </Button>
            </div>
          ) : (
            <div className="sketch-card p-8 bg-[var(--sketch-card-bg)]">
              {/* Progress circle */}
              <div className="flex flex-col items-center mb-6">
                <div className={`w-20 h-20 flex items-center justify-center rounded-full border-4 ${
                  isComplete
                    ? "border-emerald-500 bg-emerald-500/10"
                    : isError
                      ? "border-red-500 bg-red-500/10"
                      : "border-[#FBBF24] bg-[#FBBF24]/10"
                }`}>
                  <StageIcon className={`w-8 h-8 ${
                    isComplete
                      ? "text-emerald-500"
                      : isError
                        ? "text-red-500"
                        : "text-[#FBBF24] animate-spin"
                  }`} />
                </div>

                <h3 className="font-body font-semibold text-lg mt-4 text-[var(--sketch-fg)]">
                  {stageLabels[stage] || stage}
                </h3>

                {job?.message && (
                  <p className="font-body text-sm text-[var(--sketch-fg-muted)] mt-1">
                    {job.message}
                  </p>
                )}
              </div>

              {/* Progress bar */}
              {!isComplete && !isError && (
                <div className="w-full max-w-md mx-auto">
                  <div className="w-full h-3 bg-[var(--sketch-fg-subtle)]/20 rounded-full overflow-hidden border border-[var(--sketch-fg-subtle)]">
                    <motion.div
                      className="h-full bg-[#FBBF24]"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <div className="flex justify-between font-mono text-xs text-[var(--sketch-fg-subtle)] mt-1">
                    <span>
                      {job?.currentStep || 0} / {job?.totalSteps || 0} scenes
                    </span>
                    <span>{progress}%</span>
                  </div>
                </div>
              )}

              {isComplete && (
                <p className="font-body text-sm text-emerald-600 text-center mt-2">
                  Redirecting to export...
                </p>
              )}

              {isError && (
                <div className="text-center mt-4">
                  <p className="font-body text-sm text-red-600 mb-3">
                    {job?.message || "An error occurred during rendering."}
                  </p>
                  <Button
                    onClick={handleStartRender}
                    className="sketch-btn-primary"
                  >
                    Retry Render
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
