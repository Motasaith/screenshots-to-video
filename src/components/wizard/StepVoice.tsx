import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Music,
  Gauge,
  Monitor,
  Play,
  Zap,
  Volume2,
  Loader2,
  Square
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
] as Array<{ id: string; name: string; accent: string; gender: string; tag?: string }>;

const musicTracks = [
  { id: "ambient", name: "Ambient" },
  { id: "corporate", name: "Corporate" },
  { id: "tech", name: "Tech" },
  { id: "calm", name: "Calm" },
  { id: "upbeat", name: "Upbeat" },
];

export default function StepVoice() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const projectIdNum = Number(projectId) || 0;

  const [selectedVoice, setSelectedVoice] = useState("en-US-AndrewMultilingualNeural");
  const [speed, setSpeed] = useState(1.0);
  const [resolution, setResolution] = useState<"720p" | "1080p" | "4k">("1080p");
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState("ambient");
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useState(() => new Audio())[0];

  const updateProject = trpc.project.update.useMutation();
  const previewVoice = trpc.ai.previewVoice.useMutation();

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
      const res = await previewVoice.mutateAsync({ voice: voiceId, speed });
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
    await updateProject.mutateAsync({
      id: projectIdNum,
      voice: selectedVoice,
      speed,
      resolution,
      musicEnabled: musicEnabled ? 1 : 0,
      musicTrack: musicEnabled ? selectedTrack : undefined,
    });
    navigate(`/create/${projectIdNum}/render`);
  };

  return (
    <div className="max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="relative">
          <span className="font-mono text-xs text-[var(--sketch-fg-muted)] uppercase tracking-widest bg-[#FBBF24]/20 px-2 py-1 sketch-border-sm inline-block">
            Step 5 of 7
          </span>
          <span className="font-hand text-lg text-[var(--sketch-fg-muted)] absolute -top-6 left-32 rotate-[-2deg] animate-float hidden sm:block">
            Pick your voice! 🎙️
          </span>
        </div>
        <h2 className="font-body font-bold text-3xl mt-3 tracking-tight text-[var(--sketch-fg)]">
          Choose your voice and style
        </h2>
        <p className="font-body text-[var(--sketch-fg-muted)] mt-2">
          Select a voice, set the speed, and configure video options.
        </p>

        <div className="mt-8 space-y-8">
          <div>
            <h3 className="font-body font-semibold text-lg mb-4 flex items-center gap-2 text-[var(--sketch-fg)]">
              <Volume2 className="w-5 h-5 text-[#FBBF24]" />
              Voice
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {voices.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice.id)}
                  className={`p-4 border-2 text-left transition-all ${
                    selectedVoice === voice.id
                      ? "border-[var(--sketch-border-color)] bg-[#FBBF24]/5 shadow-[4px_4px_0px_0px_#FBBF24]"
                      : "border-[var(--sketch-fg-subtle)] bg-[var(--sketch-card-bg)] hover:border-[var(--sketch-border-color)]/40"
                  }`}
                  style={{ borderRadius: selectedVoice === voice.id ? "255px 15px 225px 15px/15px 225px 15px 255px" : "12px" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-body font-semibold text-sm text-[var(--sketch-fg)]">
                      {voice.name}
                    </span>
                    <button 
                      onClick={(e) => handlePlayPreview(e, voice.id)}
                      disabled={previewLoadingId !== null && previewLoadingId !== voice.id}
                      className="text-xs text-[var(--sketch-fg-subtle)] hover:text-[var(--sketch-fg)] transition-colors disabled:opacity-50"
                    >
                      {previewLoadingId === voice.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : playingId === voice.id ? (
                        <Square className="w-3 h-3 fill-current" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 bg-[#FBBF24]/10 text-[var(--sketch-fg-muted)] sketch-border-sm">
                      {voice.accent}
                    </span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 bg-[#FBBF24]/10 text-[var(--sketch-fg-muted)] sketch-border-sm">
                      {voice.gender}
                    </span>
                    {voice.tag && (
                      <span className="font-mono text-[10px] px-1.5 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 sketch-border-sm">
                        {voice.tag}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-[var(--sketch-fg-subtle)] pt-6">
            <h3 className="font-body font-semibold text-lg mb-4 flex items-center gap-2 text-[var(--sketch-fg)]">
              <Gauge className="w-5 h-5 text-[#FBBF24]" />
              Speaking Speed
            </h3>
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
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="flex-1 h-2 bg-[var(--sketch-fg-subtle)] appearance-none cursor-pointer accent-[#FBBF24]"
                />
                <span className="font-mono text-xs text-[var(--sketch-fg-subtle)] w-10">
                  1.3x
                </span>
              </div>
              <div className="text-center mt-2">
                <span className="font-body font-bold text-2xl text-[var(--sketch-fg)]">
                  {speed.toFixed(2)}x
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--sketch-fg-subtle)] pt-6">
            <h3 className="font-body font-semibold text-lg mb-4 flex items-center gap-2 text-[var(--sketch-fg)]">
              <Monitor className="w-5 h-5 text-[#FBBF24]" />
              Resolution
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {(["720p", "1080p", "4k"] as const).map((res) => (
                <button
                  key={res}
                  onClick={() => setResolution(res)}
                  className={`p-4 border-2 text-center transition-all ${
                    resolution === res
                      ? "border-[var(--sketch-border-color)] bg-[#FBBF24]/5 shadow-[4px_4px_0px_0px_#FBBF24]"
                      : "border-[var(--sketch-fg-subtle)] bg-[var(--sketch-card-bg)] hover:border-[var(--sketch-border-color)]/40"
                  }`}
                  style={{ borderRadius: resolution === res ? "255px 15px 225px 15px/15px 225px 15px 255px" : "12px" }}
                >
                  <span className="font-body font-bold text-lg text-[var(--sketch-fg)]">{res}</span>
                  {res === "4k" && (
                    <span className="block font-mono text-[10px] text-[#FBBF24] mt-1">
                      PRO
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-[var(--sketch-fg-subtle)] pt-6">
            <h3 className="font-body font-semibold text-lg mb-4 flex items-center gap-2 text-[var(--sketch-fg)]">
              <Music className="w-5 h-5 text-[#FBBF24]" />
              Background Music
            </h3>
            <div className="sketch-card p-4 bg-[var(--sketch-card-bg)]">
              <div className="flex items-center justify-between mb-4">
                <span className="font-body text-sm text-[var(--sketch-fg)]">Enable background music</span>
                <button
                  onClick={() => setMusicEnabled(!musicEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    musicEnabled ? "bg-[#FBBF24]" : "bg-[var(--sketch-fg-subtle)]"
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-[var(--sketch-card-bg)] border-2 border-[var(--sketch-border-color)] rounded-full absolute top-0.5 transition-transform ${
                      musicEnabled ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
              {musicEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-2"
                >
                  {musicTracks.map((track) => (
                    <button
                      key={track.id}
                      onClick={() => setSelectedTrack(track.id)}
                      className={`w-full p-3 border-2 text-left transition-all ${
                        selectedTrack === track.id
                          ? "border-[var(--sketch-border-color)] bg-[#FBBF24]/5"
                          : "border-[var(--sketch-fg-subtle)] hover:border-[var(--sketch-border-color)]/40"
                      }`}
                      style={{ borderRadius: selectedTrack === track.id ? "255px 15px 225px 15px/15px 225px 15px 255px" : "8px" }}
                    >
                      <span className="font-body text-sm text-[var(--sketch-fg)]">{track.name}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
          </div>

          <Button
            onClick={handleContinue}
            disabled={updateProject.isPending}
            className="sketch-btn-primary w-full"
          >
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Start Rendering
              <ChevronRight className="w-4 h-4" />
            </span>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
