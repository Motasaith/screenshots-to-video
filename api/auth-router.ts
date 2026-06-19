import * as cookie from "cookie";
import { Session } from "@contracts/constants";
import { getSessionCookieOptions } from "./lib/cookies";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { GUEST_USER } from "./context";

export const authRouter = createRouter({
  /**
   * Returns the current user. For authenticated users, returns their real profile.
   * For guest users (no session cookie), returns the guest user object.
   * This allows the frontend to always have a valid "user" and skip login redirects.
   */
  me: publicQuery.query((opts) => {
    const user = opts.ctx.user ?? GUEST_USER;
    const isGuest = opts.ctx.isGuest ?? !opts.ctx.user;
    return { ...user, isGuest };
  }),

  logout: authedQuery.mutation(async ({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: 0,
      }),
    );
    return { success: true };
  }),
});
