/**
 * Settings an admin can change without a deploy.
 *
 * Three problems this solves at once.
 *
 * The free-tier limit was hard-coded as 14 a week in `render-config.ts` while the
 * dashboard and the support assistant both told users 5 a month, so the assistant
 * confidently stated a limit the code did not enforce. There is now one number and
 * everything reads it.
 *
 * Promotions used to mean editing code. The multiplier below is why a "4x free
 * videos this week" offer is now a number in the admin dashboard.
 *
 * Maintenance mode was a module-scope variable in `middleware.ts`, so it forgot
 * itself on every restart, and once the render worker became its own process the
 * two would have disagreed about whether the site was in maintenance. Stored here,
 * they agree.
 */

import { appSettings } from "@db/schema";
import { getDb } from "../queries/connection";
import { createLogger } from "./logger";

const log = createLogger({ path: "app-settings" });

export interface Announcement {
  /** Shown above the navbar on every page. Empty means nothing is shown. */
  message: string;
  /** Drives the colour: information, a warning, or something to celebrate. */
  level: "info" | "warning" | "success";
  /** Optional call to action. */
  linkUrl: string;
  linkLabel: string;
  /** Off by default so an edit in progress is not live. */
  active: boolean;
  /** Whether a visitor may close it. Leave off for something they must see. */
  dismissible: boolean;
  /** ISO dates, or empty for no bound. */
  startsAt: string;
  endsAt: string;
}

export interface AppSettingsShape {
  maintenanceMode: boolean;

  /** Videos a free account may create per month, before the promo multiplier. */
  freeVideosPerMonth: number;
  /** Days after which a free account's counter resets. */
  freeResetDays: number;

  /**
   * Multiplies every free allowance while a promotion runs. 1 means no promotion.
   * Set to 4 and a 6-video plan becomes 24 without touching code.
   */
  promoMultiplier: number;
  /** Shown in the app so the extra videos are visibly a promotion. */
  promoLabel: string;
  /** ISO date. Past this, the multiplier is ignored even if left set. */
  promoEndsAt: string;

  /**
   * What one render credit is worth in dollars.
   *
   * Used when an admin grants credits by value ("give them $10 of credits") and
   * when reporting what a plan is worth. It does not price the plans themselves.
   */
  creditDollarValue: number;

  /**
   * Renders a Pro account may start per calendar month.
   *
   * Here rather than in code because it is a pricing decision, and because the number
   * on the pricing page and the number enforced at render time have to be the same
   * one. 0 means no cap.
   */
  proRendersPerMonth: number;

  /**
   * Seats a new team starts with, before any are bought.
   *
   * Here rather than in code so the Team plan's inclusive seat count can change with
   * a pricing decision instead of a deploy.
   */
  teamSeatsIncluded: number;

  announcement: Announcement;
}

export const DEFAULT_SETTINGS: AppSettingsShape = {
  maintenanceMode: false,
  freeVideosPerMonth: 6,
  freeResetDays: 30,
  promoMultiplier: 1,
  promoLabel: "",
  promoEndsAt: "",
  creditDollarValue: 0.5,
  proRendersPerMonth: 30,
  teamSeatsIncluded: 3,
  announcement: {
    message: "",
    level: "info",
    linkUrl: "",
    linkLabel: "",
    active: false,
    dismissible: true,
    startsAt: "",
    endsAt: "",
  },
};

/**
 * Cached briefly rather than read per request.
 *
 * The API and the worker are separate processes with no channel between them, so
 * a short time-to-live is how they converge: a change is live everywhere within
 * `CACHE_MS`, without a message bus or a restart.
 */
const CACHE_MS = 10_000;
let cache: { at: number; value: AppSettingsShape } | null = null;

export function invalidateSettingsCache(): void {
  cache = null;
}

export async function getSettings(): Promise<AppSettingsShape> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;

  try {
    const rows = await getDb().select().from(appSettings);
    const merged: AppSettingsShape = { ...DEFAULT_SETTINGS };

    for (const row of rows) {
      if (!(row.key in DEFAULT_SETTINGS)) continue;
      const fallback = DEFAULT_SETTINGS[row.key as keyof AppSettingsShape];
      const value = row.value;

      // A stored value of the wrong shape is ignored rather than crashing every
      // page. Type mismatches happen when a setting is renamed or retyped.
      const target = merged as unknown as Record<string, unknown>;
      if (typeof fallback === "object" && fallback !== null) {
        if (value && typeof value === "object") {
          target[row.key] = { ...fallback, ...value };
        }
      } else if (typeof value === typeof fallback) {
        target[row.key] = value;
      }
    }

    cache = { at: Date.now(), value: merged };
    return merged;
  } catch (err) {
    // Never let a settings read take the site down. Defaults are a working site.
    log.warn("Could not read app settings, using defaults", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ...DEFAULT_SETTINGS };
  }
}

export async function setSetting<K extends keyof AppSettingsShape>(
  key: K,
  value: AppSettingsShape[K],
  updatedBy: number
): Promise<void> {
  await getDb()
    .insert(appSettings)
    .values({ key, value: value as unknown, updatedBy })
    .onDuplicateKeyUpdate({ set: { value: value as unknown, updatedBy } });

  invalidateSettingsCache();
  log.info("Setting changed", { key, updatedBy });
}

/** Whether the promotion is on right now. */
export function promoActive(s: AppSettingsShape): boolean {
  if (s.promoMultiplier <= 1) return false;
  if (!s.promoEndsAt) return true;
  const ends = new Date(s.promoEndsAt).getTime();
  return Number.isFinite(ends) ? ends > Date.now() : true;
}

/**
 * How many videos a free account may create this period.
 *
 * The single source of truth. `render-config.ts` no longer decides this, and
 * neither does the copy on the dashboard or in the support assistant's knowledge.
 */
export function freeVideoAllowance(s: AppSettingsShape): number {
  const base = Math.max(0, Math.floor(s.freeVideosPerMonth));
  return promoActive(s) ? base * Math.max(1, Math.floor(s.promoMultiplier)) : base;
}

/** Whether an announcement should be on screen at this moment. */
export function announcementLive(a: Announcement): boolean {
  if (!a.active || !a.message.trim()) return false;
  const now = Date.now();
  if (a.startsAt) {
    const from = new Date(a.startsAt).getTime();
    if (Number.isFinite(from) && from > now) return false;
  }
  if (a.endsAt) {
    const to = new Date(a.endsAt).getTime();
    if (Number.isFinite(to) && to < now) return false;
  }
  return true;
}

/** Credits for a dollar amount, so an admin can grant "$10 of credits". */
export function creditsForDollars(s: AppSettingsShape, dollars: number): number {
  const worth = s.creditDollarValue > 0 ? s.creditDollarValue : DEFAULT_SETTINGS.creditDollarValue;
  return Math.max(0, Math.round(dollars / worth));
}
