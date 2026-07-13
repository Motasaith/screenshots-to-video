import { env } from "../lib/env";
import { createLogger } from "../lib/logger";
import type { UserProfile } from "./types";

const log = createLogger({ path: "kimi-platform" });

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
      log.warn(`Request to ${path} failed (${resp.status})`, { response: text });
      return null;
    }
    return resp.json() as Promise<T>;
  } catch (err) {
    log.warn(`Request to ${path} errored`, { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

export const users = {
  getProfile: (token: string) =>
    kimiRequest<UserProfile>("/v1/users/me/profile", token),
};
