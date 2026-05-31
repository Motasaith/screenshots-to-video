import { authRouter } from "./auth-router";
import { createRouter, publicQuery, isMaintenanceMode } from "./middleware";
import { projectRouter } from "./projectRouter";
import { stepRouter } from "./stepRouter";
import { aiRouter } from "./aiRouter";
import { renderRouter } from "./renderRouter";
import { adminRouter } from "./adminRouter";
import { studioRouter } from "./studioRouter";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  config: publicQuery.query(() => ({ maintenanceMode: isMaintenanceMode })),
  auth: authRouter,
  project: projectRouter,
  step: stepRouter,
  ai: aiRouter,
  render: renderRouter,
  admin: adminRouter,
  studio: studioRouter,
});

export type AppRouter = typeof appRouter;
