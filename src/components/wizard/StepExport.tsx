import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { motion } from "framer-motion";
import {
  Download,
  Link2,
  RefreshCw,
  Film,
  Check,
  Clock,
  Monitor,
  HardDrive,
  Sparkles,
  Plus,
  LayoutDashboard,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StepExport() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const projectIdNum = Number(projectId) || 0;
  const [regeneratingStep, setRegeneratingStep] = useState<number | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { data: project, isLoading } = trpc.project.getById.useQuery(
    { id: projectIdNum },
    { enabled: projectIdNum > 0 }
  );

  const { data: renderStatus } = trpc.render.status.useQuery(
    { projectId: projectIdNum },
    { enabled: projectIdNum > 0 }
  );

  const regenerateStep = trpc.render.regenerateStep.useMutation();
  const utils = trpc.useUtils();

  const handleRegenerate = async (stepId: number) => {
    setRegeneratingStep(stepId);
    await regenerateStep.mutateAsync({ stepId });
    utils.project.getById.invalidate({ id: projectIdNum });
    utils.render.status.invalidate({ projectId: projectIdNum });
    setRegeneratingStep(null);
  };

  const handleDownload = async () => {
    const videoUrl = renderStatus?.finalVideoUrl;
    if (!videoUrl) return;

    // Trigger download via a temporary link
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `${project?.title || "video"}.mp4`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyLink = async () => {
    const videoUrl = renderStatus?.finalVideoUrl;
    if (!videoUrl) return;

    try {
      await navigator.clipboard.writeText(videoUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = videoUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const totalDuration =
    project?.steps?.reduce((acc, s) => acc + (s.audioDuration || 0), 0) || 0;

  const videoUrl = renderStatus?.finalVideoUrl;
  const hasVideo = !!videoUrl;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <span className="font-mono text-xs text-primary uppercase tracking-widest">
          Step 7 of 7
        </span>
        <h2 className="font-syne font-bold text-3xl mt-2 tracking-tight">
          Your video is ready 🎬
        </h2>

        {/* Video player */}
        <div className="mt-6 neo-card p-6 bg-accent/5 border-accent">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-accent/10 border-2 border-accent flex items-center justify-center">
              <Film className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="font-syne font-bold text-lg">{project?.title}</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="font-mono text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {Math.round(totalDuration)}s
                </span>
                <span className="font-mono text-xs text-muted-foreground flex items-center gap-1">
                  <Monitor className="w-3 h-3" />
                  {project?.resolution}
                </span>
                <span className="font-mono text-xs text-muted-foreground flex items-center gap-1">
                  <HardDrive className="w-3 h-3" />
                  {project?.platform}
                </span>
              </div>
            </div>
          </div>

          {/* Video element or placeholder */}
          <div className="relative aspect-video bg-black border-2 border-border overflow-hidden mb-4">
            {hasVideo ? (
              <>
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  controls
                >
                  Your browser does not support video playback.
                </video>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  {project?.status === "processing" ? (
                    <>
                      <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-3" />
                      <p className="font-dm text-sm text-muted-foreground">
                        Video is still rendering...
                      </p>
                    </>
                  ) : (
                    <>
                      <Film className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="font-dm text-sm text-muted-foreground">
                        Video preview not available
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              className="neo-btn-primary flex-1"
              onClick={handleDownload}
              disabled={!hasVideo}
            >
              <Download className="w-4 h-4" />
              Download MP4
            </Button>
            <Button
              variant="ghost"
              className="border-2 border-border flex-1"
              onClick={handleCopyLink}
              disabled={!hasVideo}
            >
              {linkCopied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  Copy Link
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Step breakdown */}
        <div className="mt-8">
          <h3 className="font-syne font-semibold text-lg mb-4">
            Step Breakdown
          </h3>
          <div className="space-y-3">
            {project?.steps?.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="neo-card p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-muted border border-border flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {step.screenshotPath ? (
                      <img
                        src={step.screenshotPath}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {index + 1}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-dm text-sm truncate">
                        {step.description.length > 50
                          ? step.description.slice(0, 50) + "..."
                          : step.description}
                      </p>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <span className="font-mono text-xs text-muted-foreground">
                          {Math.round(step.audioDuration || 0)}s
                        </span>
                        <button
                          onClick={() => handleRegenerate(step.id)}
                          disabled={regeneratingStep === step.id}
                          className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                          title="Re-render this step"
                        >
                          <RefreshCw
                            className={`w-3 h-3 ${
                              regeneratingStep === step.id ? "animate-spin" : ""
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
                        <Check className="w-3 h-3 text-accent" />
                        Script
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
                        {step.audioPath ? (
                          <Check className="w-3 h-3 text-accent" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        Audio
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
                        {step.videoSegmentPath ? (
                          <Check className="w-3 h-3 text-accent" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        Video
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* AI Quality Review */}
        <div className="mt-8 neo-card p-5 bg-primary/5 border-primary">
          <h3 className="font-syne font-semibold text-lg mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Quality Review
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-dm text-sm">Script Clarity</span>
              <span className="font-mono text-sm text-accent">Excellent</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-dm text-sm">Zoom Accuracy</span>
              <span className="font-mono text-sm text-accent">
                {project?.steps?.filter((s) => s.zoomTargetX != null).length || 0}/
                {project?.steps?.length || 0} steps
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-dm text-sm">Audio Coverage</span>
              <span className="font-mono text-sm text-accent">
                {project?.steps?.filter((s) => s.audioPath).length || 0}/
                {project?.steps?.length || 0} steps
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <Button
            variant="ghost"
            className="border-2 border-border flex-1"
            onClick={() => navigate("/dashboard")}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Button>
          <Button
            className="neo-btn-primary flex-1"
            onClick={() => navigate("/create/0/setup")}
          >
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
