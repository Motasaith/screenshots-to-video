import { getDb } from "../queries/connection";
import { projects, steps, renderJobs } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import { uploadToR2, downloadFromR2 } from "./r2";
import { generateTTSAudio, speedToRate, probeAudioDuration } from "./tts";
import { renderStepVideo, concatenateSegments, resolutionToSize, cleanupTempFiles } from "./ffmpeg";
import fs from "fs/promises";
import path from "path";
import os from "os";

const POLL_INTERVAL_MS = 5000;
let isRunning = false;

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
      await processNextJob();
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
        outputRes: outputRes,
      });

      segmentPaths.push(segmentPath);
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

    // ── STAGE 3: Concatenate segments ──
    await updateJob(jobId, {
      stage: "concatenating",
      currentStep: totalSteps,
      message: "Merging video segments...",
    });

    const finalLocalPath = await concatenateSegments(segmentPaths);
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
    await getDb()
      .update(projects)
      .set({
        status: "complete",
        finalVideoPath: finalKey,
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
