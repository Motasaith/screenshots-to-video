import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { createOAuthCallbackHandler } from "./kimi/auth";
import { Paths } from "@contracts/constants";
import { authenticateRequest } from "./kimi/auth";
import { uploadToR2, getSignedDownloadUrl, isR2Configured } from "./lib/r2";
import { startRenderWorker } from "./lib/worker";
import { checkRateLimit, getClientIP } from "./lib/ratelimit";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));
app.get(Paths.oauthCallback, createOAuthCallbackHandler());

// ── File Upload Endpoint ──
// Accepts multipart form data with a single file field "file"
// Returns the R2 storage key and a signed URL for display
app.post("/api/upload", async (c) => {
  // Rate limit by IP
  const ip = getClientIP(c.req.raw.headers);
  const ipLimit = checkRateLimit(`ip:${ip}:upload`, 60_000, 10);
  if (!ipLimit.allowed) {
    return c.json(
      {
        error: `Rate limit exceeded. Retry after ${Math.ceil((ipLimit.resetAt - Date.now()) / 1000)}s.`,
      },
      429
    );
  }

  // Authenticate the request
  let user;
  try {
    user = await authenticateRequest(c.req.raw.headers);
  } catch {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Rate limit by user
  const userLimit = checkRateLimit(`user:${user.id}:upload`, 60_000, 10);
  if (!userLimit.allowed) {
    return c.json(
      {
        error: `Rate limit exceeded. Retry after ${Math.ceil((userLimit.resetAt - Date.now()) / 1000)}s.`,
      },
      429
    );
  }

  if (!isR2Configured()) {
    return c.json(
      { error: "Storage is not configured. Set R2 environment variables." },
      500
    );
  }

  try {
    const body = await c.req.parseBody();
    const file = body["file"];

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided. Send a 'file' field." }, 400);
    }

    // Validate file type
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
    ];
    if (!allowedTypes.includes(file.type)) {
      return c.json(
        { error: `Invalid file type: ${file.type}. Allowed: ${allowedTypes.join(", ")}` },
        400
      );
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return c.json({ error: "File too large. Maximum size is 10MB." }, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const folder = (body["folder"] as string) || "screenshots";

    const key = await uploadToR2(buffer, {
      folder,
      filename: file.name,
      contentType: file.type,
    });

    const url = await getSignedDownloadUrl(key);

    return c.json({ key, url });
  } catch (err: any) {
    console.error("Upload error:", err);
    return c.json({ error: err.message || "Upload failed" }, 500);
  }
});

// ── Signed URL Endpoint ──
// Generate a fresh signed URL for an existing R2 key
app.get("/api/signed-url", async (c) => {
  let user;
  try {
    user = await authenticateRequest(c.req.raw.headers);
  } catch {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const key = c.req.query("key");
  if (!key) return c.json({ error: "Missing 'key' parameter" }, 400);

  try {
    const url = await getSignedDownloadUrl(key);
    return c.json({ url });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ── tRPC Handler ──
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  // Start the background render worker in production
  startRenderWorker();
} else {
  // In dev mode, also start the worker
  startRenderWorker();
}
