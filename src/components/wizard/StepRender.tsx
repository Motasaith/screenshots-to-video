import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { motion } from "framer-motion";
import {
  Mic,
  Film,
  Merge,
  CheckCircle,
  Loader2,
  LayoutDashboard,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const stages = [
  { key: "queued", label: "Queued", icon: Loader2 },
  { key: "generating_audio", label: "Audio", icon: Mic },
  { key: "rendering_segments", label: "Segments", icon: Film },
  { key: "concatenating", label: "Merge", icon: Merge },
  { key: "finalizing", label: "Finalize", icon: CheckCircle },
];

export default function StepRender() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const projectIdNum = Number(projectId) || 0;
  const [hasStarted, setHasStarted] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const startedRef = useRef(false);

  // The job this mount is waiting on. Everything below is judged against it,
  // because `render.status` always returns the newest job for the project and
  // on a re-render that is the *previous*, already-complete one until the
  // worker picks the new one up.
  const [jobId, setJobId] = useState<number | null>(null);

  const startRender = trpc.render.start.useMutation();
  const utils = trpc.useUtils();

  const { data: status } = trpc.render.status.useQuery(
    { projectId: projectIdNum },
    {
      enabled: projectIdNum > 0 && hasStarted,
      refetchInterval: 3000,
      // Never serve the previous render's result while this one is in flight.
      staleTime: 0,
      refetchOnMount: "always",
    }
  );

  // True only once the status we are looking at describes the job we started.
  const isCurrentJob = jobId != null && status?.job?.id === jobId;

  // Elapsed time while rendering.
  //
  // This replaces a hardcoded "2-5 minutes", which was both wrong (renders are
  // several times faster now) and the kind of claim that silently rots. Elapsed
  // time is a fact rather than a prediction, so it cannot go stale, and paired
  // with the scene counter it tells the user things are still moving.
  const [nowMs, setNowMs] = useState(() => Date.now());
  const jobStartedAt =
    isCurrentJob && status?.job?.createdAt ? new Date(status.job.createdAt).getTime() : null;
  const isSettled = isCurrentJob && (status?.job?.status === "complete" || status?.job?.status === "error");

  useEffect(() => {
    if (isSettled || !jobStartedAt) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isSettled, jobStartedAt]);

  const elapsedLabel = (() => {
    if (!jobStartedAt) return null;
    const secs = Math.max(0, Math.floor((nowMs - jobStartedAt) / 1000));
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  })();

  // Start render on mount
  useEffect(() => {
    if (hasStarted || projectIdNum <= 0 || startedRef.current) return;
    startedRef.current = true;

    // Drop any cached status before asking for a new render. Otherwise the
    // first read after `hasStarted` flips returns the previous run's
    // "complete" instantly, and this screen bounces to export before the new
    // job has even been queued.
    utils.render.status.reset({ projectId: projectIdNum });

    startRender
      .mutateAsync({ projectId: projectIdNum })
      .then((res) => {
        setJobId(res.jobId ?? null);
        setHasStarted(true);
      })
      .catch((err) => {
        setStartError(err.message || "Failed to start render");
        startedRef.current = false;
      });
  }, [projectIdNum, hasStarted, startRender, utils]);

  const isComplete = isCurrentJob && status?.job?.status === "complete";
  const isError = isCurrentJob && status?.job?.status === "error";

  // Move on only when *this* job is done, and only after clearing the caches
  // the export screen reads from, so it opens on the new video rather than
  // whatever was rendered last time.
  useEffect(() => {
    if (!isComplete) return;
    const t = setTimeout(() => {
      utils.render.status.invalidate({ projectId: projectIdNum });
      utils.project.getById.invalidate({ id: projectIdNum });
      navigate(`/create/${projectIdNum}/export`);
    }, 1500);
    return () => clearTimeout(t);
  }, [isComplete, projectIdNum, navigate, utils]);

  const currentStage = (isCurrentJob && status?.job?.stage) || "queued";
  const currentStageIndex = stages.findIndex((s) => s.key === currentStage);

  const progress =
    isCurrentJob && status?.job
      ? ((status.job.currentStep || 0) / (status.job.totalSteps || 1)) * 100
      : 0;

  return (
    <div className="max-w-2xl mx-auto text-center">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {!isComplete && !isError && (
          <div className="font-hand text-xl text-[var(--sketch-fg-muted)] mb-4">
            Rendering your video…
          </div>
        )}
        <h2 className="font-body font-bold text-3xl tracking-tight text-[var(--sketch-fg)]">
          {isComplete
            ? "Video complete!"
            : isError
              ? "Something went wrong"
              : "Generating your video…"}
        </h2>
        <p className="font-body text-[var(--sketch-fg-muted)] mt-2">
          {isComplete
            ? "Redirecting to preview..."
            : isError
              ? status?.job?.message || "An error occurred during rendering."
              : (
                <>
                  Rendering runs on our servers, so you can safely close this tab
                  and come back.
                  {elapsedLabel && (
                    <span className="ml-1 font-mono text-[var(--sketch-fg-subtle)]">
                      Elapsed {elapsedLabel}.
                    </span>
                  )}
                </>
              )}
        </p>

        {startError && (
          <div className="mt-6 sketch-card p-4 border-red-500 bg-red-500/5">
            <div className="flex items-center gap-2 justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="font-body text-sm text-red-600">
                {startError}
              </span>
            </div>
            <Button
              variant="ghost"
              className="sketch-btn-ghost mt-3"
              onClick={() => navigate(`/create/${projectIdNum}/preview`)}
            >
              Go Back
            </Button>
          </div>
        )}

        {!startError && (
          <div id="render-progress" className="mt-8 scroll-mt-6">
            {/* Progress bar */}
            <div className="sketch-card p-1 mb-8 bg-[var(--sketch-card-bg)]">
              <div
                className={`h-3 transition-all duration-500 ${
                  isComplete
                    ? "bg-emerald-500"
                    : isError
                      ? "bg-red-500"
                      : "bg-brand"
                }`}
                style={{ width: `${isComplete ? 100 : Math.min(progress + 5, 95)}%`, borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px" }}
              />
            </div>

            {isComplete ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="sketch-card p-8 bg-emerald-500/5 border-emerald-500"
              >
                <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
                <h3 className="font-body font-bold text-xl text-[var(--sketch-fg)]">Complete!</h3>
                <p className="font-body text-sm text-[var(--sketch-fg-muted)] mt-2">
                  Your video is ready for preview.
                </p>
                <Button
                  onClick={() => navigate(`/create/${projectIdNum}/export`)}
                  className="sketch-btn-primary mt-4"
                >
                  View Your Video
                </Button>
              </motion.div>
            ) : isError ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="sketch-card p-8 bg-red-500/5 border-red-500"
              >
                <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                <h3 className="font-body font-bold text-xl text-[var(--sketch-fg)]">Render Failed</h3>
                <p className="font-body text-sm text-[var(--sketch-fg-muted)] mt-2 max-w-md mx-auto">
                  {status?.job?.message || "An unexpected error occurred."}
                </p>
                <div className="flex gap-3 justify-center mt-4">
                  <Button
                    variant="ghost"
                    className="sketch-btn-ghost"
                    onClick={() => navigate(`/create/${projectIdNum}/preview`)}
                  >
                    Go Back
                  </Button>
                  <Button
                    className="sketch-btn-primary"
                    onClick={() => {
                      utils.render.status.setData({ projectId: projectIdNum }, undefined);
                      startedRef.current = false;
                      setHasStarted(false);
                      setStartError(null);
                    }}
                  >
                    Retry
                  </Button>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {stages.map((stage, i) => {
                  const Icon = stage.icon;
                  const isActive = i === currentStageIndex;
                  const isDone = i < currentStageIndex;

                  return (
                    <motion.div
                      key={stage.key}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`sketch-card p-4 flex items-center gap-4 ${
                        isActive
                          ? "border-brand bg-brand/5"
                          : isDone
                            ? "border-emerald-500/50 bg-emerald-500/5"
                            : "border-[var(--sketch-fg-subtle)] bg-[var(--sketch-card-bg)]/50 opacity-50"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 flex items-center justify-center border-2 flex-shrink-0 ${
                          isActive
                            ? "border-brand bg-brand/10"
                            : isDone
                              ? "border-emerald-500 bg-emerald-500/10"
                              : "border-[var(--sketch-fg-subtle)] bg-[var(--sketch-card-bg)]"
                        }`}
                        style={{ borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px" }}
                      >
                        {isDone ? (
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        ) : isActive ? (
                          <Loader2 className="w-5 h-5 text-[var(--sketch-fg)] animate-spin" />
                        ) : (
                          <Icon className="w-5 h-5 text-[var(--sketch-fg-subtle)]" />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <span
                          className={`font-body text-sm font-medium ${
                            isActive
                              ? "text-[var(--sketch-fg)]"
                              : isDone
                                ? "text-emerald-600"
                                : "text-[var(--sketch-fg-subtle)]"
                          }`}
                        >
                          {stage.label}
                        </span>
                        {isActive && (
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="font-mono text-xs text-[var(--sketch-fg-subtle)] mt-0.5"
                          >
                            {status?.job?.message || "Processing..."}
                          </motion.p>
                        )}
                      </div>
                      {isActive && (
                        <span className="font-mono text-xs text-brand">
                          {status?.job?.currentStep || 0}/{status?.job?.totalSteps || "?"}
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}

            {!isComplete && !isError && (
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="ghost"
                  className="sketch-btn-ghost"
                  onClick={() => navigate("/dashboard")}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Go to Dashboard
                </Button>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
