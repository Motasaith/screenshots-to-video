import { z } from "zod";
import { createRouter, authedQuery, rateLimitByUser } from "./middleware";
import { getDb } from "./queries/connection";
import { studioProjects, studioScenes, studioRenderJobs, users } from "@db/schema";
import { eq, and, desc, max } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { isLLMConfigured, checkCopyrightImages } from "./lib/llm";
import { generateVideoScript } from "./lib/studioLlm";
import { searchMedia, isPexelsConfigured } from "./lib/pexels";
import { generateTTSAudio, speedToRate } from "./lib/tts";
import { getSignedDownloadUrl, isR2Configured } from "./lib/r2";
import fs from "fs/promises";

export const studioRouter = createRouter({
  // ── List user's studio projects ──
  list: authedQuery
    .use(rateLimitByUser(60_000, 60))
    .query(async ({ ctx }) => {
      return getDb()
        .select()
        .from(studioProjects)
        .where(eq(studioProjects.userId, ctx.user!.id))
        .orderBy(desc(studioProjects.createdAt));
    }),

  // ── Get a studio project with scenes ──
  getById: authedQuery
    .use(rateLimitByUser(60_000, 60))
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [project] = await getDb()
        .select()
        .from(studioProjects)
        .where(
          and(
            eq(studioProjects.id, input.id),
            eq(studioProjects.userId, ctx.user!.id)
          )
        )
        .limit(1);

      if (!project) return null;

      const scenes = await getDb()
        .select()
        .from(studioScenes)
        .where(eq(studioScenes.projectId, input.id))
        .orderBy(studioScenes.order);

      return { ...project, scenes };
    }),

  // ── Create a new studio project ──
  create: authedQuery
    .use(rateLimitByUser(3_600_000, 5))
    .input(
      z.object({
        topic: z.string().min(5).max(500),
        style: z.enum(["educational", "entertaining", "promotional", "documentary"]),
        targetDuration: z.number().min(30).max(600), // 30s to 10min
        audience: z.string().min(2).max(255),
        tone: z.enum(["professional", "casual", "energetic", "calm"]),
        platform: z.enum(["youtube", "tiktok", "linkedin", "instagram"]),
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
        .insert(studioProjects)
        .values({
          userId: ctx.user!.id,
          title: input.topic.slice(0, 100),
          topic: input.topic,
          style: input.style,
          targetDuration: input.targetDuration,
          audience: input.audience,
          tone: input.tone,
          platform: input.platform,
          aspectRatio: input.aspectRatio || "16:9",
          status: "draft",
        })
        .$returningId();

      const [project] = await getDb()
        .select()
        .from(studioProjects)
        .where(eq(studioProjects.id, result.id))
        .limit(1);

      return project;
    }),

  // ── Generate script + fetch media for scenes ──
  generateScript: authedQuery
    .use(rateLimitByUser(300_000, 3))
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // 1. Fetch project and existing scenes
      const [project] = await getDb()
        .select()
        .from(studioProjects)
        .where(
          and(
            eq(studioProjects.id, input.projectId),
            eq(studioProjects.userId, ctx.user!.id)
          )
        )
        .limit(1);

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const existingScenes = await getDb()
        .select()
        .from(studioScenes)
        .where(eq(studioScenes.projectId, input.projectId))
        .orderBy(studioScenes.order);

      // 2. Generate script with LLM
      let script;
      if (isLLMConfigured()) {
        script = await generateVideoScript({
          topic: project.topic,
          style: project.style,
          targetDuration: project.targetDuration,
          audience: project.audience || "general",
          tone: project.tone,
          platform: project.platform,
          existingScenes: existingScenes.length > 0 ? existingScenes.map(s => ({
            order: s.order,
            narration: s.narration,
            sceneDescription: s.sceneDescription || "",
            searchQuery: s.searchQuery || "",
            mediaType: s.mediaType as "image" | "video",
            estimatedDuration: 8
          })) : undefined
        });
      } else {
        // Fallback script
        script = {
          title: project.topic,
          scenes: [
            {
              order: 1,
              narration: `Welcome to this video about ${project.topic}.`,
              sceneDescription: "Introduction",
              searchQuery: project.topic.split(" ").slice(0, 3).join(" "),
              mediaType: "image" as const,
              estimatedDuration: Math.round(project.targetDuration * 0.3),
            },
            {
              order: 2,
              narration: `Let's explore the key aspects of ${project.topic}.`,
              sceneDescription: "Main content",
              searchQuery: project.topic.split(" ").slice(0, 3).join(" "),
              mediaType: "video" as const,
              estimatedDuration: Math.round(project.targetDuration * 0.5),
            },
            {
              order: 3,
              narration: `Thanks for watching our video on ${project.topic}!`,
              sceneDescription: "Conclusion",
              searchQuery: "thank you",
              mediaType: "image" as const,
              estimatedDuration: Math.round(project.targetDuration * 0.2),
            },
          ],
        };
      }

      // Update project with generated title
      await getDb()
        .update(studioProjects)
        .set({
          title: script.title,
          scriptJson: JSON.stringify(script),
          status: "scripted",
        })
        .where(eq(studioProjects.id, input.projectId));

      // Delete existing scenes for this project (in case of regeneration)
      await getDb()
        .delete(studioScenes)
        .where(eq(studioScenes.projectId, input.projectId));

      // Create scene rows and fetch media
      const createdScenes = [];
      for (const scene of script.scenes) {
        let mediaUrl = "";
        let photographerName = "";
        let mediaType = scene.mediaType;

        // Check if we can reuse media from an existing scene
        const reusedScene = existingScenes.find(
          (s) => s.order === scene.order || s.narration === scene.narration || s.searchQuery === scene.searchQuery
        );

        if (reusedScene && reusedScene.mediaUrl) {
          // Reuse existing media to prevent resetting user's work
          mediaUrl = reusedScene.mediaUrl;
          photographerName = reusedScene.photographerName || "";
          mediaType = reusedScene.mediaType;
        } else if (isPexelsConfigured()) {
          // Search Pexels for media
          try {
            const results = await searchMedia(scene.searchQuery, scene.mediaType, 1);
            if (results.length > 0) {
              const media = results[0];
              mediaUrl = media.src;
              photographerName = media.photographer;
              mediaType = media.type;
            }
          } catch (err) {
            console.warn(`[Studio] Pexels search failed for "${scene.searchQuery}":`, err);
          }
        }

        const [sceneResult] = await getDb()
          .insert(studioScenes)
          .values({
            projectId: input.projectId,
            order: scene.order,
            narration: scene.narration,
            sceneDescription: scene.sceneDescription,
            mediaType: mediaType,
            mediaUrl: mediaUrl,
            searchQuery: scene.searchQuery,
            photographerName: photographerName,
            status: "pending",
          })
          .$returningId();

        const [created] = await getDb()
          .select()
          .from(studioScenes)
          .where(eq(studioScenes.id, sceneResult.id))
          .limit(1);

        createdScenes.push(created);
      }

      return { title: script.title, scenes: createdScenes };
    }),

  // ── Update a scene ──
  updateScene: authedQuery
    .use(rateLimitByUser(60_000, 30))
    .input(
      z.object({
        id: z.number(),
        narration: z.string().optional(),
        sceneDescription: z.string().optional(),
        mediaType: z.enum(["image", "video"]).optional(),
        mediaUrl: z.string().optional(),
        searchQuery: z.string().optional(),
        photographerName: z.string().optional(),
        transition: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const [scene] = await getDb()
        .select()
        .from(studioScenes)
        .where(eq(studioScenes.id, id))
        .limit(1);

      if (!scene) throw new Error("Scene not found");

      // Verify ownership
      const [project] = await getDb()
        .select()
        .from(studioProjects)
        .where(
          and(
            eq(studioProjects.id, scene.projectId),
            eq(studioProjects.userId, ctx.user!.id)
          )
        )
        .limit(1);

      if (!project) throw new Error("Not authorized");

      await getDb()
        .update(studioScenes)
        .set(data)
        .where(eq(studioScenes.id, id));

      const [updated] = await getDb()
        .select()
        .from(studioScenes)
        .where(eq(studioScenes.id, id))
        .limit(1);

      return updated;
    }),

  // ── Search Pexels for alternative media ──
  searchMedia: authedQuery
    .use(rateLimitByUser(60_000, 20))
    .input(
      z.object({
        query: z.string().min(1).max(100),
        mediaType: z.enum(["image", "video", "both"]).default("both"),
        perPage: z.number().min(1).max(15).default(6),
      })
    )
    .query(async ({ input }) => {
      if (!isPexelsConfigured()) {
        throw new Error("Pexels API is not configured");
      }
      return searchMedia(input.query, input.mediaType, input.perPage);
    }),

  // ── Update project settings ──
  update: authedQuery
    .use(rateLimitByUser(60_000, 30))
    .input(
      z.object({
        id: z.number(),
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
        introDuration: z.number().min(0.5).max(10.0).optional(),
        outroDuration: z.number().min(0.5).max(10.0).optional(),
        captionsEnabled: z.boolean().optional(),
        captionStyle: z.string().optional(),
        captionSize: z.string().optional(),
        captionPosition: z.string().optional(),
        captionColor: z.string().optional(),
        transitionDuration: z.number().min(0.1).max(3).optional(),
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
          message: "Free tier: only 720p resolution is allowed.",
        });
      }

      if (ctx.user!.plan === "free" && data.musicEnabled) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Free tier: background music is a Pro feature. Upgrade to enable it.",
        });
      }

      await getDb()
        .update(studioProjects)
        .set(updateData)
        .where(
          and(
            eq(studioProjects.id, id),
            eq(studioProjects.userId, ctx.user!.id)
          )
        );

      const [updated] = await getDb()
        .select()
        .from(studioProjects)
        .where(eq(studioProjects.id, id))
        .limit(1);

      return updated;
    }),

  // ── Delete a studio project ──
  delete: authedQuery
    .use(rateLimitByUser(60_000, 20))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await getDb()
        .delete(studioRenderJobs)
        .where(eq(studioRenderJobs.projectId, input.id));
      await getDb()
        .delete(studioScenes)
        .where(eq(studioScenes.projectId, input.id));
      await getDb()
        .delete(studioProjects)
        .where(
          and(
            eq(studioProjects.id, input.id),
            eq(studioProjects.userId, ctx.user!.id)
          )
        );
      return { success: true };
    }),

  // ── Start render ──
  startRender: authedQuery
    .use(rateLimitByUser(600_000, 2))
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [project] = await getDb()
        .select()
        .from(studioProjects)
        .where(
          and(
            eq(studioProjects.id, input.projectId),
            eq(studioProjects.userId, ctx.user!.id)
          )
        )
        .limit(1);

      if (!project) throw new Error("Project not found");

      const scenes = await getDb()
        .select()
        .from(studioScenes)
        .where(eq(studioScenes.projectId, input.projectId));

      if (scenes.length === 0) {
        throw new Error("No scenes to render. Generate a script first.");
      }

      // Mark project as processing
      await getDb()
        .update(studioProjects)
        .set({ status: "processing" })
        .where(eq(studioProjects.id, input.projectId));

      // Reset scene statuses
      for (const scene of scenes) {
        await getDb()
          .update(studioScenes)
          .set({ status: "pending" })
          .where(eq(studioScenes.id, scene.id));
      }

      // Create render job
      await getDb().insert(studioRenderJobs).values({
        projectId: input.projectId,
        status: "queued",
        currentStep: 0,
        totalSteps: scenes.length,
        stage: "queued",
        message: "Waiting in render queue...",
      });

      return { success: true, totalSteps: scenes.length };
    }),

  // ── Get render status ──
  renderStatus: authedQuery
    .use(rateLimitByUser(60_000, 60))
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const [project] = await getDb()
        .select()
        .from(studioProjects)
        .where(
          and(
            eq(studioProjects.id, input.projectId),
            eq(studioProjects.userId, ctx.user!.id)
          )
        )
        .limit(1);

      if (!project) throw new Error("Project not found");

      const [job] = await getDb()
        .select()
        .from(studioRenderJobs)
        .where(eq(studioRenderJobs.projectId, input.projectId))
        .orderBy(desc(studioRenderJobs.createdAt))
        .limit(1);

      // Generate signed URL for the final video
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
        finalVideoPath: project.finalVideoPath,
        finalVideoUrl,
      };
    }),

  // ── Get download URL ──
  getDownloadUrl: authedQuery
    .use(rateLimitByUser(60_000, 30))
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const [project] = await getDb()
        .select()
        .from(studioProjects)
        .where(
          and(
            eq(studioProjects.id, input.projectId),
            eq(studioProjects.userId, ctx.user!.id)
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

  // ── Preview voice (reuses existing TTS) ──
  previewVoice: authedQuery
    .use(rateLimitByUser(60_000, 5))
    .input(z.object({ voice: z.string(), speed: z.number().default(1.0) }))
    .mutation(async ({ input }) => {
      const text = "Welcome to your AI-generated video. This is how your narration will sound.";
      const { filePath } = await generateTTSAudio(text, {
        voice: input.voice,
        rate: speedToRate(input.speed),
      });

      const buffer = await fs.readFile(filePath);
      const base64 = buffer.toString("base64");
      await fs.unlink(filePath).catch(() => {});

      return { audioData: `data:audio/mp3;base64,${base64}` };
    }),

  // ── Copyright check for studio projects ──
  checkCopyright: authedQuery
    .use(rateLimitByUser(60_000, 3))
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const scenes = await getDb()
        .select()
        .from(studioScenes)
        .where(eq(studioScenes.projectId, input.projectId))
        .orderBy(studioScenes.order);

      const imagePaths = scenes
        .map((s) => s.mediaUrl)
        .filter((p): p is string => Boolean(p))
        .slice(0, 3);

      if (imagePaths.length === 0) {
        return { isClear: true, reason: "No media to check. Safe to proceed." };
      }

      return await checkCopyrightImages(imagePaths);
    }),

  // ── Add a new scene ──
  createScene: authedQuery
    .use(rateLimitByUser(60_000, 30))
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const [project] = await getDb()
        .select()
        .from(studioProjects)
        .where(
          and(
            eq(studioProjects.id, input.projectId),
            eq(studioProjects.userId, ctx.user!.id)
          )
        )
        .limit(1);
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

      // Get the current max order
      const [maxRow] = await getDb()
        .select({ maxOrder: max(studioScenes.order) })
        .from(studioScenes)
        .where(eq(studioScenes.projectId, input.projectId));
      const nextOrder = (maxRow?.maxOrder ?? 0) + 1;

      const [inserted] = await getDb().insert(studioScenes).values({
        projectId: input.projectId,
        order: nextOrder,
        narration: "",
        sceneDescription: "New scene",
        mediaType: "image",
        searchQuery: "",
      }).$returningId();

      return {
        id: inserted.id,
        order: nextOrder,
        narration: "",
        sceneDescription: "New scene",
        mediaType: "image" as const,
        mediaUrl: "",
        searchQuery: "",
        photographerName: "",
      };
    }),

  // ── Delete a scene ──
  deleteScene: authedQuery
    .use(rateLimitByUser(60_000, 30))
    .input(z.object({ id: z.number(), projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const [project] = await getDb()
        .select()
        .from(studioProjects)
        .where(
          and(
            eq(studioProjects.id, input.projectId),
            eq(studioProjects.userId, ctx.user!.id)
          )
        )
        .limit(1);
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

      await getDb()
        .delete(studioScenes)
        .where(eq(studioScenes.id, input.id));

      // Re-order remaining scenes
      const remaining = await getDb()
        .select()
        .from(studioScenes)
        .where(eq(studioScenes.projectId, input.projectId))
        .orderBy(studioScenes.order);

      for (let i = 0; i < remaining.length; i++) {
        await getDb()
          .update(studioScenes)
          .set({ order: i + 1 })
          .where(eq(studioScenes.id, remaining[i].id));
      }

      return { success: true };
    }),
});
