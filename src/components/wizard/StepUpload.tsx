import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useWizardStore } from "@/hooks/useWizardStore";
import { motion } from "framer-motion";
import {
  X,
  GripVertical,
  Plus,
  ChevronRight,
  AlertTriangle,
  Loader2,
  Upload,
  CheckCircle,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { nanoid } from "nanoid";
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

  return (
    <div ref={setNodeRef} style={style} className={`sketch-card p-4 bg-[var(--sketch-card-bg)] ${isDragging ? 'shadow-xl scale-[1.02]' : ''}`}>
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
                  Drop here!
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
                error?.includes("Description") ? "border-red-500" : ""
              }`}
            />
            {error?.includes("Description") && (
              <p className="font-body text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {error}
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

  // Track which DB step IDs we started with, so we can detect removals
  const [originalDbIds, setOriginalDbIds] = useState<number[]>([]);

  const createStep = trpc.step.create.useMutation();
  const updateStep = trpc.step.update.useMutation();
  const deleteStep = trpc.step.delete.useMutation();

  // Initialize steps from DB data or wizard store
  useState(() => {});
  if (!initialized && !isLoadingProject) {
    if (project?.steps && project.steps.length > 0) {
      // Load from database (existing project with saved steps)
      const dbSteps: WizardStep[] = project.steps.map((s) => ({
        id: s.id,
        localId: nanoid(8),
        order: s.order,
        description: s.description || "",
        screenshotPath: s.screenshotPath || undefined,
        screenshotKey: s.screenshotPath || undefined,
        previewUrl: s.screenshotPath || undefined,
      }));
      setSteps(dbSteps);
      setOriginalDbIds(project.steps.map((s) => s.id));
      setInitialized(true);
    } else if (stepData.upload.steps.length > 0) {
      // Load from wizard store (in-progress local state)
      const storeSteps = stepData.upload.steps.map((s) => ({
        ...s,
        localId: (s as any).localId || nanoid(8),
      }));
      setSteps(storeSteps);
      setInitialized(true);
    } else if (!isLoadingProject) {
      // Fresh start — one empty step
      setSteps([{ localId: nanoid(8), order: 1, description: "" }]);
      setInitialized(true);
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

    const previewUrl = URL.createObjectURL(file);
    
    setSteps(currentSteps => currentSteps.map(s => {
      if (s.localId === localId) {
        return {
          ...s,
          file,
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
      const result = await uploadFile(file, `projects/${projectIdNum}/screenshots`);
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
    } catch (err: any) {
      setSteps(currentSteps => currentSteps.map(s => {
        if (s.localId === localId) {
          return {
            ...s,
            isUploading: false,
            uploadError: err.message,
          };
        }
        return s;
      }));
      console.warn("Upload failed:", err.message);
    }
  };

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    steps.forEach((step) => {
      if (!step.description.trim()) {
        errs[step.localId] = "Description is required";
      }
      if (!step.previewUrl && !step.screenshotPath && !step.screenshotKey) {
        errs[step.localId] = "Screenshot is required";
      }
      if (step.isUploading) {
        errs[step.localId] = "Wait for upload to finish";
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [steps]);

  const handleContinue = async () => {
    if (!validate()) return;

    setIsSaving(true);
    setStepData("upload", { steps });

    try {
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
          });
        } else {
          // Create a new step
          await createStep.mutateAsync({
            projectId: projectIdNum,
            order: step.order,
            description: step.description,
            screenshotPath: step.screenshotKey || step.screenshotPath || step.previewUrl || undefined,
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
    <div className="max-w-3xl">
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

        <div className="mt-8 space-y-4">
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
            <div className="flex gap-3">
              <button
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

          <Button
            onClick={handleContinue}
            disabled={isSaving || anyUploading}
            className="sketch-btn-primary w-full mt-4"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </span>
            ) : anyUploading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Continue
                <ChevronRight className="w-4 h-4" />
              </span>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
