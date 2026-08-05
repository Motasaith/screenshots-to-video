import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";

/**
 * Take a photo with the webcam without leaving the editor.
 *
 * Screen recording used to live here too and has been removed: browser capture
 * cannot see the mouse position in other applications, so it could never do the
 * zoom-follows-the-cursor behaviour that makes a screen recorder worth using.
 * The renderer's video support stays: Pexels clips and custom intros need it -
 * so recording can come back later as a desktop companion without redoing that
 * work.
 */
export function CaptureDialog({
  onCapture,
  onClose,
}: {
  mode?: "camera";
  onCapture: (file: File, kind: "image" | "video") => void | Promise<void>;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** True once the browser reports real frame dimensions, not merely a stream. */
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  /**
   * Acquire the camera from a click, never from an effect.
   *
   * As an effect it re-ran whenever the parent re-rendered (an inline `onClose`
   * changes identity every time), tearing the stream down and re-prompting for
   * permission in a loop. StrictMode's double-invoke made it worse by
   * discarding the first grant. A real gesture sidesteps both.
   */
  const startStream = useCallback(async () => {
    setError(null);
    try {
      setStream(
        await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        })
      );
    } catch (err: unknown) {
      const name = err instanceof DOMException ? err.name : "";
      setError(
        name === "NotAllowedError"
          ? "Camera access was blocked. Allow it in your browser's site settings, then try again."
          : name === "NotFoundError"
            ? "No camera was found on this device."
            : "The camera could not be started. Check nothing else is using it."
      );
    }
  }, []);

  /**
   * Attach the stream once both it and the <video> element exist.
   *
   * Doing this inside startStream did not work: the element is only rendered
   * after a stream arrives, so `videoRef.current` was still null and the
   * assignment was silently skipped. The preview stayed black and `videoWidth`
   * stayed 0, which produced a 0x0 canvas and a null blob: "the photo could
   * not be captured", with the real fault three steps earlier. An effect runs
   * after the element is committed, so the ordering cannot invert again.
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!stream || !video) return;
    video.srcObject = stream;
    void video.play().catch(() => {
      setError("The camera preview could not start. Try again.");
    });
  }, [stream]);

  // Always release the camera; a light left on after closing is alarming.
  useEffect(() => {
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [stream]);

  const takePhoto = async () => {
    const video = videoRef.current;
    // Dimensions are the honest test of whether there is anything to capture;
    // a paused or unattached element reports zero and silently yields a blank.
    if (!video || !video.videoWidth || !video.videoHeight) {
      setError("The camera is still starting. Wait a moment, then capture again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("The photo could not be captured. Try again.");
      return;
    }
    // Match the mirrored preview. Capturing unmirrored would hand back a photo
    // that is not the one the user framed.
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
    if (!blob) {
      setError("The photo could not be captured. Try again.");
      return;
    }

    setSaving(true);
    try {
      await onCapture(new File([blob], `camera-${Date.now()}.png`, { type: "image/png" }), "image");
      onClose();
    } catch {
      setError("The photo could not be added to your timeline. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-label="Take a photo"
    >
      <div className="w-full max-w-3xl rounded-xl border border-[var(--sketch-border-color)]/40 bg-[var(--sketch-surface)] p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--sketch-fg)]">Take a photo</h3>
            <p className="text-[11px] text-[var(--sketch-fg-subtle)]">
              Captured at your camera's full resolution and added as a new scene.
            </p>
          </div>
          <button
            onClick={onClose}
            title="Close"
            aria-label="Close"
            className="rounded p-1 text-[var(--sketch-fg-muted)] hover:bg-[var(--sketch-fg-subtle)]/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-center">
            <p className="text-xs text-red-500">{error}</p>
          </div>
        )}

        {/* The <video> stays mounted from the start. Rendering it only once the
            camera was ready meant the ref was null exactly when the stream
            needed attaching. The prompt sits on top of it instead. */}
        <div className="relative overflow-hidden rounded-lg bg-black" style={{ aspectRatio: "16 / 9" }}>
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            // videoWidth is only trustworthy once metadata has arrived, so that
            // is what gates the capture button rather than "we have a stream".
            onLoadedMetadata={(e) => setReady(e.currentTarget.videoWidth > 0)}
            className="h-full w-full object-contain"
            // Mirrored, because people expect a mirror when framing themselves.
            style={{ transform: "scaleX(-1)" }}
          />

          {!stream && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[var(--sketch-border-color)]/40 bg-black/40">
              <Camera className="h-8 w-8 text-[var(--sketch-fg-subtle)]" />
              <button
                onClick={startStream}
                className="rounded-full bg-brand px-5 py-2.5 text-xs font-bold text-white hover:bg-brand-hover"
              >
                Turn on camera
              </button>
              <p className="px-4 text-center text-[10px] text-[var(--sketch-fg-subtle)]">
                Your browser will ask for camera permission.
              </p>
            </div>
          )}

          {stream && !ready && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <p className="text-[11px] text-[var(--sketch-fg-subtle)]">Starting camera…</p>
            </div>
          )}
        </div>

        {stream && (
          <div className="mt-3 flex items-center justify-center">
            <button
              onClick={takePhoto}
              disabled={saving || !ready}
              title="Capture a photo"
              aria-label="Capture a photo"
              className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-xs font-bold text-white hover:bg-brand-hover disabled:opacity-50"
            >
              <Camera className="h-4 w-4" />
              {saving ? "Adding…" : "Capture"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
