import { env } from "./env";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
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

  const prompt = `You are a professional tutorial narrator. Generate a clear, natural-sounding voiceover script for each step of this tutorial.

Video topic: ${description}
Target platform: ${platform}
Target audience: inferred from the topic description

For each step, write 1-3 sentences maximum. Be specific about what the viewer should see or do. No filler phrases like "Now we will..." — just describe the action directly.

Steps:
${stepsText}

Return ONLY a JSON object with this exact format:
{"scripts": ["script for step 1", "script for step 2", ...]}`;

  const response = await chatCompletion(
    [{ role: "user", content: prompt }],
    { temperature: 0.6, jsonMode: true }
  );

  try {
    const parsed = JSON.parse(response);
    if (Array.isArray(parsed.scripts)) {
      return parsed.scripts;
    }
  } catch {
    // If JSON parsing fails, try to extract scripts from the text
    console.warn("LLM returned non-JSON response, attempting to parse:", response);
  }

  // Fallback: split response by numbered lines
  const lines = response
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => l.replace(/^\d+[\.\)]\s*/, "").trim());

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
