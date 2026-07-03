import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import {
  ChevronRight as ChevronRightIcon,
  Target,
  MousePointer,
  Square,
  Loader2,
  Type,
  Crop,
  Palette,
  Trash2,
  Settings2,
  Move,
  Aperture,
  Shield,
  Stamp,
  Grid3x3,
  Sun,
  Moon,
  BadgeCheck,
  Search,
  Scan,
  HelpCircle,
  Undo2,
  Redo2,
  Film,
  ChevronDown,
  Upload,
  ArrowLeft,
  Volume2,
  Play,
  Crown,
  AlertTriangle,
  Mic,
  Merge,
  CheckCircle,
  Sparkles,
  Bot,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { TransitionType } from "@/hooks/useWizardStore";
import AIGuide from "@/components/wizard/AIGuide";

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
  editorBlurs?: Array<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    intensity?: number;
  }> | null;
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
  editorPixelates?: Array<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    blockSize?: number;
  }> | null;
  editorSpotlightX?: number | null;
  editorSpotlightY?: number | null;
  editorSpotlightW?: number | null;
  editorSpotlightH?: number | null;
  editorSpotlightIntensity?: number | null;
  editorSpotlights?: Array<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    intensity?: number;
  }> | null;
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

export interface StepEditorPanelProps {
  /** Per-step transition state (stepId -> transition type) */
  stepTransitions?: Record<number, TransitionType>;
  onStepTransitionChange?: (stepId: number, transition: TransitionType) => void;
  /** Global transition (used as default for steps without an explicit one) */
  globalTransition?: TransitionType;
  onGlobalTransitionChange?: (transition: TransitionType) => void;
  transitionDuration?: number;
  onTransitionDurationChange?: (duration: number) => void;
  captionsEnabled?: boolean;
  onCaptionsEnabledChange?: (enabled: boolean) => void;
  captionStyle?: string;
  onCaptionStyleChange?: (style: string) => void;
  captionSize?: string;
  onCaptionSizeChange?: (size: string) => void;
  captionPosition?: string;
  onCaptionPositionChange?: (position: string) => void;
  captionColor?: string;
  onCaptionColorChange?: (color: string) => void;
  /** Steps data from parent (StepPreview) so the timeline can show screenshots */
  parentSteps?: Array<{ id: number; screenshotPath?: string | null; description?: string | null; transition?: string | null }>;
  /** Navigation handlers and states */
  onBack?: () => void;
  onContinue?: () => void;
  isSaving?: boolean;
}

const transitionTypes: { value: TransitionType; label: string }[] = [
  { value: "fade", label: "Fade" },
  { value: "slide-left", label: "Slide Left" },
  { value: "slide-right", label: "Slide Right" },
  { value: "slide-up", label: "Slide Up" },
  { value: "flip", label: "Flip" },
  { value: "dissolve", label: "Dissolve" },
];

const voices = [
  { id: "en-US-AndrewMultilingualNeural", name: "Andrew", accent: "US", gender: "Male", tag: "Natural" },
  { id: "en-US-AvaMultilingualNeural", name: "Ava", accent: "US", gender: "Female", tag: "Natural" },
  { id: "en-US-BrianMultilingualNeural", name: "Brian", accent: "US", gender: "Male", tag: "Natural" },
  { id: "en-US-EmmaMultilingualNeural", name: "Emma", accent: "US", gender: "Female", tag: "Natural" },
  { id: "en-GB-SoniaNeural", name: "Sonia", accent: "UK", gender: "Female" },
  { id: "en-GB-RyanNeural", name: "Ryan", accent: "UK", gender: "Male" },
  { id: "en-AU-NatashaNeural", name: "Natasha", accent: "AU", gender: "Female" },
  { id: "en-US-GuyNeural", name: "Guy", accent: "US", gender: "Male" },
  { id: "kokoro:af_heart", name: "Heart", accent: "US", gender: "Female", tag: "Ultra-real" },
  { id: "kokoro:am_michael", name: "Michael", accent: "US", gender: "Male", tag: "Ultra-real" },
  { id: "kokoro:bf_emma", name: "Emma B.", accent: "UK", gender: "Female", tag: "Ultra-real" },
  { id: "kokoro:af_bella", name: "Bella", accent: "US", gender: "Female", tag: "Ultra-real" },
] as Array<{ id: string; name: string; accent: string; gender: string; tag?: string }>;

const elevenLabsVoices = [
  { id: "elevenlabs:pNInz6obpgDQGcFmaJgB", name: "Adam", accent: "US", gender: "Male", desc: "Dominant, Firm" },
  { id: "elevenlabs:EXAVITQu4vr4xnSDxMaL", name: "Sarah", accent: "US", gender: "Female", desc: "Mature, Confident" },
  { id: "elevenlabs:TX3LPaxmHKxFdv7VOQHJ", name: "Liam", accent: "US", gender: "Male", desc: "Energetic Creator" },
  { id: "elevenlabs:cgSgspJ2msm6clMCkdW9", name: "Jessica", accent: "US", gender: "Female", desc: "Playful, Warm" },
  { id: "elevenlabs:cjVigY5qzO86Huf0OWal", name: "Eric", accent: "US", gender: "Male", desc: "Smooth, Trustworthy" },
  { id: "elevenlabs:hpp4J3VqNfWAUOO0d1Us", name: "Bella", accent: "US", gender: "Female", desc: "Professional, Bright" },
  { id: "elevenlabs:iP95p4xoKVk53GoZ742B", name: "Chris", accent: "US", gender: "Male", desc: "Charming, Down-to-Earth" },
  { id: "elevenlabs:nPczCjzI2devNBz1zQrb", name: "Brian", accent: "US", gender: "Male", desc: "Deep, Resonant" },
  { id: "elevenlabs:onwK4e9ZLuTAKqWW03F9", name: "Daniel", accent: "US", gender: "Male", desc: "Steady Broadcaster" },
  { id: "elevenlabs:pFZP5JQG7iQjIQuC4Bku", name: "Lily", accent: "US", gender: "Female", desc: "Velvety Actress" },
  { id: "elevenlabs:pqHfZKP75CvOlQylNhV4", name: "Bill", accent: "US", gender: "Male", desc: "Wise, Mature" },
  { id: "elevenlabs:Xb7hH8MSUJpSbSDYk0k2", name: "Alice", accent: "US", gender: "Female", desc: "Clear Educator" },
  { id: "elevenlabs:JBFqnCBsd6RMkjVDRZzb", name: "George", accent: "US", gender: "Male", desc: "Warm Storyteller" },
  { id: "elevenlabs:XrExE9yKIg1WjnnlVkGX", name: "Matilda", accent: "US", gender: "Female", desc: "Professional" },
  { id: "elevenlabs:bIHbv24MWmeRgasZH58o", name: "Will", accent: "US", gender: "Male", desc: "Relaxed Optimist" },
  { id: "elevenlabs:FGY2WhTYpPnrIDTdsKH5", name: "Laura", accent: "US", gender: "Female", desc: "Quirky Attitude" },
  { id: "elevenlabs:CwhRBWXzGAHq8TQ4Fs17", name: "Roger", accent: "US", gender: "Male", desc: "Laid-Back, Casual" },
  { id: "elevenlabs:SOYHLrjzK2X1ezoPC6cr", name: "Harry", accent: "US", gender: "Male", desc: "Fierce Warrior" },
  { id: "elevenlabs:IKne3meq5aSn9XLyUdCD", name: "Charlie", accent: "US", gender: "Male", desc: "Deep, Energetic" },
  { id: "elevenlabs:N2lVS1w4EtoT3dr4eOWO", name: "Callum", accent: "US", gender: "Male", desc: "Husky Trickster" },
  { id: "elevenlabs:SAz9YHcvj6GT2YYXdXww", name: "River", accent: "US", gender: "Neutral", desc: "Relaxed, Neutral" },
  { id: "elevenlabs:bvB801cu7ca8Klk5nO4O", name: "Haseeb", accent: "UK", gender: "Male", desc: "British Documentary" },
] as Array<{ id: string; name: string; accent: string; gender: string; desc: string }>;

const renderStages = [
  { key: "queued", label: "Queued", icon: Loader2 },
  { key: "generating_audio", label: "Audio", icon: Mic },
  { key: "rendering_segments", label: "Segments", icon: Film },
  { key: "concatenating", label: "Merge", icon: Merge },
  { key: "finalizing", label: "Finalize", icon: CheckCircle },
];

export function StepEditorPanel(props: StepEditorPanelProps = {}) {
  const { projectId } = useParams<{ projectId: string }>();
  const projectIdNum = Number(projectId) || 0;
  const { setTheme, resolvedTheme } = useTheme();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [annotations, setAnnotations] = useState<Record<number, StepAnnotation>>({});
  const [mode, setMode] = useState<ToolMode>("pan");
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [activeTab, setActiveTab] = useState("select");

  const [canvasScale, setCanvasScale] = useState(1.0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panScrollRef = useRef<{ left: number; top: number }>({ left: 0, top: 0 });

  const [openTransitionDropdown, setOpenTransitionDropdown] = useState<number | null>(null);

  // Google Vids replica states
  const [activeRightTab, setActiveRightTab] = useState<"properties" | "script" | "voiceover" | "elevenlabs" | "captions" | "transitions" | "aiguide" | "help" | null>("properties");
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
  const [projectTitle, setProjectTitle] = useState("Untitled video");



  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isTimelineDragOver, setIsTimelineDragOver] = useState(false);
  const [uploadingFilesCount, setUploadingFilesCount] = useState(0);
  const [draggedSceneIndex, setDraggedSceneIndex] = useState<number | null>(null);

  const [history, setHistory] = useState<Record<number, StepAnnotation>[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [dragItem, setDragItem] = useState<{
    type: "overlay" | "badge" | "magnify" | "zoomTarget" | "zoomRect" | "blur" | "redact" | "pixelate" | "spotlight" | "multizoom" | "crop" | "blurArr" | "pixelateArr" | "spotlightArr";
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
  const handleResizeRef = useRef<string | null>(null);

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

  const updateProject = trpc.project.update.useMutation();
  const updateStep = trpc.step.update.useMutation();
  const createStep = trpc.step.create.useMutation();
  const deleteStep = trpc.step.delete.useMutation();
  const generateScript = trpc.ai.generateScript.useMutation();
  const utils = trpc.useUtils();

  // Voice selection states
  const [selectedVoice, setSelectedVoice] = useState("en-US-AndrewMultilingualNeural");
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useState(() => new Audio())[0];

  const previewVoice = trpc.ai.previewVoice.useMutation();
  const credits = trpc.ai.elevenLabsCredits.useQuery(undefined, {
    enabled: activeRightTab === "elevenlabs",
    refetchInterval: 30_000,
  });

  const handlePlayPreview = async (e: React.MouseEvent, voiceId: string) => {
    e.stopPropagation();
    
    if (playingId === voiceId) {
      audioRef.pause();
      setPlayingId(null);
      return;
    }

    if (previewLoadingId) return;

    audioRef.pause();
    setPreviewLoadingId(voiceId);

    try {
      const res = await previewVoice.mutateAsync({ voice: voiceId, speed: voiceSpeed });
      audioRef.src = res.audioData;
      audioRef.onended = () => setPlayingId(null);
      await audioRef.play();
      setPlayingId(voiceId);
    } catch (err) {
      console.error("Preview failed:", err);
    } finally {
      setPreviewLoadingId(null);
    }
  };

  useEffect(() => {
    if (project?.voice) {
      setSelectedVoice(project.voice);
    }
    if (project?.speed) {
      setVoiceSpeed(project.speed);
    }
  }, [project?.id, project?.voice, project?.speed]);

  // Render Popup Modal states
  const [showRenderModal, setShowRenderModal] = useState(false);
  const [renderStarted, setRenderStarted] = useState(false);
  const [startRenderError, setStartRenderError] = useState<string | null>(null);

  const startRender = trpc.render.start.useMutation();

  const { data: renderStatus } = trpc.render.status.useQuery(
    { projectId: projectIdNum },
    {
      enabled: projectIdNum > 0 && renderStarted && showRenderModal,
      refetchInterval: 3000,
    }
  );

  // Trigger render on dialog open
  useEffect(() => {
    if (showRenderModal && renderStarted && projectIdNum > 0) {
      setStartRenderError(null);
      startRender
        .mutateAsync({ projectId: projectIdNum })
        .catch((err) => {
          setStartRenderError(err.message || "Failed to start render");
        });
    }
  }, [showRenderModal, renderStarted, projectIdNum]);

  // Navigate to export when complete
  useEffect(() => {
    if (
      showRenderModal &&
      (renderStatus?.projectStatus === "complete" ||
        renderStatus?.job?.status === "complete")
    ) {
      const timer = setTimeout(() => {
        setShowRenderModal(false);
        window.location.href = `/create/${projectIdNum}/export`;
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [showRenderModal, renderStatus?.projectStatus, renderStatus?.job?.status, projectIdNum]);

  useEffect(() => {
    if (project?.title) {
      setProjectTitle(project.title);
    }
  }, [project?.title]);

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

  const handleUploadFiles = async (files: FileList) => {
    if (files.length === 0) return;
    setUploadingFilesCount(prev => prev + files.length);
    
    const sortedFiles = Array.from(files).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    let currentOrder = (props.parentSteps || steps || []).length + 1;

    for (const file of sortedFiles) {
      try {
        const result = await uploadFile(file, `projects/${projectIdNum}/screenshots`);

        await createStep.mutateAsync({
          projectId: projectIdNum,
          order: currentOrder,
          description: `Scene ${currentOrder}`,
          screenshotPath: result.url,
        });

        currentOrder++;
      } catch (err) {
        console.error("Failed to upload screenshot:", err);
      } finally {
        setUploadingFilesCount(prev => Math.max(0, prev - 1));
      }
    }

    utils.step.listByProject.invalidate({ projectId: projectIdNum });
  };

  const handleSceneDragStart = (e: React.DragEvent, index: number) => {
    setDraggedSceneIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };


  const handleSceneDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedSceneIndex === null || draggedSceneIndex === targetIndex) return;

    const stepList = [...(props.parentSteps || steps || [])];
    const draggedItem = stepList[draggedSceneIndex];
    stepList.splice(draggedSceneIndex, 1);
    stepList.splice(targetIndex, 0, draggedItem);

    for (let i = 0; i < stepList.length; i++) {
      const step = stepList[i];
      await updateStep.mutateAsync({
        id: step.id,
        order: i + 1,
      });
    }

    setDraggedSceneIndex(null);
    utils.step.listByProject.invalidate({ projectId: projectIdNum });
  };

  const [tempDesc, setTempDesc] = useState("");
  const [tempScript, setTempScript] = useState("");

  useEffect(() => {
    if (currentStep) {
      setTempDesc(currentStep.description || "");
      setTempScript(currentStep.userEditedScript || currentStep.aiScript || "");
    }
  }, [currentStepIndex, currentStep?.id]);

  const handleSaveStepText = async () => {
    if (!currentStep) return;
    await updateStep.mutateAsync({
      id: currentStep.id,
      description: tempDesc,
      userEditedScript: tempScript,
    });
    utils.project.getById.invalidate({ id: projectIdNum });
  };

  // Sync the active tab to the current editing mode. This is the documented
  // "adjust state when a prop changes" pattern.
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

  const canvasScaleRef = useRef(canvasScale);
  useEffect(() => {
    canvasScaleRef.current = canvasScale;
  }, [canvasScale]);

  const targetScrollRef = useRef<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (targetScrollRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = targetScrollRef.current.left;
      scrollContainerRef.current.scrollTop = targetScrollRef.current.top;
      targetScrollRef.current = null;
    }
  }, [canvasScale]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();

      const containerRect = container.getBoundingClientRect();
      const mouseX = e.clientX - containerRect.left;
      const mouseY = e.clientY - containerRect.top;

      const currentScale = canvasScaleRef.current;
      const zoomFactor = 1.08;
      let nextScale = currentScale;

      if (e.deltaY < 0) {
        nextScale = Math.min(3.0, currentScale * zoomFactor);
      } else {
        nextScale = Math.max(1.0, currentScale / zoomFactor);
      }

      if (nextScale === currentScale) return;

      const scrollLeft = container.scrollLeft;
      const scrollTop = container.scrollTop;

      const scaleRatio = nextScale / currentScale;
      const newScrollLeft = (scrollLeft + mouseX) * scaleRatio - mouseX;
      const newScrollTop = (scrollTop + mouseY) * scaleRatio - mouseY;

      targetScrollRef.current = { left: newScrollLeft, top: newScrollTop };
      setCanvasScale(nextScale);
    };

    container.addEventListener("wheel", handleWheelNative, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheelNative);
    };
  }, [currentStep?.id, isLoading]);

  /* Load existing annotations */
  // Sync project step data into local annotation state. This is the documented
  // "adjust state when external data arrives" pattern.
  useEffect(() => {
    if (project?.steps) {
      const initial: Record<number, StepAnnotation> = {};
      project.steps.forEach((s) => {
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
          editorBlurs: s.editorBlurs || [],
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
          editorPixelates: s.editorPixelates || [],
          editorSpotlightX: s.editorSpotlightX,
          editorSpotlightY: s.editorSpotlightY,
          editorSpotlightW: s.editorSpotlightW,
          editorSpotlightH: s.editorSpotlightH,
          editorSpotlightIntensity: s.editorSpotlightIntensity ?? 0.6,
          editorSpotlights: s.editorSpotlights || [],
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        } else if (dragItem.type === "crop") {
          const handle = handleResizeRef.current;
          const initX = dragItem.initialX || 0;
          const initY = dragItem.initialY || 0;
          const initW = dragItem.initialW || 100;
          const initH = dragItem.initialH || 100;

          if (handle) {
            // Resize from a specific edge/corner handle
            let newX = initX, newY = initY, newW = initW, newH = initH;
            if (handle.includes("w")) {
              newX = clamp(initX + deltaX, 0, initX + initW - 5);
              newW = initW - (newX - initX);
            }
            if (handle.includes("e")) {
              newW = clamp(initW + deltaX, 5, 100 - initX);
            }
            if (handle.includes("n")) {
              newY = clamp(initY + deltaY, 0, initY + initH - 5);
              newH = initH - (newY - initY);
            }
            if (handle.includes("s")) {
              newH = clamp(initY + deltaY, 5, 100 - initY);
            }
            updated.editorCropX = newX;
            updated.editorCropY = newY;
            updated.editorCropW = newW;
            updated.editorCropH = newH;
          } else {
            // Move the entire crop rectangle
            const w = initW;
            const h = initH;
            updated.editorCropX = clamp(initX + deltaX, 0, 100 - w);
            updated.editorCropY = clamp(initY + deltaY, 0, 100 - h);
          }
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
        } else if (dragItem.type === "blurArr") {
          const w = dragItem.initialW || 0;
          const h = dragItem.initialH || 0;
          updated.editorBlurs = (stepAnn.editorBlurs || []).map((r) =>
            r.id === dragItem.id
              ? { ...r, x: clamp(dragItem.initialX + deltaX, 0, 100 - w), y: clamp(dragItem.initialY + deltaY, 0, 100 - h) }
              : r
          );
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
        } else if (dragItem.type === "pixelateArr") {
          const w = dragItem.initialW || 0;
          const h = dragItem.initialH || 0;
          updated.editorPixelates = (stepAnn.editorPixelates || []).map((r) =>
            r.id === dragItem.id
              ? { ...r, x: clamp(dragItem.initialX + deltaX, 0, 100 - w), y: clamp(dragItem.initialY + deltaY, 0, 100 - h) }
              : r
          );
        } else if (dragItem.type === "spotlight") {
          const w = dragItem.initialW || 0;
          const h = dragItem.initialH || 0;
          updated.editorSpotlightX = clamp(dragItem.initialX + deltaX, 0, 100 - w);
          updated.editorSpotlightY = clamp(dragItem.initialY + deltaY, 0, 100 - h);
        } else if (dragItem.type === "spotlightArr") {
          const w = dragItem.initialW || 0;
          const h = dragItem.initialH || 0;
          updated.editorSpotlights = (stepAnn.editorSpotlights || []).map((r) =>
            r.id === dragItem.id
              ? { ...r, x: clamp(dragItem.initialX + deltaX, 0, 100 - w), y: clamp(dragItem.initialY + deltaY, 0, 100 - h) }
              : r
          );
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
      handleResizeRef.current = null;
      return;
    }

    if (!isDragging || !dragStart || !dragCurrent || !currentStep) return;

    const updatedAnn = { ...(annotations[currentStep.id] || {}) };
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
        const existing = updatedAnn.editorBlurs || [];
        updatedAnn.editorBlurs = [...existing, {
          id: crypto.randomUUID(),
          x, y, w, h,
          intensity: updatedAnn.editorBlurIntensity ?? 20,
        }];
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
        const existing = updatedAnn.editorPixelates || [];
        updatedAnn.editorPixelates = [...existing, {
          id: crypto.randomUUID(),
          x, y, w, h,
          blockSize: updatedAnn.editorPixelateBlockSize ?? 20,
        }];
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
        const existing = updatedAnn.editorSpotlights || [];
        updatedAnn.editorSpotlights = [...existing, {
          id: crypto.randomUUID(),
          x, y, w, h,
          intensity: updatedAnn.editorSpotlightIntensity ?? 0.6,
        }];
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

  /* Actions */

  const handleSaveStep = async () => {
    if (!currentStep) return;
    const ann = annotations[currentStep.id];
    if (!ann) return;

    const payload: Record<string, unknown> = {};
    const fields = [
      "zoomTargetX", "zoomTargetY", "zoomRectX", "zoomRectY",
      "zoomRectWidth", "zoomRectHeight",
      "editorCaptionText", "editorCaptionPosition", "editorCaptionStyle",
      "editorCaptionColor", "editorCaptionSize",
      "editorOverlayText", "editorOverlayX", "editorOverlayY",
      "editorOverlayColor", "editorOverlaySize",
      "editorCropX", "editorCropY", "editorCropW", "editorCropH",
      "editorBlurX", "editorBlurY", "editorBlurW", "editorBlurH", "editorBlurIntensity",
      "editorBlurs",
      "editorRedactX", "editorRedactY", "editorRedactW", "editorRedactH", "editorRedactColor",
      "editorWatermarkText", "editorWatermarkPosition", "editorWatermarkSize",
      "editorWatermarkColor", "editorWatermarkOpacity",
      "editorPixelateX", "editorPixelateY", "editorPixelateW", "editorPixelateH", "editorPixelateBlockSize",
      "editorPixelates",
      "editorSpotlightX", "editorSpotlightY", "editorSpotlightW", "editorSpotlightH", "editorSpotlightIntensity",
      "editorSpotlights",
      "editorBadgeNumber", "editorBadgeX", "editorBadgeY", "editorBadgeColor",
      "editorMagnifyX", "editorMagnifyY", "editorMagnifyW", "editorMagnifyH", "editorMagnifyScale", "editorMagnifyCorner",
      "editorColorFilter",
      "editorZoomScale", "editorDuration",
    ];

    fields.forEach((f) => {
      const v = ann[f as keyof StepAnnotation];
      if (v !== undefined) payload[f] = v;
    });

    await updateStep.mutateAsync({ id: currentStep.id, ...payload } as Parameters<typeof updateStep.mutateAsync>[0]);
    utils.project.getById.invalidate({ id: projectIdNum });
  };

  // Autosave annotations to backend
  useEffect(() => {
    if (!currentStep) return;
    const timer = setTimeout(() => {
      handleSaveStep();
    }, 1000);
    return () => clearTimeout(timer);
  }, [annotations, currentStep?.id]);



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

  const redactRect = currentAnn
    ? {
      x: currentAnn.editorRedactX,
      y: currentAnn.editorRedactY,
      w: currentAnn.editorRedactW,
      h: currentAnn.editorRedactH,
    }
    : null;

  const overlayPos = currentAnn
    ? { x: currentAnn.editorOverlayX, y: currentAnn.editorOverlayY }
    : null;

  /* Î“Ã¶Ã‡Î“Ã¶Ã‡ Render helpers Î“Ã¶Ã‡Î“Ã¶Ã‡ */

  
  const renderPropertiesContent = () => {
    if (!currentStep) return null;
    return (
      <div className="space-y-4 mt-3 border-t border-[var(--sketch-fg-subtle)]/20 pt-3">
        <h3 className="font-mono text-[10px] text-[var(--sketch-fg-muted)] uppercase tracking-wider mb-2 flex items-center gap-1">
          <Settings2 className="w-3 h-3" />
          Properties — {mode}
        </h3>
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
                  ≡ The green box shows the area to keep. Drag the edges to resize, or drag inside to move. Everything dimmed will be removed.
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
                  ≡ Select "Blur" tool and drag on canvas to add a blur region. You can add multiple blur regions.
                </p>

                {currentAnn?.editorBlurs && currentAnn.editorBlurs.length > 0 && (
                  <button
                    onClick={() => {
                      const next = {
                        ...annotations,
                        [currentStep.id]: {
                          ...(annotations[currentStep.id] || {}),
                          editorBlurs: [],
                        },
                      };
                      pushHistory(next);
                    }}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear all blurs ({currentAnn.editorBlurs.length})
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
                  ≡ Select "Pixelate" tool and drag on canvas to mosaic sensitive UI. You can add multiple pixelate regions.
                </p>

                {currentAnn?.editorPixelates && currentAnn.editorPixelates.length > 0 && (
                  <button
                    onClick={() => {
                      const next = {
                        ...annotations,
                        [currentStep.id]: {
                          ...(annotations[currentStep.id] || {}),
                          editorPixelates: [],
                        },
                      };
                      pushHistory(next);
                    }}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear all pixelate ({currentAnn.editorPixelates.length})
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
                  ≡ Select "Spotlight" tool and drag to highlight a region while dimming everything else. You can add multiple spotlight regions.
                </p>

                {currentAnn?.editorSpotlights && currentAnn.editorSpotlights.length > 0 && (
                  <button
                    onClick={() => {
                      const next = {
                        ...annotations,
                        [currentStep.id]: {
                          ...(annotations[currentStep.id] || {}),
                          editorSpotlights: [],
                        },
                      };
                      pushHistory(next);
                    }}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear all spotlights ({currentAnn.editorSpotlights.length})
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
                      onChange={(e) => setAnnotations((prev) => ({ ...prev, [currentStep!.id]: { ...prev[currentStep!.id], editorBadgeX: Number(e.target.value) } }))}
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
                      onChange={(e) => setAnnotations((prev) => ({ ...prev, [currentStep!.id]: { ...prev[currentStep!.id], editorBadgeY: Number(e.target.value) } }))}
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
                      onChange={(e) => setAnnotations((prev) => ({ ...prev, [currentStep!.id]: { ...prev[currentStep!.id], editorBadgeColor: e.target.value } }))}
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
                  <div><Label className="text-xs font-mono">X (%)</Label><Input type="number" min={0} max={100} value={currentAnn?.editorMagnifyX ?? ""} onChange={(e) => setAnnotations((prev) => ({ ...prev, [currentStep!.id]: { ...prev[currentStep!.id], editorMagnifyX: Number(e.target.value) } }))} onBlur={() => pushHistory(annotations)} className="mt-1 text-xs" /></div>
                  <div><Label className="text-xs font-mono">Y (%)</Label><Input type="number" min={0} max={100} value={currentAnn?.editorMagnifyY ?? ""} onChange={(e) => setAnnotations((prev) => ({ ...prev, [currentStep!.id]: { ...prev[currentStep!.id], editorMagnifyY: Number(e.target.value) } }))} onBlur={() => pushHistory(annotations)} className="mt-1 text-xs" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs font-mono">Width (%)</Label><Input type="number" min={0} max={100} value={currentAnn?.editorMagnifyW ?? ""} onChange={(e) => setAnnotations((prev) => ({ ...prev, [currentStep!.id]: { ...prev[currentStep!.id], editorMagnifyW: Number(e.target.value) } }))} onBlur={() => pushHistory(annotations)} className="mt-1 text-xs" /></div>
                  <div><Label className="text-xs font-mono">Height (%)</Label><Input type="number" min={0} max={100} value={currentAnn?.editorMagnifyH ?? ""} onChange={(e) => setAnnotations((prev) => ({ ...prev, [currentStep!.id]: { ...prev[currentStep!.id], editorMagnifyH: Number(e.target.value) } }))} onBlur={() => pushHistory(annotations)} className="mt-1 text-xs" /></div>
                </div>
                <div>
                  <Label className="text-xs font-mono">Zoom Scale</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <Slider
                      value={[currentAnn?.editorMagnifyScale ?? 2]}
                      min={1.5}
                      max={5}
                      step={0.5}
                      onValueChange={([v]) => setAnnotations((prev) => ({ ...prev, [currentStep!.id]: { ...prev[currentStep!.id], editorMagnifyScale: v } }))}
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
                  Click a tool in the sidebar or click/drag an annotation on the canvas to edit its properties.
                </p>
              </div>
            )}
          </div>
      </div>
    );
  };

  const toggleRightTab = (tab: "properties" | "script" | "voiceover" | "elevenlabs" | "captions" | "transitions" | "aiguide" | "help") => {
    setActiveRightTab((prev) => (prev === tab ? null : tab));
  };

  const renderScriptContent = () => {
    if (!currentStep) return null;
    return (
      <div className="space-y-4">
        <div>
          <Label className="text-xs font-semibold text-[var(--sketch-fg-muted)] block mb-1">Scene Description</Label>
          <Textarea
            value={tempDesc}
            onChange={(e) => setTempDesc(e.target.value)}
            onBlur={handleSaveStepText}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                (e.target as HTMLTextAreaElement).blur();
              }
            }}
            placeholder="Describe what happens in this scene..."
            className="text-xs min-h-[70px] bg-[var(--sketch-card-bg)] border-[var(--sketch-border-color)]/20 text-[var(--sketch-fg)] placeholder:text-[var(--sketch-fg-muted)]/50 focus:border-blue-500 focus:ring-1 focus:ring-[var(--sketch-accent)]"
          />
        </div>
        <div>
          <Label className="text-xs font-semibold text-[var(--sketch-fg-muted)] block mb-1">Narration Script (TTS)</Label>
          <Textarea
            value={tempScript}
            onChange={(e) => setTempScript(e.target.value)}
            onBlur={handleSaveStepText}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                (e.target as HTMLTextAreaElement).blur();
              }
            }}
            placeholder="Type narration script for this scene..."
            className="text-xs min-h-[110px] bg-[var(--sketch-card-bg)] border-[var(--sketch-border-color)]/20 text-[var(--sketch-fg)] placeholder:text-[var(--sketch-fg-muted)]/50 focus:border-blue-500 focus:ring-1 focus:ring-[var(--sketch-accent)]"
          />
        </div>
        <div className="pt-3 border-t border-[var(--sketch-border-color)]/20 mt-3">
          <button
            onClick={async () => {
              try {
                await generateScript.mutateAsync({ projectId: projectIdNum });
                utils.step.listByProject.invalidate({ projectId: projectIdNum });
              } catch (err: any) {
                alert(err.message || "Failed to generate scripts. Make sure descriptions are set and not keyboard-mashed.");
              }
            }}
            disabled={generateScript.isPending}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-[#FBBF24] hover:bg-[#F59E0B] disabled:opacity-50 text-black text-xs font-bold rounded-md shadow-sm transition-all cursor-pointer border border-black/10"
          >
            {generateScript.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating Scripts...</span>
              </>
            ) : (
              <>
                <span>✨ Generate Scripts for All Scenes</span>
              </>
            )}
          </button>
          <p className="text-[10px] text-[var(--sketch-fg-muted)] mt-1.5 leading-relaxed">
            Automatically generate narration scripts for all scenes using AI based on your descriptions.
          </p>
        </div>
      </div>
    );
  };

  const renderVoiceoverContent = () => {
    return (
      <div className="space-y-4">
        {/* Voice Selection list */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-[var(--sketch-fg-muted)] block">Select AI Voice</Label>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
            {voices.map((v) => {
              const isSelected = selectedVoice === v.id;
              const isPlaying = playingId === v.id;
              const isLoading = previewLoadingId === v.id;
              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVoice(v.id)}
                  className={`p-2 border rounded-lg flex items-center justify-between text-xs transition-all cursor-pointer ${
                    isSelected
                      ? "border-[#FBBF24] bg-[#FBBF24]/5"
                      : "border-[var(--sketch-border-color)]/20 bg-[var(--sketch-card-bg)] hover:border-[var(--sketch-border-color)]/40"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-[var(--sketch-fg)]">{v.name}</span>
                    <span className="text-[9px] text-[var(--sketch-fg-muted)]">{v.accent} • {v.gender} {v.tag && `• ${v.tag}`}</span>
                  </div>
                  <button
                    onClick={(e) => handlePlayPreview(e, v.id)}
                    disabled={previewLoadingId !== null && previewLoadingId !== v.id}
                    className="p-1 hover:bg-[var(--sketch-fg-subtle)]/10 rounded-full text-[var(--sketch-fg-muted)] disabled:opacity-50 flex items-center justify-center cursor-pointer"
                  >
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isPlaying ? (
                      <Square className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Speed Option */}
        <div className="space-y-1.5 pt-2 border-t border-[var(--sketch-border-color)]/20">
          <Label className="text-xs font-semibold text-[var(--sketch-fg-muted)] flex justify-between">
            <span>Voice Speed</span>
            <span className="font-mono text-[10px]">{voiceSpeed.toFixed(1)}x</span>
          </Label>
          <input
            type="range"
            min={0.5}
            max={2.0}
            step={0.1}
            value={voiceSpeed}
            onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
            className="w-full h-1 bg-[var(--sketch-fg-subtle)]/10 appearance-none rounded cursor-pointer accent-[#FBBF24]"
          />
        </div>

        {/* Save Voiceover Selection */}
        <div className="pt-2">
          <button
            onClick={async () => {
              try {
                await updateProject.mutateAsync({
                  id: projectIdNum,
                  voice: selectedVoice,
                  speed: voiceSpeed,
                });
                alert("Voiceover updated successfully!");
              } catch (err: any) {
                alert(err.message || "Failed to update voiceover.");
              }
            }}
            disabled={updateProject.isPending}
            className="w-full py-2 bg-[var(--sketch-btn-bg)] text-[var(--sketch-btn-text)] hover:opacity-90 disabled:opacity-50 text-xs font-bold rounded-md shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            {updateProject.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
            Update Voiceover
          </button>
        </div>
      </div>
    );
  };

  const renderElevenLabsContent = () => {
    return (
      <div className="space-y-4">
        {/* ElevenLabs voice list */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-[var(--sketch-fg-muted)] block">Select ElevenLabs Voice</Label>
          
          {/* Credit Check Indicators */}
          <div className="p-2 bg-[var(--sketch-fg-subtle)]/5 rounded-lg border border-[var(--sketch-border-color)]/15 text-[10px] leading-relaxed text-[var(--sketch-fg-muted)] mb-1">
            {credits.isLoading ? (
              <div className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Checking ElevenLabs credits...</span>
              </div>
            ) : credits.data ? (
              <div className="flex justify-between items-center">
                <span>API Credits: <strong className="text-[var(--sketch-fg)]">{credits.data.remaining} / {credits.data.limit}</strong></span>
                {credits.data.remaining > 0 ? (
                  <span className="text-emerald-600 font-bold">✓ Active</span>
                ) : (
                  <span className="text-red-500 font-bold">⚠️ Exhausted</span>
                )}
              </div>
            ) : (
              <span>Could not load ElevenLabs credits</span>
            )}
          </div>

          <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
            {elevenLabsVoices.map((v) => {
              const isSelected = selectedVoice === v.id;
              const isPlaying = playingId === v.id;
              const isLoading = previewLoadingId === v.id;
              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVoice(v.id)}
                  className={`p-2 border rounded-lg flex items-center justify-between text-xs transition-all cursor-pointer ${
                    isSelected
                      ? "border-[#FBBF24] bg-[#FBBF24]/5"
                      : "border-[var(--sketch-border-color)]/20 bg-[var(--sketch-card-bg)] hover:border-[var(--sketch-border-color)]/40"
                  }`}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-[var(--sketch-fg)]">{v.name}</span>
                      <Crown className="w-3 h-3 text-amber-500" />
                    </div>
                    <span className="text-[9px] text-[var(--sketch-fg-muted)]">{v.accent} • {v.gender} • {v.desc}</span>
                  </div>
                  <button
                    onClick={(e) => handlePlayPreview(e, v.id)}
                    disabled={previewLoadingId !== null && previewLoadingId !== v.id}
                    className="p-1 hover:bg-[var(--sketch-fg-subtle)]/10 rounded-full text-[var(--sketch-fg-muted)] disabled:opacity-50 flex items-center justify-center cursor-pointer"
                  >
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isPlaying ? (
                      <Square className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Speed Option */}
        <div className="space-y-1.5 pt-2 border-t border-[var(--sketch-border-color)]/20">
          <Label className="text-xs font-semibold text-[var(--sketch-fg-muted)] flex justify-between">
            <span>Voice Speed</span>
            <span className="font-mono text-[10px]">{voiceSpeed.toFixed(1)}x</span>
          </Label>
          <input
            type="range"
            min={0.5}
            max={2.0}
            step={0.1}
            value={voiceSpeed}
            onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
            className="w-full h-1 bg-[var(--sketch-fg-subtle)]/10 appearance-none rounded cursor-pointer accent-[#FBBF24]"
          />
        </div>

        {/* Save ElevenLabs Selection */}
        <div className="pt-2">
          <button
            onClick={async () => {
              try {
                await updateProject.mutateAsync({
                  id: projectIdNum,
                  voice: selectedVoice,
                  speed: voiceSpeed,
                });
                alert("ElevenLabs premium voice updated successfully!");
              } catch (err: any) {
                alert(err.message || "Failed to update ElevenLabs voice.");
              }
            }}
            disabled={updateProject.isPending}
            className="w-full py-2 bg-[#FBBF24] hover:bg-[#F59E0B] text-black disabled:opacity-50 text-xs font-bold rounded-md shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-black/10"
          >
            {updateProject.isPending && <Loader2 className="w-3 h-3 animate-spin text-black" />}
            Set Premium Voice
          </button>
        </div>
      </div>
    );
  };

  const renderCaptionsContent = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--sketch-border-color)]/20">
          <Label className="text-xs font-semibold text-[var(--sketch-fg-muted)] cursor-pointer" htmlFor="captions-toggle">Show Captions</Label>
          <input
            id="captions-toggle"
            type="checkbox"
            checked={props.captionsEnabled ?? true}
            onChange={(e) => props.onCaptionsEnabledChange?.(e.target.checked)}
            className="w-3.5 h-3.5 text-[var(--sketch-accent)] rounded border-gray-300 focus:ring-[#0B57D0] cursor-pointer"
          />
        </div>

        {(props.captionsEnabled ?? true) && (
          <div className="space-y-3">
            <div>
              <Label className="text-[11px] font-semibold text-[var(--sketch-fg-muted)] block mb-1">Style</Label>
              <select
                value={props.captionStyle || "standard"}
                onChange={(e) => props.onCaptionStyleChange?.(e.target.value)}
                className="w-full text-xs py-1.5 px-2 bg-[var(--sketch-card-bg)] border border-[var(--sketch-border-color)]/20 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-[var(--sketch-accent)] outline-none"
              >
                <option value="standard">Standard</option>
                <option value="outline">Outline</option>
                <option value="highlight">Highlight</option>
              </select>
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-[var(--sketch-fg-muted)] block mb-1">Size</Label>
              <select
                value={props.captionSize || "medium"}
                onChange={(e) => props.onCaptionSizeChange?.(e.target.value)}
                className="w-full text-xs py-1.5 px-2 bg-[var(--sketch-card-bg)] border border-[var(--sketch-border-color)]/20 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-[var(--sketch-accent)] outline-none"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-[var(--sketch-fg-muted)] block mb-1">Position</Label>
              <select
                value={props.captionPosition || "bottom"}
                onChange={(e) => props.onCaptionPositionChange?.(e.target.value)}
                className="w-full text-xs py-1.5 px-2 bg-[var(--sketch-card-bg)] border border-[var(--sketch-border-color)]/20 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-[var(--sketch-accent)] outline-none"
              >
                <option value="top">Top</option>
                <option value="middle">Middle</option>
                <option value="bottom">Bottom</option>
              </select>
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-[var(--sketch-fg-muted)] block mb-1">Color</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {["#FFFFFF", "#FBBF24", "#10B981", "#EF4444", "#3B82F6", "#000000"].map((c) => (
                  <button
                    key={c}
                    onClick={() => props.onCaptionColorChange?.(c)}
                    className={`w-6 h-6 rounded-full border-2 ${
                      props.captionColor === c ? "border-[var(--sketch-accent)]" : "border-[var(--sketch-border-color)]/20"
                    } hover:scale-105 transition-transform`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTransitionsContent = () => {
    return (
      <div className="space-y-4">
        <div>
          <Label className="text-xs font-semibold text-[var(--sketch-fg-muted)] block mb-2">Global Transition</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {transitionTypes.map((t) => (
              <button
                key={t.value}
                onClick={() => props.onGlobalTransitionChange?.(t.value)}
                className={`py-1.5 px-2 border text-center transition-all text-[10px] font-semibold rounded-md cursor-pointer ${
                  props.globalTransition === t.value
                    ? "border-[var(--sketch-accent)] bg-[var(--sketch-accent)]/10 text-[var(--sketch-accent)] font-bold"
                    : "border-[var(--sketch-border-color)]/20 text-[var(--sketch-fg-muted)] hover:bg-gray-50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-[var(--sketch-border-color)]/20">
          <div className="flex justify-between items-center mb-1">
            <Label className="text-xs font-semibold text-[var(--sketch-fg-muted)]">Duration</Label>
            <span className="font-mono text-[11px] font-bold text-[var(--sketch-accent)]">
              {(props.transitionDuration ?? 0.5).toFixed(1)}s
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-[var(--sketch-fg-subtle)] w-6">0.3s</span>
            <input
              type="range"
              min={0.3}
              max={2.0}
              step={0.1}
              value={props.transitionDuration ?? 0.5}
              onChange={(e) => props.onTransitionDurationChange?.(Number(e.target.value))}
              className="flex-1 h-1 bg-[var(--sketch-fg-subtle)]/10 appearance-none cursor-pointer accent-[var(--sketch-accent)]"
            />
            <span className="font-mono text-[9px] text-[var(--sketch-fg-subtle)] w-6">2.0s</span>
          </div>
        </div>
      </div>
    );
  };

  const renderAIGuideContent = () => {
    return (
      <div className="flex flex-col h-full gap-2">
        <div className="flex-1 min-h-[350px] flex flex-col">
          <AIGuide />
        </div>
      </div>
    );
  };

  const renderHelpContent = () => {
    return (
      <div className="text-xs text-[var(--sketch-fg-muted)] leading-relaxed space-y-3">
        <p><strong>Select Tool:</strong> Select annotations on the canvas to edit or reposition them.</p>
        <p><strong>Highlight Box:</strong> Drag on the canvas to draw a highlight rectangle.</p>
        <p><strong>Zoom Point:</strong> Click anywhere on the screenshot to set a zoom target.</p>
        <p><strong>Text Overlay:</strong> Click on the canvas to place text overlays.</p>
        <p><strong>Crop:</strong> Drag the green box edges to choose what to keep.</p>
        <p><strong>Blur:</strong> Drag over sensitive info to blur it.</p>
        <p><strong>Redact:</strong> Drag over areas to cover with solid color blocks.</p>
        <p><strong>Watermark:</strong> Click to set a persistent watermark.</p>
        <p><strong>Pixelate:</strong> Drag over areas to pixelate.</p>
        <p><strong>Spotlight:</strong> Highlight a region while dimming the rest.</p>
        <p><strong>Badge:</strong> Place a numbered circle overlay.</p>
        <p><strong>Magnify:</strong> Add a magnifying lens overlay inset.</p>
        <p><strong>Filter:</strong> Apply color filters to the screenshot.</p>
        <p><strong>Multi-Zoom:</strong> Set multiple zoom targets sequentially.</p>
        <p><strong>Pan:</strong> Click and drag to navigate zoomed screenshots.</p>
      </div>
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
    <div className="w-full h-full flex flex-col bg-[var(--sketch-bg)] text-[#052421] select-none font-sans overflow-hidden">
      {/* 1. Main Top Header Bar */}
      <header className="w-full bg-[var(--sketch-card-bg)] border-b border-[var(--sketch-border-color)]/20 px-4 py-2 flex flex-col gap-1.5 flex-shrink-0">
        <div className="flex items-center justify-between">
          {/* Left: Logo, Title row */}
          <div className="flex items-center gap-3">
            {/* Back button to dashboard */}
            <button
              onClick={() => {
                if (props.onBack) {
                  props.onBack();
                } else {
                  window.location.href = "/dashboard";
                }
              }}
              className="p-1 hover:bg-[var(--sketch-fg-subtle)]/10 rounded text-[var(--sketch-fg-muted)] hover:text-[var(--sketch-fg)] transition-all cursor-pointer flex items-center justify-center mr-1"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* Logo: Purple-blue play icon */}
            <div className="w-6 h-6 rounded bg-[var(--primary)] flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <Film className="w-3.5 h-3.5" />
            </div>
            {/* Project Title Input & Star & Cloud */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                onBlur={async () => {
                  if (projectIdNum > 0 && projectTitle.trim()) {
                    await updateProject.mutateAsync({ id: projectIdNum, title: projectTitle });
                  }
                }}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="font-medium text-sm text-[var(--sketch-fg)] hover:bg-[var(--sketch-fg-subtle)]/10 focus:bg-[var(--sketch-card-bg)] focus:ring-1 focus:ring-[var(--sketch-accent)] rounded px-1.5 py-0.5 border-none bg-transparent transition-all outline-none"
                style={{ width: `${Math.max(10, projectTitle.length + 2)}ch` }}
              />
              <span className="text-[10px] text-[var(--sketch-fg-subtle)] font-medium bg-[var(--sketch-fg-subtle)]/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                <span>All changes saved</span>
              </span>
            </div>
          </div>

          {/* Right: Light/Dark Mode toggle button & Profile */}
          <div className="flex items-center gap-3">
            {/* Render & Export Trigger Button */}
            <button
              onClick={() => {
                setRenderStarted(true);
                setShowRenderModal(true);
              }}
              className="py-1 px-3 bg-[#FBBF24] hover:bg-[#FBBF24]/90 dark:bg-[#FBBF24]/20 dark:hover:bg-[#FBBF24]/30 text-black dark:text-[#FBBF24] text-xs font-bold rounded shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer border border-[#FBBF24]/30"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            {/* Light/Dark Mode toggle button */}
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="p-1.5 hover:bg-[var(--sketch-fg-subtle)]/10 rounded-full text-[var(--sketch-fg-muted)] hover:text-[var(--sketch-fg)] transition-all cursor-pointer border border-[var(--sketch-border-color)]/20 flex items-center justify-center w-8 h-8"
              title={resolvedTheme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {resolvedTheme === "dark" ? (
                <Sun className="w-4 h-4 text-[#FBBF24]" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            {/* Profile Avatar placeholder */}
            <div className="w-7 h-7 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xs font-bold font-sans select-none flex-shrink-0 cursor-pointer">
              {projectTitle.slice(0, 1).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Nested Menus */}
        <div className="flex items-center gap-3 text-[11px] text-[var(--sketch-fg-muted)] font-medium leading-none select-none pl-9">
          {["File", "Edit", "View", "Insert", "Format", "Scene", "Arrange", "Tools", "Help"].map((menu) => (
            <button key={menu} className="hover:bg-[var(--sketch-fg-subtle)]/10 px-2 py-1 rounded transition-colors cursor-pointer leading-none">
              {menu}
            </button>
          ))}
        </div>
      </header>

      {/* 2. Sub-header Toolbar (horizontal ribbon) */}
      <AnimatePresence initial={false}>
        {!isToolbarCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 42, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="w-full bg-[var(--sketch-card-bg)]/80 border-b border-[var(--sketch-border-color)]/20 px-4 flex items-center justify-between flex-shrink-0 select-none overflow-hidden h-[42px]"
          >
            {/* Left: Fit, Undo/Redo, Tools */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Zoom Fit */}
              <div className="flex items-center gap-1 pr-2 border-r border-[var(--sketch-border-color)]/20">
                <Search className="w-3.5 h-3.5 text-[var(--sketch-fg-muted)]" />
                <select
                  value={Math.round(canvasScale * 100)}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val === 100) setCanvasScale(1.0);
                    else setCanvasScale(val / 100);
                  }}
                  className="bg-transparent text-[11px] font-medium text-[var(--sketch-fg-muted)] border-none outline-none cursor-pointer py-0.5 pr-1 focus:ring-0"
                >
                  <option value={100}>Fit</option>
                  <option value={50}>50%</option>
                  <option value={75}>75%</option>
                  <option value={100}>100%</option>
                  <option value={150}>150%</option>
                  <option value={200}>200%</option>
                  <option value={300}>300%</option>
                </select>
              </div>

              {/* Undo / Redo */}
              <div className="flex items-center gap-0.5 pr-2 border-r border-[var(--sketch-border-color)]/20">
                <button
                  disabled={historyIndex <= 0}
                  onClick={handleUndo}
                  className="p-1 hover:bg-[var(--sketch-fg-subtle)]/20 rounded disabled:opacity-30 text-[var(--sketch-fg-muted)] cursor-pointer"
                  title="Undo"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={historyIndex >= history.length - 1}
                  onClick={handleRedo}
                  className="p-1 hover:bg-[var(--sketch-fg-subtle)]/20 rounded disabled:opacity-30 text-[var(--sketch-fg-muted)] cursor-pointer"
                  title="Redo"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Tools row */}
              <div className="flex items-center gap-1 px-1 overflow-x-auto scrollbar-none py-0.5 flex-1 min-w-0">
                <ToolbarToolButton active={mode === "select"} onClick={() => setMode("select")} icon={<MousePointer className="w-3.5 h-3.5" />} label="Select" />
                <ToolbarToolButton active={mode === "pan"} onClick={() => setMode("pan")} icon={<Move className="w-3.5 h-3.5" />} label="Pan" />
                <ToolbarToolButton
                  active={mode === "crop"}
                  onClick={() => {
                    if (currentStep) {
                      const ann = annotations[currentStep.id] || {};
                      if (ann.editorCropX == null || ann.editorCropW == null) {
                        const next = {
                          ...annotations,
                          [currentStep.id]: {
                            ...ann,
                            editorCropX: 0,
                            editorCropY: 0,
                            editorCropW: 100,
                            editorCropH: 100,
                          },
                        };
                        pushHistory(next);
                      }
                    }
                    setMode("crop");
                  }}
                  icon={<Crop className="w-3.5 h-3.5" />}
                  label="Crop"
                />
                <div className="h-4 w-[1px] bg-[#D3D3D3]/50 mx-1 flex-shrink-0" />
                <ToolbarToolButton active={mode === "rect"} onClick={() => setMode("rect")} icon={<Square className="w-3.5 h-3.5" />} label="Highlight" />
                <ToolbarToolButton active={mode === "point"} onClick={() => setMode("point")} icon={<Target className="w-3.5 h-3.5" />} label="Zoom Point" />
                <ToolbarToolButton active={mode === "multizoom"} onClick={() => setMode("multizoom")} icon={<Scan className="w-3.5 h-3.5" />} label="Multi-Zoom" />
                <ToolbarToolButton active={mode === "magnify"} onClick={() => setMode("magnify")} icon={<Search className="w-3.5 h-3.5" />} label="Magnify" />
                <div className="h-4 w-[1px] bg-[#D3D3D3]/50 mx-1 flex-shrink-0" />
                <ToolbarToolButton active={mode === "overlay"} onClick={() => setMode("overlay")} icon={<Type className="w-3.5 h-3.5" />} label="Text Overlay" />
                <ToolbarToolButton active={mode === "badge"} onClick={() => setMode("badge")} icon={<BadgeCheck className="w-3.5 h-3.5" />} label="Badge" />
                <ToolbarToolButton active={mode === "watermark"} onClick={() => setMode("watermark")} icon={<Stamp className="w-3.5 h-3.5" />} label="Watermark" />
                <ToolbarToolButton active={mode === "caption"} onClick={() => setMode("caption")} icon={<Type className="w-3.5 h-3.5" />} label="Subtitles" />
                <div className="h-4 w-[1px] bg-[#D3D3D3]/50 mx-1 flex-shrink-0" />
                <ToolbarToolButton active={mode === "blur"} onClick={() => setMode("blur")} icon={<Aperture className="w-3.5 h-3.5" />} label="Blur" />
                <ToolbarToolButton active={mode === "redact"} onClick={() => setMode("redact")} icon={<Shield className="w-3.5 h-3.5" />} label="Redact" />
                <ToolbarToolButton active={mode === "pixelate"} onClick={() => setMode("pixelate")} icon={<Grid3x3 className="w-3.5 h-3.5" />} label="Pixelate" />
                <ToolbarToolButton active={mode === "spotlight"} onClick={() => setMode("spotlight")} icon={<Sun className="w-3.5 h-3.5" />} label="Spotlight" />
                <ToolbarToolButton active={mode === "filter"} onClick={() => setMode("filter")} icon={<Palette className="w-3.5 h-3.5" />} label="Filter" />
              </div>
            </div>

            {/* Right: Collapse toggle */}
            <div className="flex items-center">
              <button
                onClick={() => setIsToolbarCollapsed(true)}
                className="p-1 hover:bg-[var(--sketch-fg-subtle)]/20 rounded text-[var(--sketch-fg-muted)] cursor-pointer"
                title="Collapse toolbar"
              >
                <ChevronDown className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Restore toolbar icon button if collapsed */}
      {isToolbarCollapsed && (
        <button
          onClick={() => setIsToolbarCollapsed(false)}
          className="absolute left-4 top-[64px] z-50 p-1 bg-[var(--sketch-card-bg)] border border-[var(--sketch-border-color)]/20 shadow-sm hover:bg-[var(--sketch-fg-subtle)]/10 rounded-full text-[var(--sketch-fg-muted)] cursor-pointer"
          title="Expand toolbar"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      )}

      {/* 3. Main Split Workspace */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Left/Center Workspace: Canvas container */}
        <div className="flex-1 flex flex-col bg-[var(--sketch-bg)] relative min-w-0 p-4">
          <div className="flex-1 w-full relative min-h-0 flex flex-col overflow-hidden">
            {currentStep && (
              <div
                ref={scrollContainerRef}
                className={`w-full flex-grow flex-1 min-h-0 border-2 border-[var(--sketch-border-color)] rounded-md bg-[#000000] relative ${
                  canvasScale > 1.0
                    ? "overflow-auto"
                    : "overflow-hidden flex items-center justify-center p-2"
                }`}
              >
                <div
                  style={canvasScale > 1.0 ? {
                    width: `${canvasScale * 100}%`,
                    minWidth: "100%",
                    margin: "0 auto",
                  } : {
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                    <div
                      ref={canvasRef}
                      className={`relative overflow-hidden sketch-border-sm ${
                        canvasScale > 1.0 ? `w-full ${aspectClass}` : `max-w-full max-h-full ${aspectClass}`
                      } ${mode === "pan"
                          ? "cursor-grab active:cursor-grabbing"
                          : mode === "select"
                            ? "cursor-default"
                            : "cursor-crosshair"
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
                              className="absolute pointer-events-auto cursor-move select-none"
                              style={{
                                left: `${rect.x}%`,
                                top: `${rect.y}%`,
                                width: `${rect.w}%`,
                                height: `${rect.h}%`,
                                border: "3px solid #FF0099",
                                backgroundColor: "rgba(255,0,153,0.12)",
                                boxShadow: "0 0 0 1px rgba(255,255,255,0.9), 0 4px 12px rgba(0,0,0,0.4)",
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
                              <div className="absolute top-1 left-1 bg-[#FF0099] text-white text-[10px] font-mono px-1 rounded font-bold">
                                Highlight
                              </div>
                            </div>
                          )}

                          {/* Temp drag rect */}
                          {tempRect && (
                            <div
                              className="absolute pointer-events-none select-none"
                              style={{
                                left: `${tempRect.x}%`,
                                top: `${tempRect.y}%`,
                                width: `${tempRect.w}%`,
                                height: `${tempRect.h}%`,
                                border: "3px dashed #00E5FF",
                                backgroundColor: "rgba(0,229,255,0.10)",
                                boxShadow: "0 0 0 1px rgba(255,255,255,0.7)",
                              }}
                            />
                          )}

                          {/* Crop overlay — Canva style with dimmed outside + edge handles */}
                          {cropRect && cropRect.x != null && cropRect.y != null && cropRect.w != null && cropRect.h != null && (
                            <>
                              {/* Dimmed area outside the crop (4 rectangles: top, bottom, left, right) */}
                              <div className="absolute pointer-events-none" style={{ left: 0, top: 0, width: "100%", height: "100%", overflow: "hidden" }}>
                                {/* Top */}
                                <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: `${cropRect.y}%`, backgroundColor: "rgba(0,0,0,0.55)" }} />
                                {/* Bottom */}
                                <div style={{ position: "absolute", left: 0, top: `${cropRect.y + cropRect.h}%`, width: "100%", height: `${100 - cropRect.y - cropRect.h}%`, backgroundColor: "rgba(0,0,0,0.55)" }} />
                                {/* Left */}
                                <div style={{ position: "absolute", left: 0, top: `${cropRect.y}%`, width: `${cropRect.x}%`, height: `${cropRect.h}%`, backgroundColor: "rgba(0,0,0,0.55)" }} />
                                {/* Right */}
                                <div style={{ position: "absolute", left: `${cropRect.x + cropRect.w}%`, top: `${cropRect.y}%`, width: `${100 - cropRect.x - cropRect.w}%`, height: `${cropRect.h}%`, backgroundColor: "rgba(0,0,0,0.55)" }} />
                              </div>

                              {/* Crop selection rectangle — draggable to move, with edge handles to resize */}
                              <div
                                className="absolute pointer-events-auto cursor-move select-none"
                                style={{
                                  left: `${cropRect.x}%`,
                                  top: `${cropRect.y}%`,
                                  width: `${cropRect.w}%`,
                                  height: `${cropRect.h}%`,
                                  border: "3px solid #00E676",
                                  boxShadow: "0 0 0 1px rgba(255,255,255,0.9)",
                                }}
                                onMouseDown={(e) => {
                                  // Only drag if clicking inside (not on handles)
                                  if ((e.target as HTMLElement).dataset.handle) return;
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
                                <div className="absolute top-1 left-1 bg-[#00E676] text-black text-[10px] font-mono px-1 rounded font-bold">
                                  Crop — keep this area
                                </div>

                                {/* Edge handles — 8 resize handles (corners + midpoints) */}
                                {[
                                  { name: "nw", style: { top: "-6px", left: "-6px", cursor: "nwse-resize" } },
                                  { name: "n", style: { top: "-6px", left: "50%", transform: "translateX(-50%)", cursor: "ns-resize" } },
                                  { name: "ne", style: { top: "-6px", right: "-6px", cursor: "nesw-resize" } },
                                  { name: "e", style: { top: "50%", right: "-6px", transform: "translateY(-50%)", cursor: "ew-resize" } },
                                  { name: "se", style: { bottom: "-6px", right: "-6px", cursor: "nwse-resize" } },
                                  { name: "s", style: { bottom: "-6px", left: "50%", transform: "translateX(-50%)", cursor: "ns-resize" } },
                                  { name: "sw", style: { bottom: "-6px", left: "-6px", cursor: "nesw-resize" } },
                                  { name: "w", style: { top: "50%", left: "-6px", transform: "translateY(-50%)", cursor: "ew-resize" } },
                                ].map((h) => (
                                  <div
                                    key={h.name}
                                    data-handle={h.name}
                                    className="absolute w-3 h-3 bg-[var(--sketch-card-bg)] border-2 border-[#00E676] rounded-sm pointer-events-auto"
                                    style={{ ...h.style, zIndex: 10 }}
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
                                      // Store which handle is being dragged via a custom property
                                      handleResizeRef.current = h.name;
                                    }}
                                  />
                                ))}
                              </div>
                            </>
                          )}

                          {/* Blur overlays (multiple regions) */}
                          {(currentAnn?.editorBlurs || []).map((blurRegion, idx) => (
                            <div
                              key={blurRegion.id}
                              className="absolute pointer-events-auto cursor-move overflow-hidden select-none group"
                              style={{
                                left: `${blurRegion.x}%`,
                                top: `${blurRegion.y}%`,
                                width: `${blurRegion.w}%`,
                                height: `${blurRegion.h}%`,
                                border: "3px solid #FF4081",
                                boxShadow: "0 0 0 1px rgba(255,255,255,0.9), 0 4px 12px rgba(0,0,0,0.4)",
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setMode("blur");
                                const coords = getCanvasCoords(e);
                                if (!coords) return;
                                setDragItem({
                                  type: "blurArr",
                                  id: blurRegion.id,
                                  startX: coords.x,
                                  startY: coords.y,
                                  initialX: blurRegion.x,
                                  initialY: blurRegion.y,
                                  initialW: blurRegion.w,
                                  initialH: blurRegion.h,
                                });
                              }}
                            >
                              <div
                                className="w-full h-full"
                                style={{
                                  backdropFilter: `blur(${blurRegion.intensity ?? currentAnn?.editorBlurIntensity ?? 20}px)`,
                                  WebkitBackdropFilter: `blur(${blurRegion.intensity ?? currentAnn?.editorBlurIntensity ?? 20}px)`,
                                  backgroundColor: "rgba(255,255,255,0.05)",
                                }}
                              />
                              <div className="absolute top-1 left-1 bg-[#FF4081] text-white text-[10px] font-mono px-1 rounded font-bold">
                                Blur {idx + 1}
                              </div>
                              <button
                                className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white text-[10px] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const next = {
                                    ...annotations,
                                    [currentStep.id]: {
                                      ...(annotations[currentStep.id] || {}),
                                      editorBlurs: (currentAnn?.editorBlurs || []).filter((r) => r.id !== blurRegion.id),
                                    },
                                  };
                                  pushHistory(next);
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ))}

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
                                border: "3px solid #FFFFFF",
                                boxShadow: "0 0 0 1px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4)",
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
                              <div className="absolute top-1 left-1 bg-gray-900 text-white text-[10px] font-mono px-1 rounded font-bold border border-white/50">
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

                          {/* Pixelate overlays (multiple regions) */}
                          {(currentAnn?.editorPixelates || []).map((pixRegion, idx) => (
                            <div
                              key={pixRegion.id}
                              className="absolute pointer-events-auto cursor-move overflow-hidden select-none group"
                              style={{
                                left: `${pixRegion.x}%`,
                                top: `${pixRegion.y}%`,
                                width: `${pixRegion.w}%`,
                                height: `${pixRegion.h}%`,
                                border: "3px solid #00BCD4",
                                boxShadow: "0 0 0 1px rgba(255,255,255,0.9), 0 4px 12px rgba(0,0,0,0.4)",
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setMode("pixelate");
                                const coords = getCanvasCoords(e);
                                if (!coords) return;
                                setDragItem({
                                  type: "pixelateArr",
                                  id: pixRegion.id,
                                  startX: coords.x,
                                  startY: coords.y,
                                  initialX: pixRegion.x,
                                  initialY: pixRegion.y,
                                  initialW: pixRegion.w,
                                  initialH: pixRegion.h,
                                });
                              }}
                            >
                              <div
                                className="w-full h-full"
                                style={{
                                  backgroundImage: `repeating-conic-gradient(#808080 0% 25%, #a0a0a0 0% 50%)`,
                                  backgroundSize: `${pixRegion.blockSize ?? currentAnn?.editorPixelateBlockSize ?? 20}px ${pixRegion.blockSize ?? currentAnn?.editorPixelateBlockSize ?? 20}px`,
                                  opacity: 0.7,
                                }}
                              />
                              <div className="absolute top-1 left-1 bg-[#00BCD4] text-white text-[10px] font-mono px-1 rounded font-bold">
                                Pixelate {idx + 1}
                              </div>
                              <button
                                className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white text-[10px] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const next = {
                                    ...annotations,
                                    [currentStep.id]: {
                                      ...(annotations[currentStep.id] || {}),
                                      editorPixelates: (currentAnn?.editorPixelates || []).filter((r) => r.id !== pixRegion.id),
                                    },
                                  };
                                  pushHistory(next);
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ))}

                          {/* Spotlight overlays (multiple regions) */}
                          {(currentAnn?.editorSpotlights || []).length > 0 && (
                            <>
                              {/* Dark overlay covering everything */}
                              <div
                                className="absolute pointer-events-none"
                                style={{
                                  left: 0,
                                  top: 0,
                                  width: "100%",
                                  height: "100%",
                                  backgroundColor: `rgba(0,0,0,${Math.max(...(currentAnn?.editorSpotlights || []).map(s => s.intensity ?? currentAnn?.editorSpotlightIntensity ?? 0.6))})`,
                                  mixBlendMode: "multiply",
                                }}
                              />
                              {/* Each spotlight region "cuts out" the dark overlay */}
                              {(currentAnn?.editorSpotlights || []).map((spotRegion, idx) => (
                                <div
                                  key={spotRegion.id}
                                  className="absolute pointer-events-auto cursor-move select-none group"
                                  style={{
                                    left: `${spotRegion.x}%`,
                                    top: `${spotRegion.y}%`,
                                    width: `${spotRegion.w}%`,
                                    height: `${spotRegion.h}%`,
                                    border: "3px solid #FF6D00",
                                    borderRadius: "4px",
                                    boxShadow: `0 0 0 9999px rgba(0,0,0,${spotRegion.intensity ?? currentAnn?.editorSpotlightIntensity ?? 0.6}), 0 0 0 1px rgba(255,255,255,0.9)`,
                                  }}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setMode("spotlight");
                                    const coords = getCanvasCoords(e);
                                    if (!coords) return;
                                    setDragItem({
                                      type: "spotlightArr",
                                      id: spotRegion.id,
                                      startX: coords.x,
                                      startY: coords.y,
                                      initialX: spotRegion.x,
                                      initialY: spotRegion.y,
                                      initialW: spotRegion.w,
                                      initialH: spotRegion.h,
                                    });
                                  }}
                                >
                                  <div className="absolute top-1 left-1 bg-[#FF6D00] text-white text-[10px] font-mono px-1 rounded font-bold">
                                    Spotlight {idx + 1}
                                  </div>
                                  <button
                                    className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white text-[10px] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const next = {
                                        ...annotations,
                                        [currentStep.id]: {
                                          ...(annotations[currentStep.id] || {}),
                                          editorSpotlights: (currentAnn?.editorSpotlights || []).filter((r) => r.id !== spotRegion.id),
                                        },
                                      };
                                      pushHistory(next);
                                    }}
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
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
                              <div className="w-full h-full rounded-full border-2 border-[#FF0099] bg-[#FF0099]/40 animate-pulse" style={{ boxShadow: "0 0 0 2px rgba(255,255,255,0.9), 0 2px 8px rgba(0,0,0,0.5)" }} />
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
            )}
          </div>
        </div>

        {/* Right drawer and vertical tab strip */}
        <div className="flex-shrink-0 flex items-stretch">
          {/* Drawer container (slides open next to vertical tabs) */}
          <AnimatePresence initial={false}>
            {activeRightTab && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeInOut" }}
                className="h-full bg-[var(--sketch-card-bg)] border-l border-[var(--sketch-border-color)]/20 overflow-y-auto scrollbar-thin p-4 flex flex-col min-w-[280px]"
              >
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <h3 className="font-mono text-xs text-[var(--sketch-fg-muted)] uppercase tracking-wider font-semibold">
                    {activeRightTab === "properties" && "Properties"}
                    {activeRightTab === "script" && "Script & Scene"}
                    {activeRightTab === "voiceover" && "AI Voiceover"}
                    {activeRightTab === "elevenlabs" && "ElevenLabs Premium"}
                    {activeRightTab === "captions" && "Captions Settings"}
                    {activeRightTab === "transitions" && "Transitions"}
                    {activeRightTab === "aiguide" && "AI Guide"}
                    {activeRightTab === "help" && "Help Guide"}
                  </h3>
                  <button
                    onClick={() => setActiveRightTab(null)}
                    className="text-[var(--sketch-fg-subtle)] hover:text-[var(--sketch-fg-muted)] text-xs font-bold cursor-pointer"
                  >
                    Close ×
                  </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                  {activeRightTab === "properties" && renderPropertiesContent()}
                  {activeRightTab === "script" && renderScriptContent()}
                  {activeRightTab === "voiceover" && renderVoiceoverContent()}
                  {activeRightTab === "elevenlabs" && renderElevenLabsContent()}
                  {activeRightTab === "captions" && renderCaptionsContent()}
                  {activeRightTab === "transitions" && renderTransitionsContent()}
                  {activeRightTab === "aiguide" && renderAIGuideContent()}
                  {activeRightTab === "help" && renderHelpContent()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Far-right vertical tab strip */}
          <div className="w-20 bg-[var(--sketch-card-bg)] border-l border-[var(--sketch-border-color)]/20 py-2 flex flex-col items-center gap-1.5 flex-shrink-0">
            <RightTabButton active={activeRightTab === "properties"} onClick={() => toggleRightTab("properties")} icon={<Settings2 className="w-5 h-5" />} label="Properties" />
            <RightTabButton active={activeRightTab === "script"} onClick={() => toggleRightTab("script")} icon={<Type className="w-5 h-5 text-[var(--sketch-accent)]" />} label="Script" />
            <RightTabButton active={activeRightTab === "voiceover"} onClick={() => toggleRightTab("voiceover")} icon={<Volume2 className="w-5 h-5 text-[var(--sketch-accent)]" />} label="Voiceover" />
            <RightTabButton active={activeRightTab === "elevenlabs"} onClick={() => toggleRightTab("elevenlabs")} icon={<Crown className="w-5 h-5 text-[var(--sketch-accent)]" />} label="ElevenLabs" />
            <RightTabButton active={activeRightTab === "captions"} onClick={() => toggleRightTab("captions")} icon={<Type className="w-5 h-5 text-[var(--sketch-accent)]" />} label="Captions" />
            <RightTabButton active={activeRightTab === "transitions"} onClick={() => toggleRightTab("transitions")} icon={<Film className="w-5 h-5 text-[var(--sketch-accent)]" />} label="Transitions" />
            <RightTabButton active={activeRightTab === "aiguide"} onClick={() => toggleRightTab("aiguide")} icon={<Bot className="w-5 h-5 text-[var(--sketch-accent)]" />} label="AI Guide" />
            <div className="flex-1" />
            <RightTabButton active={activeRightTab === "help"} onClick={() => toggleRightTab("help")} icon={<HelpCircle className="w-5 h-5 text-[var(--sketch-fg-subtle)]" />} label="Help" />
          </div>
        </div>
      </div>

      {/* 4. Bottom Horizontal Timeline */}
      <footer
        onDragOver={(e) => {
          if (e.dataTransfer?.types?.includes("Files")) {
            e.preventDefault();
            setIsTimelineDragOver(true);
          }
        }}
        onDragLeave={() => setIsTimelineDragOver(false)}
        onDrop={(e) => {
          if (e.dataTransfer?.files?.length) {
            e.preventDefault();
            setIsTimelineDragOver(false);
            handleUploadFiles(e.dataTransfer.files);
          }
        }}
        className={`w-full bg-[var(--sketch-card-bg)] border-t border-[var(--sketch-border-color)]/20 p-3 flex flex-col gap-2 flex-shrink-0 select-none transition-all ${
          isTimelineDragOver ? "ring-2 ring-[#FBBF24] bg-[#FBBF24]/5" : ""
        }`}
      >
        {/* Hidden File Selector Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleUploadFiles(e.target.files);
          }}
        />

        {/* Controls row */}
        <div className="flex items-center justify-between text-xs text-[var(--sketch-fg-muted)] px-1">
          {/* Left: Show timing */}
          <div className="flex items-center gap-1">
            <button className="flex items-center gap-1 hover:bg-[var(--sketch-fg-subtle)]/10 px-2.5 py-1 rounded transition-colors text-[11px] font-semibold cursor-pointer">
              <span>Show timing</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          {/* Center: Play and timing */}
          <div className="flex items-center gap-2">
            <button
              onClick={props.onContinue}
              className="w-8 h-8 rounded-full bg-[var(--sketch-btn-bg)] hover:opacity-90 text-white flex items-center justify-center transition-colors cursor-pointer shadow-sm"
              title="Play"
            >
              <ChevronRightIcon className="w-5 h-5 ml-0.5" />
            </button>
            <span className="font-mono text-[11px] font-semibold tracking-wide text-[var(--sketch-fg)] bg-[var(--sketch-fg-subtle)]/10 px-2 py-0.5 rounded">
              00:00.0 / {((props.parentSteps || steps || []).length * (currentAnn?.editorDuration ?? 5.0)).toFixed(1).padStart(4, "0")}
            </span>
          </div>

          {/* Right: Zoom slider */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono">Zoom</span>
            <input
              type="range"
              min={50}
              max={150}
              defaultValue={100}
              className="w-20 h-1 bg-[var(--sketch-fg-subtle)]/10 appearance-none rounded cursor-pointer accent-[var(--sketch-accent)]"
            />
            <span className="text-[10px] font-mono font-bold text-[var(--sketch-fg-muted)] bg-[var(--sketch-fg-subtle)]/10 px-1.5 py-0.5 rounded">100% ▾</span>
          </div>
        </div>

        {/* Scene strip */}
        <div className="relative flex items-center px-1 min-h-[90px] justify-center">
          {(props.parentSteps || steps || []).length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 border-2 border-dashed border-[var(--sketch-border-color)]/20 rounded-lg flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-[var(--sketch-border-color)]/40 transition-colors"
            >
              <Upload className="w-6 h-6 text-[var(--sketch-fg-subtle)] animate-bounce" />
              <p className="text-xs font-semibold text-[var(--sketch-fg-muted)]">
                Drag & drop screenshots here, or click to choose files
              </p>
              <p className="text-[9px] text-[var(--sketch-fg-subtle)]">
                Files are automatically numbered as Scene 1, Scene 2, etc.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto scrollbar-thin pb-1 flex gap-3 items-center min-w-0 pr-12">
              {(props.parentSteps || steps || []).map((step, idx: number) => {
                const stepId = step.id;
                const isActive = idx === currentStepIndex;
                return (
                  <div
                    key={stepId}
                    draggable={true}
                    onDragStart={(e) => handleSceneDragStart(e, idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleSceneDrop(e, idx)}
                    className="flex-shrink-0 flex items-center gap-2 py-1 group/scene relative cursor-grab active:cursor-grabbing"
                  >
                    {/* Step Scene Card */}
                    <div className="relative flex flex-col">
                      {/* Active Playhead caret */}
                      {isActive && (
                        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#FBBF24] rotate-45 border-t border-l border-[var(--sketch-card-bg)] shadow-sm z-20" />
                      )}
                      <button
                        onClick={() => setCurrentStepIndex(idx)}
                        className={`relative w-28 aspect-video border-2 rounded-lg transition-all overflow-hidden ${
                          isActive
                            ? "border-[#FBBF24] shadow-[0_0_12px_rgba(251,191,36,0.35)]"
                            : "border-[var(--sketch-border-color)]/20 hover:border-[var(--sketch-border-color)]/40"
                        }`}
                      >
                        <span className="absolute top-1 left-1 font-mono text-[9px] text-white bg-black/60 px-1.5 py-0.5 rounded-md z-10 font-bold leading-none">
                          {idx + 1}
                        </span>
                        {step.screenshotPath ? (
                          <img
                            src={step.screenshotPath}
                            alt={`Step ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-[var(--sketch-fg-subtle)]/10 flex items-center justify-center">
                            <Film className="w-4 h-4 text-[var(--sketch-fg-subtle)]" />
                          </div>
                        )}
                      </button>

                      {/* Delete Scene Hover Button */}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to delete Scene ${idx + 1}?`)) {
                            await deleteStep.mutateAsync({ id: stepId });
                            utils.step.listByProject.invalidate({ projectId: projectIdNum });
                            if (currentStepIndex >= (props.parentSteps || steps || []).length - 1) {
                              setCurrentStepIndex(Math.max(0, currentStepIndex - 1));
                            }
                          }
                        }}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded flex items-center justify-center z-30 transition-all opacity-0 group-hover/scene:opacity-100 shadow-sm cursor-pointer border border-white/20"
                        title="Delete Scene"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Transition diamond between scenes */}
                    {idx < (props.parentSteps || steps || []).length - 1 && (
                      <div className="relative flex items-center justify-center w-8 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenTransitionDropdown(
                              openTransitionDropdown === stepId ? null : stepId
                            );
                          }}
                          className={`w-5 h-5 flex items-center justify-center rotate-45 border transition-all rounded-sm shrink-0 cursor-pointer shadow-sm ${
                            openTransitionDropdown === stepId
                              ? "border-[#FBBF24] bg-[#FBBF24]/10"
                              : "border-[var(--sketch-border-color)]/20 bg-[var(--sketch-card-bg)] hover:border-[var(--sketch-border-color)]/40 hover:bg-gray-50"
                          }`}
                          title="Transition"
                        >
                          <Film className="w-2.5 h-2.5 -rotate-45 text-[var(--sketch-fg-muted)]" />
                        </button>
                        {openTransitionDropdown === stepId && (
                          <div className="absolute bottom-7 left-1/2 -translate-x-1/2 z-50 bg-[var(--sketch-card-bg)] border border-[var(--sketch-border-color)]/20 rounded-lg shadow-lg p-1 min-w-[125px]">
                            {transitionTypes.map((t) => {
                              const nextStep = (props.parentSteps || steps || [])[idx + 1];
                              const currentVal = props.stepTransitions?.[nextStep.id] || props.globalTransition || "fade";
                              return (
                                <button
                                  key={t.value}
                                  onClick={() => {
                                    if (nextStep) {
                                      props.onStepTransitionChange?.(nextStep.id, t.value);
                                    }
                                    setOpenTransitionDropdown(null);
                                  }}
                                  className={`block w-full text-left px-2.5 py-1.5 text-[10px] font-body rounded-md hover:bg-[var(--sketch-fg-subtle)]/10 ${
                                    currentVal === t.value ? "text-[var(--sketch-accent)] font-semibold bg-[var(--sketch-accent)]/10" : "text-[var(--sketch-fg-muted)]"
                                  }`}
                                >
                                  {t.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Inline Plus Button for adding scenes */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-28 aspect-video rounded-lg bg-[var(--sketch-fg-subtle)]/5 hover:bg-[var(--sketch-fg-subtle)]/10 border-2 border-dashed border-[var(--sketch-border-color)]/20 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all flex-shrink-0"
                title="Add Scene"
              >
                <span className="text-xl font-bold text-[var(--sketch-fg-muted)] leading-none">+</span>
                <span className="text-[9px] font-semibold text-[var(--sketch-fg-subtle)]">Add Scene</span>
              </button>

              {/* Uploading progress states */}
              {uploadingFilesCount > 0 && (
                <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1 bg-[var(--sketch-fg-subtle)]/5 rounded-lg border border-[var(--sketch-border-color)]/10 h-10">
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--sketch-accent)]" />
                  <span className="text-[10px] font-semibold text-[var(--sketch-fg-muted)]">
                    Uploading {uploadingFilesCount} files...
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </footer>
      {/* Mega Render Progress Dialog Popup */}
      <Dialog open={showRenderModal} onOpenChange={(open) => {
        if (!open) {
          const isDone = renderStatus?.projectStatus === "complete" || renderStatus?.job?.status === "complete";
          const isErr = renderStatus?.projectStatus === "error" || renderStatus?.job?.status === "error" || startRenderError;
          if (isDone || isErr) {
            setShowRenderModal(false);
            setRenderStarted(false);
          }
        }
      }}>
        <DialogContent className="border border-[var(--sketch-border-color)]/25 bg-white dark:bg-[#0B1E1B] bg-opacity-100 max-w-2xl rounded-2xl shadow-2xl p-8 flex flex-col gap-6 text-center select-none outline-none">
          <DialogHeader className="text-center flex flex-col items-center">
            <div className="relative inline-block">
              <span className="font-mono text-xs text-[var(--sketch-fg-muted)] uppercase tracking-widest bg-[#FBBF24]/20 px-2 py-1 sketch-border-sm inline-block">
                Rendering Video
              </span>
              {!(renderStatus?.projectStatus === "complete" || renderStatus?.job?.status === "complete") && 
               !(renderStatus?.projectStatus === "error" || renderStatus?.job?.status === "error" || startRenderError) && (
                <span className="font-hand text-xl text-[var(--sketch-fg-muted)] absolute -top-7 left-36 rotate-[3deg] animate-float hidden sm:block">
                  Generating magic... ✨
                </span>
              )}
            </div>
            <DialogTitle className="text-2xl font-bold mt-4 text-[var(--sketch-fg)]">
              {renderStatus?.projectStatus === "complete" || renderStatus?.job?.status === "complete"
                ? "Video complete!"
                : renderStatus?.projectStatus === "error" || renderStatus?.job?.status === "error" || startRenderError
                  ? "Something went wrong"
                  : "Generating your video…"}
            </DialogTitle>
            <DialogDescription className="text-sm text-[var(--sketch-fg-muted)] mt-1.5 leading-relaxed max-w-md">
              {renderStatus?.projectStatus === "complete" || renderStatus?.job?.status === "complete"
                ? "Redirecting to preview page..."
                : renderStatus?.projectStatus === "error" || renderStatus?.job?.status === "error" || startRenderError
                  ? renderStatus?.job?.message || startRenderError || "An error occurred during rendering."
                  : "This takes 2-5 minutes. You can safely close this — your video will render in the background."}
            </DialogDescription>
          </DialogHeader>

          {startRenderError && (
            <div className="mt-2 p-4 border border-red-500/30 bg-red-500/5 rounded-xl text-center">
              <div className="flex items-center gap-2 justify-center text-red-600 font-medium">
                <AlertTriangle className="w-5 h-5" />
                <span>{startRenderError}</span>
              </div>
              <button
                onClick={() => {
                  setShowRenderModal(false);
                  setRenderStarted(false);
                }}
                className="mt-4 px-4 py-2 bg-[var(--sketch-fg-subtle)]/10 hover:bg-[var(--sketch-fg-subtle)]/20 text-[var(--sketch-fg)] text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Go Back to Editor
              </button>
            </div>
          )}

          {!startRenderError && (
            <div className="mt-2 text-center w-full">
              {/* Progress bar */}
              <div className="w-full bg-[var(--sketch-fg-subtle)]/5 border border-[var(--sketch-border-color)]/10 rounded-full h-3 overflow-hidden p-0.5 mb-6">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    renderStatus?.projectStatus === "complete" || renderStatus?.job?.status === "complete"
                      ? "bg-emerald-500"
                      : renderStatus?.projectStatus === "error" || renderStatus?.job?.status === "error"
                        ? "bg-red-500"
                        : "bg-[#FBBF24]"
                  }`}
                  style={{
                    width: `${
                      renderStatus?.projectStatus === "complete" || renderStatus?.job?.status === "complete"
                        ? 100
                        : Math.min((renderStatus?.job ? ((renderStatus.job.currentStep || 0) / (renderStatus.job.totalSteps || 1)) * 100 : 0) + 5, 95)
                    }%`
                  }}
                />
              </div>

              {renderStatus?.projectStatus === "complete" || renderStatus?.job?.status === "complete" ? (
                <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex flex-col items-center">
                  <CheckCircle className="w-10 h-10 text-emerald-600 mb-3" />
                  <h4 className="font-bold text-lg text-[var(--sketch-fg)]">Complete!</h4>
                  <p className="text-xs text-[var(--sketch-fg-muted)] mt-1.5">
                    Your video is ready. Preparing export screen...
                  </p>
                </div>
              ) : renderStatus?.projectStatus === "error" || renderStatus?.job?.status === "error" ? (
                <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-xl flex flex-col items-center">
                  <AlertTriangle className="w-10 h-10 text-red-600 mb-3" />
                  <h4 className="font-bold text-lg text-[var(--sketch-fg)]">Render Failed</h4>
                  <p className="text-xs text-[var(--sketch-fg-muted)] mt-1.5 max-w-sm">
                    {renderStatus?.job?.message || "An unexpected error occurred."}
                  </p>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => {
                        setShowRenderModal(false);
                        setRenderStarted(false);
                      }}
                      className="px-4 py-2 bg-[var(--sketch-fg-subtle)]/10 hover:bg-[var(--sketch-fg-subtle)]/20 text-[var(--sketch-fg)] text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Back to Editor
                    </button>
                    <button
                      onClick={() => {
                        setRenderStarted(false);
                        setTimeout(() => setRenderStarted(true), 100);
                      }}
                      className="px-4 py-2 bg-[#FBBF24] hover:bg-[#F59E0B] text-black text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 max-w-md mx-auto">
                  {renderStages.map((stage, i) => {
                    const Icon = stage.icon;
                    const currentStage = renderStatus?.job?.stage || "queued";
                    const currentStageIndex = renderStages.findIndex((s) => s.key === currentStage);
                    const isActive = i === currentStageIndex;
                    const isDone = i < currentStageIndex;

                    return (
                      <div
                        key={stage.key}
                        className={`p-3 border rounded-xl flex items-center gap-4 transition-all duration-200 ${
                          isActive
                            ? "border-[#FBBF24] bg-[#FBBF24]/5"
                            : isDone
                              ? "border-emerald-500/40 bg-emerald-500/5"
                              : "border-[var(--sketch-border-color)]/10 bg-[var(--sketch-card-bg)]/50 opacity-40"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 flex items-center justify-center border rounded-lg flex-shrink-0 ${
                            isActive
                              ? "border-[#FBBF24] bg-[#FBBF24]/10"
                              : isDone
                                ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                                : "border-[var(--sketch-border-color)]/25 bg-[var(--sketch-card-bg)]"
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                          ) : isActive ? (
                            <Loader2 className="w-4 h-4 text-[var(--sketch-fg)] animate-spin" />
                          ) : (
                            <Icon className="w-4 h-4 text-[var(--sketch-fg-muted)]" />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <span
                            className={`text-xs font-bold ${
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
                            <p className="font-mono text-[9px] text-[var(--sketch-fg-muted)] mt-0.5">
                              {renderStatus?.job?.message || "Processing..."}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */



function ToolbarToolButton({
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
      title={label}
      className={`p-1.5 hover:bg-[var(--sketch-fg-subtle)]/20 rounded text-[var(--sketch-fg)] transition-all flex items-center justify-center cursor-pointer ${
        active ? "bg-blue-100 text-[var(--sketch-accent)]" : ""
      }`}
    >
      {icon}
    </button>
  );
}

function RightTabButton({
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
      className={`w-full py-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all border-l-2 ${
        active
          ? "bg-[#FBBF24]/10 text-[var(--sketch-fg)] border-[#FBBF24]"
          : "bg-transparent text-[var(--sketch-fg-muted)] hover:text-[var(--sketch-fg)] hover:bg-[var(--sketch-fg-subtle)]/5 border-transparent"
      }`}
    >
      <div className="flex items-center justify-center">
        {icon}
      </div>
      <span className="text-[9px] font-bold tracking-normal leading-none text-center">
        {label}
      </span>
    </button>
  );
}

async function uploadFile(
  file: File,
  folder = "screenshots"
): Promise<{ key: string; url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(error.error || `Upload failed (${response.status})`);
  }

  return response.json();
}
