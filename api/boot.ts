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
import { createLogger, logger } from "./lib/logger";

const app = new Hono<{ Bindings: HttpBindings }>();

// ── Global error handler ──
app.onError((err, c) => {
  logger.error("Unhandled server error", err, { path: c.req.path });
  return c.json({ error: "Internal server error" }, 500);
});

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

// Rate limit the OAuth callback to prevent abuse
app.get(Paths.oauthCallback, async (c, next) => {
  const ip = getClientIP(c.req.raw.headers);
  const limit = checkRateLimit(`ip:${ip}:oauth`, 60_000, 10);
  if (!limit.allowed) {
    return c.json({ error: "Too many login attempts. Please try again later." }, 429);
  }
  await next();
}, createOAuthCallbackHandler());

// ── File Upload Endpoint ──
app.post("/api/upload", async (c) => {
  const ip = getClientIP(c.req.raw.headers);
  let log = createLogger({ ip, path: "/api/upload" });

  // Rate limit by IP
  const ipLimit = checkRateLimit(`ip:${ip}:upload`, 60_000, 60);
  if (!ipLimit.allowed) {
    return c.json(
      {
        error: `Rate limit exceeded. Retry after ${Math.ceil((ipLimit.resetAt - Date.now()) / 1000)}s.`,
      },
      429
    );
  }

  // Authenticate the request — no guest fallback in production
  let user;
  try {
    user = await authenticateRequest(c.req.raw.headers);
  } catch (err) {
    log.warn("Upload rejected: unauthenticated", { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: "Authentication required." }, 401);
  }

  // Update logger context with userId for admin log filtering
  log = createLogger({ ip, path: "/api/upload", userId: user.id });

  // Rate limit by user
  const userLimit = checkRateLimit(`user:${user.id}:upload`, 60_000, 60);
  if (!userLimit.allowed) {
    return c.json(
      {
        error: `Rate limit exceeded. Retry after ${Math.ceil((userLimit.resetAt - Date.now()) / 1000)}s.`,
      },
      429
    );
  }

  if (!isR2Configured()) {
    log.error("R2 storage not configured");
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
      "video/mp4",
      "video/webm",
      "video/quicktime",
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

    log.info("File uploaded", { userId: user.id, key, size: file.size });
    return c.json({ key, url });
  } catch (err) {
    log.error("Upload error", err, { userId: user.id });
    const message = err instanceof Error ? err.message : "Upload failed";
    return c.json({ error: message }, 500);
  }
});

// ── Signed URL Endpoint ──
app.get("/api/signed-url", async (c) => {
  const ip = getClientIP(c.req.raw.headers);
  const log = createLogger({ ip, path: "/api/signed-url" });

  // Rate limit by IP
  const ipLimit = checkRateLimit(`ip:${ip}:signed-url`, 60_000, 30);
  if (!ipLimit.allowed) {
    return c.json(
      { error: `Rate limit exceeded. Retry after ${Math.ceil((ipLimit.resetAt - Date.now()) / 1000)}s.` },
      429
    );
  }

  // Authenticate — no guest fallback
  let user;
  try {
    user = await authenticateRequest(c.req.raw.headers);
  } catch (err) {
    log.warn("Signed URL rejected: unauthenticated", { error: err instanceof Error ? err.message : String(err) });
    return c.json({ error: "Authentication required." }, 401);
  }

  // Rate limit by user
  const userLimit = checkRateLimit(`user:${user.id}:signed-url`, 60_000, 60);
  if (!userLimit.allowed) {
    return c.json(
      { error: `Rate limit exceeded. Retry after ${Math.ceil((userLimit.resetAt - Date.now()) / 1000)}s.` },
      429
    );
  }

  const key = c.req.query("key");
  if (!key) return c.json({ error: "Missing 'key' parameter" }, 400);

  try {
    const url = await getSignedDownloadUrl(key);
    return c.json({ url });
  } catch (err) {
    log.error("Signed URL error", err, { userId: user.id, key });
    const message = err instanceof Error ? err.message : "Failed to generate signed URL";
    return c.json({ error: message }, 500);
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
    logger.info(`Server running on http://localhost:${port}/`, { port });
  });

  // Start the background render worker in production
  startRenderWorker();
} else {
  // In dev mode, also start the worker
  startRenderWorker();
}
