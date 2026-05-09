import { useState, useRef, useCallback } from "react";
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
    <div ref={setNodeRef} style={style} className={`neo-card p-4 bg-card ${isDragging ? 'shadow-xl scale-[1.02]' : ''}`}>
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center gap-1 pt-1">
          <span className="font-mono text-xs font-bold text-muted-foreground">
            {index + 1}
          </span>
          <button
            {...attributes}
            {...listeners}
            className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
          >
            <GripVertical className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 flex gap-4">
          <div className="w-24 h-24 flex-shrink-0">
            {step.previewUrl || step.screenshotPath ? (
              <div className="relative w-full h-full border-2 border-border group">
                <img
                  src={step.previewUrl || step.screenshotPath}
                  alt={`Step ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {step.isUploading && (
                  <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                )}
                {step.screenshotKey && !step.isUploading && (
                  <div className="absolute top-0.5 right-0.5">
                    <CheckCircle className="w-4 h-4 text-accent" />
                  </div>
                )}
                {step.uploadError && (
                  <div className="absolute inset-0 bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                )}
                <button
                  onClick={onRemoveScreenshot}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`w-full h-full border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors ${
                  error?.includes("Screenshot")
                    ? "border-destructive bg-destructive/5"
                    : "border-border hover:border-primary hover:bg-primary/5"
                }`}
              >
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="font-mono text-[10px] text-muted-foreground">
                  Upload
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
              className={`neo-input resize-none text-sm ${
                error?.includes("Description") ? "border-destructive" : ""
              }`}
            />
            {error?.includes("Description") && (
              <p className="font-dm text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {error}
              </p>
            )}
            {step.uploadError && (
              <p className="font-dm text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Upload failed: {step.uploadError}. Will retry on save.
              </p>
            )}
            <div className="flex items-center justify-between mt-2">
              <span className="font-mono text-[10px] text-muted-foreground">
                {step.description.length} chars
                {step.screenshotKey && (
                  <span className="text-accent ml-2">✓ uploaded</span>
                )}
              </span>
              <button
                onClick={onRemove}
                className="font-dm text-xs text-muted-foreground hover:text-destructive transition-colors"
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
  
  const [steps, setSteps] = useState<WizardStep[]>(() => {
    const initialSteps = stepData.upload.steps.length > 0
      ? stepData.upload.steps
      : [{ order: 1, description: "", screenshotPath: "" }];
      
    // Ensure all steps have a localId
    return initialSteps.map(s => ({
      ...s,
      localId: (s as any).localId || nanoid(8)
    }));
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const createStep = trpc.step.create.useMutation();

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
      for (const step of steps) {
        await createStep.mutateAsync({
          projectId: projectIdNum,
          order: step.order,
          description: step.description,
          screenshotPath: step.screenshotKey || step.screenshotPath || step.previewUrl || undefined,
        });
      }
      navigate(`/create/${projectIdNum}/script`);
    } catch (err) {
      setErrors({ submit: "Failed to save steps" });
    } finally {
      setIsSaving(false);
    }
  };

  const anyUploading = steps.some((s) => s.isUploading);

  return (
    <div className="max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <span className="font-mono text-xs text-primary uppercase tracking-widest">
          Step 2 of 7
        </span>
        <h2 className="font-syne font-bold text-3xl mt-2 tracking-tight">
          Add your steps
        </h2>
        <p className="font-dm text-muted-foreground mt-2">
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
            <button
              onClick={addStep}
              className="w-full py-4 border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 text-muted-foreground" />
              <span className="font-dm text-sm text-muted-foreground">
                Add Another Step
              </span>
            </button>
          )}

          {errors.submit && (
            <p className="font-dm text-sm text-destructive">{errors.submit}</p>
          )}

          <Button
            onClick={handleContinue}
            disabled={isSaving || anyUploading}
            className="neo-btn-primary w-full mt-4"
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
