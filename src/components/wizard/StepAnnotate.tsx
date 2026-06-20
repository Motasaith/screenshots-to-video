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

/**
 * Compute the visible bounds of an image rendered with object-contain
 * inside its container. Returns the offset and scale so we can map
 * mouse coordinates to image-relative percentages (0-100).
 */
function getImageBounds(container: HTMLDivElement, img: HTMLImageElement) {
  const containerRect = container.getBoundingClientRect();
  const cw = containerRect.width;
  const ch = containerRect.height;
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;

  if (!nw || !nh) return null;

  const containerAspect = cw / ch;
  const imageAspect = nw / nh;

  let visibleW: number, visibleH: number, offsetX: number, offsetY: number;

  if (imageAspect > containerAspect) {
    // Image is wider than container → letterbox top/bottom
    visibleW = cw;
    visibleH = cw / imageAspect;
    offsetX = 0;
    offsetY = (ch - visibleH) / 2;
  } else {
    // Image is taller than container → letterbox left/right
    visibleH = ch;
    visibleW = ch * imageAspect;
    offsetX = (cw - visibleW) / 2;
    offsetY = 0;
  }

  return { visibleW, visibleH, offsetX, offsetY, cw, ch };
}

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
  const imageRef = useRef<HTMLImageElement>(null);
  const [bounds, setBounds] = useState<ReturnType<typeof getImageBounds>>(null);

  const { data: project, isLoading } = trpc.project.getById.useQuery(
    { id: projectIdNum },
    { enabled: projectIdNum > 0 }
  );

  const suggestZooms = trpc.ai.suggestZooms.useMutation();
  const updateStep = trpc.step.update.useMutation();
  const utils = trpc.useUtils();

  const steps = project?.steps || [];
  const currentStep = steps[currentStepIndex];

  // Sync project step data into local annotation state (documented "adjust
  // state when external data arrives" pattern).
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnnotations(initial);
    }
  }, [project]);

  // Keep the cached image bounds in state so overlays can be positioned without
  // reading refs during render (which React's purity rules forbid).
  const refreshBounds = useCallback(() => {
    const container = canvasRef.current;
    const img = imageRef.current;
    setBounds(container && img ? getImageBounds(container, img) : null);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial bounds measurement on mount
    refreshBounds();
    window.addEventListener("resize", refreshBounds);
    return () => window.removeEventListener("resize", refreshBounds);
  }, [refreshBounds]);

  /**
   * Convert a mouse event to image-relative percentage coordinates (0-100).
   * Accounts for object-contain letterboxing so coordinates are always
   * relative to the actual image, not the container.
   */
  const getCanvasCoords = useCallback(
    (e: React.MouseEvent) => {
      if (!canvasRef.current) return null;
      const container = canvasRef.current;
      const img = imageRef.current;
      const containerRect = container.getBoundingClientRect();

      // If we have a loaded image, account for object-contain offset
      if (img && img.naturalWidth && img.naturalHeight) {
        const bounds = getImageBounds(container, img);
        if (bounds) {
          const mouseX = e.clientX - containerRect.left;
          const mouseY = e.clientY - containerRect.top;

          // Map mouse position to image-relative percentage
          const imgRelX = ((mouseX - bounds.offsetX) / bounds.visibleW) * 100;
          const imgRelY = ((mouseY - bounds.offsetY) / bounds.visibleH) * 100;

          // Clamp to 0-100 so we don't go outside the image
          return {
            x: Math.max(0, Math.min(100, imgRelX)),
            y: Math.max(0, Math.min(100, imgRelY)),
          };
        }
      }

      // Fallback: use full container (works when image fills container)
      return {
        x: ((e.clientX - containerRect.left) / containerRect.width) * 100,
        y: ((e.clientY - containerRect.top) / containerRect.height) * 100,
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
    navigate(`/create/${projectIdNum}/preview`);
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
        <Loader2 className="w-8 h-8 animate-spin text-[var(--sketch-fg)]" />
      </div>
    );
  }

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="relative">
          <span className="font-mono text-xs text-[var(--sketch-fg-muted)] uppercase tracking-widest bg-[#FBBF24]/20 px-2 py-1 sketch-border-sm inline-block">
            Step 4 of 7
          </span>
          <span className="font-hand text-lg text-[var(--sketch-fg-muted)] absolute -top-6 left-32 rotate-[-3deg] animate-float hidden sm:block">
            Click or drag to zoom! 🎯
          </span>
        </div>
        <h2 className="font-body font-bold text-3xl mt-3 tracking-tight text-[var(--sketch-fg)]">
          Mark what matters
        </h2>
        <p className="font-body text-[var(--sketch-fg-muted)] mt-2">
          Click a point or drag a rectangle on each screenshot to set the zoom target.
        </p>

        <div className="mt-6 flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setMode("rect")}
            className={`flex items-center gap-2 px-3 py-2 border-2 text-sm font-body transition-all ${
              mode === "rect"
                ? "border-[var(--sketch-border-color)] bg-[#FBBF24]/10 shadow-[3px_3px_0px_0px_#FBBF24]"
                : "border-[var(--sketch-fg-subtle)] hover:border-[var(--sketch-border-color)]/40"
            }`}
            style={{ borderRadius: mode === "rect" ? "255px 15px 225px 15px/15px 225px 15px 255px" : "8px" }}
          >
            <Square className="w-4 h-4" />
            Rectangle
          </button>
          <button
            onClick={() => setMode("point")}
            className={`flex items-center gap-2 px-3 py-2 border-2 text-sm font-body transition-all ${
              mode === "point"
                ? "border-[var(--sketch-border-color)] bg-[#FBBF24]/10 shadow-[3px_3px_0px_0px_#FBBF24]"
                : "border-[var(--sketch-fg-subtle)] hover:border-[var(--sketch-border-color)]/40"
            }`}
            style={{ borderRadius: mode === "point" ? "255px 15px 225px 15px/15px 225px 15px 255px" : "8px" }}
          >
            <MousePointer className="w-4 h-4" />
            Point
          </button>
          <button
            onClick={handleSuggestAll}
            disabled={suggestZooms.isPending}
            className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-[var(--sketch-fg-subtle)] text-sm font-body hover:border-[var(--sketch-border-color)] hover:bg-[#FBBF24]/5 transition-all ml-auto"
            style={{ borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px" }}
          >
            <Sparkles className="w-4 h-4" />
            Auto-suggest All
          </button>
        </div>

        <div className="mt-6 grid lg:grid-cols-[1fr_280px] gap-6">
          <div className="sketch-card p-4 overflow-hidden bg-[var(--sketch-card-bg)]">
            {currentStep && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs text-[var(--sketch-fg-subtle)]">
                    Step {currentStepIndex + 1} of {steps.length}
                  </span>
                  {currentAnn?.zoomTargetX != null && (
                    <span className="flex items-center gap-1 text-xs font-mono text-emerald-600">
                      <Check className="w-3 h-3" />
                      Marked
                    </span>
                  )}
                </div>

                <div
                  ref={canvasRef}
                  className="relative w-full aspect-video bg-[var(--sketch-card-bg)] border-2 border-[var(--sketch-border-color)] cursor-crosshair overflow-hidden sketch-border-sm"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {currentStep.screenshotPath ? (
                    <img
                      ref={imageRef}
                      src={currentStep.screenshotPath}
                      alt={`Step ${currentStepIndex + 1}`}
                      className="w-full h-full object-contain"
                      draggable={false}
                      onLoad={refreshBounds}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <Target className="w-12 h-12 text-[var(--sketch-fg-subtle)] mx-auto mb-2" />
                        <p className="font-body text-sm text-[var(--sketch-fg-subtle)]">
                          No screenshot uploaded
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Annotation overlays — positioned relative to image bounds, not container */}
                  {(() => {
                    // Convert image-relative percentages to container pixel positions
                    const toContainerPx = (imgPct: number, axis: "x" | "y") => {
                      if (!bounds) return `${imgPct}%`; // Fallback
                      if (axis === "x") {
                        return `${bounds.offsetX + (imgPct / 100) * bounds.visibleW}px`;
                      }
                      return `${bounds.offsetY + (imgPct / 100) * bounds.visibleH}px`;
                    };

                    const toContainerSize = (imgPct: number, axis: "x" | "y") => {
                      if (!bounds) return `${imgPct}%`; // Fallback
                      if (axis === "x") {
                        return `${(imgPct / 100) * bounds.visibleW}px`;
                      }
                      return `${(imgPct / 100) * bounds.visibleH}px`;
                    };

                    return (
                      <>
                        {rect && rect.x != null && (
                          <div
                            className="absolute border-2 border-[#FBBF24] bg-[#FBBF24]/10 pointer-events-none"
                            style={{
                              left: toContainerPx(rect.x!, "x"),
                              top: toContainerPx(rect.y!, "y"),
                              width: toContainerSize(rect.w!, "x"),
                              height: toContainerSize(rect.h!, "y"),
                            }}
                          />
                        )}

                        {currentAnn?.zoomTargetX != null && (
                          <div
                            className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                            style={{
                              left: toContainerPx(currentAnn.zoomTargetX, "x"),
                              top: toContainerPx(currentAnn.zoomTargetY!, "y"),
                            }}
                          >
                            <div className="w-full h-full bg-[#FBBF24] rounded-full border-2 border-[var(--sketch-border-color)] shadow-lg" />
                          </div>
                        )}

                        {tempRect && (
                          <div
                            className="absolute border-2 border-dashed border-[#FBBF24]/50 bg-[#FBBF24]/5 pointer-events-none"
                            style={{
                              left: toContainerPx(tempRect.x, "x"),
                              top: toContainerPx(tempRect.y, "y"),
                              width: toContainerSize(tempRect.w, "x"),
                              height: toContainerSize(tempRect.h, "y"),
                            }}
                          />
                        )}
                      </>
                    );
                  })()}
                </div>

                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setCurrentStepIndex(Math.max(0, currentStepIndex - 1))
                    }
                    disabled={currentStepIndex === 0}
                    className="sketch-btn-ghost"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Prev
                  </Button>
                  <span className="font-mono text-xs text-[var(--sketch-fg-subtle)]">
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
                    className="sketch-btn-ghost"
                  >
                    Next
                    <ChevronRightIcon className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <p className="font-body text-sm font-semibold mb-3 text-[var(--sketch-fg)]">
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
                      ? "border-[var(--sketch-border-color)] bg-[#FBBF24]/5"
                      : isMarked
                        ? "border-[var(--sketch-fg-subtle)] bg-[var(--sketch-card-bg)]"
                        : "border-[var(--sketch-fg-subtle)] bg-[var(--sketch-card-bg)]/50"
                  }`}
                  style={{ borderRadius: i === currentStepIndex ? "255px 15px 225px 15px/15px 225px 15px 255px" : "8px" }}
                >
                  <span className="font-hand text-lg text-[var(--sketch-fg-subtle)] w-5">
                    {i + 1}
                  </span>
                  <div className="w-8 h-8 bg-[var(--sketch-card-bg)] border border-[var(--sketch-fg-subtle)] flex-shrink-0 flex items-center justify-center overflow-hidden sketch-border-sm">
                    {s.screenshotPath ? (
                      <img
                        src={s.screenshotPath}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[8px] text-[var(--sketch-fg-subtle)]">
                        IMG
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-xs truncate text-[var(--sketch-fg)]">
                      {s.description.length > 30
                        ? s.description.slice(0, 30) + "..."
                        : s.description}
                    </p>
                  </div>
                  {isMarked ? (
                    <Check className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border border-[var(--sketch-fg-subtle)] flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <Button
          onClick={handleContinue}
          disabled={updateStep.isPending}
          className="sketch-btn-primary mt-6 w-full"
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
