import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import { authenticateRequest } from "./kimi/auth";
import { createLogger } from "./lib/logger";
import { teamForUser, type TeamRole } from "./lib/teams";

/**
 * The signed-in user, plus their team if they are in one.
 *
 * `plan` is overwritten with the team's plan for a member, which is the whole
 * mechanism behind team billing: every plan gate already written, 4K resolution,
 * retention windows, queue priority, starts applying to team members without a
 * single one of them being changed.
 */
export type ContextUser = User & {
  teamId: number | null;
  teamRole: TeamRole | null;
  teamName: string | null;
};

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: ContextUser;
  ip: string;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ip = opts.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || opts.req.headers.get("x-real-ip")?.trim()
    || "unknown";
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders, ip };
  const log = createLogger({ ip });

  try {
    const user = await authenticateRequest(opts.req.headers);

    // One extra query per request, on an indexed unique column, and it is what
    // lets every downstream check treat team membership as a property of the user
    // rather than looking it up itself.
    const team = await teamForUser(user.id);

    ctx.user = {
      ...user,
      plan: team ? team.plan : user.plan,
      teamId: team?.teamId ?? null,
      teamRole: team?.role ?? null,
      teamName: team?.name ?? null,
    };
    log.debug("Authenticated request", { userId: user.id, teamId: team?.teamId });
  } catch (err) {
    // No valid session — user is unauthenticated. Do NOT fall back to guest.
    log.debug("No valid session", { error: err instanceof Error ? err.message : String(err) });
  }
  return ctx;
}
