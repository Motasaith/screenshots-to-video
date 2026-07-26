import { z } from "zod";
import { createRouter, authedQuery, rateLimitByUser } from "./middleware";
import { getDb } from "./queries/connection";
import { projects, steps, renderJobs, users } from "@db/schema";
import { eq, and, desc, inArray, count } from "drizzle-orm";
import { getSignedDownloadUrl, isR2Configured } from "./lib/r2";
import { notifyRenderJobQueued } from "./lib/worker";
import { createLogger } from "./lib/logger";
import {
  MAX_QUEUE_DEPTH,
  MAX_CONCURRENT_RENDERS_PER_USER,
  CREDIT_COST,
  MIN_CREDITS_TO_RENDER,
} from "./lib/render-config";
import {
  getMissingScriptOrders,
  hasSelectedVoice,
  isExplicitSilentVoice,
} from "./lib/narration";

const log = createLogger({ path: "renderRouter" });

export const renderRouter = createRouter({
  status: authedQuery
    .use(rateLimitByUser(60_000, 60))
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const [project] = await getDb()
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, input.projectId),
            eq(projects.userId, ctx.user!.id)
          )
        )
        .limit(1);

      if (!project) throw new Error("Project not found");

      const [job] = await getDb()
        .select()
        .from(renderJobs)
        .where(eq(renderJobs.projectId, input.projectId))
        .orderBy(desc(renderJobs.id))
        .limit(1);

      const projectSteps = await getDb()
        .select()
        .from(steps)
        .where(eq(steps.projectId, input.projectId));

      // Generate signed URL for the final video if available
      let finalVideoUrl: string | null = null;
      if (project.finalVideoPath && isR2Configured()) {
        try {
          finalVideoUrl = await getSignedDownloadUrl(project.finalVideoPath, 7200);
        } catch {
          finalVideoUrl = project.finalVideoPath;
        }
      }

      return {
        projectStatus: project.status,
        job: job || null,
        steps: projectSteps.map((s) => ({
          id: s.id,
          order: s.order,
          status: s.status,
          audioPath: s.audioPath,
          audioDuration: s.audioDuration,
          videoSegmentPath: s.videoSegmentPath,
        })),
        finalVideoPath: project.finalVideoPath,
        finalVideoUrl,
      };
    }),

  start: authedQuery
    .use(rateLimitByUser(600_000, 10))
    .input(z.object({
      projectId: z.number(),
      allowSilent: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const [project] = await getDb()
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, input.projectId),
            eq(projects.userId, ctx.user!.id)
          )
        )
        .limit(1);

      if (!project) throw new Error("Project not found");

      const projectSteps = await getDb()
        .select()
        .from(steps)
        .where(eq(steps.projectId, input.projectId));

      if (projectSteps.length === 0) {
        throw new Error("No steps to render. Add at least one step.");
      }

      // Check that all steps have screenshots
      const missingScreenshots = projectSteps.filter(
        (s) => !s.screenshotPath || s.screenshotPath.startsWith("blob:")
      );
      if (missingScreenshots.length > 0) {
        throw new Error(
          `Steps ${missingScreenshots.map((s) => s.order).join(", ")} are missing uploaded screenshots.`
        );
      }

      const explicitlySilent = isExplicitSilentVoice(project.voice);
      const renderSilently = input.allowSilent || explicitlySilent;

      if (!renderSilently) {
        const narrationIssues: string[] = [];
        if (!hasSelectedVoice(project.voice)) {
          narrationIssues.push("Choose a voice for the voiceover.");
        }

        const missingScriptOrders = getMissingScriptOrders(projectSteps);
        if (missingScriptOrders.length > 0) {
          narrationIssues.push(
            `Add or generate a script for ${missingScriptOrders.length === 1 ? "scene" : "scenes"} ${missingScriptOrders.join(", ")}.`
          );
        }

        if (narrationIssues.length > 0) {
          throw new Error(
            `${narrationIssues.join(" ")} To export without voiceover or captions, choose Continue anyway.`
          );
        }
      }

      // ── SAFETY CHECK 1: Per-project duplicate render prevention ──
      const [existingJob] = await getDb()
        .select()
        .from(renderJobs)
        .where(
          and(
            eq(renderJobs.projectId, input.projectId),
            inArray(renderJobs.status, ["queued", "processing"])
          )
        )
        .limit(1);

      if (existingJob) {
        return { success: true, totalSteps: projectSteps.length };
      }

      // ── SAFETY CHECK 2: Per-user concurrent render limit ──
      const [userActiveJobs] = await getDb()
        .select({ value: count() })
        .from(renderJobs)
        .leftJoin(projects, eq(renderJobs.projectId, projects.id))
        .where(
          and(
            eq(projects.userId, ctx.user!.id),
            inArray(renderJobs.status, ["queued", "processing"])
          )
        );

      if ((userActiveJobs?.value ?? 0) >= MAX_CONCURRENT_RENDERS_PER_USER) {
        throw new Error(
          `You already have a render in progress. Please wait for it to complete before starting another.`
        );
      }

      // ── SAFETY CHECK 3: Global queue depth limit ──
      const [queueCount] = await getDb()
        .select({ value: count() })
        .from(renderJobs)
        .where(inArray(renderJobs.status, ["queued", "processing"]));

      if ((queueCount?.value ?? 0) >= MAX_QUEUE_DEPTH) {
        throw new Error(
          `The render queue is currently full (${MAX_QUEUE_DEPTH} jobs). Please try again in a few minutes.`
        );
      }

      // ── SAFETY CHECK 4: Credit check ──
      const creditCost = CREDIT_COST[project.resolution] ?? CREDIT_COST["1080p"];
      if (ctx.user!.credits < MIN_CREDITS_TO_RENDER) {
        throw new Error(
          `You need at least ${MIN_CREDITS_TO_RENDER} credit to render a video. You have ${ctx.user!.credits}. Upgrade your plan for more credits.`
        );
      }

      // Persist explicit silent intent before queueing. The special queued
      // stage also snapshots it for this job so later project edits cannot
      // accidentally turn narration/captions back on mid-render.
      if (renderSilently) {
        await getDb()
          .update(projects)
          .set({
            voice: "none",
            captionsEnabled: 0,
          })
          .where(eq(projects.id, input.projectId));
      }

      // Deduct credits at render start (prevents credit abuse)
      await getDb()
        .update(users)
        .set({ credits: Math.max(0, ctx.user!.credits - creditCost) })
        .where(eq(users.id, ctx.user!.id));

      log.info(`Render started for project #${project.id} by user ${ctx.user!.id}`, {
        userId: ctx.user!.id,
        projectId: project.id,
        resolution: project.resolution,
        creditCost,
        queuePosition: queueCount?.value ?? 0,
      });

      // Mark project as processing
      await getDb()
        .update(projects)
        .set({ status: "processing" })
        .where(eq(projects.id, input.projectId));

      // Reset step statuses
      for (const step of projectSteps) {
        await getDb()
          .update(steps)
          .set({ status: "pending" })
          .where(eq(steps.id, step.id));
      }

      // Create a render job — the background worker will pick it up
      await getDb().insert(renderJobs).values({
        projectId: input.projectId,
        status: "queued",
        currentStep: 0,
        totalSteps: projectSteps.length,
        stage: renderSilently ? "queued_silent" : "queued",
        message: renderSilently
          ? "Waiting in render queue (voiceover and captions disabled)..."
          : "Waiting in render queue...",
      });

      // The worker shares this process, so start it now rather than leaving
      // the job to be discovered on the next 5s tick.
      notifyRenderJobQueued();

      return { success: true, totalSteps: projectSteps.length };
    }),

  /**
   * Get a signed download URL for the final video.
   */
  getDownloadUrl: authedQuery
    .use(rateLimitByUser(60_000, 30))
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const [project] = await getDb()
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, input.projectId),
            eq(projects.userId, ctx.user!.id)
          )
        )
        .limit(1);

      if (!project) throw new Error("Project not found");
      if (!project.finalVideoPath) throw new Error("Video not ready yet");

      if (isR2Configured()) {
        const url = await getSignedDownloadUrl(project.finalVideoPath, 7200);
        return { url };
      }

      return { url: project.finalVideoPath };
    }),

  regenerateStep: authedQuery
    .use(rateLimitByUser(600_000, 3))
    .input(z.object({ stepId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [step] = await getDb()
        .select()
        .from(steps)
        .where(eq(steps.id, input.stepId))
        .limit(1);

      if (!step) throw new Error("Step not found");

      const [project] = await getDb()
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, step.projectId), eq(projects.userId, ctx.user!.id))
        )
        .limit(1);

      if (!project) throw new Error("Not authorized");

      // Mark the step as pending re-render
      await getDb()
        .update(steps)
        .set({ status: "pending" })
        .where(eq(steps.id, input.stepId));

      // Mark project as processing
      await getDb()
        .update(projects)
        .set({ status: "processing" })
        .where(eq(projects.id, project.id));

      // Create a new render job — the worker will re-render the full video
      const allSteps = await getDb()
        .select()
        .from(steps)
        .where(eq(steps.projectId, project.id));

      await getDb().insert(renderJobs).values({
        projectId: project.id,
        status: "queued",
        currentStep: 0,
        totalSteps: allSteps.length,
        stage: isExplicitSilentVoice(project.voice) ? "queued_silent" : "queued",
        message: `Re-rendering step ${step.order}...`,
      });

      notifyRenderJobQueued();

      return { success: true };
    }),
});
