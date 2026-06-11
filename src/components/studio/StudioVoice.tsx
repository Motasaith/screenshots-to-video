import { useState } from "react";
import { useNavigate } from "react-router";
import { useStudioStore } from "@/hooks/useStudioStore";
import { trpc } from "@/providers/trpc";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Volume2,
  Play,
  Square,
  Loader2,
  Monitor,
  Lock,
  Music,
  Gauge,
  Zap,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const voices = [
  // Newer Microsoft "Multilingual" voices — the most natural-sounding
  { id: "en-US-AndrewMultilingualNeural", name: "Andrew", accent: "US", gender: "Male", tag: "Natural" },
  { id: "en-US-AvaMultilingualNeural", name: "Ava", accent: "US", gender: "Female", tag: "Natural" },
  { id: "en-US-BrianMultilingualNeural", name: "Brian", accent: "US", gender: "Male", tag: "Natural" },
  { id: "en-US-EmmaMultilingualNeural", name: "Emma", accent: "US", gender: "Female", tag: "Natural" },
  // Classic neural voices
  { id: "en-GB-SoniaNeural", name: "Sonia", accent: "UK", gender: "Female" },
  { id: "en-GB-RyanNeural", name: "Ryan", accent: "UK", gender: "Male" },
  { id: "en-AU-NatashaNeural", name: "Natasha", accent: "AU", gender: "Female" },
  { id: "en-US-GuyNeural", name: "Guy", accent: "US", gender: "Male" },
  // Kokoro — runs locally on the server, ultra-realistic (slower to render)
  { id: "kokoro:af_heart", name: "Heart", accent: "US", gender: "Female", tag: "Ultra-real" },
  { id: "kokoro:am_michael", name: "Michael", accent: "US", gender: "Male", tag: "Ultra-real" },
  { id: "kokoro:bf_emma", name: "Emma B.", accent: "UK", gender: "Female", tag: "Ultra-real" },
  { id: "kokoro:af_bella", name: "Bella", accent: "US", gender: "Female", tag: "Ultra-real" },
];

const resolutions = [
  { value: "720p" as const, label: "720p", desc: "HD — Fast rendering", free: true },
  { value: "1080p" as const, label: "1080p", desc: "Full HD — Recommended", free: false },
  { value: "4k" as const, label: "4K", desc: "Ultra HD — Premium", free: false },
];

const musicTracks = [
  { id: "ambient", name: "Ambient" },
  { id: "corporate", name: "Corporate" },
  { id: "tech", name: "Tech" },
  { id: "calm", name: "Calm" },
  { id: "upbeat", name: "Upbeat" },
];

export default function StudioVoice() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projectId, voice, setVoice } = useStudioStore();
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useState(() => new Audio())[0];

  const isFreePlan = user?.plan === "free";

  const updateProject = trpc.studio.update.useMutation();
  const previewVoice = trpc.studio.previewVoice.useMutation();

  const handlePlayPreview = async (e: React.MouseEvent, voiceId: string) => {
    e.stopPropagation(); // prevent selecting the voice when clicking play
    
    if (playingId === voiceId) {
      audioRef.pause();
      setPlayingId(null);
      return;
    }

    if (previewLoadingId) return;

    audioRef.pause();
    setPreviewLoadingId(voiceId);

    try {
      const res = await previewVoice.mutateAsync({ voice: voiceId, speed: voice.speed });
      audioRef.src = res.audioData;
      audioRef.onended = () => setPlayingId(null);
      await audioRef.play();
      setPlayingId(voiceId);
    } catch (err) {
      console.error("Preview failed:", err);
    } finally {
      setPreviewLoadingId(null);
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
        musicEnabled: voice.musicEnabled ? 1 : 0,
        musicTrack: voice.musicEnabled ? voice.musicTrack : undefined,
        randomize: voice.randomize,
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
            <label className="font-body text-sm font-semibold mb-3 block text-[var(--sketch-fg)] flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-[#FBBF24]" />
              Narrator Voice
            </label>
            <div className="grid grid-cols-2 gap-3">
              {voices.map((v) => {
                const isActive = voice.voice === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => setVoice({ voice: v.id })}
                    className={`p-4 border-2 text-left transition-all ${
                      isActive
                        ? "border-[var(--sketch-border-color)] bg-[#FBBF24]/5 shadow-[4px_4px_0px_0px_#FBBF24]"
                        : "border-[var(--sketch-fg-subtle)] bg-[var(--sketch-card-bg)] hover:border-[var(--sketch-border-color)]/40"
                    }`}
                    style={{ borderRadius: isActive ? "255px 15px 225px 15px/15px 225px 15px 255px" : "12px" }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-body font-semibold text-sm text-[var(--sketch-fg)]">
                        {v.name}
                      </span>
                      <button 
                        onClick={(e) => handlePlayPreview(e, v.id)}
                        disabled={previewLoadingId !== null && previewLoadingId !== v.id}
                        className="text-xs text-[var(--sketch-fg-subtle)] hover:text-[var(--sketch-fg)] transition-colors disabled:opacity-50"
                      >
                        {previewLoadingId === v.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : playingId === v.id ? (
                          <Square className="w-3 h-3 fill-current" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 bg-[#FBBF24]/10 text-[var(--sketch-fg-muted)] sketch-border-sm">
                        {v.accent}
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 bg-[#FBBF24]/10 text-[var(--sketch-fg-muted)] sketch-border-sm">
                        {v.gender}
                      </span>
                      {v.tag && (
                        <span className="font-mono text-[10px] px-1.5 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 sketch-border-sm">
                          {v.tag}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ElevenLabs PRO Section */}
            <div className="mt-6 border-2 border-amber-500/20 bg-amber-500/5 p-4" style={{ borderRadius: "12px" }}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-body font-semibold text-sm flex items-center gap-2 text-[var(--sketch-fg)]">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  ElevenLabs Ultra-Real Voices
                </h4>
                {isFreePlan && (
                  <span className="font-mono text-[10px] bg-amber-500/20 text-amber-600 px-1.5 py-0.5 sketch-border-sm flex items-center gap-1">
                    <Lock className="w-3 h-3" /> PRO
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "elevenlabs:adam", name: "Adam", accent: "US", gender: "Male" },
                  { id: "elevenlabs:rachel", name: "Rachel", accent: "US", gender: "Female" }
                ].map((v) => {
                  const isActive = voice.voice === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => {
                        if (isFreePlan) {
                          toast.error("ElevenLabs voices are a Pro feature. Upgrade your plan to use them.");
                          return;
                        }
                        setVoice({ voice: v.id });
                      }}
                      className={`p-3 border-2 text-left transition-all relative ${
                        isActive
                          ? "border-amber-500 bg-amber-500/10 shadow-[2px_2px_0px_0px_#F59E0B]"
                          : isFreePlan
                            ? "border-[var(--sketch-fg-subtle)]/45 bg-[var(--sketch-card-bg)]/50 opacity-75 cursor-not-allowed"
                            : "border-[var(--sketch-fg-subtle)] bg-[var(--sketch-card-bg)] hover:border-amber-500/40"
                      }`}
                      style={{ borderRadius: "8px" }}
                    >
                      <span className="font-body font-semibold text-sm text-[var(--sketch-fg)]">
                        {v.name}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-700 sketch-border-sm">
                          {v.accent}
                        </span>
                        <span className="font-mono text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-700 sketch-border-sm">
                          {v.gender}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Speed */}
          <div className="border-t border-[var(--sketch-fg-subtle)] pt-6">
            <label className="font-body font-semibold text-lg mb-4 flex items-center gap-2 text-[var(--sketch-fg)]">
              <Gauge className="w-5 h-5 text-[#FBBF24]" />
              Speaking Speed: <span className="text-[#FBBF24]">{voice.speed.toFixed(2)}x</span>
            </label>
            <div className="sketch-card p-4 bg-[var(--sketch-card-bg)]">
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs text-[var(--sketch-fg-subtle)] w-10">
                  0.8x
                </span>
                <input
                  type="range"
                  min={0.8}
                  max={1.3}
                  step={0.05}
                  value={voice.speed}
                  onChange={(e) => setVoice({ speed: Number(e.target.value) })}
                  className="flex-1 h-2 bg-[var(--sketch-fg-subtle)] appearance-none cursor-pointer accent-[#FBBF24]"
                />
                <span className="font-mono text-xs text-[var(--sketch-fg-subtle)] w-10">
                  1.3x
                </span>
              </div>
            </div>
          </div>

          {/* Resolution */}
          <div className="border-t border-[var(--sketch-fg-subtle)] pt-6">
            <label className="font-body font-semibold text-lg mb-4 flex items-center gap-2 text-[var(--sketch-fg)]">
              <Monitor className="w-5 h-5 text-[#FBBF24]" />
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
                        ? "border-[var(--sketch-border-color)] bg-[#FBBF24]/5 shadow-[4px_4px_0px_0px_#FBBF24]"
                        : isLocked
                          ? "border-[var(--sketch-fg-subtle)]/45 bg-[var(--sketch-card-bg)]/50 opacity-75 cursor-not-allowed"
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

          {/* Background Music */}
          <div className="border-t border-[var(--sketch-fg-subtle)] pt-6">
            <h3 className="font-body font-semibold text-lg mb-4 flex items-center gap-2 text-[var(--sketch-fg)]">
              <Music className="w-5 h-5 text-[#FBBF24]" />
              Background Music
              {isFreePlan && (
                <span className="font-mono text-[10px] bg-[#FBBF24]/20 text-[#FBBF24] px-1.5 py-0.5 sketch-border-sm flex items-center gap-1">
                  <Lock className="w-3 h-3" /> PRO
                </span>
              )}
            </h3>
            <div className="sketch-card p-4 bg-[var(--sketch-card-bg)]">
              <div className="flex items-center justify-between mb-4">
                <span className="font-body text-sm text-[var(--sketch-fg)]">Enable background music</span>
                <button
                  onClick={() => {
                    if (isFreePlan) {
                      toast.error("Background music is a Pro feature. Upgrade your plan to enable it.");
                      return;
                    }
                    setVoice({ musicEnabled: !voice.musicEnabled });
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    voice.musicEnabled ? "bg-[#FBBF24]" : "bg-[var(--sketch-fg-subtle)]"
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-[var(--sketch-card-bg)] border-2 border-[var(--sketch-border-color)] rounded-full absolute top-0.5 transition-transform ${
                      voice.musicEnabled ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
              {voice.musicEnabled && !isFreePlan && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-2"
                >
                  {musicTracks.map((track) => (
                    <button
                      key={track.id}
                      onClick={() => setVoice({ musicTrack: track.id })}
                      className={`w-full p-3 border-2 text-left transition-all ${
                        voice.musicTrack === track.id
                          ? "border-[var(--sketch-border-color)] bg-[#FBBF24]/5"
                          : "border-[var(--sketch-fg-subtle)] hover:border-[var(--sketch-border-color)]/40"
                      }`}
                      style={{ borderRadius: voice.musicTrack === track.id ? "255px 15px 225px 15px/15px 225px 15px 255px" : "8px" }}
                    >
                      <span className="font-body text-sm text-[var(--sketch-fg)]">{track.name}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
          </div>

          <div className="border-t border-[var(--sketch-fg-subtle)] pt-6">
            <h3 className="font-body font-semibold text-lg mb-4 flex items-center gap-2 text-[var(--sketch-fg)]">
              <Sparkles className="w-5 h-5 text-[#FBBF24]" />
              Randomize Generation
            </h3>
            <div className="sketch-card p-4 bg-[var(--sketch-card-bg)]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-body text-sm font-semibold text-[var(--sketch-fg)] block">Enable Randomization</span>
                  <span className="font-body text-xs text-[var(--sketch-fg-muted)]">Randomizes media selection for a truly unique video. Best for YouTube.</span>
                </div>
                <button
                  onClick={() => setVoice({ randomize: !voice.randomize })}
                  className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                    voice.randomize ? "bg-[#FBBF24]" : "bg-[var(--sketch-fg-subtle)]"
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-[var(--sketch-card-bg)] border-2 border-[var(--sketch-border-color)] rounded-full absolute top-0.5 transition-transform ${
                      voice.randomize ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
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
                <Zap className="w-4 h-4" />
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
