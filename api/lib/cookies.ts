import type { CookieOptions } from "hono/utils/cookie";

function isLocalhost(headers: Headers): boolean {
  const host = headers.get("host") || "";
  return host.startsWith("localhost:") || host.startsWith("127.0.0.1:");
}

/**
 * `SameSite=Lax`, deliberately, including in production.
 *
 * This was `None` in production, which tells the browser to attach the session
 * cookie to cross-site requests and so removes the browser-level defence against
 * request forgery. It bought nothing: the SPA is served by this same Hono app, so
 * every legitimate request is same-origin, and `Lax` still sends the cookie on
 * top-level navigations, which is what an OAuth redirect back from Google is.
 *
 * With `None`, a cross-site page could make an authenticated `multipart/form-data`
 * POST to `/api/upload` and have a file written into the victim's account. That is
 * a CORS "simple request", so no preflight stood in the way. Confirmed by request
 * before this change.
 */
export function getSessionCookieOptions(headers: Headers): CookieOptions {
  const localhost = isLocalhost(headers);

  return {
    httpOnly: true,
    path: "/",
    sameSite: "Lax",
    secure: !localhost,
  };
}
