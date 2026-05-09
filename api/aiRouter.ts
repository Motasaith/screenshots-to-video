import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { projects, steps } from "@db/schema";
import { eq, and } from "drizzle-orm";
import {
  isLLMConfigured,
  generateTutorialScript,
  validateProjectSetup,
  getGuideMessage,
  getChatMessageResponse,
} from "./lib/llm";
import { generateTTSAudio, speedToRate } from "./lib/tts";
import fs from "fs/promises";

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

export const aiRouter = createRouter({
  validateSetup: authedQuery
    .input(
      z.object({
        title: z.string(),
        description: z.string(),
        platform: z.string(),
      })
    )
    .query(async ({ input }) => {
      // Try real LLM validation
      if (isLLMConfigured()) {
        try {
          return await validateProjectSetup(
            input.title,
            input.description,
            input.platform
          );
        } catch (err) {
          console.warn("LLM validation failed, using fallback:", err);
        }
      }

      // Fallback: heuristic analysis
      const titleQuality =
        input.title.length < 15
          ? "vague"
          : input.title.length > 80
            ? "too_long"
            : "good";
      const descQuality =
        input.description.length < 50
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
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [project] = await getDb()
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, input.projectId),
            eq(projects.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!project) throw new Error("Project not found");

      const projectSteps = await getDb()
        .select()
        .from(steps)
        .where(eq(steps.projectId, input.projectId))
        .orderBy(steps.order);

      let scripts: string[];

      if (isLLMConfigured()) {
        try {
          scripts = await generateTutorialScript(
            project.description || project.title,
            project.platform,
            projectSteps.map((s) => ({
              order: s.order,
              description: s.description,
            }))
          );
        } catch (err) {
          console.warn("LLM script generation failed, using fallback:", err);
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

  suggestZooms: authedQuery
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [project] = await getDb()
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, input.projectId),
            eq(projects.userId, ctx.user.id)
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

  guide: authedQuery
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
          console.warn("LLM guide failed, using fallback:", err);
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

  chat: authedQuery
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
          console.error("LLM chat failed:", err);
          throw new Error("Failed to generate response: " + err.message);
        }
      }
      return { message: "LLM is not configured. I am running in offline fallback mode." };
    }),

  previewVoice: authedQuery
    .input(z.object({ voice: z.string(), speed: z.number().default(1.0) }))
    .mutation(async ({ input }) => {
      try {
        const text = "Hi, I'm your AI guide. This is how your video will sound.";
        const { filePath } = await generateTTSAudio(text, {
          voice: input.voice,
          rate: speedToRate(input.speed),
        });

        // Read file as base64
        const buffer = await fs.readFile(filePath);
        const base64 = buffer.toString("base64");
        
        // Clean up temp file
        await fs.unlink(filePath).catch(() => {});

        return { audioData: `data:audio/mp3;base64,${base64}` };
      } catch (err: any) {
        throw new Error(`Failed to generate voice preview: ${err.message}`);
      }
    }),
});
