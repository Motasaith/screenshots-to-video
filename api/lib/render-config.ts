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

/** Credit cost per render based on resolution. */
export const CREDIT_COST: Record<"720p" | "1080p" | "4k", number> = {
  "720p": 1,
  "1080p": 2,
  "4k": 4,
};

/** Minimum credits required to start a render (checked before queueing). */
export const MIN_CREDITS_TO_RENDER = 1;

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