import { z } from "zod";
import { createRouter, authedQuery, rateLimitByUser } from "./middleware";
import { getDb } from "./queries/connection";
import { steps, projects } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { detectGibberish } from "./lib/gibberish";

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

      // Reject keyboard-mash / troll input.
      const g = detectGibberish(input.description);
      if (g.isGibberish) {
        throw new Error(
          g.reason || "Step description looks like random text. Please write a real description."
        );
      }

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
        order: z.number().optional(),
        description: z.string().min(1).max(500).optional(),
        screenshotPath: z.string().optional(),
        aiScript: z.string().optional(),
        userEditedScript: z.string().optional(),
        zoomTargetX: z.number().min(0).max(100).nullish(),
        zoomTargetY: z.number().min(0).max(100).nullish(),
        zoomRectX: z.number().min(0).max(100).nullish(),
        zoomRectY: z.number().min(0).max(100).nullish(),
        zoomRectWidth: z.number().min(0).max(100).nullish(),
        zoomRectHeight: z.number().min(0).max(100).nullish(),
        editorCaptionText: z.string().nullish(),
        editorCaptionPosition: z.string().nullish(),
        editorCaptionStyle: z.string().nullish(),
        editorCaptionColor: z.string().nullish(),
        editorCaptionSize: z.string().nullish(),
        editorOverlayText: z.string().nullish(),
        editorOverlayX: z.number().nullish(),
        editorOverlayY: z.number().nullish(),
        editorOverlayColor: z.string().nullish(),
        editorOverlaySize: z.string().nullish(),
        editorCropX: z.number().nullish(),
        editorCropY: z.number().nullish(),
        editorCropW: z.number().nullish(),
        editorCropH: z.number().nullish(),
        editorBlurX: z.number().nullish(),
        editorBlurY: z.number().nullish(),
        editorBlurW: z.number().nullish(),
        editorBlurH: z.number().nullish(),
        editorBlurIntensity: z.number().nullish(),
        editorBlurs: z
          .array(
            z.object({
              id: z.string(),
              x: z.number(),
              y: z.number(),
              w: z.number(),
              h: z.number(),
              intensity: z.number().optional(),
            })
          )
          .nullish(),
        editorRedactX: z.number().nullish(),
        editorRedactY: z.number().nullish(),
        editorRedactW: z.number().nullish(),
        editorRedactH: z.number().nullish(),
        editorRedactColor: z.string().nullish(),
        editorWatermarkText: z.string().nullish(),
        editorWatermarkPosition: z.string().nullish(),
        editorWatermarkSize: z.string().nullish(),
        editorWatermarkColor: z.string().nullish(),
        editorWatermarkOpacity: z.number().nullish(),
        editorPixelateX: z.number().nullish(),
        editorPixelateY: z.number().nullish(),
        editorPixelateW: z.number().nullish(),
        editorPixelateH: z.number().nullish(),
        editorPixelateBlockSize: z.number().nullish(),
        editorPixelates: z
          .array(
            z.object({
              id: z.string(),
              x: z.number(),
              y: z.number(),
              w: z.number(),
              h: z.number(),
              blockSize: z.number().optional(),
            })
          )
          .nullish(),
        editorSpotlightX: z.number().nullish(),
        editorSpotlightY: z.number().nullish(),
        editorSpotlightW: z.number().nullish(),
        editorSpotlightH: z.number().nullish(),
        editorSpotlightIntensity: z.number().nullish(),
        editorSpotlights: z
          .array(
            z.object({
              id: z.string(),
              x: z.number(),
              y: z.number(),
              w: z.number(),
              h: z.number(),
              intensity: z.number().optional(),
            })
          )
          .nullish(),
        editorBadgeNumber: z.number().nullish(),
        editorBadgeX: z.number().nullish(),
        editorBadgeY: z.number().nullish(),
        editorBadgeColor: z.string().nullish(),
        editorMagnifyX: z.number().nullish(),
        editorMagnifyY: z.number().nullish(),
        editorMagnifyW: z.number().nullish(),
        editorMagnifyH: z.number().nullish(),
        editorMagnifyScale: z.number().nullish(),
        editorMagnifyCorner: z.string().nullish(),
        editorColorFilter: z.string().nullish(),
        editorZoomScale: z.number().nullish(),
        editorDuration: z.number().nullish(),
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

      // Reject gibberish descriptions on update too.
      if (data.description !== undefined) {
        const g = detectGibberish(data.description);
        if (g.isGibberish) {
          throw new Error(
            g.reason || "Step description looks like random text. Please write a real description."
          );
        }
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
