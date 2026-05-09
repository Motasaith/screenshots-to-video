import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { projects, steps, renderJobs } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";

export const projectRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    return getDb()
      .select()
      .from(projects)
      .where(eq(projects.userId, ctx.user.id))
      .orderBy(desc(projects.createdAt));
  }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [project] = await getDb()
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, input.id),
            eq(projects.userId, ctx.user.id)
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
    .input(
      z.object({
        title: z.string().min(3).max(100),
        description: z.string().min(10).max(1000),
        platform: z.enum(["youtube", "teams", "tiktok", "linkedin"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [result] = await getDb()
        .insert(projects)
        .values({
          userId: ctx.user.id,
          title: input.title,
          description: input.description,
          platform: input.platform,
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
        finalVideoPath: z.string().optional(),
        status: z.enum(["draft", "processing", "complete", "error"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await getDb()
        .update(projects)
        .set(data)
        .where(
          and(eq(projects.id, id), eq(projects.userId, ctx.user.id))
        );

      const [updated] = await getDb()
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .limit(1);

      return updated;
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await getDb()
        .delete(renderJobs)
        .where(eq(renderJobs.projectId, input.id));
      await getDb()
        .delete(steps)
        .where(eq(steps.projectId, input.id));
      await getDb()
        .delete(projects)
        .where(
          and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id))
        );
      return { success: true };
    }),

  startRender: authedQuery
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input }) => {
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
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const [job] = await getDb()
        .select()
        .from(renderJobs)
        .where(eq(renderJobs.projectId, input.projectId))
        .orderBy(desc(renderJobs.createdAt))
        .limit(1);

      return job || null;
    }),
});
