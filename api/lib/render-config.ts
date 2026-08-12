/**
 * Render queue, concurrency, and storage retention configuration.
 *
 * These constants control how the render worker processes jobs, how many
 * concurrent renders are allowed, and how long generated videos are kept
 * in storage before automatic cleanup.
 *
 * All values are tuned for a single-server deployment running FFmpeg
 * with limited CPU/memory. Adjust based on your server capacity.
 */

// ── Render Queue ──

/** Maximum number of jobs allowed in the queue at once (across all users). */
export const MAX_QUEUE_DEPTH = 20;

/** Maximum concurrent renders a single user can have queued/processing. */
export const MAX_CONCURRENT_RENDERS_PER_USER = 1;

/** Polling interval for the render worker (ms). */
export const WORKER_POLL_INTERVAL_MS = 5000;

/**
 * How many scene segments to render at once within a single job.
 *
 * Each concurrent render is a separate FFmpeg process holding a supersampled
 * 3840x2160 frame buffer, so this is memory-bound rather than CPU-bound. 2 is
 * safe on a small VPS; raise it if you have cores and RAM to spare, but the
 * returns taper because x264 already uses every core during the encode phase
 * (measured: 4 concurrent on a 4-core box was 1.36x, not 4x).
 */
export const SEGMENT_CONCURRENCY = Number(process.env.SEGMENT_CONCURRENCY) || 2;

/**
 * Maximum time a single render job is allowed to run before it's
 * considered stuck and automatically marked as error (ms).
 * Default: 15 minutes. A 10-step 1080p video typically takes 3-8 min.
 */
export const RENDER_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * How often to check for and abort stuck/timeout jobs (ms).
 * Runs alongside the normal poll loop.
 */
export const STUCK_JOB_CHECK_INTERVAL_POLLS = 12; // every ~60 seconds

// ── Storage Retention (per plan) ──

/**
 * How long completed videos are kept in storage before automatic deletion.
 * After expiry, the video file and all associated assets (screenshots,
 * audio, segments) are deleted from R2/B2. The project metadata stays
 * in the database so users can see their history.
 */
export const RETENTION_DAYS: Record<"free" | "pro" | "team", number | null> = {
  free: 7, // 7 days
  pro: 90, // 90 days
  team: 365, // 1 year
};

/**
 * Grace period before a project's assets are deleted after the user
 * deletes the project from their dashboard (ms).
 * This allows for undo within a short window.
 */
export const DELETE_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Credits ──

/**
 * Credit cost per render.
 * Since we currently only export in one quality (1080p), each render costs 1 credit.
 * If multiple resolutions are added later, update this map.
 */
export const CREDIT_COST: Record<"720p" | "1080p" | "4k", number> = {
  "720p": 1,
  "1080p": 1,
  "4k": 1,
};

/** Minimum credits required to start a render (checked before queueing). */
export const MIN_CREDITS_TO_RENDER = 1;

// ── Plan Limits ──

/**
 * Video creation limits per plan.
 * Free: 14 videos per week
 * Pro: Unlimited
 * Team: Unlimited
 */
/**
 * The highest resolution each plan may render.
 *
 * 4K is the Team differentiator, and it is also four times the pixels for the same
 * credit, so it is not something to leave open by omission. Enforced where the
 * resolution is set and again at render time, because a project created before a
 * downgrade would otherwise keep its 4K setting.
 */
export const MAX_RESOLUTION: Record<"free" | "pro" | "team", "720p" | "1080p" | "4k"> = {
  free: "720p",
  pro: "1080p",
  team: "4k",
};

/** Ordered worst to best, so two resolutions can be compared. */
export const RESOLUTION_ORDER = ["720p", "1080p", "4k"] as const;

/** Whether a plan may use a resolution. */
export function planAllowsResolution(
  plan: "free" | "pro" | "team",
  resolution: string
): boolean {
  const wanted = RESOLUTION_ORDER.indexOf(resolution as (typeof RESOLUTION_ORDER)[number]);
  const ceiling = RESOLUTION_ORDER.indexOf(MAX_RESOLUTION[plan]);
  // An unrecognised resolution is refused rather than allowed by accident.
  return wanted >= 0 && wanted <= ceiling;
}

/** The best resolution a plan can have, for clamping an existing project. */
export function clampResolution(
  plan: "free" | "pro" | "team",
  resolution: string
): "720p" | "1080p" | "4k" {
  if (planAllowsResolution(plan, resolution)) {
    return resolution as "720p" | "1080p" | "4k";
  }

  // A value this code does not recognise must not become the most expensive option
  // available. `projects.resolution` is an enum so it should never happen, and if it
  // does, 1080p is the sane reading of "something went wrong" rather than 4K.
  const known = RESOLUTION_ORDER.includes(resolution as (typeof RESOLUTION_ORDER)[number]);
  if (!known) {
    return planAllowsResolution(plan, "1080p") ? "1080p" : MAX_RESOLUTION[plan];
  }

  return MAX_RESOLUTION[plan];
}

/** Default credits given to new free users. */
export const DEFAULT_CREDITS = 14;

/** Credits reset period in days (free users get credits reset weekly). */
export const CREDITS_RESET_DAYS: Record<"free" | "pro" | "team", number> = {
  free: 7,    // weekly reset
  pro: 30,    // monthly reset
  team: 30,   // monthly reset
};

// ── Storage Alerts ──

/**
 * Storage usage threshold (in GB) at which an admin alert is triggered.
 * The admin dashboard will show a warning when total storage exceeds this.
 */
export const STORAGE_ALERT_THRESHOLD_GB = 50;

/**
 * Maximum total storage allowed (in GB). New renders will be rejected
 * if storage exceeds this limit to prevent bill surprises.
 */
export const STORAGE_HARD_LIMIT_GB = 100;