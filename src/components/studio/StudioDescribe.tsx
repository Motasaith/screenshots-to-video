import { useState } from "react";
import { useNavigate } from "react-router";
import { useStudioStore } from "@/hooks/useStudioStore";
import { trpc } from "@/providers/trpc";
import { motion } from "framer-motion";
import {
  BookOpen,
  Zap,
  Megaphone,
  Camera,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Clock,
  Users,
  Youtube,
  Smartphone,
  Linkedin,
  Instagram,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Style = "educational" | "entertaining" | "promotional" | "documentary";
type Tone = "professional" | "casual" | "energetic" | "calm";
type Platform = "youtube" | "tiktok" | "linkedin" | "instagram";

const styles: { value: Style; label: string; icon: typeof BookOpen; desc: string }[] = [
  { value: "educational", label: "Educational", icon: BookOpen, desc: "Teach & explain concepts" },
  { value: "entertaining", label: "Entertaining", icon: Zap, desc: "Engage & captivate viewers" },
  { value: "promotional", label: "Promotional", icon: Megaphone, desc: "Market products & services" },
  { value: "documentary", label: "Documentary", icon: Camera, desc: "Tell stories with depth" },
];

const tones: { value: Tone; label: string; emoji: string }[] = [
  { value: "professional", label: "Professional", emoji: "🎩" },
  { value: "casual", label: "Casual", emoji: "😊" },
  { value: "energetic", label: "Energetic", emoji: "⚡" },
  { value: "calm", label: "Calm", emoji: "🌿" },
];

const platforms: { value: Platform; label: string; aspect: string; icon: typeof Youtube }[] = [
  { value: "youtube", label: "YouTube", aspect: "16:9", icon: Youtube },
  { value: "tiktok", label: "TikTok", aspect: "9:16", icon: Smartphone },
  { value: "linkedin", label: "LinkedIn", aspect: "1:1", icon: Linkedin },
  { value: "instagram", label: "Instagram", aspect: "4:5", icon: Instagram },
];

const aspectRatios: { value: "16:9" | "9:16" | "1:1" | "4:5"; label: string; desc: string; iconW: string; iconH: string }[] = [
  { value: "16:9", label: "Widescreen", desc: "YouTube, Vimeo", iconW: "w-6", iconH: "h-3.5" },
  { value: "9:16", label: "Vertical", desc: "TikTok, Reels", iconW: "w-3.5", iconH: "h-6" },
  { value: "1:1", label: "Square", desc: "Instagram, LinkedIn", iconW: "w-5", iconH: "h-5" },
  { value: "4:5", label: "Portrait", desc: "Facebook, IG Feed", iconW: "w-4", iconH: "h-5" },
];

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
}

export default function StudioDescribe() {
  const navigate = useNavigate();
  const { describe, setDescribe, setProjectId } = useStudioStore();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createProject = trpc.studio.create.useMutation();

  const validate = () => {
    const errs: Record<string, string> = {};
    if (describe.topic.length < 5) errs.topic = "Topic must be at least 5 characters";
    if (describe.topic.length > 500) errs.topic = "Topic must be under 500 characters";
    if (describe.audience.length < 2) errs.audience = "Please specify your target audience";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleContinue = async () => {
    if (!validate()) return;

    try {
      const result = await createProject.mutateAsync({
        topic: describe.topic,
        style: describe.style,
        targetDuration: describe.targetDuration,
        audience: describe.audience,
        tone: describe.tone,
        platform: describe.platform,
        aspectRatio: describe.aspectRatio,
      });
      setProjectId(result.id);
      navigate(`/studio/${result.id}/script`);
    } catch (err: any) {
      setErrors({ submit: err.message || "Failed to create project" });
    }
  };

  return (
    <div className="max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="relative">
          <span className="font-mono text-xs text-[var(--sketch-fg-muted)] uppercase tracking-widest bg-[#FBBF24]/20 px-2 py-1 sketch-border-sm inline-block">
            Step 1 of 6
          </span>
          <span className="font-hand text-lg text-[var(--sketch-fg-muted)] absolute -top-6 left-32 rotate-[-5deg] animate-float hidden sm:block">
            Let&apos;s plan your video! 🎬
          </span>
        </div>
        <h2 className="font-body font-bold text-3xl mt-3 tracking-tight text-[var(--sketch-fg)]">
          Describe your video
        </h2>
        <p className="font-body text-[var(--sketch-fg-muted)] mt-2">
          Tell us what you want to create and AI will handle the rest — script, visuals, voice, everything.
        </p>

        <div className="mt-8 space-y-6">
          {/* Topic */}
          <div>
            <label className="font-body text-sm font-semibold mb-2 block text-[var(--sketch-fg)]">
              What is your video about?
            </label>
            <textarea
              value={describe.topic}
              onChange={(e) => setDescribe({ topic: e.target.value })}
              placeholder="e.g. The future of artificial intelligence in healthcare, explaining how AI is revolutionizing diagnosis and treatment..."
              rows={4}
              className="sketch-input resize-none"
            />
            {errors.topic && (
              <p className="font-body text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {errors.topic}
              </p>
            )}
          </div>

          {/* Style */}
          <div>
            <label className="font-body text-sm font-semibold mb-3 block text-[var(--sketch-fg)]">
              Video Style
            </label>
            <div className="grid grid-cols-2 gap-3">
              {styles.map((s) => {
                const Icon = s.icon;
                const isActive = describe.style === s.value;
                return (
                  <button
                    key={s.value}
                    onClick={() => setDescribe({ style: s.value })}
                    className={`flex items-start gap-3 p-4 border-2 transition-all text-left ${
                      isActive
                        ? "border-[var(--sketch-border-color)] bg-[#FBBF24]/10 shadow-[4px_4px_0px_0px_#FBBF24]"
                        : "border-[var(--sketch-fg-subtle)] bg-[var(--sketch-card-bg)] hover:border-[var(--sketch-border-color)]/40"
                    }`}
                    style={{ borderRadius: isActive ? "255px 15px 225px 15px/15px 225px 15px 255px" : "12px" }}
                  >
                    <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isActive ? "text-[var(--sketch-fg)]" : "text-[var(--sketch-fg-subtle)]"}`} />
                    <div>
                      <span className={`font-body text-sm font-medium block ${isActive ? "text-[var(--sketch-fg)]" : "text-[var(--sketch-fg-subtle)]"}`}>
                        {s.label}
                      </span>
                      <span className="font-body text-xs text-[var(--sketch-fg-muted)]">{s.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="font-body text-sm font-semibold mb-2 block text-[var(--sketch-fg)]">
              <Clock className="w-4 h-4 inline mr-1" />
              Video Duration: <span className="text-[#FBBF24]">{formatDuration(describe.targetDuration)}</span>
            </label>
            <input
              type="range"
              min={30}
              max={600}
              step={15}
              value={describe.targetDuration}
              onChange={(e) => setDescribe({ targetDuration: Number(e.target.value) })}
              className="w-full accent-[#FBBF24] h-2"
            />
            <div className="flex justify-between font-mono text-xs text-[var(--sketch-fg-subtle)] mt-1">
              <span>30s</span>
              <span>2m</span>
              <span>5m</span>
              <span>10m</span>
            </div>
          </div>

          {/* Audience */}
          <div>
            <label className="font-body text-sm font-semibold mb-2 block text-[var(--sketch-fg)]">
              <Users className="w-4 h-4 inline mr-1" />
              Target Audience
            </label>
            <input
              type="text"
              value={describe.audience}
              onChange={(e) => setDescribe({ audience: e.target.value })}
              placeholder="e.g. tech professionals, beginners, students, marketers..."
              className="sketch-input"
            />
            {errors.audience && (
              <p className="font-body text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {errors.audience}
              </p>
            )}
          </div>

          {/* Tone */}
          <div>
            <label className="font-body text-sm font-semibold mb-3 block text-[var(--sketch-fg)]">
              Tone
            </label>
            <div className="flex gap-2 flex-wrap">
              {tones.map((t) => {
                const isActive = describe.tone === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setDescribe({ tone: t.value })}
                    className={`px-4 py-2 border-2 transition-all font-body text-sm ${
                      isActive
                        ? "border-[var(--sketch-border-color)] bg-[#FBBF24]/10 shadow-[3px_3px_0px_0px_#FBBF24] font-semibold text-[var(--sketch-fg)]"
                        : "border-[var(--sketch-fg-subtle)] bg-[var(--sketch-card-bg)] text-[var(--sketch-fg-subtle)] hover:border-[var(--sketch-border-color)]/40"
                    }`}
                    style={{ borderRadius: "255px 15px 225px 15px/15px 225px 15px 255px" }}
                  >
                    {t.emoji} {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Platform */}
          <div>
            <label className="font-body text-sm font-semibold mb-3 block text-[var(--sketch-fg)]">
              Target Platform
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {platforms.map((p) => {
                const Icon = p.icon;
                const isActive = describe.platform === p.value;
                return (
                  <button
                    key={p.value}
                    onClick={() => setDescribe({ platform: p.value })}
                    className={`flex flex-col items-center justify-center p-3 border-2 transition-all text-center relative ${
                      isActive
                        ? "border-[var(--sketch-border-color)] bg-[#FBBF24]/10 shadow-[3px_3px_0px_0px_#FBBF24]"
                        : "border-[var(--sketch-fg-subtle)] bg-[var(--sketch-card-bg)] hover:border-[var(--sketch-border-color)]/40"
                    }`}
                    style={{ borderRadius: isActive ? "255px 15px 225px 15px/15px 225px 15px 255px" : "12px" }}
                  >
                    <Icon className={`w-4 h-4 mb-1 ${isActive ? "text-[var(--sketch-fg)]" : "text-[var(--sketch-fg-subtle)]"}`} />
                    <span className={`font-body text-sm block leading-none ${isActive ? "text-[var(--sketch-fg)] font-semibold" : "text-[var(--sketch-fg-subtle)]"}`}>
                      {p.label}
                    </span>
                    <span className="font-mono text-[9px] text-[var(--sketch-fg-muted)] mt-1.5">
                      {p.aspect}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="font-body text-sm font-semibold mb-3 block text-[var(--sketch-fg)]">
              Aspect Ratio
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {aspectRatios.map((ar) => {
                const isActive = describe.aspectRatio === ar.value;
                return (
                  <button
                    key={ar.value}
                    onClick={() => setDescribe({ aspectRatio: ar.value })}
                    className={`flex flex-col items-center gap-2 p-3 border-2 transition-all text-center ${
                      isActive
                        ? "border-[var(--sketch-border-color)] bg-[#FBBF24]/10 shadow-[2px_2px_0px_0px_#FBBF24]"
                        : "border-[var(--sketch-fg-subtle)] bg-[var(--sketch-card-bg)] hover:border-[var(--sketch-border-color)]/40"
                    }`}
                    style={{ borderRadius: isActive ? "12px 4px 12px 4px/4px 12px 4px 12px" : "8px" }}
                  >
                    <div className="h-8 flex items-center justify-center">
                      <div className={`border-2 border-current rounded-sm ${ar.iconW} ${ar.iconH} ${isActive ? "text-[var(--sketch-fg)]" : "text-[var(--sketch-fg-subtle)]"}`} />
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
            <p className="font-body text-xs text-red-600">{errors.submit}</p>
          )}

          <Button
            onClick={handleContinue}
            disabled={createProject.isPending}
            className="sketch-btn-primary w-full"
          >
            {createProject.isPending ? (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin" />
                Creating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Continue — Generate Script
                <ChevronRight className="w-4 h-4" />
              </span>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
