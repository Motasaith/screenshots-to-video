import { ErrorMessages } from "@contracts/constants";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { checkRateLimit, getClientIP } from "./lib/ratelimit";
import { createLogger } from "./lib/logger";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error, ctx }) {
    const log = createLogger({
      userId: ctx?.user?.id,
      ip: ctx ? getClientIP(ctx.req.headers) : undefined,
      path: shape.data?.path,
    });

    const isInternal = shape.data.code === "INTERNAL_SERVER_ERROR";

    // A short code the user can quote and we can grep for. Cheap to generate
    // and it means a sanitised message is still actionable in support.
    const ref = isInternal
      ? Math.random().toString(36).slice(2, 8).toUpperCase()
      : undefined;

    if (isInternal) {
      log.error(`tRPC internal error [${ref}]`, error);
    } else {
      log.debug(`tRPC ${shape.data.code}: ${error.message}`, { code: shape.data.code });
    }

    // Never ship the stack. It carries absolute source paths (and it was going
    // out even on a plain 401), and nothing in the client reads it.
    const data = { ...shape.data } as typeof shape.data & { stack?: string };
    delete data.stack;

    if (!isInternal) {
      // Deliberate errors: validation failures, rate limits, "not found",
      // narration preflight messages. These are written for the user, so they
      // pass through as-is.
      return { ...shape, data };
    }

    // Anything unhandled is an implementation detail. The message on a failed
    // Drizzle insert is the entire SQL statement plus every bound parameter,
    // which is unreadable, leaks the schema, and tells the user nothing they
    // can act on. It is logged in full above against `ref`.
    return {
      ...shape,
      message: `Something went wrong on our side. Quote reference ${ref} if you contact support.`,
      data,
    };
  },
});

/**
 * An error written for the person using the app.
 *
 * The distinction matters because the error formatter above replaces the
 * message of anything classified INTERNAL_SERVER_ERROR, which is what a plain
 * `throw new Error("You need at least 1 credit")` inside a procedure becomes.
 * Deliberate messages have to carry a 4xx code to survive the trip to the
 * client. Anything genuinely unexpected should stay a plain `Error` so that it
 * *is* sanitised.
 */
export function userError(
  message: string,
  code: "BAD_REQUEST" | "NOT_FOUND" | "FORBIDDEN" | "PRECONDITION_FAILED" | "TOO_MANY_REQUESTS" = "BAD_REQUEST"
): TRPCError {
  return new TRPCError({ code, message });
}

export const createRouter = t.router;
export const publicQuery = t.procedure;

export let isMaintenanceMode = false;
export function setMaintenanceMode(enabled: boolean) {
  isMaintenanceMode = enabled;
}

const requireAuth = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (isMaintenanceMode && ctx.user?.role !== "admin") {
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "MAINTENANCE_MODE",
    });
  }

  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: ErrorMessages.unauthenticated,
    });
  }

  return next({ ctx: { ...ctx, user: ctx.user } });
});

function requireRole(role: string) {
  return t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== role) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: ErrorMessages.insufficientRole,
      });
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  });
}

/** Rate limit by IP address (for public/unauthenticated routes) */
export function rateLimitByIP(windowMs: number, maxRequests: number) {
  return t.middleware(async (opts) => {
    const ip = getClientIP(opts.ctx.req.headers);
    const result = checkRateLimit(`ip:${ip}:${opts.path}`, windowMs, maxRequests);

    if (!result.allowed) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Rate limit exceeded. Retry after ${Math.ceil((result.resetAt - Date.now()) / 1000)}s.`,
      });
    }

    return opts.next({
      ctx: {
        ...opts.ctx,
        rateLimit: result,
      },
    });
  });
}

/** Rate limit by user ID (for authenticated routes) */
export function rateLimitByUser(windowMs: number, maxRequests: number) {
  return t.middleware(async (opts) => {
    const userId = opts.ctx.user?.id;
    let result: import("./lib/ratelimit").RateLimitResult;

    if (!userId) {
      // Fall back to IP if no user
      const ip = getClientIP(opts.ctx.req.headers);
      result = checkRateLimit(`ip:${ip}:${opts.path}`, windowMs, maxRequests);
    } else {
      result = checkRateLimit(
        `user:${userId}:${opts.path}`,
        windowMs,
        maxRequests
      );
    }

    if (!result.allowed) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Rate limit exceeded. Retry after ${Math.ceil((result.resetAt - Date.now()) / 1000)}s.`,
      });
    }

    return opts.next({
      ctx: {
        ...opts.ctx,
        rateLimit: result,
      },
    });
  });
}

export const authedQuery = t.procedure.use(requireAuth);
export const adminQuery = authedQuery.use(requireRole("admin"));
