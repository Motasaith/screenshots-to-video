import { AlertTriangle, FileText, Mic, Pencil, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RenderPreflightResult } from "./renderPreflight";

interface RenderPreflightDialogProps {
  open: boolean;
  result: RenderPreflightResult;
  busy?: boolean;
  onOpenChange?: (open: boolean) => void;
  onGenerateScripts: () => void;
  onWriteScripts: () => void;
  onSetVoice: () => void;
  onContinueSilently: () => void | Promise<void>;
  onCancel: () => void;
}

function formatSceneList(result: RenderPreflightResult) {
  const sceneNumbers = result.missingScripts.map((scene) => scene.order);

  if (sceneNumbers.length <= 4) {
    return sceneNumbers.join(", ");
  }

  return `${sceneNumbers.slice(0, 4).join(", ")} and ${sceneNumbers.length - 4} more`;
}

export function RenderPreflightDialog({
  open,
  result,
  busy = false,
  onOpenChange,
  onGenerateScripts,
  onWriteScripts,
  onSetVoice,
  onContinueSilently,
  onCancel,
}: RenderPreflightDialogProps) {
  const missingScriptCount = result.missingScripts.length;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!busy) {
          onOpenChange?.(nextOpen);
        }
      }}
    >
      <DialogContent
        className="max-w-xl border border-amber-500/35 bg-[var(--sketch-card-bg)] text-[var(--sketch-fg)] shadow-2xl"
        onInteractOutside={(event) => {
          if (busy) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <DialogHeader>
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <DialogTitle>Finish narration before exporting</DialogTitle>
          <DialogDescription className="leading-relaxed text-[var(--sketch-fg-muted)]">
            Rendering now can create empty TTS audio. Add the missing narration
            details, or explicitly continue with no voiceover or captions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {missingScriptCount > 0 && (
            <div className="flex gap-3 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
              <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold">
                  {missingScriptCount === 1
                    ? "1 scene has no narration script"
                    : `${missingScriptCount} scenes have no narration script`}
                </p>
                <p className="mt-0.5 text-xs text-[var(--sketch-fg-muted)]">
                  Scene{missingScriptCount === 1 ? "" : "s"}{" "}
                  {formatSceneList(result)}
                </p>
              </div>
            </div>
          )}

          {result.voiceMissing && (
            <div className="flex gap-3 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
              <Mic className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold">No voice is set</p>
                <p className="mt-0.5 text-xs text-[var(--sketch-fg-muted)]">
                  Choose and save a voice before starting the render.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {missingScriptCount > 0 && (
            <>
              <Button
                type="button"
                onClick={onGenerateScripts}
                disabled={busy}
                className="justify-start gap-2"
              >
                <FileText className="h-4 w-4" />
                Generate scripts with AI
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onWriteScripts}
                disabled={busy}
                className="justify-start gap-2"
              >
                <Pencil className="h-4 w-4" />
                Write or paste scripts
              </Button>
            </>
          )}

          {result.voiceMissing && (
            <Button
              type="button"
              variant="outline"
              onClick={onSetVoice}
              disabled={busy}
              className="justify-start gap-2"
            >
              <Mic className="h-4 w-4" />
              Set a voice
            </Button>
          )}
        </div>

        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
          <div className="flex gap-2">
            <VolumeX className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
            <p className="text-xs leading-relaxed text-[var(--sketch-fg-muted)]">
              <span className="font-semibold text-[var(--sketch-fg)]">
                Continue anyway
              </span>{" "}
              sets Voice to None and turns captions off. The exported video
              will contain no generated narration or spoken-word captions.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={busy}
          >
            Keep editing
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onContinueSilently}
            disabled={busy}
            className="gap-2 border-red-500/35 text-red-600 hover:bg-red-500/10 hover:text-red-600"
          >
            <VolumeX className="h-4 w-4" />
            {busy ? "Preparing silent export..." : "Continue without voice & captions"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
