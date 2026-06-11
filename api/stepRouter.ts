import { z } from "zod";
import { createRouter, authedQuery, rateLimitByUser } from "./middleware";
import { getDb } from "./queries/connection";
import { steps, projects } from "@db/schema";
import { eq, and } from "drizzle-orm";

export const stepRouter = createRouter({
  create: authedQuery
    .use(rateLimitByUser(60_000, 20))
    .input(
      z.object({
        projectId: z.number(),
        order: z.number(),
        description: z.string().min(1).max(500),
        screenshotPath: z.string().optional(),
      })
    )
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

      const [result] = await getDb()
        .insert(steps)
        .values({
          projectId: input.projectId,
          order: input.order,
          description: input.description,
          screenshotPath: input.screenshotPath || null,
          status: "pending",
        })
        .$returningId();

      const [step] = await getDb()
        .select()
        .from(steps)
        .where(eq(steps.id, result.id))
        .limit(1);

      return step;
    }),

  listByProject: authedQuery
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

      return getDb()
        .select()
        .from(steps)
        .where(eq(steps.projectId, input.projectId))
        .orderBy(steps.order);
    }),

  update: authedQuery
    .use(rateLimitByUser(60_000, 30))
    .input(
      z.object({
        id: z.number(),
        description: z.string().min(1).max(500).optional(),
        screenshotPath: z.string().optional(),
        aiScript: z.string().optional(),
        userEditedScript: z.string().optional(),
        zoomTargetX: z.number().min(0).max(100).optional(),
        zoomTargetY: z.number().min(0).max(100).optional(),
        zoomRectX: z.number().min(0).max(100).optional(),
        zoomRectY: z.number().min(0).max(100).optional(),
        zoomRectWidth: z.number().min(0).max(100).optional(),
        zoomRectHeight: z.number().min(0).max(100).optional(),
        audioPath: z.string().optional(),
        audioDuration: z.number().optional(),
        transition: z.string().optional(),
        videoSegmentPath: z.string().optional(),
        status: z.enum(["pending", "generating", "done", "error"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const [step] = await getDb()
        .select()
        .from(steps)
        .where(eq(steps.id, id))
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

      await getDb()
        .update(steps)
        .set(data)
        .where(eq(steps.id, id));

      const [updated] = await getDb()
        .select()
        .from(steps)
        .where(eq(steps.id, id))
        .limit(1);

      return updated;
    }),

  delete: authedQuery
    .use(rateLimitByUser(60_000, 20))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [step] = await getDb()
        .select()
        .from(steps)
        .where(eq(steps.id, input.id))
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

      await getDb().delete(steps).where(eq(steps.id, input.id));
      return { success: true };
    }),
});
