import { useRef } from "react";
import { AlertCircle, Clock, FolderUp, ImageUp, Loader2, Upload } from "lucide-react";
import { getGoogleOAuthUrl } from "@/lib/oauth";
import { useScreenshotUpload } from "./useScreenshotUpload";

/**
 * The homepage upload panel.
 *
 * Deliberately the only interactive thing in the hero. A visitor who already
 * knows what this product does can start a video from the first screen without
 * signing up first, which is why the auth prompt appears after the files are
 * chosen rather than before.
 */
export function UploadDropzone() {
  const upload = useScreenshotUpload();
  const filesInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);

  const busy = upload.state === "parsing" || upload.state === "uploading" || upload.state === "success";

  return (
    <div className="card card-pad shadow-lift">
      <input
        ref={filesInput}
        type="file"
        accept="image/*,.zip"
        multiple
        className="hidden"
        onChange={(e) => upload.selectFiles(e.target.files)}
      />
      <input
        ref={folderInput}
        type="file"
        multiple
        className="hidden"
        // Not in the React types, and only Chromium honours it, but the plain
        // multi-file picker above covers everyone else.
        {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
        onChange={(e) => upload.selectFiles(e.target.files)}
      />

      {upload.state === "auth" && (
        <div className="flex min-h-[300px] flex-col items-center justify-center px-4 text-center">
          <h3 className="h3">One step before we start</h3>
          <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-ink-body">
            Your screenshots are saved. Sign in and we will carry on with the upload.
          </p>
          <div className="mt-6 flex w-full max-w-[260px] flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                window.location.href = getGoogleOAuthUrl("/");
              }}
              className="btn btn-primary w-full"
            >
              Continue with Google
            </button>
            <button type="button" onClick={upload.reset} className="btn btn-ghost w-full">
              Not now
            </button>
          </div>
        </div>
      )}

      {busy && (
        <div className="flex min-h-[300px] flex-col items-center justify-center px-4 text-center">
          <Loader2 className="h-7 w-7 animate-spin text-brand" />
          <h3 className="mt-5 text-[17px] font-semibold text-ink">{upload.message}</h3>

          {upload.state === "uploading" && (
            <div className="mt-5 w-full max-w-[280px]">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-mat-strong">
                <div
                  className="h-full rounded-full bg-brand transition-[width] duration-300"
                  style={{ width: `${upload.progress}%` }}
                />
              </div>
              <p className="mt-2 text-right text-[12px] tabular-nums text-ink-muted">
                {upload.progress}%
              </p>
            </div>
          )}
        </div>
      )}

      {upload.state === "error" && (
        <div className="flex min-h-[300px] flex-col items-center justify-center px-4 text-center">
          {upload.retryIn > 0 ? (
            <Clock className="h-7 w-7 text-amber-500" />
          ) : (
            <AlertCircle className="h-7 w-7 text-red-500" />
          )}
          <h3 className="mt-4 text-[17px] font-semibold text-ink">
            {upload.retryIn > 0 ? "Slow down a moment" : "That upload did not finish"}
          </h3>
          <p className="mt-2 max-w-[320px] text-[15px] leading-relaxed text-ink-body">{upload.error}</p>
          {upload.retryIn > 0 && (
            <p className="mt-4 text-2xl font-semibold tabular-nums text-amber-600">{upload.retryIn}s</p>
          )}
          <button
            type="button"
            disabled={upload.retryIn > 0}
            onClick={upload.reset}
            className="btn btn-secondary mt-6"
          >
            Try again
          </button>
        </div>
      )}

      {upload.state === "idle" && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => filesInput.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              filesInput.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            upload.setIsDragging(true);
          }}
          onDragLeave={() => upload.setIsDragging(false)}
          onDrop={upload.dropFiles}
          className={`flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
            upload.isDragging
              ? "border-brand bg-brand-tint"
              : "border-line-strong bg-mat/50 hover:border-brand/50 hover:bg-brand-tint/40"
          }`}
        >
          <span className="grid h-12 w-12 place-items-center rounded-xl border border-line bg-white">
            <Upload className="h-5 w-5 text-brand" />
          </span>

          <h3 className="mt-5 text-[19px] font-semibold text-ink">
            {upload.isDragging ? "Let go to start" : "Drop your screenshots here"}
          </h3>
          <p className="mt-1.5 text-[14.5px] text-ink-body">
            A folder, a ZIP, or a handful of images. Up to 50 at a time.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                filesInput.current?.click();
              }}
              className="btn btn-primary"
            >
              <ImageUp className="h-4 w-4" />
              Choose files
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                folderInput.current?.click();
              }}
              className="btn btn-secondary"
            >
              <FolderUp className="h-4 w-4" />
              Choose folder
            </button>
          </div>

          <p className="mt-5 text-[12.5px] text-ink-muted">
            PNG, JPG, WebP, GIF · sorted by filename · 50 MB per file
          </p>
        </div>
      )}
    </div>
  );
}
