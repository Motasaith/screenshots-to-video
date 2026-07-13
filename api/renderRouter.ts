import { z } from "zod";
import { createRouter, authedQuery, rateLimitByUser } from "./middleware";
import { getDb } from "./queries/connection";
import { projects, steps, renderJobs } from "@db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { getSignedDownloadUrl, isR2Configured } from "./lib/r2";

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
    .input(z.object({ projectId: z.number() }))
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

      // Check if there is already an active (queued or processing) job for this project to prevent duplicates
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
        stage: "queued",
        message: "Waiting in render queue...",
      });

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
        stage: "queued",
        message: `Re-rendering step ${step.order}...`,
      });

      return { success: true };
    }),
});
