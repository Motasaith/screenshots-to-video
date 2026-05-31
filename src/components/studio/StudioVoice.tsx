import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { useStudioStore } from "@/hooks/useStudioStore";
import { trpc } from "@/providers/trpc";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Volume2,
  Play,
  Pause,
  Loader2,
  Monitor,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const voices = [
  { id: "en-US-AriaNeural", name: "Aria", gender: "Female", accent: "US" },
  { id: "en-US-GuyNeural", name: "Guy", gender: "Male", accent: "US" },
  { id: "en-US-JennyNeural", name: "Jenny", gender: "Female", accent: "US" },
  { id: "en-GB-SoniaNeural", name: "Sonia", gender: "Female", accent: "UK" },
  { id: "en-GB-RyanNeural", name: "Ryan", gender: "Male", accent: "UK" },
  { id: "en-AU-NatashaNeural", name: "Natasha", gender: "Female", accent: "AU" },
];

const resolutions = [
  { value: "720p" as const, label: "720p", desc: "HD — Fast rendering", free: true },
  { value: "1080p" as const, label: "1080p", desc: "Full HD — Recommended", free: false },
  { value: "4k" as const, label: "4K", desc: "Ultra HD — Premium", free: false },
];

export default function StudioVoice() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projectId, voice, setVoice } = useStudioStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isFreePlan = user?.plan === "free";

  const updateProject = trpc.studio.update.useMutation();
  const previewVoice = trpc.studio.previewVoice.useMutation();

  const handlePreview = async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    try {
      const result = await previewVoice.mutateAsync({
        voice: voice.voice,
        speed: voice.speed,
      });

      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(result.audioData);
      audioRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      await audio.play();
      setIsPlaying(true);
    } catch (err) {
      console.error("Preview failed:", err);
    }
  };

  const handleContinue = async () => {
    if (!projectId) return;

    try {
      await updateProject.mutateAsync({
        id: projectId,
        voice: voice.voice,
        speed: voice.speed,
        resolution: voice.resolution,
      });
      navigate(`/studio/${projectId}/render`);
    } catch (err: any) {
      console.error("Failed to save voice settings:", err);
      toast.error(err.message || "Failed to save settings. Please try again.");
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
            Step 4 of 6
          </span>
          <span className="font-hand text-lg text-[var(--sketch-fg-muted)] absolute -top-6 left-32 rotate-[-5deg] animate-float hidden sm:block">
            Choose the voice 🎙️
          </span>
        </div>
        <h2 className="font-body font-bold text-3xl mt-3 tracking-tight text-[var(--sketch-fg)]">
          Voice & Settings
        </h2>
        <p className="font-body text-[var(--sketch-fg-muted)] mt-2">
          Pick a voice for the narration and configure your output settings.
        </p>

        <div className="mt-8 space-y-8">
          {/* Voice selection */}
          <div>
            <label className="font-body text-sm font-semibold mb-3 block text-[var(--sketch-fg)]">
              <Volume2 className="w-4 h-4 inline mr-1" />
              Narrator Voice
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {voices.map((v) => {
                const isActive = voice.voice === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => setVoice({ voice: v.id })}
                    className={`p-3 border-2 transition-all text-left ${
                      isActive
                        ? "border-[var(--sketch-border-color)] bg-[#FBBF24]/10 shadow-[3px_3px_0px_0px_#FBBF24]"
                        : "border-[var(--sketch-fg-subtle)] bg-[var(--sketch-card-bg)] hover:border-[var(--sketch-border-color)]/40"
                    }`}
                    style={{ borderRadius: isActive ? "255px 15px 225px 15px/15px 225px 15px 255px" : "12px" }}
                  >
                    <span className={`font-body text-sm font-medium block ${isActive ? "text-[var(--sketch-fg)]" : "text-[var(--sketch-fg-subtle)]"}`}>
                      {v.name}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--sketch-fg-muted)]">
                      {v.gender} · {v.accent}
                    </span>
                  </button>
                );
              })}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handlePreview}
              disabled={previewVoice.isPending}
              className="sketch-btn-ghost mt-3"
            >
              {previewVoice.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4 mr-1" />
              ) : (
                <Play className="w-4 h-4 mr-1" />
              )}
              {isPlaying ? "Stop" : "Preview Voice"}
            </Button>
          </div>

          {/* Speed */}
          <div>
            <label className="font-body text-sm font-semibold mb-2 block text-[var(--sketch-fg)]">
              Speaking Speed: <span className="text-[#FBBF24]">{voice.speed}x</span>
            </label>
            <input
              type="range"
              min={0.8}
              max={1.3}
              step={0.05}
              value={voice.speed}
              onChange={(e) => setVoice({ speed: Number(e.target.value) })}
              className="w-full accent-[#FBBF24] h-2"
            />
            <div className="flex justify-between font-mono text-xs text-[var(--sketch-fg-subtle)] mt-1">
              <span>Slow (0.8x)</span>
              <span>Normal (1.0x)</span>
              <span>Fast (1.3x)</span>
            </div>
          </div>

          {/* Resolution */}
          <div>
            <label className="font-body text-sm font-semibold mb-3 block text-[var(--sketch-fg)]">
              <Monitor className="w-4 h-4 inline mr-1" />
              Output Resolution
            </label>
            <div className="grid grid-cols-3 gap-3">
              {resolutions.map((r) => {
                const isActive = voice.resolution === r.value;
                const isLocked = isFreePlan && !r.free;

                return (
                  <button
                    key={r.value}
                    onClick={() => {
                      if (isLocked) {
                        toast.error(`${r.label} is a Pro feature. Upgrade your plan to unlock high resolution rendering.`);
                        return;
                      }
                      setVoice({ resolution: r.value });
                    }}
                    className={`p-3 border-2 transition-all text-center relative ${
                      isActive
                        ? "border-[var(--sketch-border-color)] bg-[#FBBF24]/10 shadow-[3px_3px_0px_0px_#FBBF24]"
                        : isLocked
                          ? "border-[var(--sketch-fg-subtle)]/40 bg-[var(--sketch-card-bg)]/50 opacity-70 cursor-not-allowed"
                          : "border-[var(--sketch-fg-subtle)] bg-[var(--sketch-card-bg)] hover:border-[var(--sketch-border-color)]/40"
                    }`}
                    style={{ borderRadius: isActive ? "255px 15px 225px 15px/15px 225px 15px 255px" : "12px" }}
                  >
                    {isLocked && (
                      <Lock className="w-3.5 h-3.5 text-amber-600 absolute top-2 right-2" />
                    )}
                    <span className={`font-body text-lg font-bold block ${isActive ? "text-[var(--sketch-fg)]" : "text-[var(--sketch-fg-subtle)]"}`}>
                      {r.label}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--sketch-fg-muted)]">{r.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            onClick={handleContinue}
            disabled={updateProject.isPending}
            className="sketch-btn-primary w-full"
          >
            {updateProject.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Continue — Start Render
                <ChevronRight className="w-4 h-4" />
              </span>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
