/**
 * How long a scene actually runs.
 *
 * Shared by the renderer and the editor on purpose. The renderer decides scene
 * length from the camera choreography, and until now the editor had no idea:
 * adding zoom points silently stretched a scene — three points on a 6s
 * narration produces a 13.5s scene with 6.5s of silence — with nothing on
 * screen to say so. Duplicating the arithmetic in the UI would have let the two
 * drift apart, so both import it from here.
 */

export const RENDER_FPS = 30;

/** Silence padding around narration so speech never starts on frame 0. */
export const AUDIO_LEAD_IN = 0.4;
export const AUDIO_TAIL = 0.6;

// ── Multi-waypoint camera motion timing (seconds) ──
// FIXED motion phases. They are never compressed to fit the audio, so pans
// always read as deliberate camera moves and the final zoom-out always
// completes. When narration is shorter than the animation needs, the clip is
// extended with trailing silence rather than the motion being squashed.
export const MW_ZOOM_IN_HOLD = 0.5; // brief wide hold before the first zoom-in
export const MW_ZOOM_IN_DUR = 1.0; // ease into the first waypoint
export const MW_PAN_DUR = 2.5; // glide between two consecutive waypoints
export const MW_ZOOM_OUT_DUR = 1.0; // ease back out after the last waypoint
export const MW_MIN_HOLD = 2.0; // floor for the per-waypoint hold time

/** Fixed (non-hold) motion seconds for a multi-waypoint timeline. */
export function multiWaypointFixedSeconds(zoomPoints: number): number {
  if (zoomPoints <= 0) return 0;
  const pans = Math.max(0, zoomPoints - 1);
  return MW_ZOOM_IN_HOLD + MW_ZOOM_IN_DUR + pans * MW_PAN_DUR + MW_ZOOM_OUT_DUR;
}

export interface SceneTiming {
  /** Seconds the camera choreography needs, regardless of narration. */
  cameraSec: number;
  /** Narration plus its lead-in and tail silence. */
  narrationSec: number;
  /** What the scene will actually run for. */
  sceneSec: number;
  /** Trailing silence added because the camera outlasts the narration. */
  silenceSec: number;
  /** True when zoom points, not narration, are setting the scene length. */
  cameraBound: boolean;
}

/**
 * Work out how long a scene will run, and why.
 *
 * Mirrors `computeMultiWaypointTotalFrames` in the renderer: the scene takes
 * whichever is longer, the padded narration or the camera choreography.
 *
 * @param zoomPoints  number of zoom waypoints on the scene
 * @param holdsSec    per-waypoint hold time; each is floored at MW_MIN_HOLD
 * @param narrationSec raw narration length, before padding
 */
export function computeSceneTiming(
  zoomPoints: number,
  holdsSec: number[],
  narrationSec: number
): SceneTiming {
  const paddedNarration = narrationSec > 0 ? narrationSec + AUDIO_LEAD_IN + AUDIO_TAIL : 0;

  if (zoomPoints <= 0) {
    return {
      cameraSec: 0,
      narrationSec: paddedNarration,
      sceneSec: paddedNarration,
      silenceSec: 0,
      cameraBound: false,
    };
  }

  const holdTotal = Array.from({ length: zoomPoints }, (_, i) =>
    Math.max(holdsSec[i] ?? MW_MIN_HOLD, MW_MIN_HOLD)
  ).reduce((a, b) => a + b, 0);

  const cameraSec = multiWaypointFixedSeconds(zoomPoints) + holdTotal;
  const sceneSec = Math.max(paddedNarration, cameraSec);

  return {
    cameraSec,
    narrationSec: paddedNarration,
    sceneSec,
    silenceSec: Math.max(0, sceneSec - paddedNarration),
    cameraBound: cameraSec > paddedNarration,
  };
}

/** The renderer's easing curve: 3t² − 2t³, clamped. */
export function smoothstep(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return 3 * c * c - 2 * c * c * c;
}

export interface CameraState {
  /** Zoom factor, 1 = fully wide. */
  zoom: number;
  /** Point the camera is centred on, as a 0-1 fraction of the image. */
  cx: number;
  cy: number;
}

/**
 * Where the camera is at time `t`, for previewing a scene without rendering it.
 *
 * Deliberately reproduces the renderer's choreography — the same fixed phases,
 * the same smoothstep, the same additive displacement between waypoints — so a
 * preview cannot promise a move the export does not perform. Waypoints are in
 * 0-1 image fractions here rather than the renderer's supersampled pixels; the
 * shape of the motion is identical.
 */
export function cameraStateAt(
  t: number,
  waypoints: Array<{ x: number; y: number; hold: number; zoom: number }>
): CameraState {
  if (waypoints.length === 0) return { zoom: 1, cx: 0.5, cy: 0.5 };

  const maxZoom = Math.max(...waypoints.map((w) => w.zoom));
  const holds = waypoints.map((w) => Math.max(w.hold, MW_MIN_HOLD));

  // Phase boundaries, mirroring computeWaypointCamera.
  const holdStarts: number[] = [];
  const holdEnds: number[] = [];
  let cursor = MW_ZOOM_IN_HOLD + MW_ZOOM_IN_DUR;
  for (let i = 0; i < waypoints.length; i++) {
    holdStarts.push(cursor);
    cursor += holds[i];
    holdEnds.push(cursor);
    if (i < waypoints.length - 1) cursor += MW_PAN_DUR;
  }

  const zoomIn = smoothstep((t - MW_ZOOM_IN_HOLD) / MW_ZOOM_IN_DUR);
  const zoomOut = smoothstep((t - holdEnds[holdEnds.length - 1]) / MW_ZOOM_OUT_DUR);
  const zoom = 1 + (maxZoom - 1) * (zoomIn - zoomOut);

  // Additive displacement: start at waypoint 0 and add each pan's ramp.
  let cx = waypoints[0].x;
  let cy = waypoints[0].y;
  for (let i = 1; i < waypoints.length; i++) {
    const ramp = smoothstep((t - holdEnds[i - 1]) / MW_PAN_DUR);
    cx += (waypoints[i].x - waypoints[i - 1].x) * ramp;
    cy += (waypoints[i].y - waypoints[i - 1].y) * ramp;
  }

  return { zoom, cx, cy };
}

/** Rough narration length for a script, for previewing before TTS runs. */
export function estimateNarrationSeconds(script: string, speed = 1): number {
  const words = script.trim().split(/\s+/).filter(Boolean).length;
  if (!words) return 0;
  // ~150 wpm is typical for the neutral TTS voices used here.
  return (words / 150) * 60 / (speed || 1);
}
