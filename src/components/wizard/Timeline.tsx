/**
 * Simple Timeline Component — thumbnail strip with transitions
 *
 * Shows screenshots/video thumbnails in order with transition buttons between them.
 * Supports drag-to-reorder, trim (duration adjustment), and add scene.
 * No playhead, no split, no zoom — just a clean strip like the original.
 */

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Trash2,
  Plus,
  Film,
  Loader2,
  Upload,
  Clapperboard,
  Flag,
} from "lucide-react";

export interface TimelineClip {
  id: number;
  order: number;
  name: string;
  thumbnail?: string | null;
  duration: number;
  transition?: string | null;
  isVideo?: boolean;
  audioPath?: string | null;
}

export interface TimelineProps {
  clips: TimelineClip[];
  currentIndex: number;
  onClipSelect: (index: number) => void;
  onClipReorder: (fromIndex: number, toIndex: number) => void;
  onClipDelete: (index: number) => void;
  onClipTrim: (index: number, newDuration: number) => void;
  onAddClip: () => void;
  onDropFiles?: (files: FileList) => void;
  onDropPexels?: (media: { id: number; src: string; type: string; photographer?: string; thumbnail?: string }) => void;
  uploadingCount?: number;
  transitions?: Record<number, string>;
  onTransitionClick?: (clipId: number) => void;
  // Intro/outro
  introTemplate?: string | null;
  introText?: string | null;
  introVideoPath?: string | null;
  introDuration?: number | null;
  outroTemplate?: string | null;
  outroText?: string | null;
  outroVideoPath?: string | null;
  outroDuration?: number | null;
  onIntroClick?: () => void;
  onOutroClick?: () => void;
}

const MIN_DURATION = 1;
const MAX_DURATION = 60;

export default function Timeline({
  clips,
  currentIndex,
  onClipSelect,
  onClipReorder,
  onClipDelete,
  onClipTrim,
  onAddClip,
  onDropFiles,
  onDropPexels,
  uploadingCount = 0,
  transitions,
  onTransitionClick,
  introTemplate,
  introText,
  introVideoPath,
  introDuration,
  outroTemplate,
  outroText,
  outroVideoPath,
  outroDuration,
  onIntroClick,
  onOutroClick,
}: TimelineProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [trimClip, setTrimClip] = useState<{ index: number; startX: number; startDuration: number } | null>(null);

  // Trim handlers
  useEffect(() => {
    if (!trimClip) return;
    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - trimClip.startX;
      const deltaSec = delta * 0.1;
      const newDur = Math.max(MIN_DURATION, Math.min(MAX_DURATION, trimClip.startDuration + deltaSec));
      onClipTrim(trimClip.index, Math.round(newDur * 10) / 10);
    };
    const handleMouseUp = () => setTrimClip(null);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [trimClip, onClipTrim]);

  // Drag-to-reorder
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (draggedIndex !== null) {
      e.preventDefault();
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex !== null && draggedIndex !== index) {
      onClipReorder(draggedIndex, index);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // File / Pexels drop
  const handleTrackDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer?.types?.includes("Files") || e.dataTransfer?.types?.includes("application/x-pexels-media")) {
      e.preventDefault();
      setIsDragOver(true);
    }
  };

  const handleTrackDrop = (e: React.DragEvent) => {
    const pexelsData = e.dataTransfer.getData("application/x-pexels-media");
    if (pexelsData && onDropPexels) {
      e.preventDefault();
      setIsDragOver(false);
      try { onDropPexels(JSON.parse(pexelsData)); } catch {}
      return;
    }
    if (e.dataTransfer?.files?.length && onDropFiles) {
      e.preventDefault();
      setIsDragOver(false);
      onDropFiles(e.dataTransfer.files);
    }
  };

  const totalDuration = useMemo(() => clips.reduce((sum, c) => sum + c.duration, 0), [clips]);

  return (
    <div
      className={`bg-[var(--sketch-toolbar-bg)] border-t-2 border-[var(--sketch-border-color)] flex flex-col select-none transition-all ${
        isDragOver ? "ring-2 ring-[#FBBF24] bg-[#FBBF24]/5" : ""
      }`}
    >
      {/* Controls bar — minimal */}
      <div className="flex items-center justify-between px-3 py-1.5 gap-3 border-b border-[var(--sketch-border-color)]/30">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[var(--sketch-fg-muted)]">
            {clips.length} scene{clips.length !== 1 ? "s" : ""} · {totalDuration.toFixed(1)}s total
          </span>
          {uploadingCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-[var(--sketch-fg-subtle)]">
              <Loader2 className="w-3 h-3 animate-spin" />
              Uploading {uploadingCount}...
            </span>
          )}
        </div>
      </div>

      {/* Scene strip */}
      <div
        className="flex items-center gap-2 overflow-x-auto p-2 min-h-[80px]"
        onDragOver={handleTrackDragOver}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleTrackDrop}
      >
        {clips.length === 0 ? (
          <div
            onClick={onAddClip}
            className="w-full py-3 border-2 border-dashed border-[var(--sketch-border-color)]/20 rounded-lg flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-[var(--sketch-border-color)]/40 transition-colors"
          >
            <Upload className="w-5 h-5 text-[var(--sketch-fg-subtle)] animate-bounce" />
            <p className="text-[10px] font-semibold text-[var(--sketch-fg-muted)]">
              Drop screenshots here or click to upload
            </p>
          </div>
        ) : (
          <>
            {/* Intro button */}
            <button
              onClick={() => onIntroClick?.()}
              className={`flex-shrink-0 w-20 aspect-video rounded-md border-2 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all ${
                introTemplate && introTemplate !== "none"
                  ? "border-[var(--sketch-accent)] bg-[var(--sketch-accent)]/10"
                  : "border-dashed border-[var(--sketch-border-color)]/30 bg-[var(--sketch-fg-subtle)]/5 hover:border-[var(--sketch-accent)]/50"
              }`}
              title={introTemplate && introTemplate !== "none" ? `Intro: ${introTemplate}` : "Add Intro"}
            >
              <Clapperboard className={`w-4 h-4 ${introTemplate && introTemplate !== "none" ? "text-[var(--sketch-accent)]" : "text-[var(--sketch-fg-subtle)]"}`} />
              <span className={`text-[7px] font-bold ${introTemplate && introTemplate !== "none" ? "text-[var(--sketch-accent)]" : "text-[var(--sketch-fg-subtle)]"}`}>
                {introTemplate && introTemplate !== "none" ? "INTRO" : "+ Intro"}
              </span>
              {introDuration && introTemplate && introTemplate !== "none" && (
                <span className="text-[6px] font-mono text-[var(--sketch-fg-subtle)]">{introDuration.toFixed(1)}s</span>
              )}
            </button>

            {/* Transition between intro and first scene */}
            {introTemplate && introTemplate !== "none" && clips.length > 0 && (
              <button
                className="w-5 h-5 rotate-45 bg-[var(--sketch-accent)]/20 border-2 border-[var(--sketch-accent)] flex items-center justify-center flex-shrink-0"
                title="Intro transition: fade"
              >
                <Film className="w-2.5 h-2.5 -rotate-45 text-[var(--sketch-accent)]" />
              </button>
            )}
            {clips.map((clip, idx) => {
              const isActive = idx === currentIndex;
              const isDragged = idx === draggedIndex;
              const isDragOverTarget = idx === dragOverIndex;

              return (
                <div
                  key={clip.id}
                  className="flex-shrink-0 flex items-center gap-1.5 group/scene"
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                >
                  {/* Scene thumbnail */}
                  <div className="relative flex flex-col">
                    {isActive && (
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#FBBF24] rotate-45 z-20" />
                    )}
                    <button
                      onClick={() => onClipSelect(idx)}
                      className={`relative w-24 aspect-video rounded-md overflow-hidden border-2 transition-all ${
                        isActive
                          ? "border-[#FBBF24] shadow-[0_0_10px_rgba(251,191,36,0.3)]"
                          : "border-[var(--sketch-border-color)]/30 hover:border-[var(--sketch-accent)]/50"
                      } ${isDragged ? "opacity-40" : ""} ${isDragOverTarget ? "ring-2 ring-[#FBBF24]/40" : ""}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 text-[8px] font-bold px-1 rounded z-10 ${
                        isActive ? "bg-[#FBBF24] text-black" : "bg-black/60 text-white"
                      }`}>
                        {idx + 1}
                      </span>
                      {clip.thumbnail ? (
                        <img
                          src={clip.thumbnail}
                          alt={`Scene ${idx + 1}`}
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <div className="w-full h-full bg-[var(--sketch-panel-bg)] flex items-center justify-center">
                          <Film className="w-4 h-4 text-[var(--sketch-fg-subtle)]" />
                        </div>
                      )}
                      {clip.isVideo && (
                        <span className="absolute top-0.5 right-0.5 text-[7px] font-bold px-1 rounded bg-red-500/80 text-white z-10">
                          VIDEO
                        </span>
                      )}
                      {clip.audioPath && (
                        <span className="absolute bottom-0.5 right-0.5 text-[7px] font-bold px-1 rounded bg-blue-600/80 text-white z-10 flex items-center gap-0.5">
                          <span className="w-1 h-1 bg-white rounded-full" />
                          AUDIO
                        </span>
                      )}
                    </button>

                    {/* Duration + delete */}
                    <div className="flex items-center justify-between mt-0.5 px-0.5">
                      <span className="text-[8px] font-mono text-[var(--sketch-fg-subtle)]">
                        {clip.duration.toFixed(1)}s
                      </span>
                      <button
                        onClick={() => onClipDelete(idx)}
                        className="opacity-0 group-hover/scene:opacity-100 transition-opacity text-red-500 hover:text-red-600 cursor-pointer"
                        title="Delete scene"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>

                  {/* Transition button between scenes */}
                  {idx < clips.length - 1 && (() => {
                    const nextClip = clips[idx + 1];
                    const appliedTransition = transitions?.[nextClip.id] || "fade";
                    const hasCustomTransition = transitions?.[nextClip.id] !== undefined;
                    return (
                      <button
                        onClick={() => onTransitionClick?.(nextClip.id)}
                        className={`w-5 h-5 rotate-45 flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
                          hasCustomTransition
                            ? "bg-[var(--sketch-accent)]/20 border-2 border-[var(--sketch-accent)]"
                            : "bg-[var(--sketch-panel-bg)] border border-[var(--sketch-border-color)]/30 hover:border-[var(--sketch-accent)]/50"
                        }`}
                        title={`Transition: ${appliedTransition}`}
                      >
                        <Film className={`w-2.5 h-2.5 -rotate-45 ${hasCustomTransition ? "text-[var(--sketch-accent)]" : "text-[var(--sketch-fg-muted)]"}`} />
                      </button>
                    );
                  })()}
                </div>
              );
            })}

            {/* Add Scene button at the end */}
            <button
              onClick={onAddClip}
              className="flex-shrink-0 w-24 aspect-video rounded-md bg-[var(--sketch-fg-subtle)]/5 hover:bg-[var(--sketch-fg-subtle)]/10 border-2 border-dashed border-[var(--sketch-border-color)]/30 hover:border-[var(--sketch-accent)]/50 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all"
              title="Add Scene"
            >
              <Plus className="w-4 h-4 text-[var(--sketch-fg-muted)]" />
              <span className="text-[8px] font-semibold text-[var(--sketch-fg-subtle)]">Add Scene</span>
            </button>

            {/* Transition between last scene and outro */}
            {outroTemplate && outroTemplate !== "none" && clips.length > 0 && (
              <button
                className="w-5 h-5 rotate-45 bg-[var(--sketch-accent)]/20 border-2 border-[var(--sketch-accent)] flex items-center justify-center flex-shrink-0"
                title="Outro transition: fade"
              >
                <Film className="w-2.5 h-2.5 -rotate-45 text-[var(--sketch-accent)]" />
              </button>
            )}

            {/* Outro button */}
            <button
              onClick={() => onOutroClick?.()}
              className={`flex-shrink-0 w-20 aspect-video rounded-md border-2 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all ${
                outroTemplate && outroTemplate !== "none"
                  ? "border-[var(--sketch-accent)] bg-[var(--sketch-accent)]/10"
                  : "border-dashed border-[var(--sketch-border-color)]/30 bg-[var(--sketch-fg-subtle)]/5 hover:border-[var(--sketch-accent)]/50"
              }`}
              title={outroTemplate && outroTemplate !== "none" ? `Outro: ${outroTemplate}` : "Add Outro"}
            >
              <Flag className={`w-4 h-4 ${outroTemplate && outroTemplate !== "none" ? "text-[var(--sketch-accent)]" : "text-[var(--sketch-fg-subtle)]"}`} />
              <span className={`text-[7px] font-bold ${outroTemplate && outroTemplate !== "none" ? "text-[var(--sketch-accent)]" : "text-[var(--sketch-fg-subtle)]"}`}>
                {outroTemplate && outroTemplate !== "none" ? "OUTRO" : "+ Outro"}
              </span>
              {outroDuration && outroTemplate && outroTemplate !== "none" && (
                <span className="text-[6px] font-mono text-[var(--sketch-fg-subtle)]">{outroDuration.toFixed(1)}s</span>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}