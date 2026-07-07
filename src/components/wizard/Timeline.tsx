/**
 * NLE-style Timeline Component
 *
 * Features:
 * - Horizontal track with clip blocks sized by duration
 * - Playhead with scrubbing
 * - Drag-to-reorder clips
 * - Trim handles (in/out points) on each clip
 * - Split clip at playhead
 * - Snap-to-grid
 * - Zoom level (pixels per second)
 */

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Play,
  Pause,
  Scissors,
  Trash2,
  Plus,
  ZoomIn,
  ZoomOut,
  GripVertical,
  Film,
  Loader2,
  Upload,
  ArrowRightLeft,
} from "lucide-react";
import type { TransitionType } from "@/hooks/useWizardStore";

export interface TimelineClip {
  id: number;
  order: number;
  name: string;
  thumbnail?: string | null;
  duration: number; // seconds
  transition?: string | null;
  isVideo?: boolean;
}

export interface TimelineProps {
  clips: TimelineClip[];
  currentIndex: number;
  onClipSelect: (index: number) => void;
  onClipReorder: (fromIndex: number, toIndex: number) => void;
  onClipDelete: (index: number) => void;
  onClipTrim: (index: number, newDuration: number) => void;
  onClipSplit: (index: number, splitAtSeconds: number) => void;
  onAddClip: () => void;
  onDropFiles?: (files: FileList) => void;
  onDropPexels?: (media: { id: number; src: string; type: string; photographer?: string; thumbnail?: string }) => void;
  uploadingCount?: number;
  isPlaying?: boolean;
  onPlayToggle?: () => void;
  transitions?: Record<number, TransitionType>;
  onTransitionClick?: (clipId: number) => void;
}

const MIN_DURATION = 1;
const MAX_DURATION = 60;
const MIN_PX_PER_SEC = 20;
const MAX_PX_PER_SEC = 120;
const DEFAULT_PX_PER_SEC = 50;
const TRACK_HEIGHT = 80;
const RULER_HEIGHT = 24;

export default function Timeline({
  clips,
  currentIndex,
  onClipSelect,
  onClipReorder,
  onClipDelete,
  onClipTrim,
  onClipSplit,
  onAddClip,
  onDropFiles,
  onDropPexels,
  uploadingCount = 0,
  isPlaying = false,
  onPlayToggle,
  transitions,
  onTransitionClick,
}: TimelineProps) {
  const [pxPerSec, setPxPerSec] = useState(DEFAULT_PX_PER_SEC);
  const [playheadSec, setPlayheadSec] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [trimClip, setTrimClip] = useState<{ index: number; side: "left" | "right"; startX: number; startDuration: number } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const trackRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);

  // Total duration of all clips
  const totalDuration = useMemo(() => clips.reduce((sum, c) => sum + c.duration, 0), [clips]);
  const trackWidth = totalDuration * pxPerSec;

  // Convert seconds to pixels
  const secToPx = (s: number) => s * pxPerSec;
  // Convert pixels to seconds
  const pxToSec = (p: number) => p / pxPerSec;

  // Get clip start time (cumulative)
  const clipStarts = useMemo(() => {
    const starts: number[] = [];
    let acc = 0;
    clips.forEach((c) => { starts.push(acc); acc += c.duration; });
    return starts;
  }, [clips]);

  // Playhead position in pixels
  const playheadPx = secToPx(playheadSec);

  // Scrubbing handlers
  const handleRulerMouseDown = (e: React.MouseEvent) => {
    if (!trackRef.current) return;
    setIsScrubbing(true);
    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + trackRef.current.scrollLeft;
    setPlayheadSec(Math.max(0, Math.min(totalDuration, pxToSec(x))));
  };

  useEffect(() => {
    if (!isScrubbing) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + trackRef.current.scrollLeft;
      setPlayheadSec(Math.max(0, Math.min(totalDuration, pxToSec(x))));
    };
    const handleMouseUp = () => setIsScrubbing(false);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isScrubbing, totalDuration, pxPerSec]);

  // Trim handlers
  useEffect(() => {
    if (!trimClip) return;
    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - trimClip.startX;
      const deltaSec = pxToSec(delta);
      if (trimClip.side === "right") {
        const newDur = Math.max(MIN_DURATION, Math.min(MAX_DURATION, trimClip.startDuration + deltaSec));
        onClipTrim(trimClip.index, newDur);
      } else {
        // Left trim: increasing duration from left (keeping right edge fixed)
        const newDur = Math.max(MIN_DURATION, Math.min(MAX_DURATION, trimClip.startDuration - deltaSec));
        onClipTrim(trimClip.index, newDur);
      }
    };
    const handleMouseUp = () => setTrimClip(null);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [trimClip, pxPerSec, onClipTrim]);

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

  // File / Pexels drop on empty area
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

  // Split at playhead
  const handleSplit = () => {
    if (clips.length === 0) return;
    // Find which clip the playhead is on
    let acc = 0;
    for (let i = 0; i < clips.length; i++) {
      if (playheadSec >= acc && playheadSec < acc + clips[i].duration) {
        onClipSplit(i, playheadSec - acc);
        return;
      }
      acc += clips[i].duration;
    }
  };

  // Format time as MM:SS.s
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toFixed(1).padStart(4, "0")}`;
  };

  // Ruler ticks
  const tickInterval = pxPerSec < 30 ? 5 : pxPerSec < 60 ? 2 : 1;
  const ticks = useMemo(() => {
    const arr: number[] = [];
    for (let t = 0; t <= totalDuration; t += tickInterval) arr.push(t);
    if (arr[arr.length - 1] < totalDuration) arr.push(totalDuration);
    return arr;
  }, [totalDuration, tickInterval]);

  return (
    <div
      className={`bg-[var(--sketch-toolbar-bg)] border-t-2 border-[var(--sketch-border-color)] flex flex-col select-none transition-all ${
        isDragOver ? "ring-2 ring-[#FBBF24] bg-[#FBBF24]/5" : ""
      }`}
    >
      {/* Hidden file input for Add Clip */}
      {/* Controls bar */}
      <div className="flex items-center justify-between px-3 py-2 gap-3 border-b border-[var(--sketch-border-color)]/30">
        {/* Left: Play + time */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPlayToggle}
            className="w-7 h-7 rounded-full bg-[var(--sketch-accent)] hover:opacity-90 text-white flex items-center justify-center transition-opacity cursor-pointer shadow-sm"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>
          <span className="text-[11px] font-mono text-[var(--sketch-fg-muted)] tabular-nums">
            {formatTime(playheadSec)} / {formatTime(totalDuration)}
          </span>
        </div>

        {/* Center: Split + Add */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleSplit}
            disabled={clips.length === 0}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-[var(--sketch-fg-subtle)]/10 hover:bg-[var(--sketch-fg-subtle)]/20 text-[var(--sketch-fg-muted)] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="Split clip at playhead"
          >
            <Scissors className="w-3 h-3" />
            Split
          </button>
          <button
            onClick={onAddClip}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-[var(--sketch-accent)]/15 hover:bg-[var(--sketch-accent)]/25 text-[var(--sketch-fg)] transition-colors cursor-pointer"
            title="Add new clip"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
          {uploadingCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-[var(--sketch-fg-subtle)]">
              <Loader2 className="w-3 h-3 animate-spin" />
              Uploading {uploadingCount}...
            </span>
          )}
        </div>

        {/* Right: Zoom controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPxPerSec((p) => Math.max(MIN_PX_PER_SEC, p - 10))}
            className="p-1 rounded hover:bg-[var(--sketch-fg-subtle)]/10 text-[var(--sketch-fg-muted)] cursor-pointer"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono text-[var(--sketch-fg-subtle)] w-10 text-center">
            {Math.round((pxPerSec / DEFAULT_PX_PER_SEC) * 100)}%
          </span>
          <button
            onClick={() => setPxPerSec((p) => Math.min(MAX_PX_PER_SEC, p + 10))}
            className="p-1 rounded hover:bg-[var(--sketch-fg-subtle)]/10 text-[var(--sketch-fg-muted)] cursor-pointer"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Timeline track area */}
      <div
        ref={trackRef}
        className="overflow-x-auto overflow-y-hidden relative"
        style={{ maxHeight: RULER_HEIGHT + TRACK_HEIGHT + 8 }}
        onDragOver={handleTrackDragOver}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleTrackDrop}
      >
        {/* Ruler */}
        <div
          className="relative flex-shrink-0 cursor-pointer"
          style={{ height: RULER_HEIGHT, width: Math.max(trackWidth, 200), background: "transparent" }}
          onMouseDown={handleRulerMouseDown}
        >
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute top-0 bottom-0 border-l border-[var(--sketch-border-color)]/40"
              style={{ left: secToPx(t) }}
            >
              <span className="absolute top-0.5 left-1 text-[8px] font-mono text-[var(--sketch-fg-subtle)]">
                {formatTime(t)}
              </span>
            </div>
          ))}
        </div>

        {/* Track */}
        <div
          className="relative flex items-stretch"
          style={{ height: TRACK_HEIGHT, width: Math.max(trackWidth, 200), minHeight: TRACK_HEIGHT }}
        >
          {clips.length === 0 ? (
            /* Empty state */
            <div className="flex-1 flex items-center justify-center text-center py-4">
              <div className="flex flex-col items-center gap-1.5">
                <Upload className="w-6 h-6 text-[var(--sketch-fg-subtle)] animate-bounce" />
                <p className="text-[10px] text-[var(--sketch-fg-muted)]">
                  Drop screenshots, videos, or Pexels media here
                </p>
                <button
                  onClick={onAddClip}
                  className="text-[10px] text-[var(--sketch-accent)] font-semibold hover:underline cursor-pointer"
                >
                  or click Add to upload
                </button>
              </div>
            </div>
          ) : (
            /* Clips */
            clips.map((clip, idx) => {
              const clipLeft = secToPx(clipStarts[idx]);
              const clipWidth = secToPx(clip.duration);
              const isActive = idx === currentIndex;
              const isDragged = idx === draggedIndex;
              const isDragOverTarget = idx === dragOverIndex;

              return (
                <div
                  key={clip.id}
                  className={`absolute top-0 bottom-0 flex items-center group/clip transition-all ${
                    isDragged ? "opacity-40" : ""
                  }`}
                  style={{
                    left: clipLeft,
                    width: clipWidth,
                  }}
                >
                  {/* Drop indicator */}
                  {isDragOverTarget && draggedIndex !== null && idx !== draggedIndex && (
                    <div className="absolute -left-1 top-0 bottom-0 w-0.5 bg-[#FBBF24] z-20" />
                  )}

                  {/* Clip body */}
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onClipSelect(idx)}
                    className={`relative w-full h-full rounded-md overflow-hidden cursor-grab active:cursor-grabbing border-2 transition-all ${
                      isActive
                        ? "border-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.3)] z-10"
                        : "border-[var(--sketch-border-color)]/40 hover:border-[var(--sketch-accent)]/50"
                    } ${isDragOverTarget ? "ring-2 ring-blue-600/40" : ""}`}
                    style={{
                      background: clip.thumbnail ? `url(${clip.thumbnail}) center/cover` : "var(--sketch-panel-bg)",
                    }}
                  >
                    {/* Dark gradient overlay for readability */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/50 pointer-events-none" />

                    {/* Left trim handle */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-black/30 hover:bg-[#FBBF24]/60 flex items-center justify-center opacity-0 group-hover/clip:opacity-100 transition-opacity z-10"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setTrimClip({ index: idx, side: "left", startX: e.clientX, startDuration: clip.duration });
                      }}
                    >
                      <GripVertical className="w-2.5 h-2.5 text-white/70" />
                    </div>

                    {/* Right trim handle */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-black/30 hover:bg-[#FBBF24]/60 flex items-center justify-center opacity-0 group-hover/clip:opacity-100 transition-opacity z-10"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setTrimClip({ index: idx, side: "right", startX: e.clientX, startDuration: clip.duration });
                      }}
                    >
                      <GripVertical className="w-2.5 h-2.5 text-white/70" />
                    </div>

                    {/* Clip info overlay */}
                    <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-1.5 py-0.5 pointer-events-none">
                      <span className={`text-[9px] font-bold px-1 rounded ${isActive ? "bg-[#FBBF24] text-black" : "bg-black/60 text-white"}`}>
                        {idx + 1}
                      </span>
                      {clip.isVideo && (
                        <span className="text-[7px] font-bold px-1 py-0.5 rounded bg-red-500/80 text-white">VIDEO</span>
                      )}
                    </div>

                    {/* Duration label */}
                    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-1.5 py-0.5 pointer-events-none">
                      <span className="text-[8px] font-mono text-white/80 bg-black/40 px-1 rounded">
                        {clip.duration.toFixed(1)}s
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); onClipDelete(idx); }}
                        className="opacity-0 group-hover/clip:opacity-100 text-red-400 hover:text-red-300 transition-opacity pointer-events-auto cursor-pointer"
                        title="Delete clip"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Active playhead indicator */}
                    {isActive && (
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#FBBF24] rotate-45 z-20" />
                    )}
                  </div>

                  {/* Transition between this clip and next */}
                  {idx < clips.length - 1 && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-30">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onTransitionClick && clips[idx + 1]) {
                            onTransitionClick(clips[idx + 1].id);
                          }
                        }}
                        className={`flex items-center justify-center transition-all cursor-pointer shadow-md rounded-full border-2 ${
                          transitions?.[clips[idx + 1]?.id] && transitions[clips[idx + 1].id] !== "none"
                            ? "w-8 h-5 bg-blue-600 border-blue-600 hover:bg-blue-700 hover:scale-110" 
                            : "w-5 h-5 bg-[var(--sketch-panel-bg)] border-[var(--sketch-border-color)] hover:border-[var(--sketch-accent)] hover:scale-110"
                        }`}
                        title="Transition"
                      >
                        {transitions?.[clips[idx + 1]?.id] && transitions[clips[idx + 1].id] !== "none" ? (
                          <ArrowRightLeft className="w-3 h-3 text-white" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--sketch-fg-muted)]" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Playhead */}
          {clips.length > 0 && (
            <div
              ref={playheadRef}
              className="absolute top-0 bottom-0 w-0.5 bg-blue-600 pointer-events-none z-20"
              style={{ left: playheadPx }}
            >
              {/* Downward pointing triangle at the top */}
              <div 
                className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-blue-600"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}