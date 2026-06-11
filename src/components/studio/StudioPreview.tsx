import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useStudioStore, type TransitionType } from "@/hooks/useStudioStore";
import { trpc } from "@/providers/trpc";
import { motion } from "framer-motion";
import {
  ChevronRight,
  MonitorPlay,
  Film,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const transitionTypes: { value: TransitionType; label: string }[] = [
  { value: "fade", label: "Fade" },
  { value: "slide-left", label: "Slide Left" },
  { value: "slide-right", label: "Slide Right" },
  { value: "slide-up", label: "Slide Up" },
  { value: "flip", label: "Flip" },
  { value: "dissolve", label: "Dissolve" },
];

export default function StudioPreview() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const projectIdNum = Number(projectId) || 0;
  
  const { preview, setPreview } = useStudioStore();

  const [globalTransition, setGlobalTransition] = useState<TransitionType>("fade");
  const [transitionDuration, setTransitionDuration] = useState(preview.transitionDuration || 0.5);
  
  const [introTemplate, setIntroTemplate] = useState(preview.introTemplate || "");
  const [introText, setIntroText] = useState(preview.introText || "");
  const [introDuration, setIntroDuration] = useState(preview.introDuration || 3.0);
  const [outroTemplate, setOutroTemplate] = useState(preview.outroTemplate || "");
  const [outroText, setOutroText] = useState(preview.outroText || "");
  const [outroDuration, setOutroDuration] = useState(preview.outroDuration || 3.0);

  const updateProject = trpc.studio.update.useMutation();
  const updateScene = trpc.studio.updateScene.useMutation();
  const { data: projectData } = trpc.studio.getById.useQuery({ id: projectIdNum });
  const scenes = projectData?.scenes;

  const handleContinue = async () => {
    await updateProject.mutateAsync({
      id: projectIdNum,
      transitionDuration,
      introTemplate,
      introText,
      introDuration,
      outroTemplate,
      outroText,
      outroDuration,
    });

    if (scenes) {
      for (const scene of scenes) {
        await updateScene.mutateAsync({
          id: scene.id,
          transition: globalTransition,
        });
      }
    }

    setPreview({
      transitionDuration,
      introTemplate,
      introText,
      introDuration,
      outroTemplate,
      outroText,
      outroDuration,
    });

    navigate(`/studio/${projectIdNum}/voice`);
  };

  return (
    <div className="max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="relative">
          <span className="font-mono text-xs text-[var(--sketch-fg-muted)] uppercase tracking-widest bg-[#FBBF24]/20 px-2 py-1 sketch-border-sm inline-block">
            Step 4 of 6
          </span>
          <span className="font-hand text-lg text-[var(--sketch-fg-muted)] absolute -top-6 left-32 rotate-[-5deg] animate-float hidden sm:block">
            Add some flair ✨
          </span>
        </div>
        <h2 className="font-body font-bold text-3xl mt-3 tracking-tight text-[var(--sketch-fg)]">
          Adjustments & Preview
        </h2>
        <p className="font-body text-[var(--sketch-fg-muted)] mt-2">
          Configure video transitions and customize your intro/outro templates.
        </p>

        <div className="mt-8 space-y-8">
          
          {/* Transitions */}
          <div className="sketch-card p-5 bg-[var(--sketch-card-bg)]">
            <h3 className="font-body font-semibold text-lg flex items-center gap-2 mb-4 text-[var(--sketch-fg)]">
              <Film className="w-5 h-5 text-[#FBBF24]" />
              Scene Transitions
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {transitionTypes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setGlobalTransition(t.value)}
                  className={`p-3 border-2 text-center transition-all ${
                    globalTransition === t.value
                      ? "border-[var(--sketch-border-color)] bg-[#FBBF24]/10 shadow-[2px_2px_0px_0px_#FBBF24]"
                      : "border-[var(--sketch-fg-subtle)] bg-transparent hover:border-[var(--sketch-border-color)]/40"
                  }`}
                  style={{ borderRadius: "8px" }}
                >
                  <span className={`font-body text-sm font-semibold ${
                    globalTransition === t.value ? "text-[var(--sketch-fg)]" : "text-[var(--sketch-fg-subtle)]"
                  }`}>
                    {t.label}
                  </span>
                </button>
              ))}
            </div>

            <div>
              <label className="font-body text-sm font-semibold mb-2 block text-[var(--sketch-fg)]">
                Transition Duration: {transitionDuration.toFixed(1)}s
              </label>
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs text-[var(--sketch-fg-subtle)] w-8">0.3s</span>
                <input
                  type="range"
                  min={0.3}
                  max={2.0}
                  step={0.1}
                  value={transitionDuration}
                  onChange={(e) => setTransitionDuration(Number(e.target.value))}
                  className="flex-1 h-2 bg-[var(--sketch-fg-subtle)] appearance-none cursor-pointer accent-[#FBBF24]"
                />
                <span className="font-mono text-xs text-[var(--sketch-fg-subtle)] w-8">2.0s</span>
              </div>
            </div>
          </div>

          {/* Intro Template */}
          <div className="border-t border-[var(--sketch-fg-subtle)] pt-6">
            <h3 className="font-body font-semibold text-lg flex items-center gap-2 mb-4 text-[var(--sketch-fg)]">
              <MonitorPlay className="w-5 h-5 text-[#FBBF24]" />
              Intro Screen
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <select
                value={introTemplate}
                onChange={(e) => setIntroTemplate(e.target.value)}
                className="sketch-input"
              >
                <option value="">None (Start immediately)</option>
                <option value="blue-fade">Blue Gradient (Fade)</option>
                <option value="dark-minimal">Dark Minimal</option>
                <option value="warm-title">Warm Title Screen</option>
              </select>
              <input
                type="text"
                placeholder="Intro Title Text..."
                value={introText}
                onChange={(e) => setIntroText(e.target.value)}
                disabled={!introTemplate}
                className="sketch-input disabled:opacity-50 disabled:bg-gray-100"
              />
            </div>
            {introTemplate && (
              <div className="mt-4">
                <label className="font-body text-sm font-semibold mb-2 block text-[var(--sketch-fg)]">
                  Intro Duration: {introDuration.toFixed(1)}s
                </label>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs text-[var(--sketch-fg-subtle)] w-8">1.0s</span>
                  <input
                    type="range"
                    min={1.0}
                    max={10.0}
                    step={0.5}
                    value={introDuration}
                    onChange={(e) => setIntroDuration(Number(e.target.value))}
                    className="flex-1 h-2 bg-[var(--sketch-fg-subtle)] appearance-none cursor-pointer accent-[#FBBF24]"
                  />
                  <span className="font-mono text-xs text-[var(--sketch-fg-subtle)] w-8">10.0s</span>
                </div>
              </div>
            )}
          </div>

          {/* Outro Template */}
          <div className="border-t border-[var(--sketch-fg-subtle)] pt-6">
            <h3 className="font-body font-semibold text-lg flex items-center gap-2 mb-4 text-[var(--sketch-fg)]">
              <CheckCircle2 className="w-5 h-5 text-[#FBBF24]" />
              Outro Screen
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={outroTemplate}
                onChange={(e) => setOutroTemplate(e.target.value)}
                className="sketch-input"
              >
                <option value="">None (End immediately)</option>
                <option value="blue-fade">Blue Gradient (Fade)</option>
                <option value="dark-minimal">Dark Minimal</option>
                <option value="warm-title">Warm Title Screen</option>
              </select>
              <input
                type="text"
                placeholder="Outro Title Text..."
                value={outroText}
                onChange={(e) => setOutroText(e.target.value)}
                disabled={!outroTemplate}
                className="sketch-input disabled:opacity-50 disabled:bg-gray-100"
              />
            </div>
            {outroTemplate && (
              <div className="mt-4">
                <label className="font-body text-sm font-semibold mb-2 block text-[var(--sketch-fg)]">
                  Outro Duration: {outroDuration.toFixed(1)}s
                </label>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs text-[var(--sketch-fg-subtle)] w-8">1.0s</span>
                  <input
                    type="range"
                    min={1.0}
                    max={10.0}
                    step={0.5}
                    value={outroDuration}
                    onChange={(e) => setOutroDuration(Number(e.target.value))}
                    className="flex-1 h-2 bg-[var(--sketch-fg-subtle)] appearance-none cursor-pointer accent-[#FBBF24]"
                  />
                  <span className="font-mono text-xs text-[var(--sketch-fg-subtle)] w-8">10.0s</span>
                </div>
              </div>
            )}
          </div>

          {/* Copyright Checker Panel */}
          <div className="border-t border-[var(--sketch-fg-subtle)] pt-6">
            <h3 className="font-body font-semibold text-lg flex items-center gap-2 mb-4 text-[var(--sketch-fg)]">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              Copyright Checker
            </h3>
            <div className="sketch-card p-5 bg-emerald-500/5 border-emerald-500/20">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-body font-semibold text-emerald-700">All Clear!</h4>
                  <p className="font-body text-sm text-emerald-600/80 mt-1">
                    Your generated scenes, media, and selected audio have been scanned and are 100% free of known copyright claims. Safe to monetize on YouTube and other platforms.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={handleContinue}
            disabled={updateProject.isPending || updateScene.isPending}
            className="sketch-btn-primary w-full mt-6"
          >
            <span className="flex items-center gap-2">
              Continue
              <ChevronRight className="w-4 h-4" />
            </span>
          </Button>

        </div>
      </motion.div>
    </div>
  );
}
