import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router";
import { 
  ArrowRight, 
  Check, 
  Loader2, 
  AlertCircle,
  CloudUpload,
  Clock
} from "lucide-react";
import JSZip from "jszip";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";

// SimulatorStep type removed

// Staggered word animation for the h1
const headlineWords = [
  { text: "Screenshots", style: "text-[var(--space-text)]" },
  { text: "in.", style: "text-[var(--space-text)]" },
  { text: "\n", style: "" },
  { text: "Cinematic", style: "text-gradient-neon" },
  { text: "\n", style: "" },
  { text: "tutorials", style: "text-[var(--space-text)]" },
  { text: "out.", style: "text-[var(--space-text)]" },
];



// Typing text component
function TypingText({ text, speed = 25 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        setDone(true);
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {!done && <span className="typing-cursor" />}
    </span>
  );
}

// MIME type helper for ZIP extraction
function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "image/png";
  }
}

// Recursively traverse directory entry or files
async function traverseEntry(entry: any): Promise<File[]> {
  const files: File[] = [];

  const processEntry = async (item: any) => {
    if (item.isFile) {
      const file = await new Promise<File>((resolve, reject) => {
        item.file(resolve, reject);
      });
      const name = file.name.toLowerCase();
      const isImageOrZip =
        file.type.startsWith("image/") ||
        name.endsWith(".zip") ||
        name.endsWith(".png") ||
        name.endsWith(".jpg") ||
        name.endsWith(".jpeg") ||
        name.endsWith(".webp") ||
        name.endsWith(".gif");
      if (isImageOrZip) {
        files.push(file);
      }
    } else if (item.isDirectory) {
      const dirReader = item.createReader();
      const readAllEntries = async (): Promise<any[]> => {
        let allEntries: any[] = [];
        const readBatch = async (): Promise<any[]> => {
          return new Promise((resolve, reject) => {
            dirReader.readEntries(resolve, reject);
          });
        };
        let batch = await readBatch();
        while (batch.length > 0) {
          allEntries = allEntries.concat(batch);
          batch = await readBatch();
        }
        return allEntries;
      };

      try {
        const entries = await readAllEntries();
        for (const childEntry of entries) {
          await processEntry(childEntry);
        }
      } catch (err) {
        console.error("Error reading directory entry:", err);
      }
    }
  };

  await processEntry(entry);
  return files;
}

// Extract files from zip
async function extractZipFiles(zipFile: File): Promise<File[]> {
  const extractedFiles: File[] = [];
  try {
    const zip = await JSZip.loadAsync(zipFile);
    const promises: Promise<void>[] = [];

    zip.forEach((_relativePath, entry) => {
      if (!entry.dir) {
        const lowerName = entry.name.toLowerCase();
        const isImg =
          lowerName.endsWith(".png") ||
          lowerName.endsWith(".jpg") ||
          lowerName.endsWith(".jpeg") ||
          lowerName.endsWith(".webp") ||
          lowerName.endsWith(".gif");
        if (isImg) {
          const promise = entry.async("blob").then((blob) => {
            const fileName = entry.name.split("/").pop() || entry.name;
            const mimeType = getMimeType(fileName);
            const extractedFile = new File([blob], fileName, { type: mimeType });
            extractedFiles.push(extractedFile);
          });
          promises.push(promise);
        }
      }
    });

    await Promise.all(promises);
  } catch (err) {
    console.error("Failed to extract zip file:", err);
  }
  return extractedFiles;
}

// Sort and filter all files recursively (including zip extraction)
async function processFiles(files: File[]): Promise<File[]> {
  let images: File[] = [];

  for (const file of files) {
    const name = file.name.toLowerCase();
    if (name.endsWith(".zip")) {
      const zipImages = await extractZipFiles(file);
      images = images.concat(zipImages);
    } else if (
      file.type.startsWith("image/") ||
      name.endsWith(".png") ||
      name.endsWith(".jpg") ||
      name.endsWith(".jpeg") ||
      name.endsWith(".webp") ||
      name.endsWith(".gif")
    ) {
      images.push(file);
    }
  }

  // Sort alphabetically by name (natural sort)
  images.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
  );

  return images;
}

function getOAuthUrl() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);

  return url.toString();
}

export default function HeroSection() {

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const createProject = trpc.project.create.useMutation();
  const createStep = trpc.step.create.useMutation();

  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<"idle" | "parsing" | "uploading" | "error" | "success">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [retryCountdown, setRetryCountdown] = useState(0);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  // Parse rate limit or JSON error messages into user-friendly text
  const parseErrorMessage = (raw: string): { message: string; retryAfter: number } => {
    // Try to extract JSON from the string
    const jsonMatch = raw.match(/\{.*\}/s);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.error) {
          const retryMatch = parsed.error.match(/Retry after (\d+)s/i);
          const retryAfter = retryMatch ? parseInt(retryMatch[1], 10) : 0;
          return {
            message: retryAfter > 0
              ? "You're uploading too fast. Please wait a moment."
              : parsed.error,
            retryAfter,
          };
        }
      } catch { /* not valid JSON, fall through */ }
    }
    // Check for retry pattern in raw string
    const retryMatch = raw.match(/Retry after (\d+)s/i);
    if (retryMatch) {
      return {
        message: "You're uploading too fast. Please wait a moment.",
        retryAfter: parseInt(retryMatch[1], 10),
      };
    }
    return { message: raw, retryAfter: 0 };
  };

  // Countdown timer for rate limit retry
  useEffect(() => {
    if (retryCountdown <= 0) return;
    const timer = setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [retryCountdown]);

  const handleFilesSelected = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;

    if (!isAuthenticated) {
      setShowAuthDialog(true);
      return;
    }

    const fileArray = Array.from(files);
    setUploadState("parsing");
    setUploadMessage("Parsing and extracting screenshots...");

    try {
      const processed = await processFiles(fileArray);

      if (processed.length === 0) {
        setUploadState("error");
        setErrorMsg("No valid screenshots found in selection.");
        toast.error("No valid screenshots (PNG, JPEG, WebP, GIF) found.");
        return;
      }

      setUploadState("uploading");
      setUploadProgress(0);
      setUploadMessage("Creating vision project...");

      const projectResult = await createProject.mutateAsync({
        title: "Imported Video",
        description: "Screenshots imported from folder uploader.",
        platform: "youtube",
        aspectRatio: "16:9",
      });

      const total = processed.length;
      for (let i = 0; i < total; i++) {
        const file = processed[i];
        setUploadMessage(`Uploading screenshot ${i + 1} of ${total}: ${file.name}`);
        setUploadProgress(Math.round((i / total) * 100));

        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "screenshots");

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errText = await uploadResponse.text();
          throw new Error(`Upload failed: ${errText || uploadResponse.statusText}`);
        }

        const uploadResult = await uploadResponse.json();

        await createStep.mutateAsync({
          projectId: projectResult.id,
          order: i + 1,
          description: "",
          screenshotPath: uploadResult.key,
        });

        // Small delay between uploads to avoid rate limiting
        if (i < total - 1) {
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      setUploadProgress(100);
      setUploadState("success");
      setUploadMessage("Redirecting to editor...");
      toast.success("Successfully imported screenshots!");

      navigate(`/create/${projectResult.id}/preview?imported=true`);
    } catch (err: any) {
      console.error(err);
      const rawMsg = err?.message || "An error occurred during upload.";
      const { message, retryAfter } = parseErrorMessage(rawMsg);
      setUploadState("error");
      setErrorMsg(message);
      if (retryAfter > 0) {
        setRetryCountdown(retryAfter);
      }
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (!isAuthenticated) {
      setShowAuthDialog(true);
      return;
    }

    setUploadState("parsing");
    setUploadMessage("Reading folder contents...");

    try {
      let filesToProcess: File[] = [];

      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        const items = Array.from(e.dataTransfer.items);
        const filePromises = items.map((item) => {
          if (item.kind === "file") {
            const entry = item.webkitGetAsEntry();
            if (entry) return traverseEntry(entry);
          }
          return [];
        });
        const nestedFiles = await Promise.all(filePromises);
        filesToProcess = nestedFiles.flat();
      } else {
        filesToProcess = Array.from(e.dataTransfer.files || []);
      }

      await handleFilesSelected(filesToProcess);
    } catch (err: any) {
      console.error(err);
      setUploadState("error");
      setErrorMsg(err.message || "Failed to process dropped files.");
    }
  };

  // Mouse coordinates handlers removed

  // Simulation functions removed

  return (
    <section className="relative pt-24 pb-8 lg:pt-32 lg:pb-10 overflow-hidden">
      <div className="w-full px-6 lg:px-12 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Heading & Copy */}
          <div>
            {/* Heading badge removed */}

            {/* Staggered Word Headline */}
            <h1 className="font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight">
              {headlineWords.map((word, i) => {
                if (word.text === "\n") return <br key={i} />;
                return (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{
                      duration: 0.6,
                      delay: 0.3 + i * 0.12,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className={`inline-block mr-[0.25em] ${word.style}`}
                  >
                    {word.text}
                  </motion.span>
                );
              })}
            </h1>

            {/* Typing Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3, duration: 0.4 }}
              className="mt-6 text-lg lg:text-xl text-[var(--space-text-muted)] max-w-xl font-sans leading-relaxed"
            >
              <TypingText
                text="Upload screenshots of your web or mobile app, write a simple script, and let our AI compile them into a professional video tutorial with cinematic zooms, panning camera effects, and natural voiceover narration."
                speed={18}
              />
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6, duration: 0.5 }}
              className="mt-8 flex flex-wrap gap-4 items-center"
            >
              <button
                onClick={() => filesInputRef.current?.click()}
                className="glass-btn glass-btn-primary group relative animate-breathing-glow cursor-pointer font-sans"
              >
                <span className="animate-ripple" />
                Upload Screenshots
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <Link to="/dashboard" className="glass-btn glass-btn-secondary cursor-pointer font-sans">
                Go to Dashboard
              </Link>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2, duration: 0.5 }}
              className="mt-8 flex flex-wrap items-center gap-6 text-sm text-[var(--space-text-muted)]"
            >
              {["No credit card required", "5 free videos / month", "ElevenLabs Voices"].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 2.1 + i * 0.15 }}
                  className="flex items-center gap-2"
                >
                  <Check className="w-4 h-4 text-cyan-500" />
                  <span className="font-sans">{item}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
          {/* Right Column: Upload Dropzone */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="relative w-full min-h-[540px] flex items-center justify-center"
          >
            {/* Ambient Background Glow */}
            <div className="absolute w-[90%] h-[80%] bg-teal-500/8 dark:bg-teal-500/10 rounded-full blur-[80px] pointer-events-none" />

            {/* Upload Card */}
            <motion.div
              initial={{ scale: 1, boxShadow: "0 20px 50px rgba(0,0,0,0.12)" }}
              whileHover={{ 
                scale: 1.01, 
                boxShadow: "0 30px 70px rgba(var(--btn-glow-rgb), 0.15), 0 0 0 1px rgba(var(--btn-glow-rgb), 0.1)",
              }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="w-full max-w-[640px] glass-panel bg-[var(--space-card)]/80 backdrop-blur-md rounded-3xl border border-[var(--space-border)] p-6 relative flex flex-col transition-all duration-300 shadow-xl dark:shadow-2xl hover:border-teal-500/30 dark:hover:border-teal-500/20"
            >
              {/* Main Content Area */}
              <div className="flex-1 relative flex items-center justify-center min-h-[400px]">
                {/* Hidden Inputs */}
                <input
                  type="file"
                  ref={folderInputRef}
                  {...({
                    webkitdirectory: "",
                    directory: ""
                  } as any)}
                  multiple
                  className="hidden"
                  onChange={(e) => handleFilesSelected(e.target.files)}
                />
                <input
                  type="file"
                  ref={filesInputRef}
                  accept="image/*,.zip"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFilesSelected(e.target.files)}
                />

                {/* AUTH REQUIRED DIALOG */}
                {showAuthDialog && (
                  <div className="text-center p-8 flex flex-col items-center justify-center h-full w-full bg-[var(--space-card)]/95 backdrop-blur-md absolute inset-0 z-40 rounded-2xl font-sans border border-[var(--space-border)] shadow-lg">
                    <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 animate-pulse">
                      <AlertCircle className="w-7 h-7 text-amber-500" />
                    </div>
                    <h3 className="text-base font-bold text-[var(--space-text)]">Sign In Required</h3>
                    <p className="text-sm text-[var(--space-text-muted)] mt-2 max-w-[280px] leading-relaxed font-sans">
                      Please sign in to upload your screenshots and start creating video tutorials.
                    </p>
                    <div className="flex flex-col gap-2.5 w-full max-w-[220px] mt-5">
                      <button
                        type="button"
                        onClick={() => {
                          window.location.href = getOAuthUrl();
                        }}
                        className="glass-btn glass-btn-primary cursor-pointer text-sm font-semibold rounded-xl"
                      >
                        Sign in with Google
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAuthDialog(false);
                          setUploadState("idle");
                        }}
                        className="glass-btn glass-btn-secondary cursor-pointer text-sm font-semibold rounded-xl"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* UPLOADING & PARSING STATES */}
                {(uploadState === "parsing" || uploadState === "uploading") && (
                  <div className="text-center p-8 flex flex-col items-center justify-center h-full w-full bg-[var(--space-card)]/40">
                    <div className="w-14 h-14 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-5 shadow-sm">
                      <Loader2 className="w-7 h-7 text-teal-600 dark:text-teal-400 animate-spin" />
                    </div>
                    <h3 className="text-base font-semibold text-[var(--space-text)]">
                      {uploadState === "parsing" ? "Processing Files..." : "Uploading Screenshots..."}
                    </h3>
                    <p className="text-sm text-[var(--space-text-muted)] mt-2 max-w-xs truncate font-mono">
                      {uploadMessage}
                    </p>
                    {uploadState === "uploading" && (
                      <div className="w-full max-w-[280px] mt-5 font-sans">
                        <div className="w-full bg-[var(--space-border)] rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-teal-500 to-cyan-400 h-full transition-all duration-300 rounded-full"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <div className="text-xs font-mono text-[var(--space-text-muted)] mt-2 text-right">
                          {uploadProgress}%
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ERROR STATE */}
                {uploadState === "error" && (
                  <div className="text-center p-8 flex flex-col items-center justify-center h-full w-full bg-[var(--space-card)]/40 font-sans">
                    <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                      {retryCountdown > 0 ? (
                        <Clock className="w-7 h-7 text-amber-500" />
                      ) : (
                        <AlertCircle className="w-7 h-7 text-red-500" />
                      )}
                    </div>
                    <h3 className="text-base font-bold text-red-600 dark:text-red-400">
                      {retryCountdown > 0 ? "Rate Limited" : "Upload Failed"}
                    </h3>
                    <p className="text-sm text-[var(--space-text-muted)] mt-2 max-w-[300px] leading-relaxed">
                      {errorMsg}
                    </p>
                    {retryCountdown > 0 && (
                      <div className="mt-4 flex flex-col items-center gap-2">
                        <div className="text-3xl font-bold font-mono text-amber-500 tabular-nums">
                          {retryCountdown}s
                        </div>
                        <p className="text-xs text-[var(--space-text-subtle)]">before you can retry</p>
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={retryCountdown > 0}
                      onClick={() => {
                        setUploadState("idle");
                        setRetryCountdown(0);
                      }}
                      className={`mt-5 glass-btn ${
                        retryCountdown > 0
                          ? "glass-btn-secondary cursor-not-allowed opacity-50"
                          : "glass-btn-primary"
                      }`}
                    >
                      Try Again
                    </button>
                  </div>
                )}

                {/* IDLE/UPLOADER ZONE */}
                {uploadState === "idle" && (
                  <div
                    className={`w-full h-full flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 transition-all duration-300 cursor-pointer select-none min-h-[380px] ${
                      isDragging
                        ? "border-teal-500 bg-teal-500/5 dark:bg-teal-500/10 scale-[0.99] shadow-[0_0_20px_rgba(20,184,166,0.1)]"
                        : "border-[var(--space-border)] bg-[var(--space-card)]/40 hover:border-teal-500/40 hover:bg-teal-50/10 dark:hover:bg-teal-950/5"
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => filesInputRef.current?.click()}
                  >
                    {/* Glowing Icon Badge */}
                    <div className="w-14 h-14 rounded-2xl bg-teal-50/50 dark:bg-teal-950/60 border border-teal-500/20 dark:border-teal-500/30 flex items-center justify-center mb-5 shadow-[0_0_15px_rgba(20,184,166,0.1)] dark:shadow-[0_0_20px_rgba(20,184,166,0.15)]">
                      <CloudUpload className={`w-6 h-6 text-teal-600 dark:text-teal-400 ${isDragging ? "animate-bounce" : ""}`} />
                    </div>

                    {/* Main headline */}
                    <h3 className="text-xl font-bold text-[var(--space-text)] text-center font-sans tracking-tight">
                      {isDragging ? "Drop your files here" : "Drop screenshots here"}
                    </h3>

                    {/* Subheading */}
                    <p className="text-sm text-[var(--space-text-muted)] text-center mt-1 font-sans">
                      or click to browse your files
                    </p>

                    {/* Supported formats */}
                    <p className="text-xs text-[var(--space-text-subtle)] text-center mt-2.5 font-sans font-medium">
                      Folders&nbsp; ·&nbsp; ZIP archives&nbsp; ·&nbsp; PNG, JPG, WebP, GIF
                    </p>

                    {/* Action buttons */}
                    <div className="flex flex-row items-center gap-4 mt-6">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          filesInputRef.current?.click();
                        }}
                        className="glass-btn glass-btn-primary cursor-pointer text-sm font-semibold rounded-xl shadow-[0_4px_12px_rgba(var(--btn-glow-rgb),0.2)]"
                      >
                        Choose screenshots / ZIP
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          folderInputRef.current?.click();
                        }}
                        className="glass-btn glass-btn-secondary cursor-pointer text-sm font-semibold rounded-xl"
                      >
                        Upload folder
                      </button>
                    </div>


                    {/* Limitations / hints */}
                    <div className="flex items-center justify-center gap-4 mt-5 flex-wrap">
                      {["Max 50 screenshots", "Auto-sorted by filename", "50MB per file"].map((hint, i) => (
                        <span key={i} className="text-[11px] text-[var(--space-text-subtle)]/80 font-sans flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-[var(--space-text-subtle)]/40 inline-block" />
                          {hint}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Pill Tags at the Bottom */}
              <div className="flex items-center justify-center gap-3 mt-5">
                {["ZIP", "FOLDERS", "IMAGES"].map((tag) => (
                  <span
                    key={tag}
                    className="px-3.5 py-1 text-[10px] font-bold tracking-wider rounded-full bg-[var(--space-card)] border border-[var(--space-border)] text-teal-600 dark:text-teal-400 uppercase font-sans shadow-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>

          </motion.div>
        </div>
      </div>
    </section>
  );
}
