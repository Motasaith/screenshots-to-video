import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { motion, AnimatePresence } from "framer-motion";
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
  BadgeCheck,
  Search,
  HelpCircle,
  Undo2,
  Redo2,
  Film,
  ChevronDown,
  ImagePlus,
  Upload,
  ArrowLeft,
  Volume2,
  Play,
  Pause,
  Crown,
  AlertTriangle,
  Mic,
  Merge,
  CheckCircle,
  Wand2,
  Compass,
  Save,
  ZoomIn,
  ZoomOut,
  Maximize,
  Plus,
  Image as ImageIcon,
  Clapperboard,
  Search as SearchIcon,
  Download,
  Check,
  ChevronLeft,
  ChevronRight,
  Pencil,
  FileText,
  RotateCw,
  Menu,
  Sliders,
} from "lucide-react";
import { stepThumbUrl } from "@/lib/thumbUrl";
import { ScenePreview } from "./ScenePreview";
import OwnVoiceRecorder from "./OwnVoiceRecorder";
import { CaptureDialog } from "./CaptureDialog";
import { computeSceneTiming, estimateNarrationSeconds, MW_MIN_HOLD } from "@contracts/sceneTiming";
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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useSupportContext } from "@/components/support/supportContext";
import { applyEditorOps } from "@/lib/applyEditorOps";
import type { EditorOp } from "@contracts/editorOps";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import type { TransitionType } from "@/hooks/useWizardStore";
import Timeline, { type TimelineClip } from "@/components/wizard/Timeline";
import { startOnboardingTour } from "@/components/wizard/OnboardingTour";
import { INTRO_TEMPLATES, OUTRO_TEMPLATES, getTemplate } from "@/components/wizard/introOutroTemplates";
import { RenderPreflightDialog } from "@/components/wizard/RenderPreflightDialog";
import {
  getRenderPreflight,
  isSilentVoice,
  type RenderPreflightResult,
} from "@/components/wizard/renderPreflight";
import { detectGibberish } from "@/lib/gibberish";
import { isVideoPath } from "@/lib/mediaPath";

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
  editorHighlights?: Array<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    color?: string;
  }> | null;
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
  editorRedacts?: Array<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    color?: string;
  }> | null;
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
  editorBadges?: Array<{
    id: string;
    number: number;
    x: number;
    y: number;
    color?: string;
  }> | null;
  editorMagnifyX?: number | null;
  editorMagnifyY?: number | null;
  editorMagnifyW?: number | null;
  editorMagnifyH?: number | null;
  editorMagnifyScale?: number | null;
  editorMagnifyCorner?: string | null;
  editorColorFilter?: string | null;
  editorColorFilterStrength?: number | null;
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
    /** Narration spoken while the camera holds on this point. */
    script?: string;
    /** For video scenes: the moment in the clip this keyframe applies to. */
    atSec?: number;
  }> | null;
}

/** What each tool is called in the interface, as opposed to in the code. */
const TOOL_LABELS: Record<string, string> = {
  select: "Select",
  pan: "Pan",
  crop: "Crop",
  highlight: "Highlight",
  zoom: "Zoom",
  multizoom: "Zoom",
  overlay: "Text",
  blur: "Blur",
  redact: "Redact",
  watermark: "Watermark",
  pixelate: "Pixelate",
  spotlight: "Spotlight",
  badge: "Badge",
  magnify: "Magnify",
  filter: "Filter",
  caption: "Caption",
};

type ToolMode = "select" | "highlight" | "zoom" | "overlay" | "crop" | "blur" | "redact" | "watermark" | "pixelate" | "spotlight" | "badge" | "magnify" | "filter" | "caption" | "pan";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Where the letterboxed media actually sits inside the canvas box.
 *
 * `naturalW`/`naturalH` come back too: effects whose strength is expressed in
 * source pixels (blur sigma, pixelate block size) need the ratio between the
 * displayed size and the real one to preview at the strength they will export
 * at.
 */
function getImageBounds(container: HTMLDivElement, img: HTMLImageElement | HTMLVideoElement) {
  const cw = container.offsetWidth;
  const ch = container.offsetHeight;
  const nw = img instanceof HTMLVideoElement ? img.videoWidth : img.naturalWidth;
  const nh = img instanceof HTMLVideoElement ? img.videoHeight : img.naturalHeight;
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

  return { visibleW, visibleH, offsetX, offsetY, cw, ch, naturalW: nw, naturalH: nh };
}

/**
 * Greedy word wrap at a character budget.
 *
 * Deliberately the same algorithm as `splitTextIntoLines` in api/lib/ffmpeg.ts:
 * the canvas has to break the overlay text at exactly the points the renderer
 * will, or the preview shows a different number of lines than the video does.
 */
function splitIntoLines(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    if (!word) continue;
    if (current.length + word.length + (current.length > 0 ? 1 : 0) <= maxChars) {
      current += (current.length > 0 ? " " : "") + word;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Border width of a drawn region box, in px.
 *
 * The blur clip starts inside this border while the region's percentage
 * position is measured from outside it, so the blurred copy has to be shifted
 * back by it to stay aligned with the original underneath.
 */
const BLUR_CLIP_INSET = 2;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/* ------------------------------------------------------------------ */
/*  Shared resize handle definitions (8-directional)                  */
/* ------------------------------------------------------------------ */

/**
 * The legacy single redaction bar, as a one-entry list.
 *
 * Redaction was one rectangle per step (`editorRedactX..H`) until
 * `editorRedacts` was added. Steps saved before that still carry the scalars
 * and nothing else, so they are lifted into the array once, on load. The array
 * wins when both are present, which matches what the renderer does.
 */
function legacyToRedacts(s: {
  editorRedacts?: Array<{ id: string; x: number; y: number; w: number; h: number; color?: string }> | null;
  editorRedactX?: number | null;
  editorRedactY?: number | null;
  editorRedactW?: number | null;
  editorRedactH?: number | null;
  editorRedactColor?: string | null;
}) {
  if (s.editorRedacts && s.editorRedacts.length > 0) return s.editorRedacts;
  if (
    s.editorRedactX == null || s.editorRedactY == null ||
    !s.editorRedactW || !s.editorRedactH
  ) {
    return [];
  }
  return [{
    id: `redact-legacy-${s.editorRedactX}-${s.editorRedactY}`,
    x: s.editorRedactX,
    y: s.editorRedactY,
    w: s.editorRedactW,
    h: s.editorRedactH,
    color: s.editorRedactColor || "#000000",
  }];
}

/** The legacy single badge, as a one-entry list. See {@link legacyToRedacts}. */
function legacyToBadges(s: {
  editorBadges?: Array<{ id: string; number: number; x: number; y: number; color?: string }> | null;
  editorBadgeNumber?: number | null;
  editorBadgeX?: number | null;
  editorBadgeY?: number | null;
  editorBadgeColor?: string | null;
}) {
  if (s.editorBadges && s.editorBadges.length > 0) return s.editorBadges;
  if (s.editorBadgeNumber == null || s.editorBadgeX == null || s.editorBadgeY == null) {
    return [];
  }
  return [{
    id: `badge-legacy-${s.editorBadgeNumber}`,
    number: s.editorBadgeNumber,
    x: s.editorBadgeX,
    y: s.editorBadgeY,
    color: s.editorBadgeColor || "#FBBF24",
  }];
}

/**
 * Replacing a step's zoom points.
 *
 * Placing a point writes three things, not one: the point itself, the legacy
 * `zoomTargetX`/`Y` that the single-zoom render path reads, and
 * `editorZoomScale`, which is what arms zoom at all. Removing points only ever
 * emptied the array, so the other two survived - and with an empty array the
 * worker skips the multi-zoom path and falls through to exactly that
 * single-zoom fallback. The scene kept zooming after every point had been
 * deleted, which is the "zoom persists after clearing" report.
 *
 * Emptying the list therefore has to disarm the fallback too. That is what the
 * toolbar's own "Clear Zoom" has always done; this is the same reset, shared so
 * the three places that remove points cannot disagree again.
 */
function withZoomPoints(
  ann: StepAnnotation | undefined,
  points: NonNullable<StepAnnotation["editorMultiZooms"]>
): StepAnnotation {
  const base = ann || {};
  if (points.length > 0) return { ...base, editorMultiZooms: points };
  return {
    ...base,
    editorMultiZooms: [],
    zoomTargetX: null,
    zoomTargetY: null,
    zoomRectX: null,
    zoomRectY: null,
    zoomRectWidth: null,
    zoomRectHeight: null,
    editorZoomScale: null,
  };
}

/**
 * Applying a censorship strength to a step.
 *
 * Each region stores its own `intensity` / `blockSize`, baked in when it was
 * drawn, and both the canvas preview and the FFmpeg filter read the region's
 * value in preference to the step-level default:
 *
 *     blur(${region.intensity ?? ann.editorBlurIntensity ?? 20}px)
 *
 * So a slider that only wrote the step default changed a number nothing looked
 * at once a region existed, and appeared dead. The fix for that went the other
 * way and wrote every region at once, which meant raising the block size on one
 * pixelated area coarsened every other area on the same scene. That is the bug
 * these now close.
 *
 * `targetId` is the region the panel is editing. With one, only that region
 * moves. Without one - nothing drawn yet - the value becomes the step default,
 * which is what the next region drawn will be created with.
 */
/**
 * One zoom depth for a whole scene.
 *
 * Written to every waypoint AND to `editorZoomScale`, because the two do
 * different jobs: the step-level value is what arms zoom at all in the worker,
 * and the per-waypoint values are what `computeWaypointCamera` reduces with
 * `Math.max` to decide the actual depth. Keeping them equal means the number
 * shown is the number rendered, whichever path the scene takes.
 */
function withSceneZoomScale(
  ann: StepAnnotation | undefined,
  scale: number
): StepAnnotation {
  const base = ann || {};
  return {
    ...base,
    editorZoomScale: scale,
    editorMultiZooms: (base.editorMultiZooms || []).map((z) => ({ ...z, zoomScale: scale })),
  };
}

function withBlurIntensity(
  ann: StepAnnotation | undefined,
  intensity: number,
  targetId?: string | null
): StepAnnotation {
  const base = ann || {};
  const regions = base.editorBlurs || [];
  if (targetId && regions.some((r) => r.id === targetId)) {
    return {
      ...base,
      editorBlurs: regions.map((r) => (r.id === targetId ? { ...r, intensity } : r)),
    };
  }
  return { ...base, editorBlurIntensity: intensity };
}

function withPixelateBlockSize(
  ann: StepAnnotation | undefined,
  blockSize: number,
  targetId?: string | null
): StepAnnotation {
  const base = ann || {};
  const regions = base.editorPixelates || [];
  if (targetId && regions.some((r) => r.id === targetId)) {
    return {
      ...base,
      editorPixelates: regions.map((r) => (r.id === targetId ? { ...r, blockSize } : r)),
    };
  }
  return { ...base, editorPixelateBlockSize: blockSize };
}

function withSpotlightIntensity(
  ann: StepAnnotation | undefined,
  intensity: number,
  targetId?: string | null
): StepAnnotation {
  const base = ann || {};
  const regions = base.editorSpotlights || [];
  if (targetId && regions.some((r) => r.id === targetId)) {
    return {
      ...base,
      editorSpotlights: regions.map((r) => (r.id === targetId ? { ...r, intensity } : r)),
    };
  }
  return { ...base, editorSpotlightIntensity: intensity };
}

/**
 * CSS `filter` for the canvas preview, scaled by the step's filter strength.
 *
 * Percentages are interpolated from the identity value rather than just
 * multiplied: `contrast` and `saturate` are neutral at 100%, not 0%, so
 * scaling those naively would fade the picture to grey instead of fading the
 * effect out. Kept in one place because the <video> and <img> branches of the
 * canvas both need it and had drifted into two copies of the same ternary.
 */
function colorFilterCss(filter: string | null | undefined, strength: number | null | undefined): string {
  if (!filter || filter === "none") return "none";
  const t = Math.max(0, Math.min(100, strength ?? 100)) / 100;
  if (t === 0) return "none";
  const lerp = (from: number, to: number) => from + (to - from) * t;
  switch (filter) {
    case "grayscale":
      return `grayscale(${(t * 100).toFixed(0)}%)`;
    case "sepia":
      return `sepia(${(t * 100).toFixed(0)}%)`;
    case "warm":
      return `sepia(${(t * 50).toFixed(0)}%) saturate(${lerp(100, 140).toFixed(0)}%)`;
    case "cool":
      return `hue-rotate(${(t * 180).toFixed(0)}deg) saturate(${lerp(100, 80).toFixed(0)}%)`;
    case "contrast":
      return `contrast(${lerp(100, 150).toFixed(0)}%) saturate(${lerp(100, 120).toFixed(0)}%)`;
    default:
      return "none";
  }
}

/** True when a drag carries media the canvas can accept. */
function dragCarriesMedia(e: React.DragEvent): boolean {
  const types = e.dataTransfer?.types;
  if (!types) return false;
  return types.includes("Files") || types.includes("application/x-pexels-media");
}

/**
 * Scene description cap.
 *
 * Matches `description: z.string().max(500)` on api/stepRouter.ts. Without a
 * limit in the field, an over-long description was only rejected once the save
 * fired, after the text had been typed.
 *
 * The narration script is deliberately uncapped: its length is dictated by how
 * long the scene needs to be spoken for, and TTS handles long passages fine.
 */
/**
 * Greedy word wrap, mirroring `splitTextIntoLines` in api/lib/ffmpeg.ts.
 *
 * The renderer emits one `drawtext` per line, each enabled for its own slice of
 * the narration, so at any instant the video shows a single line. The preview
 * used to print the whole narration script at once, which on a vertical frame
 * filled the picture and made a correctly configured caption look broken.
 */
function firstCaptionLine(text: string, maxChars: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars) break;
    line = candidate;
  }
  // A single word longer than the limit still has to show something.
  return line || words[0] || "";
}

const SCENE_DESC_MAX = 500;

const RESIZE_HANDLES = [
  { name: "nw", style: { top: "-6px", left: "-6px", cursor: "nwse-resize" } },
  { name: "n", style: { top: "-6px", left: "50%", transform: "translateX(-50%)", cursor: "ns-resize" } },
  { name: "ne", style: { top: "-6px", right: "-6px", cursor: "nesw-resize" } },
  { name: "e", style: { top: "50%", right: "-6px", transform: "translateY(-50%)", cursor: "ew-resize" } },
  { name: "se", style: { bottom: "-6px", right: "-6px", cursor: "nwse-resize" } },
  { name: "s", style: { bottom: "-6px", left: "50%", transform: "translateX(-50%)", cursor: "ns-resize" } },
  { name: "sw", style: { bottom: "-6px", left: "-6px", cursor: "nesw-resize" } },
  { name: "w", style: { top: "50%", left: "-6px", transform: "translateY(-50%)", cursor: "ew-resize" } },
] as const;

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
  /**
   * Reopen the guided "what should we point at?" pass.
   *
   * Offered from the timeline so it is reachable for any project at any time,
   * not only in the moments after an import.
   */
  onOpenFraming?: () => void;
  /** Navigation handlers and states */
  onBack?: () => void;
  onContinue?: (options?: EditorExportOptions) => void;
  isSaving?: boolean;
  focusPanel?: "script" | "voiceover";
  focusScriptMode?: "ai" | "manual";
}

export interface EditorExportOptions {
  allowSilent?: boolean;
  captionsEnabled?: boolean;
}

const transitionTypes: { value: TransitionType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "fade", label: "Fade" },
  { value: "slide-left", label: "Slide Left" },
  { value: "slide-right", label: "Slide Right" },
  { value: "slide-up", label: "Slide Up" },
  { value: "flip", label: "Flip" },
  { value: "dissolve", label: "Dissolve" },
];

const voices = [
  { id: "none", name: "None (No Voiceover)", accent: "-", gender: "-", tag: "Mute" },
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

  const { data: project, isLoading } = trpc.project.getById.useQuery(
    { id: projectIdNum },
    { enabled: projectIdNum > 0 }
  );

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [annotations, setAnnotations] = useState<Record<number, StepAnnotation>>({});
  const [mode, setMode] = useState<ToolMode>("pan");

  const steps = project?.steps || [];

  // Convert steps to TimelineClip[]
  const timelineClips: TimelineClip[] = useMemo(() => {
    return steps.map((s) => ({
      id: s.id,
      order: s.order,
      name: s.description || `Scene ${s.order}`,
      thumbnail: stepThumbUrl(s.id, s.screenshotPath, 192) ?? s.screenshotPath,
      duration: (s as any).editorDuration ?? 5.0,
      transition: s.transition,
      isVideo: s.screenshotPath?.includes(".mp4") || 
               s.screenshotPath?.includes("video") ||
               s.screenshotPath?.endsWith("#video"),
      audioPath: s.audioPath,
    }));
  }, [steps]);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [activeTab, setActiveTab] = useState("select");

  const [canvasScale, setCanvasScale] = useState(1.0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panScrollRef = useRef<{ left: number; top: number }>({ left: 0, top: 0 });

  // Google Vids replica states
  const [activeRightTab, setActiveRightTab] = useState<"properties" | "script" | "voiceover" | "elevenlabs" | "captions" | "transitions" | "safety" | "help" | "media" | "introoutro" | null>("properties");
  const [activeTransitionClipId, setActiveTransitionClipId] = useState<number | null>(null);
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
  const [projectTitle, setProjectTitle] = useState("Untitled video");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Sidebar resize state (CSS-based, replaces PanelGroup for horizontal split)
  const [sidebarWidth, setSidebarWidth] = useState(320); // px
  const sidebarResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!sidebarResizeRef.current) return;
      const delta = sidebarResizeRef.current.startX - e.clientX;
      const newWidth = Math.max(240, Math.min(800, sidebarResizeRef.current.startWidth + delta));
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => { sidebarResizeRef.current = null; document.body.style.cursor = ""; document.body.style.userSelect = ""; };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, []);



  const handleSidebarResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    sidebarResizeRef.current = { startX: e.clientX, startWidth: sidebarWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };


  /**
   * Which drawn region the properties panel is editing.
   *
   * Blur, pixelate and spotlight each store their strength per region, but the
   * panel had a single slider and no notion of a target, so it wrote the new
   * value to every region on the step at once: raising the block size on one
   * pixelated area coarsened all of them. The slider now edits whatever is
   * selected here, and a region is selected by drawing it or by clicking it on
   * the canvas.
   */
  const [selectedRegion, setSelectedRegion] = useState<{
    kind: "blur" | "pixelate" | "spotlight" | "redact" | "badge" | "highlight";
    id: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFilesCount, setUploadingFilesCount] = useState(0);
  // Drag depth, not a boolean: dragging over child elements fires
  // dragenter/dragleave pairs constantly, and a plain flag flickers.
  const [canvasDragDepth, setCanvasDragDepth] = useState(0);

  const [history, setHistory] = useState<Record<number, StepAnnotation>[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  /** Open state for the free, client-side scene preview. */
  const [showScenePreview, setShowScenePreview] = useState(false);
  const [isApplyingCrop, setIsApplyingCrop] = useState(false);
  const [bumperUploading, setBumperUploading] = useState<"intro" | "outro" | null>(null);
  const [captureMode, setCaptureMode] = useState<"camera" | null>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);

  /**
   * Add a captured photo or recording to the timeline as a new scene.
   *
   * Recordings are marked "#video" so the renderer takes the footage path
   * rather than compositing a single frame from them.
   */
  const handleCaptured = async (file: File, kind: "image" | "video") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "screenshots");

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({ error: "Upload failed" }));
      throw new Error(e.error || `Upload failed (${res.status})`);
    }
    const { key } = (await res.json()) as { key: string };

    await createStep.mutateAsync({
      projectId: projectIdNum,
      order: (steps.length || (props.parentSteps || []).length) + 1,
      description: kind === "video" ? "Screen recording" : "Camera photo",
      screenshotPath: kind === "video" ? `${key}#video` : key,
    });
    await utils.project.getById.invalidate({ id: projectIdNum });
    toast.success(kind === "video" ? "Recording added to the timeline" : "Photo added to the timeline");
  };

  /**
   * Store a custom intro/outro clip.
   *
   * The renderer has always read `introVideoPath`/`outroVideoPath`; nothing ever
   * wrote them, so picking "custom video" silently did nothing. Images are
   * allowed as well as video: the renderer holds a still for the configured
   * duration.
   */
  const handleBumperUpload = async (kind: "intro" | "outro", file: File) => {
    setBumperUploading(kind);
    try {
      const isVideo = file.type.startsWith("video/");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "bumpers");

      // Videos must not go through the image compressor, so this posts directly
      // rather than reusing uploadFile().
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(e.error || `Upload failed (${res.status})`);
      }
      const { key } = (await res.json()) as { key: string };

      await updateProject.mutateAsync({
        id: projectIdNum,
        ...(kind === "intro" ? { introVideoPath: key } : { outroVideoPath: key }),
      });
      await utils.project.getById.invalidate({ id: projectIdNum });
      toast.success(`${kind === "intro" ? "Intro" : "Outro"} ${isVideo ? "video" : "image"} saved`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBumperUploading(null);
    }
  };

  const handleBumperClear = async (kind: "intro" | "outro") => {
    try {
      await updateProject.mutateAsync({
        id: projectIdNum,
        ...(kind === "intro" ? { introVideoPath: "" } : { outroVideoPath: "" }),
      });
      await utils.project.getById.invalidate({ id: projectIdNum });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not remove it");
    }
  };

  /** Autosave state, surfaced in the toolbar and guarded on unload. */
  const [saveState, setSaveState] = useState<"idle" | "dirty" | "saving" | "saved" | "error">("idle");
  /** Serialized annotation last written to the server, to detect real changes. */
  const lastSavedSnapshot = useRef<string>("");
  const [dragItem, setDragItem] = useState<{
    type: "overlay" | "badge" | "magnify" | "zoomTarget" | "zoomRect" | "blur" | "redact" | "pixelate" | "spotlight" | "multizoom" | "crop" | "blurArr" | "pixelateArr" | "spotlightArr" | "highlightArr" | "redactArr" | "badgeArr";
    id?: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialW?: number;
    initialH?: number;
  } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | HTMLVideoElement>(null);
  const handleResizeRef = useRef<string | null>(null);

  /**
   * Whether the canvas is actually bigger than its window.
   *
   * Pan scrolls the container, and the container only scrolls when the content
   * overflows it. At the default fit scale the canvas is sized to exactly fill
   * the window, so `scrollLeft = x` does nothing at all: the Pan tool activates,
   * the cursor changes, dragging does nothing, and nothing says why. That is the
   * "I press space and cannot move even a little" report.
   */
  const [canPan, setCanPan] = useState(false);

  const [bounds, setBounds] = useState<{
    visibleW: number;
    visibleH: number;
    offsetX: number;
    offsetY: number;
    naturalW: number;
    naturalH: number;
  } | null>(null);

  const updateBounds = useCallback(() => {
    if (canvasRef.current && imageRef.current) {
      const b = getImageBounds(canvasRef.current, imageRef.current as HTMLImageElement | HTMLVideoElement);
      setBounds(b);
    }
    const sc = scrollContainerRef.current;
    if (sc) {
      // A pixel of slack: sub-pixel layout rounding otherwise reports a scroll
      // range of 0.5px on a canvas that visibly fits.
      setCanPan(
        sc.scrollWidth - sc.clientWidth > 1 || sc.scrollHeight - sc.clientHeight > 1
      );
    }
  }, []);



  const updateProject = trpc.project.update.useMutation();
  const updateStep = trpc.step.update.useMutation();
  const createStep = trpc.step.create.useMutation();
  const deleteStep = trpc.step.delete.useMutation();
  const reorderSteps = trpc.step.reorder.useMutation();
  const checkSafety = trpc.step.checkSafety.useMutation();
  const generateScript = trpc.ai.generateScript.useMutation();
  const importPexelsMedia = trpc.ai.importMedia.useMutation();
  const utils = trpc.useUtils();

  // Voiceover states
  const [testVoiceText, setTestVoiceText] = useState("");

  // Safety check state
  const [safetyResult, setSafetyResult] = useState<{ isSafe: boolean; isClear: boolean; reason: string } | null>(null);

  // Voice selection states
  const [selectedVoice, setSelectedVoice] = useState("en-US-AndrewMultilingualNeural");
  const [savedVoice, setSavedVoice] = useState<string | null>(null);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useState(() => new Audio())[0];

  // ── Intro/Outro Content ──
  const [introOutroMode, setIntroOutroMode] = useState<"intro" | "outro">("intro");
  const [introTemplate, setIntroTemplate] = useState<string | null>(null);
  const [introText, setIntroText] = useState("");
  const [introDuration, setIntroDuration] = useState(3.0);
  const [outroTemplate, setOutroTemplate] = useState<string | null>(null);
  const [outroText, setOutroText] = useState("");
  const [outroDuration, setOutroDuration] = useState(3.0);

  const previewVoice = trpc.ai.previewVoice.useMutation();
  const credits = trpc.ai.elevenLabsCredits.useQuery(undefined, {
    enabled: activeRightTab === "elevenlabs",
    refetchInterval: 30_000,
  });

  // ── Bring-your-own-key (ElevenLabs premium voices) ──
  const elevenLabsKeyStatus = trpc.settings.elevenLabsKeyStatus.useQuery(undefined, {
    enabled: activeRightTab === "elevenlabs",
  });
  const hasElevenLabsKey = elevenLabsKeyStatus.data?.hasKey ?? false;
  const [elevenLabsKeyInput, setElevenLabsKeyInput] = useState("");
  const saveElevenLabsKey = trpc.settings.setElevenLabsKey.useMutation();
  const removeElevenLabsKey = trpc.settings.removeElevenLabsKey.useMutation();

  const handleSaveElevenLabsKey = () => {
    const apiKey = elevenLabsKeyInput.trim();
    if (apiKey.length < 8) {
      toast.error("Paste your full ElevenLabs API key.");
      return;
    }
    saveElevenLabsKey.mutate(
      { apiKey },
      {
        onSuccess: () => {
          setElevenLabsKeyInput("");
          elevenLabsKeyStatus.refetch();
          credits.refetch();
          toast.success("ElevenLabs key saved. Premium voices are unlocked.");
        },
        onError: (err) => toast.error(err.message || "Could not validate that key."),
      },
    );
  };

  const handleRemoveElevenLabsKey = () => {
    removeElevenLabsKey.mutate(undefined, {
      onSuccess: () => {
        elevenLabsKeyStatus.refetch();
        credits.refetch();
        toast.info("ElevenLabs key removed. Premium voices will use free Edge TTS.");
      },
      onError: (err) => toast.error(err.message || "Could not remove key."),
    });
  };

  const handlePlayPreview = async (e: React.MouseEvent, voiceId: string) => {
    e.stopPropagation();

    if (voiceId === "none") {
      toast.info("No audio preview for 'None (No Voiceover)' option.");
      return;
    }

    if (voiceId.startsWith("elevenlabs:") && !hasElevenLabsKey) {
      toast.info("Add your ElevenLabs API key above to preview premium voices.");
      return;
    }

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

      // The server substitutes a similar standard voice when the requested
      // engine is unavailable. Saying so beats letting someone conclude the
      // previews are simply broken.
      if (res.substituted) {
        const label = voices.find((v) => v.id === voiceId)?.name
          ?? elevenLabsVoices.find((v) => v.id === voiceId)?.name
          ?? "That voice";
        toast.info(`${label} is unavailable right now. Playing the closest standard voice instead.`);
      }
    } catch (err) {
      console.error("Preview failed:", err);
    } finally {
      setPreviewLoadingId(null);
    }
  };

  useEffect(() => {
    if (project) {
      const nextVoice = project.voice?.trim() || null;
      setSavedVoice(nextVoice);
      if (nextVoice) {
        setSelectedVoice(nextVoice);
      }
    }
    if (project?.speed) {
      setVoiceSpeed(project.speed);
    }
    if (project) {
      setIntroTemplate(project.introTemplate || "none");
      setIntroText(project.introText || "");
      setIntroDuration(project.introDuration || 3.0);
      setOutroTemplate(project.outroTemplate || "none");
      setOutroText(project.outroText || "");
      setOutroDuration(project.outroDuration || 3.0);
    }
  }, [project]);

  // Autosave project settings (intro/outro) to backend
  useEffect(() => {
    if (projectIdNum <= 0 || !project) return;
    const timer = setTimeout(() => {
      if (
        introTemplate !== project.introTemplate ||
        introText !== project.introText ||
        introDuration !== project.introDuration ||
        outroTemplate !== project.outroTemplate ||
        outroText !== project.outroText ||
        outroDuration !== project.outroDuration
      ) {
        updateProject.mutate({
          id: projectIdNum,
          introTemplate: introTemplate || "none",
          introText,
          introDuration,
          outroTemplate: outroTemplate || "none",
          outroText,
          outroDuration,
        });
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [introTemplate, introText, introDuration, outroTemplate, outroText, outroDuration, projectIdNum, project]);

  // Render Popup Modal states
  const [showRenderModal, setShowRenderModal] = useState(false);
  const [deleteSceneIdx, setDeleteSceneIdx] = useState<number | null>(null);
  const [renderStarted, setRenderStarted] = useState(false);
  const [startRenderError, setStartRenderError] = useState<string | null>(null);
  const [showRenderPreflight, setShowRenderPreflight] = useState(false);
  const [isPreparingExport, setIsPreparingExport] = useState(false);
  const [renderPreflight, setRenderPreflight] =
    useState<RenderPreflightResult>(() => getRenderPreflight([], null));

  const startRender = trpc.render.start.useMutation();

  // The job this modal is following. On a second render of an already finished
  // project, `render.status` keeps reporting the previous job as complete
  // until the worker picks the new one up, so progress has to be judged
  // against a specific job id rather than against the project's status flag.
  const [renderJobId, setRenderJobId] = useState<number | null>(null);

  const { data: renderStatus } = trpc.render.status.useQuery(
    { projectId: projectIdNum },
    {
      enabled: projectIdNum > 0 && renderStarted && showRenderModal,
      refetchInterval: 3000,
      staleTime: 0,
      refetchOnMount: "always",
    }
  );

  const isCurrentRenderJob = renderJobId != null && renderStatus?.job?.id === renderJobId;
  const renderIsComplete = isCurrentRenderJob && renderStatus?.job?.status === "complete";
  const renderIsError = isCurrentRenderJob && renderStatus?.job?.status === "error";

  // Trigger render on dialog open
  useEffect(() => {
    if (!(showRenderModal && renderStarted && projectIdNum > 0)) return;
    setStartRenderError(null);
    setRenderJobId(null);

    // Clear the previous run's status first. Without this the query resolves
    // from cache the instant it is enabled, reports "complete", and the modal
    // jumps to export before this render has been queued.
    utils.render.status.reset({ projectId: projectIdNum });

    startRender
      .mutateAsync({ projectId: projectIdNum })
      .then((res) => setRenderJobId(res.jobId ?? null))
      .catch((err) => {
        setStartRenderError(err.message || "Failed to start render");
      });
  }, [showRenderModal, renderStarted, projectIdNum]);

  // Navigate to export when this render finishes
  useEffect(() => {
    if (!(showRenderModal && renderIsComplete)) return;
    const timer = setTimeout(() => {
      setShowRenderModal(false);
      // A full page load, so the export screen starts from empty caches.
      window.location.href = `/create/${projectIdNum}/export`;
    }, 1500);
    return () => clearTimeout(timer);
  }, [showRenderModal, renderIsComplete, projectIdNum]);

  useEffect(() => {
    if (project?.title) {
      setProjectTitle(project.title);
    }
  }, [project?.title]);

  const currentStep = steps[currentStepIndex];

  // Latest annotations, for callbacks handed to the support widget. Reading
  // state directly there would capture a stale snapshot.
  const annotationsRef = useRef<Record<number, StepAnnotation>>({});
  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

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

  // Refs to avoid stale closures in global event handlers
  const modeRef = useRef(mode);
  const currentStepRef = useRef(currentStep);
  const handleUndoRef = useRef(handleUndo);
  const handleRedoRef = useRef(handleRedo);
  const historyIndexRef = useRef(historyIndex);
  const pushHistoryRef = useRef(pushHistory);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    pushHistoryRef.current = pushHistory;
  }, [pushHistory]);

  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  useEffect(() => {
    handleUndoRef.current = handleUndo;
    handleRedoRef.current = handleRedo;
    historyIndexRef.current = historyIndex;
  }, [handleUndo, handleRedo, historyIndex]);

  /*
   * Tool keyboard shortcuts are removed for now.
   *
   * They were reported as unreliable and one of them - C for crop - was
   * corrupting the undo history by calling setState from inside a state
   * updater. Rather than leave hints on every tool for keys that may or may not
   * fire, the whole handler is gone until it can be built and tested properly.
   * The tools themselves are unchanged and every one of them is reachable from
   * the toolbar.
   *
   * Bringing them back means restoring a window keydown/keyup listener that
   * maps keys onto setMode, reading current values through refs rather than
   * closing over them, guarding `e.repeat`, and calling preventDefault only for
   * keys actually handled. See git history for the previous shape.
   */

  /**
   * Add scenes from a file selection.
   *
   * `insertAtIndex` puts them at a position in the timeline instead of the end.
   * The scenes are still created at the end first and then moved, because the
   * order is a column on every row: inserting in the middle means renumbering
   * everything after it either way, and `step.reorder` already does that in one
   * call rather than one per scene.
   */
  const handleUploadFiles = async (files: FileList, insertAtIndex?: number | null) => {
    if (files.length === 0) return;
    setUploadingFilesCount(prev => prev + files.length);

    const sortedFiles = Array.from(files).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    // Captured before anything is created: the ids the new scenes are being
    // slotted between.
    const existingIds = steps.map((s) => s.id);
    const createdIds: number[] = [];

    let currentOrder = (steps.length || (props.parentSteps || []).length) + 1;

    // Upload first, then create the step from the storage key it returns.
    //
    // This used to go the other way round for an instant preview: create the
    // step with `URL.createObjectURL(file)` as its screenshotPath, then patch
    // in the real key once the upload landed. step.create refuses a `blob:`
    // URL — isStorableMediaRef only accepts a storage key — so the create threw
    // on every file, the catch logged and moved on, and the scene never
    // appeared. All the user saw was "Uploading n..." counting down to nothing.
    for (const file of sortedFiles) {
      const isVideoFile = file.type.startsWith("video/");
      const order = currentOrder++;

      try {
        const result = await uploadFile(file, `projects/${projectIdNum}/screenshots`);

        // The storage key, not the signed URL from the response: signed URLs
        // expire, and project.getById mints a fresh one from the key on read.
        const created = await createStep.mutateAsync({
          projectId: projectIdNum,
          order,
          description: "",
          screenshotPath: result.key + (isVideoFile ? "#video" : ""),
        });
        if (created?.id) createdIds.push(created.id);

        utils.project.getById.invalidate({ id: projectIdNum });
        utils.step.listByProject.invalidate({ projectId: projectIdNum });
      } catch (err) {
        console.error("Failed to add screenshot:", err);
        toast.error(
          `Could not add ${file.name}: ${err instanceof Error ? err.message : "upload failed"}`
        );
      } finally {
        setUploadingFilesCount(prev => Math.max(0, prev - 1));
      }

      // Paced like the homepage importer: both /api/upload and step.create are
      // rate limited to 60/minute, and a tight loop over a folder trips them.
      if (file !== sortedFiles[sortedFiles.length - 1]) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    // Slot them in, if a position was asked for. Anything that failed to upload
    // is simply absent from createdIds, so a partial batch still lands in one
    // block where the user pointed rather than scattering.
    if (insertAtIndex != null && createdIds.length > 0) {
      const next = [...existingIds];
      next.splice(Math.max(0, Math.min(insertAtIndex, existingIds.length)), 0, ...createdIds);
      try {
        await reorderSteps.mutateAsync({ projectId: projectIdNum, stepIds: next });
        setCurrentStepIndex(Math.max(0, Math.min(insertAtIndex, next.length - 1)));
      } catch (err) {
        // The scenes exist; only their position is wrong, so say that rather
        // than implying the upload failed.
        console.error("Failed to position the new scenes:", err);
        toast.error("Added the scenes, but could not move them into position.");
      }
      utils.project.getById.invalidate({ id: projectIdNum });
      utils.step.listByProject.invalidate({ projectId: projectIdNum });
    }
  };

  // ── NLE Timeline handlers ──



  /**
   * Move a scene to a new position in the timeline.
   *
   * Two things used to make this crawl. It awaited one `step.update` per scene,
   * serially, for every scene rather than the handful that actually moved; and
   * the timeline strip has no ordering state of its own, so nothing on screen
   * budged until all of those landed and two queries refetched. On a 112-scene
   * project that was ~13s of dead time, and it exceeded `step.update`'s
   * 30-per-minute limit part way through, leaving the order half-written.
   *
   * Now the cache moves first so the strip follows the cursor, and the whole
   * list goes to `step.reorder` in one call. On failure the snapshot goes back,
   * so a rejected reorder cannot leave the editor showing an order the server
   * never accepted.
   */
  const handleTimelineReorder = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const stepList = [...steps];
    const [draggedItem] = stepList.splice(fromIndex, 1);
    if (!draggedItem) return;
    stepList.splice(toIndex, 0, draggedItem);

    const previous = utils.project.getById.getData({ id: projectIdNum });
    utils.project.getById.setData({ id: projectIdNum }, (old) =>
      old ? { ...old, steps: stepList.map((s, i) => ({ ...s, order: i + 1 })) } : old
    );
    // The scene being edited moves with the drag rather than staying on
    // whatever now occupies its old index.
    setCurrentStepIndex((idx) => (idx === fromIndex ? toIndex : idx));

    try {
      await reorderSteps.mutateAsync({
        projectId: projectIdNum,
        stepIds: stepList.map((s) => s.id),
      });
      utils.step.listByProject.invalidate({ projectId: projectIdNum });
      utils.project.getById.invalidate({ id: projectIdNum });
    } catch (err) {
      utils.project.getById.setData({ id: projectIdNum }, previous);
      setCurrentStepIndex((idx) => (idx === toIndex ? fromIndex : idx));
      toast.error(err instanceof Error ? err.message : "Could not reorder the scenes.");
    }
  };

  // Trim clip (change duration)
  const handleTimelineTrim = async (index: number, newDuration: number) => {
    const step = steps[index];
    if (!step) return;
    await updateStep.mutateAsync({ id: step.id, editorDuration: newDuration });
    utils.project.getById.invalidate({ id: projectIdNum });
  };

  // Delete clip via timeline
  const handleTimelineDelete = (index: number) => {
    setDeleteSceneIdx(index);
  };

  // Add clip via timeline
  /**
   * Where a pending file selection should be inserted.
   *
   * A ref, not state: it is set immediately before opening the file dialog and
   * read when it closes, and nothing renders from it.
   */
  const insertAtIndexRef = useRef<number | null>(null);

  const handleTimelineAdd = (atIndex?: number) => {
    insertAtIndexRef.current = atIndex ?? null;
    fileInputRef.current?.click();
  };


  const [tempDesc, setTempDesc] = useState("");
  const [tempScript, setTempScript] = useState("");
  const [scriptViewMode] = useState<"current" | "all">("all");
  const [allSceneTexts, setAllSceneTexts] = useState<Record<number, { desc: string; script: string }>>({});

  /**
   * Scenes whose text the user has typed into, and which the server must not
   * overwrite.
   *
   * A ref, not state: it gates an effect and nothing renders from it.
   */
  const editedScenesRef = useRef<Set<number>>(new Set());

  /**
   * Keep the script panel in step with the server.
   *
   * This used to write a scene's text only `if (!next[s.id])` - that is, only
   * when the panel had never heard of the scene. The intent was to protect
   * half-typed edits from a refetch, but the guard was on presence rather than
   * on editing, so an entry created as `{ desc: "", script: "" }` on mount was
   * frozen empty forever.
   *
   * That is why generated narration never appeared: the editor mounts with
   * blank scripts, generation finishes and invalidates, the refetch arrives
   * with the scripts in it, and this effect skipped every scene because each
   * one already had an entry. Now only scenes the user has actually typed into
   * are protected.
   */
  useEffect(() => {
    if (!project?.steps) return;
    setAllSceneTexts((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const s of project.steps) {
        if (editedScenesRef.current.has(s.id)) continue;
        const incoming = {
          desc: s.description || "",
          script: s.userEditedScript ?? s.aiScript ?? "",
        };
        const current = next[s.id];
        if (!current || current.desc !== incoming.desc || current.script !== incoming.script) {
          next[s.id] = incoming;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [project?.steps]);

  useEffect(() => {
    if (currentStep) {
      setTempDesc(currentStep.description || "");
      setTempScript(currentStep.userEditedScript ?? currentStep.aiScript ?? "");
    }
  }, [
    currentStepIndex, 
    currentStep?.id, 
    currentStep?.description, 
    currentStep?.aiScript, 
    currentStep?.userEditedScript
  ]);

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
    if (mode === "highlight") {
      setActiveTab("highlight");
    } else if (mode === "zoom") {
      setActiveTab("multizoom");
    } else {
      setActiveTab(mode);
    }
  }, [mode]);

  useEffect(() => {
    // Use rAF to ensure bounds are calculated after the browser applies the new scale
    const rafId = requestAnimationFrame(() => updateBounds());
    window.addEventListener("resize", updateBounds);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateBounds);
    };
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
        nextScale = Math.max(0.2, currentScale / zoomFactor);
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

    let initialDistance = 0;
    let initialScale = 1.0;

    const getTouchDistance = (touches: TouchList) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initialDistance = getTouchDistance(e.touches);
        initialScale = canvasScaleRef.current;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDistance > 10) {
        e.preventDefault();

        const currentDistance = getTouchDistance(e.touches);
        const ratio = currentDistance / initialDistance;
        let nextScale = initialScale * ratio;
        nextScale = Math.max(0.2, Math.min(3.0, nextScale));

        const currentScale = canvasScaleRef.current;
        if (nextScale === currentScale) return;

        const containerRect = container.getBoundingClientRect();
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - containerRect.left;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - containerRect.top;

        const scrollLeft = container.scrollLeft;
        const scrollTop = container.scrollTop;

        const scaleRatio = nextScale / currentScale;
        const newScrollLeft = (scrollLeft + midX) * scaleRatio - midX;
        const newScrollTop = (scrollTop + midY) * scaleRatio - midY;

        targetScrollRef.current = { left: newScrollLeft, top: newScrollTop };
        setCanvasScale(nextScale);
      }
    };

    container.addEventListener("wheel", handleWheelNative, { passive: false });
    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheelNative);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
    };
  }, [currentStep?.id, isLoading]);

  /* Load existing annotations */
  // Sync project step data into local annotation state. Only runs when the set
  // of step IDs changes (initial load / step created / step deleted): NOT on
  // every project refetch, which would clobber in-flight edits.
  const loadedStepSignatureRef = useRef<string>("");
  useEffect(() => {
    if (project?.steps) {
      const signature = project.steps.map((s) => s.id).join(",");
      if (signature === loadedStepSignatureRef.current) return;
      loadedStepSignatureRef.current = signature;
      const initial: Record<number, StepAnnotation> = {};
      project.steps.forEach((s) => {
        initial[s.id] = {
          zoomTargetX: s.zoomTargetX,
          zoomTargetY: s.zoomTargetY,
          zoomRectX: s.zoomRectX,
          zoomRectY: s.zoomRectY,
          zoomRectWidth: s.zoomRectWidth,
          zoomRectHeight: s.zoomRectHeight,
          editorHighlights: (s as any).editorHighlights || [],
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
          // Nulled, not copied: `legacyToRedacts` has already lifted whatever
          // was here into `editorRedacts`, and the renderer falls back to these
          // scalars whenever the array is empty. Leaving them populated would
          // mean "clear all redactions" wiped the list and then rendered the
          // old bar straight back from the fallback. The colour survives as the
          // default for newly drawn bars.
          editorRedactX: null,
          editorRedactY: null,
          editorRedactW: null,
          editorRedactH: null,
          editorRedactColor: s.editorRedactColor,
          editorRedacts: legacyToRedacts(s),
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
          // Same as the redaction scalars above: migrated into `editorBadges`,
          // then cleared so the fallback cannot bring the old badge back.
          editorBadgeNumber: null,
          editorBadgeX: null,
          editorBadgeY: null,
          editorBadgeColor: s.editorBadgeColor,
          editorBadges: legacyToBadges(s),
          editorMagnifyX: s.editorMagnifyX,
          editorMagnifyY: s.editorMagnifyY,
          editorMagnifyW: s.editorMagnifyW,
          editorMagnifyH: s.editorMagnifyH,
          editorMagnifyScale: s.editorMagnifyScale ?? 2,
          editorMagnifyCorner: s.editorMagnifyCorner,
          editorColorFilter: s.editorColorFilter,
          editorColorFilterStrength: s.editorColorFilterStrength ?? 100,
          editorZoomScale: s.editorZoomScale ?? null,
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
  const getCanvasCoords = useCallback((e: React.MouseEvent | MouseEvent | React.TouchEvent | TouchEvent) => {
    if (!canvasRef.current) return null;
    const container = canvasRef.current;
    const img = imageRef.current;
    const containerRect = container.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ("changedTouches" in e && e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else {
        return null;
      }
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    if (img) {
      const nw = img instanceof HTMLVideoElement ? img.videoWidth : img.naturalWidth;
      const nh = img instanceof HTMLVideoElement ? img.videoHeight : img.naturalHeight;
      if (nw && nh) {
        const boundsVal = getImageBounds(container, img);
        if (boundsVal) {
          const mouseX = (clientX - containerRect.left) / canvasScale;
          const mouseY = (clientY - containerRect.top) / canvasScale;
          const imgRelX = ((mouseX - boundsVal.offsetX) / boundsVal.visibleW) * 100;
          const imgRelY = ((mouseY - boundsVal.offsetY) / boundsVal.visibleH) * 100;
          return {
            x: clamp(imgRelX, 0, 100),
            y: clamp(imgRelY, 0, 100),
          };
        }
      }
    }

    return {
      x: (((clientX - containerRect.left) / canvasScale) / container.offsetWidth) * 100,
      y: (((clientY - containerRect.top) / canvasScale) / container.offsetHeight) * 100,
    };
  }, [canvasScale]);

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

    if (mode === "caption") {
      return;
    }

    // In select mode, clicking empty canvas does nothing: annotation overlays
    // handle their own click via stopPropagation above.
    if (mode === "select") {
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
      // Appends. This used to write the single `editorBadgeX/Y` pair, so the
      // second badge placed on a scene just moved the first one somewhere else.
      const existingBadges = annotations[currentStep.id]?.editorBadges || [];
      const badge = {
        id: crypto.randomUUID(),
        // Numbering continues from what is already on the scene rather than
        // restarting, so three badges read 1, 2, 3.
        number: existingBadges.length > 0
          ? Math.max(...existingBadges.map((b) => b.number)) + 1
          : currentStepIndex + 1,
        x: coords.x,
        y: coords.y,
        color: annotations[currentStep.id]?.editorBadgeColor || "#FBBF24",
      };
      const nextState = {
        ...annotations,
        [currentStep.id]: {
          ...(annotations[currentStep.id] || {}),
          editorBadges: [...existingBadges, badge],
        },
      };
      pushHistory(nextState);
      setSelectedRegion({ kind: "badge", id: badge.id });
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

    if (mode === "zoom") {
      // Unified zoom tool: click to add a zoom point (multiple allowed, like blur)
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
          // Also set the primary zoom target for single-zoom render path
          zoomTargetX: coords.x,
          zoomTargetY: coords.y,
          // Set editorZoomScale so the worker knows zoom is enabled
          editorZoomScale: annotations[currentStep.id]?.editorZoomScale ?? 2,
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
              newH = clamp(initH + deltaY, 5, 100 - initY);
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
        } else if (dragItem.type === "zoomRect") {
          const handle = handleResizeRef.current;
          const initX = dragItem.initialX || 0;
          const initY = dragItem.initialY || 0;
          const initW = dragItem.initialW || 0;
          const initH = dragItem.initialH || 0;
          if (handle) {
            let newX = initX, newY = initY, newW = initW, newH = initH;
            if (handle.includes("w")) { newX = clamp(initX + deltaX, 0, initX + initW - 5); newW = initW - (newX - initX); }
            if (handle.includes("e")) { newW = clamp(initW + deltaX, 5, 100 - initX); }
            if (handle.includes("n")) { newY = clamp(initY + deltaY, 0, initY + initH - 5); newH = initH - (newY - initY); }
            if (handle.includes("s")) { newH = clamp(initH + deltaY, 5, 100 - initY); }
            updated.zoomRectX = newX;
            updated.zoomRectY = newY;
            updated.zoomRectWidth = newW;
            updated.zoomRectHeight = newH;
            updated.zoomTargetX = newX + newW / 2;
            updated.zoomTargetY = newY + newH / 2;
          } else {
            const w = initW, h = initH;
            updated.zoomRectX = clamp(initX + deltaX, 0, 100 - w);
            updated.zoomRectY = clamp(initY + deltaY, 0, 100 - h);
            updated.zoomTargetX = updated.zoomRectX + w / 2;
            updated.zoomTargetY = updated.zoomRectY + h / 2;
          }
        } else if (dragItem.type === "redact") {
          const handle = handleResizeRef.current;
          const initX = dragItem.initialX || 0;
          const initY = dragItem.initialY || 0;
          const initW = dragItem.initialW || 0;
          const initH = dragItem.initialH || 0;
          if (handle) {
            let newX = initX, newY = initY, newW = initW, newH = initH;
            if (handle.includes("w")) { newX = clamp(initX + deltaX, 0, initX + initW - 5); newW = initW - (newX - initX); }
            if (handle.includes("e")) { newW = clamp(initW + deltaX, 5, 100 - initX); }
            if (handle.includes("n")) { newY = clamp(initY + deltaY, 0, initY + initH - 5); newH = initH - (newY - initY); }
            if (handle.includes("s")) { newH = clamp(initH + deltaY, 5, 100 - initY); }
            updated.editorRedactX = newX;
            updated.editorRedactY = newY;
            updated.editorRedactW = newW;
            updated.editorRedactH = newH;
          } else {
            const w = initW, h = initH;
            updated.editorRedactX = clamp(initX + deltaX, 0, 100 - w);
            updated.editorRedactY = clamp(initY + deltaY, 0, 100 - h);
          }
        } else if (dragItem.type === "redactArr") {
          const handle = handleResizeRef.current;
          const initX = dragItem.initialX || 0;
          const initY = dragItem.initialY || 0;
          const initW = dragItem.initialW || 0;
          const initH = dragItem.initialH || 0;
          let newX = initX, newY = initY, newW = initW, newH = initH;
          if (handle) {
            if (handle.includes("w")) { newX = clamp(initX + deltaX, 0, initX + initW - 5); newW = initW - (newX - initX); }
            if (handle.includes("e")) { newW = clamp(initW + deltaX, 5, 100 - initX); }
            if (handle.includes("n")) { newY = clamp(initY + deltaY, 0, initY + initH - 5); newH = initH - (newY - initY); }
            if (handle.includes("s")) { newH = clamp(initH + deltaY, 5, 100 - initY); }
          } else {
            newX = clamp(initX + deltaX, 0, 100 - initW);
            newY = clamp(initY + deltaY, 0, 100 - initH);
          }
          const finalW = handle ? newW : initW;
          const finalH = handle ? newH : initH;
          updated.editorRedacts = (stepAnn.editorRedacts || []).map((r) =>
            r.id === dragItem.id ? { ...r, x: newX, y: newY, w: finalW, h: finalH } : r
          );
        } else if (dragItem.type === "badgeArr") {
          const nx = clamp(dragItem.initialX + deltaX, 0, 100);
          const ny = clamp(dragItem.initialY + deltaY, 0, 100);
          updated.editorBadges = (stepAnn.editorBadges || []).map((b) =>
            b.id === dragItem.id ? { ...b, x: nx, y: ny } : b
          );
        } else if (dragItem.type === "blurArr") {
          const handle = handleResizeRef.current;
          const initX = dragItem.initialX || 0;
          const initY = dragItem.initialY || 0;
          const initW = dragItem.initialW || 0;
          const initH = dragItem.initialH || 0;
          let newX = initX, newY = initY, newW = initW, newH = initH;
          if (handle) {
            if (handle.includes("w")) { newX = clamp(initX + deltaX, 0, initX + initW - 5); newW = initW - (newX - initX); }
            if (handle.includes("e")) { newW = clamp(initW + deltaX, 5, 100 - initX); }
            if (handle.includes("n")) { newY = clamp(initY + deltaY, 0, initY + initH - 5); newH = initH - (newY - initY); }
            if (handle.includes("s")) { newH = clamp(initH + deltaY, 5, 100 - initY); }
          } else {
            newX = clamp(initX + deltaX, 0, 100 - initW);
            newY = clamp(initY + deltaY, 0, 100 - initH);
          }
          const finalW = handle ? newW : initW;
          const finalH = handle ? newH : initH;
          updated.editorBlurs = (stepAnn.editorBlurs || []).map((r) =>
            r.id === dragItem.id ? { ...r, x: newX, y: newY, w: finalW, h: finalH } : r
          );
        } else if (dragItem.type === "pixelateArr") {
          const handle = handleResizeRef.current;
          const initX = dragItem.initialX || 0;
          const initY = dragItem.initialY || 0;
          const initW = dragItem.initialW || 0;
          const initH = dragItem.initialH || 0;
          let newX = initX, newY = initY, newW = initW, newH = initH;
          if (handle) {
            if (handle.includes("w")) { newX = clamp(initX + deltaX, 0, initX + initW - 5); newW = initW - (newX - initX); }
            if (handle.includes("e")) { newW = clamp(initW + deltaX, 5, 100 - initX); }
            if (handle.includes("n")) { newY = clamp(initY + deltaY, 0, initY + initH - 5); newH = initH - (newY - initY); }
            if (handle.includes("s")) { newH = clamp(initH + deltaY, 5, 100 - initY); }
          } else {
            newX = clamp(initX + deltaX, 0, 100 - initW);
            newY = clamp(initY + deltaY, 0, 100 - initH);
          }
          const finalW = handle ? newW : initW;
          const finalH = handle ? newH : initH;
          updated.editorPixelates = (stepAnn.editorPixelates || []).map((r) =>
            r.id === dragItem.id ? { ...r, x: newX, y: newY, w: finalW, h: finalH } : r
          );
        } else if (dragItem.type === "spotlightArr") {
          const handle = handleResizeRef.current;
          const initX = dragItem.initialX || 0;
          const initY = dragItem.initialY || 0;
          const initW = dragItem.initialW || 0;
          const initH = dragItem.initialH || 0;
          let newX = initX, newY = initY, newW = initW, newH = initH;
          if (handle) {
            if (handle.includes("w")) { newX = clamp(initX + deltaX, 0, initX + initW - 5); newW = initW - (newX - initX); }
            if (handle.includes("e")) { newW = clamp(initW + deltaX, 5, 100 - initX); }
            if (handle.includes("n")) { newY = clamp(initY + deltaY, 0, initY + initH - 5); newH = initH - (newY - initY); }
            if (handle.includes("s")) { newH = clamp(initH + deltaY, 5, 100 - initY); }
          } else {
            newX = clamp(initX + deltaX, 0, 100 - initW);
            newY = clamp(initY + deltaY, 0, 100 - initH);
          }
          const finalW = handle ? newW : initW;
          const finalH = handle ? newH : initH;
          updated.editorSpotlights = (stepAnn.editorSpotlights || []).map((r) =>
            r.id === dragItem.id ? { ...r, x: newX, y: newY, w: finalW, h: finalH } : r
          );
        } else if (dragItem.type === "badge") {
          updated.editorBadgeX = clamp(dragItem.initialX + deltaX, 0, 100);
          updated.editorBadgeY = clamp(dragItem.initialY + deltaY, 0, 100);
        } else if (dragItem.type === "magnify") {
          updated.editorMagnifyX = clamp(dragItem.initialX + deltaX, 0, 100);
          updated.editorMagnifyY = clamp(dragItem.initialY + deltaY, 0, 100);
        } else if (dragItem.type === "zoomTarget") {
          updated.zoomTargetX = clamp(dragItem.initialX + deltaX, 0, 100);
          updated.zoomTargetY = clamp(dragItem.initialY + deltaY, 0, 100);
        } else if (dragItem.type === "multizoom") {
          const moved = (stepAnn.editorMultiZooms || []).map((p) =>
            p.id === dragItem.id
              ? {
                ...p,
                targetX: clamp(dragItem.initialX + deltaX, 0, 100),
                targetY: clamp(dragItem.initialY + deltaY, 0, 100),
              }
              : p
          );
          updated.editorMultiZooms = moved;
          // `zoomTargetX/Y` follows the first waypoint. Placing a point writes
          // both, but dragging used to move only the waypoint - so the legacy
          // target was left behind, and the single-zoom render path, which is
          // what runs whenever the multi-zoom one is not taken, still aimed at
          // the spot the point had been dragged away from.
          if (moved[0]) {
            updated.zoomTargetX = moved[0].targetX;
            updated.zoomTargetY = moved[0].targetY;
          }
        } else if (dragItem.type === "highlightArr") {
          const handle = handleResizeRef.current;
          const initX = dragItem.initialX || 0;
          const initY = dragItem.initialY || 0;
          const initW = dragItem.initialW || 0;
          const initH = dragItem.initialH || 0;
          let newX = initX, newY = initY, newW = initW, newH = initH;
          if (handle) {
            if (handle.includes("w")) { newX = clamp(initX + deltaX, 0, initX + initW - 5); newW = initW - (newX - initX); }
            if (handle.includes("e")) { newW = clamp(initW + deltaX, 5, 100 - initX); }
            if (handle.includes("n")) { newY = clamp(initY + deltaY, 0, initY + initH - 5); newH = initH - (newY - initY); }
            if (handle.includes("s")) { newH = clamp(initH + deltaY, 5, 100 - initY); }
          } else {
            newX = clamp(initX + deltaX, 0, 100 - initW);
            newY = clamp(initY + deltaY, 0, 100 - initH);
          }
          const finalW = handle ? newW : initW;
          const finalH = handle ? newH : initH;
          updated.editorHighlights = (stepAnn.editorHighlights || []).map((r) =>
            r.id === dragItem.id ? { ...r, x: newX, y: newY, w: finalW, h: finalH } : r
          );
        }

        return { ...prev, [currentStep.id]: updated };
      });
      return;
    }

    if (!isDragging || mode === "zoom" || mode === "overlay" || mode === "caption") return;
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
    let newSelection: { kind: "blur" | "pixelate" | "spotlight" | "redact"; id: string } | null = null;

    if (mode === "highlight") {
      const x = Math.min(dragStart.x, dragCurrent.x);
      const y = Math.min(dragStart.y, dragCurrent.y);
      const width = Math.abs(dragCurrent.x - dragStart.x);
      const height = Math.abs(dragCurrent.y - dragStart.y);

      if (width > 2 && height > 2) {
        // Add to highlights array (multiple highlight boxes, like blur)
        const existing = updatedAnn.editorHighlights || [];
        updatedAnn.editorHighlights = [...existing, {
          id: crypto.randomUUID(),
          x, y, w: width, h: height,
          color: "#FF0099",
        }];
        // Do NOT set zoomTargetX/Y: highlight is decoupled from zoom
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
        const region = {
          id: crypto.randomUUID(),
          x, y, w, h,
          intensity: updatedAnn.editorBlurIntensity ?? 20,
        };
        updatedAnn.editorBlurs = [...existing, region];
        newSelection = { kind: "blur" as const, id: region.id };
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
        // Appends, like blur and pixelate. Writing the single
        // `editorRedactX..H` rectangle meant a scene could only ever hide one
        // thing: drawing a second bar dragged the first one on top of it.
        const existing = updatedAnn.editorRedacts || [];
        const region = {
          id: crypto.randomUUID(),
          x, y, w, h,
          color: updatedAnn.editorRedactColor || "#000000",
        };
        updatedAnn.editorRedacts = [...existing, region];
        newSelection = { kind: "redact" as const, id: region.id };
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
        const region = {
          id: crypto.randomUUID(),
          x, y, w, h,
          blockSize: updatedAnn.editorPixelateBlockSize ?? 20,
        };
        updatedAnn.editorPixelates = [...existing, region];
        newSelection = { kind: "pixelate" as const, id: region.id };
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
        const region = {
          id: crypto.randomUUID(),
          x, y, w, h,
          intensity: updatedAnn.editorSpotlightIntensity ?? 0.6,
        };
        updatedAnn.editorSpotlights = [...existing, region];
        newSelection = { kind: "spotlight" as const, id: region.id };
        changed = true;
        setActiveTab("spotlight");
      }
    }

    if (changed) {
      pushHistory({
        ...annotations,
        [currentStep.id]: updatedAnn,
      });
      // Drawing a region selects it, so the strength slider in the panel that
      // just opened is already pointed at the thing that was drawn.
      if (newSelection) setSelectedRegion(newSelection);
    }

    setIsDragging(false);
    setDragStart(null);
    setDragCurrent(null);
  };

  const getCanvasCoordsRef = useRef(getCanvasCoords);
  const handleMouseDownRef = useRef(handleMouseDown);
  const handleMouseMoveRef = useRef(handleMouseMove);
  const handleMouseUpRef = useRef(handleMouseUp);

  useEffect(() => {
    getCanvasCoordsRef.current = getCanvasCoords;
    handleMouseDownRef.current = handleMouseDown;
    handleMouseMoveRef.current = handleMouseMove;
    handleMouseUpRef.current = handleMouseUp;
  }, [getCanvasCoords, handleMouseDown, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStartNative = (e: TouchEvent) => {
      if (modeRef.current !== "pan") {
        if (e.touches.length === 1) {
          e.preventDefault();
          const touch = e.touches[0];
          const coords = getCanvasCoordsRef.current(e);
          if (!coords) return;

          const simulatedEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => {},
            stopPropagation: () => {},
          } as unknown as React.MouseEvent;

          handleMouseDownRef.current(simulatedEvent);
        }
      }
    };

    const handleTouchMoveNative = (e: TouchEvent) => {
      if (modeRef.current !== "pan") {
        if (e.touches.length === 1) {
          e.preventDefault();
          const touch = e.touches[0];
          const simulatedEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => {},
            stopPropagation: () => {},
          } as unknown as React.MouseEvent;

          handleMouseMoveRef.current(simulatedEvent);
        }
      }
    };

    const handleTouchEndNative = (e: TouchEvent) => {
      if (modeRef.current !== "pan") {
        e.preventDefault();
        handleMouseUpRef.current();
      }
    };

    canvas.addEventListener("touchstart", handleTouchStartNative, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMoveNative, { passive: false });
    canvas.addEventListener("touchend", handleTouchEndNative, { passive: false });

    return () => {
      canvas.removeEventListener("touchstart", handleTouchStartNative);
      canvas.removeEventListener("touchmove", handleTouchMoveNative);
      canvas.removeEventListener("touchend", handleTouchEndNative);
    };
  }, []);

  /* Actions */

  const fieldsList = [
    "zoomTargetX", "zoomTargetY", "zoomRectX", "zoomRectY",
    "zoomRectWidth", "zoomRectHeight",
    "editorHighlights",
    "editorCaptionText", "editorCaptionPosition", "editorCaptionStyle",
    "editorCaptionColor", "editorCaptionSize",
    "editorOverlayText", "editorOverlayX", "editorOverlayY",
    "editorOverlayColor", "editorOverlaySize",
    "editorCropX", "editorCropY", "editorCropW", "editorCropH",
    "editorBlurX", "editorBlurY", "editorBlurW", "editorBlurH", "editorBlurIntensity",
    "editorBlurs",
    "editorRedactX", "editorRedactY", "editorRedactW", "editorRedactH", "editorRedactColor",
    "editorRedacts",
    "editorWatermarkText", "editorWatermarkPosition", "editorWatermarkSize",
    "editorWatermarkColor", "editorWatermarkOpacity",
    "editorPixelateX", "editorPixelateY", "editorPixelateW", "editorPixelateH", "editorPixelateBlockSize",
    "editorPixelates",
    "editorSpotlightX", "editorSpotlightY", "editorSpotlightW", "editorSpotlightH", "editorSpotlightIntensity",
    "editorSpotlights",
    "editorBadgeNumber", "editorBadgeX", "editorBadgeY", "editorBadgeColor",
    "editorBadges",
    "editorMagnifyX", "editorMagnifyY", "editorMagnifyW", "editorMagnifyH", "editorMagnifyScale", "editorMagnifyCorner",
    "editorColorFilter", "editorColorFilterStrength",
    "editorZoomScale", "editorDuration",
    "editorMultiZooms",
  ];

  const handleSaveStep = async () => {
    if (!currentStep) return;
    const ann = annotations[currentStep.id];
    if (!ann) return;

    const payload: Record<string, unknown> = {};
    const fields = fieldsList;

    fields.forEach((f) => {
      const v = ann[f as keyof StepAnnotation];
      if (v !== undefined) payload[f] = v;
    });

    await updateStep.mutateAsync({ id: currentStep.id, ...payload } as Parameters<typeof updateStep.mutateAsync>[0]);
    utils.project.getById.invalidate({ id: projectIdNum });
  };

  // Save ALL steps' annotations & transitions (used before rendering to ensure nothing is lost)
  const handleSaveAllSteps = async () => {
    // 1. Save all step-level data (annotations and transitions)
    if (project?.steps) {
      for (const step of project.steps) {
        const ann = annotations[step.id];
        const sceneText = allSceneTexts[step.id];
        const transition = props.stepTransitions?.[step.id] || props.globalTransition || "fade";
        const payload: Record<string, unknown> = {
          transition,
        };
        if (sceneText) {
          const persistedScript = step.userEditedScript ?? step.aiScript ?? "";
          if (sceneText.script !== persistedScript) {
            // Flush focused textarea edits before preflight/render. Relying on
            // blur here races the Export click and can leave TTS with stale text.
            payload.userEditedScript = sceneText.script;
          }
          if (
            sceneText.desc.trim() &&
            sceneText.desc !== (step.description || "")
          ) {
            payload.description = sceneText.desc;
          }
        }
        if (ann) {
          fieldsList.forEach((f) => {
            const v = ann[f as keyof StepAnnotation];
            if (v !== undefined) payload[f] = v;
          });
        }
        await updateStep.mutateAsync({ id: step.id, ...payload } as Parameters<typeof updateStep.mutateAsync>[0]);
      }
    }

    // 2. Save project-level settings (intro, outro, transition duration, captions settings)
    if (projectIdNum > 0) {
      await updateProject.mutateAsync({
        id: projectIdNum,
        transitionDuration: props.transitionDuration || 0.5,
        introTemplate: introTemplate || "none",
        introText: introText || "",
        introDuration: introDuration || 3.0,
        outroTemplate: outroTemplate || "none",
        outroText: outroText || "",
        outroDuration: outroDuration || 3.0,
        captionsEnabled: !!props.captionsEnabled,
        captionStyle: props.captionStyle || "standard",
        captionSize: props.captionSize || "medium",
        captionPosition: props.captionPosition || "bottom",
        captionColor: props.captionColor || "#FFFFFF",
      });
    }

    utils.project.getById.invalidate({ id: projectIdNum });
  };

  // Switching scenes: whatever is in state came from the server, so treat it as
  // already saved. Declared before the autosave effect so it seeds the snapshot
  // first and the comparison below sees no change.
  useEffect(() => {
    if (!currentStep) return;
    lastSavedSnapshot.current = JSON.stringify(annotations[currentStep.id] ?? {});
    setSaveState("idle");
    // Deliberately keyed on the step only: re-seeding on every annotation edit
    // would defeat the point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep?.id]);

  // Autosave annotations to backend.
  //
  // The save itself already worked; what was missing was any sign of it. Edits
  // went to the server silently, so "is my work saved?" had no answer and
  // closing the tab was guesswork. This tracks the state the indicator and the
  // unload guard both read.
  useEffect(() => {
    if (!currentStep) return;

    const snapshot = JSON.stringify(annotations[currentStep.id] ?? {});
    if (snapshot === lastSavedSnapshot.current) return;

    setSaveState("dirty");
    const timer = setTimeout(async () => {
      setSaveState("saving");
      try {
        await handleSaveStep();
        lastSavedSnapshot.current = snapshot;
        setSaveState("saved");
      } catch {
        // Left visible rather than retried silently: the user needs to know
        // their last edits are not on the server.
        setSaveState("error");
      }
    }, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annotations, currentStep?.id]);

  // Don't let the tab close over unsaved edits.
  useEffect(() => {
    if (saveState !== "dirty" && saveState !== "saving" && saveState !== "error") return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveState]);



  /**
   * Cut the crop out of the screenshot and replace it.
   *
   * The crop annotation is cleared afterwards because it has been carried out -
   * leaving it set would crop the already-cropped image again at render time.
   * Other annotations are cleared too: their coordinates are percentages of the
   * old image, and silently reinterpreting them against a differently-shaped one
   * would move every box without the user touching anything.
   */
  const handleApplyCrop = async () => {
    if (!currentStep?.screenshotPath || !cropRect) return;
    const { x, y, w, h } = cropRect;
    if (x == null || y == null || w == null || h == null || w <= 0 || h <= 0) return;

    setIsApplyingCrop(true);
    try {
      const { cropImageFile } = await import("@/lib/cropImage");
      const file = await cropImageFile(currentStep.screenshotPath, { x, y, w, h }, "cropped.png");
      const { key, url } = await uploadFile(file, "screenshots");

      await updateStep.mutateAsync({ id: currentStep.id, screenshotPath: key });

      const cleared: StepAnnotation = {
        ...(annotations[currentStep.id] || {}),
        editorCropX: null,
        editorCropY: null,
        editorCropW: null,
        editorCropH: null,
        editorHighlights: [],
        editorBlurs: [],
        editorPixelates: [],
        editorSpotlights: [],
        editorRedacts: [],
        editorBadges: [],
        editorMultiZooms: [],
      };
      pushHistory({ ...annotations, [currentStep.id]: cleared });

      // Keep the canvas showing the new image without waiting for a refetch.
      void url;
      await utils.project.getById.invalidate({ id: projectIdNum });
      setMode("select");
      toast.success("Crop applied. The canvas now matches the exported frame.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not apply the crop";
      toast.error(message);
    } finally {
      setIsApplyingCrop(false);
    }
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

  /**
   * Which region a strength slider is pointed at, and where it sits in the list.
   *
   * Falls back to the most recently drawn region when nothing has been clicked,
   * so the slider always has a target and never looks dead. Returns index -1
   * when the scene has no regions of that kind at all, in which case the slider
   * edits the step default that the next region will inherit.
   */
  const sliderTarget = (kind: "blur" | "pixelate" | "spotlight") => {
    const list =
      kind === "blur" ? currentAnn?.editorBlurs
        : kind === "pixelate" ? currentAnn?.editorPixelates
          : currentAnn?.editorSpotlights;
    if (!list || list.length === 0) return { id: null as string | null, index: -1, total: 0 };
    const picked =
      selectedRegion?.kind === kind && list.some((r) => r.id === selectedRegion.id)
        ? selectedRegion.id
        : list[list.length - 1].id;
    return { id: picked, index: list.findIndex((r) => r.id === picked), total: list.length };
  };

  const blurTarget = sliderTarget("blur");
  const blurValue =
    currentAnn?.editorBlurs?.find((r) => r.id === blurTarget.id)?.intensity
    ?? currentAnn?.editorBlurIntensity ?? 20;

  const pixelateTarget = sliderTarget("pixelate");
  const pixelateValue =
    currentAnn?.editorPixelates?.find((r) => r.id === pixelateTarget.id)?.blockSize
    ?? currentAnn?.editorPixelateBlockSize ?? 20;

  const spotlightTarget = sliderTarget("spotlight");
  const spotlightValue =
    currentAnn?.editorSpotlights?.find((r) => r.id === spotlightTarget.id)?.intensity
    ?? currentAnn?.editorSpotlightIntensity ?? 0.6;

  // Redaction bars and badges follow the same rule as the strength sliders: the
  // panel edits whichever one is selected, falling back to the most recent so
  // the fields are never pointed at nothing while the scene has some.
  // The depth the scene actually renders at: max across the waypoints, which is
  // exactly what computeWaypointCamera does, falling back to the step gate.
  const sceneZoomScale = (() => {
    const zs = (currentAnn?.editorMultiZooms || []).map((z) => z.zoomScale ?? 0).filter((n) => n > 1);
    if (zs.length > 0) return Math.max(...zs);
    const gate = currentAnn?.editorZoomScale ?? 0;
    return gate > 1 ? gate : 2;
  })();

  const redactList = currentAnn?.editorRedacts || [];
  const redactIndex = redactList.length === 0
    ? -1
    : (selectedRegion?.kind === "redact" && redactList.some((r) => r.id === selectedRegion.id)
      ? redactList.findIndex((r) => r.id === selectedRegion.id)
      : redactList.length - 1);
  const redactTarget = redactIndex >= 0 ? redactList[redactIndex] : null;

  const badgeList = currentAnn?.editorBadges || [];
  const badgeIndex = badgeList.length === 0
    ? -1
    : (selectedRegion?.kind === "badge" && badgeList.some((b) => b.id === selectedRegion.id)
      ? badgeList.findIndex((b) => b.id === selectedRegion.id)
      : badgeList.length - 1);
  const badgeTarget = badgeIndex >= 0 ? badgeList[badgeIndex] : null;

  const updateRedact = (id: string, patch: Partial<{ x: number; y: number; w: number; h: number; color: string }>) => {
    setAnnotations((prev) => ({
      ...prev,
      [currentStep!.id]: {
        ...prev[currentStep!.id],
        editorRedacts: (prev[currentStep!.id]?.editorRedacts || []).map((r) =>
          r.id === id ? { ...r, ...patch } : r
        ),
      },
    }));
  };

  const updateBadge = (id: string, patch: Partial<{ number: number; x: number; y: number; color: string }>) => {
    setAnnotations((prev) => ({
      ...prev,
      [currentStep!.id]: {
        ...prev[currentStep!.id],
        editorBadges: (prev[currentStep!.id]?.editorBadges || []).map((b) =>
          b.id === id ? { ...b, ...patch } : b
        ),
      },
    }));
  };


  /**
   * Lend the editor's context to the support widget.
   *
   * The widget lives at the app root so it can follow the user everywhere, so it
   * cannot see this component's state directly. While the editor is open it
   * publishes two things: a readable summary that goes into the prompt, and a
   * way to apply operations the model returns.
   *
   * The apply path folds through `applyEditorOps` into `pushHistory`, which is
   * the same route a manual edit takes. That is deliberate: an AI change lands
   * on the undo stack, so Ctrl+Z reverses it.
   */
  const setSupportEditor = useSupportContext((st) => st.setEditor);
  const clearSupportEditor = useSupportContext((st) => st.clearEditor);

  useEffect(() => {
    if (!currentStep) {
      clearSupportEditor();
      return;
    }

    const stepId = currentStep.id;

    setSupportEditor({
      stepId,
      describe: () => {
        const ann = annotationsRef.current[stepId] ?? {};
        const facts = [
          `Scene ${currentStepIndex + 1} of ${steps.length}.`,
          `Aspect ratio ${project?.aspectRatio ?? "unknown"}.`,
          currentStep.description ? `Description: ${currentStep.description}` : "No description yet.",
          `Zoom points: ${(ann.editorMultiZooms as unknown[] | undefined)?.length ?? 0}.`,
          `Highlights: ${(ann.editorHighlights as unknown[] | undefined)?.length ?? 0}.`,
          `Blur regions: ${(ann.editorBlurs as unknown[] | undefined)?.length ?? 0}.`,
          `Pixelate regions: ${(ann.editorPixelates as unknown[] | undefined)?.length ?? 0}.`,
          ann.editorColorFilter && ann.editorColorFilter !== "none"
            ? `Colour filter ${ann.editorColorFilter} at ${ann.editorColorFilterStrength ?? 100}%.`
            : "No colour filter.",
          `Captions ${props.captionsEnabled ? "on" : "off"}, size ${props.captionSize ?? "medium"}, position ${props.captionPosition ?? "bottom"}.`,
        ];
        return facts.join(" ");
      },
      current: () => (annotationsRef.current[stepId] ?? {}) as Record<string, unknown>,
      applyOps: (ops) => {
        const base = annotationsRef.current[stepId] ?? {};
        const next = applyEditorOps(base as Record<string, unknown>, ops as EditorOp[], () =>
          crypto.randomUUID()
        );
        pushHistory({ ...annotationsRef.current, [stepId]: next as StepAnnotation });
      },
    });

    return () => clearSupportEditor();
    // `annotations` is read through a ref so the bridge is not re-registered on
    // every keystroke; only identity of the scene matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentStep?.id,
    currentStepIndex,
    steps.length,
    project?.aspectRatio,
    currentStep?.description,
    props.captionsEnabled,
    props.captionSize,
    props.captionPosition,
    setSupportEditor,
    clearSupportEditor,
    pushHistory,
  ]);

  // Whether an annotation overlay should capture pointer events.
  // Overlays only capture clicks when the user is in "select" mode or the
  // matching tool mode: so you can draw blur/zoom/etc. inside a highlight box.
  const overlayPointer = (toolMode: ToolMode): "auto" | "none" => {
    if (mode === "select" || mode === toolMode) return "auto";
    return "none";
  };

  /**
   * How long this scene will actually run, and why.
   *
   * Uses the renderer's own arithmetic (contracts/sceneTiming) rather than a
   * copy, so the editor can never quote a number the render disagrees with.
   * Narration is estimated from the script when no audio has been generated yet,
   * and taken from the real measured duration once it has.
   */
  const sceneTiming = (() => {
    if (!currentStep) return null;
    const zooms = currentAnn?.editorMultiZooms ?? [];
    const script =
      currentStep.userEditedScript ?? currentStep.aiScript ?? currentStep.description ?? "";
    const narration =
      currentStep.audioDuration && currentStep.audioDuration > 0
        ? currentStep.audioDuration
        : estimateNarrationSeconds(script, project?.speed ?? 1);
    return computeSceneTiming(
      zooms.length,
      zooms.map((z) => z.duration ?? MW_MIN_HOLD),
      narration
    );
  })();

  const projectRatio = project?.aspectRatio || "16:9";
  const getCanvasDimensions = () => {
    switch (projectRatio) {
      case "9:16":
        return { width: 270, height: 480 };
      case "1:1":
        return { width: 400, height: 400 };
      case "4:5":
        return { width: 320, height: 400 };
      case "16:9":
      default:
        return { width: 640, height: 360 };
    }
  };
  const canvasDim = getCanvasDimensions();

  const getFitScale = useCallback(() => {
    if (!scrollContainerRef.current) return 1.0;
    const padding = 32;
    const containerWidth = scrollContainerRef.current.clientWidth - padding;
    const containerHeight = scrollContainerRef.current.clientHeight - padding;
    if (containerWidth <= 0 || containerHeight <= 0) return 1.0;

    const scaleX = containerWidth / canvasDim.width;
    const scaleY = containerHeight / canvasDim.height;
    return Math.min(scaleX, scaleY);
  }, [canvasDim.width, canvasDim.height]);

  // Fit canvas on initial mount or when screen/aspect ratio changes
  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        setCanvasScale(getFitScale());
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [canvasDim.width, canvasDim.height, getFitScale]);


  /**
   * A blur strength, converted from what the renderer means to what CSS means.
   *
   * The stored number is the `gblur` sigma FFmpeg applies to the full-resolution
   * source. Two things have to be undone to preview it honestly:
   *
   *  - the media is drawn at `bounds.visibleW` for a source `naturalW` wide, so
   *    a sigma in source pixels is that much smaller on screen;
   *  - CSS `blur(R)` is a Gaussian of sigma R/2, not R.
   *
   * Neither was accounted for, so the preview was off by the display scale and
   * by a factor of two on top of it. Falls back to the raw number until the
   * media has loaded and its natural size is known.
   */
  const previewBlurPx = (intensity: number) => {
    if (!bounds?.naturalW) return intensity;
    return (2 * intensity * bounds.visibleW) / bounds.naturalW;
  };

  /**
   * How the text overlay will actually be laid out by the renderer.
   *
   * `drawtext` cannot wrap, so `buildOverlayTextFilter` breaks the label into
   * lines with `splitTextIntoLines` and clamps each one inside the frame. Both
   * calculations are repeated here against the same numbers - source pixels,
   * the same 0.55em advance estimate - so the preview and the export agree.
   *
   * Returns null until the media has loaded, since every figure below is
   * derived from its natural size.
   */
  const overlayPreviewLayout = (text: string, size: string | null | undefined) => {
    if (!bounds?.naturalW || !bounds.naturalH) return null;

    const factor = size === "small" ? 0.04 : size === "large" ? 0.07 : 0.055;
    const fontSizeImage = Math.round(bounds.naturalH * factor);
    const maxChars = Math.max(8, Math.floor((bounds.naturalW * 0.92) / (fontSizeImage * 0.55)));
    const lines = splitIntoLines(text, maxChars);
    if (lines.length === 0) return null;

    const displayScale = bounds.visibleW / bounds.naturalW;
    const longest = Math.max(...lines.map((l) => l.length));

    // Half the block's size as a percentage of the frame, which is how far the
    // anchor has to stay from each edge for the block to fit.
    const halfWidthPct = ((longest * fontSizeImage * 0.55) / 2 / bounds.naturalW) * 100;
    const halfHeightPct = ((lines.length * fontSizeImage * 1.25) / 2 / bounds.naturalH) * 100;

    return {
      lines,
      fontSize: fontSizeImage * displayScale,
      left: clamp(currentAnn?.editorOverlayX ?? 50, halfWidthPct, 100 - halfWidthPct),
      top: clamp(currentAnn?.editorOverlayY ?? 50, halfHeightPct, 100 - halfHeightPct),
    };
  };

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



  const overlayPos = currentAnn
    ? { x: currentAnn.editorOverlayX, y: currentAnn.editorOverlayY }
    : null;

  /* Î“Ã¶Ã‡Î“Ã¶Ã‡ Render helpers Î“Ã¶Ã‡Î“Ã¶Ã‡ */


  const renderPropertiesContent = () => {
    if (!currentStep) return null;
    // The properties panel is its own surface with a titled header, rather
    // than another run of controls separated from the ones above by a hairline
    // and a 10px muted label. "I cannot tell the sections apart" was about this:
    // everything in the sidebar was the same weight on the same background, so
    // nothing announced where one thing ended and the next began.
    return (
      <div className="mt-3 rounded-lg border border-[var(--sketch-border-color)]/50 bg-[var(--sketch-panel-bg)] overflow-hidden">
        <h3 className="flex items-center gap-1.5 border-b border-[var(--sketch-border-color)]/50 bg-[var(--sketch-fg-subtle)]/[0.07] px-3 py-2 text-[11px] font-semibold tracking-wide text-[var(--sketch-fg)]">
          <Settings2 className="w-3.5 h-3.5 text-[var(--sketch-accent)]" />
          <span className="capitalize">{TOOL_LABELS[mode] ?? mode}</span>
          <span className="text-[var(--sketch-fg-muted)] font-normal">settings</span>
        </h3>
        <div className="space-y-4 p-3">
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
                <p className="text-[10px] text-[var(--sketch-fg-muted)] mt-1">
                  Optional. Leave it empty and this scene subtitles its narration
                  using the project's caption settings instead.
                </p>
              </div>

              {/* Scoped to the caption text above, and inert without it.
                  These four write editorCaptionStyle/Size/Position/Color, which
                  the renderer only reads when the scene has its own caption
                  text - otherwise the scene is showing the project's narration
                  caption and it is the project's settings that describe it.
                  Left enabled, they were four controls that silently did
                  nothing, which is what "caption size does not work" turned out
                  to mean. */}
              {!currentAnn?.editorCaptionText && (
                <div className="rounded-md border border-[var(--sketch-border-color)]/30 bg-[var(--sketch-fg-subtle)]/5 p-2">
                  <p className="text-[10px] leading-relaxed text-[var(--sketch-fg-muted)]">
                    Styling below applies to this scene's own caption. To change
                    how the narration subtitles look, use{" "}
                    <button
                      onClick={() => toggleRightTab("captions")}
                      className="underline underline-offset-2 hover:text-[var(--sketch-fg)]"
                    >
                      Captions settings
                    </button>
                    , which apply to every scene.
                  </p>
                </div>
              )}

              <div
                className={`space-y-3 ${currentAnn?.editorCaptionText ? "" : "opacity-40 pointer-events-none select-none"}`}
                aria-disabled={!currentAnn?.editorCaptionText}
              >
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
              {/* Applying the crop cuts it out of the screenshot for real,
                  instead of leaving it as an instruction FFmpeg carries out at
                  render time. That is what makes the canvas and the export
                  agree: once there is no crop pending, watermarks and captions
                  preview against the same frame the renderer will use. */}
              {cropRect?.w != null && cropRect.w > 0 && cropRect?.h != null && cropRect.h > 0 && (
                <button
                  onClick={handleApplyCrop}
                  disabled={isApplyingCrop}
                  title="Cut the crop out of the screenshot now"
                  aria-label="Apply crop to the screenshot"
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#00E676]/40 bg-[#00E676]/10 py-2 text-[11px] font-bold text-[#00A854] hover:bg-[#00E676]/20 disabled:opacity-50 "
                >
                  {isApplyingCrop ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Applying…
                    </>
                  ) : (
                    <>
                      <Crop className="h-3.5 w-3.5" />
                      Apply crop to screenshot
                    </>
                  )}
                </button>
              )}
              <p className="text-[10px] leading-relaxed text-[var(--sketch-fg-subtle)]">
                Until you apply it, the crop happens at render time, so the
                watermark and captions preview against the whole screenshot
                rather than the cropped frame.
              </p>

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
                <Label className="text-xs font-mono">
                  Blur Intensity
                  <span className="ml-1 font-normal text-[var(--sketch-fg-muted)]">
                    {blurTarget.index >= 0
                      ? `- region ${blurTarget.index + 1} of ${blurTarget.total}`
                      : "- default for new regions"}
                  </span>
                </Label>
                <div className="flex items-center gap-3 mt-1">
                  <Slider
                    value={[blurValue]}
                    min={5}
                    max={60}
                    step={1}
                    onValueChange={([v]) =>
                      setAnnotations((prev) => ({
                        ...prev,
                        [currentStep!.id]: withBlurIntensity(prev[currentStep!.id], v, blurTarget.id),
                      }))
                    }
                    onValueCommit={([v]) => {
                      pushHistory({
                        ...annotations,
                        [currentStep!.id]: withBlurIntensity(annotations[currentStep!.id], v, blurTarget.id),
                      });
                    }}
                    className="flex-1"
                  />
                  <span className="text-xs font-mono w-10 text-right">
                    {blurValue}px
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
              {redactTarget ? (
                <>
                  <div className="text-[10px] text-[var(--sketch-fg-muted)]">
                    Editing bar {redactIndex + 1} of {(currentAnn?.editorRedacts || []).length}.
                    Click a bar on the canvas to switch.
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { key: "x", label: "X (%)" },
                      { key: "y", label: "Y (%)" },
                      { key: "w", label: "Width (%)" },
                      { key: "h", label: "Height (%)" },
                    ] as const).map((field) => (
                      <div key={field.key}>
                        <Label className="text-xs font-mono">{field.label}</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={redactTarget[field.key]}
                          onChange={(e) => updateRedact(redactTarget.id, { [field.key]: Number(e.target.value) })}
                          onBlur={() => pushHistory(annotations)}
                          className="mt-1 text-xs"
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <Label className="text-xs font-mono">Redact Color</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={redactTarget.color || "#000000"}
                        onChange={(e) => updateRedact(redactTarget.id, { color: e.target.value })}
                        onBlur={() => pushHistory(annotations)}
                        className="w-8 h-8 rounded border border-[var(--sketch-fg-subtle)]/30"
                      />
                      <span className="text-xs font-mono text-[var(--sketch-fg-muted)]">
                        {redactTarget.color || "#000000"}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-[10px] text-[var(--sketch-fg-muted)]">
                  No redaction bars on this scene yet.
                </p>
              )}

              <p className="text-[10px] text-[var(--sketch-fg-muted)]">
                Select the "Redact" tool and drag on the canvas to cover sensitive
                info completely. Drag again to add another bar - a scene can have
                as many as it needs.
              </p>

              {(currentAnn?.editorRedacts || []).length > 0 && (
                <button
                  onClick={() => {
                    pushHistory({
                      ...annotations,
                      [currentStep.id]: {
                        ...(annotations[currentStep.id] || {}),
                        editorRedacts: [],
                      },
                    });
                    setSelectedRegion(null);
                  }}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear all redactions ({(currentAnn?.editorRedacts || []).length})
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
                <div className="text-[10px] text-[var(--sketch-fg-muted)] mt-0.5">
                  {pixelateTarget.index >= 0
                    ? `Editing region ${pixelateTarget.index + 1} of ${pixelateTarget.total}. Click a region on the canvas to switch.`
                    : "Default for new regions."}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <Slider
                    value={[pixelateValue]}
                    min={4}
                    max={60}
                    step={1}
                    onValueChange={([v]) =>
                      setAnnotations((prev) => ({
                        ...prev,
                        [currentStep!.id]: withPixelateBlockSize(prev[currentStep!.id], v, pixelateTarget.id),
                      }))
                    }
                    onValueCommit={([v]) => {
                      pushHistory({
                        ...annotations,
                        [currentStep!.id]: withPixelateBlockSize(annotations[currentStep!.id], v, pixelateTarget.id),
                      });
                    }}
                    className="flex-1"
                  />
                  <span className="text-xs font-mono w-10 text-right">
                    {pixelateValue}px
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
                <div className="text-[10px] text-[var(--sketch-fg-muted)] mt-0.5">
                  {spotlightTarget.index >= 0
                    ? `Editing region ${spotlightTarget.index + 1} of ${spotlightTarget.total}. Click a region on the canvas to switch.`
                    : "Default for new regions."}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <Slider
                    value={[Math.round(spotlightValue * 100)]}
                    min={10}
                    max={90}
                    step={5}
                    onValueChange={([v]) =>
                      setAnnotations((prev) => ({
                        ...prev,
                        [currentStep!.id]: withSpotlightIntensity(prev[currentStep!.id], v / 100, spotlightTarget.id),
                      }))
                    }
                    onValueCommit={([v]) => {
                      pushHistory({
                        ...annotations,
                        [currentStep!.id]: withSpotlightIntensity(annotations[currentStep!.id], v / 100, spotlightTarget.id),
                      });
                    }}
                    className="flex-1"
                  />
                  <span className="text-xs font-mono w-10 text-right">
                    {Math.round(spotlightValue * 100)}%
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
              {badgeTarget ? (
                <>
                  <div className="text-[10px] text-[var(--sketch-fg-muted)]">
                    Editing badge {badgeIndex + 1} of {(currentAnn?.editorBadges || []).length}.
                    Click a badge on the canvas to switch.
                  </div>
                  <div>
                    <Label className="text-xs font-mono">Badge Number</Label>
                    <Input
                      type="number"
                      min={1}
                      max={99}
                      value={badgeTarget.number}
                      onChange={(e) => updateBadge(badgeTarget.id, { number: Number(e.target.value) })}
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
                        value={badgeTarget.x}
                        onChange={(e) => updateBadge(badgeTarget.id, { x: Number(e.target.value) })}
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
                        value={badgeTarget.y}
                        onChange={(e) => updateBadge(badgeTarget.id, { y: Number(e.target.value) })}
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
                        value={badgeTarget.color || "#FBBF24"}
                        onChange={(e) => updateBadge(badgeTarget.id, { color: e.target.value })}
                        onBlur={() => pushHistory(annotations)}
                        className="w-8 h-8 rounded border border-[var(--sketch-fg-subtle)]/30"
                      />
                      <span className="text-xs font-mono text-[var(--sketch-fg-muted)]">
                        {badgeTarget.color || "#FBBF24"}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-[10px] text-[var(--sketch-fg-muted)]">
                  No badges on this scene yet.
                </p>
              )}

              <p className="text-[10px] text-[var(--sketch-fg-muted)]">
                Select the "Badge" tool and click the canvas to place one. Click
                again to place another - numbering continues from the last badge.
              </p>

              {(currentAnn?.editorBadges || []).length > 0 && (
                <button
                  onClick={() => {
                    pushHistory({
                      ...annotations,
                      [currentStep.id]: {
                        ...(annotations[currentStep.id] || {}),
                        editorBadges: [],
                      },
                    });
                    setSelectedRegion(null);
                  }}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear all badges ({(currentAnn?.editorBadges || []).length})
                </button>
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
              {/* Strength. A filter at full blast is rarely what you want on a
                  screenshot: sepia and high contrast both make small UI text
                  hard to read, so the useful range is well under 100%. */}
              {currentAnn?.editorColorFilter && currentAnn.editorColorFilter !== "none" && (
                <div>
                  <Label className="text-xs font-mono">Filter Opacity</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <Slider
                      value={[currentAnn?.editorColorFilterStrength ?? 100]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={([v]) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: {
                            ...prev[currentStep!.id],
                            editorColorFilterStrength: v,
                          },
                        }))
                      }
                      onValueCommit={([v]) => {
                        pushHistory({
                          ...annotations,
                          [currentStep!.id]: {
                            ...(annotations[currentStep!.id] || {}),
                            editorColorFilterStrength: v,
                          },
                        });
                      }}
                      className="flex-1"
                    />
                    <span className="text-xs font-mono w-10 text-right">
                      {currentAnn?.editorColorFilterStrength ?? 100}%
                    </span>
                  </div>
                </div>
              )}

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
                <Label className="text-xs font-mono">
                  {timelineClips[currentStepIndex]?.isVideo ? "Keyframes" : "Zoom Points"} (
                  {currentAnn?.editorMultiZooms?.length || 0})
                </Label>
                <button
                  onClick={() => {
                    pushHistory({
                      ...annotations,
                      [currentStep!.id]: withZoomPoints(annotations[currentStep!.id], []),
                    });
                  }}
                  className="text-[10px] text-red-500 hover:text-red-600"
                >
                  Clear all
                </button>
              </div>

              {/* One zoom depth for the whole scene, not one per point.
                  Each point used to carry its own Zoom Scale slider, and the
                  renderer cannot do that: computeWaypointCamera takes
                  `Math.max(...waypoints.map(w => w.zoomScale))` and holds that
                  single depth across the entire move. So setting point 1 to 2x
                  and point 2 to 4x gave 4x on both, and every slider except the
                  highest was decoration. Showing one control that works beats
                  three that mostly do not. */}
              {!timelineClips[currentStepIndex]?.isVideo &&
                (currentAnn?.editorMultiZooms?.length ?? 0) > 0 && (
                  <div className="rounded-lg border border-[var(--sketch-border-color)]/40 bg-[var(--sketch-fg-subtle)]/[0.04] p-2.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold">How far to zoom</Label>
                      <span className="text-[11px] font-mono font-bold text-[var(--sketch-fg)]">
                        {(sceneZoomScale).toFixed(1)}x
                      </span>
                    </div>
                    <Slider
                      value={[sceneZoomScale]}
                      min={1.2}
                      max={4}
                      step={0.1}
                      onValueChange={([v]) =>
                        setAnnotations((prev) => ({
                          ...prev,
                          [currentStep!.id]: withSceneZoomScale(prev[currentStep!.id], v),
                        }))
                      }
                      onValueCommit={([v]) =>
                        pushHistory({
                          ...annotations,
                          [currentStep!.id]: withSceneZoomScale(annotations[currentStep!.id], v),
                        })
                      }
                      className="mt-2"
                    />
                    <p className="mt-1 text-[9px] text-[var(--sketch-fg-muted)]">
                      1.5x mild - 2.0x standard - 3.0x close-up - 4.0x extreme.
                      Applies to every zoom point on this scene.
                    </p>
                  </div>
                )}

              {/* Zoom on video is not implemented yet: renderVideoSegment plays
                  the footage without a camera move, so points placed here would
                  silently do nothing at export. Say so rather than let someone
                  spend a credit finding out. */}
              {/* Video scenes use time-anchored keyframes instead of sequenced
                  zoom points: footage already has a timeline, so the camera is
                  pinned to moments in it rather than dictating its length. */}
              {timelineClips[currentStepIndex]?.isVideo && (
                <div className="space-y-2 rounded-lg border border-[var(--sketch-border-color)]/30 bg-[var(--sketch-fg-subtle)]/5 p-2.5">
                  <p className="text-[10px] leading-relaxed text-[var(--sketch-fg-subtle)]">
                    Play the clip, pause where you want the camera, click the
                    canvas to set the target, then add a keyframe.
                  </p>
                  <button
                    onClick={() => {
                      const v = imageRef.current as HTMLVideoElement | null;
                      if (!v || !currentStep) return;
                      const atSec = Number(v.currentTime.toFixed(2));
                      const existing = currentAnn?.editorMultiZooms ?? [];
                      const next = {
                        ...annotations,
                        [currentStep.id]: {
                          ...(annotations[currentStep.id] || {}),
                          editorMultiZooms: [
                            ...existing.filter((k) => Math.abs((k.atSec ?? -1) - atSec) > 0.05),
                            {
                              id: `kf_${Date.now().toString(36)}`,
                              atSec,
                              targetX: currentAnn?.zoomTargetX ?? 50,
                              targetY: currentAnn?.zoomTargetY ?? 50,
                              zoomScale: currentAnn?.editorZoomScale && currentAnn.editorZoomScale > 1
                                ? currentAnn.editorZoomScale
                                : 2,
                            },
                          ].sort((a, b) => (a.atSec ?? 0) - (b.atSec ?? 0)),
                        },
                      };
                      pushHistory(next);
                      toast.success(`Keyframe added at ${atSec.toFixed(1)}s`);
                    }}
                    title="Add a camera keyframe at the clip's current time"
                    aria-label="Add a camera keyframe at the current time"
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--sketch-accent)]/40 bg-[var(--sketch-accent)]/10 py-2 text-[11px] font-bold text-[var(--sketch-accent)] hover:bg-[var(--sketch-accent)]/20"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add keyframe at current time
                  </button>
                </div>
              )}

              {(currentAnn?.editorMultiZooms?.length ?? 0) > 0 &&
                currentStep?.screenshotPath &&
                !timelineClips[currentStepIndex]?.isVideo && (
                <button
                  onClick={() => setShowScenePreview(true)}
                  title="Play this scene's camera move without rendering"
                  aria-label="Preview this scene"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--sketch-accent)] py-2.5 text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-90"
                >
                  <Play className="h-4 w-4" />
                  Preview camera move
                  <span className="font-normal opacity-80">- free, no render</span>
                </button>
              )}

              {/* Adding zoom points lengthens the scene, and until now nothing
                  said so. The renderer extends the clip to fit the camera move
                  and pads the narration with silence. Show both numbers. */}
              {sceneTiming && sceneTiming.cameraSec > 0 && (
                <div
                  className={`rounded-lg border px-2.5 py-2 text-[11px] leading-relaxed ${
                    sceneTiming.silenceSec > 1.5
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-700 "
                      : "border-[var(--sketch-border-color)]/30 bg-[var(--sketch-fg-subtle)]/5 text-[var(--sketch-fg-muted)]"
                  }`}
                >
                  {/* The headline number, at a size that matches how much it
                      matters: it is how long this scene will run for. The two
                      figures it is made of sit underneath as the explanation. */}
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide">
                      Scene length
                    </span>
                    <span className="font-mono text-2xl font-bold leading-none text-[var(--sketch-fg)]">
                      {sceneTiming.sceneSec.toFixed(1)}s
                    </span>
                  </div>
                  <div className="mt-2 space-y-0.5 border-t border-current/15 pt-1.5">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span>Camera needs</span>
                      <span className="font-semibold">{sceneTiming.cameraSec.toFixed(1)}s</span>
                    </div>
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span>Narration</span>
                      <span className="font-semibold">{sceneTiming.narrationSec.toFixed(1)}s</span>
                    </div>
                  </div>
                  {sceneTiming.silenceSec > 1.5 && (
                    <p className="mt-1.5 font-sans">
                      The camera outlasts your narration by{" "}
                      <strong>{sceneTiming.silenceSec.toFixed(1)}s</strong>, which will
                      play as silence. Write a longer script, shorten the holds, or
                      remove a zoom point.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                {currentAnn?.editorMultiZooms?.map((mz, idx) => (
                  <div key={mz.id} className="p-2 border border-[var(--sketch-fg-subtle)]/20 rounded bg-[var(--sketch-fg-subtle)]/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-semibold">Point {idx + 1}</span>
                      <button
                        onClick={() => {
                          setAnnotations((prev) => {
                            const stepAnn = prev[currentStep.id] || {};
                            // Removing the last point disarms the single-zoom
                            // fallback as well, same as "Clear all".
                            const updated = withZoomPoints(
                              stepAnn,
                              stepAnn.editorMultiZooms?.filter((z) => z.id !== mz.id) || []
                            );
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

          {/* Highlight Properties (multiple boxes) */}
          {activeTab === "highlight" && (
            <div className="space-y-3">
              <p className="text-[10px] text-[var(--sketch-fg-muted)]">
                Drag on the canvas to add a highlight box. You can add multiple highlights.
              </p>
              {(currentAnn?.editorHighlights || []).length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-mono">Active Highlights ({(currentAnn?.editorHighlights || []).length})</Label>
                  {(currentAnn?.editorHighlights || []).map((hl, idx) => (
                    <div key={hl.id} className="flex items-center justify-between text-xs bg-[var(--sketch-fg-subtle)]/10 rounded px-2 py-1">
                      <span className="font-mono">Box {idx + 1}: {hl.w.toFixed(1)}% × {hl.h.toFixed(1)}%</span>
                      <button
                        title={`Remove highlight box ${idx + 1}`}
                        aria-label={`Remove highlight box ${idx + 1}`}
                        onClick={() => {
                          const next = {
                            ...annotations,
                            [currentStep!.id]: {
                              ...(annotations[currentStep!.id] || {}),
                              editorHighlights: (currentAnn?.editorHighlights || []).filter((r) => r.id !== hl.id),
                            },
                          };
                          pushHistory(next);
                        }}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => {
                  const next = {
                    ...annotations,
                    [currentStep!.id]: {
                      ...(annotations[currentStep!.id] || {}),
                      editorHighlights: [],
                    },
                  };
                  pushHistory(next);
                }}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
                disabled={(currentAnn?.editorHighlights || []).length === 0}
              >
                <Trash2 className="w-3 h-3" />
                Clear all highlights
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

  const toggleRightTab = (tab: "properties" | "script" | "voiceover" | "elevenlabs" | "captions" | "transitions" | "safety" | "help" | "media" | "introoutro") => {
    const newTab = activeRightTab === tab ? null : tab;
    setActiveRightTab(newTab);
    // On mobile, open the sidebar overlay when selecting a tab
    if (newTab && window.innerWidth < 768) {
      setIsMobileSidebarOpen(true);
    }
  };

  // Script generation state
  const [scriptMode, setScriptMode] = useState<"ai" | "manual">("ai");
  const [manualScriptText, setManualScriptText] = useState("");
  const regenerateStep = trpc.ai.regenerateStepScript.useMutation();

  useEffect(() => {
    if (!props.focusPanel) return;

    setActiveRightTab(props.focusPanel);
    if (props.focusPanel === "script") {
      setScriptMode(props.focusScriptMode || "ai");
    }
    if (window.innerWidth < 768) {
      setIsMobileSidebarOpen(true);
    }
  }, [props.focusPanel, props.focusScriptMode]);

  const openNarrationPanel = (panel: "script" | "voiceover", mode?: "ai" | "manual") => {
    setShowRenderPreflight(false);
    setActiveRightTab(panel);
    if (panel === "script" && mode) {
      setScriptMode(mode);
    }
    if (window.innerWidth < 768) {
      setIsMobileSidebarOpen(true);
    }
  };

  const continueToRender = (allowSilent: boolean) => {
    const options: EditorExportOptions = {
      allowSilent,
      captionsEnabled: allowSilent ? false : props.captionsEnabled,
    };

    if (props.onContinue) {
      props.onContinue(options);
      return;
    }

    window.location.href = `/create/${projectIdNum}/render${allowSilent ? "?allowSilent=true" : ""}`;
  };

  const persistSilentExport = async () => {
    await updateProject.mutateAsync({
      id: projectIdNum,
      voice: "none",
      captionsEnabled: false,
    });
    setSavedVoice("none");
    setSelectedVoice("none");
    props.onCaptionsEnabledChange?.(false);
    await utils.project.getById.invalidate({ id: projectIdNum });
  };

  const handleExportRequest = async () => {
    if (isPreparingExport) return;

    setIsPreparingExport(true);
    try {
      // This flushes annotation and focused script edits before readiness is
      // evaluated, so the preflight reflects exactly what is on screen.
      await handleSaveAllSteps();

      const result = getRenderPreflight(
        steps,
        savedVoice ?? project?.voice,
        allSceneTexts,
      );
      setRenderPreflight(result);

      if (result.requiresConfirmation) {
        setShowRenderPreflight(true);
        return;
      }

      if (result.isExplicitlySilent) {
        await persistSilentExport();
        continueToRender(true);
        return;
      }

      continueToRender(false);
    } catch (err: any) {
      toast.error(err.message || "Could not prepare this video for export.");
    } finally {
      setIsPreparingExport(false);
    }
  };

  const handleContinueSilently = async () => {
    if (isPreparingExport) return;

    setIsPreparingExport(true);
    try {
      await persistSilentExport();
      setShowRenderPreflight(false);
      continueToRender(true);
    } catch (err: any) {
      toast.error(err.message || "Could not switch this project to silent export.");
    } finally {
      setIsPreparingExport(false);
    }
  };

  const handleGenerateScriptsFromPreflight = async () => {
    openNarrationPanel("script", "ai");

    const blankSteps = steps.filter((step) => {
      const description =
        allSceneTexts[step.id]?.desc ?? step.description ?? "";
      return !description.trim() || /^scene\s+\d+$/i.test(description.trim());
    });

    if (blankSteps.length > 0) {
      toast.error(
        `Scene ${blankSteps[0].order} needs a description before AI can generate its script.`,
      );
      return;
    }

    try {
      await generateScript.mutateAsync({ projectId: projectIdNum });
      await Promise.all([
        utils.step.listByProject.invalidate({ projectId: projectIdNum }),
        utils.project.getById.invalidate({ id: projectIdNum }),
      ]);
      editedScenesRef.current.clear();
      setAllSceneTexts({});
      toast.success("Scripts generated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate scripts.");
    }
  };

  const saveVoiceSelection = async (premium = false) => {
    try {
      const silent = isSilentVoice(selectedVoice);
      await updateProject.mutateAsync({
        id: projectIdNum,
        voice: selectedVoice,
        speed: voiceSpeed,
        ...(silent ? { captionsEnabled: false } : {}),
      });
      setSavedVoice(selectedVoice);
      if (silent) {
        props.onCaptionsEnabledChange?.(false);
      }
      await utils.project.getById.invalidate({ id: projectIdNum });
      toast.success(
        silent
          ? "Voiceover set to None. Captions were turned off."
          : premium
            ? "ElevenLabs premium voice updated successfully!"
            : "Voiceover settings updated successfully!",
      );
    } catch (err: any) {
      toast.error(
        err.message ||
          (premium
            ? "Failed to update ElevenLabs voice."
            : "Failed to update voiceover settings."),
      );
    }
  };

  const renderScriptContent = () => {
    if (!currentStep) return null;
    return (
      <div className="flex-1 flex flex-col h-full min-h-0 space-y-3 relative">
        {/* Says out loud that the drafted narration is editable. It arrives
            written, which reads as finished unless something says otherwise -
            people were not editing it because nothing told them they could. */}
        <p className="flex-shrink-0 rounded-md border border-[var(--sketch-border-color)]/40 bg-[var(--sketch-fg-subtle)]/[0.06] px-2.5 py-2 text-[11px] leading-relaxed text-[var(--sketch-fg-muted)]">
          Every line below is editable. Click into any scene's script and change
          it, or rewrite the lot with AI Generate. Your edits are what gets
          spoken in the video.
        </p>

        {/* Mode Toggle: AI vs Manual */}
        <div className="flex items-center gap-1 p-0.5 bg-[var(--sketch-bg)] rounded-lg border border-[var(--sketch-border-color)]/20 flex-shrink-0">
          <button
            onClick={() => setScriptMode("ai")}
            className={`flex items-center justify-center gap-1.5 flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all cursor-pointer ${scriptMode === "ai"
                ? "bg-[var(--sketch-accent)]/15 text-[var(--sketch-fg)]"
                : "text-[var(--sketch-fg-subtle)] hover:text-[var(--sketch-fg-muted)]"
              }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>AI Generate</span>
          </button>
          <button
            onClick={() => setScriptMode("manual")}
            className={`flex items-center justify-center gap-1.5 flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all cursor-pointer ${scriptMode === "manual"
                ? "bg-[var(--sketch-accent)]/15 text-[var(--sketch-fg)]"
                : "text-[var(--sketch-fg-subtle)] hover:text-[var(--sketch-fg-muted)]"
              }`}
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Write / Paste</span>
          </button>
        </div>

        {/* AI Generate Mode */}
        {scriptMode === "ai" ? (
          <>
            {scriptViewMode === "all" ? (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
                  {steps.map((s, idx) => {
                    const textState = allSceneTexts[s.id] || { desc: s.description || "", script: s.userEditedScript ?? s.aiScript ?? "" };
                    const gibberish = detectGibberish(textState.desc);
                    const scriptGibberish = detectGibberish(textState.script);

                    return (
                      <div key={s.id} className="p-3 border border-[var(--sketch-border-color)]/20 bg-[var(--sketch-card-bg)]/30 rounded-xl space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-[var(--sketch-bg)] border border-[var(--sketch-border-color)]/25 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {s.screenshotPath ? (
                              <img
                                src={stepThumbUrl(s.id, s.screenshotPath) ?? s.screenshotPath}
                                alt=""
                                width={40}
                                height={40}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="font-mono text-xs text-[var(--sketch-fg-subtle)]">{idx + 1}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-bold text-[var(--sketch-fg)] block">Scene {idx + 1}</span>
                            <span className="text-xs text-[var(--sketch-fg-subtle)] truncate block">
                              {textState.script ? `${textState.script.split(/\s+/).length} words` : "No script"}
                            </span>
                          </div>
                        </div>

                        {/* Scene Description input */}
                        <div>
                          <Label className="text-xs font-bold text-[var(--sketch-fg-muted)] block mb-1">Scene Description</Label>
                          <Textarea
                            value={textState.desc}
                            onChange={(e) => {
                              const val = e.target.value;
                              editedScenesRef.current.add(s.id);
                              setAllSceneTexts(prev => ({ ...prev, [s.id]: { ...prev[s.id], desc: val } }));
                            }}
                            onBlur={async () => {
                              await updateStep.mutateAsync({ id: s.id, description: textState.desc });
                              utils.project.getById.invalidate({ id: projectIdNum });
                            }}
                            placeholder="Describe what happens in this scene... Required."
                            maxLength={SCENE_DESC_MAX}
                            className={`text-sm min-h-[60px] bg-[var(--sketch-card-bg)] border border-[var(--sketch-border-color)]/25 text-[var(--sketch-fg)] placeholder:text-[var(--sketch-fg-muted)]/50 focus:border-blue-500 focus:ring-1 focus:ring-[var(--sketch-accent)] ${
                              (!textState.desc.trim() || /^scene\s+\d+$/i.test(textState.desc.trim()) || gibberish.isGibberish) ? "border-amber-500/50" : ""
                            }`}
                          />
                          <p className={`text-[10px] mt-0.5 text-right font-mono ${
                            textState.desc.length >= SCENE_DESC_MAX
                              ? "text-amber-600 font-bold"
                              : "text-[var(--sketch-fg-subtle)]"
                          }`}>
                            {textState.desc.length}/{SCENE_DESC_MAX}
                          </p>
                          {(!textState.desc.trim() || /^scene\s+\d+$/i.test(textState.desc.trim())) && (
                            <p className="text-xs font-medium text-amber-600 mt-1 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> Description is required for script generation.
                            </p>
                          )}
                          {textState.desc.trim() && gibberish.isGibberish && (
                            <p className="text-xs font-medium text-amber-600 mt-1 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> {gibberish.reason}
                            </p>
                          )}
                        </div>

                        {/* Narration Script input */}
                        <div>
                          <Label className="text-xs font-bold text-[var(--sketch-fg-muted)] block mb-1">Narration Script (TTS)</Label>
                          <Textarea
                            value={textState.script}
                            onChange={(e) => {
                              const val = e.target.value;
                              editedScenesRef.current.add(s.id);
                              setAllSceneTexts(prev => ({ ...prev, [s.id]: { ...prev[s.id], script: val } }));
                            }}
                            onBlur={async () => {
                              await updateStep.mutateAsync({ id: s.id, userEditedScript: textState.script });
                              utils.project.getById.invalidate({ id: projectIdNum });
                            }}
                            placeholder="Narration text goes here..."
                            className={`text-sm min-h-[70px] bg-[var(--sketch-card-bg)] border border-[var(--sketch-border-color)]/25 text-[var(--sketch-fg)] placeholder:text-[var(--sketch-fg-muted)]/50 focus:border-blue-500 focus:ring-1 focus:ring-[var(--sketch-accent)] ${
                              (textState.script.trim() && scriptGibberish.isGibberish) ? "border-red-500/50" : ""
                            }`}
                          />
                          {textState.script.trim() && scriptGibberish.isGibberish && (
                            <p className="text-xs font-medium text-red-500 mt-1 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> {scriptGibberish.reason}
                            </p>
                          )}
                        </div>

                        {/* Action buttons for this specific scene */}
                        <div className="flex justify-end pt-1">
                          <button
                            onClick={async () => {
                              if (!textState.desc.trim() || /^scene\s+\d+$/i.test(textState.desc.trim())) {
                                toast.error(`Please write a description for Scene ${idx + 1} first.`);
                                return;
                              }
                              try {
                                const result = await regenerateStep.mutateAsync({ stepId: s.id });
                                if (result?.script) {
                                  setAllSceneTexts(prev => ({
                                    ...prev,
                                    [s.id]: { ...prev[s.id], script: result.script }
                                  }));
                                  utils.project.getById.invalidate({ id: projectIdNum });
                                  toast.success(`Script regenerated for Scene ${idx + 1}!`);
                                }
                              } catch (err: any) {
                                toast.error(err.message || "Failed to regenerate script.");
                              }
                            }}
                            disabled={regenerateStep.isPending}
                            className="flex items-center gap-1.5 py-1.5 px-3 bg-[var(--sketch-accent)]/10 hover:bg-[var(--sketch-accent)]/20 disabled:opacity-50 text-[var(--sketch-fg)] text-xs font-bold rounded-md transition-all cursor-pointer border border-[var(--sketch-accent)]/20"
                          >
                            {regenerateStep.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                <RotateCw className="w-3 h-3" />
                                <span>Regenerate Scene {idx + 1}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Sticky Generate All Scripts button at the bottom */}
                <div className="pt-3 pb-1 border-t border-[var(--sketch-border-color)]/20 mt-2 space-y-2 flex-shrink-0 bg-[var(--sketch-panel-bg)]">
                  <button
                    onClick={async () => {
                      const blankSteps = steps.filter(s => {
                        const txt = allSceneTexts[s.id]?.desc || s.description || "";
                        return !txt.trim() || /^scene\s+\d+$/i.test(txt.trim());
                      });
                      if (blankSteps.length > 0) {
                        toast.error(`Scene ${blankSteps[0].order} has no description. Please write a description before generating scripts.`);
                        return;
                      }
                      try {
                        await generateScript.mutateAsync({ projectId: projectIdNum });
                        utils.step.listByProject.invalidate({ projectId: projectIdNum });
                        utils.project.getById.invalidate({ id: projectIdNum });
                        editedScenesRef.current.clear();
                        setAllSceneTexts({});
                        toast.success("Scripts generated successfully!");
                      } catch (err: any) {
                        toast.error(err.message || "Failed to generate scripts.");
                      }
                    }}
                    disabled={generateScript.isPending}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-bold rounded-md shadow-sm transition-all cursor-pointer border border-black/10"
                  >
                    {generateScript.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>AI is generating scripts...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        <span>Generate All Scripts (Text AI)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col space-y-4 overflow-y-auto min-h-0 pr-1">
                <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pr-1 pb-2">
                  {/* Scene Description */}
                  <div>
                    <Label className="text-sm font-bold text-[var(--sketch-fg-muted)] block mb-1">Scene Description</Label>
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
                      placeholder="Describe what happens in this scene (e.g. 'Click the login button'). Required to generate voiceover narration."
                      maxLength={SCENE_DESC_MAX}
                      className="text-sm min-h-[85px] bg-[var(--sketch-card-bg)] border-[var(--sketch-border-color)]/20 text-[var(--sketch-fg)] placeholder:text-[var(--sketch-fg-muted)]/50 focus:border-blue-500 focus:ring-1 focus:ring-[var(--sketch-accent)]"
                    />
                    <div className="flex items-start justify-between gap-3 mt-1">
                      <p className="text-xs text-[var(--sketch-fg-subtle)]">
                        The AI uses this description to write the voiceover narration.
                      </p>
                      <span className={`text-[10px] font-mono flex-shrink-0 ${
                        tempDesc.length >= SCENE_DESC_MAX
                          ? "text-amber-600 font-bold"
                          : "text-[var(--sketch-fg-subtle)]"
                      }`}>
                        {tempDesc.length}/{SCENE_DESC_MAX}
                      </span>
                    </div>
                  </div>

                  {/* Narration Script (TTS) */}
                  <div>
                    <Label className="text-sm font-bold text-[var(--sketch-fg-muted)] block mb-1">Narration Script (TTS)</Label>
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
                      placeholder="AI-generated narration will appear here..."
                      className="text-sm min-h-[130px] bg-[var(--sketch-card-bg)] border-[var(--sketch-border-color)]/20 text-[var(--sketch-fg)] placeholder:text-[var(--sketch-fg-muted)]/50 focus:border-blue-500 focus:ring-1 focus:ring-[var(--sketch-accent)]"
                    />
                  </div>

                  {/* Scene Navigation */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-[var(--sketch-border-color)]/20 mt-2">
                    <button
                      disabled={currentStepIndex === 0}
                      onClick={() => setCurrentStepIndex(currentStepIndex - 1)}
                      className="flex items-center gap-1.5 text-xs font-bold text-[var(--sketch-fg-muted)] hover:text-[var(--sketch-fg)] transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" /> Prev Scene
                    </button>
                    <span className="text-xs font-mono text-[var(--sketch-fg-subtle)] font-bold">
                      Scene {currentStepIndex + 1} / {steps.length}
                    </span>
                    <button
                      disabled={currentStepIndex === steps.length - 1}
                      onClick={() => setCurrentStepIndex(currentStepIndex + 1)}
                      className="flex items-center gap-1.5 text-xs font-bold text-[var(--sketch-fg-muted)] hover:text-[var(--sketch-fg)] transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    >
                      Next Scene <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Generate buttons */}
                <div className="pt-3 border-t border-[var(--sketch-border-color)]/20 mt-3 space-y-2 flex-shrink-0">
                  {/* Generate all */}
                  <button
                    onClick={async () => {
                      const blankSteps = steps.filter(s => !s.description || !s.description.trim() || /^scene\s+\d+$/i.test(s.description.trim()));
                      if (blankSteps.length > 0) {
                        toast.error(`Scene ${blankSteps[0].order} has no description. Please write a description before generating scripts.`);
                        return;
                      }
                      try {
                        await generateScript.mutateAsync({ projectId: projectIdNum });
                        utils.step.listByProject.invalidate({ projectId: projectIdNum });
                        utils.project.getById.invalidate({ id: projectIdNum });
                        toast.success("Scripts generated successfully!");
                      } catch (err: any) {
                        toast.error(err.message || "Failed to generate scripts.");
                      }
                    }}
                    disabled={generateScript.isPending}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-bold rounded-md shadow-sm transition-all cursor-pointer border border-black/10"
                  >
                    {generateScript.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>AI is generating scripts...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        <span>Generate All Scripts (Text AI)</span>
                      </>
                    )}
                  </button>

                  {/* Regenerate just this step */}
                  <button
                    onClick={async () => {
                      if (!tempDesc || !tempDesc.trim() || /^scene\s+\d+$/i.test(tempDesc.trim())) {
                        toast.error("Please write a scene description before regenerating script.");
                        return;
                      }
                      try {
                        const result = await regenerateStep.mutateAsync({ stepId: currentStep.id });
                        if (result?.script) {
                          setTempScript(result.script);
                          utils.project.getById.invalidate({ id: projectIdNum });
                          toast.success("Script regenerated for this scene!");
                        }
                      } catch (err: any) {
                        toast.error(err.message || "Failed to regenerate script.");
                      }
                    }}
                    disabled={regenerateStep.isPending}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-[var(--sketch-accent)]/10 hover:bg-[var(--sketch-accent)]/20 disabled:opacity-50 text-[var(--sketch-fg)] text-xs font-bold rounded-md transition-all cursor-pointer border border-[var(--sketch-accent)]/20"
                  >
                    {regenerateStep.isPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Regenerating this scene...</span>
                      </>
                    ) : (
                      <>
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Regenerate this scene only</span>
                      </>
                    )}
                  </button>

                  <p className="text-xs text-[var(--sketch-fg-muted)] leading-relaxed">
                    The AI uses the video title, description, and your step/scene description to write the narration for each step using gpt-oss:120b.
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Manual Write / Paste Mode */
          <>
            {scriptViewMode === "all" ? (
              <div className="flex-1 flex flex-col space-y-4 min-h-0">
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
                  {/* Collapsible Bulk Paste Section */}
                  <details className="border border-[var(--sketch-border-color)]/20 rounded-xl bg-[var(--sketch-card-bg)]/20 overflow-hidden group mb-2">
                    <summary className="p-2.5 text-xs font-bold text-[var(--sketch-fg-muted)] hover:text-[var(--sketch-fg)] cursor-pointer list-none flex items-center justify-between transition-colors">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Bulk Paste Full Script (Optional)</span>
                      </span>
                      <span className="text-xs text-[var(--sketch-fg-subtle)] group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="p-3 border-t border-[var(--sketch-border-color)]/10 space-y-3 bg-[var(--sketch-bg)]/40">
                      <div className="p-2.5 bg-[var(--sketch-accent)]/8 border border-[var(--sketch-accent)]/25 rounded-lg flex items-start gap-2">
                        <FileText className="w-4 h-4 text-[var(--sketch-accent)] flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-[var(--sketch-fg-muted)] leading-relaxed">
                          Paste your script from Claude/ChatGPT here. Each paragraph automatically updates a scene's narration below.
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs font-bold text-[var(--sketch-fg-muted)] block mb-1">
                          Paste Full Script <span className="text-[var(--sketch-fg-subtle)] font-normal">(one paragraph per scene)</span>
                        </Label>
                        <Textarea
                          value={manualScriptText}
                          onChange={(e) => setManualScriptText(e.target.value)}
                          placeholder={`Welcome to this tutorial on React setup. Today we'll learn...\n\nFirst, open your terminal and run npm create vite...`}
                          className="text-sm min-h-[120px] bg-[var(--sketch-card-bg)] border-[var(--sketch-border-color)]/20 text-[var(--sketch-fg)] placeholder:text-[var(--sketch-fg-muted)]/50 focus:border-blue-500 focus:ring-1 focus:ring-[var(--sketch-accent)] font-mono"
                        />
                      </div>
                      <button
                        onClick={async () => {
                          if (!manualScriptText.trim()) {
                            toast.error("Paste a script first!");
                            return;
                          }
                          const paragraphs = manualScriptText
                            .trim()
                            .split(/\n\s*\n/)
                            .map((p) => p.trim())
                            .filter((p) => p.length > 5);

                          const scenes = paragraphs.length > 1
                            ? paragraphs
                            : manualScriptText.trim().split("\n").map((s) => s.trim()).filter((s) => s.length > 5);

                          if (scenes.length === 0) {
                            toast.error("Could not parse scenes from the script.");
                            return;
                          }

                          for (let i = 0; i < steps.length && i < scenes.length; i++) {
                            await updateStep.mutateAsync({
                              id: steps[i].id,
                              userEditedScript: scenes[i],
                              aiScript: scenes[i],
                            });
                          }

                          if (scenes.length > steps.length) {
                            toast.info(`Applied ${steps.length} scenes. Extra scenes were not applied.`);
                          }

                          utils.project.getById.invalidate({ id: projectIdNum });
                          utils.step.listByProject.invalidate({ projectId: projectIdNum });
                          editedScenesRef.current.clear();
                          setAllSceneTexts({}); // force reload
                          toast.success(`Applied ${Math.min(scenes.length, steps.length)} scripts!`);
                          setManualScriptText("");
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-md transition-all cursor-pointer border border-black/10"
                      >
                        Apply Script to Scenes
                      </button>
                    </div>
                  </details>

                  {/* Header/Label */}
                  <div className="pt-2">
                    <span className="text-xs font-bold text-[var(--sketch-fg-muted)] uppercase tracking-wider block mb-2">
                      Narration Script by Scene
                    </span>
                  </div>

                  {/* List of all steps with individual text boxes */}
                  {steps.map((s, idx) => {
                    const textState = allSceneTexts[s.id] || { desc: s.description || "", script: s.userEditedScript ?? s.aiScript ?? "" };
                    const scriptGibberish = detectGibberish(textState.script);

                    return (
                      <div key={s.id} className="p-3 border border-[var(--sketch-border-color)]/20 bg-[var(--sketch-card-bg)]/30 rounded-xl space-y-3 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-[var(--sketch-bg)] border border-[var(--sketch-border-color)]/25 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {s.screenshotPath ? (
                              <img
                                src={stepThumbUrl(s.id, s.screenshotPath) ?? s.screenshotPath}
                                alt=""
                                width={40}
                                height={40}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="font-mono text-xs text-[var(--sketch-fg-subtle)]">{idx + 1}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-bold text-[var(--sketch-fg)] block">Scene {idx + 1}</span>
                            <span className="text-xs text-[var(--sketch-fg-subtle)] truncate block">
                              {textState.script ? `${textState.script.split(/\s+/).length} words` : "No script"}
                            </span>
                          </div>
                        </div>

                        {/* Narration Script input */}
                        <div>
                          <Label className="text-xs font-bold text-[var(--sketch-fg-muted)] block mb-1">Narration Script (TTS)</Label>
                          <Textarea
                            value={textState.script}
                            onChange={(e) => {
                              const val = e.target.value;
                              editedScenesRef.current.add(s.id);
                              setAllSceneTexts(prev => ({ ...prev, [s.id]: { ...prev[s.id], script: val } }));
                            }}
                            onBlur={async () => {
                              await updateStep.mutateAsync({ id: s.id, userEditedScript: textState.script });
                              utils.project.getById.invalidate({ id: projectIdNum });
                            }}
                            placeholder="Type or paste narration script for this scene..."
                            className={`text-sm min-h-[80px] bg-[var(--sketch-card-bg)] border border-[var(--sketch-border-color)]/25 text-[var(--sketch-fg)] placeholder:text-[var(--sketch-fg-muted)]/50 focus:border-blue-500 focus:ring-1 focus:ring-[var(--sketch-accent)] ${
                              (textState.script.trim() && scriptGibberish.isGibberish) ? "border-red-500/50" : ""
                            }`}
                          />
                          {textState.script.trim() && scriptGibberish.isGibberish && (
                            <p className="text-xs font-medium text-red-500 mt-1 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> {scriptGibberish.reason}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Manual Mode + Current Scene */
              <div className="flex-1 flex flex-col space-y-4 min-h-0">
                <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pr-1 pb-2">
                  {/* Narration Script (TTS) */}
                  <div>
                    <Label className="text-xs font-bold text-[var(--sketch-fg-muted)] block mb-1">Narration Script (TTS)</Label>
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
                      placeholder="Write or paste narration for this scene..."
                      className="text-sm min-h-[180px] bg-[var(--sketch-card-bg)] border-[var(--sketch-border-color)]/20 text-[var(--sketch-fg)] placeholder:text-[var(--sketch-fg-muted)]/50 focus:border-blue-500 focus:ring-1 focus:ring-[var(--sketch-accent)]"
                    />
                  </div>

                  {/* Scene Navigation */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-[var(--sketch-border-color)]/20 mt-2">
                    <button
                      disabled={currentStepIndex === 0}
                      onClick={() => setCurrentStepIndex(currentStepIndex - 1)}
                      className="flex items-center gap-1.5 text-xs font-bold text-[var(--sketch-fg-muted)] hover:text-[var(--sketch-fg)] transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" /> Prev Scene
                    </button>
                    <span className="text-xs font-mono text-[var(--sketch-fg-subtle)] font-bold">
                      Scene {currentStepIndex + 1} / {steps.length}
                    </span>
                    <button
                      disabled={currentStepIndex === steps.length - 1}
                      onClick={() => setCurrentStepIndex(currentStepIndex + 1)}
                      className="flex items-center gap-1.5 text-xs font-bold text-[var(--sketch-fg-muted)] hover:text-[var(--sketch-fg)] transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    >
                      Next Scene <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-[var(--sketch-card-bg)] border border-[var(--sketch-border-color)]/10 rounded-lg flex-shrink-0 flex items-start gap-2">
                  <FileText className="w-4 h-4 text-[var(--sketch-accent)] flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-[var(--sketch-fg-subtle)] leading-relaxed">
                    Directly write your narration voiceover here. Changes are saved automatically when clicking outside the input box.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderVoiceoverContent = () => {
    if (!currentStep) return null;

    return (
      <div className="flex flex-col h-full relative overflow-hidden">
        <div className="flex-1 overflow-y-auto py-1 pr-1 space-y-4 min-h-0">
          {/* First, and styled to be seen, because it decides whether the voice
              settings below apply to this scene at all. It previously sat in the
              same faint card as "Test voice" and everything under it, so the one
              control that overrides the whole panel looked like the least
              important thing on it. */}
          <OwnVoiceRecorder
            stepId={currentStep.id}
            sceneNumber={currentStep.order}
            state={{
              audioSource: (currentStep as { audioSource?: "tts" | "upload" }).audioSource ?? "tts",
              audioDuration: currentStep.audioDuration ?? null,
            }}
            onChanged={async () => {
              // Both, because the panel reads `currentStep` out of
              // `project.getById`. Invalidating only listByProject left the
              // recorder showing "Record here or upload a file" straight after a
              // recording had been attached, because the source of the
              // `audioSource` it renders from was never refetched.
              await Promise.all([
                utils.project.getById.invalidate({ id: projectIdNum }),
                utils.step.listByProject.invalidate({ projectId: projectIdNum }),
              ]);
            }}
          />

          {/* Tester for preview */}
          <div className="p-3 rounded-xl border border-[var(--sketch-border-color)]/20 bg-[var(--sketch-card-bg)]/50">
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-[10px] font-bold text-[var(--sketch-fg-muted)]">Test voice</Label>
            </div>
            <div className="flex gap-2">
              <Textarea
                value={testVoiceText}
                onChange={(e) => setTestVoiceText(e.target.value)}
                placeholder={(currentStep?.userEditedScript ?? currentStep?.aiScript) || "Type something to test..."}
                className="flex-1 text-xs min-h-[40px] resize-none"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const textToTest = testVoiceText.trim() || (currentStep?.userEditedScript ?? currentStep?.aiScript) || "Hi I am your AI guide.";
                  previewVoice.mutate({ voice: selectedVoice, speed: voiceSpeed, text: textToTest }, {
                    onSuccess: (data) => {
                      if (playingId === selectedVoice) {
                        audioRef.pause();
                      }
                      setPlayingId(selectedVoice);
                      audioRef.src = data.audioData;
                      audioRef.play();
                      audioRef.onended = () => {
                        setPlayingId(null);
                      };
                    },
                    onError: (err) => {
                      toast.error(err.message || "Failed to generate preview");
                    }
                  });
                }}
                disabled={previewVoice.isPending}
                className="flex-shrink-0 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center cursor-pointer"
              >
                {previewVoice.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              </button>
            </div>
          </div>

          {/* Voice Selection list */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[var(--sketch-fg-muted)] block">Select AI Voice</Label>
            <div className="space-y-1.5 pr-1">
              {voices.map((v) => {
                const isSelected = selectedVoice === v.id;
                const isPlaying = playingId === v.id;
                const isLoading = previewLoadingId === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVoice(v.id)}
                    className={`p-2 border rounded-lg flex items-center justify-between text-xs transition-all cursor-pointer ${isSelected
                        ? "border-brand bg-brand/5"
                        : "border-[var(--sketch-border-color)]/20 bg-[var(--sketch-card-bg)] hover:border-[var(--sketch-border-color)]/40"
                      }`}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[var(--sketch-fg)]">{v.name}</span>
                        {v.tag && (
                          <span className="text-[7px] text-blue-600 bg-blue-500/10 px-1 rounded border border-blue-500/20 font-bold">
                            {v.tag}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-[var(--sketch-fg-muted)]">
                        {v.accent === "-" ? "Mute" : `${v.accent} • ${v.gender}`}
                      </span>
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
              className="w-full h-1 bg-[var(--sketch-fg-subtle)]/10 appearance-none rounded cursor-pointer accent-brand"
            />
          </div>
        </div>

        {/* Set Voice action */}
        <div className="pt-3 pb-1 border-t border-[var(--sketch-border-color)]/20 bg-[var(--sketch-panel-bg)] flex-shrink-0 sticky bottom-0 z-10">
          <button
            onClick={() => saveVoiceSelection(false)}
            disabled={updateProject.isPending}
            className="w-full py-2 bg-brand hover:bg-brand-hover text-white disabled:opacity-50 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 border border-black/10 cursor-pointer shadow-md"
          >
            {updateProject.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
            Set Voice
          </button>
        </div>
      </div>
    );
  };

  const renderElevenLabsContent = () => {
    return (
      <div className="flex flex-col h-full relative overflow-hidden">
        <div className="flex-1 overflow-y-auto py-1 pr-1 space-y-4 min-h-0">
          {/* ElevenLabs voice list */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[var(--sketch-fg-muted)] block">Select ElevenLabs Voice</Label>

            {/* ── Bring your own key ── */}
            {!hasElevenLabsKey ? (
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2 mb-1">
                <div className="flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-bold text-[var(--sketch-fg)]">Bring your own ElevenLabs key</span>
                </div>
                <p className="text-[10px] leading-relaxed text-[var(--sketch-fg-muted)]">
                  Premium voices run on <strong>your own</strong> ElevenLabs API key (they have a free tier). Add it once and it's encrypted and reused for every render. Without a key, premium voices fall back to free built-in voices.
                </p>
                <div className="flex gap-1.5">
                  <Input
                    type="password"
                    value={elevenLabsKeyInput}
                    onChange={(e) => setElevenLabsKeyInput(e.target.value)}
                    placeholder="Paste API key (sk_…)"
                    className="flex-1 text-xs h-8"
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveElevenLabsKey(); }}
                  />
                  <button
                    onClick={handleSaveElevenLabsKey}
                    disabled={saveElevenLabsKey.isPending}
                    className="flex-shrink-0 px-3 h-8 bg-brand hover:bg-brand-hover text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {saveElevenLabsKey.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                  </button>
                </div>
                <a
                  href="/blog/elevenlabs-api-key-guide"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 hover:text-amber-500 hover:underline"
                >
                  How do I get an API key? Read the guide →
                </a>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1.5 mb-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs font-semibold text-[var(--sketch-fg)]">
                      Your key ••••{elevenLabsKeyStatus.data?.hint}
                    </span>
                  </div>
                  <button
                    onClick={handleRemoveElevenLabsKey}
                    disabled={removeElevenLabsKey.isPending}
                    className="text-[10px] font-semibold text-red-500 hover:text-red-600 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {removeElevenLabsKey.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    Remove
                  </button>
                </div>
                <div className="text-[10px] text-[var(--sketch-fg-muted)]">
                  {credits.isLoading ? (
                    <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Checking credits…</span>
                  ) : credits.data ? (
                    <span>
                      Credits: <strong className="text-[var(--sketch-fg)]">{credits.data.remaining.toLocaleString()} / {credits.data.limit.toLocaleString()}</strong>
                      {credits.data.tier ? ` · ${credits.data.tier}` : ""}
                    </span>
                  ) : (
                    <span>Key saved. Couldn't fetch live credits right now.</span>
                  )}
                </div>
              </div>
            )}

            {/* Tester for preview */}
            <div className="p-3 rounded-xl border border-[var(--sketch-border-color)]/20 bg-[var(--sketch-card-bg)]/50 mb-2">
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-[10px] font-bold text-[var(--sketch-fg-muted)]">Test voice</Label>
              </div>
              <div className="flex gap-2">
                <Textarea
                  value={testVoiceText}
                  onChange={(e) => setTestVoiceText(e.target.value)}
                  placeholder={(currentStep?.userEditedScript ?? currentStep?.aiScript) || "Type something to test..."}
                  className="flex-1 text-xs min-h-[40px] resize-none"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const textToTest = testVoiceText.trim() || (currentStep?.userEditedScript ?? currentStep?.aiScript) || "Hi I am your AI guide.";
                    previewVoice.mutate({ voice: selectedVoice, speed: voiceSpeed, text: textToTest }, {
                      onSuccess: (data) => {
                        if (playingId === selectedVoice) {
                          audioRef.pause();
                        }
                        setPlayingId(selectedVoice);
                        audioRef.src = data.audioData;
                        audioRef.play();
                        audioRef.onended = () => {
                          setPlayingId(null);
                        };
                      },
                      onError: (err) => {
                        toast.error(err.message || "Failed to generate preview");
                      }
                    });
                  }}
                  disabled={previewVoice.isPending || !hasElevenLabsKey}
                  title={!hasElevenLabsKey ? "Add your ElevenLabs key to preview premium voices" : undefined}
                  className="flex-shrink-0 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {previewVoice.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5 pr-1">
              {elevenLabsVoices.map((v) => {
                const isSelected = selectedVoice === v.id;
                const isPlaying = playingId === v.id;
                const isLoading = previewLoadingId === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVoice(v.id)}
                    className={`p-2 border rounded-lg flex items-center justify-between text-xs transition-all cursor-pointer ${isSelected
                        ? "border-brand bg-brand/5"
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
              className="w-full h-1 bg-[var(--sketch-fg-subtle)]/10 appearance-none rounded cursor-pointer accent-brand"
            />
          </div>
        </div>

        {/* Save ElevenLabs Selection */}
        <div className="pt-3 pb-1 border-t border-[var(--sketch-border-color)]/20 bg-[var(--sketch-panel-bg)] flex-shrink-0 sticky bottom-0 z-10">
          <button
            onClick={() => saveVoiceSelection(true)}
            disabled={updateProject.isPending || !hasElevenLabsKey}
            title={!hasElevenLabsKey ? "Add your ElevenLabs API key above first" : undefined}
            className="w-full py-2 bg-brand hover:bg-brand-hover text-white disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-black/10"
          >
            {updateProject.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
            {hasElevenLabsKey ? "Set Premium Voice" : "Add a key to use premium voices"}
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
                    className={`w-6 h-6 rounded-full border-2 ${props.captionColor === c ? "border-[var(--sketch-accent)]" : "border-[var(--sketch-border-color)]/20"
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
    const isSpecificClip = activeTransitionClipId !== null;
    const clipIndex = isSpecificClip ? timelineClips.findIndex(s => s.id === activeTransitionClipId) : -1;
    const clipTitle = clipIndex >= 0 ? `Scene ${clipIndex + 1}` : "";
    const currentTransitionValue = isSpecificClip && clipIndex >= 0 
      ? (props.stepTransitions?.[activeTransitionClipId] || props.globalTransition)
      : props.globalTransition;

    return (
      <div className="space-y-5">
        {isSpecificClip && (
          <div className="flex items-center justify-between bg-blue-500/5  p-2.5 rounded-xl border border-blue-500/20 ">
            <span className="text-xs font-bold text-blue-700 ">
              Editing for {clipTitle}
            </span>
            <button 
              onClick={() => setActiveTransitionClipId(null)}
              className="text-[10px] font-extrabold bg-blue-500/10 hover:bg-blue-500/20  text-blue-600  px-2 py-1 rounded-md transition-colors cursor-pointer"
            >
              Back to Global
            </button>
          </div>
        )}

        <div>
          <Label className="text-xs font-bold text-[var(--sketch-fg-muted)] block mb-3">
            {isSpecificClip ? "Transition Type" : "Global Transition"}
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {transitionTypes.map((t) => {
              const isSelected = currentTransitionValue === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => {
                    if (isSpecificClip && clipIndex >= 0) {
                      props.onStepTransitionChange?.(activeTransitionClipId, t.value);
                    } else {
                      props.onGlobalTransitionChange?.(t.value);
                    }
                  }}
                  className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                    isSelected
                      ? "bg-blue-500/10 border-blue-500 text-blue-600  shadow-md shadow-blue-500/5"
                      : "bg-slate-50/50  border-[var(--sketch-border-color)]/20 text-slate-700  hover:text-slate-900  hover:bg-slate-100/40"
                  }`}
                >
                  <div className="flex items-center justify-center h-10 w-full shrink-0">
                    {getTransitionSvg(t.value)}
                  </div>
                  <span className="text-[10px] font-bold tracking-wide">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--sketch-border-color)]/20">
          <div className="flex justify-between items-center mb-2">
            <Label className="text-xs font-bold text-[var(--sketch-fg-muted)]">Duration</Label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0.3}
                max={2.0}
                step={0.01}
                value={props.transitionDuration ?? 0.5}
                onChange={(e) => props.onTransitionDurationChange?.(Number(e.target.value))}
                className="w-14 text-right bg-slate-100/50  border border-[var(--sketch-border-color)]/20 rounded px-1.5 py-0.5 text-xs font-mono text-[var(--sketch-fg)] focus:outline-none"
              />
              <span className="text-[10px] font-semibold text-[var(--sketch-fg-subtle)]">s</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-[var(--sketch-fg-subtle)] w-6 text-left">0.3s</span>
            <input
              type="range"
              min={0.3}
              max={2.0}
              step={0.1}
              value={props.transitionDuration ?? 0.5}
              onChange={(e) => props.onTransitionDurationChange?.(Number(e.target.value))}
              className="flex-1 h-1 bg-[var(--sketch-fg-subtle)]/15 appearance-none cursor-pointer accent-blue-500"
            />
            <span className="font-mono text-[9px] text-[var(--sketch-fg-subtle)] w-6 text-right">2.0s</span>
          </div>
        </div>
      </div>
    );
  };

  // ── Intro/Outro Content ──

  const renderIntroOutroContent = () => {
    return (
      <div className="space-y-4">
        {/* Mode toggle: Intro vs Outro */}
        <div className="flex items-center gap-1 p-0.5 bg-[var(--sketch-bg)] rounded-lg border border-[var(--sketch-border-color)]/20">
          <button
            onClick={() => setIntroOutroMode("intro")}
            className={`flex-1 py-1.5 px-2 rounded-md text-[10px] font-bold transition-all ${
              introOutroMode === "intro"
                ? "bg-[var(--sketch-accent)]/15 text-[var(--sketch-fg)]"
                : "text-[var(--sketch-fg-subtle)] hover:text-[var(--sketch-fg-muted)]"
            }`}
          >
            Intro
          </button>
          <button
            onClick={() => setIntroOutroMode("outro")}
            className={`flex-1 py-1.5 px-2 rounded-md text-[10px] font-bold transition-all ${
              introOutroMode === "outro"
                ? "bg-[var(--sketch-accent)]/15 text-[var(--sketch-fg)]"
                : "text-[var(--sketch-fg-subtle)] hover:text-[var(--sketch-fg-muted)]"
            }`}
          >
            Outro
          </button>
        </div>

        {introOutroMode === "intro" ? (
          <>
            {/* Template picker with visual previews */}
            <div>
              <Label className="text-xs font-semibold text-[var(--sketch-fg-muted)] block mb-2">Intro Template</Label>
              <div className="grid grid-cols-2 gap-2">
                {INTRO_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.value}
                    onClick={() => setIntroTemplate(tpl.value)}
                    className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                      introTemplate === tpl.value
                        ? "border-[var(--sketch-accent)] ring-1 ring-[var(--sketch-accent)]/30"
                        : "border-[var(--sketch-border-color)]/20 hover:border-[var(--sketch-accent)]/50"
                    }`}
                    style={{ background: tpl.previewBg }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center p-1">
                      <span
                        className="text-[8px] font-bold text-center leading-tight"
                        style={{ color: tpl.previewTextColor, fontFamily: tpl.previewFont || "sans-serif" }}
                      >
                        {tpl.label}
                      </span>
                    </div>
                    {introTemplate === tpl.value && (
                      <div className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-[var(--sketch-accent)] flex items-center justify-center">
                        <Check className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom intro upload.
                The "custom-video" template existed and the renderer read
                project.introVideoPath, but nothing ever set it, so choosing
                this option quietly did nothing. Images are accepted too; the
                renderer holds a still for the chosen duration. */}
            {introTemplate === "custom-video" && (
              <BumperUpload
                kind="intro"
                currentPath={project?.introVideoPath || null}
                busy={bumperUploading === "intro"}
                onPick={(file) => handleBumperUpload("intro", file)}
                onClear={() => handleBumperClear("intro")}
              />
            )}

            {/* Text input */}
            {introTemplate && introTemplate !== "none" && introTemplate !== "custom-video" && (
              <div>
                <Label className="text-xs font-semibold text-[var(--sketch-fg-muted)] block mb-1">Intro Text</Label>
                <Textarea
                  value={introText}
                  onChange={(e) => setIntroText(e.target.value)}
                  placeholder="e.g. How to Use VS Code"
                  className="text-xs min-h-[60px] bg-[var(--sketch-card-bg)] border-[var(--sketch-border-color)]/20 text-[var(--sketch-fg)] placeholder:text-[var(--sketch-fg-muted)]/50 focus:border-[var(--sketch-accent)] focus:ring-1 focus:ring-[var(--sketch-accent)]"
                />
              </div>
            )}

            {/* Duration slider.
                Hidden when a custom VIDEO is attached: the clip already has its
                own length, and the slider was not merely decorative: its 3s
                default was being applied as a hard trim, so a 20-second intro
                came out three seconds long. A custom IMAGE still needs one,
                since a still has no duration of its own. */}
            {introTemplate === "custom-video" && isVideoPath(project?.introVideoPath) && (
              <p className="rounded-lg border border-[var(--sketch-border-color)]/30 px-2.5 py-2 text-[10px] leading-relaxed text-[var(--sketch-fg-subtle)]">
                Your intro clip plays at its full length. Trim it before
                uploading if you want it shorter.
              </p>
            )}

            {introTemplate && introTemplate !== "none" &&
              !(introTemplate === "custom-video" && isVideoPath(project?.introVideoPath)) && (
              <div>
                <Label className="text-xs font-semibold text-[var(--sketch-fg-muted)] flex justify-between mb-1">
                  <span>Duration</span>
                  <span className="font-mono text-[var(--sketch-accent)]">{introDuration.toFixed(1)}s</span>
                </Label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={introDuration}
                  onChange={(e) => setIntroDuration(Number(e.target.value))}
                  className="w-full accent-[var(--sketch-accent)]"
                />
              </div>
            )}


            {/* Preview */}
            {introTemplate && introTemplate !== "none" && introText && (
              <div className="rounded-lg overflow-hidden border border-[var(--sketch-border-color)]/20">
                <div
                  className="aspect-video flex items-center justify-center p-4"
                  style={{ background: getTemplate(introTemplate)?.previewBg || "#000" }}
                >
                  <span
                    className="text-sm font-bold text-center"
                    style={{
                      color: getTemplate(introTemplate)?.previewTextColor || "#fff",
                      fontFamily: getTemplate(introTemplate)?.previewFont || "sans-serif",
                    }}
                  >
                    {introText}
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Outro template picker */}
            <div>
              <Label className="text-xs font-semibold text-[var(--sketch-fg-muted)] block mb-2">Outro Template</Label>
              <div className="grid grid-cols-2 gap-2">
                {OUTRO_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.value}
                    onClick={() => setOutroTemplate(tpl.value)}
                    className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                      outroTemplate === tpl.value
                        ? "border-[var(--sketch-accent)] ring-1 ring-[var(--sketch-accent)]/30"
                        : "border-[var(--sketch-border-color)]/20 hover:border-[var(--sketch-accent)]/50"
                    }`}
                    style={{ background: tpl.previewBg }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center p-1">
                      <span
                        className="text-[8px] font-bold text-center leading-tight"
                        style={{ color: tpl.previewTextColor, fontFamily: tpl.previewFont || "sans-serif" }}
                      >
                        {tpl.label}
                      </span>
                    </div>
                    {outroTemplate === tpl.value && (
                      <div className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-[var(--sketch-accent)] flex items-center justify-center">
                        <Check className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Outro text */}
            {outroTemplate === "custom-video" && (
              <BumperUpload
                kind="outro"
                currentPath={project?.outroVideoPath || null}
                busy={bumperUploading === "outro"}
                onPick={(file) => handleBumperUpload("outro", file)}
                onClear={() => handleBumperClear("outro")}
              />
            )}

            {outroTemplate && outroTemplate !== "none" && outroTemplate !== "custom-video" && (
              <div>
                <Label className="text-xs font-semibold text-[var(--sketch-fg-muted)] block mb-1">Outro Text</Label>
                <Textarea
                  value={outroText}
                  onChange={(e) => setOutroText(e.target.value)}
                  placeholder="e.g. Thanks for watching! Subscribe for more."
                  className="text-xs min-h-[60px] bg-[var(--sketch-card-bg)] border-[var(--sketch-border-color)]/20 text-[var(--sketch-fg)] placeholder:text-[var(--sketch-fg-muted)]/50 focus:border-[var(--sketch-accent)] focus:ring-1 focus:ring-[var(--sketch-accent)]"
                />
              </div>
            )}

            {/* Duration */}
            {/* See the intro slider above for why this hides on custom video. */}
            {outroTemplate === "custom-video" && isVideoPath(project?.outroVideoPath) && (
              <p className="rounded-lg border border-[var(--sketch-border-color)]/30 px-2.5 py-2 text-[10px] leading-relaxed text-[var(--sketch-fg-subtle)]">
                Your outro clip plays at its full length. Trim it before
                uploading if you want it shorter.
              </p>
            )}

            {outroTemplate && outroTemplate !== "none" &&
              !(outroTemplate === "custom-video" && isVideoPath(project?.outroVideoPath)) && (
              <div>
                <Label className="text-xs font-semibold text-[var(--sketch-fg-muted)] flex justify-between mb-1">
                  <span>Duration</span>
                  <span className="font-mono text-[var(--sketch-accent)]">{outroDuration.toFixed(1)}s</span>
                </Label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={outroDuration}
                  onChange={(e) => setOutroDuration(Number(e.target.value))}
                  className="w-full accent-[var(--sketch-accent)]"
                />
              </div>
            )}


            {/* Preview */}
            {outroTemplate && outroTemplate !== "none" && outroText && (
              <div className="rounded-lg overflow-hidden border border-[var(--sketch-border-color)]/20">
                <div
                  className="aspect-video flex items-center justify-center p-4"
                  style={{ background: getTemplate(outroTemplate)?.previewBg || "#000" }}
                >
                  <span
                    className="text-sm font-bold text-center"
                    style={{
                      color: getTemplate(outroTemplate)?.previewTextColor || "#fff",
                      fontFamily: getTemplate(outroTemplate)?.previewFont || "sans-serif",
                    }}
                  >
                    {outroText}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };
  const [pexelsQuery, setPexelsQuery] = useState("");
  /**
   * Stock search is photos only.
   *
   * The endpoint still accepts "video" and "both", and the importer still
   * handles a video result - none of that is removed, so turning this back on
   * is a one-line change. But a default of "both" meant a search for "coding"
   * returned clips unasked, and importing one produced a scene that most of the
   * editor cannot annotate.
   */
  const pexelsMediaType = "image" as const;
  const [importingPexelsId, setImportingPexelsId] = useState<number | null>(null);
  const pexelsSearch = trpc.ai.searchMedia.useQuery(
    { query: pexelsQuery, mediaType: pexelsMediaType, perPage: 12 },
    { enabled: pexelsQuery.length > 2 && activeRightTab === "media", refetchOnMount: false }
  );

  // Download a Pexels media URL, convert to File, and import as a new timeline step
  const handleImportPexelsMedia = async (media: { id: number; src: string; type: string; photographer?: string; thumbnail?: string }) => {
    setImportingPexelsId(media.id);
    try {
      // Downloaded by the server, not here.
      //
      // Fetching straight from the browser worked for photos and always failed
      // for videos: Pexels' image CDN sends permissive CORS headers, its video
      // files do not. The browser rejected those requests before they hit the
      // network, which is why it reported "NetworkError when attempting to
      // fetch resource" rather than an HTTP status.
      const imported = await importPexelsMedia.mutateAsync({
        url: media.src,
        type: media.type === "video" ? "video" : "image",
      });

      const isVideo = imported.type === "video";
      const created = await createStep.mutateAsync({
        projectId: projectIdNum,
        order: (steps.length || (props.parentSteps || []).length) + 1,
        description: media.photographer ? `Stock media by ${media.photographer}` : "",
        // The "#video" marker is how the rest of the editor recognises a clip.
        screenshotPath: isVideo ? `${imported.key}#video` : imported.key,
      });
      void created;

      await utils.project.getById.invalidate({ id: projectIdNum });
      toast.success(`Imported ${isVideo ? "video" : "photo"} from Pexels into timeline`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Download failed";
      toast.error(`Failed to import: ${message}`);
    } finally {
      setImportingPexelsId(null);
    }
  };

  const renderMediaContent = () => {
    return (
      <div className="flex flex-col h-full gap-3">
        {/* Search bar */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--sketch-fg-subtle)]" />
            <Input
              type="text"
              value={pexelsQuery}
              onChange={(e) => setPexelsQuery(e.target.value)}
              placeholder="Search Pexels stock media..."
              className="text-xs pl-8 pr-3 py-2 bg-[var(--sketch-bg)] border border-[var(--sketch-border-color)]/30 rounded-lg"
              onKeyDown={(e) => { if (e.key === "Enter" && pexelsQuery.length > 2) pexelsSearch.refetch(); }}
            />
          </div>
          <p className="text-[9px] text-[var(--sketch-fg-subtle)] leading-tight">
            Click any photo to import it into your timeline. You can also drag it
            onto the timeline.
          </p>
        </div>

        {/* Results */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1">
          {pexelsQuery.length <= 2 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <Clapperboard className="w-8 h-8 text-[var(--sketch-fg-subtle)] mb-2" />
              <p className="text-xs text-[var(--sketch-fg-muted)]">Search for stock photos and videos from Pexels</p>
              <p className="text-[10px] text-[var(--sketch-fg-subtle)] mt-1">Try "nature", "city", "technology", "ocean"...</p>
            </div>
          ) : pexelsSearch.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--sketch-fg-subtle)]" />
            </div>
          ) : pexelsSearch.data && pexelsSearch.data.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {pexelsSearch.data.map((media: any, idx: number) => (
                <div
                  key={`${media.id}-${idx}`}
                  className={`relative group rounded-lg overflow-hidden border cursor-pointer transition-all ${importingPexelsId === media.id
                      ? "border-[var(--sketch-accent)] ring-2 ring-[var(--sketch-accent)]/30"
                      : "border-[var(--sketch-border-color)]/20 hover:border-[var(--sketch-accent)]/50 hover:scale-[1.03]"
                    }`}
                  draggable
                  onDragStart={(e) => {
                    // Set drag data for timeline drop
                    e.dataTransfer.setData("application/x-pexels-media", JSON.stringify({
                      id: media.id,
                      src: media.src,
                      type: media.type,
                      photographer: media.photographer,
                      thumbnail: media.thumbnail,
                    }));
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => handleImportPexelsMedia(media)}
                >
                  <div className="aspect-video bg-[var(--sketch-bg)] flex items-center justify-center">
                    {media.thumbnail || media.src ? (
                      <img
                        src={media.thumbnail || media.src}
                        alt={media.photographer || "Pexels media"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-[var(--sketch-fg-subtle)]" />
                    )}
                  </div>
                  {/* Type badge */}
                  <div className="absolute top-1 left-1">
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded text-white ${media.type === "video" ? "bg-red-500/80" : "bg-blue-500/80"
                      }`}>
                      {media.type === "video" ? "VIDEO" : "PHOTO"}
                    </span>
                  </div>
                  {/* Importing spinner overlay */}
                  {importingPexelsId === media.id && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                    </div>
                  )}
                  {/* Hover overlay with import hint */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                    <Download className="w-4 h-4 text-white" />
                    <span className="text-[9px] text-white font-semibold">Click to import</span>
                  </div>
                  {/* Photographer credit */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-0.5">
                    <p className="text-[8px] text-white/80 truncate">by {media.photographer || "Pexels"}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-xs text-[var(--sketch-fg-muted)]">No results found</p>
              <p className="text-[10px] text-[var(--sketch-fg-subtle)] mt-1">Try a different search term</p>
            </div>
          )}
        </div>

        {/* Upload button */}
        <div className="flex-shrink-0 border-t border-[var(--sketch-border-color)]/20 pt-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-lg bg-[var(--sketch-accent)]/10 hover:bg-[var(--sketch-accent)]/20 text-[var(--sketch-fg)] border border-[var(--sketch-accent)]/20 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload your own media
          </button>
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


  const renderSafetyContent = () => {
    if (!currentStep) return null;
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[var(--sketch-accent)]" />
            <h3 className="font-mono text-xs text-[var(--sketch-fg-muted)] uppercase tracking-wider font-semibold">
              AI Safety & Copyright Check
            </h3>
          </div>
          <p className="text-[11px] text-[var(--sketch-fg-muted)] leading-relaxed">
            Uses the Vision LLM ({`gemma4:31b`}) to scan the current screenshot for:
          </p>
          <ul className="text-[10px] text-[var(--sketch-fg-muted)] space-y-1 pl-4 list-disc">
            <li>NSFW content (nudity, sexual content)</li>
            <li>Graphic violence, gore, weapons</li>
            <li>Illegal acts or YouTube guideline violations</li>
            <li>Copyrighted materials (logos, characters, game assets)</li>
          </ul>
        </div>

        {/* Current step info */}
        <div className="bg-[var(--sketch-fg-subtle)]/10 rounded-lg p-3 space-y-1">
          <p className="text-[10px] text-[var(--sketch-fg-subtle)] uppercase tracking-wider">Current Scene</p>
          <p className="text-xs font-medium text-[var(--sketch-fg)]">
            Scene {currentStepIndex + 1}: {currentStep.description?.substring(0, 40)}
          </p>
          {currentStep.screenshotPath ? (
            <div className="flex items-center gap-1 text-[10px] text-[var(--sketch-fg-muted)]">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span>Screenshot uploaded</span>
            </div>
          ) : (
            <p className="text-[10px] text-red-500">No screenshot on this scene</p>
          )}
        </div>

        {/* Check button */}
        <button
          onClick={async () => {
            if (!currentStep.screenshotPath) return;
            setSafetyResult(null);
            try {
              const result = await checkSafety.mutateAsync({
                stepId: currentStep.id,
                mediaUrl: currentStep.screenshotPath,
              });
              setSafetyResult(result);
              utils.project.getById.invalidate({ id: projectIdNum });
            } catch (err) {
              setSafetyResult({
                isSafe: false,
                isClear: false,
                reason: "Check failed: " + (err instanceof Error ? err.message : "Unknown error"),
              });
            }
          }}
          disabled={!currentStep.screenshotPath || checkSafety.isPending}
          className="w-full py-2 px-3 bg-[var(--sketch-accent)] hover:opacity-90 disabled:opacity-40 text-white text-xs font-bold rounded flex items-center justify-center gap-2 cursor-pointer transition-all"
        >
          {checkSafety.isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Scanning...</span>
            </>
          ) : (
            <>
              <Shield className="w-3.5 h-3.5" />
              <span>Scan This Scene</span>
            </>
          )}
        </button>

        {/* Results */}
        {safetyResult && (
          <div className="space-y-2 pt-2 border-t border-[var(--sketch-fg-subtle)]/20">
            <p className="text-[10px] text-[var(--sketch-fg-subtle)] uppercase tracking-wider">Result</p>
            <div className={`rounded-lg p-3 space-y-2 ${safetyResult.isSafe && safetyResult.isClear
                ? "bg-green-500/10 border border-green-500/30"
                : "bg-red-500/10 border border-red-500/30"
              }`}>
              <div className="flex items-center gap-2">
                {safetyResult.isSafe && safetyResult.isClear ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-xs font-bold ${safetyResult.isSafe && safetyResult.isClear ? "text-green-600" : "text-red-500"
                  }`}>
                  {safetyResult.isSafe && safetyResult.isClear
                    ? "Safe & Clear"
                    : !safetyResult.isSafe
                      ? "Safety Violation Detected"
                      : "Copyright Issue Detected"}
                </span>
              </div>
              <div className="flex gap-3 text-[10px]">
                <span className={safetyResult.isSafe ? "text-green-600" : "text-red-500"}>
                  Safety: {safetyResult.isSafe ? "✓ Pass" : "✗ Fail"}
                </span>
                <span className={safetyResult.isClear ? "text-green-600" : "text-red-500"}>
                  Copyright: {safetyResult.isClear ? "✓ Clear" : "✗ Flagged"}
                </span>
              </div>
              <p className="text-[11px] text-[var(--sketch-fg-muted)] leading-relaxed">
                {safetyResult.reason}
              </p>
            </div>
          </div>
        )}

        {/* DB status */}
        {currentStep.isSafe !== undefined && (
          <div className="text-[10px] text-[var(--sketch-fg-subtle)] flex items-center gap-1">
            <span>DB status:</span>
            <span className={currentStep.isSafe === 1 ? "text-green-600" : "text-red-500"}>
              {currentStep.isSafe === 1 ? "✓ Safe" : "✗ Flagged"}
            </span>
            {currentStep.safetyReason && (
              <span className="truncate">{currentStep.safetyReason}</span>
            )}
          </div>
        )}
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
    <div className="w-full h-full flex flex-col bg-[var(--sketch-bg)] text-[var(--sketch-fg)] select-none font-sans overflow-hidden">
      {/* 1. Main Top Header Bar */}
      <header data-tour="header" className="w-full bg-[var(--sketch-toolbar-bg)] border-b-2 border-[var(--sketch-border-color)] px-2 sm:px-4 py-2 flex flex-col gap-1.5 flex-shrink-0">
        <div className="flex items-center justify-between">
          {/* Left: Logo, Title row */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
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
              aria-label="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* Project Title Input & Star & Cloud */}
            <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                onBlur={async () => {
                  if (!(projectIdNum > 0 && projectTitle.trim())) return;
                  // Routed through saveState so the single header indicator
                  // covers a title change too. It used to have its own
                  // indicator, which is what produced two of them.
                  setSaveState("saving");
                  try {
                    await updateProject.mutateAsync({ id: projectIdNum, title: projectTitle });
                    setSaveState("saved");
                  } catch {
                    setSaveState("error");
                  }
                }}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="font-medium text-sm text-[var(--sketch-fg)] hover:bg-[var(--sketch-fg-subtle)]/10 focus:bg-[var(--sketch-card-bg)] focus:ring-1 focus:ring-[var(--sketch-accent)] rounded px-1.5 py-0.5 border-none bg-transparent transition-all outline-none min-w-0 w-full truncate"
              />
            </div>
          </div>

          {/* Right: Light/Dark Mode toggle button */}
          <div className="flex items-center gap-3">
            {/* Autosave status. Quiet when idle, explicit when it matters -
                a failed save is the one state the user must not miss. */}
            {saveState !== "idle" && (
              <span
                role="status"
                aria-live="polite"
                className={`hidden sm:flex items-center gap-1.5 text-[11px] font-medium select-none ${
                  saveState === "error"
                    ? "text-red-500"
                    : "text-[var(--sketch-fg-subtle)]"
                }`}
                title={
                  saveState === "error"
                    ? "Your latest changes could not be saved. Check your connection."
                    : saveState === "saved"
                      ? "All changes are saved to your project"
                      : "Saving your changes"
                }
              >
                {saveState === "saving" || saveState === "dirty" ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving…
                  </>
                ) : saveState === "saved" ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    Saved
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3" />
                    Not saved
                  </>
                )}
              </span>
            )}

            {/* Render & Export Trigger Button */}
            <button
              data-tour="export-btn"
              onClick={handleExportRequest}
              disabled={isPreparingExport}
              className="py-1 px-3 bg-brand hover:bg-brand-hover   text-white  text-xs font-bold rounded shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer border border-brand/30"
            >
              {isPreparingExport ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{isPreparingExport ? "Checking..." : "Export"}</span>
            </button>

            {/* Replay the onboarding tour */}
            <button
              onClick={() => startOnboardingTour()}
              className="p-1.5 hover:bg-[var(--sketch-fg-subtle)]/10 rounded-full text-[var(--sketch-fg-muted)] hover:text-[var(--sketch-fg)] transition-all cursor-pointer border border-[var(--sketch-border-color)]/20 flex items-center justify-center w-8 h-8"
              title="Replay the editor tour"
              aria-label="Replay the editor tour"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

          </div>
        </div>

        {/* Nested Menus: functional dropdown menus (hidden on mobile) */}
        <div className="editor-menu-bar-desktop flex items-center gap-1 text-[11px] text-[var(--sketch-fg-muted)] font-medium leading-none select-none pl-9">
          {/* File Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hover:bg-[var(--sketch-fg-subtle)]/10 px-2 py-1 rounded transition-colors cursor-pointer leading-none">
                File
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuItem onClick={() => { window.location.href = "/dashboard"; }}>
                <ArrowLeft className="w-3.5 h-3.5 mr-2" /> Back to Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-3.5 h-3.5 mr-2" /> Upload Screenshots…
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSaveStep}>
                <Save className="w-3.5 h-3.5 mr-2" /> Save Step
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportRequest}
                disabled={isPreparingExport}
              >
                <Download className="w-3.5 h-3.5 mr-2" /> Export Video…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Edit Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hover:bg-[var(--sketch-fg-subtle)]/10 px-2 py-1 rounded transition-colors cursor-pointer leading-none">
                Edit
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuItem onClick={handleUndo} disabled={historyIndex <= 0}>
                <Undo2 className="w-3.5 h-3.5 mr-2" /> Undo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleRedo} disabled={historyIndex >= history.length - 1}>
                <Redo2 className="w-3.5 h-3.5 mr-2" /> Redo
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setMode("select")}>
                <MousePointer className="w-3.5 h-3.5 mr-2" /> Select All Annotations
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                if (!currentStep) return;
                const next = { ...annotations, [currentStep.id]: {} };
                pushHistory(next);
              }}>
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Clear All Annotations
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hover:bg-[var(--sketch-fg-subtle)]/10 px-2 py-1 rounded transition-colors cursor-pointer leading-none">
                View
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Zoom</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setCanvasScale(0.5)}>
                <ZoomOut className="w-3.5 h-3.5 mr-2" /> 50%
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCanvasScale(getFitScale())}>
                <Maximize className="w-3.5 h-3.5 mr-2" /> Fit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCanvasScale(1.0)}>
                <Maximize className="w-3.5 h-3.5 mr-2" /> 100%
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCanvasScale(2.0)}>
                <ZoomIn className="w-3.5 h-3.5 mr-2" /> 200%
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked={!isToolbarCollapsed} onCheckedChange={(v) => setIsToolbarCollapsed(!v)}>
                Show Toolbar
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={!!activeRightTab} onCheckedChange={(v) => setActiveRightTab(v ? "properties" : null)}>
                Show Properties Panel
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Insert Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hover:bg-[var(--sketch-fg-subtle)]/10 px-2 py-1 rounded transition-colors cursor-pointer leading-none">
                Insert
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Annotations</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setMode("highlight")}>
                <Square className="w-3.5 h-3.5 mr-2" /> Highlight Box
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMode("overlay")}>
                <Type className="w-3.5 h-3.5 mr-2" /> Text Overlay
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMode("badge")}>
                <BadgeCheck className="w-3.5 h-3.5 mr-2" /> Number Badge
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMode("watermark")}>
                <Stamp className="w-3.5 h-3.5 mr-2" /> Watermark
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Effects</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setMode("blur")}>
                <Aperture className="w-3.5 h-3.5 mr-2" /> Blur Region
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMode("redact")}>
                <Shield className="w-3.5 h-3.5 mr-2" /> Redact Area
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMode("pixelate")}>
                <Grid3x3 className="w-3.5 h-3.5 mr-2" /> Pixelate Area
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMode("spotlight")}>
                <Sun className="w-3.5 h-3.5 mr-2" /> Spotlight
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Format Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hover:bg-[var(--sketch-fg-subtle)]/10 px-2 py-1 rounded transition-colors cursor-pointer leading-none">
                Format
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Color Filter</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => {
                if (!currentStep) return;
                const next = { ...annotations, [currentStep.id]: { ...(annotations[currentStep.id] || {}), editorColorFilter: "none" } };
                pushHistory(next);
              }}>
                None
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                if (!currentStep) return;
                const next = { ...annotations, [currentStep.id]: { ...(annotations[currentStep.id] || {}), editorColorFilter: "grayscale" } };
                pushHistory(next);
              }}>
                Grayscale
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                if (!currentStep) return;
                const next = { ...annotations, [currentStep.id]: { ...(annotations[currentStep.id] || {}), editorColorFilter: "sepia" } };
                pushHistory(next);
              }}>
                Sepia
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                if (!currentStep) return;
                const next = { ...annotations, [currentStep.id]: { ...(annotations[currentStep.id] || {}), editorColorFilter: "warm" } };
                pushHistory(next);
              }}>
                Warm
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                if (!currentStep) return;
                const next = { ...annotations, [currentStep.id]: { ...(annotations[currentStep.id] || {}), editorColorFilter: "cool" } };
                pushHistory(next);
              }}>
                Cool
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                if (!currentStep) return;
                const next = { ...annotations, [currentStep.id]: { ...(annotations[currentStep.id] || {}), editorColorFilter: "contrast" } };
                pushHistory(next);
              }}>
                High Contrast
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toggleRightTab("captions")}>
                <Type className="w-3.5 h-3.5 mr-2" /> Caption Settings…
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleRightTab("transitions")}>
                <Film className="w-3.5 h-3.5 mr-2" /> Transition Settings…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Scene Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hover:bg-[var(--sketch-fg-subtle)]/10 px-2 py-1 rounded transition-colors cursor-pointer leading-none">
                Scene
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Plus className="w-3.5 h-3.5 mr-2" /> Add Scene (Upload)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCurrentStepIndex(0)} disabled={currentStepIndex === 0}>
                <ArrowLeft className="w-3.5 h-3.5 mr-2" /> First Scene
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCurrentStepIndex(Math.max(0, steps.length - 1))} disabled={currentStepIndex >= steps.length - 1}>
                <ChevronRightIcon className="w-3.5 h-3.5 mr-2" /> Last Scene
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setDeleteSceneIdx(currentStepIndex)} disabled={steps.length <= 1}>
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Current Scene
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toggleRightTab("script")}>
                <Type className="w-3.5 h-3.5 mr-2" /> Edit Script…
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleRightTab("voiceover")}>
                <Volume2 className="w-3.5 h-3.5 mr-2" /> Voiceover Settings…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Arrange Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hover:bg-[var(--sketch-fg-subtle)]/10 px-2 py-1 rounded transition-colors cursor-pointer leading-none">
                Arrange
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Zoom Target</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => {
                if (!currentStep) return;
                const ann = annotations[currentStep.id] || {};
                const next = { ...annotations, [currentStep.id]: { ...ann, zoomTargetX: 50, zoomTargetY: 50 } };
                pushHistory(next);
              }}>
                <Target className="w-3.5 h-3.5 mr-2" /> Center Zoom Target
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMode("zoom")}>
                <Target className="w-3.5 h-3.5 mr-2" /> Set Zoom Point…
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Reset</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => {
                if (!currentStep) return;
                const ann = annotations[currentStep.id] || {};
                const next = { ...annotations, [currentStep.id]: withZoomPoints(ann, []) };
                pushHistory(next);
              }}>
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Clear Zoom
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                if (!currentStep) return;
                const ann = annotations[currentStep.id] || {};
                const next = { ...annotations, [currentStep.id]: { ...ann, editorCropX: 0, editorCropY: 0, editorCropW: 100, editorCropH: 100 } };
                pushHistory(next);
              }}>
                <Crop className="w-3.5 h-3.5 mr-2" /> Reset Crop
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Tools Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hover:bg-[var(--sketch-fg-subtle)]/10 px-2 py-1 rounded transition-colors cursor-pointer leading-none">
                Tools
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 p-0">
              <div className="max-h-[360px] overflow-y-auto p-1 scrollbar-thin">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Selection</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setMode("select")}>
                  <MousePointer className="w-3.5 h-3.5 mr-2" /> Select
                  <span className="ml-auto text-[9px] text-[var(--sketch-fg-muted)] bg-[var(--sketch-fg-subtle)]/5 px-1 py-0.5 rounded border border-[var(--sketch-border-color)]/10 font-mono">V</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMode("pan")}>
                  <Move className="w-3.5 h-3.5 mr-2" /> Pan
                  <span className="ml-auto text-[9px] text-[var(--sketch-fg-muted)] bg-[var(--sketch-fg-subtle)]/5 px-1 py-0.5 rounded border border-[var(--sketch-border-color)]/10 font-mono">Space</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMode("crop")}>
                  <Crop className="w-3.5 h-3.5 mr-2" /> Crop
                  <span className="ml-auto text-[9px] text-[var(--sketch-fg-muted)] bg-[var(--sketch-fg-subtle)]/5 px-1 py-0.5 rounded border border-[var(--sketch-border-color)]/10 font-mono">C</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Zoom & Focus</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setMode("highlight")}>
                  <Square className="w-3.5 h-3.5 mr-2" /> Highlight Box
                  <span className="ml-auto text-[9px] text-[var(--sketch-fg-muted)] bg-[var(--sketch-fg-subtle)]/5 px-1 py-0.5 rounded border border-[var(--sketch-border-color)]/10 font-mono">H</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMode("zoom")}>
                  <Target className="w-3.5 h-3.5 mr-2" /> Zoom Point
                  <span className="ml-auto text-[9px] text-[var(--sketch-fg-muted)] bg-[var(--sketch-fg-subtle)]/5 px-1 py-0.5 rounded border border-[var(--sketch-border-color)]/10 font-mono">Z</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMode("magnify")}>
                  <Target className="w-3.5 h-3.5 mr-2" /> Magnify Lens
                  <span className="ml-auto text-[9px] text-[var(--sketch-fg-muted)] bg-[var(--sketch-fg-subtle)]/5 px-1 py-0.5 rounded border border-[var(--sketch-border-color)]/10 font-mono">M</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Text & Marks</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setMode("overlay")}>
                  <Type className="w-3.5 h-3.5 mr-2" /> Text Overlay
                  <span className="ml-auto text-[9px] text-[var(--sketch-fg-muted)] bg-[var(--sketch-fg-subtle)]/5 px-1 py-0.5 rounded border border-[var(--sketch-border-color)]/10 font-mono">T</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMode("badge")}>
                  <BadgeCheck className="w-3.5 h-3.5 mr-2" /> Badge
                  <span className="ml-auto text-[9px] text-[var(--sketch-fg-muted)] bg-[var(--sketch-fg-subtle)]/5 px-1 py-0.5 rounded border border-[var(--sketch-border-color)]/10 font-mono">B</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMode("watermark")}>
                  <Stamp className="w-3.5 h-3.5 mr-2" /> Watermark
                  <span className="ml-auto text-[9px] text-[var(--sketch-fg-muted)] bg-[var(--sketch-fg-subtle)]/5 px-1 py-0.5 rounded border border-[var(--sketch-border-color)]/10 font-mono">W</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Privacy</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setMode("blur")}>
                  <Aperture className="w-3.5 h-3.5 mr-2" /> Blur
                  <span className="ml-auto text-[9px] text-[var(--sketch-fg-muted)] bg-[var(--sketch-fg-subtle)]/5 px-1 py-0.5 rounded border border-[var(--sketch-border-color)]/10 font-mono">U</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMode("redact")}>
                  <Shield className="w-3.5 h-3.5 mr-2" /> Redact
                  <span className="ml-auto text-[9px] text-[var(--sketch-fg-muted)] bg-[var(--sketch-fg-subtle)]/5 px-1 py-0.5 rounded border border-[var(--sketch-border-color)]/10 font-mono">R</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMode("pixelate")}>
                  <Grid3x3 className="w-3.5 h-3.5 mr-2" /> Pixelate
                  <span className="ml-auto text-[9px] text-[var(--sketch-fg-muted)] bg-[var(--sketch-fg-subtle)]/5 px-1 py-0.5 rounded border border-[var(--sketch-border-color)]/10 font-mono">P</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMode("spotlight")}>
                  <Sun className="w-3.5 h-3.5 mr-2" /> Spotlight
                  <span className="ml-auto text-[9px] text-[var(--sketch-fg-muted)] bg-[var(--sketch-fg-subtle)]/5 px-1 py-0.5 rounded border border-[var(--sketch-border-color)]/10 font-mono">L</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMode("filter")}>
                  <Palette className="w-3.5 h-3.5 mr-2" /> Color Filter
                  <span className="ml-auto text-[9px] text-[var(--sketch-fg-muted)] bg-[var(--sketch-fg-subtle)]/5 px-1 py-0.5 rounded border border-[var(--sketch-border-color)]/10 font-mono">F</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Help Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hover:bg-[var(--sketch-fg-subtle)]/10 px-2 py-1 rounded transition-colors cursor-pointer leading-none">
                Help
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuItem onClick={() => startOnboardingTour()}>
                <Compass className="w-3.5 h-3.5 mr-2" /> Replay Editor Tour
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleRightTab("help")}>
                <HelpCircle className="w-3.5 h-3.5 mr-2" /> Help Guide
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleRightTab("safety")}>
                <Shield className="w-3.5 h-3.5 mr-2" /> Safety & Copyright Check
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toggleRightTab("voiceover")}>
                <Mic className="w-3.5 h-3.5 mr-2" /> Voiceover Guide
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleRightTab("transitions")}>
                <Film className="w-3.5 h-3.5 mr-2" /> Transitions Guide
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile Controls (Menu, Properties, Panels): visible only on small screens */}
        <div className="editor-menu-bar-mobile flex items-center gap-1 text-[11px] text-[var(--sketch-fg-muted)] font-medium leading-none select-none pl-2">
          {/* Menu Dropdown */}
          <DropdownMenu open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 hover:bg-[var(--sketch-fg-subtle)]/10 px-2 py-1.5 rounded transition-colors cursor-pointer leading-none text-[11px] font-bold text-[var(--sketch-fg)]">
                <Menu className="w-3.5 h-3.5" />
                <span>Menu</span>
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-[70vh] overflow-y-auto">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">File</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => { window.location.href = "/dashboard"; }}>
                <ArrowLeft className="w-3.5 h-3.5 mr-2" /> Back to Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-3.5 h-3.5 mr-2" /> Upload Screenshots…
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSaveStep}>
                <Save className="w-3.5 h-3.5 mr-2" /> Save Step
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Edit</DropdownMenuLabel>
              <DropdownMenuItem onClick={handleUndo} disabled={historyIndex <= 0}>
                <Undo2 className="w-3.5 h-3.5 mr-2" /> Undo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleRedo} disabled={historyIndex >= history.length - 1}>
                <Redo2 className="w-3.5 h-3.5 mr-2" /> Redo
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Tools</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setMode("select")}>
                <MousePointer className="w-3.5 h-3.5 mr-2" /> Select
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMode("pan")}>
                <Move className="w-3.5 h-3.5 mr-2" /> Pan
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMode("highlight")}>
                <Square className="w-3.5 h-3.5 mr-2" /> Highlight
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMode("zoom")}>
                <Target className="w-3.5 h-3.5 mr-2" /> Zoom Point
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMode("overlay")}>
                <Type className="w-3.5 h-3.5 mr-2" /> Text Overlay
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMode("blur")}>
                <Aperture className="w-3.5 h-3.5 mr-2" /> Blur
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMode("crop")}>
                <Crop className="w-3.5 h-3.5 mr-2" /> Crop
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleExportRequest}
                disabled={isPreparingExport}
              >
                <Download className="w-3.5 h-3.5 mr-2" /> Export Video…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Properties Button (toggles right sidebar with Properties tab) */}
          <button
            onClick={() => { toggleRightTab("properties"); setIsMobileSidebarOpen(true); }}
            className={`flex items-center gap-1 hover:bg-[var(--sketch-fg-subtle)]/10 px-2 py-1.5 rounded transition-colors cursor-pointer leading-none text-[11px] font-bold ${activeRightTab === "properties" ? "bg-[var(--sketch-accent)]/15 text-[var(--sketch-accent)]" : "text-[var(--sketch-fg)]"}`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Properties</span>
          </button>

          {/* Panels Dropdown Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`flex items-center gap-1 hover:bg-[var(--sketch-fg-subtle)]/10 px-2 py-1.5 rounded transition-colors cursor-pointer leading-none text-[11px] font-bold ${activeRightTab && activeRightTab !== "properties" ? "bg-[var(--sketch-accent)]/15 text-[var(--sketch-accent)]" : "text-[var(--sketch-fg)]"}`}>
                <Settings2 className="w-3.5 h-3.5" />
                <span>Panels</span>
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-[70vh] overflow-y-auto">
              <DropdownMenuItem onClick={() => { toggleRightTab("script"); setIsMobileSidebarOpen(true); }}>
                <Type className="w-3.5 h-3.5 mr-2" /> Script
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { toggleRightTab("voiceover"); setIsMobileSidebarOpen(true); }}>
                <Volume2 className="w-3.5 h-3.5 mr-2" /> Voiceover
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { toggleRightTab("elevenlabs"); setIsMobileSidebarOpen(true); }}>
                <Crown className="w-3.5 h-3.5 mr-2" /> ElevenLabs
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { toggleRightTab("captions"); setIsMobileSidebarOpen(true); }}>
                <Type className="w-3.5 h-3.5 mr-2" /> Captions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { toggleRightTab("transitions"); setIsMobileSidebarOpen(true); }}>
                <Film className="w-3.5 h-3.5 mr-2" /> Transitions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { toggleRightTab("introoutro"); setIsMobileSidebarOpen(true); }}>
                <Clapperboard className="w-3.5 h-3.5 mr-2" /> Intro / Outro
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { toggleRightTab("media"); setIsMobileSidebarOpen(true); }}>
                <Clapperboard className="w-3.5 h-3.5 mr-2" /> Media
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { toggleRightTab("safety"); setIsMobileSidebarOpen(true); }}>
                <Shield className="w-3.5 h-3.5 mr-2" /> Safety
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { toggleRightTab("help"); setIsMobileSidebarOpen(true); }}>
                <HelpCircle className="w-3.5 h-3.5 mr-2" /> Help Guide
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
            data-tour="toolbar"
            className="w-full bg-[var(--sketch-panel-bg)] border-b-2 border-[var(--sketch-border-color)] px-2 sm:px-4 flex items-center justify-between flex-shrink-0 select-none overflow-hidden h-[42px]"
          >
            {/* Left: Fit, Undo/Redo, Tools */}
            <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto toolbar-scroll-mobile">
              {/* Zoom Fit */}
              <div className="flex items-center gap-1 pr-2 border-r border-[var(--sketch-border-color)]/20">
                <Search className="w-3.5 h-3.5 text-[var(--sketch-fg-muted)]" />
                <select
                  value={
                    Math.abs(canvasScale - getFitScale()) < 0.01
                      ? "fit"
                      : Math.round(canvasScale * 100).toString()
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "fit") setCanvasScale(getFitScale());
                    else setCanvasScale(Number(val) / 100);
                  }}
                  className="bg-transparent text-[11px] font-medium text-[var(--sketch-fg-muted)] border-none outline-none cursor-pointer py-0.5 pr-1 focus:ring-0"
                >
                  <option value="fit" className="bg-white text-slate-900 ">Fit</option>
                  <option value="50" className="bg-white text-slate-900 ">50%</option>
                  <option value="75" className="bg-white text-slate-900 ">75%</option>
                  <option value="100" className="bg-white text-slate-900 ">100%</option>
                  <option value="150" className="bg-white text-slate-900 ">150%</option>
                  <option value="200" className="bg-white text-slate-900 ">200%</option>
                  <option value="300" className="bg-white text-slate-900 ">300%</option>
                </select>
              </div>

              {/* Undo / Redo */}
              <div className="flex items-center gap-0.5 pr-2 border-r border-[var(--sketch-border-color)]/20">
                <button
                  disabled={historyIndex <= 0}
                  onClick={handleUndo}
                  className="p-1 hover:bg-[var(--sketch-fg-subtle)]/20 rounded disabled:opacity-30 text-[var(--sketch-fg-muted)] cursor-pointer"
                  title="Undo"
                  aria-label="Undo"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={historyIndex >= history.length - 1}
                  onClick={handleRedo}
                  className="p-1 hover:bg-[var(--sketch-fg-subtle)]/20 rounded disabled:opacity-30 text-[var(--sketch-fg-muted)] cursor-pointer"
                  title="Redo"
                  aria-label="Redo"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Tools row */}
              <div className="flex items-center gap-1 px-1 overflow-x-auto scrollbar-none py-0.5 flex-1 min-w-0">
                <ToolbarToolButton active={mode === "select"} onClick={() => setMode("select")} icon={<MousePointer className="w-3.5 h-3.5" />} label="Select" description="Click to select and move annotations on the canvas." dataTour="tool-select" />
                <ToolbarToolButton active={mode === "pan"} onClick={() => setMode("pan")} icon={<Move className="w-3.5 h-3.5" />} label="Pan" description={canPan ? "Drag to move around the canvas. Hold Space from any tool for a moment of panning." : "Only useful once you have zoomed in past the fit: at this scale the whole scene is already visible, so there is nowhere to pan."} dataTour="tool-pan" />
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
                 
                  description="Drag to crop the screenshot. Removes areas outside the selection."
                  dataTour="tool-crop"
                />
                <div className="h-4 w-[1px] bg-[#D3D3D3]/50 mx-1 flex-shrink-0" />
                <ToolbarToolButton active={mode === "highlight"} onClick={() => setMode("highlight")} icon={<Square className="w-3.5 h-3.5" />} label="Highlight" description="Drag to draw a colored highlight box around important UI elements." dataTour="tool-highlight" />
                <ToolbarToolButton active={mode === "zoom"} onClick={() => setMode("zoom")} icon={<Target className="w-3.5 h-3.5" />} label="Zoom" description="Click to set a zoom target point. The camera will zoom into this area during the video. Add multiple points for a pan effect." dataTour="tool-zoom" />
                <div className="h-4 w-[1px] bg-[#D3D3D3]/50 mx-1 flex-shrink-0" />
                <ToolbarToolButton active={mode === "overlay"} onClick={() => setMode("overlay")} icon={<Type className="w-3.5 h-3.5" />} label="Text Overlay" description="Click to place custom text on the screenshot. Useful for labels and callouts." dataTour="tool-overlay" />
                <ToolbarToolButton active={mode === "badge"} onClick={() => setMode("badge")} icon={<BadgeCheck className="w-3.5 h-3.5" />} label="Badge" description="Click to add a numbered step badge. Automatically numbers your steps." dataTour="tool-badge" />
                <ToolbarToolButton active={mode === "watermark"} onClick={() => setMode("watermark")} icon={<Stamp className="w-3.5 h-3.5" />} label="Watermark" description="Add a text watermark to protect your video. Choose position and opacity." dataTour="tool-watermark" />
                <div className="h-4 w-[1px] bg-[#D3D3D3]/50 mx-1 flex-shrink-0" />
                <ToolbarToolButton active={mode === "blur"} onClick={() => setMode("blur")} icon={<Aperture className="w-3.5 h-3.5" />} label="Blur" description="Drag to blur sensitive information like passwords, emails, or API keys." dataTour="tool-blur" />
                <ToolbarToolButton active={mode === "redact"} onClick={() => setMode("redact")} icon={<Shield className="w-3.5 h-3.5" />} label="Redact" description="Drag to black out sensitive areas completely. Use for PII or confidential data." dataTour="tool-redact" />
                <ToolbarToolButton active={mode === "pixelate"} onClick={() => setMode("pixelate")} icon={<Grid3x3 className="w-3.5 h-3.5" />} label="Pixelate" description="Drag to pixelate an area. Less aggressive than blur, good for faces." dataTour="tool-pixelate" />
                <ToolbarToolButton active={mode === "spotlight"} onClick={() => setMode("spotlight")} icon={<Sun className="w-3.5 h-3.5" />} label="Spotlight" description="Drag to highlight an area with a bright spotlight effect. Dims the rest." dataTour="tool-spotlight" />
                <ToolbarToolButton active={mode === "filter"} onClick={() => setMode("filter")} icon={<Palette className="w-3.5 h-3.5" />} label="Filter" description="Apply color filters like grayscale, sepia, or invert to the screenshot." dataTour="tool-filter" />
              </div>
            </div>

            {/* Right: Collapse toggle */}
            <div className="flex items-center">
              <button
                onClick={() => setIsToolbarCollapsed(true)}
                className="p-1 hover:bg-[var(--sketch-fg-subtle)]/20 rounded text-[var(--sketch-fg-muted)] cursor-pointer"
                title="Collapse toolbar"
                aria-label="Collapse toolbar"
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
          className="absolute left-4 top-[64px] z-50 p-1 bg-[var(--sketch-surface)] border border-[var(--sketch-border-color)]/20 shadow-sm hover:bg-[var(--sketch-fg-subtle)]/10 rounded-full text-[var(--sketch-fg-muted)] cursor-pointer"
          title="Expand toolbar"
          aria-label="Expand toolbar"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      )}

      {/* 3. Main Split Workspace: canvas+timeline (left) | sidebar+tabs (right) */}
      <div className="flex-1 flex flex-col md:flex-row items-stretch min-h-0 w-full overflow-hidden">

        {/* LEFT COLUMN: Canvas + Timeline stacked vertically */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Canvas area */}
          <div
            data-tour="canvas"
            className="flex-1 flex flex-col bg-[var(--sketch-bg)] relative min-w-0 p-2 sm:p-4 min-h-0"
            // Dropping screenshots straight onto the canvas. The timeline
            // already accepted drops; the canvas is the larger, more obvious
            // target and is where people try it first.
            onDragEnter={(e) => {
              if (!dragCarriesMedia(e)) return;
              e.preventDefault();
              setCanvasDragDepth((d) => d + 1);
            }}
            onDragOver={(e) => {
              if (!dragCarriesMedia(e)) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }}
            onDragLeave={(e) => {
              if (!dragCarriesMedia(e)) return;
              setCanvasDragDepth((d) => Math.max(0, d - 1));
            }}
            onDrop={(e) => {
              if (!dragCarriesMedia(e)) return;
              e.preventDefault();
              setCanvasDragDepth(0);

              const pexels = e.dataTransfer.getData("application/x-pexels-media");
              if (pexels) {
                try {
                  handleImportPexelsMedia(JSON.parse(pexels));
                } catch {
                  toast.error("Could not read that item.");
                }
                return;
              }

              const files = e.dataTransfer.files;
              if (!files?.length) return;

              const dropped = Array.from(files);
              const media = dropped.filter((f) => f.type.startsWith("image/"));
              const videos = dropped.filter((f) => f.type.startsWith("video/"));

              if (media.length === 0) {
                toast.error(
                  videos.length > 0
                    ? "Scenes are screenshots. Add a video as an intro or outro instead."
                    : "Drop screenshots or images."
                );
                return;
              }
              // Named separately from other rejects, because a dropped video is
              // a reasonable thing to try and has somewhere else to go.
              if (videos.length > 0) {
                toast.info(
                  `Skipped ${videos.length} video${videos.length === 1 ? "" : "s"}. Videos can be an intro or outro, not a scene.`
                );
              }
              const otherSkipped = dropped.length - media.length - videos.length;
              if (otherSkipped > 0) {
                toast.info(`Skipped ${otherSkipped} file(s) that were not images.`);
              }

              const list = new DataTransfer();
              for (const f of media) list.items.add(f);
              handleUploadFiles(list.files);
            }}
          >
            {canvasDragDepth > 0 && (
              <div className="absolute inset-2 sm:inset-4 z-40 pointer-events-none rounded-md border-2 border-dashed border-[var(--sketch-accent)] bg-[var(--sketch-accent)]/5 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 rounded-lg bg-[var(--sketch-surface)] px-5 py-4 shadow-lg border border-[var(--sketch-border-color)]">
                  <Upload className="w-5 h-5 text-[var(--sketch-accent)]" />
                  <span className="text-sm font-medium text-[var(--sketch-fg)]">Drop to add as new scenes</span>
                  <span className="text-[11px] text-[var(--sketch-fg-muted)]">Images and videos, sorted by filename</span>
                </div>
              </div>
            )}
            <div className="flex-1 w-full relative min-h-0 flex flex-col overflow-hidden">
              {currentStep ? (
                <div
                  ref={scrollContainerRef}
                  className={`w-full flex-grow flex-1 min-h-0 border border-[var(--sketch-border-color)]/20 rounded-md bg-[var(--sketch-bg)] relative ${canvasScale > 1.0
                      ? "overflow-auto"
                      : "overflow-hidden flex items-center justify-center p-2"
                    }`}
                >
                  <div
                    style={{
                      display: "flex",
                      minWidth: "100%",
                      minHeight: "100%",
                      padding: "40px",
                    }}
                  >
                    <div
                      style={{
                        width: `${canvasDim.width * canvasScale}px`,
                        height: `${canvasDim.height * canvasScale}px`,
                        position: "relative",
                        margin: "auto",
                        flexShrink: 0,
                      }}
                    >
                      <div
                        ref={canvasRef}
                        className={`relative overflow-hidden border border-[var(--sketch-border-color)]/35 bg-[#000000] shadow-2xl flex-shrink-0 select-none ${mode === "pan"
                            ? "cursor-grab active:cursor-grabbing"
                            : mode === "select"
                              ? "cursor-default"
                              : "cursor-crosshair"
                          }`}
                        style={{
                          width: `${canvasDim.width}px`,
                          height: `${canvasDim.height}px`,
                          transform: `scale(${canvasScale})`,
                          transformOrigin: "top left",
                          position: "absolute",
                          left: 0,
                          top: 0,
                          transition: isPanningRef.current ? "none" : "transform 0.1s ease-out",
                        }}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                    >
                      {currentStep.screenshotPath ? (
                        timelineClips[currentStepIndex]?.isVideo ? (
                          <video
                            ref={imageRef as any}
                            src={currentStep.screenshotPath}
                            className="w-full h-full object-contain select-none absolute inset-0"
                            style={{
                              zIndex: 0,
                              filter: colorFilterCss(
                                currentAnn?.editorColorFilter,
                                currentAnn?.editorColorFilterStrength
                              ),
                            }}
                            muted
                            playsInline
                            // Native controls only in select mode: while a
                            // drawing tool is active they would swallow the
                            // clicks meant for annotating. The floating play
                            // button below works in every mode.
                            controls={mode === "select"}
                            controlsList="nodownload noplaybackrate"
                            onPlay={() => setVideoPlaying(true)}
                            onPause={() => setVideoPlaying(false)}
                            onEnded={() => setVideoPlaying(false)}
                            draggable={false}
                            onLoadedData={updateBounds}
                          />
                        ) : (
                          <img
                            ref={imageRef as any}
                            src={currentStep.screenshotPath}
                            alt={`Step ${currentStepIndex + 1}`}
                            className="w-full h-full object-contain select-none absolute inset-0"
                            style={{
                              zIndex: 0,
                              filter: colorFilterCss(
                                currentAnn?.editorColorFilter,
                                currentAnn?.editorColorFilterStrength
                              ),
                            }}
                            draggable={false}
                            onLoad={updateBounds}
                          />
                        )
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-start p-6 overflow-y-auto gap-4 bg-[var(--sketch-bg)]">
                          <div className="text-center py-4">
                            <Target className="w-10 h-10 text-[var(--sketch-fg-subtle)] mx-auto mb-2 animate-pulse" />
                            <p className="font-body text-sm text-[var(--sketch-fg-subtle)] font-semibold">
                              No screenshot uploaded for this scene.
                            </p>
                            <p className="text-[11px] text-[var(--sketch-fg-muted)] mt-1">
                              Drag and drop or upload an image in the timeline below to begin annotating.
                            </p>
                          </div>
                          <div className="w-full max-w-2xl border-t border-[var(--sketch-border-color)]/15 pt-4">
                            <GettingStartedNote onAddScreenshots={() => handleTimelineAdd()} />
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
                            zIndex: 2,
                          }}
                        >
                            {/* Highlight boxes (multiple, like blur) */}
                            {(currentAnn?.editorHighlights || []).map((hl, idx) => (
                              <div
                                key={hl.id}
                                className="absolute cursor-move select-none group"
                                style={{
                                  left: `${hl.x}%`,
                                  top: `${hl.y}%`,
                                  width: `${hl.w}%`,
                                  height: `${hl.h}%`,
                                  border: `2px solid ${hl.color || "#FF0099"}`,
                                  pointerEvents: overlayPointer("highlight"),
                                  backgroundColor: "rgba(255,0,153,0.03)",
                                  boxShadow: "0 0 0 1px rgba(255,255,255,0.8), 0 2px 8px rgba(0,0,0,0.25)",
                                }}
                                onMouseDown={(e) => {
                                  if ((e.target as HTMLElement).dataset.handle) return;
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setMode("highlight");
                                  const coords = getCanvasCoords(e);
                                  if (!coords) return;
                                  setDragItem({
                                    type: "highlightArr",
                                    id: hl.id,
                                    startX: coords.x,
                                    startY: coords.y,
                                    initialX: hl.x,
                                    initialY: hl.y,
                                    initialW: hl.w,
                                    initialH: hl.h,
                                  });
                                }}
                              >
                                <div className="absolute -top-5 left-0 bg-[#FF0099] text-white text-[9px] font-mono px-1.5 py-0.5 rounded-t font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-sm z-20">
                                  Highlight {idx + 1}
                                </div>
                                <button
                                  className="absolute -top-3 -right-3 w-4.5 h-4.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto shadow-md hover:scale-110 z-30"
                                  style={{ zIndex: 30 }}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const next = {
                                      ...annotations,
                                      [currentStep.id]: {
                                        ...(annotations[currentStep.id] || {}),
                                        editorHighlights: (currentAnn?.editorHighlights || []).filter((r) => r.id !== hl.id),
                                      },
                                    };
                                    pushHistory(next);
                                  }}
                                >
                                  ×
                                </button>
                                {RESIZE_HANDLES.map((h) => (
                                  <div
                                    key={h.name}
                                    data-handle={h.name}
                                    className="absolute w-2 h-2 bg-white border border-[#FF0099] rounded-full pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity"
                                    style={{ ...h.style, zIndex: 10 }}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setMode("highlight");
                                      const coords = getCanvasCoords(e);
                                      if (!coords) return;
                                      setDragItem({
                                        type: "highlightArr",
                                        id: hl.id,
                                        startX: coords.x,
                                        startY: coords.y,
                                        initialX: hl.x,
                                        initialY: hl.y,
                                        initialW: hl.w,
                                        initialH: hl.h,
                                      });
                                      handleResizeRef.current = h.name;
                                    }}
                                  />
                                ))}
                              </div>
                            ))}

                            {/* Temp drag rect */}
                            {tempRect && (
                              <div
                                className="absolute pointer-events-none select-none"
                                style={{
                                  left: `${tempRect.x}%`,
                                  top: `${tempRect.y}%`,
                                  width: `${tempRect.w}%`,
                                  height: `${tempRect.h}%`,
                                  border: "2px dashed #00E5FF",
                                  backgroundColor: "rgba(0,229,255,0.08)",
                                  boxShadow: "0 0 0 1px rgba(255,255,255,0.7)",
                                }}
                              />
                            )}

                            {/* Play control for video scenes.
                                Native controls are hidden outside select mode
                                so they cannot eat annotation clicks, which left
                                no way to watch a clip at all. This stays put in
                                every mode and is small enough not to obstruct
                                the canvas. */}
                            {timelineClips[currentStepIndex]?.isVideo && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const v = imageRef.current as HTMLVideoElement | null;
                                  if (!v) return;
                                  if (v.paused) void v.play().catch(() => {});
                                  else v.pause();
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                                title={videoPlaying ? "Pause clip" : "Play clip"}
                                aria-label={videoPlaying ? "Pause clip" : "Play clip"}
                                className="absolute bottom-2 left-2 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/65 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/80"
                              >
                                {videoPlaying ? (
                                  <Pause className="h-4 w-4" />
                                ) : (
                                  <Play className="ml-0.5 h-4 w-4 fill-current" />
                                )}
                              </button>
                            )}

                            {/* Crop overlay: Canva style with dimmed outside + edge handles */}
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

                                {/* Crop selection rectangle: draggable to move, with edge handles to resize */}
                                <div
                                  className="absolute cursor-move select-none"
                                  style={{
                                    left: `${cropRect.x}%`,
                                    top: `${cropRect.y}%`,
                                    width: `${cropRect.w}%`,
                                    height: `${cropRect.h}%`,
                                    border: "2px solid #00E676",
                                    pointerEvents: overlayPointer("crop"),
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
                                  <div className="absolute -top-5 left-0 bg-[#00E676] text-black text-[10px] px-1.5 rounded font-medium leading-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                    Crop: keep this area
                                  </div>

                                  {/* Edge handles: 8 resize handles (corners + midpoints) */}
                                  {RESIZE_HANDLES.map((h) => (
                                    <div
                                      key={h.name}
                                      data-handle={h.name}
                                      className="absolute w-2.5 h-2.5 bg-[var(--sketch-surface)] border border-[#00E676] rounded-[2px] pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity"
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
                                className="absolute cursor-move select-none group"
                                style={{
                                  left: `${blurRegion.x}%`,
                                  top: `${blurRegion.y}%`,
                                  width: `${blurRegion.w}%`,
                                  height: `${blurRegion.h}%`,
                                  border: "2px solid #FF4081",
                                  pointerEvents: overlayPointer("blur"),
                                  boxShadow:
                                    selectedRegion?.kind === "blur" && selectedRegion.id === blurRegion.id
                                      ? "0 0 0 2px rgba(56,189,248,0.9)"
                                      : "0 0 0 1px rgba(255,255,255,0.75)",
                                }}
                                onMouseDown={(e) => {
                                  if ((e.target as HTMLElement).dataset.handle) return;
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setMode("blur");
                                  setSelectedRegion({ kind: "blur", id: blurRegion.id });
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
                                {/* The blurred stand-in for this region.
                                    `backdrop-filter` was the obvious way to do this
                                    and the wrong one: it samples whatever is painted
                                    behind the element, and this canvas sits under a
                                    `transform: scale()` that is 1.0 only when the
                                    viewport happens to fit the fixed 640x360 box. On
                                    a bigger screen the scale rises and Chrome sampled
                                    the backdrop from the wrong place, smearing content
                                    from elsewhere in the frame into the box.

                                    So this blurs a real copy of the screenshot instead
                                    and clips it to the region. Geometry is in pixels
                                    off `bounds`, not percentages: a percentage chain
                                    has to resolve through the region box, its border
                                    and box-sizing, and every one of those is a way for
                                    the copy to land somewhere other than exactly over
                                    the original.

                                    The wrapper is `absolute inset-0`, which makes it
                                    both the clip and the containing block. It has to be
                                    positioned: `overflow` only clips an absolutely
                                    positioned child when the overflow element is in
                                    that child's containing-block chain, and while this
                                    was static the copy escaped and painted over the
                                    whole canvas.

                                    Video scenes keep backdrop-filter: an <img> cannot
                                    show a frame of an mp4, and a second decoding
                                    <video> per region is not worth it for a preview. */}
                                <div
                                  className="absolute inset-0 overflow-hidden"
                                  style={{
                                    // Fail closed. If the copy cannot be drawn - the
                                    // media still loading, a request that did not land -
                                    // the region must not sit there transparent showing
                                    // the very thing it is meant to hide. The copy is
                                    // opaque and covers this whenever it does render.
                                    backgroundColor: "#6B7280",
                                  }}
                                >
                                  {timelineClips[currentStepIndex]?.isVideo ? (
                                    <div
                                      className="w-full h-full"
                                      style={{
                                        backdropFilter: `blur(${previewBlurPx(blurRegion.intensity ?? currentAnn?.editorBlurIntensity ?? 20)}px)`,
                                        WebkitBackdropFilter: `blur(${previewBlurPx(blurRegion.intensity ?? currentAnn?.editorBlurIntensity ?? 20)}px)`,
                                        backgroundColor: "rgba(255,255,255,0.05)",
                                      }}
                                    />
                                  ) : (
                                    <img
                                      src={currentStep.screenshotPath ?? undefined}
                                      alt=""
                                      draggable={false}
                                      className="absolute pointer-events-none select-none"
                                      style={{
                                        // The media at its displayed size, shifted so
                                        // the slice showing through the clip is this
                                        // region's own content. BLUR_CLIP_INSET backs
                                        // out the region's border: the wrapper starts
                                        // inside it, but the region's percentage
                                        // position is measured from outside it.
                                        width: `${bounds.visibleW}px`,
                                        height: `${bounds.visibleH}px`,
                                        left: `${-(blurRegion.x / 100) * bounds.visibleW - BLUR_CLIP_INSET}px`,
                                        top: `${-(blurRegion.y / 100) * bounds.visibleH - BLUR_CLIP_INSET}px`,
                                        // Tailwind's preflight caps images at
                                        // `max-width: 100%`, which would shrink the
                                        // copy to the region and destroy the alignment.
                                        maxWidth: "none",
                                        maxHeight: "none",
                                        filter: `blur(${previewBlurPx(blurRegion.intensity ?? currentAnn?.editorBlurIntensity ?? 20)}px)`,
                                      }}
                                    />
                                  )}
                                </div>
                                <div className="absolute -top-5 left-0 bg-[#FF4081] text-white text-[10px] px-1.5 rounded font-medium leading-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                  Blur {idx + 1}
                                </div>
                                <button
                                  className="absolute -top-5 right-0 w-4 h-4 bg-red-600/90 text-white text-[10px] leading-none rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
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
                                {RESIZE_HANDLES.map((h) => (
                                  <div
                                    key={h.name}
                                    data-handle={h.name}
                                    className="absolute w-2.5 h-2.5 bg-white border border-[#FF4081] rounded-[2px] pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity"
                                    style={{ ...h.style, zIndex: 10 }}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setMode("blur");
                                      setSelectedRegion({ kind: "blur", id: blurRegion.id });
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
                                      handleResizeRef.current = h.name;
                                    }}
                                  />
                                ))}
                              </div>
                            ))}

                            {/* Redact overlays (multiple regions) */}
                            {(currentAnn?.editorRedacts || []).map((redactRegion, idx) => {
                              const isSelected =
                                selectedRegion?.kind === "redact" && selectedRegion.id === redactRegion.id;
                              const startDrag = (e: React.MouseEvent, handleName?: string) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setMode("redact");
                                setSelectedRegion({ kind: "redact", id: redactRegion.id });
                                const coords = getCanvasCoords(e);
                                if (!coords) return;
                                setDragItem({
                                  type: "redactArr",
                                  id: redactRegion.id,
                                  startX: coords.x,
                                  startY: coords.y,
                                  initialX: redactRegion.x,
                                  initialY: redactRegion.y,
                                  initialW: redactRegion.w,
                                  initialH: redactRegion.h,
                                });
                                if (handleName) handleResizeRef.current = handleName;
                              };
                              return (
                                <div
                                  key={redactRegion.id}
                                  className="absolute cursor-move select-none group"
                                  style={{
                                    left: `${redactRegion.x}%`,
                                    top: `${redactRegion.y}%`,
                                    width: `${redactRegion.w}%`,
                                    height: `${redactRegion.h}%`,
                                    backgroundColor: redactRegion.color || currentAnn?.editorRedactColor || "#000000",
                                    pointerEvents: overlayPointer("redact"),
                                    border: isSelected ? "2px solid #38BDF8" : "2px solid #FFFFFF",
                                    boxShadow: isSelected
                                      ? "0 0 0 2px rgba(56,189,248,0.5), 0 4px 12px rgba(0,0,0,0.4)"
                                      : "0 0 0 1px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4)",
                                  }}
                                  onMouseDown={(e) => {
                                    if ((e.target as HTMLElement).dataset.handle) return;
                                    startDrag(e);
                                  }}
                                >
                                  <div className="absolute top-1 left-1 bg-gray-900 text-white text-[10px] font-mono px-1 rounded font-bold border border-white/50">
                                    Redacted {idx + 1}
                                  </div>
                                  <button
                                    className="absolute -top-5 right-0 w-4 h-4 bg-red-600/90 text-white text-[10px] leading-none rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      pushHistory({
                                        ...annotations,
                                        [currentStep.id]: {
                                          ...(annotations[currentStep.id] || {}),
                                          editorRedacts: (currentAnn?.editorRedacts || []).filter(
                                            (r) => r.id !== redactRegion.id
                                          ),
                                        },
                                      });
                                    }}
                                  >
                                    x
                                  </button>
                                  {RESIZE_HANDLES.map((h) => (
                                    <div
                                      key={h.name}
                                      data-handle={h.name}
                                      className="absolute w-2.5 h-2.5 bg-white border border-gray-900 rounded-[2px] pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity"
                                      style={{ ...h.style, zIndex: 10 }}
                                      onMouseDown={(e) => startDrag(e, h.name)}
                                    />
                                  ))}
                                </div>
                              );
                            })}

                            {/* Watermark preview.
                                Positioned against the canvas container, which is
                                sized to the project aspect ratio and therefore IS
                                the output frame, the same thing FFmpeg positions
                                the watermark against. Do not re-anchor this to the
                                crop rectangle: the crop changes what fills the
                                frame, not where the frame's edges are. */}
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
                                className="absolute cursor-move select-none group"
                                style={{
                                  left: `${pixRegion.x}%`,
                                  top: `${pixRegion.y}%`,
                                  width: `${pixRegion.w}%`,
                                  height: `${pixRegion.h}%`,
                                  border: "2px solid #00BCD4",
                                  pointerEvents: overlayPointer("pixelate"),
                                  boxShadow:
                                    selectedRegion?.kind === "pixelate" && selectedRegion.id === pixRegion.id
                                      ? "0 0 0 2px rgba(56,189,248,0.9)"
                                      : "0 0 0 1px rgba(255,255,255,0.75)",
                                }}
                                onMouseDown={(e) => {
                                  if ((e.target as HTMLElement).dataset.handle) return;
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setMode("pixelate");
                                  setSelectedRegion({ kind: "pixelate", id: pixRegion.id });
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
                                <div className="absolute -top-5 left-0 bg-[#00BCD4] text-white text-[10px] px-1.5 rounded font-medium leading-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                  Pixelate {idx + 1}
                                </div>
                                <button
                                  className="absolute -top-5 right-0 w-4 h-4 bg-red-600/90 text-white text-[10px] leading-none rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
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
                                {RESIZE_HANDLES.map((h) => (
                                  <div
                                    key={h.name}
                                    data-handle={h.name}
                                    className="absolute w-2.5 h-2.5 bg-white border border-[#00BCD4] rounded-[2px] pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity"
                                    style={{ ...h.style, zIndex: 10 }}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setMode("pixelate");
                                      setSelectedRegion({ kind: "pixelate", id: pixRegion.id });
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
                                      handleResizeRef.current = h.name;
                                    }}
                                  />
                                ))}
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
                                    className="absolute cursor-move select-none group"
                                    style={{
                                      left: `${spotRegion.x}%`,
                                      top: `${spotRegion.y}%`,
                                      width: `${spotRegion.w}%`,
                                      height: `${spotRegion.h}%`,
                                      border:
                                        selectedRegion?.kind === "spotlight" && selectedRegion.id === spotRegion.id
                                          ? "2px solid #38BDF8"
                                          : "2px solid #FF6D00",
                                      pointerEvents: overlayPointer("spotlight"),
                                      borderRadius: "4px",
                                      boxShadow: `0 0 0 9999px rgba(0,0,0,${spotRegion.intensity ?? currentAnn?.editorSpotlightIntensity ?? 0.6}), 0 0 0 1px rgba(255,255,255,0.9)`,
                                    }}
                                    onMouseDown={(e) => {
                                      if ((e.target as HTMLElement).dataset.handle) return;
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setMode("spotlight");
                                      setSelectedRegion({ kind: "spotlight", id: spotRegion.id });
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
                                    <div className="absolute -top-5 left-0 bg-[#FF6D00] text-white text-[10px] px-1.5 rounded font-medium leading-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                      Spotlight {idx + 1}
                                    </div>
                                    <button
                                      className="absolute -top-5 right-0 w-4 h-4 bg-red-600/90 text-white text-[10px] leading-none rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
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
                                    {RESIZE_HANDLES.map((h) => (
                                      <div
                                        key={h.name}
                                        data-handle={h.name}
                                        className="absolute w-2.5 h-2.5 bg-white border border-[#FF6D00] rounded-[2px] pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{ ...h.style, zIndex: 10 }}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setMode("spotlight");
                                          setSelectedRegion({ kind: "spotlight", id: spotRegion.id });
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
                                          handleResizeRef.current = h.name;
                                        }}
                                      />
                                    ))}
                                  </div>
                                ))}
                              </>
                            )}

                            {/* Badge overlays (multiple badges) */}
                            {(currentAnn?.editorBadges || []).map((badge) => {
                              const isSelected =
                                selectedRegion?.kind === "badge" && selectedRegion.id === badge.id;
                              return (
                                <div
                                  key={badge.id}
                                  className="absolute cursor-move select-none group"
                                  style={{
                                    left: `${badge.x}%`,
                                    top: `${badge.y}%`,
                                    transform: "translate(-50%, -50%)",
                                    pointerEvents: overlayPointer("badge"),
                                  }}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setMode("badge");
                                    setSelectedRegion({ kind: "badge", id: badge.id });
                                    const coords = getCanvasCoords(e);
                                    if (!coords) return;
                                    setDragItem({
                                      type: "badgeArr",
                                      id: badge.id,
                                      startX: coords.x,
                                      startY: coords.y,
                                      initialX: badge.x,
                                      initialY: badge.y,
                                    });
                                  }}
                                >
                                  <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg"
                                    style={{
                                      backgroundColor: badge.color || currentAnn?.editorBadgeColor || "#FBBF24",
                                      color: "#000",
                                      outline: isSelected ? "2px solid #38BDF8" : "none",
                                      outlineOffset: "2px",
                                    }}
                                  >
                                    {badge.number}
                                  </div>
                                  <button
                                    className="absolute -top-2 -right-2 w-4 h-4 bg-red-600/90 text-white text-[10px] leading-none rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      pushHistory({
                                        ...annotations,
                                        [currentStep.id]: {
                                          ...(annotations[currentStep.id] || {}),
                                          editorBadges: (currentAnn?.editorBadges || []).filter(
                                            (b) => b.id !== badge.id
                                          ),
                                        },
                                      });
                                    }}
                                  >
                                    x
                                  </button>
                                </div>
                              );
                            })}

                            {/* Magnify overlay */}
                            {currentAnn?.editorMagnifyX != null && currentAnn?.editorMagnifyW != null && (
                              <div
                                className="absolute cursor-move border-2 border-white shadow-lg overflow-hidden bg-black select-none"
                                style={{
                                  ...(currentAnn.editorMagnifyCorner?.includes("top") ? { top: "10px" } : { bottom: "10px" }),
                                  ...(currentAnn.editorMagnifyCorner?.includes("left") ? { left: "10px" } : { right: "10px" }),
                                  pointerEvents: overlayPointer("magnify"),
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

                            {/* Text overlay.
                                Wrapped and clamped the same way buildOverlayTextFilter
                                does it, so what shows here is what gets drawn. The old
                                preview was one `whitespace-nowrap` line at a fixed
                                12/16/20px, which neither tracked the canvas size nor
                                stayed inside the frame: a long label ran off both edges
                                in the editor and in the export. */}
                            {overlayPos && overlayPos.x != null && currentAnn?.editorOverlayText && (() => {
                              const layout = overlayPreviewLayout(
                                currentAnn.editorOverlayText,
                                currentAnn.editorOverlaySize
                              );
                              if (!layout) return null;
                              return (
                                <div
                                  className="absolute cursor-move select-none"
                                  style={{
                                    left: `${layout.left}%`,
                                    top: `${layout.top}%`,
                                    transform: "translate(-50%, -50%)",
                                    pointerEvents: overlayPointer("overlay"),
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
                                    className="px-3 py-1.5 rounded shadow-lg font-body font-semibold text-center"
                                    style={{
                                      backgroundColor: "rgba(0,0,0,0.6)",
                                      color: currentAnn.editorOverlayColor || "#FFFFFF",
                                      fontSize: `${layout.fontSize}px`,
                                      lineHeight: 1.25,
                                      whiteSpace: "pre-line",
                                    }}
                                  >
                                    {layout.lines.join("\n")}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Zoom target point.
                                Hidden once there are waypoints, because it is
                                the same target drawn twice: placing a point sets
                                this too, so both markers appeared stacked and
                                looked like one - until a point was dragged, and
                                a second, stale marker was left behind with
                                nothing to say which one the camera would use. */}
                            {(currentAnn?.editorMultiZooms?.length ?? 0) === 0 &&
                              currentAnn?.zoomTargetX != null && currentAnn?.zoomTargetY != null && (
                              <div
                                className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 cursor-move select-none"
                                style={{
                                  left: `${currentAnn.zoomTargetX}%`,
                                  top: `${currentAnn.zoomTargetY}%`,
                                  pointerEvents: overlayPointer("zoom"),
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setMode("zoom");
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
                                className="absolute cursor-move select-none"
                                style={{
                                  left: `${mz.targetX}%`,
                                  top: `${mz.targetY}%`,
                                  transform: "translate(-50%, -50%)",
                                  pointerEvents: overlayPointer("zoom"),
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setMode("zoom");
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
                        <div className={`absolute bottom-2 left-2 text-white text-[10px] font-mono px-2 py-1 rounded z-10 ${
                          mode === "pan" && !canPan ? "bg-amber-600/85" : "bg-black/60"
                        }`}>
                          {/* Pan and select had no entry at all, so the strip
                              went blank in the two modes people reach first -
                              including the one that does nothing until you have
                              zoomed in, which is what made it look broken. */}
                          {mode === "select" && "Click an annotation to select it"}
                          {mode === "pan" &&
                            (canPan
                              ? "Drag to move around the canvas"
                              : "Nothing to pan yet - the whole scene fits. Zoom in with Ctrl + first.")}
                          {mode === "highlight" && "Drag to highlight area"}
                          {mode === "zoom" && "Click to add zoom point"}
                          {mode === "overlay" && "Click to place text"}
                          {mode === "crop" && "Drag to crop"}
                          {mode === "blur" && "Drag to blur area"}
                          {mode === "redact" && "Drag to redact area"}
                          {mode === "watermark" && "Click to place watermark"}
                          {mode === "pixelate" && "Drag to pixelate area"}
                          {mode === "spotlight" && "Drag spotlight area"}
                          {mode === "badge" && "Click to place badge"}
                          {mode === "filter" && "Select filter from panel"}
                          {mode === "magnify" && "Click to place the magnifier"}
                          {mode === "caption" && "Set this scene's caption in the panel"}
                        </div>

                        {/* Audio generated indicator */}
                        {currentStep?.audioPath && (
                          <div className="absolute top-2 right-2 bg-blue-600/80 text-white text-[9px] font-bold px-2 py-1 rounded-full backdrop-blur-sm flex items-center gap-1 z-10">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                            AUDIO
                          </div>
                        )}

                        {/* Live caption preview.
                            Geometry mirrors buildCaptionsFilter in
                            api/lib/ffmpeg.ts, because it previously did not:
                            the preview used a fixed 10/14/18px font and sat 8%
                            from the bottom, while the render scales the font to
                            min(width,height) and places the line a fifth of the
                            frame from the edge. On a 9:16 canvas that made a
                            "Medium / Bottom" caption preview as a huge block
                            floating mid-frame, which is why the caption settings
                            looked like they were being ignored. */}
                        {(props.captionsEnabled ?? true) && currentStep && (() => {
                          const frameW = canvasDim.width * canvasScale;
                          const frameH = canvasDim.height * canvasScale;
                          const baseDim = Math.min(frameW, frameH);
                          const sizeFactor =
                            props.captionSize === "small" ? 0.05
                              : props.captionSize === "large" ? 0.09
                                : 0.07;
                          const fontSize = Math.max(7, baseDim * sizeFactor);
                          // Same wrap width the renderer uses: 20 characters on
                          // a vertical frame, 40 on a horizontal one.
                          const maxChars = frameW < frameH ? 20 : 40;
                          const isOutline = props.captionStyle === "outline";
                          const isHighlight = props.captionStyle === "highlight";
                          const pos = props.captionPosition;

                          return (
                            <div
                              className="absolute left-1/2 z-10 pointer-events-none text-center"
                              style={{
                                // h/5 from the relevant edge, matching yPos.
                                bottom: pos === "top" ? "auto" : pos === "middle" ? "50%" : "20%",
                                top: pos === "top" ? "20%" : "auto",
                                transform: pos === "middle" ? "translate(-50%, 50%)" : "translateX(-50%)",
                                // `drawtext` never wraps: the renderer has
                                // already split the script into lines that fit,
                                // and draws exactly one at a time. Wrapping here
                                // would show two lines where the video shows one.
                                whiteSpace: "nowrap",
                                fontSize: `${fontSize}px`,
                                lineHeight: 1.25,
                                color: props.captionColor || "#FFFFFF",
                                fontFamily: "sans-serif",
                                fontWeight: 600,
                                textShadow: props.captionStyle === "standard" ? "0 2px 4px rgba(0,0,0,0.85)" : "none",
                                // Stroke scaled to the type and painted behind
                                // the glyph. A fixed 1.5px stroke drawn over the
                                // letters ate into the strokes at small sizes,
                                // which is what made outlined captions look
                                // smudged rather than outlined.
                                WebkitTextStrokeWidth: isOutline ? `${Math.max(1, fontSize * 0.08)}px` : "0",
                                WebkitTextStrokeColor: isOutline ? "#000" : "transparent",
                                paintOrder: "stroke fill",
                                backgroundColor: isHighlight ? "rgba(0,0,0,0.6)" : "transparent",
                                borderRadius: isHighlight ? `${Math.max(2, fontSize * 0.2)}px` : "0",
                                padding: isHighlight ? `${fontSize * 0.2}px ${fontSize * 0.5}px` : "0",
                              }}
                            >
                              {firstCaptionLine(
                                (currentStep.userEditedScript ?? currentStep.aiScript) ||
                                  currentStep.description ||
                                  "Caption preview will appear here",
                                maxChars
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-grow w-full h-full flex flex-col items-center justify-center p-6 bg-[var(--sketch-bg)] overflow-y-auto">
                  <div className="text-center max-w-2xl space-y-4 py-8">
                    <Target className="w-10 h-10 text-[var(--sketch-fg-subtle)] mx-auto mb-2 animate-bounce" />
                    <p className="font-body text-sm text-[var(--sketch-fg-subtle)] font-bold">
                      No scene selected. Click a scene clip in the timeline below to begin editing.
                    </p>
                    <div className="border-t border-[var(--sketch-border-color)]/15 pt-4">
                      <GettingStartedNote onAddScreenshots={() => handleTimelineAdd()} />
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>

          {/* Timeline sits under canvas, not full width */}
          <Timeline
            clips={timelineClips}
            onCapture={(m) => setCaptureMode(m)}
            currentIndex={currentStepIndex}
            onClipSelect={setCurrentStepIndex}
            onClipReorder={handleTimelineReorder}
            onClipDelete={handleTimelineDelete}
            onClipTrim={handleTimelineTrim}
            onAddClip={handleTimelineAdd}
            onOpenFraming={props.onOpenFraming}
            onDropFiles={handleUploadFiles}
            onDropPexels={handleImportPexelsMedia}
            uploadingCount={uploadingFilesCount}
            transitions={props.stepTransitions}
            onTransitionClick={(clipId) => {
              setActiveTransitionClipId(clipId);
              setActiveRightTab("transitions");
            }}
            introTemplate={introTemplate}
            introText={introText}
            introVideoPath={project?.introVideoPath || null}
            introDuration={introDuration}
            outroTemplate={outroTemplate}
            outroText={outroText}
            outroVideoPath={project?.outroVideoPath || null}
            outroDuration={outroDuration}
            onIntroClick={() => { setIntroOutroMode("intro"); toggleRightTab("introoutro"); }}
            onOutroClick={() => { setIntroOutroMode("outro"); toggleRightTab("introoutro"); }}
          />
        </div>
        {/* END LEFT COLUMN */}

        {/* Resize handle between left column and sidebar */}
        {activeRightTab && (
          <div
            onMouseDown={handleSidebarResizeStart}
            className="w-1.5 bg-[var(--sketch-border-color)] hover:bg-[var(--sketch-accent)]/40 transition-colors cursor-col-resize flex-shrink-0 relative group hidden md:block"
            title="Drag to resize sidebar"
            aria-label="Drag to resize sidebar"
          >
            <div className="absolute inset-y-0 -left-1 -right-1" />
          </div>
        )}

        {/* RIGHT SIDEBAR CONTENT: full height, conditionally shown */}
        {activeRightTab && (
          <div
            className="h-full bg-[var(--sketch-panel-bg)] border-l border-[var(--sketch-border-color)]/40 flex flex-col flex-shrink-0 hidden md:flex"
            style={{ width: sidebarWidth }}
          >
            <div className={`h-full scrollbar-thin p-4 flex flex-col w-full ${activeRightTab === "script" || activeRightTab === "voiceover" || activeRightTab === "elevenlabs" ? "overflow-hidden" : "overflow-y-auto"}`}>
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h3 className="font-mono text-xs text-[var(--sketch-fg-muted)] uppercase tracking-wider font-semibold">
                  {activeRightTab === "properties" && "Properties"}
                  {activeRightTab === "script" && "Script & Scene"}
                  {activeRightTab === "voiceover" && "AI Voiceover"}
                  {activeRightTab === "elevenlabs" && "ElevenLabs Premium"}
                  {activeRightTab === "captions" && "Captions Settings"}
                  {activeRightTab === "transitions" && "Transitions"}
                  {activeRightTab === "introoutro" && "Intro & Outro"}
                  {activeRightTab === "safety" && "Safety & Copyright"}
                  {activeRightTab === "help" && "Help Guide"}
                  {activeRightTab === "media" && "Pexels Media"}
                </h3>
                <button
                  onClick={() => setActiveRightTab(null)}
                  className="text-[var(--sketch-fg-subtle)] hover:text-[var(--sketch-fg-muted)] text-xs font-bold cursor-pointer"
                >
                  Close ×
                </button>
              </div>

              <div className={`flex-1 min-h-0 ${activeRightTab === "script" || activeRightTab === "voiceover" || activeRightTab === "elevenlabs" ? "flex flex-col overflow-hidden" : "overflow-y-auto"} pr-1`}>
                {activeRightTab === "properties" && renderPropertiesContent()}
                {activeRightTab === "script" && renderScriptContent()}
                {activeRightTab === "voiceover" && renderVoiceoverContent()}
                {activeRightTab === "elevenlabs" && renderElevenLabsContent()}
                {activeRightTab === "captions" && renderCaptionsContent()}
                {activeRightTab === "transitions" && renderTransitionsContent()}
                {activeRightTab === "introoutro" && renderIntroOutroContent()}
                {activeRightTab === "safety" && renderSafetyContent()}
                {activeRightTab === "help" && renderHelpContent()}
                {activeRightTab === "media" && renderMediaContent()}
              </div>
            </div>
          </div>
        )}

        {/* Far-right vertical tab strip: full height on desktop, hidden on mobile */}
        <div data-tour="sidebar-tabs" className="editor-tab-strip-vertical w-16 bg-[var(--sketch-panel-bg)] border-l border-[var(--sketch-border-color)]/40 flex flex-col items-center flex-shrink-0 h-full overflow-y-auto scrollbar-thin py-2 gap-1 hidden md:flex">
          <RightTabButton active={activeRightTab === "properties"} onClick={() => toggleRightTab("properties")} icon={<Settings2 className="w-4.5 h-4.5" />} label="Properties" />
          <RightTabButton active={activeRightTab === "script"} onClick={() => toggleRightTab("script")} icon={<Type className="w-4.5 h-4.5" />} label="Script" />
          <RightTabButton active={activeRightTab === "voiceover"} onClick={() => toggleRightTab("voiceover")} icon={<Volume2 className="w-4.5 h-4.5" />} label="Voiceover" />
          <RightTabButton active={activeRightTab === "elevenlabs"} onClick={() => toggleRightTab("elevenlabs")} icon={<Crown className="w-4.5 h-4.5" />} label="ElevenLabs" />
          <RightTabButton active={activeRightTab === "captions"} onClick={() => toggleRightTab("captions")} icon={<Type className="w-4.5 h-4.5" />} label="Captions" />
          <RightTabButton active={activeRightTab === "transitions"} onClick={() => toggleRightTab("transitions")} icon={<Film className="w-4.5 h-4.5" />} label="Transitions" />
          <RightTabButton active={activeRightTab === "introoutro"} onClick={() => toggleRightTab("introoutro")} icon={<Clapperboard className="w-4.5 h-4.5" />} label="Intro/Outro" />
          <RightTabButton active={activeRightTab === "media"} onClick={() => toggleRightTab("media")} icon={<Clapperboard className="w-4.5 h-4.5" />} label="Media" />
          <RightTabButton active={activeRightTab === "safety"} onClick={() => toggleRightTab("safety")} icon={<Shield className="w-4.5 h-4.5" />} label="Safety" />
          <div className="flex-1" />
          <RightTabButton active={activeRightTab === "help"} onClick={() => toggleRightTab("help")} icon={<HelpCircle className="w-4.5 h-4.5" />} label="Help" />
        </div>
      </div>

      {/* Mobile sidebar overlay: shown on small screens when sidebar is open */}
      {isMobileSidebarOpen && activeRightTab && (
        <>
          <div className="editor-sidebar-overlay md:hidden" onClick={() => setIsMobileSidebarOpen(false)} />
          <div className="editor-sidebar-mobile md:hidden bg-[var(--sketch-panel-bg)] flex flex-col">
            <div className={`h-full scrollbar-thin p-4 flex flex-col w-full ${activeRightTab === "script" || activeRightTab === "voiceover" || activeRightTab === "elevenlabs" ? "overflow-hidden" : "overflow-y-auto"}`}>
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h3 className="font-mono text-xs text-[var(--sketch-fg-muted)] uppercase tracking-wider font-semibold">
                  {activeRightTab === "properties" && "Properties"}
                  {activeRightTab === "script" && "Script & Scene"}
                  {activeRightTab === "voiceover" && "AI Voiceover"}
                  {activeRightTab === "elevenlabs" && "ElevenLabs Premium"}
                  {activeRightTab === "captions" && "Captions Settings"}
                  {activeRightTab === "transitions" && "Transitions"}
                  {activeRightTab === "introoutro" && "Intro & Outro"}
                  {activeRightTab === "safety" && "Safety & Copyright"}
                  {activeRightTab === "help" && "Help Guide"}
                  {activeRightTab === "media" && "Pexels Media"}
                </h3>
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="text-[var(--sketch-fg-subtle)] hover:text-[var(--sketch-fg-muted)] text-xs font-bold cursor-pointer"
                >
                  Close ×
                </button>
              </div>
              <div className={`flex-1 min-h-0 ${activeRightTab === "script" || activeRightTab === "voiceover" || activeRightTab === "elevenlabs" ? "flex flex-col overflow-hidden" : "overflow-y-auto"} pr-1`}>
                {activeRightTab === "properties" && renderPropertiesContent()}
                {activeRightTab === "script" && renderScriptContent()}
                {activeRightTab === "voiceover" && renderVoiceoverContent()}
                {activeRightTab === "elevenlabs" && renderElevenLabsContent()}
                {activeRightTab === "captions" && renderCaptionsContent()}
                {activeRightTab === "transitions" && renderTransitionsContent()}
                {activeRightTab === "introoutro" && renderIntroOutroContent()}
                {activeRightTab === "safety" && renderSafetyContent()}
                {activeRightTab === "help" && renderHelpContent()}
                {activeRightTab === "media" && renderMediaContent()}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Hidden file input for timeline uploads */}
      {/* Scenes are screenshots. The renderer's video support is untouched and
          still used by the intro and outro, and by anything added later - this
          only stops a video arriving as a SCENE, where eleven of the fifteen
          tools silently do nothing to it. */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const at = insertAtIndexRef.current;
          insertAtIndexRef.current = null;
          if (e.target.files) handleUploadFiles(e.target.files, at);
          // Cleared so picking the same file twice in a row still fires change.
          e.target.value = "";
        }}
      />

      <RenderPreflightDialog
        open={showRenderPreflight}
        result={renderPreflight}
        busy={isPreparingExport}
        onOpenChange={setShowRenderPreflight}
        onGenerateScripts={handleGenerateScriptsFromPreflight}
        onWriteScripts={() => openNarrationPanel("script", "manual")}
        onSetVoice={() => openNarrationPanel("voiceover")}
        onContinueSilently={handleContinueSilently}
        onCancel={() => setShowRenderPreflight(false)}
      />

      {captureMode && (
        <CaptureDialog
          mode={captureMode}
          onCapture={handleCaptured}
          onClose={() => setCaptureMode(null)}
        />
      )}

      {showScenePreview && currentStep?.screenshotPath && (
        <ScenePreview
          screenshotUrl={currentStep.screenshotPath}
          zoomPoints={currentAnn?.editorMultiZooms ?? []}
          narrationSec={sceneTiming?.narrationSec ?? 0}
          aspect={projectRatio}
          onClose={() => setShowScenePreview(false)}
        />
      )}

      {/* Delete Scene Confirmation Dialog */}
      <AlertDialog open={deleteSceneIdx !== null} onOpenChange={(open) => { if (!open) setDeleteSceneIdx(null); }}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base">
              <Trash2 className="w-4 h-4 text-red-500" />
              Delete Scene {deleteSceneIdx !== null ? deleteSceneIdx + 1 : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This will permanently delete the scene and all its annotations, zoom points, and voiceover. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white cursor-pointer"
              onClick={async () => {
                if (deleteSceneIdx === null) return;
                const stepToDelete = steps[deleteSceneIdx];
                if (!stepToDelete) return;
                try {
                  await deleteStep.mutateAsync({ id: stepToDelete.id });
                  utils.step.listByProject.invalidate({ projectId: projectIdNum });
                  utils.project.getById.invalidate({ id: projectIdNum });
                  if (currentStepIndex >= steps.length - 1) {
                    setCurrentStepIndex(Math.max(0, currentStepIndex - 1));
                  }
                  toast.success(`Scene ${deleteSceneIdx + 1} deleted`);
                } catch (err) {
                  toast.error("Failed to delete scene");
                }
                setDeleteSceneIdx(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mega Render Progress Dialog Popup */}
      <Dialog open={showRenderModal} onOpenChange={(open) => {
        if (!open) {
          const isDone = renderIsComplete;
          const isErr = renderIsError || startRenderError;
          if (isDone || isErr) {
            setShowRenderModal(false);
            setRenderStarted(false);
          }
        }
      }}>
        <DialogContent className="border border-[var(--sketch-border-color)]/25 bg-white  bg-opacity-100 max-w-2xl rounded-2xl shadow-2xl p-8 flex flex-col gap-6 text-center select-none outline-none">
          <DialogHeader className="text-center flex flex-col items-center">
            <div className="relative inline-block">
              <span className="font-mono text-xs text-[var(--sketch-fg-muted)] uppercase tracking-widest bg-brand/20 px-2 py-1 sketch-border-sm inline-block">
                Rendering Video
              </span>
              {!(renderIsComplete) &&
                !(renderIsError || startRenderError) && (
                  <span className="font-hand text-xl text-[var(--sketch-fg-muted)] absolute -top-7 left-36 rotate-[3deg] hidden sm:block">
                    Rendering your video…
                  </span>
                )}
            </div>
            <DialogTitle className="text-2xl font-bold mt-4 text-[var(--sketch-fg)]">
              {renderIsComplete
                ? "Video complete!"
                : renderIsError || startRenderError
                  ? "Something went wrong"
                  : "Generating your video…"}
            </DialogTitle>
            <DialogDescription className="text-sm text-[var(--sketch-fg-muted)] mt-1.5 leading-relaxed max-w-md">
              {renderIsComplete
                ? "Redirecting to preview page..."
                : renderIsError || startRenderError
                  ? (isCurrentRenderJob && renderStatus?.job?.message) || startRenderError || "An error occurred during rendering."
                  : "Rendering runs on our servers, so you can safely close this and it will keep going in the background."}
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
                  className={`h-full transition-all duration-500 rounded-full ${renderIsComplete
                      ? "bg-emerald-500"
                      : renderIsError
                        ? "bg-red-500"
                        : "bg-brand"
                    }`}
                  style={{
                    width: `${renderIsComplete
                        ? 100
                        : Math.min((isCurrentRenderJob && renderStatus?.job ? ((renderStatus.job.currentStep || 0) / (renderStatus.job.totalSteps || 1)) * 100 : 0) + 5, 95)
                      }%`
                  }}
                />
              </div>

              {renderIsComplete ? (
                <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex flex-col items-center">
                  <CheckCircle className="w-10 h-10 text-emerald-600 mb-3" />
                  <h4 className="font-bold text-lg text-[var(--sketch-fg)]">Complete!</h4>
                  <p className="text-xs text-[var(--sketch-fg-muted)] mt-1.5">
                    Your video is ready. Preparing export screen...
                  </p>
                </div>
              ) : renderIsError ? (
                <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-xl flex flex-col items-center">
                  <AlertTriangle className="w-10 h-10 text-red-600 mb-3" />
                  <h4 className="font-bold text-lg text-[var(--sketch-fg)]">Render Failed</h4>
                  <p className="text-xs text-[var(--sketch-fg-muted)] mt-1.5 max-w-sm">
                    {(isCurrentRenderJob && renderStatus?.job?.message) || "An unexpected error occurred."}
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
                      onClick={async () => {
                        await handleSaveAllSteps();
                        utils.render.status.setData({ projectId: projectIdNum }, undefined);
                        setRenderStarted(false);
                        setTimeout(() => setRenderStarted(true), 100);
                      }}
                      className="px-4 py-2 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 max-w-md mx-auto">
                  {renderStages.map((stage, i) => {
                    const Icon = stage.icon;
                    const currentStage = (isCurrentRenderJob && renderStatus?.job?.stage) || "queued";
                    const currentStageIndex = renderStages.findIndex((s) => s.key === currentStage);
                    const isActive = i === currentStageIndex;
                    const isDone = i < currentStageIndex;

                    return (
                      <div
                        key={stage.key}
                        className={`p-3 border rounded-xl flex items-center gap-4 transition-all duration-200 ${isActive
                            ? "border-brand bg-brand/5"
                            : isDone
                              ? "border-emerald-500/40 bg-emerald-500/5"
                              : "border-[var(--sketch-border-color)]/10 bg-[var(--sketch-card-bg)]/50 opacity-40"
                          }`}
                      >
                        <div
                          className={`w-8 h-8 flex items-center justify-center border rounded-lg flex-shrink-0 ${isActive
                              ? "border-brand bg-brand/10"
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
                            className={`text-xs font-bold ${isActive
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
                              {(isCurrentRenderJob && renderStatus?.job?.message) || "Processing..."}
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



/**
 * What to do, shown wherever the canvas has nothing to draw.
 *
 * This used to be a card listing fifteen keyboard shortcuts - the first thing
 * an empty editor told a new person was which letter selects the Spotlight
 * tool. It answered a question nobody had yet, while the actual question ("I
 * have screenshots, now what?") went unanswered. The shortcuts are gone for
 * now; this is the three steps that get somebody to a finished video.
 */
function GettingStartedNote({ onAddScreenshots }: { onAddScreenshots?: () => void }) {
  const steps = [
    {
      icon: <ImagePlus className="h-4 w-4" />,
      title: "Add your screenshots",
      body: "Drop them on the timeline below, or use Add Scene. They keep the order you name them in.",
    },
    {
      icon: <Square className="h-4 w-4" />,
      title: "Say what matters on each one",
      body: "Draw a box around the button or field the step is about. That becomes the highlight, and the camera can zoom to it.",
    },
    {
      icon: <Mic className="h-4 w-4" />,
      title: "Check the narration",
      body: "A script is written from your screenshots. Read it in the Script panel and change anything that is not right.",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-lg text-left">
      <h3 className="mb-3 text-center text-sm font-semibold text-[var(--sketch-fg)]">
        Three steps to a finished video
      </h3>

      <ol className="space-y-2.5">
        {steps.map((s, i) => (
          <li
            key={s.title}
            className="flex gap-3 rounded-lg border border-[var(--sketch-border-color)]/40 bg-[var(--sketch-panel-bg)] p-3"
          >
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[var(--sketch-accent)]/12 text-[var(--sketch-accent)]">
              {s.icon}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--sketch-fg)]">
                {i + 1}. {s.title}
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--sketch-fg-muted)]">
                {s.body}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {onAddScreenshots && (
        <button
          onClick={onAddScreenshots}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--sketch-accent)] py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
        >
          <Upload className="h-4 w-4" />
          Add screenshots
        </button>
      )}

      <p className="mt-3 text-center text-[10px] text-[var(--sketch-fg-subtle)]">
        Everything here can be changed later. Nothing is final until you export.
      </p>
    </div>
  );
}

function ToolbarToolButton({
  active,
  onClick,
  icon,
  label,
  description,
  dataTour,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description?: string;
  dataTour?: string;
}) {
  const btn = (
    <button
      onClick={onClick}
      title={label}
      data-tour={dataTour}
      aria-pressed={active}
      // The selected state used to be a 15% tint of the accent and nothing
      // else, which on a mid-tone toolbar is close to invisible - "I cannot
      // tell which tool is selected" was a fair description of it. It is now a
      // filled chip: solid accent, white icon, and a ring, so it reads as
      // pressed at a glance rather than on inspection.
      className={`px-2 py-1 rounded transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap text-[11px] font-medium ${active
          ? "bg-[var(--sketch-accent)] text-white shadow-sm ring-1 ring-[var(--sketch-accent)] ring-offset-1 ring-offset-[var(--sketch-panel-bg)]"
          : "text-[var(--sketch-fg-muted)] hover:bg-[var(--sketch-fg-subtle)]/20 hover:text-[var(--sketch-fg)]"
        }`}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );

  if (!description) return btn;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[220px] text-left">
        <div className="space-y-1">
          <p className="font-semibold">{label}</p>
          <p className="text-[11px] opacity-90">{description}</p>
        </div>
      </TooltipContent>
    </Tooltip>
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
      className={`w-full py-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all border-l-2 ${active
          ? "bg-brand/10 text-[var(--sketch-fg)] border-brand"
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

/**
 * File picker for a custom intro/outro clip.
 *
 * Accepts images as well as video: a still bumper is a common case (a title
 * card, a logo) and the renderer holds it for the configured duration, so
 * refusing images would be an arbitrary limitation.
 */
function BumperUpload({
  kind,
  currentPath,
  busy,
  onPick,
  onClear,
}: {
  kind: "intro" | "outro";
  currentPath: string | null;
  busy: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const label = kind === "intro" ? "Intro" : "Outro";

  return (
    <div className="rounded-lg border border-[var(--sketch-border-color)]/30 p-2.5">
      <Label className="mb-1.5 block text-xs font-semibold text-[var(--sketch-fg-muted)]">
        Custom {label.toLowerCase()} file
      </Label>

      {currentPath ? (
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-[10px] text-[var(--sketch-fg-subtle)]">
            {isVideoPath(currentPath)
              ? "Video attached, plays in full"
              : "Image attached"}
          </span>
          <button
            onClick={onClear}
            title={`Remove the custom ${label.toLowerCase()}`}
            aria-label={`Remove the custom ${label.toLowerCase()}`}
            className="rounded px-2 py-1 text-[10px] font-semibold text-red-500 hover:bg-red-500/10"
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          title={`Upload a custom ${label.toLowerCase()}`}
          aria-label={`Upload a custom ${label.toLowerCase()}`}
          className="flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-[var(--sketch-border-color)]/50 py-2 text-[11px] font-semibold text-[var(--sketch-fg-muted)] hover:border-[var(--sketch-accent)]/50 hover:text-[var(--sketch-fg)] disabled:opacity-50"
        >
          {busy ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
            </>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5" /> Choose video or image
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
      <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--sketch-fg-subtle)]">
        Resized and re-encoded to match your video on render, so any size or
        frame rate works.
      </p>
    </div>
  );
}

async function uploadFile(
  file: File,
  folder = "screenshots"
): Promise<{ key: string; url: string }> {
  // Compress image before upload (converts to WebP, reduces file size)
  const { compressImage } = await import("@/lib/imageCompress");
  const compressedFile = await compressImage(file);

  const formData = new FormData();
  formData.append("file", compressedFile);
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

function getTransitionSvg(value: TransitionType) {
  switch (value) {
    case "none":
      return (
        <svg className="w-16 h-10 text-slate-400 " viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="6" width="48" height="28" rx="6" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.05" />
        </svg>
      );
    case "dissolve":
      return (
        <svg className="w-16 h-10 text-blue-500 " viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="6" width="48" height="28" rx="6" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.05" />
          <path d="M26,12 L26,28 M38,12 L38,28" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
          <rect x="27" y="7" width="10" height="26" fill="currentColor" fillOpacity="0.15" />
        </svg>
      );
    case "fade":
      return (
        <svg className="w-16 h-10 text-slate-500 " viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="6" width="48" height="28" rx="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <defs>
            <linearGradient id="fadeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.8" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <rect x="9" y="7" width="46" height="26" rx="5" fill="url(#fadeGrad)" />
        </svg>
      );
    case "slide-left":
      return (
        <svg className="w-16 h-10 text-slate-500 " viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="6" width="48" height="28" rx="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <rect x="9" y="7" width="20" height="26" fill="currentColor" fillOpacity="0.25" />
          <path d="M44,20 L32,20 M36,16 L32,20 L36,24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M48,20 L46,20" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1.5 1.5" />
        </svg>
      );
    case "slide-right":
      return (
        <svg className="w-16 h-10 text-slate-500 " viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="6" width="48" height="28" rx="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <rect x="35" y="7" width="20" height="26" fill="currentColor" fillOpacity="0.25" />
          <path d="M20,20 L32,20 M28,16 L32,20 L28,24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16,20 L18,20" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1.5 1.5" />
        </svg>
      );
    case "slide-up":
      return (
        <svg className="w-16 h-10 text-slate-500 " viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="6" width="48" height="28" rx="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <rect x="9" y="7" width="46" height="12" fill="currentColor" fillOpacity="0.25" />
          <path d="M32,30 L32,18 M28,22 L32,18 L36,22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "flip":
      return (
        <svg className="w-16 h-10 text-slate-500 " viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="6" width="48" height="28" rx="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M32,12 C38,12 42,16 42,20 C42,24 38,28 32,28 C26,28 22,24 22,20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
          <path d="M20,17 L22,21 L26,19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
}
