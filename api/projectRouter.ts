import { z } from "zod";
import { createRouter, authedQuery, rateLimitByUser } from "./middleware";
import { getDb } from "./queries/connection";
import { projects, steps, renderJobs, users } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const projectRouter = createRouter({
  list: authedQuery
    .use(rateLimitByUser(60_000, 60))
    .query(async ({ ctx }) => {
      return getDb()
        .select()
        .from(projects)
        .where(eq(projects.userId, ctx.user!.id))
        .orderBy(desc(projects.createdAt));
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

      return { ...project, steps: projectSteps };
    }),

  create: authedQuery
    .use(rateLimitByUser(3_600_000, 5))
    .input(
      z.object({
        title: z.string().min(3).max(100),
        description: z.string().min(10).max(1000),
        platform: z.enum(["youtube", "teams", "tiktok", "linkedin"]),
        aspectRatio: z.enum(["16:9", "9:16", "1:1", "4:5"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Free tier enforcement
      if (ctx.user!.plan === "free") {
        const [userRow] = await getDb()
          .select({ videosCreatedThisMonth: users.videosCreatedThisMonth })
          .from(users)
          .where(eq(users.id, ctx.user!.id))
          .limit(1);
        if (userRow && userRow.videosCreatedThisMonth >= 5) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Free tier limit: 5 videos per month. Upgrade to create more.",
          });
        }
        await getDb()
          .update(users)
          .set({ videosCreatedThisMonth: (userRow?.videosCreatedThisMonth ?? 0) + 1 })
          .where(eq(users.id, ctx.user!.id));
      }

      const [result] = await getDb()
        .insert(projects)
        .values({
          userId: ctx.user!.id,
          title: input.title,
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

  update: authedQuery
    .use(rateLimitByUser(60_000, 30))
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(3).max(100).optional(),
        description: z.string().min(10).max(1000).optional(),
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
        .orderBy(desc(renderJobs.createdAt))
        .limit(1);

      return job || null;
    }),
});
