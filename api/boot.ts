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

/**
 * Refuse cross-site state-changing requests.
 *
 * `SameSite=Lax` on the session cookie is the primary defence and this is the
 * second one, for clients that mishandle SameSite and for the day someone needs
 * to set it back to `None` for an embed.
 *
 * Absent `Origin` is allowed: browsers always send it on cross-origin requests,
 * so a missing header means a non-browser client such as curl, our own scripts or
 * a mobile app, none of which carry an ambient session cookie to abuse. Present
 * but mismatched is refused, which is exactly the forgery case.
 */
app.use(async (c, next) => {
  const method = c.req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return next();

  const origin = c.req.header("origin");
  if (!origin) return next();

  const host = c.req.header("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return c.json({ error: "Bad origin" }, 403);
  }

  if (!host || originHost !== host) {
    createLogger({ path: "origin-check" }).warn("Refused a cross-site write", {
      originHost,
      host: host ?? "(none)",
      route: new URL(c.req.url).pathname,
    });
    return c.json({ error: "Cross-site requests are not allowed" }, 403);
  }

  return next();
});

/**
 * Response headers that cost nothing and close whole classes of attack.
 *
 * `nosniff` matters here specifically: uploads are served from `/api/file` with a
 * Content-Type derived from the stored extension, and without this a browser is
 * free to sniff the bytes and decide otherwise.
 */
app.use(async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "SAMEORIGIN");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Cross-Origin-Opener-Policy", "same-origin");
});

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

    // `file.type` above is the browser's claim and nothing more. This is the check
    // that the bytes agree with it.
    const { verifyDeclaredType } = await import("./lib/fileType");
    const typeCheck = verifyDeclaredType(buffer, file.type);
    if (!typeCheck.ok) {
      log.warn("Upload refused: contents do not match the declared type", {
        userId: user.id,
        declared: file.type,
        detected: typeCheck.detected,
      });
      return c.json({ error: typeCheck.error }, 400);
    }

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

/**
 * One-click unsubscribe.
 *
 * A GET with no login, because that is what a link in an email can do, and because
 * mail clients increasingly expect one-click to work. The token is the whole
 * authorisation, which is why it is random per user rather than derived from an id.
 *
 * Only marketing consent is withdrawn. Transactional mail about their own renders
 * keeps working, since that is not what they unsubscribed from.
 */
app.get("/api/unsubscribe", async (c) => {
  const token = c.req.query("token") ?? "";
  const { userByUnsubscribeToken } = await import("./lib/mailer");
  const { users } = await import("@db/schema");
  const { eq } = await import("drizzle-orm");

  const page = (title: string, body: string) =>
    c.html(
      `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
        `<title>${title}</title>` +
        `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:34rem;margin:12vh auto;padding:0 1.5rem;color:#14181d">` +
        `<h1 style="font-size:1.5rem;margin:0 0 .75rem">${title}</h1>` +
        `<p style="line-height:1.6;color:#3d3a36">${body}</p>` +
        `<p style="margin-top:2rem"><a href="/" style="color:#0d6b6b">Back to AIVideo</a></p></div>`
    );

  const user = await userByUnsubscribeToken(token);
  if (!user) {
    // Also the case where they already unsubscribed, which is not an error worth
    // alarming anyone about.
    return page("Nothing to change", "That link is not valid, or you have already unsubscribed.");
  }

  await getDb().update(users).set({ marketingEmails: false }).where(eq(users.id, user.id));
  createLogger({ path: "/api/unsubscribe" }).info("User unsubscribed", { userId: user.id });

  return page(
    "You are unsubscribed",
    "You will not receive any more marketing email from us. You will still get messages about your own renders, such as when one finishes or fails.",
  );
});

/**
 * Upload a narration recording for one scene.
 *
 * Its own route rather than a branch of /api/upload, because audio needs different
 * validation, a transcode, and a duration measured from the result. Returning the
 * duration matters: scene length is computed from it, so the editor can show the
 * effect straight away.
 */
app.post("/api/voiceover", async (c) => {
  const ip = getClientIP(c.req.raw.headers);
  const log = createLogger({ ip, path: "/api/voiceover" });

  const limit = checkRateLimit(`ip:${ip}:voiceover`, 60_000, 20);
  if (!limit.allowed) {
    return c.json({ error: "Too many uploads. Wait a moment and try again." }, 429);
  }

  let user;
  try {
    user = await authenticateRequest(c.req.raw.headers);
  } catch {
    return c.json({ error: "Sign in to upload a voiceover." }, 401);
  }

  try {
    const body = await c.req.parseBody();
    const file = body["file"];
    const stepId = Number(body["stepId"]);
    // Going back to the generated voice is the same operation in reverse, so it
    // shares this route's ownership check rather than needing its own.
    const clearing = body["clear"] === "1";

    if (!Number.isInteger(stepId) || stepId <= 0) {
      return c.json({ error: "Which scene is this for?" }, 400);
    }
    if (!clearing && (!file || !(file instanceof File))) {
      return c.json({ error: "No file provided. Send a 'file' field." }, 400);
    }

    // Ownership before anything expensive: transcoding a stranger's upload against
    // somebody else's scene is work done for an attacker.
    const { steps, projects } = await import("@db/schema");
    const { eq, and } = await import("drizzle-orm");
    const { projectAccessWhere } = await import("./lib/teams");
    const { teamForUser } = await import("./lib/teams");

    const team = await teamForUser(user.id);
    const [scene] = await getDb()
      .select({ id: steps.id, order: steps.order })
      .from(steps)
      .innerJoin(projects, eq(steps.projectId, projects.id))
      .where(
        and(
          eq(steps.id, stepId),
          projectAccessWhere({ id: user.id, teamId: team?.teamId ?? null })
        )
      )
      .limit(1);

    if (!scene) return c.json({ error: "Scene not found" }, 404);

    if (clearing) {
      // The next render regenerates the narration, so the audio fields are cleared
      // rather than left pointing at a file nothing will use.
      await getDb()
        .update(steps)
        .set({ audioSource: "tts", audioPath: null, audioDuration: null })
        .where(eq(steps.id, stepId));
      log.info("Voiceover removed from a scene", { userId: user.id, stepId });
      return c.json({ cleared: true });
    }

    const { ingestVoiceover } = await import("./lib/voiceover");
    const buffer = Buffer.from(await (file as File).arrayBuffer());
    const { key, duration } = await ingestVoiceover(buffer, (file as File).name, user.id);

    await getDb()
      .update(steps)
      .set({ audioSource: "upload", audioPath: key, audioDuration: duration })
      .where(eq(steps.id, stepId));

    log.info("Voiceover attached to a scene", { userId: user.id, stepId, duration });
    return c.json({ key, duration });
  } catch (err) {
    // Messages from ingestVoiceover are written for the person uploading, so they
    // are passed through. Anything else is logged and generalised.
    const message = err instanceof Error ? err.message : "";
    const isUserFacing = /recording|file|audio|scene|limit|MB|short|convert/i.test(message);
    if (!isUserFacing) log.error("Voiceover upload failed", err, { userId: user.id });
    return c.json(
      { error: isUserFacing ? message : "That upload could not be processed." },
      isUserFacing ? 400 : 500
    );
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

  // Whose key is it?
  //
  // This endpoint authenticated the caller and then signed whatever key it was
  // handed, for anybody. Against the local store the damage was bounded, since
  // the URL it returns points back at /api/file, which does check ownership -
  // but `getSignedDownloadUrl` also mints real presigned object-storage URLs
  // for `b2:` and plain object keys, and those are honoured by the storage
  // provider with no reference to this application at all. One request naming
  // someone else's key would have read their file.
  //
  // Only owner-scoped local keys are signed. Object keys carry no owner, so
  // there is nothing to check them against and they are refused outright rather
  // than trusted. Nothing in the app calls this endpoint, so the narrower rule
  // costs nothing; if object storage is turned on later, ownership has to be
  // established some other way before this is widened again.
  const owner = localKeyOwner(key);
  if (owner === null || (owner !== user.id && user.role !== "admin")) {
    // 404 rather than 403, matching /api/file: a refusal must not reveal
    // whether the key exists.
    log.warn("Signed URL refused: not the owner", { userId: user.id, key });
    return c.json({ error: "Not Found" }, 404);
  }

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

  startWorkerUnlessExternal();
} else {
  startWorkerUnlessExternal();
}

/**
 * Run the render worker in this process, unless a separate one is handling it.
 *
 * Set `WORKER_MODE=external` where `api/worker-boot.ts` runs as its own pm2
 * process, which is what keeps ffmpeg from competing with the web server for CPU.
 *
 * The default is deliberately in-process. A deploy that forgets to start the
 * separate worker then renders slowly, which is the old behaviour, rather than not
 * rendering at all and looking like every customer's queue has silently died. The
 * mode is logged either way so the wrong one is visible in the first line of the
 * log.
 */
function startWorkerUnlessExternal(): void {
  if (process.env.WORKER_MODE === "external") {
    logger.info("Render worker not started here: WORKER_MODE=external");
    return;
  }
  logger.info("Render worker running inside the API process. Set WORKER_MODE=external to separate them.");
  startRenderWorker();
}
