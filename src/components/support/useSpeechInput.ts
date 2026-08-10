import { useCallback, useEffect, useRef, useState } from "react";
import { trpc } from "@/providers/trpc";

/**
 * Speech input, with two engines behind one interface.
 *
 * 1. The browser's own SpeechRecognition where it exists (Chrome, Edge, Safari).
 *    Free, needs no server, and streams a live transcript while you talk, which
 *    is what makes dictation feel immediate rather than like submitting a form.
 *
 * 2. MediaRecorder plus server-side whisper.cpp everywhere else, mainly Firefox.
 *    One transcript at the end instead of live text, and it only works if the
 *    server has a whisper binary configured.
 *
 * Both produce a recorded blob when asked, because a voice note needs audio to
 * play back later, not just its transcript. The browser engine gives a live
 * transcript for free, so where both are available we record for playback and
 * transcribe locally, and never upload the audio at all.
 */

/* SpeechRecognition is not in the DOM lib types. Only what is used is declared. */
interface SpeechRecognitionAlternative {
  transcript: string;
}
interface SpeechRecognitionResult {
  readonly length: number;
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type SpeechEngine = "browser" | "server" | "none";

export interface SpeechRecording {
  /** Final transcript. Empty if nothing intelligible was heard. */
  text: string;
  /** The recording itself, for playing the note back. */
  blob: Blob | null;
  durationMs: number;
  /**
   * Why the transcript is empty, when it is.
   *
   * Returned rather than only held in state, because the caller reads it
   * immediately after awaiting `stop()` and React state set during that call is
   * not visible in the closure it is already inside. That is why a specific
   * reason could be set and the user still saw the generic message.
   */
  reason?: string | null;
}

export function useSpeechInput(opts?: { serverFallbackAvailable?: boolean }) {
  const transcribe = trpc.support.transcribe.useMutation();

  const [engine] = useState<SpeechEngine>(() => {
    if (typeof window === "undefined") return "none";
    if (getRecognitionCtor()) return "browser";
    const canRecord =
      typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
    return canRecord ? "server" : "none";
  });

  const [isRecording, setIsRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  /** Peak levels for the waveform, so the UI can show that it is hearing you. */
  const [levels, setLevels] = useState<number[]>([]);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTextRef = useRef("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  /** True while the user still wants to be heard, so `onend` may restart. */
  const wantsRecognitionRef = useRef(false);
  /** Last recognition error code, so a failure can name its reason. */
  const recognitionErrorRef = useRef<string | null>(null);
  const resolveRef = useRef<((r: SpeechRecording) => void) | null>(null);

  const teardown = useCallback(() => {
    wantsRecognitionRef.current = false;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    // Releases the microphone, which is what turns off the browser's recording
    // indicator. Leaving tracks live looks like the page is still listening.
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recognitionRef.current = null;
    recorderRef.current = null;
  }, []);

  useEffect(() => teardown, [teardown]);

  /** Drives the little level meter while recording. */
  const meter = useCallback((stream: MediaStream) => {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    audioCtxRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128) / 128);
      // Capped so one loud syllable does not flatten the rest of the bars.
      setLevels((prev) => [...prev.slice(-47), Math.min(1, peak * 1.8)]);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setInterim("");
    setLevels([]);
    finalTextRef.current = "";
    recognitionErrorRef.current = null;
    chunksRef.current = [];
    startedAtRef.current = Date.now();

    if (engine === "none") {
      setError("This browser cannot record audio. Please type your message.");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        // These three are what make a laptop mic in a room usable rather than
        // muddy, and they are handled by the browser at no cost to us.
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      setError("Microphone access was blocked. Allow it in your browser, or type instead.");
      return;
    }
    streamRef.current = stream;
    meter(stream);

    // Always record, even when the browser transcribes, so the note is playable.
    try {
      const mime = pickRecordingMimeType();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.start(250);
      recorderRef.current = rec;
    } catch {
      // Recording is a nice-to-have next to the transcript; carry on without it.
      recorderRef.current = null;
    }

    if (engine === "browser") {
      const Ctor = getRecognitionCtor()!;
      const recognition = new Ctor();
      recognition.lang = navigator.language || "en-US";
      // Keep listening through natural pauses instead of stopping at the first
      // one, which is what makes a spoken sentence survive a breath.
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        let live = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0]?.transcript ?? "";
          if (result.isFinal) finalTextRef.current += text;
          else live += text;
        }
        setInterim(live);
      };
      recognition.onerror = (e) => {
        const code = (e as { error?: string }).error ?? "unknown";
        // `network` matters most and was previously ignored: Chrome speech
        // recognition is not on-device, it posts audio to Google and gets text
        // back. Behind a firewall, offline, or with a privacy extension
        // blocking it, you get this code and no transcript, while the level
        // meter still moves because it reads our own stream. Silence here is
        // what produced a bare "I did not catch that".
        recognitionErrorRef.current = code;
        setError(describeRecognitionError(code));
      };
      // Chrome ends a session after a pause even with `continuous = true`, and
      // nothing was restarting it, so anything said after the first silence was
      // lost. Restart while the user still wants to be heard.
      recognition.onend = () => {
        if (!wantsRecognitionRef.current) return;
        try {
          recognition.start();
        } catch {
          /* already restarting; the next onend tries again */
        }
      };

      recognitionRef.current = recognition;
      wantsRecognitionRef.current = true;
      recognition.start();
    }

    setIsRecording(true);
  }, [engine, meter]);

  /** Stops recording and resolves with the transcript and the audio. */
  const stop = useCallback(async (): Promise<SpeechRecording> => {
    const durationMs = Date.now() - startedAtRef.current;

    const blob = await new Promise<Blob | null>((resolve) => {
      const rec = recorderRef.current;
      if (!rec || rec.state === "inactive") return resolve(null);
      rec.onstop = () => {
        resolve(chunksRef.current.length ? new Blob(chunksRef.current, { type: rec.mimeType }) : null);
      };
      rec.stop();
    });

    let text = "";

    if (engine === "browser") {
      const recognition = recognitionRef.current;
      if (recognition) {
        // Clear the restart flag first, or the handler above brings the session
        // straight back up and this never resolves.
        wantsRecognitionRef.current = false;
        // The last final result lands just before `onend`, so waiting for it
        // avoids dropping the tail of the sentence.
        await new Promise<void>((resolve) => {
          const done = () => resolve();
          recognition.onend = done;
          try {
            recognition.stop();
          } catch {
            done();
          }
          setTimeout(done, 1200);
        });
      }
      text = (finalTextRef.current + " " + interim).replace(/\s+/g, " ").trim();

      // The browser heard nothing, but the audio was recorded anyway. Rather
      // than making someone repeat themselves, hand the recording to the server
      // if it can transcribe. This is the path that rescues a blocked or
      // offline Web Speech call.
      if (!text && blob && opts?.serverFallbackAvailable) {
        try {
          const base64 = await blobToBase64(blob);
          const res = await transcribe.mutateAsync({ audio: base64, mimeType: blob.type });
          if (res.text) {
            text = res.text;
            setError(null);
            recognitionErrorRef.current = null;
          }
        } catch {
          /* keep whatever the recognition error said */
        }
      }
    } else if (engine === "server" && blob) {
      if (!opts?.serverFallbackAvailable) {
        setError("This browser needs server transcription, which is not set up. Please type instead.");
      } else {
        try {
          const base64 = await blobToBase64(blob);
          const res = await transcribe.mutateAsync({ audio: base64, mimeType: blob.type });
          text = res.text;
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not transcribe that.");
        }
      }
    }

    setIsRecording(false);
    setInterim("");
    teardown();

    const result: SpeechRecording = {
      text,
      blob,
      durationMs,
      reason: text ? null : describeRecognitionError(recognitionErrorRef.current),
    };
    resolveRef.current?.(result);
    return result;
  }, [engine, interim, opts?.serverFallbackAvailable, teardown, transcribe]);

  const cancel = useCallback(() => {
    wantsRecognitionRef.current = false;
    try {
      recognitionRef.current?.abort();
    } catch {
      /* already stopped */
    }
    try {
      if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
    } catch {
      /* already stopped */
    }
    setIsRecording(false);
    setInterim("");
    setLevels([]);
    teardown();
  }, [teardown]);

  return {
    engine,
    isRecording,
    /** Live partial transcript. Only ever populated by the browser engine. */
    interim,
    levels,
    error,
    isTranscribing: transcribe.isPending,
    start,
    stop,
    cancel,
  };
}

/** First container the browser will actually record. Chrome and Firefox differ. */
function pickRecordingMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const type of [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ]) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return undefined;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result);
      // Strip the `data:...;base64,` prefix; the server wants the body only.
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Plain-language reason for a SpeechRecognition error code.
 *
 * Only `not-allowed`, `service-not-allowed` and `no-speech` were handled before,
 * so the most common real-world failure, `network`, produced no message at all.
 */
function describeRecognitionError(code: string | null | undefined): string | null {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access was blocked. Allow it in your browser, or type instead.";
    case "no-speech":
      return "I did not hear any speech. Try again, a little closer to the mic.";
    case "audio-capture":
      return "No microphone was available. Another app may be using it.";
    case "network":
      return "Speech recognition could not reach its service. Your network or a privacy extension may be blocking it, so please type for now.";
    case "aborted":
      return "That recording was cut short. Try again.";
    case "language-not-supported":
      return "Speech recognition does not support this browser language. Please type instead.";
    case null:
    case undefined:
      return null;
    default:
      return "Speech recognition failed. Please type your message.";
  }
}
