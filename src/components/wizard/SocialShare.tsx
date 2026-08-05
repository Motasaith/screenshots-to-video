import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Link2, Check, Share2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SocialShareProps {
  videoUrl?: string;
  title: string;
  description?: string;
}

interface Platform {
  name: string;
  color: string;
  hoverColor: string;
  icon: React.ReactNode;
  uploadUrl: string;
  description: string;
}

// ── Brand SVG Icons ──

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.87-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.063 2.063 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const PLATFORMS: Platform[] = [
  {
    name: "YouTube",
    color: "#FF0000",
    hoverColor: "#CC0000",
    icon: <YouTubeIcon className="w-5 h-5" />,
    uploadUrl: "https://www.youtube.com/upload",
    description: "Upload to YouTube",
  },
  {
    name: "TikTok",
    color: "#000000",
    hoverColor: "#25F4EE",
    icon: <TikTokIcon className="w-5 h-5" />,
    uploadUrl: "https://www.tiktok.com/upload",
    description: "Upload to TikTok",
  },
  {
    name: "LinkedIn",
    color: "#0A66C2",
    hoverColor: "#004182",
    icon: <LinkedInIcon className="w-5 h-5" />,
    uploadUrl: "https://www.linkedin.com/feed/?shareActive=true",
    description: "Share on LinkedIn",
  },
  {
    name: "Instagram",
    color: "#E4405F",
    hoverColor: "#C13584",
    icon: <InstagramIcon className="w-5 h-5" />,
    uploadUrl: "https://www.instagram.com/",
    description: "Upload to Instagram",
  },
  {
    name: "Facebook",
    color: "#1877F2",
    hoverColor: "#0F5FBE",
    icon: <FacebookIcon className="w-5 h-5" />,
    uploadUrl: "https://www.facebook.com/sharer/sharer.php",
    description: "Share on Facebook",
  },
  {
    name: "X (Twitter)",
    color: "#000000",
    hoverColor: "#1DA1F2",
    icon: <XIcon className="w-5 h-5" />,
    uploadUrl: "https://x.com/compose/post",
    description: "Post on X",
  },
];

export default function SocialShare({ videoUrl, title }: SocialShareProps) {
  const [linkCopied, setLinkCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = async () => {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `${title || "video"}.mp4`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setDownloaded(true);
    toast.success("Video downloaded! Now upload it to your favorite platform.");
    setTimeout(() => setDownloaded(false), 3000);
  };

  const handleCopyLink = async () => {
    if (!videoUrl) return;
    try {
      await navigator.clipboard.writeText(videoUrl);
      setLinkCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = videoUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setLinkCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleShare = (platform: Platform) => {
    if (!videoUrl) return;

    // For X and Facebook, we can pre-fill text via URL params
    let url = platform.uploadUrl;
    if (platform.name === "X (Twitter)") {
      const text = encodeURIComponent(`Check out my video: ${title}`);
      const urlParam = encodeURIComponent(videoUrl);
      url = `https://x.com/intent/tweet?text=${text}&url=${urlParam}`;
    } else if (platform.name === "Facebook") {
      const quote = encodeURIComponent(`Check out my video: ${title}`);
      url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(videoUrl)}&quote=${quote}`;
    } else if (platform.name === "LinkedIn") {
      url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(videoUrl)}`;
    }

    window.open(url, "_blank", "noopener,noreferrer,width=600,height=600");
    toast.info(`Opening ${platform.name}... Download your video first if you haven't!`);
  };

  if (!videoUrl) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="sketch-card p-5 bg-[var(--sketch-card-bg)] border-[var(--sketch-border-color)]"
    >
      <h3 className="font-body font-semibold text-lg mb-1 flex items-center gap-2 text-[var(--sketch-fg)]">
        <Share2 className="w-5 h-5 text-brand" />
        Share Your Video
      </h3>
      <p className="font-body text-sm text-[var(--sketch-fg-muted)] mb-4">
        Download your video, then upload it to your favorite platform. Or copy the link to share anywhere.
      </p>

      {/* Download + Copy Link */}
      <div className="flex flex-wrap gap-3 mb-5">
        <Button
          className="sketch-btn-primary flex-1 min-w-[140px]"
          onClick={handleDownload}
        >
          {downloaded ? (
            <>
              <Check className="w-4 h-4" />
              Downloaded!
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Download MP4
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          className="sketch-btn-ghost flex-1 min-w-[140px]"
          onClick={handleCopyLink}
        >
          {linkCopied ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Link2 className="w-4 h-4" />
              Copy Link
            </>
          )}
        </Button>
      </div>

      {/* Platform buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {PLATFORMS.map((platform) => (
          <motion.button
            key={platform.name}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleShare(platform)}
            className="group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200"
            style={{
              borderColor: `${platform.color}30`,
              background: `${platform.color}08`,
            }}
            title={platform.description}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 group-hover:scale-110"
              style={{
                backgroundColor: platform.color,
                color: "#fff",
              }}
            >
              {platform.icon}
            </div>
            <span
              className="font-body text-xs font-medium text-center transition-colors"
              style={{ color: "var(--sketch-fg)" }}
            >
              {platform.name}
            </span>
            <ExternalLink
              className="w-3 h-3 absolute top-2 right-2 opacity-0 group-hover:opacity-50 transition-opacity"
              style={{ color: platform.color }}
            />
          </motion.button>
        ))}
      </div>

      {/* Helper text */}
      <div className="mt-4 p-3 bg-brand/5 border border-brand/20 rounded-lg">
        <p className="font-body text-xs text-[var(--sketch-fg-muted)] leading-relaxed">
          <strong>Tip:</strong> YouTube, TikTok, and Instagram require you to upload the video file directly.
          Download it first, then click the platform button to open the upload page.
          X, Facebook, and LinkedIn can share a direct link.
        </p>
      </div>
    </motion.div>
  );
}