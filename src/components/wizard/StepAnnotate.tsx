import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Target,
  Sparkles,
  Check,
  MousePointer,
  Square,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StepAnnotate() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const projectIdNum = Number(projectId) || 0;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [annotations, setAnnotations] = useState<
    Record<
      number,
      {
        zoomTargetX?: number | null;
        zoomTargetY?: number | null;
        zoomRectX?: number | null;
        zoomRectY?: number | null;
        zoomRectWidth?: number | null;
        zoomRectHeight?: number | null;
      }
    >
  >({});
  const [mode, setMode] = useState<"point" | "rect">("rect");
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const { data: project, isLoading } = trpc.project.getById.useQuery(
    { id: projectIdNum },
    { enabled: projectIdNum > 0 }
  );

  const suggestZooms = trpc.ai.suggestZooms.useMutation();
  const updateStep = trpc.step.update.useMutation();
  const utils = trpc.useUtils();

  const steps = project?.steps || [];
  const currentStep = steps[currentStepIndex];

  useEffect(() => {
    if (project?.steps) {
      const initial: typeof annotations = {};
      project.steps.forEach((s) => {
        if (s.zoomTargetX != null) {
          initial[s.id] = {
            zoomTargetX: s.zoomTargetX,
            zoomTargetY: s.zoomTargetY,
            zoomRectX: s.zoomRectX,
            zoomRectY: s.zoomRectY,
            zoomRectWidth: s.zoomRectWidth,
            zoomRectHeight: s.zoomRectHeight,
          };
        }
      });
      setAnnotations(initial);
    }
  }, [project]);

  const getCanvasCoords = useCallback(
    (e: React.MouseEvent) => {
      if (!canvasRef.current) return null;
      const rect = canvasRef.current.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      };
    },
    []
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!currentStep) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;
    setIsDragging(true);
    setDragStart(coords);
    setDragCurrent(coords);

    if (mode === "point") {
      setAnnotations((prev) => ({
        ...prev,
        [currentStep.id]: {
          ...prev[currentStep.id],
          zoomTargetX: coords.x,
          zoomTargetY: coords.y,
        },
      }));
      setIsDragging(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || mode === "point") return;
    const coords = getCanvasCoords(e);
    if (coords) setDragCurrent(coords);
  };

  const handleMouseUp = () => {
    if (!isDragging || !dragStart || !dragCurrent || !currentStep) return;

    if (mode === "rect") {
      const x = Math.min(dragStart.x, dragCurrent.x);
      const y = Math.min(dragStart.y, dragCurrent.y);
      const width = Math.abs(dragCurrent.x - dragStart.x);
      const height = Math.abs(dragCurrent.y - dragStart.y);

      if (width > 2 && height > 2) {
        setAnnotations((prev) => ({
          ...prev,
          [currentStep.id]: {
            zoomRectX: x,
            zoomRectY: y,
            zoomRectWidth: width,
            zoomRectHeight: height,
            zoomTargetX: x + width / 2,
            zoomTargetY: y + height / 2,
          },
        }));
      }
    }

    setIsDragging(false);
    setDragStart(null);
    setDragCurrent(null);
  };

  const handleSuggestAll = async () => {
    await suggestZooms.mutateAsync({ projectId: projectIdNum });
    utils.project.getById.invalidate({ id: projectIdNum });
  };

  const cleanAnn = (ann: typeof annotations[number]) => {
    const cleaned: Record<string, number | undefined> = {};
    if (ann.zoomTargetX != null) cleaned.zoomTargetX = ann.zoomTargetX;
    if (ann.zoomTargetY != null) cleaned.zoomTargetY = ann.zoomTargetY;
    if (ann.zoomRectX != null) cleaned.zoomRectX = ann.zoomRectX;
    if (ann.zoomRectY != null) cleaned.zoomRectY = ann.zoomRectY;
    if (ann.zoomRectWidth != null) cleaned.zoomRectWidth = ann.zoomRectWidth;
    if (ann.zoomRectHeight != null) cleaned.zoomRectHeight = ann.zoomRectHeight;
    return cleaned;
  };

  const handleContinue = async () => {
    for (const [stepId, ann] of Object.entries(annotations)) {
      await updateStep.mutateAsync({
        id: Number(stepId),
        ...cleanAnn(ann),
      });
    }
    navigate(`/create/${projectIdNum}/voice`);
  };

  const currentAnn = currentStep ? annotations[currentStep.id] : null;
  const rect = currentAnn
    ? {
        x: currentAnn.zoomRectX,
        y: currentAnn.zoomRectY,
        w: currentAnn.zoomRectWidth,
        h: currentAnn.zoomRectHeight,
      }
    : null;

  const tempRect =
    isDragging && dragStart && dragCurrent
      ? {
          x: Math.min(dragStart.x, dragCurrent.x),
          y: Math.min(dragStart.y, dragCurrent.y),
          w: Math.abs(dragCurrent.x - dragStart.x),
          h: Math.abs(dragCurrent.y - dragStart.y),
        }
      : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <span className="font-mono text-xs text-primary uppercase tracking-widest">
          Step 4 of 7
        </span>
        <h2 className="font-syne font-bold text-3xl mt-2 tracking-tight">
          Mark what matters
        </h2>
        <p className="font-dm text-muted-foreground mt-2">
          Click a point or drag a rectangle on each screenshot to set the zoom target.
        </p>

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={() => setMode("rect")}
            className={`flex items-center gap-2 px-3 py-2 border-2 text-sm font-dm transition-all ${
              mode === "rect"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-foreground/30"
            }`}
          >
            <Square className="w-4 h-4" />
            Rectangle
          </button>
          <button
            onClick={() => setMode("point")}
            className={`flex items-center gap-2 px-3 py-2 border-2 text-sm font-dm transition-all ${
              mode === "point"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-foreground/30"
            }`}
          >
            <MousePointer className="w-4 h-4" />
            Point
          </button>
          <button
            onClick={handleSuggestAll}
            disabled={suggestZooms.isPending}
            className="flex items-center gap-2 px-3 py-2 border-2 border-border text-sm font-dm hover:border-primary hover:bg-primary/5 transition-all ml-auto"
          >
            <Sparkles className="w-4 h-4" />
            Auto-suggest All
          </button>
        </div>

        <div className="mt-6 grid lg:grid-cols-[1fr_280px] gap-6">
          <div className="neo-card p-4 overflow-hidden">
            {currentStep && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs text-muted-foreground">
                    Step {currentStepIndex + 1} of {steps.length}
                  </span>
                  {currentAnn?.zoomTargetX != null && (
                    <span className="flex items-center gap-1 text-xs font-mono text-accent">
                      <Check className="w-3 h-3" />
                      Marked
                    </span>
                  )}
                </div>

                <div
                  ref={canvasRef}
                  className="relative w-full aspect-video bg-muted border-2 border-border cursor-crosshair overflow-hidden"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {currentStep.screenshotPath ? (
                    <img
                      src={currentStep.screenshotPath}
                      alt={`Step ${currentStepIndex + 1}`}
                      className="w-full h-full object-contain"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <Target className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                        <p className="font-dm text-sm text-muted-foreground">
                          No screenshot uploaded
                        </p>
                      </div>
                    </div>
                  )}

                  {rect && rect.x != null && (
                    <div
                      className="absolute border-2 border-primary bg-primary/10 pointer-events-none"
                      style={{
                        left: `${rect.x}%`,
                        top: `${rect.y}%`,
                        width: `${rect.w}%`,
                        height: `${rect.h}%`,
                      }}
                    />
                  )}

                  {currentAnn?.zoomTargetX != null && (
                    <div
                      className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                      style={{
                        left: `${currentAnn.zoomTargetX}%`,
                        top: `${currentAnn.zoomTargetY}%`,
                      }}
                    >
                      <div className="w-full h-full bg-primary rounded-full border-2 border-white shadow-lg" />
                    </div>
                  )}

                  {tempRect && (
                    <div
                      className="absolute border-2 border-dashed border-primary/50 bg-primary/5 pointer-events-none"
                      style={{
                        left: `${tempRect.x}%`,
                        top: `${tempRect.y}%`,
                        width: `${tempRect.w}%`,
                        height: `${tempRect.h}%`,
                      }}
                    />
                  )}
                </div>

                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setCurrentStepIndex(Math.max(0, currentStepIndex - 1))
                    }
                    disabled={currentStepIndex === 0}
                    className="border-2 border-border"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Prev
                  </Button>
                  <span className="font-mono text-xs text-muted-foreground">
                    {currentStep.description.length > 40
                      ? currentStep.description.slice(0, 40) + "..."
                      : currentStep.description}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setCurrentStepIndex(
                        Math.min(steps.length - 1, currentStepIndex + 1)
                      )
                    }
                    disabled={currentStepIndex === steps.length - 1}
                    className="border-2 border-border"
                  >
                    Next
                    <ChevronRightIcon className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <p className="font-dm text-sm font-medium mb-3">
              Steps
            </p>
            {steps.map((s, i) => {
              const ann = annotations[s.id];
              const isMarked = ann?.zoomTargetX != null;
              return (
                <button
                  key={s.id}
                  onClick={() => setCurrentStepIndex(i)}
                  className={`w-full text-left p-3 border-2 transition-all flex items-center gap-3 ${
                    i === currentStepIndex
                      ? "border-primary bg-primary/5"
                      : isMarked
                        ? "border-border bg-card"
                        : "border-border/50 bg-muted/50"
                  }`}
                >
                  <span className="font-mono text-xs text-muted-foreground w-5">
                    {i + 1}
                  </span>
                  <div className="w-8 h-8 bg-muted border border-border flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {s.screenshotPath ? (
                      <img
                        src={s.screenshotPath}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[8px] text-muted-foreground">
                        IMG
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-dm text-xs truncate">
                      {s.description.length > 30
                        ? s.description.slice(0, 30) + "..."
                        : s.description}
                    </p>
                  </div>
                  {isMarked ? (
                    <Check className="w-3 h-3 text-accent flex-shrink-0" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border border-muted-foreground flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <Button
          onClick={handleContinue}
          disabled={updateStep.isPending}
          className="neo-btn-primary mt-6 w-full"
        >
          <span className="flex items-center gap-2">
            Continue
            <ChevronRightIcon className="w-4 h-4" />
          </span>
        </Button>
      </motion.div>
    </div>
  );
}
