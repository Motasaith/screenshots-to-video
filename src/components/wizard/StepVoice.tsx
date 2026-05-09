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
  { id: "en-US-AriaNeural", name: "Aria", accent: "US", gender: "Female" },
  { id: "en-GB-SoniaNeural", name: "Sonia", accent: "UK", gender: "Female" },
  { id: "en-US-GuyNeural", name: "Guy", accent: "US", gender: "Male" },
  { id: "en-GB-RyanNeural", name: "Ryan", accent: "UK", gender: "Male" },
  { id: "en-US-JennyNeural", name: "Jenny", accent: "US", gender: "Female" },
  { id: "en-AU-NatashaNeural", name: "Natasha", accent: "AU", gender: "Female" },
];

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

  const [selectedVoice, setSelectedVoice] = useState("en-US-AriaNeural");
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
        <span className="font-mono text-xs text-primary uppercase tracking-widest">
          Step 5 of 7
        </span>
        <h2 className="font-syne font-bold text-3xl mt-2 tracking-tight">
          Choose your voice and style
        </h2>
        <p className="font-dm text-muted-foreground mt-2">
          Select a voice, set the speed, and configure video options.
        </p>

        <div className="mt-8 space-y-8">
          <div>
            <h3 className="font-syne font-semibold text-lg mb-4 flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-primary" />
              Voice
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {voices.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice.id)}
                  className={`p-4 border-2 text-left transition-all ${
                    selectedVoice === voice.id
                      ? "border-primary bg-primary/5 shadow-[4px_4px_0px_0px_hsl(var(--primary))]"
                      : "border-border bg-card hover:border-foreground/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-dm font-semibold text-sm">
                      {voice.name}
                    </span>
                    <button 
                      onClick={(e) => handlePlayPreview(e, voice.id)}
                      disabled={previewLoadingId !== null && previewLoadingId !== voice.id}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
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
                    <span className="font-mono text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground">
                      {voice.accent}
                    </span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground">
                      {voice.gender}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <h3 className="font-syne font-semibold text-lg mb-4 flex items-center gap-2">
              <Gauge className="w-5 h-5 text-primary" />
              Speaking Speed
            </h3>
            <div className="neo-card p-4">
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs text-muted-foreground w-10">
                  0.8x
                </span>
                <input
                  type="range"
                  min={0.8}
                  max={1.3}
                  step={0.05}
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="flex-1 h-2 bg-muted appearance-none cursor-pointer accent-primary"
                />
                <span className="font-mono text-xs text-muted-foreground w-10">
                  1.3x
                </span>
              </div>
              <div className="text-center mt-2">
                <span className="font-syne font-bold text-2xl text-primary">
                  {speed.toFixed(2)}x
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <h3 className="font-syne font-semibold text-lg mb-4 flex items-center gap-2">
              <Monitor className="w-5 h-5 text-primary" />
              Resolution
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {(["720p", "1080p", "4k"] as const).map((res) => (
                <button
                  key={res}
                  onClick={() => setResolution(res)}
                  className={`p-4 border-2 text-center transition-all ${
                    resolution === res
                      ? "border-primary bg-primary/5 shadow-[4px_4px_0px_0px_hsl(var(--primary))]"
                      : "border-border bg-card hover:border-foreground/30"
                  }`}
                >
                  <span className="font-syne font-bold text-lg">{res}</span>
                  {res === "4k" && (
                    <span className="block font-mono text-[10px] text-primary mt-1">
                      PRO
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <h3 className="font-syne font-semibold text-lg mb-4 flex items-center gap-2">
              <Music className="w-5 h-5 text-primary" />
              Background Music
            </h3>
            <div className="neo-card p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="font-dm text-sm">Enable background music</span>
                <button
                  onClick={() => setMusicEnabled(!musicEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    musicEnabled ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
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
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-foreground/30"
                      }`}
                    >
                      <span className="font-dm text-sm">{track.name}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
          </div>

          <Button
            onClick={handleContinue}
            disabled={updateProject.isPending}
            className="neo-btn-primary w-full"
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
