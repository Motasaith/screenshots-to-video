import { authRouter } from "./auth-router";
import { createRouter, publicQuery, isMaintenanceMode, rateLimitByIP } from "./middleware";
import { projectRouter } from "./projectRouter";
import { stepRouter } from "./stepRouter";
import { aiRouter } from "./aiRouter";
import { renderRouter } from "./renderRouter";
import { adminRouter } from "./adminRouter";
import { settingsRouter } from "./settingsRouter";

export const appRouter = createRouter({
  ping: publicQuery
    .use(rateLimitByIP(60_000, 30))
    .query(() => ({ ok: true, ts: Date.now() })),
  config: publicQuery
    .use(rateLimitByIP(60_000, 60))
    .query(() => ({ maintenanceMode: isMaintenanceMode })),
  auth: authRouter,
  project: projectRouter,
  step: stepRouter,
  ai: aiRouter,
  render: renderRouter,
  admin: adminRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
