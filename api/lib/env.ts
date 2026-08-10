import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  appId: required("APP_ID"),
  appSecret: required("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  googleClientId: required("GOOGLE_CLIENT_ID"),
  googleClientSecret: required("GOOGLE_CLIENT_SECRET"),
  ownerUnionId: optional("OWNER_UNION_ID"),

  // ── UploadThing ──
  uploadthingSecret: optional("UPLOADTHING_SECRET"),
  uploadthingAppId: optional("UPLOADTHING_APP_ID"),

  // ── LLM (OpenAI-compatible) ──
  // Ollama Cloud: LLM_BASE_URL=https://ollama.com/v1 + LLM_API_KEY=<key from ollama.com/settings/keys>
  // Local Ollama: LLM_BASE_URL=http://localhost:11434/v1 (no key needed)
  llmBaseUrl: optional("LLM_BASE_URL"),
  llmApiKey: optional("LLM_API_KEY"),
  llmModel: optional("LLM_MODEL", "gpt-oss:120b"), // good free default on Ollama Cloud; also try qwen3:235b, deepseek-v3.1:671b
  visionLlmModel: optional("VISION_LLM_MODEL", "gpt-oss:120b"), // Dedicated vision model for copyright checking

  // ── Kimi ──
  kimiOpenUrl: optional("KIMI_OPEN_URL", "https://api.kimi.ai"),

  // ── Pexels (Stock Media) ──
  pexelsApiKey: optional("PEXELS_API_KEY"),

  // ── ElevenLabs (Premium TTS voices) ──
  elevenlabsApiKey: optional("ELEVENLABS_API_KEY"),

  // ── Speech to text (support widget voice notes) ──
  // Optional. Browsers with the Web Speech API transcribe locally and never
  // reach the server; these are the fallback for the ones that cannot, mainly
  // Firefox. Unset means the widget offers typing and images only in those
  // browsers, rather than failing. See api/lib/whisper.ts for setup.
  whisperBin: optional("WHISPER_BIN"),
  whisperModel: optional("WHISPER_MODEL"),
};
