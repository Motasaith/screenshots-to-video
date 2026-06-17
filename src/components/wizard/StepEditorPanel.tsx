import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "react-router";
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
  Type,
  Image as ImageIcon,
  Crop,
  ZoomIn,
  Palette,
  Trash2,
  Save,
  Play,
  Settings2,
  Move,
  Aperture,
  Shield,
  Stamp,
  Grid3x3,
  Sun,
  BadgeCheck,
  Search,
  Scan,
  HelpCircle,
  Undo2,
  Redo2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

/* ------------------------------------------------------------------ */
/*  Types & Helpers (carried over from old StepAnnotate)              */
/* ------------------------------------------------------------------ */

import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface StepAnnotation {
  zoomTargetX?: number | null;
  zoomTargetY?: number | null;
  zoomRectX?: number | null;
  zoomRectY?: number | null;
  zoomRectWidth?: number | null;
  zoomRectHeight?: number | null;
  editorCaptionText?: string | null;
  editorCaptionPosition?: string | null;
  editorCaptionStyle?: string | null;
  editorCaptionColor?: string | null;
  editorCaptionSize?: string | null;
  editorOverlayText?: string | null;
  editorOverlayX?: number | null;
  editorOverlayY?: number | null;
  editorOverlayColor?: string | null;
  editorOverlaySize?: string | null;
  editorCropX?: number | null;
  editorCropY?: number | null;
  editorCropW?: number | null;
  editorCropH?: number | null;
  editorBlurX?: number | null;
  editorBlurY?: number | null;
  editorBlurW?: number | null;
  editorBlurH?: number | null;
  editorBlurIntensity?: number | null;
  editorRedactX?: number | null;
  editorRedactY?: number | null;
  editorRedactW?: number | null;
  editorRedactH?: number | null;
  editorRedactColor?: string | null;
  editorWatermarkText?: string | null;
  editorWatermarkPosition?: string | null;
  editorWatermarkSize?: string | null;
  editorWatermarkColor?: string | null;
  editorWatermarkOpacity?: number | null;
  editorPixelateX?: number | null;
  editorPixelateY?: number | null;
  editorPixelateW?: number | null;
  editorPixelateH?: number | null;
  editorPixelateBlockSize?: number | null;
  editorSpotlightX?: number | null;
  editorSpotlightY?: number | null;
  editorSpotlightW?: number | null;
  editorSpotlightH?: number | null;
  editorSpotlightIntensity?: number | null;
  editorBadgeNumber?: number | null;
  editorBadgeX?: number | null;
  editorBadgeY?: number | null;
  editorBadgeColor?: string | null;
  editorMagnifyX?: number | null;
  editorMagnifyY?: number | null;
  editorMagnifyW?: number | null;
  editorMagnifyH?: number | null;
  editorMagnifyScale?: number | null;
  editorMagnifyCorner?: string | null;
  editorColorFilter?: string | null;
  editorZoomScale?: number | null;
  editorDuration?: number | null;
  editorMultiZooms?: Array<{
    id: string;
    targetX: number;
    targetY: number;
    rectX?: number;
    rectY?: number;
    rectW?: number;
    rectH?: number;
    zoomScale?: number;
    duration?: number;
  }> | null;
}

type ToolMode = "select" | "point" | "rect" | "overlay" | "crop" | "blur" | "redact" | "watermark" | "pixelate" | "spotlight" | "badge" | "magnify" | "filter" | "multizoom" | "caption" | "pan";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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
    visibleW = cw;
    visibleH = cw / imageAspect;
    offsetX = 0;
    offsetY = (ch - visibleH) / 2;
  } else {
    visibleH = ch;
    visibleW = ch * imageAspect;
    offsetX = (cw - visibleW) / 2;
    offsetY = 0;
  }

  return { visibleW, visibleH, offsetX, offsetY, cw, ch };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */


/* ------------------------------------------------------------------ */
/*  StepEditorPanel - the full canvas editor with all 14 tools         */
/* ------------------------------------------------------------------ */

export function StepEditorPanel() {
  const { projectId } = useParams<{ projectId: string }>();
  const projectIdNum = Number(projectId) || 0;

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [annotations, setAnnotations] = useState<Record<number, StepAnnotation>>({});
  const [mode, setMode] = useState<ToolMode>("select");
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [activeTab, setActiveTab] = useState("select");
  const [showPreview, setShowPreview] = useState(false);

  const [canvasScale, setCanvasScale] = useState(1.0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panScrollRef = useRef<{ left: number; top: number }>({ left: 0, top: 0 });

  const [history, setHistory] = useState<Record<number, StepAnnotation>[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [dragItem, setDragItem] = useState<{
    type: "overlay" | "badge" | "magnify" | "zoomTarget" | "zoomRect" | "blur" | "redact" | "pixelate" | "spotlight" | "multizoom";
    id?: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialW?: number;
    initialH?: number;
  } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [bounds, setBounds] = useState<{ visibleW: number; visibleH: number; offsetX: number; offsetY: number } | null>(null);

  const updateBounds = useCallback(() => {
    if (canvasRef.current && imageRef.current) {
      const b = getImageBounds(canvasRef.current, imageRef.current);
      setBounds(b);
    }
  }, []);

  const { data: project, isLoading } = trpc.project.getById.useQuery(
    { id: projectIdNum },
    { enabled: projectIdNum > 0 }
  );

  const suggestZooms = trpc.ai.suggestZooms.useMutation();
  const updateStep = trpc.step.update.useMutation();
  const utils = trpc.useUtils();

  const steps = project?.steps || [];
  const currentStep = steps[currentStepIndex];

  const pushHistory = useCallback((nextState: Record<number, StepAnnotation>) => {
    const serialized = JSON.parse(JSON.stringify(nextState));
    if (history.length > 0 && historyIndex >= 0) {
      const currentHead = JSON.stringify(history[historyIndex]);
      if (JSON.stringify(serialized) === currentHead) {
        return;
      }
    }
    setHistory((prev) => {
      const nextHistory = prev.slice(0, historyIndex + 1);
      nextHistory.push(serialized);
      setHistoryIndex(nextHistory.length - 1);
      return nextHistory;
    });
    setAnnotations(nextState);
  }, [history, historyIndex]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setAnnotations(JSON.parse(JSON.stringify(history[newIndex])));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setAnnotations(JSON.parse(JSON.stringify(history[newIndex])));
    }
  };

  useEffect(() => {
    if (mode === "rect" || mode === "point") {
      setActiveTab("zoom");
    } else {
      setActiveTab(mode);
    }
  }, [mode]);

  useEffect(() => {
    updateBounds();
    window.addEventListener("resize", updateBounds);
    return () => window.removeEventListener("resize", updateBounds);
  }, [currentStepIndex, project, updateBounds, canvasScale]);

  /* Load existing annotations */
  useEffect(() => {
    if (project?.steps) {
      const initial: Record<number, StepAnnotation> = {};
      project.steps.forEach((s: any) => {
        initial[s.id] = {
          zoomTargetX: s.zoomTargetX,
          zoomTargetY: s.zoomTargetY,
          zoomRectX: s.zoomRectX,
          zoomRectY: s.zoomRectY,
          zoomRectWidth: s.zoomRectWidth,
          zoomRectHeight: s.zoomRectHeight,
          editorCaptionText: s.editorCaptionText,
          editorCaptionPosition: s.editorCaptionPosition,
          editorCaptionStyle: s.editorCaptionStyle,
          editorCaptionColor: s.editorCaptionColor,
          editorCaptionSize: s.editorCaptionSize,
          editorOverlayText: s.editorOverlayText,
          editorOverlayX: s.editorOverlayX,
          editorOverlayY: s.editorOverlayY,
          editorOverlayColor: s.editorOverlayColor,
          editorOverlaySize: s.editorOverlaySize,
          editorCropX: s.editorCropX,
          editorCropY: s.editorCropY,
          editorCropW: s.editorCropW,
          editorCropH: s.editorCropH,
          editorBlurX: s.editorBlurX,
          editorBlurY: s.editorBlurY,
          editorBlurW: s.editorBlurW,
          editorBlurH: s.editorBlurH,
          editorBlurIntensity: s.editorBlurIntensity ?? 20,
          editorRedactX: s.editorRedactX,
          editorRedactY: s.editorRedactY,
          editorRedactW: s.editorRedactW,
          editorRedactH: s.editorRedactH,
          editorRedactColor: s.editorRedactColor,
          editorWatermarkText: s.editorWatermarkText,
          editorWatermarkPosition: s.editorWatermarkPosition,
          editorWatermarkSize: s.editorWatermarkSize,
          editorWatermarkColor: s.editorWatermarkColor,
          editorWatermarkOpacity: s.editorWatermarkOpacity ?? 0.5,
          editorPixelateX: s.editorPixelateX,
          editorPixelateY: s.editorPixelateY,
          editorPixelateW: s.editorPixelateW,
          editorPixelateH: s.editorPixelateH,
          editorPixelateBlockSize: s.editorPixelateBlockSize ?? 20,
          editorSpotlightX: s.editorSpotlightX,
          editorSpotlightY: s.editorSpotlightY,
          editorSpotlightW: s.editorSpotlightW,
          editorSpotlightH: s.editorSpotlightH,
          editorSpotlightIntensity: s.editorSpotlightIntensity ?? 0.6,
          editorBadgeNumber: s.editorBadgeNumber,
          editorBadgeX: s.editorBadgeX,
          editorBadgeY: s.editorBadgeY,
          editorBadgeColor: s.editorBadgeColor,
          editorMagnifyX: s.editorMagnifyX,
          editorMagnifyY: s.editorMagnifyY,
          editorMagnifyW: s.editorMagnifyW,
          editorMagnifyH: s.editorMagnifyH,
          editorMagnifyScale: s.editorMagnifyScale ?? 2,
          editorMagnifyCorner: s.editorMagnifyCorner,
          editorColorFilter: s.editorColorFilter,
          editorZoomScale: s.editorZoomScale ?? 1.6,
          editorDuration: s.editorDuration,
          editorMultiZooms: s.editorMultiZooms || [],
        };
      });
      setAnnotations(initial);
      if (history.length === 0) {
        setHistory([JSON.parse(JSON.stringify(initial))]);
        setHistoryIndex(0);
      }
    }
  }, [project]);

  /* Coordinate mapping */
  const getCanvasCoords = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return null;
    const container = canvasRef.current;
    const img = imageRef.current;
    const containerRect = container.getBoundingClientRect();

    if (img && img.naturalWidth && img.naturalHeight) {
      const boundsVal = getImageBounds(container, img);
      if (boundsVal) {
        const mouseX = e.clientX - containerRect.left;
        const mouseY = e.clientY - containerRect.top;
        const imgRelX = ((mouseX - boundsVal.offsetX) / boundsVal.visibleW) * 100;
        const imgRelY = ((mouseY - boundsVal.offsetY) / boundsVal.visibleH) * 100;
        return {
          x: clamp(imgRelX, 0, 100),
          y: clamp(imgRelY, 0, 100),
        };
      }
    }

    return {
      x: ((e.clientX - containerRect.left) / containerRect.width) * 100,
      y: ((e.clientY - containerRect.top) / containerRect.height) * 100,
    };
  }, []);

  /* Mouse handlers */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!currentStep) return;

    if (mode === "pan") {
      if (!scrollContainerRef.current) return;
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY };
      panScrollRef.current = {
        left: scrollContainerRef.current.scrollLeft,
        top: scrollContainerRef.current.scrollTop,
      };
      e.preventDefault();
      return;
    }

    if (mode === "select" || mode === "caption") {
      return;
    }

    const coords = getCanvasCoords(e);
    if (!coords) return;

    if (mode === "overlay") {
      const nextState = {
        ...annotations,
        [currentStep.id]: {
          ...(annotations[currentStep.id] || {}),
          editorOverlayX: coords.x,
          editorOverlayY: coords.y,
          editorOverlayText: annotations[currentStep.id]?.editorOverlayText || "Text Overlay",
        },
      };
      pushHistory(nextState);
      setActiveTab("overlay");
      return;
    }

    if (mode === "watermark") {
      const nextState = {
        ...annotations,
        [currentStep.id]: {
          ...(annotations[currentStep.id] || {}),
          editorWatermarkText: annotations[currentStep.id]?.editorWatermarkText || "Watermark",
        },
      };
      pushHistory(nextState);
      setActiveTab("watermark");
      return;
    }

    if (mode === "badge") {
      const nextState = {
        ...annotations,
        [currentStep.id]: {
          ...(annotations[currentStep.id] || {}),
          editorBadgeNumber: annotations[currentStep.id]?.editorBadgeNumber || currentStepIndex + 1,
          editorBadgeX: coords.x,
          editorBadgeY: coords.y,
          editorBadgeColor: annotations[currentStep.id]?.editorBadgeColor || "#FBBF24",
        },
      };
      pushHistory(nextState);
      setActiveTab("badge");
      return;
    }

    if (mode === "magnify") {
      const nextState = {
        ...annotations,
        [currentStep.id]: {
          ...(annotations[currentStep.id] || {}),
          editorMagnifyX: coords.x,
          editorMagnifyY: coords.y,
          editorMagnifyW: annotations[currentStep.id]?.editorMagnifyW || 15,
          editorMagnifyH: annotations[currentStep.id]?.editorMagnifyH || 15,
          editorMagnifyScale: annotations[currentStep.id]?.editorMagnifyScale || 2,
          editorMagnifyCorner: annotations[currentStep.id]?.editorMagnifyCorner || "bottom-right",
        },
      };
      pushHistory(nextState);
      setActiveTab("magnify");
      return;
    }

    if (mode === "point") {
      const nextState = {
        ...annotations,
        [currentStep.id]: {
          ...(annotations[currentStep.id] || {}),
          zoomTargetX: coords.x,
          zoomTargetY: coords.y,
        },
      };
      pushHistory(nextState);
      return;
    }

    if (mode === "multizoom") {
      const existing = annotations[currentStep.id]?.editorMultiZooms || [];
      const newZoom = {
        id: crypto.randomUUID(),
        targetX: coords.x,
        targetY: coords.y,
        zoomScale: 2,
        duration: 3,
      };
      const nextState = {
        ...annotations,
        [currentStep.id]: {
          ...(annotations[currentStep.id] || {}),
          editorMultiZooms: [...existing, newZoom],
        },
      };
      pushHistory(nextState);
      setActiveTab("multizoom");
      return;
    }

    setIsDragging(true);
    setDragStart(coords);
    setDragCurrent(coords);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (mode === "pan" && isPanningRef.current && scrollContainerRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      scrollContainerRef.current.scrollLeft = panScrollRef.current.left - dx;
      scrollContainerRef.current.scrollTop = panScrollRef.current.top - dy;
      return;
    }

    const coords = getCanvasCoords(e);
    if (!coords) return;

    if (dragItem) {
      const deltaX = coords.x - dragItem.startX;
      const deltaY = coords.y - dragItem.startY;

      setAnnotations((prev) => {
        const stepAnn = prev[currentStep.id] || {};
        const updated = { ...stepAnn };

        if (dragItem.type === "overlay") {
          updated.editorOverlayX = clamp(dragItem.initialX + deltaX, 0, 100);
          updated.editorOverlayY = clamp(dragItem.initialY + deltaY, 0, 100);
        } else if (dragItem.type === "badge") {
          updated.editorBadgeX = clamp(dragItem.initialX + deltaX, 0, 100);
          updated.editorBadgeY = clamp(dragItem.initialY + deltaY, 0, 100);
        } else if (dragItem.type === "magnify") {
          updated.editorMagnifyX = clamp(dragItem.initialX + deltaX, 0, 100);
          updated.editorMagnifyY = clamp(dragItem.initialY + deltaY, 0, 100);
        } else if (dragItem.type === "zoomTarget") {
          updated.zoomTargetX = clamp(dragItem.initialX + deltaX, 0, 100);
          updated.zoomTargetY = clamp(dragItem.initialY + deltaY, 0, 100);
        } else if (dragItem.type === "zoomRect") {
          const w = dragItem.initialW || 0;
          const h = dragItem.initialH || 0;
          updated.zoomRectX = clamp(dragItem.initialX + deltaX, 0, 100 - w);
          updated.zoomRectY = clamp(dragItem.initialY + deltaY, 0, 100 - h);
          updated.zoomTargetX = updated.zoomRectX + w / 2;
          updated.zoomTargetY = updated.zoomRectY + h / 2;
        } else if (dragItem.type === "blur") {
          const w = dragItem.initialW || 0;
          const h = dragItem.initialH || 0;
          updated.editorBlurX = clamp(dragItem.initialX + deltaX, 0, 100 - w);
          updated.editorBlurY = clamp(dragItem.initialY + deltaY, 0, 100 - h);
        } else if (dragItem.type === "redact") {
          const w = dragItem.initialW || 0;
          const h = dragItem.initialH || 0;
          updated.editorRedactX = clamp(dragItem.initialX + deltaX, 0, 100 - w);
          updated.editorRedactY = clamp(dragItem.initialY + deltaY, 0, 100 - h);
        } else if (dragItem.type === "pixelate") {
          const w = dragItem.initialW || 0;
          const h = dragItem.initialH || 0;
          updated.editorPixelateX = clamp(dragItem.initialX + deltaX, 0, 100 - w);
          updated.editorPixelateY = clamp(dragItem.initialY + deltaY, 0, 100 - h);
        } else if (dragItem.type === "spotlight") {
          const w = dragItem.initialW || 0;
          const h = dragItem.initialH || 0;
          updated.editorSpotlightX = clamp(dragItem.initialX + deltaX, 0, 100 - w);
          updated.editorSpotlightY = clamp(dragItem.initialY + deltaY, 0, 100 - h);
        } else if (dragItem.type === "multizoom") {
          updated.editorMultiZooms = (stepAnn.editorMultiZooms || []).map((p) =>
            p.id === dragItem.id
              ? {
                  ...p,
                  targetX: clamp(dragItem.initialX + deltaX, 0, 100),
                  targetY: clamp(dragItem.initialY + deltaY, 0, 100),
                }
              : p
          );
        }

        return { ...prev, [currentStep.id]: updated };
      });
      return;
    }

    if (!isDragging || mode === "point" || mode === "overlay" || mode === "caption") return;
    setDragCurrent(coords);
  };

  const handleMouseUp = () => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    if (dragItem) {
      pushHistory(annotations);
      setDragItem(null);
      return;
    }

    if (!isDragging || !dragStart || !dragCurrent || !currentStep) return;

    let updatedAnn = { ...(annotations[currentStep.id] || {}) };
    let changed = false;

    if (mode === "rect") {
      const x = Math.min(dragStart.x, dragCurrent.x);
      const y = Math.min(dragStart.y, dragCurrent.y);
      const width = Math.abs(dragCurrent.x - dragStart.x);
      const height = Math.abs(dragCurrent.y - dragStart.y);

      if (width > 2 && height > 2) {
        updatedAnn.zoomRectX = x;
        updatedAnn.zoomRectY = y;
        updatedAnn.zoomRectWidth = width;
        updatedAnn.zoomRectHeight = height;
        updatedAnn.zoomTargetX = x + width / 2;
        updatedAnn.zoomTargetY = y + height / 2;
        changed = true;
      }
    }

    if (mode === "crop") {
      const x = Math.min(dragStart.x, dragCurrent.x);
      const y = Math.min(dragStart.y, dragCurrent.y);
      const w = Math.abs(dragCurrent.x - dragStart.x);
      const h = Math.abs(dragCurrent.y - dragStart.y);

      if (w > 2 && h > 2) {
        updatedAnn.editorCropX = x;
        updatedAnn.editorCropY = y;
        updatedAnn.editorCropW = w;
        updatedAnn.editorCropH = h;
        changed = true;
        setActiveTab("crop");
      }
    }

    if (mode === "blur") {
      const x = Math.min(dragStart.x, dragCurrent.x);
      const y = Math.min(dragStart.y, dragCurrent.y);
      const w = Math.abs(dragCurrent.x - dragStart.x);
      const h = Math.abs(dragCurrent.y - dragStart.y);

      if (w > 2 && h > 2) {
        updatedAnn.editorBlurX = x;
        updatedAnn.editorBlurY = y;
        updatedAnn.editorBlurW = w;
        updatedAnn.editorBlurH = h;
        changed = true;
        setActiveTab("blur");
      }
    }

    if (mode === "redact") {
      const x = Math.min(dragStart.x, dragCurrent.x);
      const y = Math.min(dragStart.y, dragCurrent.y);
      const w = Math.abs(dragCurrent.x - dragStart.x);
      const h = Math.abs(dragCurrent.y - dragStart.y);

      if (w > 2 && h > 2) {
        updatedAnn.editorRedactX = x;
        updatedAnn.editorRedactY = y;
        updatedAnn.editorRedactW = w;
        updatedAnn.editorRedactH = h;
        changed = true;
        setActiveTab("redact");
      }
    }

    if (mode === "pixelate") {
      const x = Math.min(dragStart.x, dragCurrent.x);
      const y = Math.min(dragStart.y, dragCurrent.y);
      const w = Math.abs(dragCurrent.x - dragStart.x);
      const h = Math.abs(dragCurrent.y - dragStart.y);

      if (w > 2 && h > 2) {
        updatedAnn.editorPixelateX = x;
        updatedAnn.editorPixelateY = y;
        updatedAnn.editorPixelateW = w;
        updatedAnn.editorPixelateH = h;
        changed = true;
        setActiveTab("pixelate");
      }
    }

    if (mode === "spotlight") {
      const x = Math.min(dragStart.x, dragCurrent.x);
      const y = Math.min(dragStart.y, dragCurrent.y);
      const w = Math.abs(dragCurrent.x - dragStart.x);
      const h = Math.abs(dragCurrent.y - dragStart.y);

      if (w > 2 && h > 2) {
        updatedAnn.editorSpotlightX = x;
        updatedAnn.editorSpotlightY = y;
        updatedAnn.editorSpotlightW = w;
        updatedAnn.editorSpotlightH = h;
        changed = true;
        setActiveTab("spotlight");
      }
    }

    if (changed) {
      pushHistory({
        ...annotations,
        [currentStep.id]: updatedAnn,
      });
    }

    setIsDragging(false);
    setDragStart(null);
    setDragCurrent(null);
  };

  /* Î“Ã¶Ã‡Î“Ã¶Ã‡ Actions Î“Ã¶Ã‡Î“Ã¶Ã‡ */
  const handleSuggestAll = async () => {
    await suggestZooms.mutateAsync({ projectId: projectIdNum });
    utils.project.getById.invalidate({ id: projectIdNum });
  };

  const handleSaveStep = async () => {
    if (!currentStep) return;
    const ann = annotations[currentStep.id];
    if (!ann) return;

    const payload: Record<string, any> = {};
    const fields = [
      "zoomTargetX", "zoomTargetY", "zoomRectX", "zoomRectY",
      "zoomRectWidth", "zoomRectHeight",
      "editorCaptionText", "editorCaptionPosition", "editorCaptionStyle",
      "editorCaptionColor", "editorCaptionSize",
      "editorOverlayText", "editorOverlayX", "editorOverlayY",
      "editorOverlayColor", "editorOverlaySize",
      "editorCropX", "editorCropY", "editorCropW", "editorCropH",
      "editorBlurX", "editorBlurY", "editorBlurW", "editorBlurH", "editorBlurIntensity",
      "editorRedactX", "editorRedactY", "editorRedactW", "editorRedactH", "editorRedactColor",
      "editorWatermarkText", "editorWatermarkPosition", "editorWatermarkSize",
      "editorWatermarkColor", "editorWatermarkOpacity",
      "editorPixelateX", "editorPixelateY", "editorPixelateW", "editorPixelateH", "editorPixelateBlockSize",
      "editorSpotlightX", "editorSpotlightY", "editorSpotlightW", "editorSpotlightH", "editorSpotlightIntensity",
      "editorBadgeNumber", "editorBadgeX", "editorBadgeY", "editorBadgeColor",
      "editorMagnifyX", "editorMagnifyY", "editorMagnifyW", "editorMagnifyH", "editorMagnifyScale", "editorMagnifyCorner",
      "editorColorFilter",
      "editorZoomScale", "editorDuration",
    ];

    fields.forEach((f) => {
      const v = (ann as any)[f];
      if (v !== undefined) payload[f] = v;
    });

    await updateStep.mutateAsync({ id: currentStep.id, ...payload });
    utils.project.getById.invalidate({ id: projectIdNum });
  };

  const handleContinue = async () => {
    // Save all annotation changes for all steps but do NOT navigate.
    // The parent (StepPreview) owns navigation; this panel only persists edits.
    for (const [stepId, ann] of Object.entries(annotations)) {
      const payload: Record<string, any> = {};
      const fields = [
        "zoomTargetX", "zoomTargetY", "zoomRectX", "zoomRectY",
        "zoomRectWidth", "zoomRectHeight",
        "editorCaptionText", "editorCaptionPosition", "editorCaptionStyle",
        "editorCaptionColor", "editorCaptionSize",
        "editorOverlayText", "editorOverlayX", "editorOverlayY",
        "editorOverlayColor", "editorOverlaySize",
        "editorCropX", "editorCropY", "editorCropW", "editorCropH",
        "editorBlurX", "editorBlurY", "editorBlurW", "editorBlurH", "editorBlurIntensity",
        "editorRedactX", "editorRedactY", "editorRedactW", "editorRedactH", "editorRedactColor",
        "editorWatermarkText", "editorWatermarkPosition", "editorWatermarkSize",
        "editorWatermarkColor", "editorWatermarkOpacity",
        "editorPixelateX", "editorPixelateY", "editorPixelateW", "editorPixelateH", "editorPixelateBlockSize",
        "editorSpotlightX", "editorSpotlightY", "editorSpotlightW", "editorSpotlightH", "editorSpotlightIntensity",
        "editorBadgeNumber", "editorBadgeX", "editorBadgeY", "editorBadgeColor",
        "editorMagnifyX", "editorMagnifyY", "editorMagnifyW", "editorMagnifyH", "editorMagnifyScale", "editorMagnifyCorner",
        "editorColorFilter",
        "editorZoomScale", "editorDuration", "editorMultiZooms",
      ];
      fields.forEach((f) => {
        const v = (ann as any)[f];
        if (v !== undefined) payload[f] = v;
      });

      if (Object.keys(payload).length > 0) {
        await updateStep.mutateAsync({ id: Number(stepId), ...payload });
      }
    }
    // Stay on the parent page; do not navigate from the embedded editor.
  };

  const handleClear = (field: keyof StepAnnotation) => {
    if (!currentStep) return;
    const nextState = {
      ...annotations,
      [currentStep.id]: {
        ...(annotations[currentStep.id] || {}),
        [field]: null,
      },
    };
    pushHistory(nextState);
  };

  /* Derived state */
  const currentAnn = currentStep ? annotations[currentStep.id] : null;

  const projectRatio = project?.aspectRatio || "16:9";
  const aspectClass =
    projectRatio === "9:16" ? "aspect-[9/16]" :
    projectRatio === "1:1" ? "aspect-square" :
    projectRatio === "4:5" ? "aspect-[4/5]" :
    "aspect-video";

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

  const cropRect = currentAnn
    ? {
        x: currentAnn.editorCropX,
        y: currentAnn.editorCropY,
        w: currentAnn.editorCropW,
        h: currentAnn.editorCropH,
      }
    : null;

  const blurRect = currentAnn
    ? {
        x: currentAnn.editorBlurX,
        y: currentAnn.editorBlurY,
        w: currentAnn.editorBlurW,
        h: currentAnn.editorBlurH,
      }
    : null;

  const redactRect = currentAnn
    ? {
        x: currentAnn.editorRedactX,
        y: currentAnn.editorRedactY,
        w: currentAnn.editorRedactW,
        h: currentAnn.editorRedactH,
      }
    : null;

  const pixelateRect = currentAnn
    ? {
        x: currentAnn.editorPixelateX,
        y: currentAnn.editorPixelateY,
        w: currentAnn.editorPixelateW,
        h: currentAnn.editorPixelateH,
      }
    : null;

  const spotlightRect = currentAnn
    ? {
        x: currentAnn.editorSpotlightX,
        y: currentAnn.editorSpotlightY,
        w: currentAnn.editorSpotlightW,
        h: currentAnn.editorSpotlightH,
      }
    : null;

  const overlayPos = currentAnn
    ? { x: currentAnn.editorOverlayX, y: currentAnn.editorOverlayY }
    : null;

  /* Î“Ã¶Ã‡Î“Ã¶Ã‡ Render helpers Î“Ã¶Ã‡Î“Ã¶Ã‡ */
  const hasAnyEdit = (ann: StepAnnotation | undefined) => {
    if (!ann) return false;
    return (
      ann.zoomTargetX != null ||
      ann.editorCaptionText != null ||
      ann.editorOverlayText != null ||
      ann.editorCropX != null ||
      ann.editorBlurX != null ||
      ann.editorRedactX != null ||
      ann.editorWatermarkText != null ||
      ann.editorPixelateX != null ||
      ann.editorSpotlightX != null ||
      ann.editorBadgeNumber != null ||
      ann.editorMagnifyX != null ||
      (ann.editorColorFilter != null && ann.editorColorFilter !== "none") ||
      (ann.editorMultiZooms != null && ann.editorMultiZooms.length > 0) ||
      ann.editorZoomScale != null ||
      ann.editorDuration != null
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--sketch-fg)]" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)]">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <ToolButton
            active={mode === "select"}
            onClick={() => setMode("select")}
            icon={<MousePointer className="w-4 h-4" />}
            label="Select"
          />
          <ToolButton
            active={mode === "rect"}
            onClick={() => setMode("rect")}
            icon={<Square className="w-4 h-4" />}
            label="Highlight"
          />
          <ToolButton
            active={mode === "point"}
            onClick={() => setMode("point")}
            icon={<Target className="w-4 h-4" />}
            label="Zoom Point"
          />
          <ToolButton
            active={mode === "overlay"}
            onClick={() => setMode("overlay")}
            icon={<Type className="w-4 h-4" />}
            label="Text Overlay"
          />
          <ToolButton
            active={mode === "crop"}
            onClick={() => setMode("crop")}
            icon={<Crop className="w-4 h-4" />}
            label="Crop"
          />
          <ToolButton
            active={mode === "blur"}
            onClick={() => setMode("blur")}
            icon={<Aperture className="w-4 h-4" />}
            label="Blur"
          />
          <ToolButton
            active={mode === "redact"}
            onClick={() => setMode("redact")}
            icon={<Shield className="w-4 h-4" />}
            label="Redact"
          />
          <ToolButton
            active={mode === "watermark"}
            onClick={() => setMode("watermark")}
            icon={<Stamp className="w-4 h-4" />}
            label="Watermark"
          />
          <ToolButton
            active={mode === "pixelate"}
            onClick={() => setMode("pixelate")}
            icon={<Grid3x3 className="w-4 h-4" />}
            label="Pixelate"
          />
          <ToolButton
            active={mode === "spotlight"}
            onClick={() => setMode("spotlight")}
            icon={<Sun className="w-4 h-4" />}
            label="Spotlight"
          />
          <ToolButton
            active={mode === "badge"}
            onClick={() => setMode("badge")}
            icon={<BadgeCheck className="w-4 h-4" />}
            label="Badge"
          />
          <ToolButton
            active={mode === "magnify"}
            onClick={() => setMode("magnify")}
            icon={<Search className="w-4 h-4" />}
            label="Magnify"
          />
          <ToolButton
            active={mode === "filter"}
            onClick={() => setMode("filter")}
            icon={<Palette className="w-4 h-4" />}
            label="Filter"
          />
          <ToolButton
            active={mode === "multizoom"}
            onClick={() => setMode("multizoom")}
            icon={<Scan className="w-4 h-4" />}
            label="Multi-Zoom"
          />
          <ToolButton
            active={mode === "pan"}
            onClick={() => setMode("pan")}
            icon={<Move className="w-4 h-4" />}
            label="Pan"
          />
          <ToolButton
            active={mode === "caption"}
            onClick={() => setMode("caption")}
            icon={<Type className="w-4 h-4" />}
            label="Subtitles"
          />

          <div className="w-px h-6 bg-[var(--sketch-border-color)]/30 mx-1" />

          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="flex items-center gap-2 px-3 py-2 border-2 border-[var(--sketch-fg-subtle)] text-sm font-body hover:border-[var(--sketch-border-color)] transition-all disabled:opacity-30"
            style={{ borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px" }}
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
            Undo
          </button>

          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="flex items-center gap-2 px-3 py-2 border-2 border-[var(--sketch-fg-subtle)] text-sm font-body hover:border-[var(--sketch-border-color)] transition-all disabled:opacity-30"
            style={{ borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px" }}
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
            Redo
          </button>

          <div className="flex-1" />

          <button
            onClick={handleSaveStep}
            disabled={updateStep.isPending}
            className="flex items-center gap-2 px-3 py-2 border-2 border-[var(--sketch-border-color)] bg-[#FBBF24]/10 text-sm font-body hover:shadow-[3px_3px_0px_0px_#FBBF24] transition-all"
            style={{ borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px" }}
          >
            <Save className="w-4 h-4" />
            Save Step
          </button>
        </div>

        {/* Main layout */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[120px_1fr] gap-3">
          {/* Î“Ã¶Ã‡Î“Ã¶Ã‡ Left: Step thumbnails Î“Ã¶Ã‡Î“Ã¶Ã‡ */}
          <div className="sketch-card p-2 bg-[var(--sketch-card-bg)] h-fit max-h-[calc(100vh-200px)] overflow-y-auto">
            <h3 className="font-mono text-[10px] text-[var(--sketch-fg-muted)] uppercase tracking-wider mb-2">
              Steps
            </h3>
            <div className="space-y-1.5">
              {steps.map((step: any, idx: number) => {
                const ann = annotations[step.id];
                const isActive = idx === currentStepIndex;
                const edited = hasAnyEdit(ann);

                return (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStepIndex(idx)}
                    className={`w-full text-left p-1 border-2 transition-all relative ${
                      isActive
                        ? "border-[var(--sketch-border-color)] bg-[#FBBF24]/10 shadow-[2px_2px_0px_0px_#FBBF24]"
                        : "border-[var(--sketch-fg-subtle)]/30 hover:border-[var(--sketch-border-color)]/40"
                    }`}
                    style={{ borderRadius: "6px" }}
                  >
                    {edited && (
                      <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    )}
                    {step.screenshotPath ? (
                      <img
                        src={step.screenshotPath}
                        alt={`Step ${idx + 1}`}
                        className="w-full aspect-video object-cover rounded-sm mb-0.5"
                      />
                    ) : (
                      <div className="w-full aspect-video bg-[var(--sketch-fg-subtle)]/10 rounded-sm mb-0.5 flex items-center justify-center">
                        <ImageIcon className="w-3 h-3 text-[var(--sketch-fg-subtle)]" />
                      </div>
                    )}
                    <div className="flex items-center gap-0.5">
                      <span className="font-mono text-[9px] text-[var(--sketch-fg-muted)]">
                        {idx + 1}
                      </span>
                      <span className="text-[9px] font-body truncate text-[var(--sketch-fg)] leading-tight">
                        {step.description?.slice(0, 20) || "Untitled"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Î“Ã¶Ã‡Î“Ã¶Ã‡ Center: Canvas Î“Ã¶Ã‡Î“Ã¶Ã‡ */}
          <div className="sketch-card p-4 bg-[var(--sketch-card-bg)]">
            {currentStep && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
                        disabled={currentStepIndex === 0}
                        className="p-1 border border-[var(--sketch-fg-subtle)]/30 rounded hover:bg-[var(--sketch-fg-subtle)]/10 disabled:opacity-30"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="font-mono text-xs text-[var(--sketch-fg-subtle)]">
                        Step {currentStepIndex + 1} of {steps.length}
                      </span>
                      <button
                        onClick={() =>
                          setCurrentStepIndex(Math.min(steps.length - 1, currentStepIndex + 1))
                        }
                        disabled={currentStepIndex === steps.length - 1}
                        className="p-1 border border-[var(--sketch-fg-subtle)]/30 rounded hover:bg-[var(--sketch-fg-subtle)]/10 disabled:opacity-30"
                      >
                        <ChevronRightIcon className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="w-px h-4 bg-[var(--sketch-border-color)]/30" />

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCanvasScale(prev => Math.max(1.0, prev - 0.25))}
                        disabled={canvasScale <= 1.0}
                        className="w-5 h-5 flex items-center justify-center border border-[var(--sketch-fg-subtle)]/30 rounded text-xs hover:bg-[var(--sketch-fg-subtle)]/10 disabled:opacity-30"
                        title="Zoom Out"
                      >
                        -
                      </button>
                      <span className="text-[10px] font-mono w-10 text-center font-bold">
                        {Math.round(canvasScale * 100)}%
                      </span>
                      <button
                        onClick={() => setCanvasScale(prev => Math.min(3.0, prev + 0.25))}
                        disabled={canvasScale >= 3.0}
                        className="w-5 h-5 flex items-center justify-center border border-[var(--sketch-fg-subtle)]/30 rounded text-xs hover:bg-[var(--sketch-fg-subtle)]/10 disabled:opacity-30"
                        title="Zoom In"
                      >
                        +
                      </button>
                      <button
                        onClick={() => setCanvasScale(1.0)}
                        disabled={canvasScale === 1.0}
                        className="text-[9px] font-mono px-1.5 py-0.5 border border-[var(--sketch-fg-subtle)]/30 rounded hover:bg-[var(--sketch-fg-subtle)]/10 disabled:opacity-30 ml-1"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {currentAnn?.zoomTargetX != null && (
                      <span className="flex items-center gap-1 text-xs font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        <Check className="w-3 h-3" />
                        Zoom
                      </span>
                    )}
                    {currentAnn?.editorCaptionText && (
                      <span className="flex items-center gap-1 text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        <Type className="w-3 h-3" />
                        Caption
                      </span>
                    )}
                    {currentAnn?.editorOverlayText && (
                      <span className="flex items-center gap-1 text-xs font-mono text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                        <Type className="w-3 h-3" />
                        Overlay
                      </span>
                    )}
                    {currentAnn?.editorCropX != null && (
                      <span className="flex items-center gap-1 text-xs font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                        <Crop className="w-3 h-3" />
                        Crop
                      </span>
                    )}
                    {currentAnn?.editorBlurX != null && (
                      <span className="flex items-center gap-1 text-xs font-mono text-pink-600 bg-pink-50 px-2 py-0.5 rounded">
                        <Aperture className="w-3 h-3" />
                        Blur
                      </span>
                    )}
                    {currentAnn?.editorRedactX != null && (
                      <span className="flex items-center gap-1 text-xs font-mono text-gray-700 bg-gray-200 px-2 py-0.5 rounded">
                        <Shield className="w-3 h-3" />
                        Redact
                      </span>
                    )}
                    {currentAnn?.editorWatermarkText && (
                      <span className="flex items-center gap-1 text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        <Stamp className="w-3 h-3" />
                        Watermark
                      </span>
                    )}
                    {currentAnn?.editorPixelateX != null && (
                      <span className="flex items-center gap-1 text-xs font-mono text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded">
                        <Grid3x3 className="w-3 h-3" />
                        Pixelate
                      </span>
                    )}
                    {currentAnn?.editorSpotlightX != null && (
                      <span className="flex items-center gap-1 text-xs font-mono text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                        <Sun className="w-3 h-3" />
                        Spotlight
                      </span>
                    )}
                    {currentAnn?.editorBadgeNumber != null && (
                      <span className="flex items-center gap-1 text-xs font-mono text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded">
                        <BadgeCheck className="w-3 h-3" />
                        Badge
                      </span>
                    )}
                    {currentAnn?.editorMagnifyX != null && (
                      <span className="flex items-center gap-1 text-xs font-mono text-teal-600 bg-teal-50 px-2 py-0.5 rounded">
                        <Search className="w-3 h-3" />
                        Magnify
                      </span>
                    )}
                    {currentAnn?.editorColorFilter && currentAnn.editorColorFilter !== "none" && (
                      <span className="flex items-center gap-1 text-xs font-mono text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                        <Palette className="w-3 h-3" />
                        Filter
                      </span>
                    )}
                    {currentAnn?.editorMultiZooms && currentAnn.editorMultiZooms.length > 0 && (
                      <span className="flex items-center gap-1 text-xs font-mono text-violet-600 bg-violet-50 px-2 py-0.5 rounded">
                        <Scan className="w-3 h-3" />
                        {currentAnn.editorMultiZooms.length} Multi-Zoom
                      </span>
                    )}
                  </div>
                </div>

                <div
                  ref={scrollContainerRef}
                  className="w-full overflow-auto max-h-[70vh] border-2 border-[var(--sketch-border-color)] rounded-md bg-[#000000] relative"
                >
                  <div
                    style={{
                      width: `${canvasScale * 100}%`,
                      minWidth: "100%",
                      margin: "0 auto",
                    }}
                  >
                    <div
                      ref={canvasRef}
                      className={`relative w-full ${aspectClass} overflow-hidden sketch-border-sm cursor-crosshair`}
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
                          className="w-full h-full object-contain select-none"
                          style={{
                            filter:
                              currentAnn?.editorColorFilter === "grayscale"
                                ? "grayscale(100%)"
                                : currentAnn?.editorColorFilter === "sepia"
                                ? "sepia(100%)"
                                : currentAnn?.editorColorFilter === "warm"
                                ? "sepia(50%) saturate(140%)"
                                : currentAnn?.editorColorFilter === "cool"
                                ? "hue-rotate(180deg) saturate(80%)"
                                : currentAnn?.editorColorFilter === "contrast"
                                ? "contrast(150%) saturate(120%)"
                                : "none",
                          }}
                          draggable={false}
                          onLoad={updateBounds}
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

                      {bounds && (
                        <div
                          style={{
                            position: "absolute",
                            left: `${bounds.offsetX}px`,
                            top: `${bounds.offsetY}px`,
                            width: `${bounds.visibleW}px`,
                            height: `${bounds.visibleH}px`,
                            pointerEvents: "none",
                          }}
                        >
                      {/* Highlight box */}
                      {rect && rect.x != null && rect.y != null && rect.w != null && rect.h != null && (
                        <div
                          className="absolute border-2 border-[#FBBF24] bg-[#FBBF24]/10 pointer-events-auto cursor-move select-none"
                          style={{
                            left: `${rect.x}%`,
                            top: `${rect.y}%`,
                            width: `${rect.w}%`,
                            height: `${rect.h}%`,
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setMode("rect");
                            const coords = getCanvasCoords(e);
                            if (!coords) return;
                            setDragItem({
                              type: "zoomRect",
                              startX: coords.x,
                              startY: coords.y,
                              initialX: currentAnn?.zoomRectX ?? 0,
                              initialY: currentAnn?.zoomRectY ?? 0,
                              initialW: currentAnn?.zoomRectWidth ?? 0,
                              initialH: currentAnn?.zoomRectHeight ?? 0,
                            });
                          }}
                        >
                          <div className="absolute top-1 left-1 bg-[#FBBF24] text-black text-[10px] font-mono px-1 rounded">
                            Highlight
                          </div>
                        </div>
                      )}

                      {/* Temp drag rect */}
                      {tempRect && (
                        <div
                          className="absolute border-2 border-dashed border-[var(--sketch-fg)]/50 pointer-events-none select-none"
                          style={{
                            left: `${tempRect.x}%`,
                            top: `${tempRect.y}%`,
                            width: `${tempRect.w}%`,
                            height: `${tempRect.h}%`,
                          }}
                        />
                      )}

                      {/* Crop overlay */}
                      {cropRect && cropRect.x != null && (
                        <div
                          className="absolute border-2 border-dashed border-emerald-400 bg-emerald-400/10 pointer-events-auto cursor-move select-none"
                          style={{
                            left: `${cropRect.x}%`,
                            top: `${cropRect.y}%`,
                            width: `${cropRect.w}%`,
                            height: `${cropRect.h}%`,
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setMode("crop");
                            const coords = getCanvasCoords(e);
                            if (!coords) return;
                            setDragItem({
                              type: "crop",
                              startX: coords.x,
                              startY: coords.y,
                              initialX: currentAnn?.editorCropX ?? 0,
                              initialY: currentAnn?.editorCropY ?? 0,
                              initialW: currentAnn?.editorCropW ?? 0,
                              initialH: currentAnn?.editorCropH ?? 0,
                            });
                          }}
                        >
                          <div className="absolute top-1 left-1 bg-emerald-500 text-white text-[10px] font-mono px-1 rounded">
                            Crop
                          </div>
                        </div>
                      )}

                      {/* Blur overlay */}
                      {blurRect && blurRect.x != null && (
                        <div
                          className="absolute pointer-events-auto cursor-move overflow-hidden select-none"
                          style={{
                            left: `${blurRect.x}%`,
                            top: `${blurRect.y}%`,
                            width: `${blurRect.w}%`,
                            height: `${blurRect.h}%`,
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setMode("blur");
                            const coords = getCanvasCoords(e);
                            if (!coords) return;
                            setDragItem({
                              type: "blur",
                              startX: coords.x,
                              startY: coords.y,
                              initialX: currentAnn?.editorBlurX ?? 0,
                              initialY: currentAnn?.editorBlurY ?? 0,
                              initialW: currentAnn?.editorBlurW ?? 0,
                              initialH: currentAnn?.editorBlurH ?? 0,
                            });
                          }}
                        >
                          <div
                            className="w-full h-full"
                            style={{
                              backdropFilter: `blur(${currentAnn?.editorBlurIntensity || 20}px)`,
                              WebkitBackdropFilter: `blur(${currentAnn?.editorBlurIntensity || 20}px)`,
                              backgroundColor: "rgba(255,255,255,0.05)",
                            }}
                          />
                          <div className="absolute top-1 left-1 bg-pink-500 text-white text-[10px] font-mono px-1 rounded">
                            Blur
                          </div>
                        </div>
                      )}

                      {/* Redact overlay */}
                      {redactRect && redactRect.x != null && (
                        <div
                          className="absolute pointer-events-auto cursor-move select-none"
                          style={{
                            left: `${redactRect.x}%`,
                            top: `${redactRect.y}%`,
                            width: `${redactRect.w}%`,
                            height: `${redactRect.h}%`,
                            backgroundColor: currentAnn?.editorRedactColor || "#000000",
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setMode("redact");
                            const coords = getCanvasCoords(e);
                            if (!coords) return;
                            setDragItem({
                              type: "redact",
                              startX: coords.x,
                              startY: coords.y,
                              initialX: currentAnn?.editorRedactX ?? 0,
                              initialY: currentAnn?.editorRedactY ?? 0,
                              initialW: currentAnn?.editorRedactW ?? 0,
                              initialH: currentAnn?.editorRedactH ?? 0,
                            });
                          }}
                        >
                          <div className="absolute top-1 left-1 bg-gray-700 text-white text-[10px] font-mono px-1 rounded">
                            Redacted
                          </div>
                        </div>
                      )}

                      {/* Watermark preview */}
                      {currentAnn?.editorWatermarkText && (
                        <div
                          className="absolute pointer-events-none select-none"
                          style={{
                            ...(currentAnn.editorWatermarkPosition?.includes("top")
                              ? { top: "5%" }
                              : { bottom: "5%" }),
                            ...(currentAnn.editorWatermarkPosition?.includes("left")
                              ? { left: "5%" }
                              : { right: "5%" }),
                            ...(currentAnn.editorWatermarkPosition === "center"
                              ? { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
                              : {}),
                          }}
                        >
                          <div
                            className="font-body font-bold whitespace-nowrap"
                            style={{
                              color: currentAnn.editorWatermarkColor || "#FFFFFF",
                              fontSize:
                                currentAnn.editorWatermarkSize === "small"
                                  ? "14px"
                                  : currentAnn.editorWatermarkSize === "large"
                                  ? "28px"
                                  : "20px",
                              opacity: currentAnn.editorWatermarkOpacity ?? 0.5,
                              textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                            }}
                          >
                            {currentAnn.editorWatermarkText}
                          </div>
                        </div>
                      )}

                      {/* Pixelate overlay */}
                      {pixelateRect && pixelateRect.x != null && (
                        <div
                          className="absolute pointer-events-auto cursor-move overflow-hidden select-none"
                          style={{
                            left: `${pixelateRect.x}%`,
                            top: `${pixelateRect.y}%`,
                            width: `${pixelateRect.w}%`,
                            height: `${pixelateRect.h}%`,
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setMode("pixelate");
                            const coords = getCanvasCoords(e);
                            if (!coords) return;
                            setDragItem({
                              type: "pixelate",
                              startX: coords.x,
                              startY: coords.y,
                              initialX: currentAnn?.editorPixelateX ?? 0,
                              initialY: currentAnn?.editorPixelateY ?? 0,
                              initialW: currentAnn?.editorPixelateW ?? 0,
                              initialH: currentAnn?.editorPixelateH ?? 0,
                            });
                          }}
                        >
                          <div
                            className="w-full h-full"
                            style={{
                              backdropFilter: `blur(0px)`,
                              backgroundImage: `repeating-conic-gradient(#808080 0% 25%, #a0a0a0 0% 50%)`,
                              backgroundSize: `${currentAnn?.editorPixelateBlockSize || 20}px ${currentAnn?.editorPixelateBlockSize || 20}px`,
                              opacity: 0.7,
                            }}
                          />
                          <div className="absolute top-1 left-1 bg-cyan-500 text-white text-[10px] font-mono px-1 rounded">
                            Pixelate
                          </div>
                        </div>
                      )}

                      {/* Spotlight overlay */}
                      {spotlightRect && spotlightRect.x != null && (
                        <>
                          <div
                            className="absolute pointer-events-none"
                            style={{
                              left: 0,
                              top: 0,
                              width: "100%",
                              height: "100%",
                              backgroundColor: `rgba(0,0,0,${currentAnn?.editorSpotlightIntensity ?? 0.6})`,
                              mixBlendMode: "multiply",
                            }}
                          />
                          <div
                            className="absolute pointer-events-auto cursor-move select-none"
                            style={{
                              left: `${spotlightRect.x}%`,
                              top: `${spotlightRect.y}%`,
                              width: `${spotlightRect.w}%`,
                              height: `${spotlightRect.h}%`,
                              boxShadow: `0 0 0 9999px rgba(0,0,0,${currentAnn?.editorSpotlightIntensity ?? 0.6})`,
                              borderRadius: "4px",
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setMode("spotlight");
                              const coords = getCanvasCoords(e);
                              if (!coords) return;
                              setDragItem({
                                type: "spotlight",
                                startX: coords.x,
                                startY: coords.y,
                                initialX: currentAnn?.editorSpotlightX ?? 0,
                                initialY: currentAnn?.editorSpotlightY ?? 0,
                                initialW: currentAnn?.editorSpotlightW ?? 0,
                                initialH: currentAnn?.editorSpotlightH ?? 0,
                              });
                            }}
                          >
                            <div className="absolute top-1 left-1 bg-orange-500 text-white text-[10px] font-mono px-1 rounded">
                              Spotlight
                            </div>
                          </div>
                        </>
                      )}

                      {/* Badge overlay */}
                      {currentAnn?.editorBadgeNumber != null && currentAnn?.editorBadgeX != null && (
                        <div
                          className="absolute pointer-events-auto cursor-move select-none"
                          style={{
                            left: `${currentAnn.editorBadgeX}%`,
                            top: `${currentAnn.editorBadgeY}%`,
                            transform: "translate(-50%, -50%)",
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setMode("badge");
                            const coords = getCanvasCoords(e);
                            if (!coords) return;
                            setDragItem({
                              type: "badge",
                              startX: coords.x,
                              startY: coords.y,
                              initialX: currentAnn?.editorBadgeX ?? 50,
                              initialY: currentAnn?.editorBadgeY ?? 50,
                            });
                          }}
                        >
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg"
                            style={{ backgroundColor: currentAnn.editorBadgeColor || "#FBBF24", color: "#000" }}
                          >
                            {currentAnn.editorBadgeNumber}
                          </div>
                        </div>
                      )}

                      {/* Magnify overlay */}
                      {currentAnn?.editorMagnifyX != null && currentAnn?.editorMagnifyW != null && (
                        <div
                          className="absolute pointer-events-auto cursor-move border-2 border-white shadow-lg overflow-hidden bg-black select-none"
                          style={{
                            ...(currentAnn.editorMagnifyCorner?.includes("top") ? { top: "10px" } : { bottom: "10px" }),
                            ...(currentAnn.editorMagnifyCorner?.includes("left") ? { left: "10px" } : { right: "10px" }),
                            width: "120px",
                            height: "120px",
                            borderRadius: "8px",
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setMode("magnify");
                            const coords = getCanvasCoords(e);
                            if (!coords) return;
                            setDragItem({
                              type: "magnify",
                              startX: coords.x,
                              startY: coords.y,
                              initialX: currentAnn?.editorMagnifyX ?? 50,
                              initialY: currentAnn?.editorMagnifyY ?? 50,
                            });
                          }}
                        >
                          <div
                            className="w-full h-full"
                            style={{
                              backgroundImage: `url(${currentStep.screenshotPath})`,
                              backgroundPosition: `${currentAnn.editorMagnifyX}% ${currentAnn.editorMagnifyY}%`,
                              backgroundSize: `${(currentAnn.editorMagnifyScale ?? 2) * 100}%`,
                              backgroundRepeat: "no-repeat",
                            }}
                          />
                          <div className="absolute top-0 left-0 bg-teal-500 text-white text-[8px] font-mono px-1 rounded-br">
                            {currentAnn.editorMagnifyScale ?? 2}x
                          </div>
                        </div>
                      )}

                      {/* Color filter overlay */}
                      {currentAnn?.editorColorFilter && currentAnn.editorColorFilter !== "none" && (
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            filter:
                              currentAnn.editorColorFilter === "grayscale"
                                ? "grayscale(100%)"
                                : currentAnn.editorColorFilter === "sepia"
                                ? "sepia(100%)"
                                : currentAnn.editorColorFilter === "warm"
                                ? "sepia(50%) saturate(140%)"
                                : currentAnn.editorColorFilter === "cool"
                                ? "hue-rotate(180deg) saturate(80%)"
                                : currentAnn.editorColorFilter === "contrast"
                                ? "contrast(150%) saturate(120%)"
                                : "none",
                            mixBlendMode: currentAnn.editorColorFilter === "contrast" ? "normal" : "multiply",
                            opacity: 0.3,
                          }}
                        />
                      )}

                      {/* Text overlay */}
                      {overlayPos && overlayPos.x != null && currentAnn?.editorOverlayText && (
                        <div
                          className="absolute pointer-events-auto cursor-move select-none"
                          style={{
                            left: `${overlayPos.x}%`,
                            top: `${overlayPos.y}%`,
                            transform: "translate(-50%, -50%)",
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setMode("overlay");
                            const coords = getCanvasCoords(e);
                            if (!coords) return;
                            setDragItem({
                              type: "overlay",
                              startX: coords.x,
                              startY: coords.y,
                              initialX: currentAnn?.editorOverlayX ?? 50,
                              initialY: currentAnn?.editorOverlayY ?? 50,
                            });
                          }}
                        >
                          <div
                            className="px-3 py-1.5 rounded shadow-lg font-body font-semibold whitespace-nowrap"
                            style={{
                              backgroundColor: "rgba(0,0,0,0.6)",
                              color: currentAnn.editorOverlayColor || "#FFFFFF",
                              fontSize:
                                currentAnn.editorOverlaySize === "small"
                                  ? "12px"
                                  : currentAnn.editorOverlaySize === "large"
                                  ? "20px"
                                  : "16px",
                            }}
                          >
                            {currentAnn.editorOverlayText}
                          </div>
                        </div>
                      )}

                      {/* Zoom target point */}
                      {currentAnn?.zoomTargetX != null && currentAnn?.zoomTargetY != null && (
                        <div
                          className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-move select-none"
                          style={{
                            left: `${currentAnn.zoomTargetX}%`,
                            top: `${currentAnn.zoomTargetY}%`,
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setMode("point");
                            const coords = getCanvasCoords(e);
                            if (!coords) return;
                            setDragItem({
                              type: "zoomTarget",
                              startX: coords.x,
                              startY: coords.y,
                              initialX: currentAnn?.zoomTargetX ?? 50,
                              initialY: currentAnn?.zoomTargetY ?? 50,
                            });
                          }}
                        >
                          <div className="w-full h-full rounded-full border-2 border-[#FBBF24] bg-[#FBBF24]/30 animate-pulse" />
                        </div>
                      )}

                      {/* Multi-zoom points */}
                      {currentAnn?.editorMultiZooms?.map((mz, idx) => (
                        <div key={mz.id}
                          className="absolute pointer-events-auto cursor-move select-none"
                          style={{
                            left: `${mz.targetX}%`,
                            top: `${mz.targetY}%`,
                            transform: "translate(-50%, -50%)",
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setMode("multizoom");
                            const coords = getCanvasCoords(e);
                            if (!coords) return;
                            setDragItem({
                              type: "multizoom",
                              id: mz.id,
                              startX: coords.x,
                              startY: coords.y,
                              initialX: mz.targetX,
                              initialY: mz.targetY,
                            });
                          }}
                        >
                          <div className="w-6 h-6 rounded-full bg-violet-500 text-white flex items-center justify-center text-xs font-bold shadow-lg border-2 border-white">
                            {idx + 1}
                          </div>
                          {mz.rectW != null && mz.rectH != null && (
                            <div
                              className="absolute border-2 border-violet-400 pointer-events-none"
                              style={{
                                left: `${-((mz.rectW || 0) / 2)}%`,
                                top: `${-((mz.rectH || 0) / 2)}%`,
                                width: `${mz.rectW}%`,
                                height: `${mz.rectH}%`,
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Mode indicator */}
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-mono px-2 py-1 rounded z-10">
                    {mode === "rect" && "Highlight Box"}
                    {mode === "point" && "Zoom Point"}
                    {mode === "overlay" && "Click to place text"}
                    {mode === "crop" && "Drag to crop"}
                    {mode === "blur" && "Drag to blur area"}
                    {mode === "redact" && "Drag to redact area"}
                    {mode === "watermark" && "Click to place watermark"}
                    {mode === "pixelate" && "Drag to pixelate area"}
                    {mode === "spotlight" && "Drag spotlight area"}
                    {mode === "badge" && "Click to place badge"}
                    {mode === "magnify" && "Click to place magnifier"}
                    {mode === "filter" && "Select filter from panel"}
                    {mode === "multizoom" && "Click to add zoom point. Use panel to edit."}
                    {mode === "caption" && "Narration Subtitles"}
                  </div>
                </div>
              </div>
            </div>

                {/* Step description */}
                <div className="mt-3 p-3 bg-[var(--sketch-fg-subtle)]/5 rounded border border-[var(--sketch-fg-subtle)]/20">
                  <p className="text-sm font-body text-[var(--sketch-fg-muted)]">
                    <span className="font-semibold text-[var(--sketch-fg)]">Description:</span>{" "}
                    {currentStep.description}
                  </p>
                  {(currentStep.aiScript || currentStep.userEditedScript) && (
                    <p className="text-xs font-body text-[var(--sketch-fg-muted)] mt-1">
                      <span className="font-semibold">Script:</span>{" "}
                      {currentStep.userEditedScript || currentStep.aiScript}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bottom: Properties panel */}
        <div className="mt-3 sketch-card p-4 bg-[var(--sketch-card-bg)]">
          <h3 className="font-mono text-xs text-[var(--sketch-fg-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Settings2 className="w-3 h-3" />
            Properties
          </h3>

          {/* Tool Guide */}
          <div className="mb-3 p-2.5 bg-[var(--sketch-fg-subtle)]/5 rounded border border-[var(--sketch-fg-subtle)]/20">
            <div className="flex items-start gap-2">
              <HelpCircle className="w-3.5 h-3.5 text-[var(--sketch-fg-muted)] mt-0.5 shrink-0" />
              <div className="text-[11px] text-[var(--sketch-fg-muted)] leading-relaxed">
                {mode === "select" && (
                  <><span className="font-semibold text-[var(--sketch-fg)]">Select Tool:</span> Select annotations on the canvas to edit or reposition them.</>
                )}
                {mode === "rect" && (
                  <><span className="font-semibold text-[var(--sketch-fg)]">Highlight Box:</span> Drag on the canvas to draw an orange highlight rectangle. This marks the area the main zoom will focus on.</>
                )}
                {mode === "point" && (
                  <><span className="font-semibold text-[var(--sketch-fg)]">Zoom Point:</span> Click anywhere on the screenshot to set a single zoom target. Use the Zoom settings below to adjust scale.</>
                )}
                {mode === "overlay" && (
                  <><span className="font-semibold text-[var(--sketch-fg)]">Text Overlay:</span> Click on the canvas to place text. Edit the text, color, and size in the settings below.</>
                )}
                {mode === "crop" && (
                  <><span className="font-semibold text-[var(--sketch-fg)]">Crop:</span> Drag to select the area you want to keep. Everything outside will be removed.</>
                )}
                {mode === "blur" && (
                  <><span className="font-semibold text-[var(--sketch-fg)]">Blur:</span> Drag over sensitive information (emails, names, API keys) to blur it. Adjust intensity in the settings below.</>
                )}
                {mode === "redact" && (
                  <><span className="font-semibold text-[var(--sketch-fg)]">Redact:</span> Drag over areas to cover with a solid color block. Choose color in the settings below.</>
                )}
                {mode === "watermark" && (
                  <><span className="font-semibold text-[var(--sketch-fg)]">Watermark:</span> Click to set position. Edit text, size, color, and opacity in the settings below.</>
                )}
                {mode === "pixelate" && (
                  <><span className="font-semibold text-[var(--sketch-fg)]">Pixelate:</span> Drag over faces, license plates, or sensitive UI to pixelate. Adjust block size in the settings below.</>
                )}
                {mode === "spotlight" && (
                  <><span className="font-semibold text-[var(--sketch-fg)]">Spotlight:</span> Drag to highlight a region while dimming the rest. Adjust dim intensity in the settings below.</>
                )}
                {mode === "badge" && (
                  <><span className="font-semibold text-[var(--sketch-fg)]">Badge:</span> Click to place a numbered circle. Edit number and color in the settings below.</>
                )}
                {mode === "magnify" && (
                  <><span className="font-semibold text-[var(--sketch-fg)]">Magnify:</span> Click to set the target area. A zoomed inset will appear in a corner. Adjust scale and corner in the settings below.</>
                )}
                {mode === "filter" && (
                  <><span className="font-semibold text-[var(--sketch-fg)]">Filter:</span> Select a color filter from the settings below. Applies to the entire screenshot for this step.</>
                )}
                {mode === "multizoom" && (
                  <><span className="font-semibold text-[var(--sketch-fg)]">Multi-Zoom:</span> Click multiple times on the canvas to add zoom points. Each point becomes a separate animated zoom segment. Edit scale and duration per point in the settings below.</>
                )}
                {mode === "pan" && (
                  <><span className="font-semibold text-[var(--sketch-fg)]">Pan:</span> Drag to pan around the canvas when zoomed in. No edits are made in this mode.</>
                )}
                {mode === "caption" && (
                  <><span className="font-semibold text-[var(--sketch-fg)]">Subtitles:</span> Add narration subtitles for the TTS generation.</>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Caption Properties */}
            {activeTab === "caption" && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-mono">Caption Text</Label>
                  <Textarea
                    value={currentAnn?.editorCaptionText || ""}
                    onChange={(e) =>
                      setAnnotations((prev) => ({
                        ...prev,
                        [currentStep!.id]: {
                          ...prev[currentStep!.id],
                          editorCaptionText: e.target.value,
                        },
                      }))
                    }
                    onBlur={() => pushHistory(annotations)}
                    placeholder="Enter caption for this step..."
                    className="mt-1 text-sm min-h-[80px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-mono">Position</Label>
                    <Select
                      value={currentAnn?.editorCaptionPosition || "bottom"}
                      onValueChange={(v) => {
                        pushHistory({
                          ...annotations,
                          [currentStep!.id]: {
                            ...(annotations[currentStep!.id] || {}),
                            editorCaptionPosition: v,
                          },
                        });
                      }}
                    >
                      <SelectTrigger className="mt-1 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top">Top</SelectItem>
                        <SelectItem value="bottom">Bottom</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-mono">Style</Label>
                    <Select
                      value={currentAnn?.editorCaptionStyle || "standard"}
                      onValueChange={(v) => {
                        pushHistory({
                          ...annotations,
                          [currentStep!.id]: {
                            ...(annotations[currentStep!.id] || {}),
                            editorCaptionStyle: v,
                          },
                        });
                      }}
                    >
                      <SelectTrigger className="mt-1 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="subtitle">Subtitle</SelectItem>
                        <SelectItem value="title">Title</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-mono">Color</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={currentAnn?.editorCaptionColor || "#FFFFFF"}
                        onChange={(e) =>
                          setAnnotations((prev) => ({
                            ...prev,
                            [currentStep!.id]: {
                              ...prev[currentStep!.id],
                              editorCaptionColor: e.target.value,
                            },
                          }))
                        }
                        onBlur={() => pushHistory(annotations)}
                        className="w-8 h-8 rounded border border-[var(--sketch-fg-subtle)]/30"
                      />
                      <span className="text-xs font-mono text-[var(--sketch-fg-muted)]">
                        {currentAnn?.editorCaptionColor || "#FFFFFF"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-mono">Size</Label>
                    <Select
                      value={currentAnn?.editorCaptionSize || "medium"}
                      onValueChange={(v) => {
                        pushHistory({
                          ...annotations,
                          [currentStep!.id]: {
                            ...(annotations[currentStep!.id] || {}),
                            editorCaptionSize: v,
                          },
                        });
                      }}
                    >
                      <SelectTrigger className="mt-1 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {currentAnn?.editorCaptionText && (
                  <button
                    onClick={() => handleClear("editorCaptionText")}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear caption
                  </button>
                )}
              </div>
            )}

            {/* Overlay Properties */}
            {activeTab === "overlay" && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-mono">Overlay Text</Label>
                  <Textarea
                    value={currentAnn?.editorOverlayText || ""}
                    onChange={(e) =>
                      setAnnotations((prev) => ({
                        ...prev,
                        [currentStep!.id]: {
                          ...prev[currentStep!.id],
                          editorOverlayText: e.target.value,
                        },
                      }))
                    }
                    onBlur={() => pushHistory(annotations)}
                    placeholder="Text to overlay on image..."
                    className="mt-1 text-sm min-h-[60px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-mono">X Position (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={currentAnn?.editorOverlayX ?? ""}
                      onChange={(e) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorOverlayX: Number(e.target.value),
                          },
                        }))
                      }
                      onBlur={() => pushHistory(annotations)}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-mono">Y Position (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={currentAnn?.editorOverlayY ?? ""}
                      onChange={(e) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorOverlayY: Number(e.target.value),
                          },
                        }))
                      }
                      onBlur={() => pushHistory(annotations)}
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-mono">Color</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={currentAnn?.editorOverlayColor || "#FFFFFF"}
                        onChange={(e) =>
                          setAnnotations((prev) => ({
                            ...prev,
                            [currentStep!.id]: {
                              ...prev[currentStep!.id],
                              editorOverlayColor: e.target.value,
                            },
                          }))
                        }
                        onBlur={() => pushHistory(annotations)}
                        className="w-8 h-8 rounded border border-[var(--sketch-fg-subtle)]/30"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-mono">Size</Label>
                    <Select
                      value={currentAnn?.editorOverlaySize || "medium"}
                      onValueChange={(v) => {
                        pushHistory({
                          ...annotations,
                          [currentStep!.id]: {
                            ...(annotations[currentStep!.id] || {}),
                            editorOverlaySize: v,
                          },
                        });
                      }}
                    >
                      <SelectTrigger className="mt-1 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <p className="text-[10px] text-[var(--sketch-fg-muted)]">
                  ≡ Select "Text Overlay" tool and click on canvas to set position
                </p>

                {currentAnn?.editorOverlayText && (
                  <button
                    onClick={() => {
                      handleClear("editorOverlayText");
                      handleClear("editorOverlayX");
                      handleClear("editorOverlayY");
                    }}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear overlay
                  </button>
                )}
              </div>
            )}

            {/* Crop Properties */}
            {activeTab === "crop" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-mono">X (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={currentAnn?.editorCropX ?? ""}
                      onChange={(e) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorCropX: Number(e.target.value),
                          },
                        }))
                      }
                      onBlur={() => pushHistory(annotations)}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-mono">Y (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={currentAnn?.editorCropY ?? ""}
                      onChange={(e) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorCropY: Number(e.target.value),
                          },
                        }))
                      }
                      onBlur={() => pushHistory(annotations)}
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-mono">Width (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={currentAnn?.editorCropW ?? ""}
                      onChange={(e) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorCropW: Number(e.target.value),
                          },
                        }))
                      }
                      onBlur={() => pushHistory(annotations)}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-mono">Height (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={currentAnn?.editorCropH ?? ""}
                      onChange={(e) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorCropH: Number(e.target.value),
                          },
                        }))
                      }
                      onBlur={() => pushHistory(annotations)}
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-[var(--sketch-fg-muted)]">
                  ≡ Select "Crop" tool and drag on canvas to define crop area
                </p>

                {currentAnn?.editorCropX != null && (
                  <button
                    onClick={() => {
                      handleClear("editorCropX");
                      handleClear("editorCropY");
                      handleClear("editorCropW");
                      handleClear("editorCropH");
                    }}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear crop
                  </button>
                )}
              </div>
            )}

            {/* Blur Properties */}
            {activeTab === "blur" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-mono">X (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={currentAnn?.editorBlurX ?? ""}
                      onChange={(e) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorBlurX: Number(e.target.value),
                          },
                        }))
                      }
                      onBlur={() => pushHistory(annotations)}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-mono">Y (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={currentAnn?.editorBlurY ?? ""}
                      onChange={(e) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorBlurY: Number(e.target.value),
                          },
                        }))
                      }
                      onBlur={() => pushHistory(annotations)}
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-mono">Width (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={currentAnn?.editorBlurW ?? ""}
                      onChange={(e) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorBlurW: Number(e.target.value),
                          },
                        }))
                      }
                      onBlur={() => pushHistory(annotations)}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-mono">Height (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={currentAnn?.editorBlurH ?? ""}
                      onChange={(e) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorBlurH: Number(e.target.value),
                          },
                        }))
                      }
                      onBlur={() => pushHistory(annotations)}
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-mono">Blur Intensity</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <Slider
                      value={[currentAnn?.editorBlurIntensity ?? 20]}
                      min={5}
                      max={60}
                      step={1}
                      onValueChange={([v]) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorBlurIntensity: v,
                          },
                        }))
                      }
                      onValueCommit={([v]) => {
                        pushHistory({
                          ...annotations,
                          [currentStep!.id]: {
                            ...(annotations[currentStep!.id] || {}),
                            editorBlurIntensity: v,
                          },
                        });
                      }}
                      className="flex-1"
                    />
                    <span className="text-xs font-mono w-10 text-right">
                      {currentAnn?.editorBlurIntensity || 20}px
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-[var(--sketch-fg-muted)]">
                  ≡ Select "Blur" tool and drag on canvas to define blur area
                </p>

                {currentAnn?.editorBlurX != null && (
                  <button
                    onClick={() => {
                      handleClear("editorBlurX");
                      handleClear("editorBlurY");
                      handleClear("editorBlurW");
                      handleClear("editorBlurH");
                      handleClear("editorBlurIntensity");
                    }}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear blur
                  </button>
                )}
              </div>
            )}

            {/* Redact Properties */}
            {activeTab === "redact" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-mono">X (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={currentAnn?.editorRedactX ?? ""}
                      onChange={(e) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorRedactX: Number(e.target.value),
                          },
                        }))
                      }
                      onBlur={() => pushHistory(annotations)}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-mono">Y (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={currentAnn?.editorRedactY ?? ""}
                      onChange={(e) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorRedactY: Number(e.target.value),
                          },
                        }))
                      }
                      onBlur={() => pushHistory(annotations)}
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-mono">Width (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={currentAnn?.editorRedactW ?? ""}
                      onChange={(e) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorRedactW: Number(e.target.value),
                          },
                        }))
                      }
                      onBlur={() => pushHistory(annotations)}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-mono">Height (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={currentAnn?.editorRedactH ?? ""}
                      onChange={(e) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorRedactH: Number(e.target.value),
                          },
                        }))
                      }
                      onBlur={() => pushHistory(annotations)}
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-mono">Redact Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={currentAnn?.editorRedactColor || "#000000"}
                      onChange={(e) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorRedactColor: e.target.value,
                          },
                        }))
                      }
                      onBlur={() => pushHistory(annotations)}
                      className="w-8 h-8 rounded border border-[var(--sketch-fg-subtle)]/30"
                    />
                    <span className="text-xs font-mono text-[var(--sketch-fg-muted)]">
                      {currentAnn?.editorRedactColor || "#000000"}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-[var(--sketch-fg-muted)]">
                  ≡ Select "Redact" tool and drag on canvas to cover sensitive info completely
                </p>

                {currentAnn?.editorRedactX != null && (
                  <button
                    onClick={() => {
                      handleClear("editorRedactX");
                      handleClear("editorRedactY");
                      handleClear("editorRedactW");
                      handleClear("editorRedactH");
                      handleClear("editorRedactColor");
                    }}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear redaction
                  </button>
                )}
              </div>
            )}

            {/* Watermark Properties */}
            {activeTab === "watermark" && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-mono">Watermark Text</Label>
                  <Input
                    value={currentAnn?.editorWatermarkText || ""}
                    onChange={(e) =>
                      setAnnotations((prev) => ({
                        ...prev,
                        [currentStep!.id]: {
                          ...prev[currentStep!.id],
                          editorWatermarkText: e.target.value,
                        },
                      }))
                    }
                    onBlur={() => pushHistory(annotations)}
                    placeholder="@username or brand name"
                    className="mt-1 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-mono">Position</Label>
                    <Select
                      value={currentAnn?.editorWatermarkPosition || "bottom-right"}
                      onValueChange={(v) => {
                        pushHistory({
                          ...annotations,
                          [currentStep!.id]: {
                            ...(annotations[currentStep!.id] || {}),
                            editorWatermarkPosition: v,
                          },
                        });
                      }}
                    >
                      <SelectTrigger className="mt-1 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top-left">Top Left</SelectItem>
                        <SelectItem value="top-right">Top Right</SelectItem>
                        <SelectItem value="bottom-left">Bottom Left</SelectItem>
                        <SelectItem value="bottom-right">Bottom Right</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-mono">Size</Label>
                    <Select
                      value={currentAnn?.editorWatermarkSize || "small"}
                      onValueChange={(v) => {
                        pushHistory({
                          ...annotations,
                          [currentStep!.id]: {
                            ...(annotations[currentStep!.id] || {}),
                            editorWatermarkSize: v,
                          },
                        });
                      }}
                    >
                      <SelectTrigger className="mt-1 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-mono">Color</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={currentAnn?.editorWatermarkColor || "#FFFFFF"}
                        onChange={(e) =>
                          setAnnotations((prev) => ({
                            ...prev,
                            [currentStep!.id]: {
                              ...prev[currentStep!.id],
                              editorWatermarkColor: e.target.value,
                            },
                          }))
                        }
                        onBlur={() => pushHistory(annotations)}
                        className="w-8 h-8 rounded border border-[var(--sketch-fg-subtle)]/30"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-mono">Opacity</Label>
                    <div className="flex items-center gap-3 mt-1">
                      <Slider
                        value={[Math.round((currentAnn?.editorWatermarkOpacity ?? 0.5) * 100)]}
                        min={10}
                        max={100}
                        step={5}
                        onValueChange={([v]) =>
                          setAnnotations((prev) => ({
                            ...prev,
                            [currentStep!.id]: {
                              ...prev[currentStep!.id],
                              editorWatermarkOpacity: v / 100,
                            },
                          }))
                        }
                        onValueCommit={([v]) => {
                          pushHistory({
                            ...annotations,
                            [currentStep!.id]: {
                              ...(annotations[currentStep!.id] || {}),
                              editorWatermarkOpacity: v / 100,
                            },
                          });
                        }}
                        className="flex-1"
                      />
                      <span className="text-xs font-mono w-10 text-right">
                        {Math.round((currentAnn?.editorWatermarkOpacity ?? 0.5) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {currentAnn?.editorWatermarkText && (
                  <button
                    onClick={() => {
                      handleClear("editorWatermarkText");
                      handleClear("editorWatermarkPosition");
                      handleClear("editorWatermarkSize");
                      handleClear("editorWatermarkColor");
                      handleClear("editorWatermarkOpacity");
                    }}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear watermark
                  </button>
                )}
              </div>
            )}

            {/* Pixelate Properties */}
            {activeTab === "pixelate" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-mono">X (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={currentAnn?.editorPixelateX ?? ""}
                      onChange={(e) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorPixelateX: Number(e.target.value),
                          },
                        }))
                      }
                      onBlur={() => pushHistory(annotations)}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-mono">Y (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={currentAnn?.editorPixelateY ?? ""}
                      onChange={(e) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorPixelateY: Number(e.target.value),
                          },
                        }))
                      }
                      onBlur={() => pushHistory(annotations)}
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-mono">Width (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={currentAnn?.editorPixelateW ?? ""}
                      onChange={(e) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorPixelateW: Number(e.target.value),
                          },
                        }))
                      }
                      onBlur={() => pushHistory(annotations)}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-mono">Height (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={currentAnn?.editorPixelateH ?? ""}
                      onChange={(e) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorPixelateH: Number(e.target.value),
                          },
                        }))
                      }
                      onBlur={() => pushHistory(annotations)}
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-mono">Block Size</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <Slider
                      value={[currentAnn?.editorPixelateBlockSize ?? 20]}
                      min={5}
                      max={60}
                      step={1}
                      onValueChange={([v]) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorPixelateBlockSize: v,
                          },
                        }))
                      }
                      onValueCommit={([v]) => {
                        pushHistory({
                          ...annotations,
                          [currentStep!.id]: {
                            ...(annotations[currentStep!.id] || {}),
                            editorPixelateBlockSize: v,
                          },
                        });
                      }}
                      className="flex-1"
                    />
                    <span className="text-xs font-mono w-10 text-right">
                      {currentAnn?.editorPixelateBlockSize || 20}px
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-[var(--sketch-fg-muted)]">
                  ≡ Select "Pixelate" tool and drag on canvas to mosaic sensitive UI
                </p>

                {currentAnn?.editorPixelateX != null && (
                  <button
                    onClick={() => {
                      handleClear("editorPixelateX");
                      handleClear("editorPixelateY");
                      handleClear("editorPixelateW");
                      handleClear("editorPixelateH");
                      handleClear("editorPixelateBlockSize");
                    }}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear pixelate
                  </button>
                )}
              </div>
            )}

            {/* Spotlight Properties */}
            {activeTab === "spotlight" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-mono">X (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={currentAnn?.editorSpotlightX ?? ""}
                      onChange={(e) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorSpotlightX: Number(e.target.value),
                          },
                        }))
                      }
                      onBlur={() => pushHistory(annotations)}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-mono">Y (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={currentAnn?.editorSpotlightY ?? ""}
                      onChange={(e) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorSpotlightY: Number(e.target.value),
                          },
                        }))
                      }
                      onBlur={() => pushHistory(annotations)}
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-mono">Width (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={currentAnn?.editorSpotlightW ?? ""}
                      onChange={(e) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorSpotlightW: Number(e.target.value),
                          },
                        }))
                      }
                      onBlur={() => pushHistory(annotations)}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-mono">Height (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={currentAnn?.editorSpotlightH ?? ""}
                      onChange={(e) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorSpotlightH: Number(e.target.value),
                          },
                        }))
                      }
                      onBlur={() => pushHistory(annotations)}
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-mono">Dim Intensity</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <Slider
                      value={[Math.round((currentAnn?.editorSpotlightIntensity ?? 0.6) * 100)]}
                      min={10}
                      max={90}
                      step={5}
                      onValueChange={([v]) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorSpotlightIntensity: v / 100,
                          },
                        }))
                      }
                      onValueCommit={([v]) => {
                        pushHistory({
                          ...annotations,
                          [currentStep!.id]: {
                            ...(annotations[currentStep!.id] || {}),
                            editorSpotlightIntensity: v / 100,
                          },
                        });
                      }}
                      className="flex-1"
                    />
                    <span className="text-xs font-mono w-10 text-right">
                      {Math.round((currentAnn?.editorSpotlightIntensity ?? 0.6) * 100)}%
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-[var(--sketch-fg-muted)]">
                  ≡ Select "Spotlight" tool and drag to highlight a region while dimming everything else
                </p>

                {currentAnn?.editorSpotlightX != null && (
                  <button
                    onClick={() => {
                      handleClear("editorSpotlightX");
                      handleClear("editorSpotlightY");
                      handleClear("editorSpotlightW");
                      handleClear("editorSpotlightH");
                      handleClear("editorSpotlightIntensity");
                    }}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear spotlight
                  </button>
                )}
              </div>
            )}

            {/* Badge Properties */}
            {activeTab === "badge" && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-mono">Badge Number</Label>
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    value={currentAnn?.editorBadgeNumber ?? ""}
                    onChange={(e) =>
                      setAnnotations((prev) => ({
                        ...prev,
                        [currentStep!.id]: {
                          ...prev[currentStep!.id],
                          editorBadgeNumber: Number(e.target.value),
                        },
                      }))
                    }
                    onBlur={() => pushHistory(annotations)}
                    className="mt-1 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-mono">X (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={currentAnn?.editorBadgeX ?? ""}
                      onChange={(e) => setAnnotations((prev) => ({...prev, [currentStep!.id]: {...prev[currentStep!.id], editorBadgeX: Number(e.target.value)}}))}
                      onBlur={() => pushHistory(annotations)}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-mono">Y (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={currentAnn?.editorBadgeY ?? ""}
                      onChange={(e) => setAnnotations((prev) => ({...prev, [currentStep!.id]: {...prev[currentStep!.id], editorBadgeY: Number(e.target.value)}}))}
                      onBlur={() => pushHistory(annotations)}
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-mono">Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={currentAnn?.editorBadgeColor || "#FBBF24"}
                      onChange={(e) => setAnnotations((prev) => ({...prev, [currentStep!.id]: {...prev[currentStep!.id], editorBadgeColor: e.target.value}}))}
                      onBlur={() => pushHistory(annotations)}
                      className="w-8 h-8 rounded border border-[var(--sketch-fg-subtle)]/30"
                    />
                    <span className="text-xs font-mono text-[var(--sketch-fg-muted)]">{currentAnn?.editorBadgeColor || "#FBBF24"}</span>
                  </div>
                </div>
                <p className="text-[10px] text-[var(--sketch-fg-muted)]">≡ Select "Badge" tool and click on canvas to place</p>
                {currentAnn?.editorBadgeNumber != null && (
                  <button onClick={() => { handleClear("editorBadgeNumber"); handleClear("editorBadgeX"); handleClear("editorBadgeY"); handleClear("editorBadgeColor"); }} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"><Trash2 className="w-3 h-3" /> Clear badge</button>
                )}
              </div>
            )}

            {/* Magnify Properties */}
            {activeTab === "magnify" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs font-mono">X (%)</Label><Input type="number" min={0} max={100} value={currentAnn?.editorMagnifyX ?? ""} onChange={(e) => setAnnotations((prev) => ({...prev, [currentStep!.id]: {...prev[currentStep!.id], editorMagnifyX: Number(e.target.value)}}))} onBlur={() => pushHistory(annotations)} className="mt-1 text-xs" /></div>
                  <div><Label className="text-xs font-mono">Y (%)</Label><Input type="number" min={0} max={100} value={currentAnn?.editorMagnifyY ?? ""} onChange={(e) => setAnnotations((prev) => ({...prev, [currentStep!.id]: {...prev[currentStep!.id], editorMagnifyY: Number(e.target.value)}}))} onBlur={() => pushHistory(annotations)} className="mt-1 text-xs" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs font-mono">Width (%)</Label><Input type="number" min={0} max={100} value={currentAnn?.editorMagnifyW ?? ""} onChange={(e) => setAnnotations((prev) => ({...prev, [currentStep!.id]: {...prev[currentStep!.id], editorMagnifyW: Number(e.target.value)}}))} onBlur={() => pushHistory(annotations)} className="mt-1 text-xs" /></div>
                  <div><Label className="text-xs font-mono">Height (%)</Label><Input type="number" min={0} max={100} value={currentAnn?.editorMagnifyH ?? ""} onChange={(e) => setAnnotations((prev) => ({...prev, [currentStep!.id]: {...prev[currentStep!.id], editorMagnifyH: Number(e.target.value)}}))} onBlur={() => pushHistory(annotations)} className="mt-1 text-xs" /></div>
                </div>
                <div>
                  <Label className="text-xs font-mono">Zoom Scale</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <Slider
                      value={[currentAnn?.editorMagnifyScale ?? 2]}
                      min={1.5}
                      max={5}
                      step={0.5}
                      onValueChange={([v]) => setAnnotations((prev) => ({...prev, [currentStep!.id]: {...prev[currentStep!.id], editorMagnifyScale: v}}))}
                      onValueCommit={([v]) => {
                        pushHistory({
                          ...annotations,
                          [currentStep!.id]: {
                            ...(annotations[currentStep!.id] || {}),
                            editorMagnifyScale: v,
                          },
                        });
                      }}
                      className="flex-1"
                    />
                    <span className="text-xs font-mono w-10 text-right">{currentAnn?.editorMagnifyScale?.toFixed(1) || "2.0"}x</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-mono">Corner Position</Label>
                  <Select
                    value={currentAnn?.editorMagnifyCorner || "bottom-right"}
                    onValueChange={(v) => {
                      pushHistory({
                        ...annotations,
                        [currentStep!.id]: {
                          ...(annotations[currentStep!.id] || {}),
                          editorMagnifyCorner: v,
                        },
                      });
                    }}
                  >
                    <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top-left">Top Left</SelectItem>
                      <SelectItem value="top-right">Top Right</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[10px] text-[var(--sketch-fg-muted)]">≡ Select "Magnify" tool and click on canvas to set target</p>
                {currentAnn?.editorMagnifyX != null && (
                  <button onClick={() => { handleClear("editorMagnifyX"); handleClear("editorMagnifyY"); handleClear("editorMagnifyW"); handleClear("editorMagnifyH"); handleClear("editorMagnifyScale"); handleClear("editorMagnifyCorner"); }} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"><Trash2 className="w-3 h-3" /> Clear magnify</button>
                )}
              </div>
            )}

            {/* Filter Properties */}
            {activeTab === "filter" && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-mono">Color Filter</Label>
                  <Select
                    value={currentAnn?.editorColorFilter || "none"}
                    onValueChange={(v) => {
                      pushHistory({
                        ...annotations,
                        [currentStep!.id]: {
                          ...(annotations[currentStep!.id] || {}),
                          editorColorFilter: v,
                        },
                      });
                    }}
                  >
                    <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Original)</SelectItem>
                      <SelectItem value="grayscale">Grayscale</SelectItem>
                      <SelectItem value="sepia">Sepia</SelectItem>
                      <SelectItem value="warm">Warm</SelectItem>
                      <SelectItem value="cool">Cool</SelectItem>
                      <SelectItem value="contrast">High Contrast</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[10px] text-[var(--sketch-fg-muted)]">≡ Applies to the entire screenshot for this step</p>
                {currentAnn?.editorColorFilter && currentAnn.editorColorFilter !== "none" && (
                  <button onClick={() => handleClear("editorColorFilter")} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"><Trash2 className="w-3 h-3" /> Clear filter</button>
                )}
              </div>
            )}

            {/* Multi-Zoom Properties */}
            {activeTab === "multizoom" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-mono">Zoom Points ({currentAnn?.editorMultiZooms?.length || 0})</Label>
                  <button
                    onClick={() => {
                      const nextState = {
                        ...annotations,
                        [currentStep!.id]: {
                          ...(annotations[currentStep!.id] || {}),
                          editorMultiZooms: [],
                        },
                      };
                      pushHistory(nextState);
                    }}
                    className="text-[10px] text-red-500 hover:text-red-600"
                  >
                    Clear all
                  </button>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {currentAnn?.editorMultiZooms?.map((mz, idx) => (
                    <div key={mz.id} className="p-2 border border-[var(--sketch-fg-subtle)]/20 rounded bg-[var(--sketch-fg-subtle)]/5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono font-semibold">Point {idx + 1}</span>
                        <button
                          onClick={() => {
                            setAnnotations((prev) => {
                              const stepAnn = prev[currentStep.id] || {};
                              const updated = {
                                ...stepAnn,
                                editorMultiZooms: stepAnn.editorMultiZooms?.filter((z) => z.id !== mz.id) || [],
                              };
                              const nextStateFull = { ...prev, [currentStep.id]: updated };
                              pushHistory(nextStateFull);
                              return nextStateFull;
                            });
                          }}
                          className="text-[10px] text-red-500 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <div><Label className="text-[10px] font-mono">X</Label><Input type="number" min={0} max={100} value={mz.targetX} onChange={(e) => {
                          const v = Number(e.target.value);
                          setAnnotations((prev) => ({
                            ...prev,
                            [currentStep!.id]: {
                              ...prev[currentStep!.id],
                              editorMultiZooms: prev[currentStep!.id]?.editorMultiZooms?.map((z) => z.id === mz.id ? { ...z, targetX: v } : z) || [],
                            },
                          }));
                        }} onBlur={() => pushHistory(annotations)} className="text-[10px] h-6" /></div>
                        <div><Label className="text-[10px] font-mono">Y</Label><Input type="number" min={0} max={100} value={mz.targetY} onChange={(e) => {
                          const v = Number(e.target.value);
                          setAnnotations((prev) => ({
                            ...prev,
                            [currentStep!.id]: {
                              ...prev[currentStep!.id],
                              editorMultiZooms: prev[currentStep!.id]?.editorMultiZooms?.map((z) => z.id === mz.id ? { ...z, targetY: v } : z) || [],
                            },
                          }));
                        }} onBlur={() => pushHistory(annotations)} className="text-[10px] h-6" /></div>
                      </div>
                      <div className="mt-1">
                        <Label className="text-[10px] font-mono">Zoom Scale</Label>
                        <div className="flex items-center gap-2">
                          <Slider
                            value={[mz.zoomScale || 2]}
                            min={1}
                            max={4}
                            step={0.1}
                            onValueChange={([v]) => {
                              setAnnotations((prev) => ({
                                ...prev,
                                [currentStep!.id]: {
                                  ...prev[currentStep!.id],
                                  editorMultiZooms: prev[currentStep!.id]?.editorMultiZooms?.map((z) => z.id === mz.id ? { ...z, zoomScale: v } : z) || [],
                                },
                              }));
                            }}
                            onValueCommit={([v]) => {
                              pushHistory({
                                ...annotations,
                                [currentStep!.id]: {
                                  ...(annotations[currentStep!.id] || {}),
                                  editorMultiZooms: annotations[currentStep!.id]?.editorMultiZooms?.map((z) => z.id === mz.id ? { ...z, zoomScale: v } : z) || [],
                                },
                              });
                            }}
                            className="flex-1"
                          />
                          <span className="text-[10px] font-mono w-8">{(mz.zoomScale || 2).toFixed(1)}x</span>
                        </div>
                      </div>
                      <div className="mt-1">
                        <Label className="text-[10px] font-mono">Duration (sec)</Label>
                        <Input type="number" min={1} max={20} step={0.5} value={mz.duration || 3} onChange={(e) => {
                          const v = Number(e.target.value);
                          setAnnotations((prev) => ({
                            ...prev,
                            [currentStep!.id]: {
                              ...prev[currentStep!.id],
                              editorMultiZooms: prev[currentStep!.id]?.editorMultiZooms?.map((z) => z.id === mz.id ? { ...z, duration: v } : z) || [],
                            },
                          }));
                        }} onBlur={() => pushHistory(annotations)} className="text-[10px] h-6" />
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-[10px] text-[var(--sketch-fg-muted)]">≡ Select "Multi-Zoom" tool and click on canvas to add points. Each point becomes a separate zoom segment.</p>
              </div>
            )}

            {/* Zoom Properties */}
            {activeTab === "zoom" && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-mono">Zoom Scale</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <Slider
                      value={[currentAnn?.editorZoomScale ?? 1.6]}
                      min={1}
                      max={3}
                      step={0.1}
                      onValueChange={([v]) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorZoomScale: v,
                          },
                        }))
                      }
                      onValueCommit={([v]) => {
                        pushHistory({
                          ...annotations,
                          [currentStep!.id]: {
                            ...(annotations[currentStep!.id] || {}),
                            editorZoomScale: v,
                          },
                        });
                      }}
                      className="flex-1"
                    />
                    <span className="text-xs font-mono w-10 text-right">
                      {currentAnn?.editorZoomScale?.toFixed(1) || "1.6"}x
                    </span>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-mono">Duration Override (sec)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    step={0.5}
                    value={currentAnn?.editorDuration ?? ""}
                    onChange={(e) =>
                      setAnnotations((prev) => ({
                        ...prev,
                        [currentStep!.id]: {
                          ...prev[currentStep!.id],
                          editorDuration: Number(e.target.value),
                        },
                      }))
                    }
                    onBlur={() => pushHistory(annotations)}
                    placeholder="Auto"
                    className="mt-1 text-xs"
                  />
                  <p className="text-[10px] text-[var(--sketch-fg-muted)] mt-1">
                    Leave empty to use audio duration
                  </p>
                </div>

                <div className="pt-2 border-t border-[var(--sketch-fg-subtle)]/20">
                  <p className="text-[10px] text-[var(--sketch-fg-muted)] mb-2">
                    Current zoom target:
                  </p>
                  {currentAnn?.zoomTargetX != null ? (
                    <div className="text-xs font-mono text-[var(--sketch-fg-muted)] space-y-1">
                      <div>X: {currentAnn.zoomTargetX?.toFixed(1)}%</div>
                      <div>Y: {currentAnn.zoomTargetY?.toFixed(1)}%</div>
                      {currentAnn.zoomRectWidth != null && (
                        <>
                          <div>Rect: {currentAnn.zoomRectWidth?.toFixed(1)}% × {currentAnn.zoomRectHeight?.toFixed(1)}%</div>
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--sketch-fg-subtle)]">No zoom set</p>
                  )}
                </div>

                <button
                  onClick={() => {
                    handleClear("zoomTargetX");
                    handleClear("zoomTargetY");
                    handleClear("zoomRectX");
                    handleClear("zoomRectY");
                    handleClear("zoomRectWidth");
                    handleClear("zoomRectHeight");
                  }}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear zoom
                </button>
              </div>
            )}

            {/* No Tool Selected / select / pan placeholder */}
            {(activeTab === "select" || activeTab === "pan") && (
              <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-[var(--sketch-fg-subtle)]/20 rounded-lg">
                <MousePointer className="w-8 h-8 text-[var(--sketch-fg-subtle)]/40 mb-2" />
                <p className="text-sm font-medium text-[var(--sketch-fg)]">No tool selected</p>
                <p className="text-xs text-[var(--sketch-fg-muted)] mt-1 max-w-[280px]">
                  Click a tool in the toolbar or click/drag an annotation on the canvas to edit its properties.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={handleSaveStep}
            disabled={updateStep.isPending}
            className="flex items-center gap-2 px-4 py-2 border-2 border-[var(--sketch-fg-subtle)] text-sm font-body hover:border-[var(--sketch-border-color)] transition-all disabled:opacity-50"
            style={{ borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px" }}
          >
            <Save className="w-4 h-4" />
            Save Step
          </button>

          <button
            onClick={handleContinue}
            disabled={updateStep.isPending}
            className="flex items-center gap-2 px-6 py-3 border-2 border-[var(--sketch-border-color)] bg-[#FBBF24]/10 text-base font-body font-bold hover:shadow-[4px_4px_0px_0px_#FBBF24] transition-all disabled:opacity-50"
            style={{ borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px" }}
          >
            {updateStep.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Save All Steps
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ToolButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 border-2 text-sm font-body transition-all ${
        active
          ? "border-[var(--sketch-border-color)] bg-[#FBBF24]/10 shadow-[3px_3px_0px_0px_#FBBF24]"
          : "border-[var(--sketch-fg-subtle)] hover:border-[var(--sketch-border-color)]/40"
      }`}
      style={{
        borderRadius: active
          ? "255px 15px 225px 15px/15px 225px 15px 255px"
          : "8px",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

