import { useEffect, useState } from "react";
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

  const startRender = trpc.render.start.useMutation();

  // Poll render status every 3 seconds
  const { data: status } = trpc.render.status.useQuery(
    { projectId: projectIdNum },
    {
      enabled: projectIdNum > 0 && hasStarted,
      refetchInterval: 3000,
    }
  );

  // Start render on mount
  useEffect(() => {
    if (!hasStarted && projectIdNum > 0) {
      startRender
        .mutateAsync({ projectId: projectIdNum })
        .then(() => {
          setHasStarted(true);
        })
        .catch((err) => {
          setStartError(err.message || "Failed to start render");
        });
    }
  }, [projectIdNum, hasStarted]);

  // Auto-navigate to export when complete
  useEffect(() => {
    if (
      status?.projectStatus === "complete" ||
      status?.job?.status === "complete"
    ) {
      setTimeout(() => {
        navigate(`/create/${projectIdNum}/export`);
      }, 1500);
    }
  }, [status?.projectStatus, status?.job?.status]);

  const currentStage = status?.job?.stage || "queued";
  const currentStageIndex = stages.findIndex((s) => s.key === currentStage);
  const isComplete =
    status?.projectStatus === "complete" || status?.job?.status === "complete";
  const isError =
    status?.projectStatus === "error" || status?.job?.status === "error";

  const progress = status?.job
    ? ((status.job.currentStep || 0) / (status.job.totalSteps || 1)) * 100
    : 0;

  return (
    <div className="max-w-2xl mx-auto text-center">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="relative inline-block">
          <span className="font-mono text-xs text-[var(--sketch-fg-muted)] uppercase tracking-widest bg-[#FBBF24]/20 px-2 py-1 sketch-border-sm inline-block">
            Step 6 of 7
          </span>
          {!isComplete && !isError && (
            <span className="font-hand text-xl text-[var(--sketch-fg-muted)] absolute -top-7 left-36 rotate-[3deg] animate-float hidden sm:block">
              Generating magic... ✨
            </span>
          )}
        </div>
        <h2 className="font-body font-bold text-3xl mt-3 tracking-tight text-[var(--sketch-fg)]">
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
              : "This takes 2-5 minutes. You can safely close this tab — your video will be ready."}
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
              onClick={() => navigate(`/create/${projectIdNum}/voice`)}
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
                      : "bg-[#FBBF24]"
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
                    onClick={() => navigate(`/create/${projectIdNum}/voice`)}
                  >
                    Go Back
                  </Button>
                  <Button
                    className="sketch-btn-primary"
                    onClick={() => {
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
                          ? "border-[#FBBF24] bg-[#FBBF24]/5"
                          : isDone
                            ? "border-emerald-500/50 bg-emerald-500/5"
                            : "border-[var(--sketch-fg-subtle)] bg-[var(--sketch-card-bg)]/50 opacity-50"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 flex items-center justify-center border-2 flex-shrink-0 ${
                          isActive
                            ? "border-[#FBBF24] bg-[#FBBF24]/10"
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
                        <span className="font-mono text-xs text-[#FBBF24]">
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
