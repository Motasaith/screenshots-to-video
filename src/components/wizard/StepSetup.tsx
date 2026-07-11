import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { useWizardStore, type AspectRatio } from "@/hooks/useWizardStore";
import { trpc } from "@/providers/trpc";
import { motion } from "framer-motion";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Platform = "youtube" | "teams" | "tiktok" | "linkedin";


const aspectRatios: { value: AspectRatio; label: string; desc: string; iconW: string; iconH: string }[] = [
  { value: "16:9", label: "Widescreen", desc: "YouTube, Vimeo", iconW: "w-6", iconH: "h-3.5" },
  { value: "9:16", label: "Vertical", desc: "TikTok, Reels", iconW: "w-3.5", iconH: "h-6" },
  { value: "1:1", label: "Square", desc: "Instagram, LinkedIn", iconW: "w-5", iconH: "h-5" },
  { value: "4:5", label: "Portrait", desc: "Facebook, IG Feed", iconW: "w-4", iconH: "h-5" },
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
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(setup.aspectRatio || "16:9");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Automatically derive platform based on selected aspect ratio
  useEffect(() => {
    const rawPlatform = aspectRatio === "16:9" ? "youtube" : aspectRatio === "9:16" ? "tiktok" : "linkedin";
    setPlatform(rawPlatform);
  }, [aspectRatio]);

  // Sync local state to store so AIGuide can read it in real-time
  useEffect(() => {
    setStepData("setup", { title, description, platform, aspectRatio });
  }, [title, description, platform, aspectRatio, setStepData]);

  const createProject = trpc.project.create.useMutation();
  const updateProject = trpc.project.update.useMutation();
  const validateQuery = trpc.ai.validateSetup.useQuery(
    { title, description, platform },
    { enabled: title.length >= 5 && description.length >= 20 }
  );

  // Derive AI feedback directly from the query data instead of syncing via effect.
  const aiFeedback = validateQuery.data
    ? {
        titleQuality: validateQuery.data.titleQuality,
        descriptionQuality: validateQuery.data.descriptionQuality,
        suggestions: validateQuery.data.suggestions,
      }
    : null;

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

    try {
      let id = projectIdNum;
      if (id === 0) {
        const result = await createProject.mutateAsync({
          title,
          description,
          platform,
          aspectRatio,
        });
        id = result.id;
      } else {
        await updateProject.mutateAsync({
          id,
          title,
          description,
          platform,
          aspectRatio,
        });
      }
      navigate(`/create/${id}/preview`);
    } catch {
      setErrors({ submit: "Failed to save project. Please try again." });
    }
  };

  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Handwritten floating note */}
        <div className="relative">
          <span className="font-mono text-xs text-[var(--sketch-fg-muted)] uppercase tracking-widest bg-[#FBBF24]/20 px-2 py-1 sketch-border-sm inline-block">
            Step 1 of 7
          </span>
          <span className="font-hand text-lg text-[var(--sketch-fg-muted)] absolute -top-6 left-32 rotate-[-5deg] animate-float hidden sm:block">
            Let&apos;s get creative! ✏️
          </span>
        </div>
        <h2 className="font-body font-bold text-3xl mt-3 tracking-tight text-[var(--sketch-fg)]">
          Let&apos;s set up your project
        </h2>
        <p className="font-body text-[var(--sketch-fg-muted)] mt-2">
          Tell us about your tutorial video so we can generate the best script.
        </p>

        {/* Form sections inside a responsive grid */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5 items-start">
          {/* Left Column: Title & Description */}
          <div className="space-y-6">
            <div id="setup-title" className="relative scroll-mt-6">
              <label className="font-body text-sm font-semibold mb-2 block text-[var(--sketch-fg)]">
                Video Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. How to clean Windows temp files"
                className="sketch-input"
              />
              {errors.title && (
                <p className="font-body text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {errors.title}
                </p>
              )}
              {aiFeedback?.titleQuality === "good" && title.length >= 15 && (
                <p className="font-body text-xs text-emerald-600 mt-1 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Great title!
                </p>
              )}
            </div>

            <div id="setup-description" className="relative scroll-mt-6">
              <label className="font-body text-sm font-semibold mb-2 block text-[var(--sketch-fg)]">
                Topic Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this video is about, who the audience is, and what they should be able to do after watching."
                rows={5}
                className="sketch-input resize-none"
              />
              {errors.description && (
                <p className="font-body text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {errors.description}
                </p>
              )}
            </div>

            {aiFeedback?.suggestions && aiFeedback.suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="sketch-card p-4 bg-[#FBBF24]/5 border-[#FBBF24]"
              >
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-[#FBBF24] flex-shrink-0 mt-0.5" />
                  <p className="font-body text-sm text-[var(--sketch-fg)]">
                    {aiFeedback.suggestions[0]}
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column: Aspect Ratio & Actions */}
          <div className="space-y-6">
            <div id="setup-aspect" className="scroll-mt-6">
              <label className="font-body text-sm font-semibold mb-3 block text-[var(--sketch-fg)]">
                Aspect Ratio
              </label>
              <div className="grid grid-cols-2 gap-3">
                {aspectRatios.map((ar) => {
                  const isActive = aspectRatio === ar.value;
                  return (
                    <button
                      key={ar.value}
                      type="button"
                      onClick={() => setAspectRatio(ar.value)}
                      className={`flex flex-col items-center gap-2 p-4 border-2 transition-all text-center ${
                        isActive
                          ? "border-[var(--sketch-border-color)] bg-[#FBBF24]/10 shadow-[2px_2px_0px_0px_#FBBF24]"
                          : "border-[var(--sketch-fg-subtle)] bg-[var(--sketch-card-bg)] hover:border-[var(--sketch-border-color)]/40"
                      }`}
                      style={{ borderRadius: isActive ? "12px 4px 12px 4px/4px 12px 4px 12px" : "8px" }}
                    >
                      <div className="flex items-center justify-center w-14 h-14 shrink-0">
                        {getRatioSvg(ar.value, isActive)}
                      </div>
                      <div className="flex flex-col">
                        <span className={`font-body text-sm font-bold ${isActive ? "text-[var(--sketch-fg)]" : "text-[var(--sketch-fg-subtle)]"}`}>
                          {ar.value}
                        </span>
                        <span className="font-mono text-[9px] text-[var(--sketch-fg-muted)] mt-0.5">
                          {ar.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {errors.submit && (
              <p className="font-body text-xs text-red-600 mt-2">{errors.submit}</p>
            )}

            {/* Actions Row aligned under Aspect Ratio */}
            <div className="flex gap-3 mt-6">
              <Button
                variant="ghost"
                type="button"
                onClick={() => navigate("/dashboard")}
                className="sketch-btn-ghost flex-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
              <Button
                onClick={handleContinue}
                disabled={createProject.isPending}
                className="sketch-btn-primary flex-[2]"
              >
                {createProject.isPending ? (
                  <span className="flex items-center gap-2 justify-center">
                    <Sparkles className="w-4 h-4 animate-spin" />
                    Creating...
                  </span>
                ) : (
                  <span className="flex items-center gap-2 justify-center">
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </span>
                )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function getRatioSvg(ratio: AspectRatio, isActive: boolean) {
  const colorClass = isActive
    ? "text-[var(--sketch-fg)]"
    : "text-[var(--sketch-fg-subtle)]";
  const bgOpacity = isActive ? 0.05 : 0.02;

  switch (ratio) {
    case "16:9":
      return (
        <svg className={`w-12 h-12 ${colorClass}`} viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="9" width="56" height="31.5" rx="3" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity={bgOpacity} />
          <polygon points="28,21 38,25 28,29" fill="currentColor" fillOpacity="0.8" />
          <path d="M26,41.5 L38,41.5 M32,41.5 L32,45 M24,45 L40,45" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "9:16":
      return (
        <svg className={`w-12 h-12 ${colorClass}`} viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="22" y="4" width="20" height="36.5" rx="4" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity={bgOpacity} />
          <line x1="29" y1="8" x2="35" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <polygon points="30,19 37,22 30,25" fill="currentColor" fillOpacity="0.8" />
          <line x1="28" y1="36.5" x2="36" y2="36.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "1:1":
      return (
        <svg className={`w-12 h-12 ${colorClass}`} viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="17" y="9" width="30" height="30" rx="3" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity={bgOpacity} />
          <circle cx="25" cy="17" r="3" fill="currentColor" fillOpacity="0.8" />
          <path d="M19,34 L27,25 L33,31 L41,22 L45,26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "4:5":
      return (
        <svg className={`w-12 h-12 ${colorClass}`} viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="18" y="6" width="28" height="35" rx="3" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity={bgOpacity} />
          <circle cx="24" cy="12" r="2" fill="currentColor" fillOpacity="0.8" />
          <line x1="29" y1="12" x2="41" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <rect x="22" y="17" width="20" height="18" rx="1" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity={0.1} />
          <circle cx="24" cy="37.5" r="1.2" fill="currentColor" fillOpacity="0.8" />
          <circle cx="28" cy="37.5" r="1.2" fill="currentColor" fillOpacity="0.8" />
        </svg>
      );
    default:
      return null;
  }
}
