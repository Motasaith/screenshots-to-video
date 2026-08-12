import { authRouter } from "./auth-router";
import { createRouter, publicQuery, isMaintenanceMode, rateLimitByIP } from "./middleware";
import {
  announcementLive,
  freeVideoAllowance,
  getSettings,
  promoActive,
  type Announcement,
} from "./lib/appSettings";
import { projectRouter } from "./projectRouter";
import { stepRouter } from "./stepRouter";
import { aiRouter } from "./aiRouter";
import { teamRouter } from "./teamRouter";
import { renderRouter } from "./renderRouter";
import { adminRouter } from "./adminRouter";
import { settingsRouter } from "./settingsRouter";
import { supportRouter } from "./supportRouter";

export const appRouter = createRouter({
  ping: publicQuery
    .use(rateLimitByIP(60_000, 30))
    .query(() => ({ ok: true, ts: Date.now() })),
  /**
   * Everything the shell of the site needs before a user is known.
   *
   * Maintenance mode moved out of a module variable so it survives a restart and
   * so the API and the render worker, now separate processes, agree about it. The
   * announcement is here too rather than on its own endpoint, because the app
   * already calls this on load and one request is better than two.
   */
  config: publicQuery
    .use(rateLimitByIP(60_000, 60))
    .query(async () => {
      const settings = await getSettings();
      const banner = announcementLive(settings.announcement) ? settings.announcement : null;
      return {
        maintenanceMode: settings.maintenanceMode || isMaintenanceMode,
        announcement: banner && {
          // An id derived from the content, so dismissing one banner does not
          // hide the next one the admin writes.
          id: hashAnnouncement(banner),
          message: banner.message,
          level: banner.level,
          linkUrl: banner.linkUrl,
          linkLabel: banner.linkLabel,
          dismissible: banner.dismissible,
        },
        promo: promoActive(settings)
          ? { label: settings.promoLabel, freeVideos: freeVideoAllowance(settings) }
          : null,
      };
    }),
  auth: authRouter,
  project: projectRouter,
  step: stepRouter,
  team: teamRouter,
  ai: aiRouter,
  render: renderRouter,
  admin: adminRouter,
  settings: settingsRouter,
  support: supportRouter,
});

export type AppRouter = typeof appRouter;

/**
 * A stable id for a banner's content.
 *
 * The client remembers which banner a visitor dismissed. Keying that on the text
 * means a new announcement shows even to someone who closed the previous one,
 * without the admin having to think about it.
 */
function hashAnnouncement(a: Announcement): string {
  const basis = `${a.message}|${a.level}|${a.linkUrl}|${a.linkLabel}`;
  let hash = 2166136261;
  for (let i = 0; i < basis.length; i += 1) {
    hash ^= basis.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
