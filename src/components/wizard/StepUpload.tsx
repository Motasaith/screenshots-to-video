import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useWizardStore } from "@/hooks/useWizardStore";
import { motion } from "framer-motion";
import {
  X,
  GripVertical,
  Plus,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Loader2,
  Upload,
  CheckCircle,
  Camera,
  MonitorPlay,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { nanoid } from "nanoid";
import { detectGibberish } from "@/lib/gibberish";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface WizardStep {
  id?: number;
  localId: string;
  order: number;
  description: string;
  screenshotPath?: string;
  screenshotKey?: string;
  file?: File;
  previewUrl?: string;
  isUploading?: boolean;
  uploadError?: string;
  isCheckingSafety?: boolean;
  isSafe?: boolean;
  safetyReason?: string;
}

function padImageToRatio(file: File, aspectRatioStr: string): Promise<File> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve(file);
      return;
    }
    
    const img = new Image();
    img.onload = () => {
      let targetRatio = 16 / 9;
      if (aspectRatioStr === "9:16") targetRatio = 9 / 16;
      else if (aspectRatioStr === "1:1") targetRatio = 1;
      else if (aspectRatioStr === "4:5") targetRatio = 4 / 5;

      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const imgRatio = w / h;

      // Allow small tolerance
      if (Math.abs(imgRatio - targetRatio) < 0.01) {
        resolve(file);
        return;
      }

      let canvasW = w;
      let canvasH = h;
      let drawX = 0;
      let drawY = 0;

      if (imgRatio > targetRatio) {
        // Image is wider than target -> pad vertically (top/bottom)
        canvasW = w;
        canvasH = Math.round(w / targetRatio);
        drawX = 0;
        drawY = Math.round((canvasH - h) / 2);
      } else {
        // Image is taller than target -> pad horizontally (left/right)
        canvasH = h;
        canvasW = Math.round(h * targetRatio);
        drawX = Math.round((canvasW - w) / 2);
        drawY = 0;
      }

      const canvas = document.createElement("canvas");
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      // Fill background with black
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Draw image centered
      ctx.drawImage(img, drawX, drawY, w, h);

      // Convert back to File
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(file);
          return;
        }
        const paddedFile = new File([blob], file.name, {
          type: file.type || "image/png",
          lastModified: Date.now(),
        });
        resolve(paddedFile);
      }, file.type || "image/png");
    };
    img.onerror = () => {
      resolve(file);
    };
    img.src = URL.createObjectURL(file);
  });
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

function SortableStep({
  step,
  index,
  error,
  onRemove,
  onUpdateDescription,
  onFileUpload,
  onRemoveScreenshot,
}: {
  step: WizardStep;
  index: number;
  error?: string;
  onRemove: () => void;
  onUpdateDescription: (desc: string) => void;
  onFileUpload: (file: File) => void;
  onRemoveScreenshot: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const dropZoneRef = useRef<HTMLButtonElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.localId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  // Live gibberish check so the user sees a soft warning the moment they
  // type nonsense (before they even try to continue).
  const gibberish = useMemo(
    () => detectGibberish(step.description),
    [step.description]
  );

  // Accept files dropped anywhere on the step card (and pasted from the clipboard).
  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;

    const handlePaste = (e: ClipboardEvent) => {
      // Only react when the step is focused / the user is interacting with it
      if (!node.contains(document.activeElement) && document.activeElement !== document.body) {
        return;
      }
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            onFileUpload(file);
            return;
          }
        }
      }
    };

    const handleDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) {
        e.preventDefault();
        setIsDragOver(true);
      }
    };
    const handleDragLeave = (e: DragEvent) => {
      if (!node.contains(e.relatedTarget as Node)) {
        setIsDragOver(false);
      }
    };
    const handleDrop = (e: DragEvent) => {
      if (!e.dataTransfer?.files?.length) return;
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        onFileUpload(file);
      }
    };

    node.addEventListener("paste", handlePaste as EventListener);
    node.addEventListener("dragover", handleDragOver);
    node.addEventListener("dragleave", handleDragLeave);
    node.addEventListener("drop", handleDrop);

    return () => {
      node.removeEventListener("paste", handlePaste as EventListener);
      node.removeEventListener("dragover", handleDragOver);
      node.removeEventListener("dragleave", handleDragLeave);
      node.removeEventListener("drop", handleDrop);
    };
  }, [onFileUpload]);

  return (
    <div
      ref={(el) => {
        setNodeRef(el);
        cardRef.current = el;
      }}
      data-step-id={step.localId}
      style={style}
      className={`sketch-card p-4 bg-[var(--sketch-card-bg)] relative ${isDragging ? 'shadow-xl scale-[1.02]' : ''} ${isDragOver ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[var(--sketch-bg)]' : ''}`}
    >
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center gap-1 pt-1">
          <span className="font-hand text-lg font-bold text-[var(--sketch-fg-muted)]">
            {index + 1}
          </span>
          <button
            {...attributes}
            {...listeners}
            className="text-[var(--sketch-fg-subtle)] hover:text-[var(--sketch-fg)] cursor-grab active:cursor-grabbing touch-none transition-colors"
          >
            <GripVertical className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 flex gap-4">
          <div className="w-24 h-24 flex-shrink-0">
            {step.previewUrl || step.screenshotPath ? (
              <div className="relative w-full h-full border-2 border-[var(--sketch-border-color)] group sketch-border-sm overflow-hidden">
                <img
                  src={step.previewUrl || step.screenshotPath}
                  alt={`Step ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {step.isUploading && (
                  <div className="absolute inset-0 bg-[var(--sketch-bg)]/70 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-[var(--sketch-fg)]" />
                  </div>
                )}
                {step.screenshotKey && !step.isUploading && (
                  <div className="absolute top-0.5 right-0.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  </div>
                )}
                {step.uploadError && (
                  <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                )}
                <button
                  onClick={onRemoveScreenshot}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white sketch-border-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-[2px_2px_0px_var(--sketch-fg)]"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                ref={dropZoneRef}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full h-full border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors ${
                  error?.includes("Screenshot")
                    ? "border-red-500 bg-red-500/5"
                    : "border-[var(--sketch-fg-subtle)] hover:border-[var(--sketch-border-color)] hover:bg-[#FBBF24]/5"
                }`}
                style={{ borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px" }}
              >
                <Upload className="w-5 h-5 text-[var(--sketch-fg-subtle)]" />
                <span className="font-hand text-sm text-[var(--sketch-fg-subtle)]">
                  Drop / paste!
                </span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileUpload(file);
              }}
              className="hidden"
            />
          </div>

          <div className="flex-1">
            <textarea
              value={step.description}
              onChange={(e) => onUpdateDescription(e.target.value)}
              placeholder="e.g. Open Task Manager and click the Startup tab"
              rows={3}
              className={`sketch-input resize-none text-sm ${
                error?.includes("Description") || (step.description.trim() && gibberish.isGibberish)
                  ? "border-red-500"
                  : ""
              }`}
            />
            {error?.includes("Description") && (
              <p className="font-body text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {error}
              </p>
            )}
            {!error?.includes("Description") && step.description.trim() && gibberish.isGibberish && (
              <p className="font-body text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {gibberish.reason}
              </p>
            )}
            {step.uploadError && (
              <p className="font-body text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Upload failed: {step.uploadError}. Will retry on save.
              </p>
            )}
            <div className="flex items-center justify-between mt-2">
              <span className="font-mono text-[10px] text-[var(--sketch-fg-subtle)]">
                {step.description.length} chars
                {step.screenshotKey && (
                  <span className="text-emerald-600 ml-2">✓ uploaded</span>
                )}
              </span>
              <button
                onClick={onRemove}
                className="font-hand text-sm text-[var(--sketch-fg-subtle)] hover:text-red-500 transition-colors"
              >
                Remove
              </button>
            </div>
            
            {/* Safety Check Status */}
            {step.isCheckingSafety && (
              <div className="mt-2 text-xs flex items-center gap-1 text-blue-600">
                <Loader2 className="w-3 h-3 animate-spin" />
                Running Copyright Checker...
              </div>
            )}
            {step.isSafe === false && (
              <div className="mt-2 text-xs flex items-start gap-1 text-red-600 bg-red-500/10 p-2 rounded-md">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Flagged:</strong> {step.safetyReason}
                </span>
              </div>
            )}
            {step.isSafe === true && (
              <div className="mt-2 text-xs flex items-center gap-1 text-emerald-600">
                <CheckCircle className="w-3 h-3" />
                Copyright Checker: Clear
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StepUpload() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const projectIdNum = Number(projectId) || 0;
  const { stepData, setStepData } = useWizardStore();
  
  // Fetch existing steps from the database
  const { data: project, isLoading: isLoadingProject } = trpc.project.getById.useQuery(
    { id: projectIdNum },
    { enabled: projectIdNum > 0 }
  );

  const [steps, setSteps] = useState<WizardStep[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Intro/Outro configuration state
  const [introTemplate, setIntroTemplate] = useState("");
  const [introText, setIntroText] = useState("");
  const [introVideoPath, setIntroVideoPath] = useState("");
  const [introDuration, setIntroDuration] = useState(3.0);
  const [outroTemplate, setOutroTemplate] = useState("");
  const [outroText, setOutroText] = useState("");
  const [outroVideoPath, setOutroVideoPath] = useState("");
  const [outroDuration, setOutroDuration] = useState(3.0);

  const [isUploadingIntro, setIsUploadingIntro] = useState(false);
  const [isUploadingOutro, setIsUploadingOutro] = useState(false);
  const introFileRef = useRef<HTMLInputElement>(null);
  const outroFileRef = useRef<HTMLInputElement>(null);

  // Track which DB step IDs we started with, so we can detect removals
  const [originalDbIds, setOriginalDbIds] = useState<number[]>([]);

  const createStep = trpc.step.create.useMutation();
  const updateStep = trpc.step.update.useMutation();
  const deleteStep = trpc.step.delete.useMutation();
  const updateProject = trpc.project.update.useMutation();
  const checkMediaSafety = trpc.ai.checkMediaSafety.useMutation();

  // Initialize steps and project intro/outro from DB data or wizard store
  useState(() => {});
  if (!initialized && !isLoadingProject) {
    if (project) {
      // Load intro/outro options
      setIntroTemplate(project.introTemplate || stepData.preview.introTemplate || "");
      setIntroText(project.introText || stepData.preview.introText || "");
      setIntroVideoPath(project.introVideoPath || stepData.preview.introVideoPath || "");
      setIntroDuration(project.introDuration || stepData.preview.introDuration || 3.0);
      setOutroTemplate(project.outroTemplate || stepData.preview.outroTemplate || "");
      setOutroText(project.outroText || stepData.preview.outroText || "");
      setOutroVideoPath(project.outroVideoPath || stepData.preview.outroVideoPath || "");
      setOutroDuration(project.outroDuration || stepData.preview.outroDuration || 3.0);

      if (project.steps && project.steps.length > 0) {
        // Load from database (existing project with saved steps)
        const dbSteps: WizardStep[] = project.steps.map((s) => ({
          id: s.id,
          localId: nanoid(8),
          order: s.order,
          description: s.description || "",
          screenshotPath: s.screenshotPath || undefined,
          screenshotKey: s.screenshotPath || undefined,
          previewUrl: s.screenshotPath || undefined,
          isSafe: s.isSafe === 1,
          safetyReason: s.safetyReason || undefined,
        }));
        setSteps(dbSteps);
        setOriginalDbIds(project.steps.map((s) => s.id));
        setInitialized(true);
      } else if (stepData.upload.steps.length > 0) {
        // Load from wizard store (in-progress local state)
        const storeSteps = stepData.upload.steps.map((s) => ({
          ...s,
          localId: (s as { localId?: string }).localId || nanoid(8),
        }));
        setSteps(storeSteps);
        setInitialized(true);
      } else {
        // Fresh start — one empty step
        setSteps([{ localId: nanoid(8), order: 1, description: "" }]);
        setInitialized(true);
      }
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSteps((items) => {
        const oldIndex = items.findIndex((i) => i.localId === active.id);
        const newIndex = items.findIndex((i) => i.localId === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        // Update order properties
        return newItems.map((item, index) => ({
          ...item,
          order: index + 1,
        }));
      });
    }
  };

  const addStep = () => {
    if (steps.length >= 20) return;
    setSteps([...steps, { localId: nanoid(8), order: steps.length + 1, description: "" }]);
  };

  const openCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied:", err);
      setShowCamera(false);
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `capture_${Date.now()}.png`, { type: "image/png" });
      const newLocalId = nanoid(8);
      const newStep: WizardStep = {
        localId: newLocalId,
        order: steps.length + 1,
        description: "",
      };
      setSteps(prev => [...prev, newStep]);
      // Trigger upload after state update
      setTimeout(() => handleFileUpload(newLocalId, file), 100);
      closeCamera();
    }, "image/png");
  };

  const removeStep = (localId: string) => {
    if (steps.length <= 1) return;
    const newSteps = steps.filter((s) => s.localId !== localId);
    newSteps.forEach((s, i) => (s.order = i + 1));
    setSteps(newSteps);
  };

  const updateStepDescription = (localId: string, description: string) => {
    setSteps(steps.map(s => s.localId === localId ? { ...s, description } : s));
  };

  const handleFileUpload = async (localId: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setErrors({ ...errors, [localId]: "File must be under 10MB" });
      return;
    }

    let processedFile = file;
    if (file.type.startsWith("image/")) {
      try {
        processedFile = await padImageToRatio(file, stepData.setup.aspectRatio || "16:9");
      } catch (e) {
        console.error("Error padding image:", e);
      }
    }

    const previewUrl = URL.createObjectURL(processedFile);
    
    setSteps(currentSteps => currentSteps.map(s => {
      if (s.localId === localId) {
        return {
          ...s,
          file: processedFile,
          previewUrl,
          isUploading: true,
          uploadError: undefined,
        };
      }
      return s;
    }));

    setErrors((prev) => {
      const next = { ...prev };
      delete next[localId];
      return next;
    });

    try {
      const result = await uploadFile(processedFile, `projects/${projectIdNum}/screenshots`);
      setSteps(currentSteps => currentSteps.map(s => {
        if (s.localId === localId) {
          return {
            ...s,
            screenshotPath: result.url,
            screenshotKey: result.key,
            previewUrl: result.url,
            isUploading: false,
          };
        }
        return s;
      }));
      // Start safety check
      setSteps(currentSteps => currentSteps.map(s => {
        if (s.localId === localId) return { ...s, isCheckingSafety: true };
        return s;
      }));

      checkMediaSafety.mutateAsync({ mediaUrl: result.url, stepId: undefined })
        .then((safetyRes) => {
          setSteps(currentSteps => currentSteps.map(s => {
            if (s.localId === localId) {
              return {
                ...s,
                isCheckingSafety: false,
                isSafe: safetyRes.isSafe && safetyRes.isClear,
                safetyReason: safetyRes.reason,
              };
            }
            return s;
          }));
        })
        .catch(() => {
          setSteps(currentSteps => currentSteps.map(s => {
            if (s.localId === localId) return { ...s, isCheckingSafety: false };
            return s;
          }));
        });

    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setSteps(currentSteps => currentSteps.map(s => {
        if (s.localId === localId) {
          return {
            ...s,
            isUploading: false,
            uploadError: message,
          };
        }
        return s;
      }));
      console.warn("Upload failed:", err);
    }
  };

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    steps.forEach((step, idx) => {
      const desc = step.description.trim();
      if (!desc) {
        errs[step.localId] = `Description is required for step ${idx + 1}`;
      } else if (desc.length < 5) {
        errs[step.localId] = `Description is too short for step ${idx + 1} (min 5 characters)`;
      } else {
        const g = detectGibberish(desc);
        if (g.isGibberish) {
          errs[step.localId] = `Step ${idx + 1} looks like random text — please write a real description.`;
        }
      }
      if (!step.previewUrl && !step.screenshotPath && !step.screenshotKey) {
        errs[step.localId] = `Screenshot is required for step ${idx + 1}`;
      }
      if (step.isUploading) {
        errs[step.localId] = `Wait for upload to finish (step ${idx + 1})`;
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [steps]);

  const handleContinue = async () => {
    if (!validate()) {
      // Scroll to the first invalid step so the user can see what's missing
      const firstBadId = Object.keys(errors)[0] || (steps.find(s => !s.description.trim() || (!s.previewUrl && !s.screenshotPath && !s.screenshotKey))?.localId);
      if (firstBadId) {
        const el = document.querySelector(`[data-step-id="${firstBadId}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setIsSaving(true);
    setStepData("upload", { steps });
    setStepData("preview", {
      ...stepData.preview,
      introTemplate,
      introText,
      introVideoPath,
      introDuration,
      outroTemplate,
      outroText,
      outroVideoPath,
      outroDuration,
    });

    try {
      // Save project-level intro/outro data
      await updateProject.mutateAsync({
        id: projectIdNum,
        introTemplate,
        introText,
        introVideoPath,
        introDuration,
        outroTemplate,
        outroText,
        outroVideoPath,
        outroDuration,
      });

      // 1. Delete steps that were removed by the user
      const currentDbIds = steps.filter((s) => s.id).map((s) => s.id!);
      const removedIds = originalDbIds.filter((id) => !currentDbIds.includes(id));
      for (const id of removedIds) {
        await deleteStep.mutateAsync({ id });
      }

      // 2. Update existing steps or create new ones
      for (const step of steps) {
        if (step.id) {
          // Update existing step in DB
          await updateStep.mutateAsync({
            id: step.id,
            description: step.description,
            screenshotPath: step.screenshotKey || step.screenshotPath || step.previewUrl || undefined,
            isSafe: step.isSafe,
            safetyReason: step.safetyReason,
          });
        } else {
          // Create a new step
          await createStep.mutateAsync({
            projectId: projectIdNum,
            order: step.order,
            description: step.description,
            screenshotPath: step.screenshotKey || step.screenshotPath || step.previewUrl || undefined,
            isSafe: step.isSafe,
            safetyReason: step.safetyReason,
          });
        }
      }

      navigate(`/create/${projectIdNum}/script`);
    } catch (err) {
      console.error("Failed to save steps:", err);
      setErrors({ submit: "Failed to save steps" });
    } finally {
      setIsSaving(false);
    }
  };

  const anyUploading = steps.some((s) => s.isUploading);

  if (isLoadingProject || !initialized) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--sketch-fg)]" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="relative">
          <span className="font-mono text-xs text-[var(--sketch-fg-muted)] uppercase tracking-widest bg-[#FBBF24]/20 px-2 py-1 sketch-border-sm inline-block">
            Step 2 of 7
          </span>
          <span className="font-hand text-lg text-[var(--sketch-fg-muted)] absolute -top-6 left-32 rotate-[-3deg] animate-float hidden sm:block">
            Drop screenshots here! 📸
          </span>
        </div>
        <h2 className="font-body font-bold text-3xl mt-3 tracking-tight text-[var(--sketch-fg)]">
          Add your steps
        </h2>
        <p className="font-body text-[var(--sketch-fg-muted)] mt-2">
          Each step needs a screenshot and description. Drag the handle to reorder them.
        </p>

        <div id="upload-list" className="mt-8 space-y-4 scroll-mt-6">
          {/* Intro Screen Card */}
          {!introTemplate ? (
            <button
              type="button"
              onClick={() => setIntroTemplate("blue-fade")}
              className="w-full py-4 border-2 border-dashed border-amber-500/40 hover:border-amber-500 hover:bg-amber-500/5 transition-all flex items-center justify-center gap-2 mb-4"
              style={{ borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px" }}
            >
              <Plus className="w-4 h-4 text-amber-500" />
              <span className="font-hand text-lg text-amber-600 dark:text-amber-400">
                Add Intro Screen
              </span>
            </button>
          ) : (
            <div
              className="sketch-card p-4 bg-amber-500/5 border-amber-500/30 relative mb-4"
              style={{ borderRadius: "12px" }}
            >
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-1 pt-1">
                  <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    INTRO
                  </span>
                </div>

                <div className="flex-1 flex gap-4">
                  {/* Visual Placeholder representing Intro */}
                  <div className="w-24 h-24 flex-shrink-0 border-2 border-dashed border-amber-500/40 rounded-lg flex flex-col items-center justify-center bg-amber-500/5">
                    <MonitorPlay className="w-5 h-5 text-amber-500 mb-1" />
                    <span className="font-hand text-xs text-amber-600 text-center px-1">Intro Scene</span>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-body text-sm font-semibold text-[var(--sketch-fg)]">Intro Screen Configuration</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIntroTemplate("");
                          setIntroText("");
                          setIntroVideoPath("");
                        }}
                        className="font-hand text-sm text-[var(--sketch-fg-subtle)] hover:text-red-500 transition-colors"
                      >
                        Remove Intro
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <select
                        value={introTemplate}
                        onChange={(e) => {
                          setIntroTemplate(e.target.value);
                          if (!e.target.value) {
                            setIntroVideoPath("");
                            setIntroText("");
                          }
                        }}
                        className="sketch-input text-sm"
                      >
                        <option value="blue-fade">Blue Gradient (Fade)</option>
                        <option value="dark-minimal">Dark Minimal</option>
                        <option value="warm-title">Warm Title Screen</option>
                        <option value="custom-video">Custom Video</option>
                      </select>

                      {introTemplate === "custom-video" ? (
                        <div className="flex items-center gap-2">
                          <input
                            ref={introFileRef}
                            type="file"
                            accept="video/mp4,video/webm,video/quicktime"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setIsUploadingIntro(true);
                              try {
                                const formData = new FormData();
                                formData.append("file", file);
                                formData.append("folder", `projects/${projectIdNum}/intros`);
                                const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
                                if (!res.ok) throw new Error("Upload failed");
                                const data = await res.json();
                                setIntroVideoPath(data.url);
                              } catch {
                                alert("Failed to upload intro video");
                              } finally {
                                setIsUploadingIntro(false);
                              }
                            }}
                          />
                          {introVideoPath ? (
                            <div className="flex items-center gap-2 flex-1 border-2 border-[var(--sketch-border-color)] p-1 sketch-border-sm bg-[var(--sketch-card-bg)]">
                              <video src={introVideoPath} className="h-8 w-12 object-cover rounded" />
                              <span className="text-[10px] text-emerald-600 flex-1 truncate">Uploaded</span>
                              <button type="button" onClick={() => setIntroVideoPath("")} className="text-red-500 hover:text-red-700">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => introFileRef.current?.click()}
                              disabled={isUploadingIntro}
                              className="sketch-input flex items-center gap-2 justify-center text-xs text-[var(--sketch-fg-muted)] hover:text-[var(--sketch-fg)]"
                            >
                              {isUploadingIntro ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                              Upload Intro Video
                            </button>
                          )}
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Intro Title Text..."
                          value={introText}
                          onChange={(e) => setIntroText(e.target.value)}
                          className="sketch-input text-sm"
                        />
                      )}
                    </div>

                    {introTemplate !== "custom-video" && (
                      <div className="space-y-1">
                        <label className="font-body text-xs font-semibold text-[var(--sketch-fg)]">
                          Intro Duration: {introDuration.toFixed(1)}s
                        </label>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[10px] text-[var(--sketch-fg-subtle)]">1.0s</span>
                          <input
                            type="range"
                            min={1.0}
                            max={10.0}
                            step={0.5}
                            value={introDuration}
                            onChange={(e) => setIntroDuration(Number(e.target.value))}
                            className="flex-1 h-1.5 bg-[var(--sketch-fg-subtle)] appearance-none cursor-pointer accent-amber-500"
                          />
                          <span className="font-mono text-[10px] text-[var(--sketch-fg-subtle)]">10.0s</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={steps.map(s => s.localId)}
              strategy={verticalListSortingStrategy}
            >
              {steps.map((step, index) => (
                <SortableStep
                  key={step.localId}
                  step={step}
                  index={index}
                  error={errors[step.localId]}
                  onRemove={() => removeStep(step.localId)}
                  onUpdateDescription={(desc) => updateStepDescription(step.localId, desc)}
                  onFileUpload={(file) => handleFileUpload(step.localId, file)}
                  onRemoveScreenshot={() => {
                    setSteps(currentSteps => currentSteps.map(s => {
                      if (s.localId === step.localId) {
                        return {
                          ...s,
                          previewUrl: undefined,
                          screenshotPath: undefined,
                          screenshotKey: undefined,
                          file: undefined,
                          isUploading: false,
                          uploadError: undefined,
                        };
                      }
                      return s;
                    }));
                  }}
                />
              ))}
            </SortableContext>
          </DndContext>

          {steps.length < 20 && (
            <div id="upload-add" className="flex gap-3 scroll-mt-6">
              <button
                type="button"
                onClick={addStep}
                className="flex-1 py-4 border-2 border-dashed border-[var(--sketch-fg-subtle)] hover:border-[var(--sketch-border-color)] hover:bg-[#FBBF24]/5 transition-all flex items-center justify-center gap-2"
                style={{ borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px" }}
              >
                <Plus className="w-4 h-4 text-[var(--sketch-fg-subtle)]" />
                <span className="font-hand text-lg text-[var(--sketch-fg-muted)]">
                  Add Another Step
                </span>
              </button>
              <button
                type="button"
                onClick={openCamera}
                className="py-4 px-6 border-2 border-dashed border-[var(--sketch-fg-subtle)] hover:border-blue-500 hover:bg-blue-500/5 transition-all flex items-center justify-center gap-2"
                style={{ borderRadius: "15px 255px 15px 225px/225px 15px 255px 15px" }}
              >
                <Camera className="w-4 h-4 text-blue-500" />
                <span className="font-hand text-lg text-blue-500">
                  Camera
                </span>
              </button>
            </div>
          )}

          {/* Outro Screen Card */}
          {!outroTemplate ? (
            <button
              type="button"
              onClick={() => setOutroTemplate("blue-fade")}
              className="w-full py-4 border-2 border-dashed border-amber-500/40 hover:border-amber-500 hover:bg-amber-500/5 transition-all flex items-center justify-center gap-2 mt-4"
              style={{ borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px" }}
            >
              <Plus className="w-4 h-4 text-amber-500" />
              <span className="font-hand text-lg text-amber-600 dark:text-amber-400">
                Add Outro Screen
              </span>
            </button>
          ) : (
            <div
              className="sketch-card p-4 bg-amber-500/5 border-amber-500/30 relative mt-4"
              style={{ borderRadius: "12px" }}
            >
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-1 pt-1">
                  <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    OUTRO
                  </span>
                </div>

                <div className="flex-1 flex gap-4">
                  {/* Visual Placeholder representing Outro */}
                  <div className="w-24 h-24 flex-shrink-0 border-2 border-dashed border-amber-500/40 rounded-lg flex flex-col items-center justify-center bg-amber-500/5">
                    <MonitorPlay className="w-5 h-5 text-amber-500 mb-1" />
                    <span className="font-hand text-xs text-amber-600 text-center px-1">Outro Scene</span>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-body text-sm font-semibold text-[var(--sketch-fg)]">Outro Screen Configuration</span>
                      <button
                        type="button"
                        onClick={() => {
                          setOutroTemplate("");
                          setOutroText("");
                          setOutroVideoPath("");
                        }}
                        className="font-hand text-sm text-[var(--sketch-fg-subtle)] hover:text-red-500 transition-colors"
                      >
                        Remove Outro
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <select
                        value={outroTemplate}
                        onChange={(e) => {
                          setOutroTemplate(e.target.value);
                          if (!e.target.value) {
                            setOutroVideoPath("");
                            setOutroText("");
                          }
                        }}
                        className="sketch-input text-sm"
                      >
                        <option value="blue-fade">Blue Gradient (Fade)</option>
                        <option value="dark-minimal">Dark Minimal</option>
                        <option value="warm-title">Warm Title Screen</option>
                        <option value="custom-video">Custom Video</option>
                      </select>

                      {outroTemplate === "custom-video" ? (
                        <div className="flex items-center gap-2">
                          <input
                            ref={outroFileRef}
                            type="file"
                            accept="video/mp4,video/webm,video/quicktime"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setIsUploadingOutro(true);
                              try {
                                const formData = new FormData();
                                formData.append("file", file);
                                formData.append("folder", `projects/${projectIdNum}/outros`);
                                const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
                                if (!res.ok) throw new Error("Upload failed");
                                const data = await res.json();
                                setOutroVideoPath(data.url);
                              } catch {
                                alert("Failed to upload outro video");
                              } finally {
                                setIsUploadingOutro(false);
                              }
                            }}
                          />
                          {outroVideoPath ? (
                            <div className="flex items-center gap-2 flex-1 border-2 border-[var(--sketch-border-color)] p-1 sketch-border-sm bg-[var(--sketch-card-bg)]">
                              <video src={outroVideoPath} className="h-8 w-12 object-cover rounded" />
                              <span className="text-[10px] text-emerald-600 flex-1 truncate">Uploaded</span>
                              <button type="button" onClick={() => setOutroVideoPath("")} className="text-red-500 hover:text-red-700">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => outroFileRef.current?.click()}
                              disabled={isUploadingOutro}
                              className="sketch-input flex items-center gap-2 justify-center text-xs text-[var(--sketch-fg-muted)] hover:text-[var(--sketch-fg)]"
                            >
                              {isUploadingOutro ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                              Upload Outro Video
                            </button>
                          )}
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Outro Title Text..."
                          value={outroText}
                          onChange={(e) => setOutroText(e.target.value)}
                          className="sketch-input text-sm"
                        />
                      )}
                    </div>

                    {outroTemplate !== "custom-video" && (
                      <div className="space-y-1">
                        <label className="font-body text-xs font-semibold text-[var(--sketch-fg)]">
                          Outro Duration: {outroDuration.toFixed(1)}s
                        </label>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[10px] text-[var(--sketch-fg-subtle)]">1.0s</span>
                          <input
                            type="range"
                            min={1.0}
                            max={10.0}
                            step={0.5}
                            value={outroDuration}
                            onChange={(e) => setOutroDuration(Number(e.target.value))}
                            className="flex-1 h-1.5 bg-[var(--sketch-fg-subtle)] appearance-none cursor-pointer accent-amber-500"
                          />
                          <span className="font-mono text-[10px] text-[var(--sketch-fg-subtle)]">10.0s</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Camera Modal */}
          {showCamera && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
              <div className="bg-[var(--sketch-card-bg)] border-2 border-[var(--sketch-border-color)] p-6 max-w-lg w-full space-y-4" style={{ borderRadius: "12px" }}>
                <h3 className="font-body font-bold text-xl text-[var(--sketch-fg)]">📸 Take a Photo</h3>
                <div className="relative aspect-video bg-black rounded-md overflow-hidden">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                </div>
                <div className="flex gap-3">
                  <Button onClick={capturePhoto} className="sketch-btn-primary flex-1">
                    <Camera className="w-4 h-4 mr-2" />
                    Capture
                  </Button>
                  <Button onClick={closeCamera} variant="ghost" className="sketch-btn-ghost">
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {errors.submit && (
            <p className="font-body text-sm text-red-600">{errors.submit}</p>
          )}

          <div className="flex gap-4 mt-4">
            <Button
              variant="ghost"
              type="button"
              onClick={() => navigate(`/create/${projectIdNum}/setup`)}
              className="sketch-btn-ghost flex-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
            <Button
              onClick={handleContinue}
              disabled={isSaving || anyUploading}
              className="sketch-btn-primary flex-[2]"
            >
              {isSaving ? (
                <span className="flex items-center gap-2 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </span>
              ) : anyUploading ? (
                <span className="flex items-center gap-2 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </span>
              ) : (
                <span className="flex items-center gap-2 justify-center">
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
