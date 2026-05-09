import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { useWizardStore } from "@/hooks/useWizardStore";
import { trpc } from "@/providers/trpc";
import { motion } from "framer-motion";
import {
  Youtube,
  MessageSquare,
  Smartphone,
  Linkedin,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Platform = "youtube" | "teams" | "tiktok" | "linkedin";

const platforms: { value: Platform; label: string; icon: typeof Youtube }[] = [
  { value: "youtube", label: "YouTube", icon: Youtube },
  { value: "teams", label: "Microsoft Teams", icon: MessageSquare },
  { value: "tiktok", label: "TikTok", icon: Smartphone },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin },
];

export default function StepSetup() {
  const navigate = useNavigate();
  const { projectId: pid } = useParams<{ projectId: string }>();
  const projectIdNum = Number(pid) || 0;
  const { stepData, setStepData } = useWizardStore();
  const setup = stepData.setup;

  const [title, setTitle] = useState(setup.title);
  const [description, setDescription] = useState(setup.description);
  const [platform, setPlatform] = useState<Platform>(setup.platform);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [aiFeedback, setAiFeedback] = useState<{
    titleQuality: string;
    descriptionQuality: string;
    suggestions: string[];
  } | null>(null);

  const createProject = trpc.project.create.useMutation();
  const updateProject = trpc.project.update.useMutation();
  const validateQuery = trpc.ai.validateSetup.useQuery(
    { title, description, platform },
    { enabled: title.length >= 5 && description.length >= 20 }
  );

  useEffect(() => {
    if (validateQuery.data) {
      setAiFeedback({
        titleQuality: validateQuery.data.titleQuality,
        descriptionQuality: validateQuery.data.descriptionQuality,
        suggestions: validateQuery.data.suggestions,
      });
    }
  }, [validateQuery.data]);

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    if (title.length < 3) errs.title = "Title must be at least 3 characters";
    if (title.length > 100) errs.title = "Title must be less than 100 characters";
    if (description.length < 10)
      errs.description = "Description must be at least 10 characters";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [title, description]);

  const handleContinue = async () => {
    if (!validate()) return;

    setStepData("setup", { title, description, platform });

    try {
      let id = projectIdNum;
      if (id === 0) {
        const result = await createProject.mutateAsync({
          title,
          description,
          platform,
        });
        id = result.id;
      } else {
        await updateProject.mutateAsync({
          id,
          title,
          description,
          platform,
        });
      }
      navigate(`/create/${id}/upload`);
    } catch (err) {
      setErrors({ submit: "Failed to save project. Please try again." });
    }
  };

  return (
    <div className="max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span className="font-mono text-xs text-primary uppercase tracking-widest">
          Step 1 of 7
        </span>
        <h2 className="font-syne font-bold text-3xl mt-2 tracking-tight">
          Let&apos;s set up your project
        </h2>
        <p className="font-dm text-muted-foreground mt-2">
          Tell us about your tutorial video so we can generate the best script.
        </p>

        <div className="mt-8 space-y-6">
          <div>
            <label className="font-dm text-sm font-medium mb-2 block">
              Video Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. How to clean Windows temp files"
              className="neo-input"
            />
            {errors.title && (
              <p className="font-dm text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {errors.title}
              </p>
            )}
            {aiFeedback?.titleQuality === "good" && title.length >= 15 && (
              <p className="font-dm text-xs text-accent mt-1 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Great title!
              </p>
            )}
          </div>

          <div>
            <label className="font-dm text-sm font-medium mb-2 block">
              Topic Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this video is about, who the audience is, and what they should be able to do after watching."
              rows={5}
              className="neo-input resize-none"
            />
            {errors.description && (
              <p className="font-dm text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {errors.description}
              </p>
            )}
          </div>

          <div>
            <label className="font-dm text-sm font-medium mb-3 block">
              Target Platform
            </label>
            <div className="grid grid-cols-2 gap-3">
              {platforms.map((p) => {
                const Icon = p.icon;
                const isActive = platform === p.value;
                return (
                  <button
                    key={p.value}
                    onClick={() => setPlatform(p.value)}
                    className={`flex items-center gap-3 p-4 border-2 transition-all ${
                      isActive
                        ? "border-primary bg-primary/5 shadow-[4px_4px_0px_0px_hsl(var(--primary))]"
                        : "border-border bg-card hover:border-foreground/30"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        isActive ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    <span
                      className={`font-dm text-sm font-medium ${
                        isActive ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {p.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {aiFeedback?.suggestions && aiFeedback.suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="neo-card p-4 bg-primary/5 border-primary"
            >
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <p className="font-dm text-sm">
                  {aiFeedback.suggestions[0]}
                </p>
              </div>
            </motion.div>
          )}

          {errors.submit && (
            <p className="font-dm text-xs text-destructive">{errors.submit}</p>
          )}

          <Button
            onClick={handleContinue}
            disabled={createProject.isPending}
            className="neo-btn-primary w-full"
          >
            {createProject.isPending ? (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin" />
                Creating...
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
