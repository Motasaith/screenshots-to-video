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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

type ToolMode = "point" | "rect" | "overlay" | "crop" | "blur" | "redact" | "watermark" | "pixelate" | "spotlight" | "badge" | "magnify" | "filter" | "multizoom" | "pan";

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

export default function StepAnnotate() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const projectIdNum = Number(projectId) || 0;

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [annotations, setAnnotations] = useState<Record<number, StepAnnotation>>({});
  const [mode, setMode] = useState<ToolMode>("rect");
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [activeTab, setActiveTab] = useState("caption");
  const [showPreview, setShowPreview] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const { data: project, isLoading } = trpc.project.getById.useQuery(
    { id: projectIdNum },
    { enabled: projectIdNum > 0 }
  );

  const suggestZooms = trpc.ai.suggestZooms.useMutation();
  const updateStep = trpc.step.update.useMutation();
  const utils = trpc.useUtils();

  const steps = project?.steps || [];
  const currentStep = steps[currentStepIndex];

  /* ── Load existing annotations ── */
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
          editorZoomScale: s.editorZoomScale ?? 1,
          editorDuration: s.editorDuration,
          editorMultiZooms: s.editorMultiZooms || [],
        };
      });
      setAnnotations(initial);
    }
  }, [project]);

  /* ── Coordinate mapping ── */
  const getCanvasCoords = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return null;
    const container = canvasRef.current;
    const img = imageRef.current;
    const containerRect = container.getBoundingClientRect();

    if (img && img.naturalWidth && img.naturalHeight) {
      const bounds = getImageBounds(container, img);
      if (bounds) {
        const mouseX = e.clientX - containerRect.left;
        const mouseY = e.clientY - containerRect.top;
        const imgRelX = ((mouseX - bounds.offsetX) / bounds.visibleW) * 100;
        const imgRelY = ((mouseY - bounds.offsetY) / bounds.visibleH) * 100;
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

  /* ── Mouse handlers ── */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!currentStep) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;

    if (mode === "overlay") {
      setAnnotations((prev) => ({
        ...prev,
        [currentStep.id]: {
          ...prev[currentStep.id],
          editorOverlayX: coords.x,
          editorOverlayY: coords.y,
        },
      }));
      setActiveTab("overlay");
      return;
    }

    if (mode === "watermark") {
      setAnnotations((prev) => ({
        ...prev,
        [currentStep.id]: {
          ...prev[currentStep.id],
          editorWatermarkText: prev[currentStep.id]?.editorWatermarkText || "Watermark",
        },
      }));
      setActiveTab("watermark");
      return;
    }

    if (mode === "badge") {
      setAnnotations((prev) => ({
        ...prev,
        [currentStep.id]: {
          ...prev[currentStep.id],
          editorBadgeNumber: prev[currentStep.id]?.editorBadgeNumber || currentStepIndex + 1,
          editorBadgeX: coords.x,
          editorBadgeY: coords.y,
          editorBadgeColor: prev[currentStep.id]?.editorBadgeColor || "#FBBF24",
        },
      }));
      setActiveTab("badge");
      return;
    }

    if (mode === "magnify") {
      setAnnotations((prev) => ({
        ...prev,
        [currentStep.id]: {
          ...prev[currentStep.id],
          editorMagnifyX: coords.x,
          editorMagnifyY: coords.y,
          editorMagnifyW: prev[currentStep.id]?.editorMagnifyW || 15,
          editorMagnifyH: prev[currentStep.id]?.editorMagnifyH || 15,
          editorMagnifyScale: prev[currentStep.id]?.editorMagnifyScale || 2,
          editorMagnifyCorner: prev[currentStep.id]?.editorMagnifyCorner || "bottom-right",
        },
      }));
      setActiveTab("magnify");
      return;
    }

    if (mode === "point") {
      setAnnotations((prev) => ({
        ...prev,
        [currentStep.id]: {
          ...prev[currentStep.id],
          zoomTargetX: coords.x,
          zoomTargetY: coords.y,
        },
      }));
      return;
    }

    if (mode === "multizoom") {
      setAnnotations((prev) => {
        const existing = prev[currentStep.id]?.editorMultiZooms || [];
        const newZoom = {
          id: crypto.randomUUID(),
          targetX: coords.x,
          targetY: coords.y,
          zoomScale: 2,
          duration: 3,
        };
        return {
          ...prev,
          [currentStep.id]: {
            ...prev[currentStep.id],
            editorMultiZooms: [...existing, newZoom],
          },
        };
      });
      setActiveTab("multizoom");
      return;
    }

    setIsDragging(true);
    setDragStart(coords);
    setDragCurrent(coords);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || mode === "point" || mode === "overlay") return;
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
            ...prev[currentStep.id],
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

    if (mode === "crop") {
      const x = Math.min(dragStart.x, dragCurrent.x);
      const y = Math.min(dragStart.y, dragCurrent.y);
      const w = Math.abs(dragCurrent.x - dragStart.x);
      const h = Math.abs(dragCurrent.y - dragStart.y);

      if (w > 2 && h > 2) {
        setAnnotations((prev) => ({
          ...prev,
          [currentStep.id]: {
            ...prev[currentStep.id],
            editorCropX: x,
            editorCropY: y,
            editorCropW: w,
            editorCropH: h,
          },
        }));
        setActiveTab("crop");
      }
    }

    if (mode === "blur") {
      const x = Math.min(dragStart.x, dragCurrent.x);
      const y = Math.min(dragStart.y, dragCurrent.y);
      const w = Math.abs(dragCurrent.x - dragStart.x);
      const h = Math.abs(dragCurrent.y - dragStart.y);

      if (w > 2 && h > 2) {
        setAnnotations((prev) => ({
          ...prev,
          [currentStep.id]: {
            ...prev[currentStep.id],
            editorBlurX: x,
            editorBlurY: y,
            editorBlurW: w,
            editorBlurH: h,
          },
        }));
        setActiveTab("blur");
      }
    }

    if (mode === "redact") {
      const x = Math.min(dragStart.x, dragCurrent.x);
      const y = Math.min(dragStart.y, dragCurrent.y);
      const w = Math.abs(dragCurrent.x - dragStart.x);
      const h = Math.abs(dragCurrent.y - dragStart.y);

      if (w > 2 && h > 2) {
        setAnnotations((prev) => ({
          ...prev,
          [currentStep.id]: {
            ...prev[currentStep.id],
            editorRedactX: x,
            editorRedactY: y,
            editorRedactW: w,
            editorRedactH: h,
          },
        }));
        setActiveTab("redact");
      }
    }

    if (mode === "pixelate") {
      const x = Math.min(dragStart.x, dragCurrent.x);
      const y = Math.min(dragStart.y, dragCurrent.y);
      const w = Math.abs(dragCurrent.x - dragStart.x);
      const h = Math.abs(dragCurrent.y - dragStart.y);

      if (w > 2 && h > 2) {
        setAnnotations((prev) => ({
          ...prev,
          [currentStep.id]: {
            ...prev[currentStep.id],
            editorPixelateX: x,
            editorPixelateY: y,
            editorPixelateW: w,
            editorPixelateH: h,
          },
        }));
        setActiveTab("pixelate");
      }
    }

    if (mode === "spotlight") {
      const x = Math.min(dragStart.x, dragCurrent.x);
      const y = Math.min(dragStart.y, dragCurrent.y);
      const w = Math.abs(dragCurrent.x - dragStart.x);
      const h = Math.abs(dragCurrent.y - dragStart.y);

      if (w > 2 && h > 2) {
        setAnnotations((prev) => ({
          ...prev,
          [currentStep.id]: {
            ...prev[currentStep.id],
            editorSpotlightX: x,
            editorSpotlightY: y,
            editorSpotlightW: w,
            editorSpotlightH: h,
          },
        }));
        setActiveTab("spotlight");
      }
    }

    setIsDragging(false);
    setDragStart(null);
    setDragCurrent(null);
  };

  /* ── Actions ── */
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
      if (v !== undefined && v !== null) payload[f] = v;
    });

    await updateStep.mutateAsync({ id: currentStep.id, ...payload });
    utils.project.getById.invalidate({ id: projectIdNum });
  };

  const handleContinue = async () => {
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
        "editorZoomScale", "editorDuration", "editorMultiZooms", "editorMultiZooms",
      ];
      fields.forEach((f) => {
        const v = (ann as any)[f];
        if (v !== undefined && v !== null) payload[f] = v;
      });

      if (Object.keys(payload).length > 0) {
        await updateStep.mutateAsync({ id: Number(stepId), ...payload });
      }
    }
    navigate(`/create/${projectIdNum}/preview`);
  };

  const handleClear = (field: keyof StepAnnotation) => {
    if (!currentStep) return;
    setAnnotations((prev) => ({
      ...prev,
      [currentStep.id]: { ...prev[currentStep.id], [field]: null },
    }));
  };

  /* ── Derived state ── */
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

  /* ── Render helpers ── */
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
        {/* Header */}
        <div className="relative mb-4">
          <span className="font-mono text-xs text-[var(--sketch-fg-muted)] uppercase tracking-widest bg-[#FBBF24]/20 px-2 py-1 sketch-border-sm inline-block">
            Step 3 of 7
          </span>
          <span className="font-hand text-lg text-[var(--sketch-fg-muted)] absolute -top-6 left-32 rotate-[-3deg] animate-float hidden sm:block">
            Full canvas editor! 🎨
          </span>
        </div>
        <h2 className="font-body font-bold text-3xl tracking-tight text-[var(--sketch-fg)]">
          Edit Your Screenshots
        </h2>
        <p className="font-body text-[var(--sketch-fg-muted)] mt-2 max-w-2xl">
          Add captions, text overlays, crop, zoom, and highlight boxes. Click a tool then interact with the canvas.
        </p>

        {/* Toolbar */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <ToolButton
            active={mode === "rect"}
            onClick={() => setMode("rect")}
            icon={<Square className="w-4 h-4" />}
            label="Highlight"
          />
          <ToolButton
            active={mode === "point"}
            onClick={() => setMode("point")}
            icon={<MousePointer className="w-4 h-4" />}
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

          <div className="w-px h-6 bg-[var(--sketch-border-color)]/30 mx-1" />

          <button
            onClick={handleSuggestAll}
            disabled={suggestZooms.isPending}
            className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-[var(--sketch-fg-subtle)] text-sm font-body hover:border-[var(--sketch-border-color)] hover:bg-[#FBBF24]/5 transition-all"
            style={{ borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px" }}
          >
            <Sparkles className="w-4 h-4" />
            Auto-suggest
          </button>

          <div className="flex-1" />

          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 px-3 py-2 border-2 border-[var(--sketch-fg-subtle)] text-sm font-body hover:border-[var(--sketch-border-color)] transition-all"
            style={{ borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px" }}
          >
            <Play className="w-4 h-4" />
            {showPreview ? "Hide Preview" : "Preview"}
          </button>

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
          {/* ── Left: Step thumbnails ── */}
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

          {/* ── Center: Canvas ── */}
          <div className="sketch-card p-4 bg-[var(--sketch-card-bg)]">
            {currentStep && (
              <>
                <div className="flex items-center justify-between mb-3">
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
                  ref={canvasRef}
                  className={`relative w-full aspect-video bg-[var(--sketch-card-bg)] border-2 border-[var(--sketch-border-color)] overflow-hidden sketch-border-sm ${
                    mode === "pan" ? "cursor-grab" : "cursor-crosshair"
                  }`}
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

                  {/* Highlight box */}
                  {rect && rect.x != null && rect.y != null && rect.w != null && rect.h != null && (
                    <div
                      className="absolute border-2 border-[#FBBF24] bg-[#FBBF24]/10 pointer-events-none"
                      style={{
                        left: `${rect.x}%`,
                        top: `${rect.y}%`,
                        width: `${rect.w}%`,
                        height: `${rect.h}%`,
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
                      className="absolute border-2 border-dashed border-[var(--sketch-fg)]/50 pointer-events-none"
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
                      className="absolute border-2 border-dashed border-emerald-400 bg-emerald-400/10 pointer-events-none"
                      style={{
                        left: `${cropRect.x}%`,
                        top: `${cropRect.y}%`,
                        width: `${cropRect.w}%`,
                        height: `${cropRect.h}%`,
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
                      className="absolute pointer-events-none overflow-hidden"
                      style={{
                        left: `${blurRect.x}%`,
                        top: `${blurRect.y}%`,
                        width: `${blurRect.w}%`,
                        height: `${blurRect.h}%`,
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
                      className="absolute pointer-events-none"
                      style={{
                        left: `${redactRect.x}%`,
                        top: `${redactRect.y}%`,
                        width: `${redactRect.w}%`,
                        height: `${redactRect.h}%`,
                        backgroundColor: currentAnn?.editorRedactColor || "#000000",
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
                      className="absolute pointer-events-none"
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
                      className="absolute pointer-events-none overflow-hidden"
                      style={{
                        left: `${pixelateRect.x}%`,
                        top: `${pixelateRect.y}%`,
                        width: `${pixelateRect.w}%`,
                        height: `${pixelateRect.h}%`,
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
                        className="absolute pointer-events-none"
                        style={{
                          left: `${spotlightRect.x}%`,
                          top: `${spotlightRect.y}%`,
                          width: `${spotlightRect.w}%`,
                          height: `${spotlightRect.h}%`,
                          boxShadow: `0 0 0 9999px rgba(0,0,0,${currentAnn?.editorSpotlightIntensity ?? 0.6})`,
                          borderRadius: "4px",
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
                      className="absolute pointer-events-none"
                      style={{
                        left: `${currentAnn.editorBadgeX}%`,
                        top: `${currentAnn.editorBadgeY}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg"
                        style={{ backgroundColor: currentAnn.editorBadgeColor || "#FBBF24", color: "#000" }}
                      >
                        {currentAnn.editorBadgeNumber}
                      </div>
                      <div className="absolute top-1 left-1 bg-yellow-500 text-white text-[10px] font-mono px-1 rounded">
                        Badge
                      </div>
                    </div>
                  )}

                  {/* Magnify overlay */}
                  {currentAnn?.editorMagnifyX != null && currentAnn?.editorMagnifyW != null && (
                    <div
                      className="absolute pointer-events-none border-2 border-white shadow-lg overflow-hidden bg-black"
                      style={{
                        ...(currentAnn.editorMagnifyCorner?.includes("top") ? { top: "10px" } : { bottom: "10px" }),
                        ...(currentAnn.editorMagnifyCorner?.includes("left") ? { left: "10px" } : { right: "10px" }),
                        width: "120px",
                        height: "120px",
                        borderRadius: "8px",
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
                      className="absolute pointer-events-none"
                      style={{
                        left: `${overlayPos.x}%`,
                        top: `${overlayPos.y}%`,
                        transform: "translate(-50%, -50%)",
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
                      className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                      style={{
                        left: `${currentAnn.zoomTargetX}%`,
                        top: `${currentAnn.zoomTargetY}%`,
                      }}
                    >
                      <div className="w-full h-full rounded-full border-2 border-[#FBBF24] bg-[#FBBF24]/30 animate-pulse" />
                    </div>
                  )}

                  {/* Multi-zoom points */}
                  {currentAnn?.editorMultiZooms?.map((mz, idx) => (
                    <div key={mz.id}
                      className="absolute pointer-events-none"
                      style={{
                        left: `${mz.targetX}%`,
                        top: `${mz.targetY}%`,
                        transform: "translate(-50%, -50%)",
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

                  {/* Mode indicator — moved to bottom so it doesn't cover screenshot */}
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
                    {mode === "pan" && "Pan mode"}
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

        {/* ── Bottom: Properties panel ── */}
        <div className="mt-3 sketch-card p-4 bg-[var(--sketch-card-bg)]">
          <h3 className="font-mono text-xs text-[var(--sketch-fg-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Settings2 className="w-3 h-3" />
            Properties
          </h3>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-5 mb-3">
                <TabsTrigger value="caption" className="text-xs">
                  <Type className="w-3 h-3 mr-1" />
                  Cap
                </TabsTrigger>
                <TabsTrigger value="overlay" className="text-xs">
                  <Type className="w-3 h-3 mr-1" />
                  Text
                </TabsTrigger>
                <TabsTrigger value="redact" className="text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  Redact
                </TabsTrigger>
                <TabsTrigger value="watermark" className="text-xs">
                  <Stamp className="w-3 h-3 mr-1" />
                  Mark
                </TabsTrigger>
                <TabsTrigger value="zoom" className="text-xs">
                  <ZoomIn className="w-3 h-3 mr-1" />
                  Zoom
                </TabsTrigger>
              </TabsList>

              {/* Tool Guide */}
              <div className="mb-3 p-2.5 bg-[var(--sketch-fg-subtle)]/5 rounded border border-[var(--sketch-fg-subtle)]/20">
                <div className="flex items-start gap-2">
                  <HelpCircle className="w-3.5 h-3.5 text-[var(--sketch-fg-muted)] mt-0.5 shrink-0" />
                  <div className="text-[11px] text-[var(--sketch-fg-muted)] leading-relaxed">
                    {mode === "rect" && (
                      <><span className="font-semibold text-[var(--sketch-fg)]">Highlight Box:</span> Drag on the canvas to draw an orange highlight rectangle. This marks the area the main zoom will focus on.</>
                    )}
                    {mode === "point" && (
                      <><span className="font-semibold text-[var(--sketch-fg)]">Zoom Point:</span> Click anywhere on the screenshot to set a single zoom target. Use the Zoom tab to adjust scale.</>
                    )}
                    {mode === "overlay" && (
                      <><span className="font-semibold text-[var(--sketch-fg)]">Text Overlay:</span> Click on the canvas to place text. Edit the text, color, and size in the Text tab.</>
                    )}
                    {mode === "crop" && (
                      <><span className="font-semibold text-[var(--sketch-fg)]">Crop:</span> Drag to select the area you want to keep. Everything outside will be removed.</>
                    )}
                    {mode === "blur" && (
                      <><span className="font-semibold text-[var(--sketch-fg)]">Blur:</span> Drag over sensitive information (emails, names, API keys) to blur it. Adjust intensity in the Blur tab.</>
                    )}
                    {mode === "redact" && (
                      <><span className="font-semibold text-[var(--sketch-fg)]">Redact:</span> Drag over areas to cover with a solid color block. Choose color in the Redact tab.</>
                    )}
                    {mode === "watermark" && (
                      <><span className="font-semibold text-[var(--sketch-fg)]">Watermark:</span> Click to set position. Edit text, size, color, and opacity in the Mark tab.</>
                    )}
                    {mode === "pixelate" && (
                      <><span className="font-semibold text-[var(--sketch-fg)]">Pixelate:</span> Drag over faces, license plates, or sensitive UI to pixelate. Adjust block size in the Pixel tab.</>
                    )}
                    {mode === "spotlight" && (
                      <><span className="font-semibold text-[var(--sketch-fg)]">Spotlight:</span> Drag to highlight a region while dimming the rest. Adjust dim intensity in the panel.</>
                    )}
                    {mode === "badge" && (
                      <><span className="font-semibold text-[var(--sketch-fg)]">Badge:</span> Click to place a numbered circle. Edit number and color in the Badge tab.</>
                    )}
                    {mode === "magnify" && (
                      <><span className="font-semibold text-[var(--sketch-fg)]">Magnify:</span> Click to set the target area. A zoomed inset will appear in a corner. Adjust scale and corner in the panel.</>
                    )}
                    {mode === "filter" && (
                      <><span className="font-semibold text-[var(--sketch-fg)]">Filter:</span> Select a color filter from the Filter tab. Applies to the entire screenshot for this step.</>
                    )}
                    {mode === "multizoom" && (
                      <><span className="font-semibold text-[var(--sketch-fg)]">Multi-Zoom:</span> Click multiple times on the canvas to add zoom points. Each point becomes a separate animated zoom segment. Edit scale and duration per point in the panel.</>
                    )}
                    {mode === "pan" && (
                      <><span className="font-semibold text-[var(--sketch-fg)]">Pan:</span> Drag to pan around the canvas when zoomed in. No edits are made in this mode.</>
                    )}
                  </div>
                </div>
              </div>

              {/* Caption Tab */}
              <TabsContent value="caption" className="space-y-3">
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
                    placeholder="Enter caption for this step..."
                    className="mt-1 text-sm min-h-[80px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-mono">Position</Label>
                    <Select
                      value={currentAnn?.editorCaptionPosition || "bottom"}
                      onValueChange={(v) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorCaptionPosition: v,
                          },
                        }))
                      }
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
                      onValueChange={(v) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorCaptionStyle: v,
                          },
                        }))
                      }
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
                      onValueChange={(v) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorCaptionSize: v,
                          },
                        }))
                      }
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
              </TabsContent>

              {/* Overlay Tab */}
              <TabsContent value="overlay" className="space-y-3">
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
                        className="w-8 h-8 rounded border border-[var(--sketch-fg-subtle)]/30"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-mono">Size</Label>
                    <Select
                      value={currentAnn?.editorOverlaySize || "medium"}
                      onValueChange={(v) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorOverlaySize: v,
                          },
                        }))
                      }
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
                  💡 Select "Text Overlay" tool and click on canvas to set position
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
              </TabsContent>

              {/* Crop Tab */}
              <TabsContent value="crop" className="space-y-3">
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
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-[var(--sketch-fg-muted)]">
                  💡 Select "Crop" tool and drag on canvas to define crop area
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
              </TabsContent>

              {/* Blur Tab */}
              <TabsContent value="blur" className="space-y-3">
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
                      className="flex-1"
                    />
                    <span className="text-xs font-mono w-10 text-right">
                      {currentAnn?.editorBlurIntensity || 20}px
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-[var(--sketch-fg-muted)]">
                  💡 Select "Blur" tool and drag on canvas to define blur area
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
              </TabsContent>

              {/* Redact Tab */}
              <TabsContent value="redact" className="space-y-3">
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
                      className="w-8 h-8 rounded border border-[var(--sketch-fg-subtle)]/30"
                    />
                    <span className="text-xs font-mono text-[var(--sketch-fg-muted)]">
                      {currentAnn?.editorRedactColor || "#000000"}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-[var(--sketch-fg-muted)]">
                  💡 Select "Redact" tool and drag on canvas to cover sensitive info completely
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
              </TabsContent>

              {/* Watermark Tab */}
              <TabsContent value="watermark" className="space-y-3">
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
                    placeholder="@username or brand name"
                    className="mt-1 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-mono">Position</Label>
                    <Select
                      value={currentAnn?.editorWatermarkPosition || "bottom-right"}
                      onValueChange={(v) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorWatermarkPosition: v,
                          },
                        }))
                      }
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
                      onValueChange={(v) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorWatermarkSize: v,
                          },
                        }))
                      }
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
              </TabsContent>

              {/* Pixelate Tab */}
              <TabsContent value="pixelate" className="space-y-3">
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
                      className="flex-1"
                    />
                    <span className="text-xs font-mono w-10 text-right">
                      {currentAnn?.editorPixelateBlockSize || 20}px
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-[var(--sketch-fg-muted)]">
                  💡 Select "Pixelate" tool and drag on canvas to mosaic faces, QR codes, license plates
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
              </TabsContent>

              {/* Spotlight Tab */}
              <TabsContent value="spotlight" className="space-y-3">
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
                      className="flex-1"
                    />
                    <span className="text-xs font-mono w-10 text-right">
                      {Math.round((currentAnn?.editorSpotlightIntensity ?? 0.6) * 100)}%
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-[var(--sketch-fg-muted)]">
                  💡 Select "Spotlight" tool and drag to highlight a region while dimming everything else
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
              </TabsContent>

              {/* Badge Tab */}
              <TabsContent value="badge" className="space-y-3">
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
                    className="mt-1 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-mono">X (%)</Label>
                    <Input type="number" min={0} max={100} value={currentAnn?.editorBadgeX ?? ""} onChange={(e) => setAnnotations((prev) => ({...prev, [currentStep!.id]: {...prev[currentStep!.id], editorBadgeX: Number(e.target.value)}}))} className="mt-1 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs font-mono">Y (%)</Label>
                    <Input type="number" min={0} max={100} value={currentAnn?.editorBadgeY ?? ""} onChange={(e) => setAnnotations((prev) => ({...prev, [currentStep!.id]: {...prev[currentStep!.id], editorBadgeY: Number(e.target.value)}}))} className="mt-1 text-xs" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-mono">Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={currentAnn?.editorBadgeColor || "#FBBF24"} onChange={(e) => setAnnotations((prev) => ({...prev, [currentStep!.id]: {...prev[currentStep!.id], editorBadgeColor: e.target.value}}))} className="w-8 h-8 rounded border border-[var(--sketch-fg-subtle)]/30" />
                    <span className="text-xs font-mono text-[var(--sketch-fg-muted)]">{currentAnn?.editorBadgeColor || "#FBBF24"}</span>
                  </div>
                </div>
                <p className="text-[10px] text-[var(--sketch-fg-muted)]">💡 Select "Badge" tool and click on canvas to place</p>
                {currentAnn?.editorBadgeNumber != null && (
                  <button onClick={() => { handleClear("editorBadgeNumber"); handleClear("editorBadgeX"); handleClear("editorBadgeY"); handleClear("editorBadgeColor"); }} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"><Trash2 className="w-3 h-3" /> Clear badge</button>
                )}
              </TabsContent>

              {/* Magnify Tab */}
              <TabsContent value="magnify" className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs font-mono">X (%)</Label><Input type="number" min={0} max={100} value={currentAnn?.editorMagnifyX ?? ""} onChange={(e) => setAnnotations((prev) => ({...prev, [currentStep!.id]: {...prev[currentStep!.id], editorMagnifyX: Number(e.target.value)}}))} className="mt-1 text-xs" /></div>
                  <div><Label className="text-xs font-mono">Y (%)</Label><Input type="number" min={0} max={100} value={currentAnn?.editorMagnifyY ?? ""} onChange={(e) => setAnnotations((prev) => ({...prev, [currentStep!.id]: {...prev[currentStep!.id], editorMagnifyY: Number(e.target.value)}}))} className="mt-1 text-xs" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs font-mono">Width (%)</Label><Input type="number" min={0} max={100} value={currentAnn?.editorMagnifyW ?? ""} onChange={(e) => setAnnotations((prev) => ({...prev, [currentStep!.id]: {...prev[currentStep!.id], editorMagnifyW: Number(e.target.value)}}))} className="mt-1 text-xs" /></div>
                  <div><Label className="text-xs font-mono">Height (%)</Label><Input type="number" min={0} max={100} value={currentAnn?.editorMagnifyH ?? ""} onChange={(e) => setAnnotations((prev) => ({...prev, [currentStep!.id]: {...prev[currentStep!.id], editorMagnifyH: Number(e.target.value)}}))} className="mt-1 text-xs" /></div>
                </div>
                <div>
                  <Label className="text-xs font-mono">Zoom Scale</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <Slider value={[currentAnn?.editorMagnifyScale ?? 2]} min={1.5} max={5} step={0.5} onValueChange={([v]) => setAnnotations((prev) => ({...prev, [currentStep!.id]: {...prev[currentStep!.id], editorMagnifyScale: v}}))} className="flex-1" />
                    <span className="text-xs font-mono w-10 text-right">{currentAnn?.editorMagnifyScale?.toFixed(1) || "2.0"}x</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-mono">Corner Position</Label>
                  <Select value={currentAnn?.editorMagnifyCorner || "bottom-right"} onValueChange={(v) => setAnnotations((prev) => ({...prev, [currentStep!.id]: {...prev[currentStep!.id], editorMagnifyCorner: v}}))}>
                    <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top-left">Top Left</SelectItem>
                      <SelectItem value="top-right">Top Right</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[10px] text-[var(--sketch-fg-muted)]">💡 Select "Magnify" tool and click on canvas to set target</p>
                {currentAnn?.editorMagnifyX != null && (
                  <button onClick={() => { handleClear("editorMagnifyX"); handleClear("editorMagnifyY"); handleClear("editorMagnifyW"); handleClear("editorMagnifyH"); handleClear("editorMagnifyScale"); handleClear("editorMagnifyCorner"); }} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"><Trash2 className="w-3 h-3" /> Clear magnify</button>
                )}
              </TabsContent>

              {/* Filter Tab */}
              <TabsContent value="filter" className="space-y-3">
                <div>
                  <Label className="text-xs font-mono">Color Filter</Label>
                  <Select value={currentAnn?.editorColorFilter || "none"} onValueChange={(v) => setAnnotations((prev) => ({...prev, [currentStep!.id]: {...prev[currentStep!.id], editorColorFilter: v}}))}>
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
                <p className="text-[10px] text-[var(--sketch-fg-muted)]">💡 Applies to the entire screenshot for this step</p>
                {currentAnn?.editorColorFilter && currentAnn.editorColorFilter !== "none" && (
                  <button onClick={() => handleClear("editorColorFilter")} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"><Trash2 className="w-3 h-3" /> Clear filter</button>
                )}
              </TabsContent>

              {/* Multi-Zoom Tab */}
              <TabsContent value="multizoom" className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-mono">Zoom Points ({currentAnn?.editorMultiZooms?.length || 0})</Label>
                  <button
                    onClick={() => {
                      setAnnotations((prev) => ({
                        ...prev,
                        [currentStep!.id]: {
                          ...prev[currentStep!.id],
                          editorMultiZooms: [],
                        },
                      }));
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
                            setAnnotations((prev) => ({
                              ...prev,
                              [currentStep!.id]: {
                                ...prev[currentStep!.id],
                                editorMultiZooms: prev[currentStep!.id]?.editorMultiZooms?.filter((z) => z.id !== mz.id) || [],
                              },
                            }));
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
                        }} className="text-[10px] h-6" /></div>
                        <div><Label className="text-[10px] font-mono">Y</Label><Input type="number" min={0} max={100} value={mz.targetY} onChange={(e) => {
                          const v = Number(e.target.value);
                          setAnnotations((prev) => ({
                            ...prev,
                            [currentStep!.id]: {
                              ...prev[currentStep!.id],
                              editorMultiZooms: prev[currentStep!.id]?.editorMultiZooms?.map((z) => z.id === mz.id ? { ...z, targetY: v } : z) || [],
                            },
                          }));
                        }} className="text-[10px] h-6" /></div>
                      </div>
                      <div className="mt-1">
                        <Label className="text-[10px] font-mono">Zoom Scale</Label>
                        <div className="flex items-center gap-2">
                          <Slider value={[mz.zoomScale || 2]} min={1} max={4} step={0.1} onValueChange={([v]) => {
                            setAnnotations((prev) => ({
                              ...prev,
                              [currentStep!.id]: {
                                ...prev[currentStep!.id],
                                editorMultiZooms: prev[currentStep!.id]?.editorMultiZooms?.map((z) => z.id === mz.id ? { ...z, zoomScale: v } : z) || [],
                              },
                            }));
                          }} className="flex-1" />
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
                        }} className="text-[10px] h-6" />
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-[10px] text-[var(--sketch-fg-muted)]">💡 Select "Multi-Zoom" tool and click on canvas to add points. Each point becomes a separate zoom segment.</p>
              </TabsContent>

              {/* Zoom Tab */}
              <TabsContent value="zoom" className="space-y-3">
                <div>
                  <Label className="text-xs font-mono">Zoom Scale</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <Slider
                      value={[currentAnn?.editorZoomScale ?? 1]}
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
                      className="flex-1"
                    />
                    <span className="text-xs font-mono w-10 text-right">
                      {currentAnn?.editorZoomScale?.toFixed(1) || "1.0"}x
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
              </TabsContent>
            </Tabs>
          </div>

        {/* Footer actions */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => navigate(`/create/${projectIdNum}/upload`)}
            className="flex items-center gap-2 px-4 py-2 border-2 border-[var(--sketch-fg-subtle)] text-sm font-body hover:border-[var(--sketch-border-color)] transition-all"
            style={{ borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px" }}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
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
                Continue
                <ChevronRightIcon className="w-5 h-5" />
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

