import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useWizardStore, type TransitionType } from "@/hooks/useWizardStore";
import { trpc } from "@/providers/trpc";
import { motion } from "framer-motion";
import {
  ChevronRight,
  MonitorPlay,
  Film,
  CheckCircle2,
  Upload,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepEditorPanel } from "./StepEditorPanel";

const transitionTypes: { value: TransitionType; label: string }[] = [
  { value: "fade", label: "Fade" },
  { value: "slide-left", label: "Slide Left" },
  { value: "slide-right", label: "Slide Right" },
  { value: "slide-up", label: "Slide Up" },
  { value: "flip", label: "Flip" },
  { value: "dissolve", label: "Dissolve" },
];

export default function StepPreview() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const projectIdNum = Number(projectId) || 0;
  
  const { stepData, setStepData } = useWizardStore();
  const previewData = stepData.preview;

  const [globalTransition, setGlobalTransition] = useState<TransitionType>("fade");
  const [transitionDuration, setTransitionDuration] = useState(previewData.transitionDuration || 0.5);
  
  const [introTemplate, setIntroTemplate] = useState(previewData.introTemplate || "");
  const [introText, setIntroText] = useState(previewData.introText || "");
  const [introVideoPath, setIntroVideoPath] = useState(previewData.introVideoPath || "");
  const [introDuration, setIntroDuration] = useState(previewData.introDuration || 3.0);
  const [outroTemplate, setOutroTemplate] = useState(previewData.outroTemplate || "");
  const [outroText, setOutroText] = useState(previewData.outroText || "");
  const [outroVideoPath, setOutroVideoPath] = useState(previewData.outroVideoPath || "");
  const [outroDuration, setOutroDuration] = useState(previewData.outroDuration || 3.0);

  const [isUploadingIntro, setIsUploadingIntro] = useState(false);
  const [isUploadingOutro, setIsUploadingOutro] = useState(false);
  const introFileRef = useRef<HTMLInputElement>(null);
  const outroFileRef = useRef<HTMLInputElement>(null);

  const [captionsEnabled, setCaptionsEnabled] = useState(previewData.captionsEnabled ?? true);
  const [captionStyle, setCaptionStyle] = useState(previewData.captionStyle || "standard");
  const [captionSize, setCaptionSize] = useState(previewData.captionSize || "medium");
  const [captionPosition, setCaptionPosition] = useState(previewData.captionPosition || "bottom");
  const [captionColor, setCaptionColor] = useState(previewData.captionColor || "#FFFFFF");

  const updateProject = trpc.project.update.useMutation();
  const updateStep = trpc.step.update.useMutation();
  const { data: steps } = trpc.step.listByProject.useQuery({ projectId: projectIdNum });
  // State setup removed as copyright checking moved to individual uploads

  const handleContinue = async () => {
    // Save project level data
    await updateProject.mutateAsync({
      id: projectIdNum,
      transitionDuration,
      introTemplate,
      introText,
      introVideoPath,
      introDuration,
      outroTemplate,
      outroText,
      outroVideoPath,
      outroDuration,
      captionsEnabled,
      captionStyle,
      captionSize,
      captionPosition,
      captionColor,
    });

    // Save step level data (transitions)
    if (steps) {
      for (const step of steps) {
        // In this simple version we apply the same transition to all steps
        // The advanced version would have a UI to select per-step transitions
        await updateStep.mutateAsync({
          id: step.id,
          transition: globalTransition,
        });
      }
    }

    setStepData("preview", {
      transitionDuration,
      introTemplate,
      introText,
      introVideoPath,
      introDuration,
      outroTemplate,
      outroText,
      outroVideoPath,
      outroDuration,
      captionsEnabled,
      captionStyle,
      captionSize,
      captionPosition,
      captionColor,
    });

    navigate(`/create/${projectIdNum}/voice`);
  };

  return (
    <div className="max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="relative">
          <span className="font-mono text-xs text-[var(--sketch-fg-muted)] uppercase tracking-widest bg-[#FBBF24]/20 px-2 py-1 sketch-border-sm inline-block">
            Step 4 of 7
          </span>
          <span className="font-hand text-lg text-[var(--sketch-fg-muted)] absolute -top-6 left-32 rotate-[-5deg] animate-float hidden sm:block">
            Polish & customize ✨
          </span>
        </div>
        <h2 className="font-body font-bold text-3xl mt-3 tracking-tight text-[var(--sketch-fg)]">
          Preview & Editor
        </h2>
        <p className="font-body text-[var(--sketch-fg-muted)] mt-2">
          Edit your screenshots with annotations, blur, captions, and more. Then configure video transitions, captions, and your intro/outro below.
        </p>

        {/* Full canvas editor with all 14 tools */}
        <div className="mt-6">
          <StepEditorPanel />
        </div>

        <div className="mt-10 space-y-8">
          
          {/* Transitions */}
          <div className="sketch-card p-5 bg-[var(--sketch-card-bg)]">
            <h3 className="font-body font-semibold text-lg flex items-center gap-2 mb-4 text-[var(--sketch-fg)]">
              <Film className="w-5 h-5 text-[#FBBF24]" />
              Slide Transitions
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

            {/* Captions Options */}
            <div className="mt-8 border-t border-[var(--sketch-fg-subtle)] pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-body font-semibold text-lg flex items-center gap-2 text-[var(--sketch-fg)]">
                  <Film className="w-5 h-5 text-[#FBBF24]" />
                  Captions
                </h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="font-body text-sm font-semibold text-[var(--sketch-fg-muted)]">Enable Captions</span>
                  <input
                    type="checkbox"
                    checked={captionsEnabled}
                    onChange={(e) => setCaptionsEnabled(e.target.checked)}
                    className="w-4 h-4 text-[#FBBF24] rounded border-[var(--sketch-fg-subtle)] focus:ring-[#FBBF24]"
                  />
                </label>
              </div>

              {captionsEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="font-body text-sm font-semibold mb-1 block text-[var(--sketch-fg)]">Style</label>
                      <select value={captionStyle} onChange={(e) => setCaptionStyle(e.target.value)} className="sketch-input w-full">
                        <option value="standard">Standard</option>
                        <option value="outline">Outline</option>
                        <option value="highlight">Highlight</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-body text-sm font-semibold mb-1 block text-[var(--sketch-fg)]">Size</label>
                      <select value={captionSize} onChange={(e) => setCaptionSize(e.target.value)} className="sketch-input w-full">
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-body text-sm font-semibold mb-1 block text-[var(--sketch-fg)]">Position</label>
                      <select value={captionPosition} onChange={(e) => setCaptionPosition(e.target.value)} className="sketch-input w-full">
                        <option value="top">Top</option>
                        <option value="middle">Middle</option>
                        <option value="bottom">Bottom</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-body text-sm font-semibold mb-1 block text-[var(--sketch-fg)]">Color</label>
                      <div className="flex gap-2">
                        {["#FFFFFF", "#FBBF24", "#10B981", "#EF4444", "#3B82F6"].map(c => (
                          <button
                            key={c}
                            onClick={() => setCaptionColor(c)}
                            className={`w-8 h-8 rounded-full border-2 ${captionColor === c ? 'border-[var(--sketch-fg)]' : 'border-transparent'}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Live Mock Preview */}
                  <div className="flex flex-col">
                    <label className="font-body text-sm font-semibold mb-1 block text-[var(--sketch-fg)]">Preview</label>
                    <div className="relative w-full aspect-video bg-gray-900 overflow-hidden border-2 border-[var(--sketch-border-color)] rounded-md flex justify-center">
                      {(() => {
                        const firstScreenshot = steps?.find((s) => s.screenshotPath)?.screenshotPath;
                        return firstScreenshot ? (
                          <img src={firstScreenshot} alt="Your screenshot" className="w-full h-full object-cover opacity-70" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-b from-gray-800 to-gray-900" />
                        );
                      })()}
                      <div className={`absolute w-full px-4 text-center ${
                        captionPosition === 'top' ? 'top-4' : captionPosition === 'middle' ? 'top-1/2 -translate-y-1/2' : 'bottom-4'
                      }`}>
                        <span 
                          className={`font-body font-bold inline-block px-2 py-1 ${
                            captionSize === 'small' ? 'text-sm' : captionSize === 'large' ? 'text-2xl' : 'text-lg'
                          } ${
                            captionStyle === 'highlight' ? 'bg-black/60' : ''
                          }`}
                          style={{
                            color: captionColor,
                            textShadow: captionStyle === 'standard' ? '2px 2px 4px rgba(0,0,0,0.8)' : undefined,
                            WebkitTextStroke: captionStyle === 'outline' ? '1px black' : undefined,
                          }}
                        >
                          This is how your caption will look!
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 border-t border-[var(--sketch-fg-subtle)] pt-6">
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
                onChange={(e) => {
                  setIntroTemplate(e.target.value);
                  if (!e.target.value) {
                    setIntroVideoPath("");
                    setIntroText("");
                  }
                }}
                className="sketch-input"
              >
                <option value="">None (Start immediately)</option>
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
                    <div className="flex items-center gap-2 flex-1">
                      <video src={introVideoPath} className="h-10 w-16 object-cover rounded border" />
                      <span className="text-xs text-emerald-600 flex-1 truncate">Uploaded</span>
                      <button onClick={() => setIntroVideoPath("")} className="text-red-500 hover:text-red-700">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => introFileRef.current?.click()}
                      disabled={isUploadingIntro}
                      className="sketch-input flex items-center gap-2 justify-center text-[var(--sketch-fg-muted)] hover:text-[var(--sketch-fg)]"
                    >
                      {isUploadingIntro ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Upload Video
                    </button>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="Intro Title Text..."
                  value={introText}
                  onChange={(e) => setIntroText(e.target.value)}
                  disabled={!introTemplate}
                  className="sketch-input disabled:opacity-50 disabled:bg-gray-100"
                />
              )}
            </div>
            {introTemplate && introTemplate !== "custom-video" && (
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
                onChange={(e) => {
                  setOutroTemplate(e.target.value);
                  if (!e.target.value) {
                    setOutroVideoPath("");
                    setOutroText("");
                  }
                }}
                className="sketch-input"
              >
                <option value="">None (End immediately)</option>
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
                    <div className="flex items-center gap-2 flex-1">
                      <video src={outroVideoPath} className="h-10 w-16 object-cover rounded border" />
                      <span className="text-xs text-emerald-600 flex-1 truncate">Uploaded</span>
                      <button onClick={() => setOutroVideoPath("")} className="text-red-500 hover:text-red-700">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => outroFileRef.current?.click()}
                      disabled={isUploadingOutro}
                      className="sketch-input flex items-center gap-2 justify-center text-[var(--sketch-fg-muted)] hover:text-[var(--sketch-fg)]"
                    >
                      {isUploadingOutro ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Upload Video
                    </button>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="Outro Title Text..."
                  value={outroText}
                  onChange={(e) => setOutroText(e.target.value)}
                  disabled={!outroTemplate}
                  className="sketch-input disabled:opacity-50 disabled:bg-gray-100"
                />
              )}
            </div>
            {outroTemplate && outroTemplate !== "custom-video" && (
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

          {/* Safety/Copyright is now checked per-screenshot during upload */}

          <Button
            onClick={handleContinue}
            disabled={updateProject.isPending || updateStep.isPending}
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
