import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import {
  RefreshCw,
  Film,
  Check,
  Clock,
  Monitor,
  HardDrive,
  ClipboardCheck,
  Plus,
  LayoutDashboard,
  Loader2,
  ChevronLeft,
} from "lucide-react";
import { stepThumbUrl } from "@/lib/thumbUrl";
import { Button } from "@/components/ui/button";
import SocialShare from "./SocialShare";

export default function StepExport() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const projectIdNum = Number(projectId) || 0;
  const [regeneratingStep, setRegeneratingStep] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useAuth();

  // `refetchOnMount: "always"` on both queries is the fix for landing here
  // after a re-render and seeing the previous video. Arriving on this screen
  // reuses the cache entry from the last visit, and a finished render changes
  // the answer, so the cached copy is always suspect on arrival.
  const { data: project, isLoading } = trpc.project.getById.useQuery(
    { id: projectIdNum },
    { enabled: projectIdNum > 0, refetchOnMount: "always", staleTime: 0 }
  );

  const { data: renderStatus } = trpc.render.status.useQuery(
    { projectId: projectIdNum },
    {
      enabled: projectIdNum > 0,
      refetchOnMount: "always",
      staleTime: 0,
      // Keep polling while a render is still running. Someone who opens this
      // screen from the dashboard mid-render, or who gets here just before
      // the worker finishes, should see the video appear on its own rather
      // than having to reload the page.
      refetchInterval: (query) =>
        query.state.data?.job?.status === "processing" ||
        query.state.data?.job?.status === "queued"
          ? 3000
          : false,
    }
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

  const totalDuration =
    project?.steps?.reduce((acc, s) => acc + (s.audioDuration || 0), 0) || 0;

  const videoUrl = renderStatus?.finalVideoUrl;
  const hasVideo = !!videoUrl;

  // Calculate expiry info
  const isFreeUser = user?.plan === "free";
  const expiresAt = project?.expiresAt ? new Date(project.expiresAt) : null;
  const daysLeft = expiresAt
    // eslint-disable-next-line react-hooks/purity -- display-only relative time
    ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-[var(--sketch-fg-muted)] font-body">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="relative inline-block mb-1">
          <span className="font-hand text-xl text-[var(--sketch-fg-muted)] hidden sm:block">
            All done
          </span>
        </div>
        <h2 className="font-body font-bold text-2xl sm:text-3xl tracking-tight text-[var(--sketch-fg)]">
          Your video is ready
        </h2>

        {/* Responsive layout grid */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Column: Player & Navigation (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Video player - sketched frame */}
            <div id="export-player" className="sketch-card p-4 sm:p-6 bg-[var(--sketch-card-bg)] border-[var(--sketch-border-color)] scroll-mt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-brand/10 border-2 border-brand flex items-center justify-center sketch-border-sm">
                  <Film className="w-6 h-6 text-[var(--sketch-fg)]" />
                </div>
                <div>
                  <h3 className="font-body font-bold text-lg text-[var(--sketch-fg)]">{project?.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="font-mono text-xs text-[var(--sketch-fg-subtle)] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {Math.round(totalDuration)}s
                    </span>
                    <span className="font-mono text-xs text-[var(--sketch-fg-subtle)] flex items-center gap-1">
                      <Monitor className="w-3 h-3" />
                      {project?.resolution}
                    </span>
                    <span className="font-mono text-xs text-[var(--sketch-fg-subtle)] flex items-center gap-1">
                      <HardDrive className="w-3 h-3" />
                      {project?.platform}
                    </span>
                  </div>
                </div>
              </div>

              {/* Video element or placeholder - sketched monitor frame */}
              <div className="relative aspect-video bg-[var(--sketch-fg)] border-2 border-[var(--sketch-border-color)] overflow-hidden mb-4 sketch-border-lg">
                {hasVideo ? (
                  <>
                    {/* Keyed on the storage path, not the URL.
                        The path changes once per render (the worker writes
                        `final_<id>_<timestamp>.mp4`), so a new render swaps in
                        a fresh <video> instead of leaving the old buffered
                        media in place. The signed URL is regenerated on every
                        poll, so keying on that would tear the player down
                        mid-playback every three seconds. */}
                    <video
                      key={renderStatus?.finalVideoPath ?? "no-video"}
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
                          <Loader2 className="w-12 h-12 text-brand animate-spin mx-auto mb-3" />
                          <p className="font-body text-sm text-[var(--sketch-bg)]/70">
                            Video is still rendering...
                          </p>
                        </>
                      ) : (
                        <>
                          <Film className="w-12 h-12 text-[var(--sketch-bg)]/40 mx-auto mb-3" />
                          <p className="font-body text-sm text-[var(--sketch-bg)]/50">
                            Video preview not available
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {isFreeUser && daysLeft !== null && (
                <div className="mt-4 p-3 bg-amber-500/10 border-2 border-amber-500 sketch-border-sm">
                  <p className="font-body text-sm text-amber-700">
                    ⏳ Free tier: This video expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""}.
                    Download now to keep it.
                  </p>
                </div>
              )}
            </div>

            {/* Navigation buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              {/* Back goes to the editor, not to the render screen.
                  The render screen starts a render the moment it mounts and
                  navigates here again as soon as one finishes, so pointing
                  "Back" at it meant kicking off a spurious render and being
                  bounced straight back: the button looked broken because
                  there was nowhere to land. */}
              <Button
                variant="ghost"
                type="button"
                onClick={() => navigate(`/create/${projectIdNum}/preview`)}
                className="sketch-btn-ghost flex-1 w-full"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to editor
              </Button>
              <Button
                variant="ghost"
                className="sketch-btn-ghost flex-1 w-full"
                onClick={() => navigate("/dashboard")}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Button>
              <Button
                className="sketch-btn-primary flex-1 w-full"
                onClick={() => navigate("/dashboard")}
              >
                <Plus className="w-4 h-4" />
                New Project
              </Button>
            </div>
          </div>

          {/* Right Column: Share, Breakdown, AI Review (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Social Share: appears after video is ready */}
            <SocialShare
              videoUrl={videoUrl || undefined}
              title={project?.title || "My AIVideo Tutorial"}
              description={project?.description || undefined}
            />

            {/* Step breakdown */}
            <div id="export-breakdown" className="sketch-card p-5 bg-[var(--sketch-card-bg)] scroll-mt-6">
              <h3 className="font-body font-semibold text-lg mb-4 text-[var(--sketch-fg)]">
                Step Breakdown
              </h3>
              <div className="space-y-3 max-h-[350px] overflow-y-auto scrollbar-thin pr-2">
                {project?.steps?.map((step, index) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="sketch-card p-4 bg-[var(--sketch-card-bg)]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-[var(--sketch-card-bg)] border-2 border-[var(--sketch-border-color)] flex-shrink-0 flex items-center justify-center overflow-hidden sketch-border-sm">
                        {step.screenshotPath ? (
                          <img
                            src={stepThumbUrl(step.id, step.screenshotPath) ?? step.screenshotPath}
                            alt=""
                            width={40}
                            height={40}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <span className="font-hand text-lg text-[var(--sketch-fg-subtle)]">
                            {index + 1}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-body text-sm truncate text-[var(--sketch-fg)]">
                            {step.description.length > 50
                              ? step.description.slice(0, 50) + "..."
                              : step.description}
                          </p>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                            <span className="font-mono text-xs text-[var(--sketch-fg-subtle)]">
                              {Math.round(step.audioDuration || 0)}s
                            </span>
                            <button
                              onClick={() => handleRegenerate(step.id)}
                              disabled={regeneratingStep === step.id}
                              className="text-[var(--sketch-fg-subtle)] hover:text-[var(--sketch-fg)] transition-colors disabled:opacity-50"
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
                          <span className="font-mono text-[10px] text-[var(--sketch-fg-subtle)] flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Script
                          </span>
                          <span className="font-mono text-[10px] text-[var(--sketch-fg-subtle)] flex items-center gap-1">
                            {step.audioPath ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            Audio
                          </span>
                          <span className="font-mono text-[10px] text-[var(--sketch-fg-subtle)] flex items-center gap-1">
                            {step.status === "done" ? (
                              <Check className="w-3 h-3 text-emerald-600" />
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
            <div className="sketch-card p-5 bg-brand/5 border-brand">
              <h3 className="font-body font-semibold text-lg mb-3 flex items-center gap-2 text-[var(--sketch-fg)]">
                <ClipboardCheck className="w-5 h-5 text-brand" />
                AI Quality Review
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-body text-sm text-[var(--sketch-fg)]">Script Clarity</span>
                  <span className="font-mono text-sm text-emerald-600">Excellent</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-body text-sm text-[var(--sketch-fg)]">Zoom Accuracy</span>
                  <span className="font-mono text-sm text-emerald-600">
                    {project?.steps?.filter((s) => s.zoomTargetX != null).length || 0}/
                    {project?.steps?.length || 0} steps
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-body text-sm text-[var(--sketch-fg)]">Audio Coverage</span>
                  <span className="font-mono text-sm text-emerald-600">
                    {project?.steps?.filter((s) => s.audioPath).length || 0}/
                    {project?.steps?.length || 0} steps
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
