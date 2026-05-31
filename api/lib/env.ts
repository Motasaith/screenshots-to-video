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
  llmBaseUrl: optional("LLM_BASE_URL"), // e.g. http://localhost:11434/v1 or https://api.openai.com/v1
  llmApiKey: optional("LLM_API_KEY"),
  llmModel: optional("LLM_MODEL", "gemma4:31b-cloud"), // or llama3, minimax-m2, etc.

  // ── Kimi ──
  kimiOpenUrl: optional("KIMI_OPEN_URL", "https://api.kimi.ai"),
};
