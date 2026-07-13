import { getDb } from "../queries/connection";
import { projects, steps, renderJobs, users } from "@db/schema";
import { eq, and, lt } from "drizzle-orm";
import { uploadToR2, downloadFromR2, deleteFromR2 } from "./r2";
import { generateTTSAudio, speedToRate } from "./tts";
import {
  renderStepVideo,
  concatenateSegments,
  concatenateSegmentsWithTransitions,
  renderTextSegment,
  resolutionToSize,
  cleanupTempFiles,
  mixBackgroundMusic,
  probeMediaDuration
} from "./ffmpeg";
import { cleanupExpiredProjects } from "./cleanup";
import { logger } from "./logger";
import { RETENTION_DAYS, RENDER_TIMEOUT_MS, STUCK_JOB_CHECK_INTERVAL_POLLS, CREDIT_COST } from "./render-config";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { nanoid } from "nanoid";

const POLL_INTERVAL_MS = 5000;
let pollCount = 0;

let lastErrorMsg = "";

/**
 * Start the background render worker.
 * Polls the render_jobs table for queued jobs and processes them.
 */
export function startRenderWorker(): void {
  const workerId = nanoid();
  (globalThis as any).__aivideo_worker_id__ = workerId;

  logger.info(`Render worker started (Instance ID: ${workerId}), polling every ${POLL_INTERVAL_MS} ms`);

  const poll = async () => {
    if ((globalThis as any).__aivideo_worker_id__ !== workerId) {
      logger.info(`Stale render worker instance (ID: ${workerId}) detected new worker active, exiting loop.`);
      return;
    }

    try {
      // Run cleanup every 10th poll (~50 seconds)
      pollCount++;
      if (pollCount % 10 === 0) {
        const cleaned = await cleanupExpiredProjects();
        if (cleaned > 0) {
          logger.info(`Cleaned up ${cleaned} expired projects`);
        }
      }

      // Check for stuck/timeout jobs every STUCK_JOB_CHECK_INTERVAL_POLLS polls
      if (pollCount % STUCK_JOB_CHECK_INTERVAL_POLLS === 0) {
        await abortStuckJobs();
      }

      await processNextJob();
      lastErrorMsg = ""; // Clear error on success
    } catch (err: any) {
      if (err.message !== lastErrorMsg) {
        logger.error("Error polling job", err);
        lastErrorMsg = err.message;
      }
    }

    // Schedule next poll only if we are still the active worker instance
    if ((globalThis as any).__aivideo_worker_id__ === workerId) {
      setTimeout(poll, POLL_INTERVAL_MS);
    } else {
      logger.info(`Stale render worker instance (ID: ${workerId}) detected new worker active, exiting loop.`);
    }
  };

  setTimeout(poll, 2000); // Initial delay before first poll
}

/**
 * Stop the render worker.
 */
export function stopRenderWorker(): void {
  (globalThis as any).__aivideo_worker_id__ = null;
  logger.info("Render worker stopped");
}

/**
 * Find and abort jobs that have been in "processing" status for too long.
 * This prevents a crashed render from blocking the queue forever.
 */
async function abortStuckJobs(): Promise<void> {
  const cutoff = new Date(Date.now() - RENDER_TIMEOUT_MS);

  const stuckJobs = await getDb()
    .select()
    .from(renderJobs)
    .where(
      and(
        eq(renderJobs.status, "processing"),
        lt(renderJobs.updatedAt, cutoff)
      )
    );

  for (const job of stuckJobs) {
    logger.error(`Aborting stuck job #${job.id} (processing since ${job.updatedAt})`, undefined, {
      jobId: job.id,
      projectId: job.projectId,
      updatedAt: job.updatedAt.toISOString(),
      timeoutMs: RENDER_TIMEOUT_MS,
    });

    await getDb()
      .update(renderJobs)
      .set({
        status: "error",
        stage: "timeout",
        message: `Render timed out after ${RENDER_TIMEOUT_MS / 1000}s. The job was automatically aborted.`,
      })
      .where(eq(renderJobs.id, job.id));

    await getDb()
      .update(projects)
      .set({ status: "error" })
      .where(eq(projects.id, job.projectId));

    // Refund credits for timed-out job
    try {
      const [projectRow] = await getDb()
        .select({ userId: projects.userId, resolution: projects.resolution })
        .from(projects)
        .where(eq(projects.id, job.projectId))
        .limit(1);

      if (projectRow?.userId) {
        const refundAmount = CREDIT_COST[projectRow.resolution as "720p" | "1080p" | "4k"] ?? CREDIT_COST["1080p"];
        const [userRow] = await getDb()
          .select({ credits: users.credits })
          .from(users)
          .where(eq(users.id, projectRow.userId))
          .limit(1);

        if (userRow) {
          await getDb()
            .update(users)
            .set({ credits: userRow.credits + refundAmount })
            .where(eq(users.id, projectRow.userId));
        }
      }
    } catch (refundErr) {
      logger.error(`Failed to refund credits for stuck job #${job.id}`, refundErr);
    }
  }
}

/**
 * Find and process the next queued render job.
 */
async function processNextJob(): Promise<void> {
  // Find the oldest queued job
  const [job] = await getDb()
    .select()
    .from(renderJobs)
    .where(eq(renderJobs.status, "queued"))
    .orderBy(renderJobs.id)
    .limit(1);

  if (!job) return; // No work to do

  logger.info(`Processing job #${job.id} for project #${job.projectId}`);

  try {
    await processRenderJob(job.id, job.projectId);
  } catch (err: any) {
    logger.error(`Job #${job.id} failed`, err);

    // Mark job as failed
    await getDb()
      .update(renderJobs)
      .set({
        status: "error",
        stage: "error",
        message: `Render failed: ${err.message}`,
      })
      .where(eq(renderJobs.id, job.id));

    // Mark project as error
    await getDb()
      .update(projects)
      .set({ status: "error" })
      .where(eq(projects.id, job.projectId));

    // ── Refund credits on render failure ──
    try {
      const [projectRow] = await getDb()
        .select({ userId: projects.userId, resolution: projects.resolution })
        .from(projects)
        .where(eq(projects.id, job.projectId))
        .limit(1);

      if (projectRow?.userId) {
        const refundAmount = CREDIT_COST[projectRow.resolution as "720p" | "1080p" | "4k"] ?? CREDIT_COST["1080p"];
        const [userRow] = await getDb()
          .select({ credits: users.credits })
          .from(users)
          .where(eq(users.id, projectRow.userId))
          .limit(1);

        if (userRow) {
          await getDb()
            .update(users)
            .set({ credits: userRow.credits + refundAmount })
            .where(eq(users.id, projectRow.userId));

          logger.info(`Refunded ${refundAmount} credits to user ${projectRow.userId} for failed job #${job.id}`, {
            userId: projectRow.userId,
            jobId: job.id,
            refundAmount,
          });
        }
      }
    } catch (refundErr) {
      logger.error(`Failed to refund credits for job #${job.id}`, refundErr);
    }
  }
}

/**
 * Process a single render job through the full pipeline:
 * 1. Generate TTS audio for each step
 * 2. Render video segments with zoom animation
 * 3. Concatenate into final video
 * 4. Upload to R2
 */
async function processRenderJob(jobId: number, projectId: number): Promise<void> {
  const tempFiles: string[] = []; // Track temp files for cleanup

  try {
    // Load project
    const [project] = await getDb()
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) throw new Error("Project not found");

    // Load steps
    const projectSteps = await getDb()
      .select()
      .from(steps)
      .where(eq(steps.projectId, projectId))
      .orderBy(steps.order);

    if (projectSteps.length === 0) throw new Error("No steps in project");

    const totalSteps = projectSteps.length;
    const outputRes = resolutionToSize(project.resolution || "1080p", project.aspectRatio || "16:9");

    // Mark job as processing
    await updateJob(jobId, {
      status: "processing",
      stage: "generating_audio",
      currentStep: 0,
      totalSteps,
      message: "Starting audio generation...",
    });

    // ── STAGE 1: Generate TTS audio for each step ──
    for (let i = 0; i < projectSteps.length; i++) {
      const step = projectSteps[i];
      const script = step.userEditedScript || step.aiScript || step.description;

      await updateJob(jobId, {
        stage: "generating_audio",
        currentStep: i + 1,
        message: `Generating audio for step ${i + 1} of ${totalSteps}...`,
      });

      await updateStepStatus(step.id, "generating");

      // Generate TTS audio
      const { filePath: audioLocalPath, duration: audioDuration } =
        await generateTTSAudio(script, {
          voice: project.voice || "en-US-AriaNeural",
          rate: speedToRate(project.speed || 1.0),
        });

      tempFiles.push(audioLocalPath);

      // Upload audio to R2
      const audioBuffer = await fs.readFile(audioLocalPath);
      const audioKey = await uploadToR2(audioBuffer, {
        folder: `projects/${projectId}/audio`,
        filename: `step_${step.id}.mp3`,
        contentType: "audio/mpeg",
      });

      // Update step with audio info
      await getDb()
        .update(steps)
        .set({
          audioPath: audioKey,
          audioDuration: audioDuration,
        })
        .where(eq(steps.id, step.id));

      // Store local path for later rendering
      (projectSteps[i] as any)._audioLocalPath = audioLocalPath;
      (projectSteps[i] as any)._audioDuration = audioDuration;

      logger.info(
        `Step ${i + 1}/${totalSteps}: audio generated (${audioDuration.toFixed(1)}s)`
      );
    }

    // ── STAGE 2: Render video segments ──
    await updateJob(jobId, {
      stage: "rendering_segments",
      currentStep: 0,
      message: "Starting video rendering...",
    });

    const segmentPaths: string[] = [];
    const segmentDurations: number[] = []; // Track durations for crossfade

    for (let i = 0; i < projectSteps.length; i++) {
      const step = projectSteps[i];

      await updateJob(jobId, {
        stage: "rendering_segments",
        currentStep: i + 1,
        message: `Rendering video segment ${i + 1} of ${totalSteps}...`,
      });

      // Download screenshot from R2 if it's a storage key or URL
      let screenshotLocalPath: string;
      if (step.screenshotPath && !step.screenshotPath.startsWith("blob:")) {
        const screenshotBuffer = await downloadFromR2(step.screenshotPath);
        screenshotLocalPath = path.join(
          os.tmpdir(),
          "aivideo-render",
          `screenshot_${step.id}${path.extname(step.screenshotPath) || ".png"}`
        );
        await fs.mkdir(path.dirname(screenshotLocalPath), { recursive: true });
        await fs.writeFile(screenshotLocalPath, screenshotBuffer);
        tempFiles.push(screenshotLocalPath);
      } else {
        throw new Error(`Step ${step.order} has no uploaded screenshot`);
      }

      const audioLocalPath = (step as any)._audioLocalPath;
      let audioDuration = (step as any)._audioDuration;

      // Honor the user's per-step duration override (from the editor "Duration
      // Override" field). When set, we pad/trim the clip to exactly this many
      // seconds so the zoom animation timing matches what the user previewed.
      if (typeof step.editorDuration === "number" && step.editorDuration > 0) {
        audioDuration = step.editorDuration;
      }

      // Use zoom target — pass undefined if not set so renderer can skip zoom.
      // Also skip if editorZoomScale is null/1.0 (user hasn't enabled zoom).
      const effectiveZoomScale = step.editorZoomScale ?? null;
      let zoomX = (effectiveZoomScale && effectiveZoomScale > 1.0) ? (step.zoomTargetX ?? undefined) : undefined;
      let zoomY = (effectiveZoomScale && effectiveZoomScale > 1.0) ? (step.zoomTargetY ?? undefined) : undefined;

      if (project.randomize && zoomX !== undefined && zoomY !== undefined) {
        zoomX = Math.max(0, Math.min(100, zoomX + (Math.random() * 20 - 10)));
        zoomY = Math.max(0, Math.min(100, zoomY + (Math.random() * 20 - 10)));
      }

      // ── Multi-zoom: render multiple segments from one screenshot ──
      let stepSegments: string[] = [];
      const multiZooms = (step as any).editorMultiZooms;
      // Only use multi-zoom path if editorZoomScale is explicitly > 1.0
      // AND multi-zoom entries exist with zoomScale > 1.0.
      // This prevents old DB data from triggering unwanted zoom.
      const hasValidZoom = effectiveZoomScale && effectiveZoomScale > 1.0;
      const hasValidMultiZooms = multiZooms && Array.isArray(multiZooms) && multiZooms.length > 0
        && multiZooms.some((mz: any) => (mz.zoomScale ?? 1) > 1.0);
      if (hasValidZoom && hasValidMultiZooms) {
        const { renderMultiZoomSegments } = await import("./ffmpeg");
        stepSegments = await renderMultiZoomSegments({
          screenshotPath: screenshotLocalPath,
          audioPath: audioLocalPath,
          audioDuration: audioDuration,
          multiZooms: multiZooms.map((mz: any) => ({
            targetX: mz.targetX ?? 50,
            targetY: mz.targetY ?? 50,
            rectX: mz.rectX,
            rectY: mz.rectY,
            rectW: mz.rectW,
            rectH: mz.rectH,
            zoomScale: mz.zoomScale ?? 2,
            duration: mz.duration ?? 3,
          })),
          outputRes: outputRes,
          captions: {
            enabled: project.captionsEnabled === 1,
            style: project.captionStyle || "standard",
            size: project.captionSize || "medium",
            position: project.captionPosition || "bottom",
            color: project.captionColor || "#FFFFFF",
            text: step.userEditedScript || step.aiScript || step.description || "",
          },
          editorCropX: step.editorCropX ?? undefined,
          editorCropY: step.editorCropY ?? undefined,
          editorCropW: step.editorCropW ?? undefined,
          editorCropH: step.editorCropH ?? undefined,
          editorBlurX: step.editorBlurX ?? undefined,
          editorBlurY: step.editorBlurY ?? undefined,
          editorBlurW: step.editorBlurW ?? undefined,
          editorBlurH: step.editorBlurH ?? undefined,
          editorBlurIntensity: step.editorBlurIntensity ?? undefined,
          editorBlurs: (step as any).editorBlurs ?? undefined,
          editorRedactX: step.editorRedactX ?? undefined,
          editorRedactY: step.editorRedactY ?? undefined,
          editorRedactW: step.editorRedactW ?? undefined,
          editorRedactH: step.editorRedactH ?? undefined,
          editorRedactColor: step.editorRedactColor ?? undefined,
          editorWatermarkText: step.editorWatermarkText ?? undefined,
          editorWatermarkPosition: step.editorWatermarkPosition ?? undefined,
          editorWatermarkSize: step.editorWatermarkSize ?? undefined,
          editorWatermarkColor: step.editorWatermarkColor ?? undefined,
          editorWatermarkOpacity: step.editorWatermarkOpacity ?? undefined,
          editorPixelateX: step.editorPixelateX ?? undefined,
          editorPixelateY: step.editorPixelateY ?? undefined,
          editorPixelateW: step.editorPixelateW ?? undefined,
          editorPixelateH: step.editorPixelateH ?? undefined,
          editorPixelateBlockSize: step.editorPixelateBlockSize ?? undefined,
          editorPixelates: (step as any).editorPixelates ?? undefined,
          editorSpotlightX: step.editorSpotlightX ?? undefined,
          editorSpotlightY: step.editorSpotlightY ?? undefined,
          editorSpotlightW: step.editorSpotlightW ?? undefined,
          editorSpotlightH: step.editorSpotlightH ?? undefined,
          editorSpotlightIntensity: step.editorSpotlightIntensity ?? undefined,
          editorSpotlights: (step as any).editorSpotlights ?? undefined,
          editorBadgeNumber: step.editorBadgeNumber ?? undefined,
          editorBadgeX: step.editorBadgeX ?? undefined,
          editorBadgeY: step.editorBadgeY ?? undefined,
          editorBadgeColor: step.editorBadgeColor ?? undefined,
          editorMagnifyX: step.editorMagnifyX ?? undefined,
          editorMagnifyY: step.editorMagnifyY ?? undefined,
          editorMagnifyW: step.editorMagnifyW ?? undefined,
          editorMagnifyH: step.editorMagnifyH ?? undefined,
          editorMagnifyScale: step.editorMagnifyScale ?? undefined,
          editorMagnifyCorner: step.editorMagnifyCorner ?? undefined,
          editorColorFilter: step.editorColorFilter ?? undefined,
          editorHighlights: (step as any).editorHighlights ?? undefined,
          editorOverlayText: step.editorOverlayText ?? undefined,
          editorOverlayX: step.editorOverlayX ?? undefined,
          editorOverlayY: step.editorOverlayY ?? undefined,
          editorOverlayColor: step.editorOverlayColor ?? undefined,
          editorOverlaySize: step.editorOverlaySize ?? undefined,
          editorCaptionText: step.editorCaptionText ?? undefined,
          editorCaptionPosition: step.editorCaptionPosition ?? undefined,
          editorCaptionStyle: step.editorCaptionStyle ?? undefined,
          editorCaptionColor: step.editorCaptionColor ?? undefined,
          editorCaptionSize: step.editorCaptionSize ?? undefined,
        });
      } else {
        // Render the video segment
        const segmentPath = await renderStepVideo({
          screenshotPath: screenshotLocalPath,
          audioPath: audioLocalPath,
          audioDuration: audioDuration,
          zoomTargetX: zoomX,
          zoomTargetY: zoomY,
          zoomRectX: step.zoomRectX ?? undefined,
          zoomRectY: step.zoomRectY ?? undefined,
          zoomRectW: step.zoomRectWidth ?? undefined,
          zoomRectH: step.zoomRectHeight ?? undefined,
          editorHighlights: (step as any).editorHighlights ?? undefined,
          outputRes: outputRes,
          captions: {
            enabled: project.captionsEnabled === 1,
            style: project.captionStyle || "standard",
            size: project.captionSize || "medium",
            position: project.captionPosition || "bottom",
            color: project.captionColor || "#FFFFFF",
            text: step.userEditedScript || step.aiScript || step.description || "",
          },
          // ── Canvas editor fields ──
          editorCropX: step.editorCropX ?? undefined,
          editorCropY: step.editorCropY ?? undefined,
          editorCropW: step.editorCropW ?? undefined,
          editorCropH: step.editorCropH ?? undefined,
          // Pass editorZoomScale through. null/undefined = no zoom scale set.
          // 1.0 = user explicitly disabled zoom. Only pass if > 1.0.
          editorZoomScale:
            step.editorZoomScale && step.editorZoomScale > 1.0
              ? step.editorZoomScale
              : undefined,
          editorOverlayText: step.editorOverlayText ?? undefined,
          editorOverlayX: step.editorOverlayX ?? undefined,
          editorOverlayY: step.editorOverlayY ?? undefined,
          editorOverlayColor: step.editorOverlayColor ?? undefined,
          editorOverlaySize: step.editorOverlaySize ?? undefined,
          editorCaptionText: step.editorCaptionText ?? undefined,
          editorCaptionPosition: step.editorCaptionPosition ?? undefined,
          editorCaptionStyle: step.editorCaptionStyle ?? undefined,
          editorCaptionColor: step.editorCaptionColor ?? undefined,
          editorCaptionSize: step.editorCaptionSize ?? undefined,
          editorBlurX: step.editorBlurX ?? undefined,
          editorBlurY: step.editorBlurY ?? undefined,
          editorBlurW: step.editorBlurW ?? undefined,
          editorBlurH: step.editorBlurH ?? undefined,
          editorBlurIntensity: step.editorBlurIntensity ?? undefined,
          editorBlurs: (step as any).editorBlurs ?? undefined,
          editorRedactX: step.editorRedactX ?? undefined,
          editorRedactY: step.editorRedactY ?? undefined,
          editorRedactW: step.editorRedactW ?? undefined,
          editorRedactH: step.editorRedactH ?? undefined,
          editorRedactColor: step.editorRedactColor ?? undefined,
          editorWatermarkText: step.editorWatermarkText ?? undefined,
          editorWatermarkPosition: step.editorWatermarkPosition ?? undefined,
          editorWatermarkSize: step.editorWatermarkSize ?? undefined,
          editorWatermarkColor: step.editorWatermarkColor ?? undefined,
          editorWatermarkOpacity: step.editorWatermarkOpacity ?? undefined,
          editorPixelateX: step.editorPixelateX ?? undefined,
          editorPixelateY: step.editorPixelateY ?? undefined,
          editorPixelateW: step.editorPixelateW ?? undefined,
          editorPixelateH: step.editorPixelateH ?? undefined,
          editorPixelateBlockSize: step.editorPixelateBlockSize ?? undefined,
          editorPixelates: (step as any).editorPixelates ?? undefined,
          editorSpotlightX: step.editorSpotlightX ?? undefined,
          editorSpotlightY: step.editorSpotlightY ?? undefined,
          editorSpotlightW: step.editorSpotlightW ?? undefined,
          editorSpotlightH: step.editorSpotlightH ?? undefined,
          editorSpotlightIntensity: step.editorSpotlightIntensity ?? undefined,
          editorSpotlights: (step as any).editorSpotlights ?? undefined,
          editorBadgeNumber: step.editorBadgeNumber ?? undefined,
          editorBadgeX: step.editorBadgeX ?? undefined,
          editorBadgeY: step.editorBadgeY ?? undefined,
          editorBadgeColor: step.editorBadgeColor ?? undefined,
          editorMagnifyX: step.editorMagnifyX ?? undefined,
          editorMagnifyY: step.editorMagnifyY ?? undefined,
          editorMagnifyW: step.editorMagnifyW ?? undefined,
          editorMagnifyH: step.editorMagnifyH ?? undefined,
          editorMagnifyScale: step.editorMagnifyScale ?? undefined,
          editorMagnifyCorner: step.editorMagnifyCorner ?? undefined,
          editorColorFilter: step.editorColorFilter ?? undefined,
        });
        stepSegments = [segmentPath];
      }

      for (const segPath of stepSegments) {
        segmentPaths.push(segPath);
        segmentDurations.push(audioDuration / stepSegments.length);
        tempFiles.push(segPath);
      }

      // Upload segment to R2 (use first segment as primary, or concatenate step segments)
      const primarySegmentPath = stepSegments[0];
      const segmentBuffer = await fs.readFile(primarySegmentPath);
      const segmentKey = await uploadToR2(segmentBuffer, {
        folder: `projects/${projectId}/segments`,
        filename: `step_${step.id}.mp4`,
        contentType: "video/mp4",
      });

      await getDb()
        .update(steps)
        .set({
          videoSegmentPath: segmentKey,
          status: "done",
        })
        .where(eq(steps.id, step.id));

      logger.info(`Step ${i + 1}/${totalSteps}: video segment rendered (${stepSegments.length} sub-segments)`);
    }

    // ── STAGE 3: Concatenate segments with crossfade transitions ──
    await updateJob(jobId, {
      stage: "concatenating",
      currentStep: totalSteps,
      message: "Merging video segments with transitions...",
    });

    const transitions: string[] = [];
    for (let i = 0; i < projectSteps.length; i++) {
      transitions.push(projectSteps[i].transition || "fade");
    }

    if (project.introVideoPath) {
      // Use custom uploaded intro video
      const introBuffer = await downloadFromR2(project.introVideoPath);
      const introPath = path.join(os.tmpdir(), "aivideo-render", `intro_${nanoid(8)}.mp4`);
      await fs.mkdir(path.dirname(introPath), { recursive: true });
      await fs.writeFile(introPath, introBuffer);
      tempFiles.push(introPath);
      const introDuration = await probeMediaDuration(introPath);
      segmentPaths.unshift(introPath);
      segmentDurations.unshift(introDuration);
      transitions.unshift("fade");
    } else if (project.introTemplate && project.introTemplate !== "none") {
      const introDuration = project.introDuration || 3.0;
      const text = project.introText || project.title || "";
      const introPath = await renderTextSegment(project.introTemplate, text, outputRes, introDuration);
      segmentPaths.unshift(introPath);
      segmentDurations.unshift(introDuration);
      transitions.unshift("fade");
      tempFiles.push(introPath);
    }
    if (project.outroVideoPath) {
      // Use custom uploaded outro video
      const outroBuffer = await downloadFromR2(project.outroVideoPath);
      const outroPath = path.join(os.tmpdir(), "aivideo-render", `outro_${nanoid(8)}.mp4`);
      await fs.mkdir(path.dirname(outroPath), { recursive: true });
      await fs.writeFile(outroPath, outroBuffer);
      tempFiles.push(outroPath);
      const outroDuration = await probeMediaDuration(outroPath);
      segmentPaths.push(outroPath);
      segmentDurations.push(outroDuration);
      transitions.push("fade");
    } else if (project.outroTemplate && project.outroTemplate !== "none") {
      const outroDuration = project.outroDuration || 3.0;
      const text = project.outroText || "Thanks for watching!";
      const outroPath = await renderTextSegment(project.outroTemplate, text, outputRes, outroDuration);
      segmentPaths.push(outroPath);
      segmentDurations.push(outroDuration);
      transitions.push("fade");
      tempFiles.push(outroPath);
    }

    // We only need N-1 transitions for N segments
    let finalLocalPath;
    const actualTransitions = transitions.slice(0, segmentPaths.length - 1);
    if (actualTransitions.length > 0) {
      finalLocalPath = await concatenateSegmentsWithTransitions(
        segmentPaths, 
        actualTransitions, 
        project.transitionDuration || 0.5
      );
    } else {
      finalLocalPath = await concatenateSegments(segmentPaths, segmentDurations);
    }
    tempFiles.push(finalLocalPath);

    let expectedDuration = segmentDurations.reduce((a, b) => a + b, 0);
    expectedDuration += projectSteps.length * 1.0; // AUDIO_LEAD_IN + AUDIO_TAIL for each step
    if (actualTransitions.length > 0) {
      expectedDuration -= actualTransitions.length * (project.transitionDuration || 0.5);
    }

    let finalVideoPathToUpload = finalLocalPath;
    if (project.musicEnabled && project.musicTrack) {
      try {
        await updateJob(jobId, {
          stage: "mixing_audio",
          message: "Adding background music...",
        });
        const mixedPath = await mixBackgroundMusic(finalLocalPath, project.musicTrack, expectedDuration);
        tempFiles.push(mixedPath);
        finalVideoPathToUpload = mixedPath;
      } catch (err: any) {
        logger.error("Failed to mix background music for project", err);
      }
    }

    // ── STAGE 4: Upload final video ──
    await updateJob(jobId, {
      stage: "finalizing",
      currentStep: totalSteps,
      message: "Uploading final video...",
    });

    if (project && project.finalVideoPath) {
      await deleteFromR2(project.finalVideoPath).catch((err) => {
        logger.warn("Failed to delete old final video", { error: err.message });
      });
    }

    const finalBuffer = await fs.readFile(finalVideoPathToUpload);
    const finalKey = await uploadToR2(finalBuffer, {
      folder: `projects/${projectId}`,
      filename: `final_${projectId}_${Date.now()}.mp4`,
      contentType: "video/mp4",
    });

    // ── DONE ──
    // Set completion time and expiry based on the user's plan
    const completedAt = new Date();
    let expiresAt: Date | null = null;

    const [projectRow] = await getDb()
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (projectRow && projectRow.userId) {
      const [userRow] = await getDb()
        .select({ plan: users.plan })
        .from(users)
        .where(eq(users.id, projectRow.userId))
        .limit(1);

      const plan = userRow?.plan ?? "free";
      const retentionDays = RETENTION_DAYS[plan];

      if (retentionDays !== null) {
        expiresAt = new Date(completedAt.getTime() + retentionDays * 24 * 60 * 60 * 1000);
        logger.info(`Project #${projectId} will expire in ${retentionDays} days (plan: ${plan})`, {
          projectId, plan, retentionDays, expiresAt: expiresAt.toISOString(),
        });
      } else {
        logger.info(`Project #${projectId} has permanent retention (plan: ${plan})`, {
          projectId, plan,
        });
      }
    }

    await getDb()
      .update(projects)
      .set({
        status: "complete",
        finalVideoPath: finalKey,
        completedAt,
        expiresAt,
      })
      .where(eq(projects.id, projectId));

    await updateJob(jobId, {
      status: "complete",
      stage: "complete",
      currentStep: totalSteps,
      message: "Video generation complete!",
    });

    logger.info(`Job #${jobId} complete! Final video: ${finalKey}`);
  } finally {
    // Cleanup temp files
    await cleanupTempFiles(tempFiles);
  }
}

/**
 * Helper to update a render job's progress.
 */
async function updateJob(
  jobId: number,
  data: {
    status?: "queued" | "processing" | "complete" | "error";
    stage?: string;
    currentStep?: number;
    totalSteps?: number;
    message?: string;
  }
): Promise<void> {
  await getDb()
    .update(renderJobs)
    .set(data)
    .where(eq(renderJobs.id, jobId));
}

/**
 * Helper to update a step's status.
 */
async function updateStepStatus(
  stepId: number,
  status: "pending" | "generating" | "done" | "error"
): Promise<void> {
  await getDb()
    .update(steps)
    .set({ status })
    .where(eq(steps.id, stepId));
}