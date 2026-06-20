import { chatCompletion } from "./llm";

export interface SceneScript {
  order: number;
  narration: string;
  sceneDescription: string;
  searchQuery: string;
  mediaType: "image" | "video";
  estimatedDuration: number;
}

export interface VideoScript {
  title: string;
  scenes: SceneScript[];
}

/**
 * Generate a full video script using the LLM.
 * Returns a structured script with individual scenes.
 */
export async function generateVideoScript(opts: {
  topic: string;
  style: string;
  targetDuration: number; // seconds
  audience: string;
  tone: string;
  platform: string;
  existingScenes?: SceneScript[];
}): Promise<VideoScript> {
  const approxSceneCount = Math.max(3, Math.min(20, Math.ceil(opts.targetDuration / 15)));

  let existingContext = "";
  if (opts.existingScenes && opts.existingScenes.length > 0) {
    existingContext = `
IMPORTANT: The user has already started working on some scenes. You MUST preserve the order and manually edited narration of these scenes, but you can fill in any missing narration or search queries. If you need to add more scenes to make the video complete, you can append them or insert them logically.
Existing Scenes:
${JSON.stringify(opts.existingScenes.map(s => ({
  order: s.order,
  narration: s.narration,
  sceneDescription: s.sceneDescription,
  searchQuery: s.searchQuery,
  mediaType: s.mediaType
})), null, 2)}
`;
  }

  const prompt = `You are a professional video script writer. Create a complete video script for the following:

Topic: ${opts.topic}
Style: ${opts.style}
Target Duration: ${opts.targetDuration} seconds (about ${Math.round(opts.targetDuration / 60)} minutes)
Target Audience: ${opts.audience}
Tone: ${opts.tone}
Platform: ${opts.platform}

Create approximately ${approxSceneCount} scenes. The total narration time across all scenes should add up to roughly ${opts.targetDuration} seconds (estimate ~2.5 words per second of speech).

CRITICAL DURATION INSTRUCTION:
You MUST create exactly ${approxSceneCount} scenes.
The total narration across all scenes combined MUST be AT LEAST ${Math.round(opts.targetDuration * 2.5)} words in order to reach the requested target duration of ${opts.targetDuration} seconds. Do not output a tiny script. Write detailed narrations.

${existingContext}
For each scene:
- "narration": The exact text spoken by a text-to-speech engine — write it the way a real person TALKS, not the way an article reads. Always use contractions (it's, you'll, don't). Vary sentence length; mix short punchy lines with longer ones. Occasionally (not every scene) open with a natural spoken transition like "Now,", "So,", "Here's the interesting part —", "Okay,". Once or twice in the whole video, add a small human touch like "hmm", "you know", or a brief aside. Use commas and "..." to create natural pauses. The first scene should hook the viewer conversationally; the last should wrap up warmly. No markdown, no emoji, no special characters.
- "sceneDescription": A brief description of what the viewer should see during this scene.
- "searchQuery": A 2-4 word search term to find relevant stock footage/photos on Pexels. Be specific and visual (e.g. "typing laptop office", "sunset cityscape", "team meeting"). Avoid abstract terms.
- "mediaType": Either "image" or "video". Use "video" for action scenes, "image" for static concepts.
- "estimatedDuration": How many seconds this scene should last (based on narration length).

Return ONLY a JSON object with this exact format:
{
  "title": "A compelling video title",
  "scenes": [
    {
      "order": 1,
      "narration": "Welcome to our guide on...",
      "sceneDescription": "Wide shot of the subject",
      "searchQuery": "search terms here",
      "mediaType": "image",
      "estimatedDuration": 8
    }
  ]
}`;

  const response = await chatCompletion(
    [{ role: "user", content: prompt }],
    { temperature: 0.7, jsonMode: true, maxTokens: 4000 }
  );

  // Clean response
  const cleanResponse = response
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleanResponse);
    if (parsed.title && Array.isArray(parsed.scenes)) {
      // Validate and normalize scenes
      const scenes: SceneScript[] = parsed.scenes.map((s: any, i: number) => ({
        order: s.order || i + 1,
        narration: String(s.narration || `Scene ${i + 1}`),
        sceneDescription: String(s.sceneDescription || ""),
        searchQuery: String(s.searchQuery || opts.topic),
        mediaType: s.mediaType === "video" ? "video" : "image",
        estimatedDuration: Number(s.estimatedDuration) || 8,
      }));
      return { title: String(parsed.title), scenes };
    }
  } catch {
    console.warn("[StudioLLM] Failed to parse JSON response:", cleanResponse);
  }

  // Try extracting JSON from response
  const jsonMatch = cleanResponse.match(/\{[\s\S]*"scenes"\s*:\s*\[[\s\S]*\]\s*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.title && Array.isArray(parsed.scenes)) {
        return {
          title: parsed.title,
          scenes: parsed.scenes.map((s: any, i: number) => ({
            order: s.order || i + 1,
            narration: String(s.narration || `Scene ${i + 1}`),
            sceneDescription: String(s.sceneDescription || ""),
            searchQuery: String(s.searchQuery || opts.topic),
            mediaType: s.mediaType === "video" ? "video" : "image",
            estimatedDuration: Number(s.estimatedDuration) || 8,
          })),
        };
      }
    } catch (err) {
      console.warn("[StudioLLM] Failed to parse extracted JSON:", err instanceof Error ? err.message : err);
      // Continue to fallback
    }
  }

  // Fallback: create a simple 3-scene script
  console.warn("[StudioLLM] Using fallback script generation");
  return {
    title: opts.topic,
    scenes: [
      {
        order: 1,
        narration: `Welcome to this video about ${opts.topic}. Let's explore what you need to know.`,
        sceneDescription: "Introduction scene",
        searchQuery: opts.topic.split(" ").slice(0, 3).join(" "),
        mediaType: "image",
        estimatedDuration: Math.round(opts.targetDuration * 0.2),
      },
      {
        order: 2,
        narration: `Here are the key points about ${opts.topic} that every ${opts.audience} should understand.`,
        sceneDescription: "Main content",
        searchQuery: opts.topic.split(" ").slice(0, 3).join(" "),
        mediaType: "video",
        estimatedDuration: Math.round(opts.targetDuration * 0.6),
      },
      {
        order: 3,
        narration: `That wraps up our overview of ${opts.topic}. Thanks for watching!`,
        sceneDescription: "Closing scene",
        searchQuery: "thank you conclusion",
        mediaType: "image",
        estimatedDuration: Math.round(opts.targetDuration * 0.2),
      },
    ],
  };
}

/**
 * Refine a single scene's narration using the LLM.
 */
export async function refineScene(
  scene: SceneScript,
  feedback: string,
  context: { topic: string; tone: string }
): Promise<SceneScript> {
  const prompt = `You are editing a video script scene. Apply the user's feedback to improve it.

Original scene:
- Narration: "${scene.narration}"
- Scene description: "${scene.sceneDescription}"
- Search query for media: "${scene.searchQuery}"

User's feedback: "${feedback}"

Video context:
- Topic: ${context.topic}
- Tone: ${context.tone}

Return ONLY a JSON object with this format:
{
  "narration": "Updated narration text",
  "sceneDescription": "Updated scene description",
  "searchQuery": "updated search terms",
  "mediaType": "image or video",
  "estimatedDuration": 8
}`;

  const response = await chatCompletion(
    [{ role: "user", content: prompt }],
    { temperature: 0.5, jsonMode: true, maxTokens: 500 }
  );

  const cleanResponse = response
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleanResponse);
    return {
      order: scene.order,
      narration: String(parsed.narration || scene.narration),
      sceneDescription: String(parsed.sceneDescription || scene.sceneDescription),
      searchQuery: String(parsed.searchQuery || scene.searchQuery),
      mediaType: parsed.mediaType === "video" ? "video" : "image",
      estimatedDuration: Number(parsed.estimatedDuration) || scene.estimatedDuration,
    };
  } catch {
    return scene; // Return unchanged on parse failure
  }
}
