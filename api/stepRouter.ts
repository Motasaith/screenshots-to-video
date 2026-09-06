import { z } from "zod";
import { isStorableMediaRef } from "./lib/mediaRef";
import { createRouter, authedQuery, rateLimitByUser, userError} from "./middleware";
import { getDb } from "./queries/connection";
import { steps, projects } from "@db/schema";
import { projectAccessWhere } from "./lib/teams";
import { eq, and } from "drizzle-orm";
import { detectGibberish } from "./lib/gibberish";
import { checkMediaSafety } from "./lib/llm";

export const stepRouter = createRouter({
  create: authedQuery
    .use(rateLimitByUser(60_000, 60))
    .input(
      z.object({
        projectId: z.number(),
        order: z.number(),
        description: z.string().max(500).default(""),
        screenshotPath: z
          .string()
          .refine(isStorableMediaRef, "Not a valid uploaded file reference")
          .optional(),
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
            projectAccessWhere(ctx.user!)
          )
        )
        .limit(1);

      if (!project) throw userError("Project not found", "NOT_FOUND");

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
            projectAccessWhere(ctx.user!)
          )
        )
        .limit(1);

      if (!project) throw userError("Project not found", "NOT_FOUND");

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
        screenshotPath: z
          .string()
          .refine(isStorableMediaRef, "Not a valid uploaded file reference")
          .optional(),
        aiScript: z.string().optional(),
        userEditedScript: z.string().optional(),
        zoomTargetX: z.number().min(0).max(100).nullish(),
        zoomTargetY: z.number().min(0).max(100).nullish(),
        zoomRectX: z.number().min(0).max(100).nullish(),
        zoomRectY: z.number().min(0).max(100).nullish(),
        zoomRectWidth: z.number().min(0).max(100).nullish(),
        zoomRectHeight: z.number().min(0).max(100).nullish(),
        editorHighlights: z
          .array(
            z.object({
              id: z.string(),
              x: z.number(),
              y: z.number(),
              w: z.number(),
              h: z.number(),
              color: z.string().optional(),
            })
          )
          .nullish(),
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
        editorRedacts: z
          .array(
            z.object({
              id: z.string(),
              x: z.number(),
              y: z.number(),
              w: z.number(),
              h: z.number(),
              color: z.string().optional(),
            })
          )
          .nullish(),
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
        editorBadges: z
          .array(
            z.object({
              id: z.string(),
              number: z.number(),
              x: z.number(),
              y: z.number(),
              color: z.string().optional(),
            })
          )
          .nullish(),
        editorMagnifyX: z.number().nullish(),
        editorMagnifyY: z.number().nullish(),
        editorMagnifyW: z.number().nullish(),
        editorMagnifyH: z.number().nullish(),
        editorMagnifyScale: z.number().nullish(),
        editorMagnifyCorner: z.string().nullish(),
        editorColorFilter: z.string().nullish(),
        editorColorFilterStrength: z.number().min(0).max(100).nullish(),
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

      if (!step) throw userError("Scene not found", "NOT_FOUND");

      const [project] = await getDb()
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, step.projectId), projectAccessWhere(ctx.user!))
        )
        .limit(1);

      if (!project) throw userError("Project not found", "NOT_FOUND");

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

      // Clear audio/video segment cache on changes
      const isTextUpdated =
        data.description !== undefined ||
        data.aiScript !== undefined ||
        data.userEditedScript !== undefined;

      const isVideoFieldsUpdated =
        data.zoomTargetX !== undefined ||
        data.zoomTargetY !== undefined ||
        data.zoomRectX !== undefined ||
        data.zoomRectY !== undefined ||
        data.zoomRectWidth !== undefined ||
        data.zoomRectHeight !== undefined ||
        data.editorHighlights !== undefined ||
        data.editorCaptionText !== undefined ||
        data.editorCaptionPosition !== undefined ||
        data.editorCaptionStyle !== undefined ||
        data.editorCaptionColor !== undefined ||
        data.editorCaptionSize !== undefined ||
        data.editorOverlayText !== undefined ||
        data.editorOverlayX !== undefined ||
        data.editorOverlayY !== undefined ||
        data.editorOverlayColor !== undefined ||
        data.editorOverlaySize !== undefined ||
        data.editorCropX !== undefined ||
        data.editorCropY !== undefined ||
        data.editorCropW !== undefined ||
        data.editorCropH !== undefined ||
        data.editorBlurX !== undefined ||
        data.editorBlurY !== undefined ||
        data.editorBlurW !== undefined ||
        data.editorBlurH !== undefined ||
        data.editorBlurIntensity !== undefined ||
        data.editorBlurs !== undefined ||
        data.editorRedactX !== undefined ||
        data.editorRedactY !== undefined ||
        data.editorRedactW !== undefined ||
        data.editorRedactH !== undefined ||
        data.editorRedactColor !== undefined ||
        data.editorRedacts !== undefined ||
        data.editorWatermarkText !== undefined ||
        data.editorWatermarkPosition !== undefined ||
        data.editorWatermarkSize !== undefined ||
        data.editorWatermarkColor !== undefined ||
        data.editorWatermarkOpacity !== undefined ||
        data.editorPixelateX !== undefined ||
        data.editorPixelateY !== undefined ||
        data.editorPixelateW !== undefined ||
        data.editorPixelateH !== undefined ||
        data.editorPixelateBlockSize !== undefined ||
        data.editorPixelates !== undefined ||
        data.editorSpotlightX !== undefined ||
        data.editorSpotlightY !== undefined ||
        data.editorSpotlightW !== undefined ||
        data.editorSpotlightH !== undefined ||
        data.editorSpotlightIntensity !== undefined ||
        data.editorSpotlights !== undefined ||
        data.editorBadgeNumber !== undefined ||
        data.editorBadgeX !== undefined ||
        data.editorBadgeY !== undefined ||
        data.editorBadgeColor !== undefined ||
        data.editorBadges !== undefined ||
        data.editorMagnifyX !== undefined ||
        data.editorMagnifyY !== undefined ||
        data.editorMagnifyW !== undefined ||
        data.editorMagnifyH !== undefined ||
        data.editorMagnifyScale !== undefined ||
        data.editorMagnifyCorner !== undefined ||
        data.editorColorFilter !== undefined ||
        data.editorColorFilterStrength !== undefined ||
        data.editorZoomScale !== undefined ||
        data.editorDuration !== undefined ||
        data.editorMultiZooms !== undefined ||
        data.screenshotPath !== undefined;

      if (isTextUpdated) {
        updateData.audioPath = null;
        updateData.audioDuration = null;
        updateData.videoSegmentPath = null;
      } else if (isVideoFieldsUpdated) {
        updateData.videoSegmentPath = null;
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

  /**
   * Set the order of every scene in a project in one call.
   *
   * The editor used to do this from the client: splice the array, then
   * `await step.update` once per scene in a loop. That is one round trip per
   * scene, serially, for every scene rather than only the ones that moved, with
   * nothing on screen until all of them land. On the two largest projects here
   * (112 and 94 scenes) it also walked straight through `step.update`'s
   * 30-per-minute limit and died half way, leaving the ordering part-written.
   *
   * One call, one rate-limit unit, and the writes go in a transaction so a
   * failure cannot leave scenes half-renumbered.
   */
  reorder: authedQuery
    .use(rateLimitByUser(60_000, 30))
    .input(
      z.object({
        projectId: z.number(),
        /** Every scene id in the project, in the order they should render. */
        stepIds: z.array(z.number()).min(1).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [project] = await getDb()
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, input.projectId), projectAccessWhere(ctx.user!))
        )
        .limit(1);

      if (!project) throw userError("Project not found", "NOT_FOUND");

      const existing = await getDb()
        .select({ id: steps.id, order: steps.order })
        .from(steps)
        .where(eq(steps.projectId, input.projectId));

      // The list has to be exactly this project's scenes: no ids from someone
      // else's project, and none of this project's left out, or the result is a
      // renumbering that silently drops scenes out of the video.
      const owned = new Set(existing.map((s) => s.id));
      const requested = new Set(input.stepIds);
      if (
        requested.size !== input.stepIds.length ||
        requested.size !== owned.size ||
        input.stepIds.some((id) => !owned.has(id))
      ) {
        throw userError("That scene list does not match this project.");
      }

      // Only what actually moved. Dragging one scene a few places along leaves
      // most of the list where it was, and rewriting all of it is how a 112
      // scene project turned one drag into 112 writes.
      const currentOrder = new Map(existing.map((s) => [s.id, s.order]));
      const changed = input.stepIds
        .map((id, index) => ({ id, order: index + 1 }))
        .filter((s) => currentOrder.get(s.id) !== s.order);

      if (changed.length === 0) return { success: true, updated: 0 };

      await getDb().transaction(async (tx) => {
        for (const s of changed) {
          await tx
            .update(steps)
            .set({ order: s.order })
            .where(eq(steps.id, s.id));
        }
      });

      return { success: true, updated: changed.length };
    }),

  /**
   * Apply the boxes drawn in the guided setup.
   *
   * A screenshot can carry any number of highlights, and each one independently
   * decides whether the camera goes there. Both lists exist in the editor's own
   * model already: `editorHighlights` and `editorMultiZooms`. An earlier version
   * took one box per step and quietly used it as the zoom as well, so there was
   * no way to mark a second thing and no way to say "highlight this but do not
   * move the camera".
   *
   * Writes exactly what the vision path writes, so a project framed by hand and
   * one framed automatically are indistinguishable afterwards and edit in the
   * same places. A step absent from `frames` is left completely alone: that is
   * what "nothing to point at here" and "do this in the editor" mean - no
   * highlight and no zoom, rather than empty ones.
   */
  applyFocus: authedQuery
    .use(rateLimitByUser(60_000, 20))
    .input(
      z.object({
        projectId: z.number(),
        frames: z
          .array(
            z.object({
              stepId: z.number(),
              highlights: z
                .array(
                  z.object({
                    x: z.number().min(0).max(100),
                    y: z.number().min(0).max(100),
                    w: z.number().min(0.5).max(100),
                    h: z.number().min(0.5).max(100),
                    /** Whether the camera moves to this box. */
                    zoom: z.boolean(),
                  })
                )
                .min(1)
                .max(20),
            })
          )
          .max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [project] = await getDb()
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, input.projectId), projectAccessWhere(ctx.user!))
        )
        .limit(1);

      if (!project) throw userError("Project not found", "NOT_FOUND");

      const owned = new Set(
        (
          await getDb()
            .select({ id: steps.id })
            .from(steps)
            .where(eq(steps.projectId, input.projectId))
        ).map((s) => s.id)
      );

      for (const frame of input.frames) {
        // Silently ignoring a foreign id would let one project's framing be
        // written into another's.
        if (!owned.has(frame.stepId)) {
          throw userError("That scene is not part of this project.");
        }
      }

      // Breathing room around the box, so the element is not jammed against the
      // edge of the frame once the camera arrives.
      const PAD = 6;

      /** A box, padded, in the shape the camera fields want. */
      const cameraRect = (b: { x: number; y: number; w: number; h: number }) => {
        const rectX = Math.max(0, b.x - PAD);
        const rectY = Math.max(0, b.y - PAD);
        return {
          targetX: b.x + b.w / 2,
          targetY: b.y + b.h / 2,
          rectX,
          rectY,
          rectW: Math.min(100 - rectX, b.w + PAD * 2),
          rectH: Math.min(100 - rectY, b.h + PAD * 2),
        };
      };

      let zoomCount = 0;

      for (const frame of input.frames) {
        const highlights = frame.highlights.map((b, i) => ({
          id: `focus-${frame.stepId}-${i}`,
          x: b.x,
          y: b.y,
          w: b.w,
          h: b.h,
          color: "#FF0099",
        }));

        // Any number of boxes can be zoomed into: `editorMultiZooms` is a list
        // and the worker renders a segment per waypoint. The single-zoom columns
        // are set from the first of them, because they are what the fallback
        // render path reads when the multi-zoom one is not taken.
        const zooms = frame.highlights
          .map((b, i) => ({ b, i }))
          .filter(({ b }) => b.zoom)
          .map(({ b, i }) => ({ ...cameraRect(b), id: `focus-${frame.stepId}-${i}` }));

        zoomCount += zooms.length;
        const first = zooms[0];

        // Null, not absent: a scene that had a zoom and should now have none
        // must have the old one cleared, and `editorZoomScale` is what arms it
        // at all.
        await getDb()
          .update(steps)
          .set({
            editorHighlights: highlights,
            zoomTargetX: first?.targetX ?? null,
            zoomTargetY: first?.targetY ?? null,
            zoomRectX: first?.rectX ?? null,
            zoomRectY: first?.rectY ?? null,
            zoomRectWidth: first?.rectW ?? null,
            zoomRectHeight: first?.rectH ?? null,
            editorZoomScale: first ? 2 : null,
            editorMultiZooms: zooms.map((z) => ({
              id: z.id,
              targetX: z.targetX,
              targetY: z.targetY,
              rectX: z.rectX,
              rectY: z.rectY,
              rectW: z.rectW,
              rectH: z.rectH,
              zoomScale: 2,
              duration: 3,
            })),
          })
          .where(eq(steps.id, frame.stepId));
      }

      return {
        framed: input.frames.length,
        highlights: input.frames.reduce((n, f) => n + f.highlights.length, 0),
        zooms: zoomCount,
      };
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

      if (!step) throw userError("Scene not found", "NOT_FOUND");

      const [project] = await getDb()
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, step.projectId), projectAccessWhere(ctx.user!))
        )
        .limit(1);

      if (!project) throw userError("Project not found", "NOT_FOUND");

      await getDb().delete(steps).where(eq(steps.id, input.id));
      return { success: true };
    }),

  // ── AI Safety & Copyright Check ──
  checkSafety: authedQuery
    .use(rateLimitByUser(60_000, 10))
    .input(z.object({ stepId: z.number(), mediaUrl: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const [step] = await getDb()
        .select()
        .from(steps)
        .where(eq(steps.id, input.stepId))
        .limit(1);

      if (!step) throw userError("Scene not found", "NOT_FOUND");

      const [project] = await getDb()
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, step.projectId), projectAccessWhere(ctx.user!))
        )
        .limit(1);

      if (!project) throw userError("Project not found", "NOT_FOUND");

      // Run the Vision LLM safety check
      const result = await checkMediaSafety(input.mediaUrl);

      // Save the result to the step in the database
      await getDb()
        .update(steps)
        .set({
          isSafe: result.isSafe && result.isClear ? 1 : 0,
          safetyReason: result.reason,
        })
        .where(eq(steps.id, input.stepId));

      return result;
    }),
});
