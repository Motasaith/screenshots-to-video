import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { compress } from "hono/compress";
import fs from "fs";
import path from "path";

type App = Hono<{ Bindings: HttpBindings }>;

export function serveStaticFiles(app: App) {
  const distPath = path.resolve(import.meta.dirname, "../dist/public");

  // Vite emits content-hashed filenames under /assets, so those URLs can never
  // point at different bytes. Cache them permanently — a returning visitor then
  // downloads nothing but the (uncached) HTML entry point.
  app.use("/assets/*", async (c, next) => {
    await next();
    c.header("Cache-Control", "public, max-age=31536000, immutable");
  });

  // Gzip on the way out. The main chunk is ~335 kB raw and ~100 kB gzipped, so
  // this is the largest single transfer win available. Hono's compress()
  // already skips non-compressible content types and bodies under 1 kB, so
  // media responses pass through untouched.
  app.use("*", compress());

  app.use("*", serveStatic({ root: "./dist/public" }));

  app.notFound((c) => {
    const accept = c.req.header("accept") ?? "";
    if (!accept.includes("text/html")) {
      return c.json({ error: "Not Found" }, 404);
    }
    const indexPath = path.resolve(distPath, "index.html");
    const content = fs.readFileSync(indexPath, "utf-8");
    return c.html(content);
  });
}
