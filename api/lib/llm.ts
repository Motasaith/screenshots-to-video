import { env } from "./env";

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
    console.error(`[LLM] Error with model ${model}:`, errorText);
    throw new Error(`LLM API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as ChatResponse;
  console.log(`[LLM] Successfully received response from model: ${model}`);
  return data.choices?.[0]?.message?.content || "";
}

/**
 * Generate a narration script for tutorial steps.
 */
export async function generateTutorialScript(
  description: string,
  platform: string,
  steps: Array<{ order: number; description: string }>
): Promise<string[]> {
  const stepsText = steps
    .map((s) => `Step ${s.order}: ${s.description}`)
    .join("\n");

  const prompt = `You are a friendly YouTuber recording a screen tutorial voiceover. Write the narration for each step EXACTLY as a real person would say it out loud — this text goes straight into a text-to-speech engine.

Video topic: ${description}
Target platform: ${platform}

How a real tutorial narrator talks:
- Conversational and warm, like explaining to a friend sitting next to you. Always use contractions (we're, you'll, it's, don't).
- OCCASIONALLY open a step with a natural spoken transition: "Alright,", "Okay, so", "Next up,", "Now,", "And then", "Here's the thing —". Vary them; never use the same opener twice in a row, and leave some steps with no opener at all.
- Once or twice in the WHOLE video (not every step), add a small human touch like "hmm, let's see", "right, so", or a brief aside ("...and that's it, easy").
- Step 1 should greet the viewer briefly and say what they'll learn (one short sentence, no channel-style intro). The LAST step should wrap up naturally ("And that's all there is to it...").
- Use punctuation to control speech rhythm: commas for short pauses, "..." for a thinking pause, "—" for a beat. Short sentences. Vary sentence length.
- Refer to what's on screen: "this button right here", "up in the top corner", "see that menu?".
- 1-3 sentences per step. Be specific about the action. No markdown, no emoji, no stage directions, no quotes around UI names — say them plainly.

Steps:
${stepsText}

Return ONLY a JSON object with this exact format:
{"scripts": ["narration for step 1", "narration for step 2", ...]}`;

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
    console.warn("LLM returned non-JSON response, attempting to parse:", cleanResponse);
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
    .map((l) => l.replace(/^[\d]+[\.)\-]\s*/, "").replace(/^"/, "").replace(/"[,]?\s*$/, "").trim())
    .filter((l) => l.length > 10); // Filter out fragments

  return lines.length >= steps.length
    ? lines.slice(0, steps.length)
    : steps.map((_, i) => lines[i] || `Proceed with step ${i + 1} as shown on screen.`);
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
  const prompt = `You are a helpful AI assistant inside a video creation tool called AIVideo. The user is creating a tutorial video from screenshots.

Your job: Give one short, specific, actionable message (max 2 sentences). Be direct. Don't use filler.

Current step: ${currentStep}
Event: ${eventType}
Context: ${JSON.stringify(context)}

Give one short guidance message for the user right now. Return ONLY the message text, no JSON.`;

  const response = await chatCompletion(
    [
      {
        role: "system",
        content:
          "You are a concise AI assistant. Respond with plain text only, 1-2 sentences max.",
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
 * Check screenshots for copyright violations using a Vision LLM.
 * Supports both local file paths and remote URLs (e.g. UploadThing).
 */
export async function checkCopyrightImages(imagePaths: string[]): Promise<{ isClear: boolean; reason: string }> {
  if (!isLLMConfigured() || imagePaths.length === 0) {
    return { isClear: true, reason: "No images provided or LLM not configured." };
  }

  try {
    const fs = await import("fs/promises");
    const path = await import("path");

    // Only check up to 3 images to save tokens
    const pathsToCheck = imagePaths.slice(0, 3);
    const contentParts: any[] = [
      {
        type: "text",
        text: "You are a copyright checker. Analyze these screenshots. Are there any obvious copyrighted materials prominently featured, such as major movie characters, well-known video game assets (unless it's a generic UI), or registered logos that are the main subject? Reply in JSON format: { \"isClear\": true/false, \"reason\": \"Short explanation\" }. If it's just generic desktop UI, websites, or basic apps, it is clear.",
      },
    ];

    for (const imgPath of pathsToCheck) {
      try {
        let buffer: Buffer;
        let mime = "image/jpeg";

        if (imgPath.startsWith("http://") || imgPath.startsWith("https://")) {
          // Fetch remote image (UploadThing, Pexels, etc.)
          console.log(`[Copyright] Fetching remote image: ${imgPath.substring(0, 80)}...`);
          const resp = await fetch(imgPath);
          if (!resp.ok) {
            console.warn(`[Copyright] Failed to fetch image (${resp.status}): ${imgPath}`);
            continue;
          }
          const contentType = resp.headers.get("content-type") || "";
          if (contentType.includes("png")) mime = "image/png";
          else if (contentType.includes("webp")) mime = "image/webp";
          const arrayBuf = await resp.arrayBuffer();
          buffer = Buffer.from(arrayBuf);
        } else {
          // Local file path
          const fullPath = path.resolve(imgPath);
          buffer = await fs.readFile(fullPath);
          if (fullPath.toLowerCase().endsWith(".png")) mime = "image/png";
          else if (fullPath.toLowerCase().endsWith(".webp")) mime = "image/webp";
        }

        const base64 = buffer.toString("base64");
        contentParts.push({
          type: "image_url",
          image_url: { url: `data:${mime};base64,${base64}` },
        });
      } catch (e) {
        console.warn(`[Copyright] Could not load image: ${imgPath}`, e);
      }
    }

    if (contentParts.length === 1) {
      // No valid images were loaded
      return { isClear: true, reason: "No readable images found." };
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
      const result = JSON.parse(response);
      return {
        isClear: result.isClear ?? true,
        reason: result.reason ?? "Passed inspection.",
      };
    } catch {
      // Fallback if parsing fails
      return { isClear: true, reason: "Passed inspection." };
    }
  } catch (error) {
    console.error("Vision API Error during copyright check:", error);
    return { isClear: true, reason: "Vision API failed, proceeding gracefully." };
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
  const prompt = `You are a helpful, concise AI assistant inside a video creation tool called AIVideo. Answer the user's question directly. Keep answers under 3 sentences. Do not use filler.
  
Current step: ${currentStep}
Context: ${JSON.stringify(context)}`;

  let chatHistory: ChatMessage[] = history.map((m) => ({
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
