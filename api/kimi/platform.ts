import { env } from "../lib/env";
import type { UserProfile } from "./types";

async function kimiRequest<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T | null> {
  try {
    const resp = await fetch(`${env.kimiOpenUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...init?.headers,
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.warn(
        `[kimi] Request to ${path} failed (${resp.status}): ${text}`,
      );
      return null;
    }
    return resp.json() as Promise<T>;
  } catch (err) {
    console.warn(`[kimi] Request to ${path} errored:`, err instanceof Error ? err.message : err);
    return null;
  }
}

export const users = {
  getProfile: (token: string) =>
    kimiRequest<UserProfile>("/v1/users/me/profile", token),
};
