import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import { authenticateRequest } from "./kimi/auth";
import { createLogger } from "./lib/logger";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };
  const ip = opts.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || opts.req.headers.get("x-real-ip")?.trim()
    || "unknown";
  const log = createLogger({ ip });

  try {
    ctx.user = await authenticateRequest(opts.req.headers);
    log.debug("Authenticated request", { userId: ctx.user.id });
  } catch (err) {
    // No valid session — user is unauthenticated. Do NOT fall back to guest.
    log.debug("No valid session", { error: err instanceof Error ? err.message : String(err) });
  }
  return ctx;
}
