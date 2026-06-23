import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { motion } from "framer-motion";
import {
  ChevronRight,
  ChevronLeft,
  Music,
  Gauge,
  Monitor,
  Play,
  Zap,
  Volume2,
  Loader2,
  Square,
  Lock,
  Sparkles,
  Crown,
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
] as Array<{ id: string; name: string; accent: string; gender: string; tag?: string }>;

// ── ElevenLabs premium voices (22 available on the free API tier) ──
const elevenLabsVoices = [
  { id: "elevenlabs:pNInz6obpgDQGcFmaJgB", name: "Adam", accent: "US", gender: "Male", desc: "Dominant, Firm" },
  { id: "elevenlabs:EXAVITQu4vr4xnSDxMaL", name: "Sarah", accent: "US", gender: "Female", desc: "Mature, Confident" },
  { id: "elevenlabs:TX3LPaxmHKxFdv7VOQHJ", name: "Liam", accent: "US", gender: "Male", desc: "Energetic Creator" },
  { id: "elevenlabs:cgSgspJ2msm6clMCkdW9", name: "Jessica", accent: "US", gender: "Female", desc: "Playful, Warm" },
  { id: "elevenlabs:cjVigY5qzO86Huf0OWal", name: "Eric", accent: "US", gender: "Male", desc: "Smooth, Trustworthy" },
  { id: "elevenlabs:hpp4J3VqNfWAUOO0d1Us", name: "Bella", accent: "US", gender: "Female", desc: "Professional, Bright" },
  { id: "elevenlabs:iP95p4xoKVk53GoZ742B", name: "Chris", accent: "US", gender: "Male", desc: "Charming, Down-to-Earth" },
  { id: "elevenlabs:nPczCjzI2devNBz1zQrb", name: "Brian", accent: "US", gender: "Male", desc: "Deep, Resonant" },
  { id: "elevenlabs:onwK4e9ZLuTAKqWW03F9", name: "Daniel", accent: "US", gender: "Male", desc: "Steady Broadcaster" },
  { id: "elevenlabs:pFZP5JQG7iQjIQuC4Bku", name: "Lily", accent: "US", gender: "Female", desc: "Velvety Actress" },
  { id: "elevenlabs:pqHfZKP75CvOlQylNhV4", name: "Bill", accent: "US", gender: "Male", desc: "Wise, Mature" },
  { id: "elevenlabs:Xb7hH8MSUJpSbSDYk0k2", name: "Alice", accent: "US", gender: "Female", desc: "Clear Educator" },
  { id: "elevenlabs:JBFqnCBsd6RMkjVDRZzb", name: "George", accent: "US", gender: "Male", desc: "Warm Storyteller" },
  { id: "elevenlabs:XrExE9yKIg1WjnnlVkGX", name: "Matilda", accent: "US", gender: "Female", desc: "Professional" },
  { id: "elevenlabs:bIHbv24MWmeRgasZH58o", name: "Will", accent: "US", gender: "Male", desc: "Relaxed Optimist" },
  { id: "elevenlabs:FGY2WhTYpPnrIDTdsKH5", name: "Laura", accent: "US", gender: "Female", desc: "Quirky Attitude" },
  { id: "elevenlabs:CwhRBWXzGAHq8TQ4Fs17", name: "Roger", accent: "US", gender: "Male", desc: "Laid-Back, Casual" },
  { id: "elevenlabs:SOYHLrjzK2X1ezoPC6cr", name: "Harry", accent: "US", gender: "Male", desc: "Fierce Warrior" },
  { id: "elevenlabs:IKne3meq5aSn9XLyUdCD", name: "Charlie", accent: "US", gender: "Male", desc: "Deep, Energetic" },
  { id: "elevenlabs:N2lVS1w4EtoT3dr4eOWO", name: "Callum", accent: "US", gender: "Male", desc: "Husky Trickster" },
  { id: "elevenlabs:SAz9YHcvj6GT2YYXdXww", name: "River", accent: "US", gender: "Neutral", desc: "Relaxed, Neutral" },
  { id: "elevenlabs:bvB801cu7ca8Klk5nO4O", name: "Haseeb", accent: "UK", gender: "Male", desc: "British Documentary" },
] as Array<{ id: string; name: string; accent: string; gender: string; desc: string }>;

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
  const { user } = useAuth();
  const projectIdNum = Number(projectId) || 0;

  const isFreePlan = user?.plan === "free";

  const [selectedVoice, setSelectedVoice] = useState("en-US-AndrewMultilingualNeural");
  const [speed, setSpeed] = useState(1.0);
  const [resolution, setResolution] = useState<"720p" | "1080p" | "4k">("1080p");
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState("ambient");
  const [randomize, setRandomize] = useState(false);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useState(() => new Audio())[0];

  const updateProject = trpc.project.update.useMutation();
  const previewVoice = trpc.ai.previewVoice.useMutation();

  // ── ElevenLabs credits (shared free API key) ──
  const credits = trpc.ai.elevenLabsCredits.useQuery(undefined, {
    refetchInterval: 30_000, // refresh every 30s
  });
  const elevenLabsRemaining = credits.data?.remaining ?? null;
  const elevenLabsLimit = credits.data?.limit ?? null;
  const elevenLabsAvailable = elevenLabsRemaining !== null && elevenLabsRemaining > 0;

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
      randomize: randomize,
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
          <div id="voice-standard" className="scroll-mt-6">
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

            {/* ElevenLabs Premium Voices Section */}
            <div id="voice-elevenlabs" className="mt-6 border-2 border-amber-500/20 bg-amber-500/5 p-4 scroll-mt-6" style={{ borderRadius: "12px" }}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-body font-semibold text-sm flex items-center gap-2 text-[var(--sketch-fg)]">
                  <Crown className="w-4 h-4 text-amber-500" />
                  ElevenLabs Premium Voices
                </h4>
                {/* Credits display */}
                {elevenLabsRemaining !== null && (
                  <span className={`font-mono text-[10px] px-2 py-0.5 sketch-border-sm flex items-center gap-1 ${
                    elevenLabsAvailable
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "bg-red-500/15 text-red-600 dark:text-red-400"
                  }`}>
                    {elevenLabsAvailable ? (
                      <>
                        {elevenLabsRemaining.toLocaleString()} / {elevenLabsLimit?.toLocaleString()} chars left
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3" /> No credits left
                      </>
                    )}
                  </span>
                )}
              </div>

              {!elevenLabsAvailable && (
                <p className="font-body text-xs text-amber-600 dark:text-amber-400 mb-3">
                  Monthly ElevenLabs credits are used up. Voices will fall back to Edge TTS. Credits reset monthly.
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {elevenLabsVoices.map((voice) => {
                  const isSelected = selectedVoice === voice.id;
                  return (
                    <button
                      key={voice.id}
                      onClick={() => {
                        if (!elevenLabsAvailable) {
                          toast.error("ElevenLabs monthly credits are used up. Please use the free voices above.");
                          return;
                        }
                        setSelectedVoice(voice.id);
                      }}
                      className={`p-3 border-2 text-left transition-all relative ${
                        isSelected
                          ? "border-amber-500 bg-amber-500/10 shadow-[2px_2px_0px_0px_#F59E0B]"
                          : elevenLabsAvailable
                            ? "border-[var(--sketch-fg-subtle)] bg-[var(--sketch-card-bg)] hover:border-amber-500/40"
                            : "border-[var(--sketch-fg-subtle)]/45 bg-[var(--sketch-card-bg)]/50 opacity-60 cursor-not-allowed"
                      }`}
                      style={{ borderRadius: "8px" }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-body font-semibold text-sm text-[var(--sketch-fg)]">
                          {voice.name}
                        </span>
                        <button
                          onClick={(e) => handlePlayPreview(e, voice.id)}
                          disabled={(previewLoadingId !== null && previewLoadingId !== voice.id) || !elevenLabsAvailable}
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
                      <span className="font-body text-[10px] text-[var(--sketch-fg-muted)] block mt-0.5 truncate">
                        {voice.desc}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="font-mono text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-700 sketch-border-sm">
                          {voice.accent}
                        </span>
                        <span className="font-mono text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-700 sketch-border-sm">
                          {voice.gender}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div id="voice-speed" className="border-t border-[var(--sketch-fg-subtle)] pt-6 scroll-mt-6">
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

          <div id="voice-resolution" className="border-t border-[var(--sketch-fg-subtle)] pt-6 scroll-mt-6">
            <h3 className="font-body font-semibold text-lg mb-4 flex items-center gap-2 text-[var(--sketch-fg)]">
              <Monitor className="w-5 h-5 text-[#FBBF24]" />
              Resolution
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {(["720p", "1080p", "4k"] as const).map((res) => {
                const isActive = resolution === res;
                const isLocked = isFreePlan && (res === "1080p" || res === "4k");

                return (
                  <button
                    key={res}
                    onClick={() => {
                      if (isLocked) {
                        toast.error(`${res} is a Pro feature. Upgrade your plan to unlock high resolution rendering.`);
                        return;
                      }
                      setResolution(res);
                    }}
                    className={`p-4 border-2 text-center transition-all relative ${
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
                    <span className="font-body font-bold text-lg text-[var(--sketch-fg)]">{res}</span>
                    {res === "4k" && !isLocked && (
                      <span className="block font-mono text-[10px] text-[#FBBF24] mt-1">
                        PRO
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div id="voice-music" className="border-t border-[var(--sketch-fg-subtle)] pt-6 scroll-mt-6">
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
                    setMusicEnabled(!musicEnabled);
                  }}
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

          <div id="voice-randomize" className="border-t border-[var(--sketch-fg-subtle)] pt-6 scroll-mt-6">
            <h3 className="font-body font-semibold text-lg mb-4 flex items-center gap-2 text-[var(--sketch-fg)]">
              <Sparkles className="w-5 h-5 text-[#FBBF24]" />
              Randomize Generation
            </h3>
            <div className="sketch-card p-4 bg-[var(--sketch-card-bg)]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-body text-sm font-semibold text-[var(--sketch-fg)] block">Enable Randomization</span>
                  <span className="font-body text-xs text-[var(--sketch-fg-muted)]">Randomizes zooms and camera movements for a truly unique video. Best for YouTube.</span>
                </div>
                <button
                  onClick={() => setRandomize(!randomize)}
                  className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                    randomize ? "bg-[#FBBF24]" : "bg-[var(--sketch-fg-subtle)]"
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-[var(--sketch-card-bg)] border-2 border-[var(--sketch-border-color)] rounded-full absolute top-0.5 transition-transform ${
                      randomize ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              variant="ghost"
              type="button"
              onClick={() => navigate(`/create/${projectIdNum}/preview`)}
              className="sketch-btn-ghost flex-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
            <Button
              onClick={handleContinue}
              disabled={updateProject.isPending}
              className="sketch-btn-primary flex-[2]"
            >
              <span className="flex items-center gap-2 justify-center">
                <Zap className="w-4 h-4" />
                Start Rendering
                <ChevronRight className="w-4 h-4" />
              </span>
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
