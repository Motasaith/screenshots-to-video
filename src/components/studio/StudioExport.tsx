import { useNavigate } from "react-router";
import { useStudioStore } from "@/hooks/useStudioStore";
import { trpc } from "@/providers/trpc";
import { motion } from "framer-motion";
import {
  Download,
  CheckCircle,
  Film,
  ArrowLeft,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StudioExport() {
  const navigate = useNavigate();
  const { projectId } = useStudioStore();

  const renderStatus = trpc.studio.renderStatus.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId }
  );

  const downloadUrl = trpc.studio.getDownloadUrl.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId && renderStatus.data?.projectStatus === "complete" }
  );

  const handleDownload = () => {
    const url = renderStatus.data?.finalVideoUrl || downloadUrl.data?.url;
    if (url) {
      window.open(url, "_blank");
    }
  };

  const isComplete = renderStatus.data?.projectStatus === "complete";
  const videoUrl = renderStatus.data?.finalVideoUrl || downloadUrl.data?.url;

  return (
    <div className="max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="relative inline-block mb-1">
          <span className="font-hand text-lg text-[var(--sketch-fg-muted)] animate-float hidden sm:block">
            Your video is ready! 🎉
          </span>
        </div>
        <h2 className="font-body font-bold text-3xl tracking-tight text-[var(--sketch-fg)]">
          Export & Download
        </h2>
        <p className="font-body text-[var(--sketch-fg-muted)] mt-2">
          Your AI-generated video is complete. Preview it below and download when ready.
        </p>

        <div className="mt-8">
          {!isComplete ? (
            <div className="sketch-card p-8 text-center bg-[var(--sketch-card-bg)]">
              <Loader2 className="w-12 h-12 text-[#FBBF24] mx-auto mb-4 animate-spin" />
              <h3 className="font-body font-semibold text-xl mb-2 text-[var(--sketch-fg)]">
                Waiting for video...
              </h3>
              <p className="font-body text-sm text-[var(--sketch-fg-muted)]">
                Your video is still being rendered. It will appear here when ready.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Success banner */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="sketch-card p-5 bg-emerald-500/5 border-emerald-500"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                  <div>
                    <h3 className="font-body font-semibold text-[var(--sketch-fg)]">
                      Video Generated Successfully!
                    </h3>
                    <p className="font-body text-sm text-[var(--sketch-fg-muted)]">
                      Your AI-powered video has been created and is ready for download.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Video player */}
              {videoUrl && (
                <div className="sketch-card overflow-hidden bg-black">
                  <video
                    controls
                    className="w-full aspect-video"
                    src={videoUrl}
                    preload="metadata"
                  >
                    Your browser does not support video playback.
                  </video>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleDownload}
                  className="sketch-btn-primary flex-1"
                  disabled={!videoUrl}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Video
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/dashboard")}
                  className="sketch-btn-ghost flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </div>

              {/* AdSense Placeholder */}
              <div className="sketch-card bg-[var(--sketch-card-bg)] border-2 border-dashed border-[var(--sketch-fg-subtle)] p-6 text-center flex flex-col items-center justify-center">
                <span className="font-mono text-xs text-[var(--sketch-fg-subtle)] uppercase tracking-widest bg-[var(--sketch-fg-subtle)]/10 px-2 py-1 sketch-border-sm mb-2 inline-block">
                  Advertisement
                </span>
                <p className="font-body text-sm text-[var(--sketch-fg-muted)]">
                  Google AdSense Placeholder (728x90)
                </p>
              </div>

              {/* Attribution note */}
              <div className="sketch-card p-4 bg-[var(--sketch-card-bg)]">
                <p className="font-body text-xs text-[var(--sketch-fg-subtle)]">
                  <Film className="w-3 h-3 inline mr-1" />
                  Stock media provided by{" "}
                  <a
                    href="https://www.pexels.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-[var(--sketch-fg)]"
                  >
                    Pexels
                    <ExternalLink className="w-3 h-3 inline ml-0.5" />
                  </a>
                  . Voice generated using Edge TTS. Script created with AI.
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
