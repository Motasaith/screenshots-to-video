/**
 * The render worker, as its own process.
 *
 * It used to run inside the API process. Nothing crashed, because the worker
 * takes one job at a time, but two ffmpeg processes and the web server shared the
 * same cores, so every page in the app got slow whenever anybody rendered. This
 * entry point exists so the operating system can be told they are different
 * things: give the API the responsiveness and let the worker have the rest.
 *
 * The queue is a database table claimed with a conditional update that checks
 * `affectedRows`, so several of these can run at once, on this machine or another,
 * without two of them taking the same job.
 *
 * One dependency to know about before moving this to a second machine: render
 * inputs are written to local disk by `saveLocalFile`, so a worker elsewhere
 * cannot read them. Same machine works today. A different machine needs uploads
 * moved to object storage first.
 */

import { env } from "./lib/env";
import { logger } from "./lib/logger";
import { startRenderWorker, stopRenderWorker } from "./lib/worker";

const label = env.isProduction ? "production" : "development";
logger.info(`Render worker process starting (${label})`);

startRenderWorker();

/**
 * Stop claiming work, let the render in flight finish, then exit.
 *
 * A job killed mid-render stays `processing` until the stuck-job sweep reclaims
 * it, which takes up to `RENDER_TIMEOUT_MS`. Draining instead means a deploy
 * costs the user nothing. `kill_timeout` in the pm2 config is what gives this
 * time to happen; a render still running when that expires falls back to the
 * sweep, which is the old behaviour rather than a new failure.
 */
let shuttingDown = false;
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received, draining the render worker`);
    void stopRenderWorker().then(() => {
      logger.info("Render worker drained, exiting");
      process.exit(0);
    });
  });
}

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection in the render worker", reason);
});
