/**
 * Two processes, on purpose.
 *
 * The render worker used to run inside the API process. Nothing crashed, because
 * it takes one job at a time, but two ffmpeg processes and the web server were
 * competing for the same cores, so every page in the app went slow whenever
 * anybody rendered. Splitting them lets the API stay responsive while the worker
 * uses whatever is left.
 *
 * The queue is a database table claimed with a conditional update that checks
 * affectedRows, so raising `instances` on the worker is safe: two of them cannot
 * take the same job. Raise it only as far as the CPU allows, since each render
 * runs SEGMENT_CONCURRENCY ffmpeg processes of its own.
 *
 * Render inputs live on local disk, so workers must share this machine's
 * filesystem. Moving one to another box needs uploads on object storage first.
 */
module.exports = {
  apps: [
    {
      name: "narrashot",
      script: "dist/boot.js",
      env: {
        NODE_ENV: "production",
        // The worker below handles rendering, so this process must not.
        WORKER_MODE: "external",
      },
      max_memory_restart: "1G",
      autorestart: true,
    },
    {
      name: "narrashot-worker",
      script: "dist/worker-boot.js",
      instances: 1,
      env: {
        NODE_ENV: "production",
        // In-process, a job was picked up the moment it was enqueued. Across
        // processes that wake-up call cannot arrive, so the poll becomes the
        // primary path and runs faster to keep the queue feeling immediate.
        WORKER_POLL_INTERVAL_MS: "1500",
      },
      // ffmpeg holds supersampled frame buffers, so the worker needs more
      // headroom than the API.
      max_memory_restart: "2G",
      autorestart: true,
      /**
       * Long enough for a render in flight to finish on SIGTERM. The worker
       * drains rather than abandoning the job; anything still going when this
       * expires is reclaimed by the stuck-job sweep, which is the old behaviour.
       */
      kill_timeout: 120000,
    },
  ],
};
