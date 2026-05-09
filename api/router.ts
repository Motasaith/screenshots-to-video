import { authRouter } from "./auth-router";
import { createRouter, publicQuery } from "./middleware";
import { projectRouter } from "./projectRouter";
import { stepRouter } from "./stepRouter";
import { aiRouter } from "./aiRouter";
import { renderRouter } from "./renderRouter";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  project: projectRouter,
  step: stepRouter,
  ai: aiRouter,
  render: renderRouter,
});

export type AppRouter = typeof appRouter;
