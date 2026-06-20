import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import { authenticateRequest } from "./kimi/auth";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
  isGuest?: boolean;
};

/**
 * Guest user object used during the testing phase.
 * Grants full admin-level access to unauthenticated visitors.
 * TODO: In production, restrict guest users to 1 project/month and role "user".
 */
export const GUEST_USER: User = {
  id: 0,
  unionId: "guest",
  name: "Guest User",
  email: "guest@aivideo.app",
  avatar: null,
  role: "admin",
  plan: "pro",
  credits: 999,
  videosCreatedThisMonth: 0,
  monthlyResetAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignInAt: new Date(),
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };
  try {
    ctx.user = await authenticateRequest(opts.req.headers);
    ctx.isGuest = false;
  } catch (err) {
    // No valid session — fall back to guest user for testing phase.
    // Log at debug level so auth failures are traceable without spamming.
    console.debug("[context] No valid session, falling back to guest:", err instanceof Error ? err.message : err);
    ctx.user = GUEST_USER;
    ctx.isGuest = true;
  }
  return ctx;
}
