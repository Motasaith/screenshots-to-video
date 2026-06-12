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
        isSafe: z.boolean().optional(),
        safetyReason: z.string().optional(),
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
          isSafe: input.isSafe === undefined ? 1 : (input.isSafe ? 1 : 0),
          safetyReason: input.safetyReason || null,
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
        editorCaptionText: z.string().optional(),
        editorCaptionPosition: z.string().optional(),
        editorCaptionStyle: z.string().optional(),
        editorCaptionColor: z.string().optional(),
        editorCaptionSize: z.string().optional(),
        editorOverlayText: z.string().optional(),
        editorOverlayX: z.number().optional(),
        editorOverlayY: z.number().optional(),
        editorOverlayColor: z.string().optional(),
        editorOverlaySize: z.string().optional(),
        editorCropX: z.number().optional(),
        editorCropY: z.number().optional(),
        editorCropW: z.number().optional(),
        editorCropH: z.number().optional(),
        editorBlurX: z.number().optional(),
        editorBlurY: z.number().optional(),
        editorBlurW: z.number().optional(),
        editorBlurH: z.number().optional(),
        editorBlurIntensity: z.number().optional(),
        editorRedactX: z.number().optional(),
        editorRedactY: z.number().optional(),
        editorRedactW: z.number().optional(),
        editorRedactH: z.number().optional(),
        editorRedactColor: z.string().optional(),
        editorWatermarkText: z.string().optional(),
        editorWatermarkPosition: z.string().optional(),
        editorWatermarkSize: z.string().optional(),
        editorWatermarkColor: z.string().optional(),
        editorWatermarkOpacity: z.number().optional(),
        editorPixelateX: z.number().optional(),
        editorPixelateY: z.number().optional(),
        editorPixelateW: z.number().optional(),
        editorPixelateH: z.number().optional(),
        editorPixelateBlockSize: z.number().optional(),
        editorSpotlightX: z.number().optional(),
        editorSpotlightY: z.number().optional(),
        editorSpotlightW: z.number().optional(),
        editorSpotlightH: z.number().optional(),
        editorSpotlightIntensity: z.number().optional(),
        editorBadgeNumber: z.number().optional(),
        editorBadgeX: z.number().optional(),
        editorBadgeY: z.number().optional(),
        editorBadgeColor: z.string().optional(),
        editorMagnifyX: z.number().optional(),
        editorMagnifyY: z.number().optional(),
        editorMagnifyW: z.number().optional(),
        editorMagnifyH: z.number().optional(),
        editorMagnifyScale: z.number().optional(),
        editorMagnifyCorner: z.string().optional(),
        editorColorFilter: z.string().optional(),
        editorZoomScale: z.number().optional(),
        editorDuration: z.number().optional(),
        editorMultiZooms: z
          .array(
            z.object({
              id: z.string(),
              targetX: z.number(),
              targetY: z.number(),
              rectX: z.number().optional(),
              rectY: z.number().optional(),
              rectW: z.number().optional(),
              rectH: z.number().optional(),
              zoomScale: z.number().optional(),
              duration: z.number().optional(),
            })
          )
          .optional(),
        audioPath: z.string().optional(),
        audioDuration: z.number().optional(),
        transition: z.string().optional(),
        videoSegmentPath: z.string().optional(),
        isSafe: z.boolean().optional(),
        safetyReason: z.string().optional(),
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

      const updateData: any = { ...data };
      if (data.isSafe !== undefined) {
        updateData.isSafe = data.isSafe ? 1 : 0;
      }

      await getDb()
        .update(steps)
        .set(updateData)
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
