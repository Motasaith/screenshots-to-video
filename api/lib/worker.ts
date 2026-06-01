import { getDb } from "../queries/connection";
import { projects, steps, renderJobs, users, studioProjects, studioScenes, studioRenderJobs } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import { uploadToR2, downloadFromR2 } from "./r2";
import { generateTTSAudio, speedToRate, probeAudioDuration } from "./tts";
import { renderStepVideo, concatenateSegments, resolutionToSize, cleanupTempFiles } from "./ffmpeg";
import { renderSceneWithImage, renderSceneWithVideo } from "./studioRenderer";
import { downloadMedia } from "./pexels";
import { cleanupExpiredProjects } from "./cleanup";
import fs from "fs/promises";
import path from "path";
import os from "os";

const POLL_INTERVAL_MS = 5000;
let isRunning = false;
let pollCount = 0;

let lastErrorMsg = "";

/**
 * Start the background render worker.
 * Polls the render_jobs table for queued jobs and processes them.
 */
export function startRenderWorker(): void {
  if (isRunning) return;
  isRunning = true;

  console.log("[Worker] Render worker started, polling every", POLL_INTERVAL_MS, "ms");

  const poll = async () => {
    if (!isRunning) return;

    try {
      // Run cleanup every 10th poll (~50 seconds)
      pollCount++;
      if (pollCount % 10 === 0) {
        const cleaned = await cleanupExpiredProjects();
        if (cleaned > 0) {
          console.log(`[Worker] Cleaned up ${cleaned} expired projects`);
        }
      }

      await processNextJob();
      await processNextStudioJob();
      lastErrorMsg = ""; // Clear error on success
    } catch (err: any) {
      if (err.message !== lastErrorMsg) {
        console.error("[Worker] Error polling job:", err.message);
        lastErrorMsg = err.message;
      }
    }

    setTimeout(poll, POLL_INTERVAL_MS);
  };

  setTimeout(poll, 2000); // Initial delay before first poll
}

/**
 * Stop the render worker.
 */
export function stopRenderWorker(): void {
  isRunning = false;
  console.log("[Worker] Render worker stopped");
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
    .orderBy(renderJobs.createdAt)
    .limit(1);

  if (!job) return; // No work to do

  console.log(`[Worker] Processing job #${job.id} for project #${job.projectId}`);

  try {
    await processRenderJob(job.id, job.projectId);
  } catch (err: any) {
    console.error(`[Worker] Job #${job.id} failed:`, err.message);

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
    const outputRes = resolutionToSize(project.resolution || "1080p");

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

      console.log(
        `[Worker] Step ${i + 1}/${totalSteps}: audio generated (${audioDuration.toFixed(1)}s)`
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
      const audioDuration = (step as any)._audioDuration;

      // Use zoom target, default to center if not set
      const zoomX = step.zoomTargetX ?? 50;
      const zoomY = step.zoomTargetY ?? 50;

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
        outputRes: outputRes,
      });

      segmentPaths.push(segmentPath);
      segmentDurations.push(audioDuration); // Store duration for crossfade
      tempFiles.push(segmentPath);

      // Upload segment to R2
      const segmentBuffer = await fs.readFile(segmentPath);
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

      console.log(`[Worker] Step ${i + 1}/${totalSteps}: video segment rendered`);
    }

    // ── STAGE 3: Concatenate segments with crossfade transitions ──
    await updateJob(jobId, {
      stage: "concatenating",
      currentStep: totalSteps,
      message: "Merging video segments with transitions...",
    });

    const finalLocalPath = await concatenateSegments(segmentPaths, segmentDurations);
    tempFiles.push(finalLocalPath);

    // ── STAGE 4: Upload final video ──
    await updateJob(jobId, {
      stage: "finalizing",
      currentStep: totalSteps,
      message: "Uploading final video...",
    });

    const finalBuffer = await fs.readFile(finalLocalPath);
    const finalKey = await uploadToR2(finalBuffer, {
      folder: `projects/${projectId}`,
      filename: `final_${projectId}.mp4`,
      contentType: "video/mp4",
    });

    // ── DONE ──
    // Set completion time and expiry for free users
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

      if (userRow?.plan === "free") {
        expiresAt = new Date(completedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
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

    console.log(`[Worker] Job #${jobId} complete! Final video: ${finalKey}`);
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

// ════════════════════════════════════════════════════════════════
// ── AI Video Studio Worker (completely separate from above) ────
// ════════════════════════════════════════════════════════════════

/**
 * Find and process the next queued studio render job.
 */
async function processNextStudioJob(): Promise<void> {
  const [job] = await getDb()
    .select()
    .from(studioRenderJobs)
    .where(eq(studioRenderJobs.status, "queued"))
    .orderBy(studioRenderJobs.createdAt)
    .limit(1);

  if (!job) return;

  console.log(`[Worker] Processing studio job #${job.id} for studio project #${job.projectId}`);

  try {
    await processStudioRenderJob(job.id, job.projectId);
  } catch (err: any) {
    console.error(`[Worker] Studio job #${job.id} failed:`, err.message);

    await getDb()
      .update(studioRenderJobs)
      .set({
        status: "error",
        stage: "error",
        message: `Render failed: ${err.message}`,
      })
      .where(eq(studioRenderJobs.id, job.id));

    await getDb()
      .update(studioProjects)
      .set({ status: "error" })
      .where(eq(studioProjects.id, job.projectId));
  }
}

/**
 * Process a studio render job through the full pipeline:
 * 1. Download Pexels media for each scene
 * 2. Generate TTS audio for each scene
 * 3. Render video segments (image Ken Burns or video trim)
 * 4. Concatenate into final video
 * 5. Upload to R2
 */
async function processStudioRenderJob(jobId: number, projectId: number): Promise<void> {
  const tempFiles: string[] = [];

  try {
    const [project] = await getDb()
      .select()
      .from(studioProjects)
      .where(eq(studioProjects.id, projectId))
      .limit(1);

    if (!project) throw new Error("Studio project not found");

    const scenes = await getDb()
      .select()
      .from(studioScenes)
      .where(eq(studioScenes.projectId, projectId))
      .orderBy(studioScenes.order);

    if (scenes.length === 0) throw new Error("No scenes in studio project");

    const totalSteps = scenes.length;
    const outputRes = resolutionToSize(project.resolution || "1080p");

    await updateStudioJob(jobId, {
      status: "processing",
      stage: "downloading_media",
      currentStep: 0,
      totalSteps,
      message: "Downloading media assets...",
    });

    // ── STAGE 1: Download media + Generate TTS ──
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];

      await updateStudioJob(jobId, {
        stage: "preparing_scenes",
        currentStep: i + 1,
        message: `Preparing scene ${i + 1} of ${totalSteps}...`,
      });

      await getDb()
        .update(studioScenes)
        .set({ status: "generating" })
        .where(eq(studioScenes.id, scene.id));

      // Download media from Pexels
      let mediaLocalPath = "";
      if (scene.mediaUrl) {
        try {
          const ext = scene.mediaType === "video" ? ".mp4" : ".jpg";
          mediaLocalPath = await downloadMedia(scene.mediaUrl, ext);
          tempFiles.push(mediaLocalPath);
        } catch (err: any) {
          console.warn(`[Worker] Media download failed for scene ${i + 1}:`, err.message);
        }
      }

      // Generate TTS audio
      const { filePath: audioLocalPath, duration: audioDuration } =
        await generateTTSAudio(scene.narration, {
          voice: project.voice || "en-US-AriaNeural",
          rate: speedToRate(project.speed || 1.0),
        });

      tempFiles.push(audioLocalPath);

      // Upload audio to R2
      const audioBuffer = await fs.readFile(audioLocalPath);
      const audioKey = await uploadToR2(audioBuffer, {
        folder: `studio/${projectId}/audio`,
        filename: `scene_${scene.id}.mp3`,
        contentType: "audio/mpeg",
      });

      await getDb()
        .update(studioScenes)
        .set({
          audioPath: audioKey,
          audioDuration: audioDuration,
          mediaLocalPath: mediaLocalPath || null,
        })
        .where(eq(studioScenes.id, scene.id));

      // Store on the scene object for rendering
      (scenes[i] as any)._audioLocalPath = audioLocalPath;
      (scenes[i] as any)._audioDuration = audioDuration;
      (scenes[i] as any)._mediaLocalPath = mediaLocalPath;

      console.log(`[Worker] Studio scene ${i + 1}/${totalSteps}: prepared (${audioDuration.toFixed(1)}s)`);
    }

    // ── STAGE 2: Render video segments ──
    await updateStudioJob(jobId, {
      stage: "rendering_scenes",
      currentStep: 0,
      message: "Rendering video scenes...",
    });

    const segmentPaths: string[] = [];
    const segmentDurations: number[] = []; // Track durations for crossfade

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const audioLocalPath = (scene as any)._audioLocalPath;
      const audioDuration = (scene as any)._audioDuration;
      const mediaLocalPath = (scene as any)._mediaLocalPath;

      await updateStudioJob(jobId, {
        stage: "rendering_scenes",
        currentStep: i + 1,
        message: `Rendering scene ${i + 1} of ${totalSteps}...`,
      });

      let segmentPath: string;

      if (mediaLocalPath && scene.mediaType === "video") {
        segmentPath = await renderSceneWithVideo({
          videoPath: mediaLocalPath,
          audioPath: audioLocalPath,
          audioDuration,
          outputRes,
        });
      } else if (mediaLocalPath) {
        segmentPath = await renderSceneWithImage({
          imagePath: mediaLocalPath,
          audioPath: audioLocalPath,
          audioDuration,
          outputRes,
        });
      } else {
        // No media — use a black frame with audio
        segmentPath = await renderSceneWithImage({
          imagePath: null,
          audioPath: audioLocalPath,
          audioDuration,
          outputRes,
        });
      }

      segmentPaths.push(segmentPath);
      segmentDurations.push(audioDuration); // Store duration for crossfade
      tempFiles.push(segmentPath);

      // Upload segment
      const segmentBuffer = await fs.readFile(segmentPath);
      const segmentKey = await uploadToR2(segmentBuffer, {
        folder: `studio/${projectId}/segments`,
        filename: `scene_${scene.id}.mp4`,
        contentType: "video/mp4",
      });

      await getDb()
        .update(studioScenes)
        .set({ videoSegmentPath: segmentKey, status: "done" })
        .where(eq(studioScenes.id, scene.id));

      console.log(`[Worker] Studio scene ${i + 1}/${totalSteps}: rendered`);
    }

    // ── STAGE 3: Concatenate with crossfade transitions ──
    await updateStudioJob(jobId, {
      stage: "concatenating",
      currentStep: totalSteps,
      message: "Merging scenes with transitions...",
    });

    const finalLocalPath = await concatenateSegments(segmentPaths, segmentDurations);
    tempFiles.push(finalLocalPath);

    // ── STAGE 4: Upload final ──
    await updateStudioJob(jobId, {
      stage: "finalizing",
      currentStep: totalSteps,
      message: "Uploading final video...",
    });

    const finalBuffer = await fs.readFile(finalLocalPath);
    const finalKey = await uploadToR2(finalBuffer, {
      folder: `studio/${projectId}`,
      filename: `final_${projectId}.mp4`,
      contentType: "video/mp4",
    });

    // Set completion
    const completedAt = new Date();
    let expiresAt: Date | null = null;

    const [projectRow] = await getDb()
      .select()
      .from(studioProjects)
      .where(eq(studioProjects.id, projectId))
      .limit(1);

    if (projectRow && projectRow.userId) {
      const [userRow] = await getDb()
        .select({ plan: users.plan })
        .from(users)
        .where(eq(users.id, projectRow.userId))
        .limit(1);

      if (userRow?.plan === "free") {
        expiresAt = new Date(completedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
    }

    await getDb()
      .update(studioProjects)
      .set({
        status: "complete",
        finalVideoPath: finalKey,
        completedAt,
        expiresAt,
      })
      .where(eq(studioProjects.id, projectId));

    await updateStudioJob(jobId, {
      status: "complete",
      stage: "complete",
      currentStep: totalSteps,
      message: "Video generation complete!",
    });

    console.log(`[Worker] Studio job #${jobId} complete! Final video: ${finalKey}`);
  } finally {
    await cleanupTempFiles(tempFiles);
  }
}

/**
 * Helper to update a studio render job's progress.
 */
async function updateStudioJob(
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
    .update(studioRenderJobs)
    .set(data)
    .where(eq(studioRenderJobs.id, jobId));
}
