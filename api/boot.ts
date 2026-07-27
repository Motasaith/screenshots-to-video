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
import { getSignedDownloadUrl } from "./lib/r2";
import { startRenderWorker } from "./lib/worker";
import { checkRateLimit, getClientIP } from "./lib/ratelimit";
import { createLogger, logger } from "./lib/logger";
import {
  getThumbnail,
  thumbnailETag,
  isAllowedThumbWidth,
  ALLOWED_THUMB_WIDTHS,
} from "./lib/thumbnail";
import { getDb } from "./queries/connection";
import { steps, projects } from "@db/schema";
import { eq } from "drizzle-orm";
import {
  saveLocalFile,
  readLocalFile,
  localFilePath,
  localContentType,
  localKeyOwner,
  isLocalKey,
} from "./lib/localStore";

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
    // Screenshots are small; a custom intro/outro clip is not. A flat 10MB cap
    // rejected most real video bumpers with a message that read like a bug.
    // The ceiling is the 50MB body limit configured above.
    const isVideoUpload = file.type.startsWith("video/");
    const maxBytes = isVideoUpload ? 45 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      return c.json(
        {
          error: `File too large. Maximum size is ${Math.round(maxBytes / 1024 / 1024)}MB for ${
            isVideoUpload ? "video" : "images"
          }.`,
        },
        400
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const folder = (body["folder"] as string) || "screenshots";

    // Render inputs stay on local disk. The worker runs in this process, so
    // shipping them to object storage only to fetch them back at render time
    // was two HTTPS round-trips for bytes already in this buffer.
    const key = await saveLocalFile(buffer, {
      userId: user.id,
      folder,
      filename: file.name,
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

// ── Local File Serving ──
// Screenshots live on this server's disk now, so it also serves them. The
// object-storage equivalent leaned on an unguessable signed URL for access
// control; here the owner is encoded in the key path and checked explicitly.
app.get("/api/file", async (c) => {
  const ip = getClientIP(c.req.raw.headers);
  const log = createLogger({ ip, path: "/api/file" });

  const ipLimit = checkRateLimit(`ip:${ip}:file`, 60_000, 600);
  if (!ipLimit.allowed) {
    return c.json(
      { error: `Rate limit exceeded. Retry after ${Math.ceil((ipLimit.resetAt - Date.now()) / 1000)}s.` },
      429
    );
  }

  let user;
  try {
    user = await authenticateRequest(c.req.raw.headers);
  } catch {
    return c.json({ error: "Authentication required." }, 401);
  }

  const key = c.req.query("key");
  if (!key || !isLocalKey(key)) return c.json({ error: "Invalid key" }, 400);

  // Ownership before existence: a mismatched key must not reveal whether the
  // file is there.
  const owner = localKeyOwner(key);
  if (owner === null || (owner !== user.id && user.role !== "admin")) {
    return c.json({ error: "Not Found" }, 404);
  }

  // resolveLocalPath (inside localFilePath) rejects anything that escapes the
  // storage root, so a crafted key cannot read arbitrary files.
  const abs = await localFilePath(key);
  if (!abs) return c.json({ error: "Not Found" }, 404);

  try {
    const buf = await readLocalFile(key);
    const contentType = localContentType(key);

    // Keys embed a nanoid and are never rewritten, so the bytes are immutable.
    c.header("Content-Type", contentType);
    c.header("Cache-Control", "private, max-age=31536000, immutable");
    // Range support is what makes <video> work. Browsers request byte ranges
    // for media and will refuse to play — or refuse to seek — against a server
    // that only ever returns 200 with the whole file. Imported Pexels clips
    // showed a player that did nothing when pressed for exactly this reason.
    c.header("Accept-Ranges", "bytes");

    const range = c.req.header("range");
    const match = range ? /^bytes=(\d*)-(\d*)$/.exec(range.trim()) : null;

    if (match) {
      const size = buf.byteLength;
      const startRaw = match[1];
      const endRaw = match[2];

      // "bytes=-500" means the LAST 500 bytes, not the first 500.
      let start = startRaw ? Number(startRaw) : size - Number(endRaw || 0);
      let end = endRaw && startRaw ? Number(endRaw) : size - 1;

      start = Math.max(0, Math.min(start, size - 1));
      end = Math.max(start, Math.min(end, size - 1));

      if (!Number.isFinite(start) || !Number.isFinite(end)) {
        c.header("Content-Range", `bytes */${size}`);
        return c.body(null, 416);
      }

      c.header("Content-Range", `bytes ${start}-${end}/${size}`);
      c.header("Content-Length", String(end - start + 1));
      return c.body(new Uint8Array(buf.subarray(start, end + 1)), 206);
    }

    c.header("Content-Length", String(buf.byteLength));
    return c.body(new Uint8Array(buf));
  } catch (err) {
    log.error("Local file read failed", err, { userId: user.id });
    return c.json({ error: "Not Found" }, 404);
  }
});

// ── Screenshot Thumbnails ──
// Keyed by step id rather than by URL on purpose: an endpoint that resized
// whatever address the caller supplied would be an open request proxy.
app.get("/api/thumb", async (c) => {
  const ip = getClientIP(c.req.raw.headers);
  const log = createLogger({ ip, path: "/api/thumb" });

  const ipLimit = checkRateLimit(`ip:${ip}:thumb`, 60_000, 300);
  if (!ipLimit.allowed) {
    return c.json(
      { error: `Rate limit exceeded. Retry after ${Math.ceil((ipLimit.resetAt - Date.now()) / 1000)}s.` },
      429
    );
  }

  let user;
  try {
    user = await authenticateRequest(c.req.raw.headers);
  } catch {
    return c.json({ error: "Authentication required." }, 401);
  }

  const stepId = Number(c.req.query("stepId"));
  const width = Number(c.req.query("w") ?? 96);
  if (!Number.isInteger(stepId) || stepId <= 0) {
    return c.json({ error: "Missing or invalid 'stepId'" }, 400);
  }
  if (!isAllowedThumbWidth(width)) {
    return c.json({ error: `'w' must be one of ${ALLOWED_THUMB_WIDTHS.join(", ")}` }, 400);
  }

  try {
    // Join through to the project so a step id from another account is a 404,
    // not a thumbnail.
    const [row] = await getDb()
      .select({ screenshotPath: steps.screenshotPath, ownerId: projects.userId })
      .from(steps)
      .innerJoin(projects, eq(steps.projectId, projects.id))
      .where(eq(steps.id, stepId))
      .limit(1);

    if (!row || row.ownerId !== user.id) return c.json({ error: "Not Found" }, 404);
    if (!row.screenshotPath || row.screenshotPath.startsWith("blob:")) {
      return c.json({ error: "Step has no stored screenshot" }, 404);
    }

    const etag = `"${thumbnailETag(row.screenshotPath, width)}"`;
    // The URL is stable across screenshot replacements, so correctness rests on
    // revalidation rather than a long max-age.
    c.header("Cache-Control", "private, max-age=60, must-revalidate");
    c.header("ETag", etag);
    if (c.req.header("if-none-match") === etag) return c.body(null, 304);

    const buf = await getThumbnail(row.screenshotPath, width);
    c.header("Content-Type", "image/webp");
    return c.body(new Uint8Array(buf));
  } catch (err) {
    log.error("Thumbnail error", err, { userId: user.id, stepId });
    return c.json({ error: "Failed to generate thumbnail" }, 500);
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
