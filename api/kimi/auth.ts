import type { Context } from "hono";
import { setCookie } from "hono/cookie";
import * as jose from "jose";
import * as cookie from "cookie";
import { env } from "../lib/env";
import { getSessionCookieOptions } from "../lib/cookies";
import { Session } from "@contracts/constants";
import { Errors } from "@contracts/errors";
import { signSessionToken, verifySessionToken } from "./session";
import { findUserByUnionId, upsertUser } from "../queries/users";

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token: string;
}

async function exchangeAuthCode(
  code: string,
  redirectUri: string,
): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    client_id: env.googleClientId,
    client_secret: env.googleClientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token exchange failed (${resp.status}): ${text}`);
  }

  return resp.json() as Promise<GoogleTokenResponse>;
}

const googleJwks = jose.createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

async function verifyIdToken(idToken: string) {
  const { payload } = await jose.jwtVerify(idToken, googleJwks, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: env.googleClientId,
  });
  
  if (!payload.sub) {
    throw new Error("subject (sub) missing from id_token");
  }
  
  return {
    userId: payload.sub,
    email: payload.email as string,
    name: payload.name as string,
    picture: payload.picture as string,
  };
}

export async function authenticateRequest(headers: Headers) {
  const cookies = cookie.parse(headers.get("cookie") || "");
  const token = cookies[Session.cookieName];
  if (!token) {
    throw Errors.forbidden("Invalid authentication token.");
  }
  const claim = await verifySessionToken(token);
  if (!claim) {
    throw Errors.forbidden("Invalid authentication token.");
  }
  const user = await findUserByUnionId(claim.unionId);
  if (!user) {
    throw Errors.forbidden("User not found. Please re-login.");
  }
  return user;
}

export function createOAuthCallbackHandler() {
  return async (c: Context) => {
    const code = c.req.query("code");
    const state = c.req.query("state");
    const error = c.req.query("error");

    if (error) {
      if (error === "access_denied") {
        return c.redirect("/", 302);
      }
      return c.json({ error }, 400);
    }

    if (!code || !state) {
      return c.json({ error: "code and state are required" }, 400);
    }

    try {
      const redirectUri = atob(state);
      const tokenResp = await exchangeAuthCode(code, redirectUri);
      
      // Verify Google ID Token
      const profile = await verifyIdToken(tokenResp.id_token);

      // Create or update user
      await upsertUser({
        unionId: profile.userId,
        email: profile.email,
        name: profile.name,
        avatar: profile.picture,
        lastSignInAt: new Date(),
      });

      // Create session
      const token = await signSessionToken({
        unionId: profile.userId,
        clientId: env.googleClientId,
      });

      const cookieOpts = getSessionCookieOptions(c.req.raw.headers);
      setCookie(c, Session.cookieName, token, {
        ...cookieOpts,
        maxAge: Session.maxAgeMs / 1000,
      });

      return c.redirect("/dashboard", 302);
    } catch (error: any) {
      console.error("[OAuth] Callback failed", error);
      return c.json({ error: "OAuth callback failed", details: error.message, stack: error.stack }, 500);
    }
  };
}

export { exchangeAuthCode, verifyIdToken };
