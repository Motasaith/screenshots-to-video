import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square, Trash2, Upload, Volume2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Use your own voice for a scene instead of a synthesised one.
 *
 * Two ways in, one code path: record here with the microphone, or upload a file you
 * already have. Both post to `/api/voiceover`, which validates that the thing really
 * is audio, transcodes it to the format the render pipeline concatenates, and
 * measures the real duration.
 *
 * The duration matters beyond bookkeeping: scene length is the longer of the
 * narration and the camera choreography, so a 30 second recording lengthens the
 * scene. Showing it here is how somebody sees that before they render.
 */

export interface OwnVoiceState {
  /** "upload" once a recording is attached, "tts" while the voice is generated. */
  audioSource: "tts" | "upload";
  audioDuration: number | null;
}

export default function OwnVoiceRecorder({
  stepId,
  sceneNumber,
  state,
  onChanged,
}: {
  stepId: number;
  sceneNumber: number;
  state: OwnVoiceState;
  /** Called after the scene's audio changes, so the editor can refetch. */
  onChanged: () => void | Promise<void>;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Release the microphone whatever happens, including an unmount mid-recording. */
  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
  };

  useEffect(() => stopTracks, []);

  const send = async (blob: Blob, filename: string) => {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", blob, filename);
      form.append("stepId", String(stepId));

      const res = await fetch("/api/voiceover", { method: "POST", body: form });
      const data = (await res.json()) as { duration?: number; error?: string };

      if (!res.ok) throw new Error(data.error || "That upload was refused.");

      toast.success(
        `Your recording is on scene ${sceneNumber} (${(data.duration ?? 0).toFixed(1)}s).`
      );
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not attach that recording.");
    } finally {
      setBusy(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      // Let the browser choose the container. Chrome gives webm, Safari mp4, and the
      // server transcodes either, so there is nothing to negotiate here.
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stopTracks();
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const ext = (recorder.mimeType || "").includes("mp4") ? "m4a" : "webm";
        if (blob.size < 1024) {
          toast.error("That recording is empty. Check your microphone and try again.");
          return;
        }
        await send(blob, `scene-${sceneNumber}-recording.${ext}`);
      };

      recorder.start();
      setRecording(true);
      setElapsed(0);
      tickRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch {
      // Almost always a denied permission prompt, which is worth naming.
      toast.error("No access to the microphone. Allow it in your browser, then try again.");
      stopTracks();
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
  };

  const clearRecording = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/voiceover", {
        method: "POST",
        body: (() => {
          const form = new FormData();
          form.append("stepId", String(stepId));
          form.append("clear", "1");
          return form;
        })(),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not remove it.");
      toast.success("Back to the generated voice for this scene.");
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove it.");
    } finally {
      setBusy(false);
    }
  };

  const attached = state.audioSource === "upload";

  return (
    <div className="p-3 rounded-xl border border-[var(--sketch-border-color)]/20 bg-[var(--sketch-card-bg)]/50">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold text-[var(--sketch-fg-muted)]">
          Your own voice
        </span>
        {attached ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/15 px-2 py-0.5 text-[10px] font-bold text-teal-700">
            <Volume2 className="w-3 h-3" />
            {state.audioDuration ? `${state.audioDuration.toFixed(1)}s attached` : "attached"}
          </span>
        ) : null}
      </div>

      <p className="mb-2 text-[11px] leading-relaxed text-[var(--sketch-fg-muted)]">
        {attached
          ? "This scene uses your recording. Rendering will not replace it with a generated voice."
          : "Record here or upload a file to use instead of the generated voice, for this scene only."}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {recording ? (
          <button
            onClick={stopRecording}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-red-600"
          >
            <Square className="w-3 h-3" />
            Stop ({elapsed}s)
          </button>
        ) : (
          <button
            onClick={() => void startRecording()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--sketch-border-color)]/30 px-3 py-1.5 text-[11px] font-bold text-[var(--sketch-fg)] hover:border-teal-500/50 disabled:opacity-50"
          >
            <Mic className="w-3 h-3" />
            Record
          </button>
        )}

        <label
          className={`inline-flex items-center gap-1.5 rounded-lg border border-[var(--sketch-border-color)]/30 px-3 py-1.5 text-[11px] font-bold text-[var(--sketch-fg)] hover:border-teal-500/50 ${
            busy || recording ? "opacity-50 pointer-events-none" : "cursor-pointer"
          }`}
        >
          <Upload className="w-3 h-3" />
          Upload
          <input
            type="file"
            accept="audio/*,.mp3,.wav,.m4a"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void send(file, file.name);
            }}
          />
        </label>

        {attached ? (
          <button
            onClick={() => void clearRecording()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium text-[var(--sketch-fg-muted)] hover:text-red-600 disabled:opacity-50"
          >
            <Trash2 className="w-3 h-3" />
            Use the generated voice
          </button>
        ) : null}

        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--sketch-fg-muted)]" /> : null}
      </div>

      {recording ? (
        <p className="mt-2 text-[10.5px] text-red-600">
          Recording. Read this scene's script, then press stop.
        </p>
      ) : null}
    </div>
  );
}
