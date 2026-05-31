import { ErrorMessages } from "@contracts/constants";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { checkRateLimit, getClientIP } from "./lib/ratelimit";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

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
