import { env } from "./env";

import { buildGuideSystemPrompt } from "./productKnowledge";
import { createLogger } from "./logger";
import { parseMediaRef } from "./mediaRef";
import { loadMediaAsDataUri } from "./mediaSource";
import { localFilePath } from "./localStore";

const log = createLogger({ path: "llm" });

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

interface ChatResponse {
  id: string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/**
 * Send a chat completion request to an OpenAI-compatible API.
 * Works with: OpenAI, Ollama, LM Studio, OpenRouter, etc.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  opts?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
  }
): Promise<string> {
  const baseUrl = env.llmBaseUrl;
  const apiKey = env.llmApiKey;
  const model = opts?.model || env.llmModel;

  if (!baseUrl) {
    throw new Error(
      "LLM is not configured. Set LLM_BASE_URL in .env (e.g. http://localhost:11434/v1 for Ollama)"
    );
  }

  const body: Record<string, any> = {
    model,
    messages,
    temperature: opts?.temperature ?? 0.7,
  };

  if (opts?.maxTokens) body.max_tokens = opts.maxTokens;
  if (opts?.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    log.error(`Error with model ${model}`, undefined, { model, error: errorText });
    throw new Error(`LLM API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as ChatResponse;
  log.info(`Successfully received response from model: ${model}`);
  return data.choices?.[0]?.message?.content || "";
}

/**
 * Generate a narration script for tutorial steps.
 */
export async function generateTutorialScript(
  title: string,
  description: string | null,
  platform: string,
  steps: Array<{ order: number; description: string; screenshotPath?: string }>
): Promise<string[]> {
  const stepsText = steps
    .map((s) => `Step ${s.order}: ${s.description}`)
    .join("\n");

  const prompt = `You are a friendly YouTuber recording a screen tutorial voiceover. Write the narration for each step EXACTLY as a real person would say it out loud — this text goes straight into a text-to-speech engine.

Video Title: ${title}
Video Description: ${description || "None provided"}
Target platform: ${platform}

How a real tutorial narrator talks:
- Conversational and warm, like explaining to a friend sitting next to you. Always use contractions (we're, you'll, it's, don't).
- OCCASIONALLY open a step with a natural spoken transition: "Alright,", "Okay, so", "Next up,", "Now,", "And then", "Here's the thing —". Vary them; never use the same opener twice in a row, and leave some steps with no opener at all.
- Once or twice in the WHOLE video (not every step), add a small human touch like "hmm, let's see", "right, so", or a brief aside ("...and that's it, easy").
- Step 1 should greet the viewer briefly and say what they'll learn (one short sentence, no channel-style intro). The LAST step should wrap up naturally ("And that's all there is to it...").
- Use punctuation to control speech rhythm: commas for short pauses, "..." for a thinking pause, "—" for a beat. Short sentences. Vary sentence length.
- Refer to what's on screen: "this button right here", "up in the top corner", "see that menu?".
- 1-3 sentences per step. Be specific about the action. No markdown, no emoji, no stage directions, no quotes around UI names — say them plainly.

CRITICAL RULES:
- Every script MUST be written SPECIFICALLY for the step description it is paired with. Do NOT invent steps, do NOT add steps that are not in the list, do NOT rearrange them.
- The narration for step N must describe EXACTLY the action in "Step N" below. If a step says "scroll down on the left sidebar and select About", the narration must be about scrolling down the left sidebar and selecting About — not about something else.
- Never reuse a script from another step. Each step's script is unique.
- If a step description mentions a specific UI element (button, menu, tab, field), mention it in the narration so the viewer knows what to look at on screen.
- Keep the script faithful to the user's description. Do not add unrelated actions, do not skip the action, do not summarize it away.

Steps (in order — write one script per step, in this exact order):
${stepsText}

Return ONLY a JSON object with this exact format:
{"scripts": ["narration for step 1", "narration for step 2", ...]}
The array MUST have exactly ${steps.length} entries, in the same order as the steps above. Do not add or remove entries.`;

  const response = await chatCompletion(
    [{ role: "user", content: prompt }],
    { temperature: 0.8, jsonMode: true }
  );

  // Strip markdown code fences if present (common with smaller models like gemma3)
  const cleanResponse = response
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleanResponse);
    if (Array.isArray(parsed.scripts)) {
      return parsed.scripts;
    }
    // Some models may return an array directly
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    log.warn("LLM returned non-JSON response, attempting to parse", { response: cleanResponse.substring(0, 200) });
  }

  // Second attempt: try to find JSON within the response
  const jsonMatch = cleanResponse.match(/\{[\s\S]*"scripts"\s*:\s*\[[\s\S]*\]\s*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed.scripts)) {
        return parsed.scripts;
      }
    } catch {
      // Continue to fallback
    }
  }

  // Fallback: split response by numbered lines
  const lines = cleanResponse
    .split("\n")
    .filter((l) => l.trim().length > 0 && !l.trim().startsWith("{") && !l.trim().startsWith("}") && !l.trim().startsWith('"scripts"'))
    .map((l) => l.replace(/^[\d]+[.)-]\s*/, "").replace(/^"/, "").replace(/"[,]?\s*$/, "").trim())
    .filter((l) => l.length > 10); // Filter out fragments

  return lines.length >= steps.length
    ? lines.slice(0, steps.length)
    : steps.map((_, i) => lines[i] || `Proceed with step ${i + 1} as shown on screen.`);
}

/* ------------------------------------------------------------------ */
/*  Vision-based script generation (Gemma 4)                          */
/* ------------------------------------------------------------------ */

/**
 * Load an image from a URL or local path and return a base64 data URL.
 * Reuses the same logic as checkMediaSafety.
 */
/**
 * Load a stored screenshot for a vision prompt.
 *
 * Every reference goes through `parseMediaRef`, which accepts only this
 * application's own storage keys. Before that, this function resolved the string
 * with `path.resolve` and read it off disk, so a step whose `screenshotPath` was
 * `"../../.env"` had that file's contents sent to the model as its screenshot.
 * It also fetched any http(s) URL, which is a request forgery into the host's
 * own network. Both branches are gone; neither was ever needed, because remote
 * media is downloaded at import time by the host-allowlisted `ai.importMedia`.
 */
async function loadImageAsDataUrl(mediaPath: string): Promise<{ dataUrl: string } | null> {
  try {
    const ref = parseMediaRef(mediaPath);
    if (!ref) return null;

    const isVideo = /\.(mp4|webm|mov)$/i.test(ref.key);
    if (isVideo) {
      // Frame extraction needs a real path, and only a local key has one.
      const abs = ref.kind === "local" ? await localFilePath(ref.key) : null;
      if (!abs) return null;
      const buffers = await extractVideoFrames(abs, 2);
      if (buffers.length === 0) return null;
      return { dataUrl: `data:image/jpeg;base64,${buffers[0].toString("base64")}` };
    }

    const loaded = await loadMediaAsDataUri(mediaPath);
    if (!loaded) return null;
    return { dataUrl: loaded.dataUri };
  } catch (e) {
    log.warn("Failed to load image as data URL", { path: mediaPath, error: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

/**
 * Generate a narration script for a single step by sending its screenshot
 * to the vision model (Gemma 4). The model looks at the image and writes
 * a narration that describes what's shown on screen.
 *
 * @param screenshotPath - URL or local path to the screenshot/video
 * @param stepDescription - Optional user-provided description of this step
 * @param projectTitle - The project title for context
 * @param platform - Target platform (youtube, tiktok, etc.)
 * @param stepNumber - Which step number this is (1-indexed)
 * @param totalSteps - Total number of steps
 */
export async function generateVisionScript(
  screenshotPath: string,
  stepDescription: string | null,
  projectTitle: string,
  platform: string,
  stepNumber: number,
  totalSteps: number
): Promise<string> {
  const imageData = await loadImageAsDataUrl(screenshotPath);
  if (!imageData) {
    // Fallback to text-only if image can't be loaded
    return generateSingleStepScript(stepDescription || `Step ${stepNumber}`, projectTitle, platform, stepNumber, totalSteps);
  }

  const isFirst = stepNumber === 1;
  const isLast = stepNumber === totalSteps;

  const promptText = `You are a friendly YouTuber recording a screen tutorial voiceover. Look at this screenshot and write the narration for step ${stepNumber} of ${totalSteps}.

Video topic: ${projectTitle}
Target platform: ${platform}
${stepDescription ? `User's description of this step: "${stepDescription}"` : "No user description provided — analyze the screenshot and write the narration."}

${isFirst ? "This is the FIRST step: briefly greet the viewer and say what they'll learn (one short sentence), then describe what's shown." : ""}
${isLast ? "This is the LAST step: describe what's shown, then wrap up naturally (e.g. 'And that's all there is to it!')." : ""}

How a real tutorial narrator talks:
- Conversational and warm, like explaining to a friend. Use contractions (we're, you'll, it's, don't).
- Refer to what's on screen: "this button right here", "up in the top corner", "see that menu?".
- 1-3 sentences. Be specific about the action. No markdown, no emoji, no stage directions.
- Use punctuation to control speech rhythm: commas for pauses, "..." for thinking, "—" for a beat.

Write ONLY the narration text. No JSON, no quotes, no labels. Just the words the narrator would say.`;

  const contentParts: any[] = [
    { type: "text", text: promptText },
    { type: "image_url", image_url: { url: imageData.dataUrl } },
  ];

  const response = await chatCompletion(
    [{ role: "user", content: contentParts }],
    {
      model: env.visionLlmModel,
      temperature: 0.8,
      maxTokens: 200,
    }
  );

  // Clean up response
  let script = response.trim();
  // Strip code fences if present
  script = script.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  // Strip surrounding quotes
  script = script.replace(/^["']|["']$/g, "").trim();
  // Strip "Narration:" or "Script:" prefixes
  script = script.replace(/^(narration|script|step \d+)[:\s]*/i, "").trim();

  return script || `Now, let's move on to step ${stepNumber}. As you can see on screen, ${stepDescription || "follow the action shown here"}.`;
}

/**
 * Generate a single step's script using text-only model (fallback when no screenshot).
 */
async function generateSingleStepScript(
  stepDescription: string,
  projectTitle: string,
  platform: string,
  stepNumber: number,
  totalSteps: number
): Promise<string> {
  const isFirst = stepNumber === 1;
  const isLast = stepNumber === totalSteps;

  const prompt = `You are a friendly YouTuber recording a screen tutorial voiceover. Write the narration for step ${stepNumber} of ${totalSteps}.

Video topic: ${projectTitle}
Target platform: ${platform}
Step description: "${stepDescription}"

${isFirst ? "This is the FIRST step: briefly greet the viewer and say what they'll learn, then describe the action." : ""}
${isLast ? "This is the LAST step: describe the action, then wrap up naturally." : ""}

Write ONLY the narration text (1-3 sentences). No JSON, no quotes, no labels. Just the words the narrator would say.`;

  const response = await chatCompletion(
    [{ role: "user", content: prompt }],
    { temperature: 0.8, maxTokens: 200 }
  );

  const script = response.trim().replace(/^["']|["']$/g, "").trim();
  return script || `Now, let's move on to step ${stepNumber}. ${stepDescription}`;
}

/**
 * Hybrid script generation: uses vision model for steps with screenshots,
 * and text model for steps without screenshots. This allows mixing
 * screenshots and video clips in the same project.
 *
 * @param projectTitle - The project title
 * @param projectDescription - Optional user-provided video description/purpose
 * @param platform - Target platform
 * @param steps - Array of steps with optional screenshots and descriptions
 * @returns Array of narration scripts, one per step
 */
export async function generateHybridScripts(
  projectTitle: string,
  projectDescription: string | null,
  platform: string,
  steps: Array<{ order: number; description: string; screenshotPath?: string | null }>
): Promise<string[]> {
  const totalSteps = steps.length;
  const contentParts: any[] = [];
  
  const promptText = `You are a friendly YouTuber recording a screen tutorial voiceover. You must write the narration script for an entire tutorial video consisting of ${totalSteps} steps.
  
Video topic: ${projectTitle}
Target platform: ${platform}
${projectDescription ? `Project purpose: ${projectDescription}` : ""}

How a real tutorial narrator talks:
- Conversational and warm, like explaining to a friend. Use contractions (we're, you'll, it's, don't).
- Step 1 should greet the viewer briefly and say what they'll learn (one short sentence).
- The LAST step should wrap up naturally (e.g. 'And that's all there is to it!').
- Refer to what's on screen: "this button right here", "up in the top corner", "see that menu?".
- 1-3 sentences per step. Be specific about the action. No markdown, no emoji, no stage directions.
- Use punctuation to control speech rhythm: commas for pauses, "..." for thinking, "—" for a beat.
- DO NOT use the exact same opening words for consecutive steps. Make the transitions flow naturally.

I am going to provide you with the descriptions and screenshots (if available) for all ${totalSteps} steps in order. 
Analyze them ALL together to understand the full context of the video. 
Then, generate the script for EACH step.

Return ONLY a valid JSON object in this format:
{
  "scripts": [
    "Narration for step 1",
    "Narration for step 2"
  ]
}
Ensure the "scripts" array has exactly ${totalSteps} items.`;

  contentParts.push({ type: "text", text: promptText });

  for (const step of steps) {
    const hasScreenshot = step.screenshotPath && !step.screenshotPath.startsWith("blob:");
    
    contentParts.push({ 
      type: "text", 
      text: `\n\n--- STEP ${step.order} ---\nDescription: ${step.description || "No description provided."}` 
    });

    if (hasScreenshot) {
      const imageData = await loadImageAsDataUrl(step.screenshotPath!);
      if (imageData) {
        contentParts.push({ type: "text", text: `Screenshot for Step ${step.order}:` });
        contentParts.push({ type: "image_url", image_url: { url: imageData.dataUrl } });
      } else {
        contentParts.push({ type: "text", text: `(Screenshot unavailable for Step ${step.order})` });
      }
    }
  }

  log.info(`Requesting holistic generation for ${totalSteps} steps...`);
  
  try {
    const response = await chatCompletion(
      [{ role: "user", content: contentParts }],
      {
        model: env.visionLlmModel,
        temperature: 0.8,
        maxTokens: 2000,
        jsonMode: true
      }
    );

    let cleanedResponse = response.trim();
    cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const data = JSON.parse(cleanedResponse);
    if (data.scripts && Array.isArray(data.scripts) && data.scripts.length > 0) {
      log.info(`Successfully generated ${data.scripts.length} scripts.`);
      // Ensure we return exactly totalSteps
      const scripts = [];
      for (let i = 0; i < totalSteps; i++) {
        scripts.push(data.scripts[i] || `Proceed with step ${i + 1} as shown on screen.`);
      }
      return scripts;
    } else {
      throw new Error("JSON response did not contain a valid 'scripts' array.");
    }
  } catch (err) {
    log.error("Holistic generation failed", err);
    // Fallback to text-only generation if JSON parsing fails or model errors
    const fallbackScripts = await generateTutorialScript(
      projectTitle,
      projectDescription || null,
      platform,
      steps.map(s => ({ order: s.order, description: s.description, screenshotPath: s.screenshotPath || undefined }))
    );
    return fallbackScripts;
  }
}

/**
 * Validate a project setup via LLM.
 */
export async function validateProjectSetup(
  title: string,
  description: string,
  platform: string
): Promise<{
  titleQuality: "good" | "vague" | "too_long";
  descriptionQuality: "excellent" | "good" | "needs_more_detail";
  suggestions: string[];
  audienceClarity: boolean;
  outcomeClarity: boolean;
}> {
  const prompt = `You are an AI assistant inside a video creation tool. Evaluate this project setup and return a JSON assessment.

Title: "${title}"
Description: "${description}"
Platform: ${platform}

Return ONLY a JSON object with this exact format:
{
  "titleQuality": "good" or "vague" or "too_long",
  "descriptionQuality": "excellent" or "good" or "needs_more_detail",
  "suggestions": ["one short actionable suggestion"],
  "audienceClarity": true/false,
  "outcomeClarity": true/false
}

Rules:
- titleQuality: "vague" if under 15 chars or very generic, "too_long" if over 80 chars, "good" otherwise
- descriptionQuality: "excellent" if mentions audience + outcome + specifics, "needs_more_detail" if under 50 chars
- suggestions: Give ONE short, specific, actionable tip (max 2 sentences)
- audienceClarity: true if the description mentions who the video is for
- outcomeClarity: true if the description mentions what the viewer will learn/achieve`;

  const response = await chatCompletion(
    [{ role: "user", content: prompt }],
    { temperature: 0.3, jsonMode: true }
  );

  try {
    return JSON.parse(response);
  } catch {
    // Fallback with heuristic analysis
    return {
      titleQuality: title.length < 15 ? "vague" : title.length > 80 ? "too_long" : "good",
      descriptionQuality:
        description.length < 50
          ? "needs_more_detail"
          : description.length > 300
            ? "excellent"
            : "good",
      suggestions: ["Add more detail about your target audience and what viewers will learn."],
      audienceClarity: /audience|user|beginner|advanced|team/i.test(description),
      outcomeClarity: /will|learn|able to|how to/i.test(description),
    };
  }
}

/**
 * Get contextual AI guidance for the current wizard step.
 */
export async function getGuideMessage(
  currentStep: string,
  eventType: string,
  context: Record<string, any>
): Promise<string> {
  const prompt = `The user is at this point in the flow.

Current step: ${currentStep}
Event: ${eventType}
Editor state: ${JSON.stringify(context)}

Give ONE short guidance message for right now. Prefer the most useful next
action for this exact state over generic encouragement. Return ONLY the message
text, no JSON.`;

  const response = await chatCompletion(
    [
      {
        role: "system",
        content: buildGuideSystemPrompt(
          "Respond with plain text only, at most 2 sentences. This is an unprompted nudge, so say something the user does not already know."
        ),
      },
      { role: "user", content: prompt },
    ],
    { temperature: 0.5, maxTokens: 150 }
  );

  return response.trim();
}

/**
 * Proactively check user text for gibberish/quality and return a suggestion if bad.
 * Returns empty string if the input looks good.
 */
export async function getProactiveFeedback(
  currentStep: string,
  context: Record<string, any>
): Promise<string> {
  const prompt = `You are a helpful AI assistant inside a video creation tool. Your job is to monitor what the user is typing in real-time and provide proactive guidance ONLY if they are making a mistake, typing gibberish, or leaving things completely vague.

Current step: ${currentStep}
Context (User's current form state): ${JSON.stringify(context)}

Rules:
1. If the user's text looks like gibberish (e.g. "asdfasdf", "sddddaaaaaaaaa"), tell them politely that the text looks random and they should type something meaningful.
2. If the user's text is extremely vague (e.g., "video", "stuff"), suggest they add more detail.
3. If the user's text looks reasonably normal or is just unfinished, DO NOT say anything.
4. If you decide to say something, keep it to ONE short, friendly sentence.
5. If everything looks fine, return the exact text: "OK"

Return ONLY the message text or "OK".`;

  const response = await chatCompletion(
    [
      {
        role: "system",
        content: "You are a concise AI assistant evaluating user input. Respond with plain text only.",
      },
      { role: "user", content: prompt },
    ],
    { temperature: 0.3, maxTokens: 100 }
  );

  const cleanResponse = response.trim();
  if (cleanResponse === "OK" || cleanResponse.toLowerCase() === "ok" || cleanResponse === "") {
    return "";
  }
  return cleanResponse;
}

/**
 * Extract frames from a video URL using FFmpeg.
 */
async function extractVideoFrames(videoUrl: string, maxFrames = 3): Promise<Buffer[]> {
  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const os = await import("os");
  const crypto = await import("crypto");
  const fs = await import("fs/promises");
  const path = await import("path");

  const execFileAsync = promisify(execFile);
  const tmpDir = os.tmpdir();
  const sessionId = crypto.randomBytes(6).toString("hex");
  const outPattern = path.join(tmpDir, `frame_${sessionId}_%03d.jpg`);

  try {
    // Extract up to maxFrames at 1 frame per second
    await execFileAsync("ffmpeg", [
      "-y",
      "-i", videoUrl,
      "-vf", "fps=1",
      "-vframes", maxFrames.toString(),
      outPattern
    ]);
  } catch (err) {
    log.warn("ffmpeg extraction failed", { error: err instanceof Error ? err.message : String(err) });
    // Clean up any frames that were written before the failure.
    for (let i = 1; i <= maxFrames; i++) {
      const framePath = path.join(tmpDir, `frame_${sessionId}_${i.toString().padStart(3, "0")}.jpg`);
      await fs.unlink(framePath).catch(() => {});
    }
    throw err;
  }

  const buffers: Buffer[] = [];
  for (let i = 1; i <= maxFrames; i++) {
    const framePath = path.join(tmpDir, `frame_${sessionId}_${i.toString().padStart(3, "0")}.jpg`);
    try {
      const buf = await fs.readFile(framePath);
      buffers.push(buf);
      await fs.unlink(framePath).catch(() => {});
    } catch {
      break; // Video might be shorter than maxFrames
    }
  }

  return buffers;
}

/**
 * Check a single media item (screenshot or stock image/video) for safety and copyright using a Vision LLM.
 * Supports both local file paths and remote URLs.
 */
export async function checkMediaSafety(mediaPath: string): Promise<{ isSafe: boolean; isClear: boolean; reason: string }> {
  if (!isLLMConfigured() || !mediaPath) {
    return { isSafe: true, isClear: true, reason: "No image provided or LLM not configured." };
  }

  const isVideo = mediaPath.toLowerCase().endsWith(".mp4") || mediaPath.toLowerCase().endsWith(".webm") || mediaPath.toLowerCase().endsWith(".mov");



  try {
    const promptText = `You are a strict trust, safety, and copyright reviewer for a video creation platform. Analyze this image.
1. Safety: Does this image contain any prohibited content? This includes NSFW content (nudity, sexual content), graphic violence, gore, weapons, illegal acts, or anything that violates standard YouTube community guidelines.
2. Copyright: Are there any obvious copyrighted materials prominently featured, such as major movie characters, well-known video game assets (unless it's a generic UI), or registered logos that are the main subject? (Generic desktop UI, basic websites, and stock photos are clear).

Reply ONLY in JSON format: { "isSafe": true/false, "isClear": true/false, "reason": "Short explanation of the decision" }.
If there is ANY safety violation, set isSafe to false. If there is a copyright violation, set isClear to false.`;

    const contentParts: any[] = [{ type: "text", text: promptText }];

    try {
      if (isVideo) {
        log.info(`Extracting frames from video: ${mediaPath.substring(0, 80)}...`);
        const buffers = await extractVideoFrames(mediaPath);
        if (buffers.length === 0) {
           return { isSafe: true, isClear: true, reason: "Could not extract frames from video for checking." };
        }
        for (const buf of buffers) {
          const base64 = buf.toString("base64");
          contentParts.push({
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${base64}` },
          });
        }
      } else {
        /*
         * Through the storage layer, never the filesystem or the network.
         *
         * This was the third and worst instance of the same flaw: it did
         * `fs.readFile(path.resolve(mediaPath))` on a string taken straight from the
         * request body, so any signed-in account could send `"../../.env"` and have
         * the file's contents described back to them by the vision model. The http
         * branch beside it was a request forgery into the host's own network.
         *
         * `loadMediaAsDataUri` accepts only this application's own storage keys.
         */
        const loaded = await loadMediaAsDataUri(mediaPath);
        if (!loaded) {
          log.warn("Safety check skipped: not a readable storage key");
          return { isSafe: true, isClear: true, reason: "Could not read the image for checking." };
        }
        // The data URI is already `data:<mime>;base64,<payload>`, which is exactly the
        // shape the vision request wants, so it is passed through whole.
        contentParts.push({ type: "image_url", image_url: { url: loaded.dataUri } });
      }
    } catch (e) {
      log.warn("Could not load image", { path: mediaPath, error: e instanceof Error ? e.message : String(e) });
      return { isSafe: true, isClear: true, reason: "Could not load image." };
    }
    const response = await chatCompletion(
      [{ role: "user", content: contentParts }],
      {
        model: env.visionLlmModel,
        temperature: 0.1,
        jsonMode: true,
        maxTokens: 150,
      }
    );

    try {
      let cleanResponse = response.trim();
      // Strip markdown code blocks if present (gemma4:31b wraps JSON in ```json ... ```)
      if (cleanResponse.startsWith("```")) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();
      }
      const result = JSON.parse(cleanResponse);
      return {
        isSafe: result.isSafe ?? true,
        isClear: result.isClear ?? true,
        reason: result.reason || (result.isClear && result.isSafe ? "Media appears safe and clear." : "Flagged by AI review."),
      };
    } catch {
      log.warn("Failed to parse JSON response", { response: response.substring(0, 200) });
      // Fail closed: if we can't parse the safety verdict, treat as unsafe.
      return { isSafe: false, isClear: false, reason: "Safety check failed: unparseable response." };
    }
  } catch (error) {
    log.error("Vision API Error during safety check", error);
    // Fail closed: if the API itself errors, treat as unsafe.
    return { isSafe: false, isClear: false, reason: "Safety check failed: API error." };
  }
}

/**
 * Get a response for the interactive AI guide chat.
 */
export async function getChatMessageResponse(
  history: Array<{ role: "user" | "ai"; content: string }>,
  currentStep: string,
  context: Record<string, any>
): Promise<string> {
  const prompt = buildGuideSystemPrompt(
    "Answer the user's question directly, in under 3 sentences."
  ) + `

Current step: ${currentStep}
Editor state: ${JSON.stringify(context)}`;

  const chatHistory: ChatMessage[] = history.map((m) => ({
    role: m.role === "ai" ? "assistant" : "user",
    content: m.content,
  }));

  // Ensure strict alternation and start with 'user' for strict endpoints like Gemma
  const formattedHistory: ChatMessage[] = [];
  let expectedRole: "user" | "assistant" = "user";

  for (const msg of chatHistory) {
    if (msg.role !== expectedRole) {
      if (expectedRole === "user") {
        // Insert dummy user message to satisfy Gemma/Ollama strict requirements
        formattedHistory.push({ role: "user", content: "(User opened the chat)" });
      } else {
        // Combine consecutive messages from the same role
        const lastMsg = formattedHistory[formattedHistory.length - 1];
        if (lastMsg && lastMsg.role === msg.role) {
          lastMsg.content += `\n\n${msg.content}`;
          continue;
        }
      }
    }
    
    formattedHistory.push(msg);
    expectedRole = msg.role === "user" ? "assistant" : "user";
  }

  const messages: ChatMessage[] = [
    { role: "system", content: prompt },
    ...formattedHistory,
  ];

  const response = await chatCompletion(messages, {
    temperature: 0.7,
    maxTokens: 250,
  });

  return response.trim();
}

/**
 * Check if the LLM is configured and available.
 */
export function isLLMConfigured(): boolean {
  return !!env.llmBaseUrl;
}
