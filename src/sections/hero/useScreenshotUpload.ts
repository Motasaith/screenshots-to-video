import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { ProjectDefaults } from "@contracts/constants";
import { compressImages } from "@/lib/imageCompress";
import {
  clearPendingFiles,
  loadPendingFiles,
  parseErrorMessage,
  processFiles,
  savePendingFiles,
  traverseEntry,
} from "./screenshotFiles";

export type UploadState = "idle" | "parsing" | "uploading" | "error" | "success" | "auth";

/**
 * The homepage dropzone, minus the markup.
 *
 * Owns one flow with two entry points that behave identically: files chosen
 * from a picker, and files dropped onto the page. A signed-out visitor gets
 * their selection parked in IndexedDB and is sent to Google; when they land
 * back on the homepage the same flow resumes from where it stopped.
 */
export function useScreenshotUpload() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const createProject = trpc.project.create.useMutation();
  const createStep = trpc.step.create.useMutation();

  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [retryIn, setRetryIn] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (retryIn <= 0) return;
    const timer = setInterval(() => {
      setRetryIn((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [retryIn]);

  /** Create the project, then upload each screenshot as its own step. */
  const runUpload = useCallback(
    async (files: File[]) => {
      const processed = await processFiles(files);

      if (processed.length === 0) {
        setState("error");
        setError("Nothing in that selection looked like a screenshot.");
        toast.error("No PNG, JPEG, WebP or GIF files found.");
        return;
      }

      setMessage("Optimising screenshots");
      const compressed = await compressImages(processed);

      setState("uploading");
      setProgress(0);
      setMessage("Creating your project");

      const project = await createProject.mutateAsync({
        title: "Imported video",
        // The homepage flow collects no text, so this default is all the script
        // generator gets to start from. Shared with the dashboard's create
        // dialog so the two cannot drift, and it has to clear the 120 character
        // minimum on project.create while still describing something real
        // rather than being a stub that produces a stub script. The import
        // dialog on the next screen prefills with it and invites a replacement.
        description: ProjectDefaults.description,
        platform: "youtube",
        aspectRatio: "16:9",
      });

      const total = compressed.length;
      for (let i = 0; i < total; i++) {
        const file = compressed[i];
        setMessage(`Uploading ${i + 1} of ${total}`);
        setProgress(Math.round((i / total) * 100));

        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "screenshots");

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Upload failed: ${text || response.statusText}`);
        }

        const result = await response.json();

        await createStep.mutateAsync({
          projectId: project.id,
          order: i + 1,
          description: "",
          screenshotPath: result.key,
        });

        // Paced deliberately: the upload endpoint is rate limited, and a tight
        // loop over fifty files trips it.
        if (i < total - 1) await new Promise((r) => setTimeout(r, 200));
      }

      setProgress(100);
      setState("success");
      setMessage("Opening the editor");
      toast.success(`Imported ${total} screenshot${total === 1 ? "" : "s"}.`);

      navigate(`/create/${project.id}/preview?imported=true`);
    },
    [createProject, createStep, navigate]
  );

  const fail = useCallback((err: unknown) => {
    const raw = err instanceof Error ? err.message : "Something went wrong during upload.";
    const { message: parsed, retryAfter } = parseErrorMessage(raw);
    setState("error");
    setError(parsed);
    if (retryAfter > 0) setRetryIn(retryAfter);
  }, []);

  const selectFiles = useCallback(
    async (files: FileList | File[] | null) => {
      if (!files || files.length === 0) return;

      if (!isAuthenticated) {
        await savePendingFiles(Array.from(files));
        setState("auth");
        return;
      }

      setState("parsing");
      setMessage("Reading your files");

      try {
        await runUpload(Array.from(files));
      } catch (err) {
        console.error(err);
        fail(err);
      }
    },
    [isAuthenticated, runUpload, fail]
  );

  const dropFiles = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragging(false);

      if (!isAuthenticated) {
        const dropped = Array.from(event.dataTransfer.files || []);
        if (dropped.length > 0) await savePendingFiles(dropped);
        setState("auth");
        return;
      }

      setState("parsing");
      setMessage("Reading folder contents");

      try {
        let files: File[] = [];

        // `items` is what carries directory entries. `files` alone flattens a
        // dropped folder to nothing, so it is only the fallback.
        if (event.dataTransfer.items?.length) {
          const nested = await Promise.all(
            Array.from(event.dataTransfer.items).map((item) => {
              if (item.kind !== "file") return [];
              const entry = item.webkitGetAsEntry();
              return entry ? traverseEntry(entry) : [];
            })
          );
          files = nested.flat();
        } else {
          files = Array.from(event.dataTransfer.files || []);
        }

        if (files.length === 0) {
          setState("idle");
          return;
        }

        await runUpload(files);
      } catch (err) {
        console.error(err);
        fail(err);
      }
    },
    [isAuthenticated, runUpload, fail]
  );

  // Resume after the sign-in round trip. Guarded by a ref because auth
  // resolves asynchronously and this must not fire twice.
  const resumed = useRef(false);
  useEffect(() => {
    if (authLoading || resumed.current || !isAuthenticated) return;
    resumed.current = true;

    (async () => {
      const pending = await loadPendingFiles();
      if (!pending?.length) return;
      await clearPendingFiles();

      setState("parsing");
      setMessage("Picking up where you left off");
      try {
        await runUpload(pending);
      } catch (err) {
        fail(err);
      }
    })();
  }, [isAuthenticated, authLoading, runUpload, fail]);

  const reset = useCallback(() => {
    setState("idle");
    setError("");
    setRetryIn(0);
    setProgress(0);
  }, []);

  return {
    state,
    progress,
    message,
    error,
    retryIn,
    isDragging,
    setIsDragging,
    selectFiles,
    dropFiles,
    reset,
  };
}
