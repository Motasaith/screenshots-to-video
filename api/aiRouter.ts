import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery, rateLimitByUser, userError } from "./middleware";
import { getDb } from "./queries/connection";
import { projects, steps } from "@db/schema";
import { eq, and } from "drizzle-orm";
import {
  isLLMConfigured,
  generateTutorialScript,
  validateProjectSetup,
  getGuideMessage,
  getChatMessageResponse,
  getProactiveFeedback,
  checkMediaSafety,
} from "./lib/llm";
import { generateTTSAudio, speedToRate, getElevenLabsCredits } from "./lib/tts";
import { getUserElevenLabsKey } from "./queries/users";
import { saveLocalFile } from "./lib/localStore";
import { detectGibberish } from "./lib/gibberish";
import { createLogger } from "./lib/logger";
import { env } from "./lib/env";
import fs from "fs/promises";

const log = createLogger({ path: "aiRouter" });

// ── Fallback responses when LLM is not configured ──
const FALLBACK_RESPONSES: Record<string, string[]> = {
  "validate-setup": [
    "Your title is specific and clear. The description gives good context for the target audience.",
    "Consider being more specific in your title. Instead of 'Tutorial', try 'How to Clean Windows Temp Files in 5 Minutes'.",
    "Great description! You've clearly defined the audience and outcome. This will help me write a precise script.",
    "Your description could mention the skill level of your audience — beginner or experienced? That helps me write a better script.",
  ],
  "script-feedback": [
    "This script flows well. The language is clear and actionable.",
    "Consider shortening this step — the viewer needs less than 5 seconds to understand this action.",
    "Great use of specific terminology. This will sound professional in the narration.",
    "You might want to mention what the viewer should expect to see after this step.",
  ],
};

function getFallback(category: string): string {
  const responses = FALLBACK_RESPONSES[category] || ["Everything looks good!"];
  return responses[Math.floor(Math.random() * responses.length)];
}

const PLATFORM_FALLBACK_SCRIPTS: Record<string, string[]> = {
  youtube: [
    "Click on the Start menu and type 'Disk Cleanup'. Select the app from the search results.",
    "Select the drive you want to clean. Usually, this is the C: drive where Windows is installed.",
    "Check the boxes for Temporary files and System cache. These are safe to remove.",
    "Click OK to confirm, then click 'Delete Files' when prompted. The cleanup will begin.",
  ],
  teams: [
    "Navigate to the Settings panel by clicking the gear icon in the top-right corner.",
    "From the left sidebar, select Notifications to access notification preferences.",
    "Toggle the switch to enable or disable notifications for mentions and replies.",
    "Click Save to apply your changes. A confirmation message will appear.",
  ],
  tiktok: [
    "Tap the plus icon at the bottom to start creating a new video.",
    "Select the 'Text' option from the editing toolbar at the bottom of the screen.",
    "Type your caption and use the style options to change font and color.",
    "Tap 'Done' and position the text by dragging it to your preferred location.",
  ],
  linkedin: [
    "Click on your profile picture in the top navigation bar to access your profile.",
    "Select the 'Edit' button next to your headline to modify your professional summary.",
    "Type a concise headline that highlights your current role and key expertise.",
    "Click 'Save' to update your profile. Your network will be notified of the change.",
  ],
};

function isGibberish(text: string): boolean {
  return detectGibberish(text).isGibberish;
}

export const aiRouter = createRouter({
  validateSetup: authedQuery
    .use(rateLimitByUser(60_000, 30))
    .input(
      z.object({
        title: z.string(),
        description: z.string(),
        platform: z.string(),
      })
    )
    .query(async ({ input }) => {
      // Fast heuristic check first to override hallucinations
      if (isGibberish(input.title) || isGibberish(input.description)) {
        return {
          titleQuality: isGibberish(input.title) ? "vague" : (input.title.length < 15 ? "vague" : "good"),
          descriptionQuality: isGibberish(input.description) ? "needs_more_detail" : (input.description.length < 50 ? "needs_more_detail" : "good"),
          suggestions: ["It looks like you typed random letters. Please use descriptive text for your video so we can generate a good script!"],
          audienceClarity: false,
          outcomeClarity: false,
        };
      }

      // Try real LLM validation
      if (isLLMConfigured()) {
        try {
          return await validateProjectSetup(
            input.title,
            input.description,
            input.platform
          );
        } catch (err) {
          log.warn("LLM validation failed, using fallback", { error: err instanceof Error ? err.message : String(err) });
        }
      }

      // Fallback: heuristic analysis
      const titleQuality =
        isGibberish(input.title)
          ? "vague"
          : input.title.length < 15
            ? "vague"
            : input.title.length > 80
              ? "too_long"
              : "good";
      const descQuality =
        isGibberish(input.description)
          ? "needs_more_detail"
          : input.description.length < 50
          ? "needs_more_detail"
          : input.description.length > 300
            ? "excellent"
            : "good";

      return {
        titleQuality,
        descriptionQuality: descQuality,
        suggestions: [getFallback("validate-setup")],
        audienceClarity:
          /audience|user|beginner|advanced|team/i.test(input.description),
        outcomeClarity:
          /will|learn|able to|how to/i.test(input.description),
      };
    }),

  analyzeScreenshot: authedQuery
    .use(rateLimitByUser(60_000, 20))
    .input(z.object({ stepId: z.number() }))
    .query(() => {
      // Vision model analysis is a V2 feature — return basic response
      return {
        context: "Screenshot uploaded successfully.",
        resolution: "1920x1080",
        quality: "good",
        suggestion: "Click or drag on the screenshot in Step 4 to set the zoom target.",
      };
    }),

  generateScript: authedQuery
    .use(rateLimitByUser(300_000, 3))
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
        .where(eq(steps.projectId, input.projectId))
        .orderBy(steps.order);

      // Reject gibberish descriptions before burning LLM tokens. Tell the
      // client which steps are bad so the UI can highlight them.
      const badSteps = projectSteps
        .map((s) => ({ s, g: detectGibberish(s.description) }))
        .filter((x) => x.g.isGibberish)
        .map((x) => ({ stepId: x.s.id, order: x.s.order, reason: x.g.reason }));

      if (badSteps.length > 0) {
        throw new Error(
          `Step ${badSteps[0].order} looks like random text. Please write a real description for it. (${badSteps[0].reason})`
        );
      }

      // Reject empty or default-pattern descriptions.
      const emptyOrPlaceholderSteps = projectSteps.filter(
        (s) => !s.description || !s.description.trim() || /^scene\s+\d+$/i.test(s.description.trim())
      );
      if (emptyOrPlaceholderSteps.length > 0) {
        throw new Error(
          `Step ${emptyOrPlaceholderSteps[0].order} has no description. Please write a description for this step first.`
        );
      }

      let scripts: string[];

      if (isLLMConfigured()) {
        try {
          log.info("Using text-only script generation with title and description");
          scripts = await generateTutorialScript(
            project.title,
            project.description || null,
            project.platform,
            projectSteps.map((s) => ({
              order: s.order,
              description: s.description,
              screenshotPath: s.screenshotPath || undefined,
            }))
          );
        } catch (err) {
          log.warn("LLM script generation failed, using fallback", { error: err instanceof Error ? err.message : String(err) });
          const fallback =
            PLATFORM_FALLBACK_SCRIPTS[project.platform] ||
            PLATFORM_FALLBACK_SCRIPTS.youtube;
          scripts = projectSteps.map(
            (_, i) => fallback[i % fallback.length]
          );
        }
      } else {
        // Use fallback scripts
        const fallback =
          PLATFORM_FALLBACK_SCRIPTS[project.platform] ||
          PLATFORM_FALLBACK_SCRIPTS.youtube;
        scripts = projectSteps.map(
          (_, i) => fallback[i % fallback.length]
        );
      }

      // Update each step with the generated script
      const updatedSteps = [];
      for (let i = 0; i < projectSteps.length; i++) {
        const step = projectSteps[i];
        const script = scripts[i] || `Proceed with step ${i + 1} as shown.`;

        await getDb()
          .update(steps)
          .set({
            aiScript: script,
            userEditedScript: script,
          })
          .where(eq(steps.id, step.id));

        const [updated] = await getDb()
          .select()
          .from(steps)
          .where(eq(steps.id, step.id))
          .limit(1);

        updatedSteps.push(updated);
      }

      return { scripts: updatedSteps.map((s) => s.aiScript) };
    }),

  regenerateStepScript: authedQuery
    .use(rateLimitByUser(60_000, 15))
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
          and(
            eq(projects.id, step.projectId),
            eq(projects.userId, ctx.user!.id)
          )
        )
        .limit(1);

      if (!project) throw new Error("Not authorized");

      // Reject gibberish descriptions so the LLM never writes troll narration.
      const g = detectGibberish(step.description);
      if (g.isGibberish) {
        throw new Error(
          `Step ${step.order} looks like random text. Please write a real description for it. (${g.reason})`
        );
      }

      // Reject empty or default-pattern description.
      if (!step.description || !step.description.trim() || /^scene\s+\d+$/i.test(step.description.trim())) {
        throw new Error(
          `Step ${step.order} has no description. Please write a description for this step first.`
        );
      }

      let newScript: string;

      if (isLLMConfigured()) {
        try {
          log.info("Using text-only generation with title and description");
          const allScripts = await generateTutorialScript(
            project.title,
            project.description || null,
            project.platform,
            [
              {
                order: step.order,
                description: step.description,
                screenshotPath: step.screenshotPath || undefined,
              },
            ]
          );
          newScript =
            allScripts[0] ||
            `Proceed with step ${step.order} as shown on screen.`;
        } catch (err) {
          log.warn("LLM single-step regeneration failed", { error: err instanceof Error ? err.message : String(err) });
          newScript = `${step.description}.`;
        }
      } else {
        // No LLM: derive a script directly from the user's description so it
        // is at least on-topic, even if not fancy.
        newScript = step.description.endsWith(".")
          ? step.description
          : `${step.description}.`;
      }

      await getDb()
        .update(steps)
        .set({
          aiScript: newScript,
          userEditedScript: newScript,
        })
        .where(eq(steps.id, input.stepId));

      return { stepId: input.stepId, script: newScript };
    }),

  suggestZooms: authedQuery
    .use(rateLimitByUser(300_000, 5))
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

      // For V1: use center-weighted random suggestions
      // A vision model could improve this in V2
      const suggestions = [];
      for (const step of projectSteps) {
        const targetX = 30 + Math.random() * 40; // 30-70% range
        const targetY = 25 + Math.random() * 30; // 25-55% range

        await getDb()
          .update(steps)
          .set({
            zoomTargetX: targetX,
            zoomTargetY: targetY,
            zoomRectX: Math.max(0, targetX - 15),
            zoomRectY: Math.max(0, targetY - 10),
            zoomRectWidth: 30,
            zoomRectHeight: 25,
          })
          .where(eq(steps.id, step.id));

        suggestions.push({
          stepId: step.id,
          x: targetX,
          y: targetY,
          rect: {
            x: Math.max(0, targetX - 15),
            y: Math.max(0, targetY - 10),
            width: 30,
            height: 25,
          },
        });
      }

      return { suggestions };
    }),

  checkMediaSafety: authedQuery
    .use(rateLimitByUser(60_000, 10))
    .input(z.object({ stepId: z.number().optional(), mediaUrl: z.string() }))
    .mutation(async ({ input }) => {
      // Send to Vision LLM for check
      const result = await checkMediaSafety(input.mediaUrl);

      // Save the result to the step in the database if stepId is provided
      if (input.stepId) {
        await getDb()
          .update(steps)
          .set({
            isSafe: result.isSafe && result.isClear ? 1 : 0,
            safetyReason: result.reason,
          })
          .where(eq(steps.id, input.stepId));
      }

      return result;
    }),

  guide: authedQuery
    .use(rateLimitByUser(60_000, 20))
    .input(
      z.object({
        currentStep: z.string(),
        eventType: z.string(),
        context: z.object({}).passthrough(),
      })
    )
    .query(async ({ input }) => {
      // Try real LLM guidance
      if (isLLMConfigured()) {
        try {
          const message = await getGuideMessage(
            input.currentStep,
            input.eventType,
            input.context as Record<string, any>
          );
          return { message };
        } catch (err) {
          log.warn("LLM guide failed, using fallback", { error: err instanceof Error ? err.message : String(err) });
        }
      }

      // Fallback responses
      const responses: Record<string, string> = {
        setup_load:
          "Welcome! Start by giving your video a specific title and describing what it's about.",
        setup_title:
          "Your title sets the tone for the entire video. Be specific about what viewers will learn.",
        setup_description: getFallback("validate-setup"),
        upload_load:
          "Add screenshots for each step of your tutorial. Make sure each one is clear and well-cropped.",
        upload_screenshot:
          "Screenshot uploaded. Make sure the key UI element is visible and readable.",
        upload_description:
          "Be specific about what the viewer should click or notice in this step.",
        script_load:
          "Review the AI-generated script. Feel free to edit — you know your workflow best.",
        script_review: getFallback("script-feedback"),
        annotate_load:
          "Click or drag on each screenshot to tell the video where to zoom. This creates the cinematic effect.",
        annotate_zoom:
          "Good placement! The zoom will smoothly animate to this region during playback.",
        voice_load:
          "Choose a voice that matches your content style and audience expectations.",
        voice_select:
          "For YouTube tutorials, a confident and clear voice at 1.0x speed works best.",
        render_load:
          "Your video is being generated. This typically takes 2-5 minutes.",
        export_load:
          "Your video is ready! You can download it or share directly to your platform.",
      };

      return {
        message:
          responses[input.eventType] ||
          responses[`${input.currentStep}_load`] ||
          "I'm here to help. Ask me anything about your project.",
      };
    }),

  proactiveFeedback: authedQuery
    .use(rateLimitByUser(60_000, 20))
    .input(
      z.object({
        currentStep: z.string(),
        context: z.object({}).passthrough(),
      })
    )
    .mutation(async ({ input }) => {
      const title = (input.context as any)?.projectData?.title || "";
      const desc = (input.context as any)?.projectData?.description || "";
      
      // Fast heuristic check first (overrides LLM if obvious gibberish is found)
      if (title.length > 5 && isGibberish(title)) {
        return { message: "It looks like your title might be random letters. Try giving your project a clear, descriptive name!" };
      }
      if (desc.length > 10 && isGibberish(desc)) {
        return { message: "Your description seems to contain some random typing. Adding a clear description helps generate a much better script!" };
      }

      if (isLLMConfigured()) {
        try {
          const message = await getProactiveFeedback(
            input.currentStep,
            input.context as Record<string, any>
          );
          return { message };
        } catch (err) {
          log.warn("LLM proactive feedback failed", { error: err instanceof Error ? err.message : String(err) });
        }
      }
      return { message: "" };
    }),

  chat: authedQuery
    .use(rateLimitByUser(60_000, 10))
    .input(
      z.object({
        history: z.array(z.object({ role: z.enum(["user", "ai"]), content: z.string() })),
        currentStep: z.string(),
        context: z.object({}).passthrough(),
      })
    )
    .mutation(async ({ input }) => {
      if (isLLMConfigured()) {
        try {
          const message = await getChatMessageResponse(
            input.history,
            input.currentStep,
            input.context as Record<string, any>
          );
          return { message };
        } catch (err: any) {
          log.error("LLM chat failed", err);
          throw new Error("Failed to generate response: " + err.message);
        }
      }
      return { message: "LLM is not configured. I am running in offline fallback mode." };
    }),

  previewVoice: authedQuery
    .use(rateLimitByUser(60_000, 5))
    .input(z.object({ voice: z.string(), speed: z.number().default(1.0), text: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const text = input.text || "Hi, I'm your AI guide. This is how your video will sound.";
        const elevenlabsApiKey = input.voice.startsWith("elevenlabs:")
          ? (await getUserElevenLabsKey(ctx.user!.id)) ?? undefined
          : undefined;
        const { filePath, engine, fellBackFrom } = await generateTTSAudio(text, {
          voice: input.voice,
          rate: speedToRate(input.speed),
          elevenlabsApiKey,
        });

        // Read file as base64
        const buffer = await fs.readFile(filePath);
        const base64 = buffer.toString("base64");
        
        // Clean up temp file
        await fs.unlink(filePath).catch(() => {});

        const mime = filePath.endsWith(".wav") ? "audio/wav" : "audio/mp3";
        // Tell the client when this is a stand-in rather than the requested
        // voice, so a preview that sounds wrong can say why.
        return {
          audioData: `data:${mime};base64,${base64}`,
          engine,
          substituted: !!fellBackFrom,
        };
      } catch (err) {
        // The upstream reason is worth keeping even though the user gets a
        // short message: a failing voice is usually a provider outage or a bad
        // key, and neither is diagnosable from the sanitised text.
        log.error("Voice preview failed", err, { voice: input.voice });
        throw userError("That voice could not be previewed right now. Try another voice.");
      }
    }),

  // ── ElevenLabs remaining credits ──
  elevenLabsCredits: authedQuery
    .use(rateLimitByUser(60_000, 30))
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      // Report the user's own key credits (BYOK). Falls back to the server key
      // only if configured (legacy/admin) — see getElevenLabsCredits.
      const userKey = (await getUserElevenLabsKey(ctx.user!.id)) ?? undefined;
      return await getElevenLabsCredits(userKey);
    }),

  generateVoiceForStep: authedQuery
    .use(rateLimitByUser(60_000, 10))
    .input(z.object({ stepId: z.number(), voice: z.string(), speed: z.number() }))
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

      const script = step.userEditedScript || step.aiScript || step.description;
      const elevenlabsApiKey = input.voice.startsWith("elevenlabs:")
        ? (await getUserElevenLabsKey(ctx.user!.id)) ?? undefined
        : undefined;
      const { filePath, duration } = await generateTTSAudio(script, {
        voice: input.voice,
        rate: speedToRate(input.speed),
        elevenlabsApiKey,
      });

      try {
        const audioBuffer = await fs.readFile(filePath);
        // Narration is only ever read back as a presence flag (the AUDIO
        // badge, the export checkmark and count, the timeline indicator), so
        // it has no reason to leave the machine that generated it.
        const audioKey = await saveLocalFile(audioBuffer, {
          userId: ctx.user!.id,
          folder: "audio",
          filename: `step_${step.id}.mp3`,
        });

        await getDb()
          .update(steps)
          .set({
            audioPath: audioKey,
            audioDuration: duration,
          })
          .where(eq(steps.id, step.id));

        return { success: true, audioPath: audioKey, duration };
      } finally {
        await fs.unlink(filePath).catch(() => {});
      }
    }),

  generateAllVoices: authedQuery
    .use(rateLimitByUser(60_000, 5))
    .input(z.object({ projectId: z.number(), voice: z.string(), speed: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [project] = await getDb()
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user!.id))
        )
        .limit(1);

      if (!project) throw new Error("Not authorized");

      const projectSteps = await getDb()
        .select()
        .from(steps)
        .where(eq(steps.projectId, input.projectId))
        .orderBy(steps.order);

      const elevenlabsApiKey = input.voice.startsWith("elevenlabs:")
        ? (await getUserElevenLabsKey(ctx.user!.id)) ?? undefined
        : undefined;

      for (const step of projectSteps) {
        const script = step.userEditedScript || step.aiScript || step.description;
        const { filePath, duration } = await generateTTSAudio(script, {
          voice: input.voice,
          rate: speedToRate(input.speed),
          elevenlabsApiKey,
        });

        try {
          const audioBuffer = await fs.readFile(filePath);
          const audioKey = await saveLocalFile(audioBuffer, {
            userId: ctx.user!.id,
            folder: "audio",
            filename: `step_${step.id}.mp3`,
          });

          await getDb()
            .update(steps)
            .set({
              audioPath: audioKey,
              audioDuration: duration,
            })
            .where(eq(steps.id, step.id));
        } finally {
          await fs.unlink(filePath).catch(() => {});
        }
      }

      return { count: projectSteps.length };
    }),

  /**
   * Turn a plain-English instruction into validated editor operations.
   *
   * Returns operations rather than applying them: the client feeds the result
   * through the same history stack a manual edit uses, so Ctrl+Z undoes an AI
   * change exactly like any other. The model never touches annotation state
   * directly — anything that fails the schema is dropped rather than saved.
   */
  editScene: authedQuery
    .use(rateLimitByUser(60_000, 20))
    .input(
      z.object({
        stepId: z.number(),
        instruction: z.string().min(2).max(500),
        /** Current annotation state, so the model can reason about what exists. */
        current: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { editorOpsResponseSchema, EDITOR_OPS_REFERENCE } = await import(
        "@contracts/editorOps"
      );
      const { chatCompletion } = await import("./lib/llm");
      const { buildGuideSystemPrompt } = await import("./lib/productKnowledge");

      // Ownership: a step id from another account must not be editable.
      const [row] = await getDb()
        .select({
          stepId: steps.id,
          ownerId: projects.userId,
          description: steps.description,
          screenshotPath: steps.screenshotPath,
        })
        .from(steps)
        .innerJoin(projects, eq(steps.projectId, projects.id))
        .where(eq(steps.id, input.stepId))
        .limit(1);

      if (!row || row.ownerId !== ctx.user!.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });
      }

      // Show the model the actual screenshot.
      //
      // Without this it was working from the scene's text description alone, so
      // any instruction that referred to something visible ("blur the face",
      // "highlight the Save button") hit the rule below about not guessing
      // coordinates and came back refusing to act. It was behaving correctly for
      // something that could not see; the fix is to let it see.
      //
      // Video scenes are skipped rather than frame-extracted: a still is what
      // the coordinate space refers to, and picking an arbitrary frame to
      // measure against would put annotations in the wrong place.
      const { loadMediaAsDataUri, isVideoKey } = await import("./lib/mediaSource");
      const screenshot =
        row.screenshotPath && !isVideoKey(row.screenshotPath)
          ? await loadMediaAsDataUri(row.screenshotPath)
          : null;

      const system = buildGuideSystemPrompt(
        `You are editing one scene. Reply ONLY with JSON matching:
{"summary": "<one sentence, past tense, what you changed>", "ops": [ ... ]}

${EDITOR_OPS_REFERENCE}

${
  screenshot
    ? `The scene's screenshot is attached. Read it to locate whatever the
instruction refers to, and express the region as percentages of that image:
x and y are the top-left corner, w and h the size, all 0-100, with 0,0 at the
top left. Pad a face or a text field slightly so the whole thing is covered.
If you genuinely cannot find what was asked for in the image, say so in the
summary and return no ops.`
    : `No screenshot is available for this scene, so you cannot see it. Do not
guess coordinates: return no ops and say in the summary that you cannot see the
scene.`
}

Return {"summary": "...", "ops": []} if the request is unclear or outside these
operations, and explain why in the summary. Never invent an operation name.`
      );

      const userText = `Scene: ${row.description || "(no description)"}
Current annotations: ${JSON.stringify(input.current ?? {})}

Instruction: ${input.instruction}`;

      const raw = await chatCompletion(
        [
          { role: "system", content: system },
          {
            role: "user",
            content: screenshot
              ? [
                  { type: "text", text: userText },
                  { type: "image_url", image_url: { url: screenshot.dataUri } },
                ]
              : userText,
          },
        ],
        {
          // The vision model only when there is an image to read; the text model
          // is faster and cheaper for instructions that need no picture.
          model: screenshot ? env.visionLlmModel : env.llmModel,
          temperature: 0.2,
          maxTokens: 700,
          jsonMode: true,
        }
      );

      // Models wrap JSON in prose or fences often enough to be worth handling.
      const jsonText = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        return { summary: "I could not turn that into an edit. Try rephrasing.", ops: [] };
      }

      // Rewrite `{"addBlur": {...}}` into `{"op": "addBlur", ...}` before
      // validating. The model produces that shape often, and it used to be
      // dropped by the schema, so a correctly located blur turned into "no ops".
      const { normalizeEditorOp } = await import("@contracts/editorOps");
      if (parsed && typeof parsed === "object" && Array.isArray((parsed as any).ops)) {
        (parsed as any).ops = (parsed as any).ops.map(normalizeEditorOp);
      }

      const result = editorOpsResponseSchema.safeParse(parsed);
      if (!result.success) {
        // Salvage whatever individual ops are valid rather than failing wholesale.
        const maybeOps = (parsed as any)?.ops;
        const { editorOpSchema } = await import("@contracts/editorOps");
        const ops = Array.isArray(maybeOps)
          ? maybeOps.map((o) => editorOpSchema.safeParse(o)).filter((r) => r.success).map((r) => (r as any).data)
          : [];
        return {
          summary:
            typeof (parsed as any)?.summary === "string"
              ? (parsed as any).summary
              : ops.length
                ? "Applied the parts of that I could."
                : "I could not turn that into an edit.",
          ops,
        };
      }

      return result.data;
    }),

  /**
   * Download a Pexels asset server-side and store it.
   *
   * The editor used to fetch the file straight from the browser. That works for
   * photos, because Pexels' image CDN sends permissive CORS headers — but the
   * video files do not, so `fetch` was rejected before it ever reached the
   * network and surfaced as "NetworkError when attempting to fetch resource".
   * No amount of client-side retrying fixes that; the request has to originate
   * from somewhere without a same-origin policy.
   *
   * Host-allowlisted so this cannot be used as a general-purpose fetch proxy.
   */
  importMedia: authedQuery
    .use(rateLimitByUser(60_000, 20))
    .input(
      z.object({
        url: z.string().url(),
        type: z.enum(["image", "video"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ALLOWED_HOSTS = [
        "images.pexels.com",
        "videos.pexels.com",
        "player.vimeo.com",
        "www.pexels.com",
      ];

      let host: string;
      try {
        const parsed = new URL(input.url);
        if (parsed.protocol !== "https:") throw new Error("not https");
        host = parsed.hostname.toLowerCase();
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid media URL" });
      }

      if (!ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
        log.warn("Blocked media import from unexpected host", { host });
        throw new TRPCError({ code: "BAD_REQUEST", message: "Unsupported media source" });
      }

      const res = await fetch(input.url, { signal: AbortSignal.timeout(60_000) });
      if (!res.ok) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Could not download the media (${res.status})`,
        });
      }

      // Videos in particular can be large; refuse rather than fill the disk.
      const MAX_BYTES = 60 * 1024 * 1024;
      const declared = Number(res.headers.get("content-length") || 0);
      if (declared > MAX_BYTES) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That file is too large to import" });
      }

      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.byteLength > MAX_BYTES) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That file is too large to import" });
      }

      const contentType = res.headers.get("content-type") || "";
      const ext =
        input.type === "video"
          ? contentType.includes("webm") ? ".webm" : ".mp4"
          : contentType.includes("png") ? ".png" : ".jpg";

      const key = await saveLocalFile(bytes, {
        userId: ctx.user!.id,
        folder: "screenshots",
        filename: `pexels${ext}`,
      });

      log.info("Imported media from Pexels", {
        userId: ctx.user!.id,
        host,
        bytes: bytes.byteLength,
      });

      return { key, type: input.type };
    }),

  // ── Search Pexels stock media (used by editor) ──
  searchMedia: authedQuery
    .use(rateLimitByUser(60_000, 20))
    .input(z.object({
      query: z.string().min(1).max(200),
      mediaType: z.enum(["both", "image", "video"]).default("both"),
      perPage: z.number().min(1).max(50).default(12),
    }))
    .query(async ({ input }) => {
      const { searchMedia } = await import("./lib/pexels");
      return searchMedia(input.query, input.mediaType, input.perPage);
    }),
});
