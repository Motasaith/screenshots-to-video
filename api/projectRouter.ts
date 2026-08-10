import { z } from "zod";
import { createRouter, authedQuery, rateLimitByUser } from "./middleware";
import { getDb } from "./queries/connection";
import { projects, steps, renderJobs, users } from "@db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { detectGibberish } from "./lib/gibberish";
import { getSignedDownloadUrl } from "./lib/r2";
import { ProjectDescription } from "@contracts/constants";

/**
 * Convert storage keys in step data to signed URLs for frontend display.
 * Strips "#video" markers and generates fresh signed URLs from keys.
 */
async function signStepUrls(projectSteps: typeof steps.$inferSelect[]) {
  return Promise.all(
    projectSteps.map(async (s) => {
      let signedScreenshot = s.screenshotPath;
      if (s.screenshotPath && !s.screenshotPath.startsWith("blob:")) {
        const isVideo = s.screenshotPath.includes("#video");
        const cleanKey = s.screenshotPath.split("#")[0];
        try {
          signedScreenshot = await getSignedDownloadUrl(cleanKey, 7200);
          if (isVideo) signedScreenshot += "#video";
        } catch {
          // Keep original if signing fails
        }
      }
      return { ...s, screenshotPath: signedScreenshot };
    })
  );
}

export const projectRouter = createRouter({
  list: authedQuery
    .use(rateLimitByUser(60_000, 60))
    .query(async ({ ctx }) => {
      const userProjects = await getDb()
        .select()
        .from(projects)
        .where(eq(projects.userId, ctx.user!.id))
        .orderBy(desc(projects.createdAt));

      // Sign final video URLs for completed projects
      return Promise.all(
        userProjects.map(async (p) => {
          let signedVideoPath = p.finalVideoPath;
          if (p.finalVideoPath) {
            try {
              signedVideoPath = await getSignedDownloadUrl(p.finalVideoPath, 7200);
            } catch {
              // Keep original if signing fails
            }
          }
          return { ...p, finalVideoPath: signedVideoPath };
        })
      );
    }),

  getById: authedQuery
    .use(rateLimitByUser(60_000, 60))
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [project] = await getDb()
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, input.id),
            eq(projects.userId, ctx.user!.id)
          )
        )
        .limit(1);

      if (!project) return null;

      const projectSteps = await getDb()
        .select()
        .from(steps)
        .where(eq(steps.projectId, input.id))
        .orderBy(steps.order);

      const signedSteps = await signStepUrls(projectSteps);

      // Sign final video URL if present
      let signedVideoPath = project.finalVideoPath;
      if (project.finalVideoPath) {
        try {
          signedVideoPath = await getSignedDownloadUrl(project.finalVideoPath, 7200);
        } catch {
          // Keep original if signing fails
        }
      }

      return { ...project, finalVideoPath: signedVideoPath, steps: signedSteps };
    }),

  create: authedQuery
    .use(rateLimitByUser(3_600_000, 5))
    .input(
      z.object({
        title: z.string().min(3).max(100),
        description: z
          .string()
          .min(ProjectDescription.min)
          .max(ProjectDescription.max),
        platform: z.enum(["youtube", "teams", "tiktok", "linkedin"]),
        aspectRatio: z.enum(["16:9", "9:16", "1:1", "4:5"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Reject gibberish inputs
      const titleCheck = detectGibberish(input.title);
      if (titleCheck.isGibberish) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: titleCheck.reason?.replace("a real step description", "a real video title").replace("what the user should do", "a valid video title") || "Title contains random or invalid text.",
        });
      }
      const descCheck = detectGibberish(input.description);
      if (descCheck.isGibberish) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: descCheck.reason?.replace("a real step description", "a real video description").replace("what the user should do", "a valid video description") || "Description contains random or invalid text.",
        });
      }

      // Free tier enforcement: 14 videos per week
      if (ctx.user!.plan === "free") {
        const [userRow] = await getDb()
          .select({ videosCreatedThisMonth: users.videosCreatedThisMonth, monthlyResetAt: users.monthlyResetAt })
          .from(users)
          .where(eq(users.id, ctx.user!.id))
          .limit(1);

        // Check if the weekly reset period has passed — if so, reset counter
        const resetDays = 7; // free users: weekly reset
        const shouldReset = userRow && new Date(userRow.monthlyResetAt) < new Date(Date.now() - resetDays * 24 * 60 * 60 * 1000);
        const currentCount = shouldReset ? 0 : (userRow?.videosCreatedThisMonth ?? 0);

        if (currentCount >= 14) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Free tier limit: 14 videos per week. Upgrade to create more.",
          });
        }
        await getDb()
          .update(users)
          .set({
            videosCreatedThisMonth: currentCount + 1,
            ...(shouldReset ? { monthlyResetAt: new Date() } : {}),
          })
          .where(eq(users.id, ctx.user!.id));
      }

      let finalTitle = input.title.trim();
      const existingProjects = await getDb()
        .select({ title: projects.title })
        .from(projects)
        .where(eq(projects.userId, ctx.user!.id));

      const existingTitles = new Set(existingProjects.map((p) => p.title));

      if (existingTitles.has(finalTitle)) {
        let counter = 1;
        while (existingTitles.has(`${finalTitle} (${counter})`)) {
          counter++;
        }
        finalTitle = `${finalTitle} (${counter})`;
      }

      const [result] = await getDb()
        .insert(projects)
        .values({
          userId: ctx.user!.id,
          title: finalTitle,
          description: input.description,
          platform: input.platform,
          aspectRatio: input.aspectRatio || "16:9",
          status: "draft",
        })
        .$returningId();

      const project = await getDb()
        .select()
        .from(projects)
        .where(eq(projects.id, result.id))
        .limit(1);

      return project[0];
    }),

  /**
   * Create a fully populated demo project.
   *
   * Exists so the first thing a new user sees is the product working rather
   * than an empty upload screen. Everything is real — real screenshots through
   * the normal storage path, real steps, real zoom points — so it can be
   * edited, rendered and deleted exactly like a project they made themselves.
   */
  createSample: authedQuery
    .use(rateLimitByUser(3_600_000, 5))
    .mutation(async ({ ctx }) => {
      const { buildSampleSteps } = await import("./lib/sampleProject");
      const seeds = await buildSampleSteps(ctx.user!.id);

      const [result] = await getDb()
        .insert(projects)
        .values({
          userId: ctx.user!.id,
          title: "Sample: how this works",
          description:
            "A ready-made example project. Edit anything, or render it as-is to see the finished result.",
          platform: "youtube",
          aspectRatio: "16:9",
          status: "draft",
        })
        .$returningId();

      await getDb().insert(steps).values(
        seeds.map((s) => ({
          projectId: result.id,
          order: s.order,
          description: s.description,
          screenshotPath: s.screenshotPath,
          aiScript: s.script,
          zoomTargetX: s.zoomTargetX,
          zoomTargetY: s.zoomTargetY,
          editorZoomScale: 1.8,
          editorMultiZooms: s.multiZooms,
          status: "pending" as const,
        }))
      );

      const [project] = await getDb()
        .select()
        .from(projects)
        .where(eq(projects.id, result.id))
        .limit(1);

      return project;
    }),

  update: authedQuery
    .use(rateLimitByUser(60_000, 30))
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(3).max(100).optional(),
        description: z
          .string()
          .min(ProjectDescription.min)
          .max(ProjectDescription.max)
          .optional(),
        platform: z.enum(["youtube", "teams", "tiktok", "linkedin"]).optional(),
        voice: z.string().optional(),
        speed: z.number().min(0.8).max(1.3).optional(),
        resolution: z.enum(["720p", "1080p", "4k"]).optional(),
        musicEnabled: z.number().optional(),
        musicTrack: z.string().optional(),
        aspectRatio: z.enum(["16:9", "9:16", "1:1", "4:5"]).optional(),
        randomize: z.boolean().optional(),
        introTemplate: z.string().optional(),
        outroTemplate: z.string().optional(),
        introText: z.string().optional(),
        outroText: z.string().optional(),
        introVideoPath: z.string().optional(),
        outroVideoPath: z.string().optional(),
        introDuration: z.number().min(0.5).max(10.0).optional(),
        outroDuration: z.number().min(0.5).max(10.0).optional(),
        captionsEnabled: z.boolean().optional(),
        captionStyle: z.string().optional(),
        captionSize: z.string().optional(),
        captionPosition: z.string().optional(),
        captionColor: z.string().optional(),
        transitionDuration: z.number().min(0.1).max(3).optional(),
        finalVideoPath: z.string().optional(),
        status: z.enum(["draft", "processing", "complete", "error"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, randomize, captionsEnabled, ...data } = input;
      const updateData = {
        ...data,
        ...(randomize !== undefined ? { randomize: randomize ? 1 : 0 } : {}),
        ...(captionsEnabled !== undefined ? { captionsEnabled: captionsEnabled ? 1 : 0 } : {}),
      };

      // Free tier enforcement
      if (ctx.user!.plan === "free" && data.resolution && data.resolution !== "720p") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Free tier: only 720p resolution is allowed. Upgrade to unlock higher resolutions.",
        });
      }
      if (ctx.user!.plan === "free" && data.musicEnabled) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Free tier: background music is a Pro feature. Upgrade to enable it.",
        });
      }

      // If voice, speed, captions, or resolution changes, clear cached step video/audio segments
      const voiceOrSpeedChanged = data.voice !== undefined || data.speed !== undefined;
      const captionsOrResolutionChanged =
        data.resolution !== undefined ||
        captionsEnabled !== undefined ||
        data.captionStyle !== undefined ||
        data.captionSize !== undefined ||
        data.captionPosition !== undefined ||
        data.captionColor !== undefined;

      if (voiceOrSpeedChanged) {
        await getDb()
          .update(steps)
          .set({
            audioPath: null,
            audioDuration: null,
            videoSegmentPath: null,
          })
          .where(eq(steps.projectId, id));
      } else if (captionsOrResolutionChanged) {
        await getDb()
          .update(steps)
          .set({
            videoSegmentPath: null,
          })
          .where(eq(steps.projectId, id));
      }

      await getDb()
        .update(projects)
        .set(updateData)
        .where(
          and(eq(projects.id, id), eq(projects.userId, ctx.user!.id))
        );

      const [updated] = await getDb()
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .limit(1);

      return updated;
    }),

  delete: authedQuery
    .use(rateLimitByUser(60_000, 20))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership BEFORE deleting children to prevent IDOR data loss.
      const [owned] = await getDb()
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, input.id), eq(projects.userId, ctx.user!.id)));
      if (!owned) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }
      await getDb()
        .delete(renderJobs)
        .where(eq(renderJobs.projectId, input.id));
      await getDb()
        .delete(steps)
        .where(eq(steps.projectId, input.id));
      await getDb()
        .delete(projects)
        .where(
          and(eq(projects.id, input.id), eq(projects.userId, ctx.user!.id))
        );
      return { success: true };
    }),

  deleteAll: authedQuery
    .use(rateLimitByUser(60_000, 10))
    .mutation(async ({ ctx }) => {
      const userProjects = await getDb()
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.userId, ctx.user!.id));

      const projectIds = userProjects.map((p) => p.id);
      if (projectIds.length > 0) {
        await getDb()
          .delete(renderJobs)
          .where(inArray(renderJobs.projectId, projectIds));
        await getDb()
          .delete(steps)
          .where(inArray(steps.projectId, projectIds));
        await getDb()
          .delete(projects)
          .where(eq(projects.userId, ctx.user!.id));
      }
      return { success: true };
    }),

  startRender: authedQuery
    .use(rateLimitByUser(600_000, 2))
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Verify the project belongs to the caller before rendering.
      const [owned] = await getDb()
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user!.id)));
      if (!owned) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      await getDb()
        .update(projects)
        .set({ status: "processing" })
        .where(eq(projects.id, input.projectId));

      const projectSteps = await getDb()
        .select()
        .from(steps)
        .where(eq(steps.projectId, input.projectId));

      await getDb().insert(renderJobs).values({
        projectId: input.projectId,
        status: "queued",
        currentStep: 0,
        totalSteps: projectSteps.length,
        stage: "queued",
      });

      return { success: true };
    }),

  getRenderStatus: authedQuery
    .use(rateLimitByUser(60_000, 60))
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Verify the project belongs to the caller before returning render status.
      const [owned] = await getDb()
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user!.id)));
      if (!owned) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const [job] = await getDb()
        .select()
        .from(renderJobs)
        .where(eq(renderJobs.projectId, input.projectId))
        .orderBy(desc(renderJobs.id))
        .limit(1);

      return job || null;
    }),
});
