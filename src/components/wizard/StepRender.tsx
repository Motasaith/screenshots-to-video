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
        <span className="font-mono text-xs text-primary uppercase tracking-widest">
          Step 6 of 7
        </span>
        <h2 className="font-syne font-bold text-3xl mt-2 tracking-tight">
          {isComplete
            ? "Video complete!"
            : isError
              ? "Something went wrong"
              : "Generating your video…"}
        </h2>
        <p className="font-dm text-muted-foreground mt-2">
          {isComplete
            ? "Redirecting to preview..."
            : isError
              ? status?.job?.message || "An error occurred during rendering."
              : "This takes 2-5 minutes. You can safely close this tab — your video will be ready."}
        </p>

        {startError && (
          <div className="mt-6 neo-card p-4 border-destructive bg-destructive/5">
            <div className="flex items-center gap-2 justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <span className="font-dm text-sm text-destructive">
                {startError}
              </span>
            </div>
            <Button
              variant="ghost"
              className="border-2 border-border mt-3"
              onClick={() => navigate(`/create/${projectIdNum}/voice`)}
            >
              Go Back
            </Button>
          </div>
        )}

        {!startError && (
          <div className="mt-8">
            {/* Progress bar */}
            <div className="neo-card p-1 mb-8">
              <div
                className={`h-2 transition-all duration-500 ${
                  isComplete
                    ? "bg-accent"
                    : isError
                      ? "bg-destructive"
                      : "bg-primary"
                }`}
                style={{ width: `${isComplete ? 100 : Math.min(progress + 5, 95)}%` }}
              />
            </div>

            {isComplete ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="neo-card p-8 bg-accent/10 border-accent"
              >
                <CheckCircle className="w-12 h-12 text-accent mx-auto mb-4" />
                <h3 className="font-syne font-bold text-xl">Complete!</h3>
                <p className="font-dm text-sm text-muted-foreground mt-2">
                  Your video is ready for preview.
                </p>
                <Button
                  onClick={() => navigate(`/create/${projectIdNum}/export`)}
                  className="neo-btn-primary mt-4"
                >
                  View Your Video
                </Button>
              </motion.div>
            ) : isError ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="neo-card p-8 bg-destructive/5 border-destructive"
              >
                <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h3 className="font-syne font-bold text-xl">Render Failed</h3>
                <p className="font-dm text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                  {status?.job?.message || "An unexpected error occurred."}
                </p>
                <div className="flex gap-3 justify-center mt-4">
                  <Button
                    variant="ghost"
                    className="border-2 border-border"
                    onClick={() => navigate(`/create/${projectIdNum}/voice`)}
                  >
                    Go Back
                  </Button>
                  <Button
                    className="neo-btn-primary"
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
                      className={`neo-card p-4 flex items-center gap-4 ${
                        isActive
                          ? "border-primary bg-primary/5"
                          : isDone
                            ? "border-accent/50 bg-accent/5"
                            : "border-border bg-muted/30 opacity-50"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 flex items-center justify-center border-2 flex-shrink-0 ${
                          isActive
                            ? "border-primary bg-primary/10"
                            : isDone
                              ? "border-accent bg-accent/10"
                              : "border-border bg-muted"
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle className="w-5 h-5 text-accent" />
                        ) : isActive ? (
                          <Loader2 className="w-5 h-5 text-primary animate-spin" />
                        ) : (
                          <Icon className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <span
                          className={`font-dm text-sm font-medium ${
                            isActive
                              ? "text-primary"
                              : isDone
                                ? "text-accent"
                                : "text-muted-foreground"
                          }`}
                        >
                          {stage.label}
                        </span>
                        {isActive && (
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="font-mono text-xs text-muted-foreground mt-0.5"
                          >
                            {status?.job?.message || "Processing..."}
                          </motion.p>
                        )}
                      </div>
                      {isActive && (
                        <span className="font-mono text-xs text-primary">
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
                  className="border-2 border-border"
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
