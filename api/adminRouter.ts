import { z } from "zod";
import { createRouter, adminQuery, isMaintenanceMode, setMaintenanceMode } from "./middleware";
import { getDb } from "./queries/connection";
import { users, projects, renderJobs } from "@db/schema";
import { desc, count, eq } from "drizzle-orm";
import { signSessionToken } from "./kimi/session";
import { env } from "./lib/env";
import * as cookie from "cookie";
import { Session } from "@contracts/constants";
import { getSessionCookieOptions } from "./lib/cookies";

import { cleanupExpiredProjects, findExpiredProjects, findPendingExpiryProjects } from "./lib/cleanup";

export const adminRouter = createRouter({
  getStats: adminQuery.query(async () => {
    const db = getDb();
    const [userCount] = await db.select({ value: count() }).from(users);
    const [projectCount] = await db.select({ value: count() }).from(projects);
    const [jobCount] = await db.select({ value: count() }).from(renderJobs);

    return {
      totalUsers: userCount.value,
      totalProjects: projectCount.value,
      totalJobs: jobCount.value,
      maintenanceMode: isMaintenanceMode,
    };
  }),

  toggleMaintenance: adminQuery
    .input(z.object({ enabled: z.boolean() }))
    .mutation(({ input }) => {
      setMaintenanceMode(input.enabled);
      return { maintenanceMode: isMaintenanceMode };
    }),

  updateUserPlan: adminQuery
    .input(z.object({ userId: z.number(), plan: z.enum(["free", "pro", "team"]), credits: z.number() }))
    .mutation(async ({ input }) => {
      await getDb()
        .update(users)
        .set({ plan: input.plan, credits: input.credits })
        .where(eq(users.id, input.userId));
      return { success: true };
    }),

  impersonateUser: adminQuery
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [targetUser] = await getDb()
        .select()
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!targetUser) throw new Error("User not found");

      // Generate a session token for the target user allowing admin to log in as them
      const token = await signSessionToken({
        unionId: targetUser.unionId,
        clientId: env.googleClientId,
      });

      const opts = getSessionCookieOptions(ctx.req.headers);
      ctx.resHeaders.append(
        "set-cookie",
        cookie.serialize(Session.cookieName, token, {
          httpOnly: opts.httpOnly,
          path: opts.path,
          sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
          secure: opts.secure,
          maxAge: Session.maxAgeMs / 1000,
        })
      );

      return { success: true };
    }),

  cancelJob: adminQuery
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ input }) => {
      await getDb()
        .update(renderJobs)
        .set({ status: "error", message: "Job cancelled by Admin." })
        .where(eq(renderJobs.id, input.jobId));
      return { success: true };
    }),

  retryJob: adminQuery
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ input }) => {
      await getDb()
        .update(renderJobs)
        .set({ status: "queued", message: "Manually re-queued by Admin." })
        .where(eq(renderJobs.id, input.jobId));
      return { success: true };
    }),

  runCleanup: adminQuery.mutation(async () => {
    const cleaned = await cleanupExpiredProjects();
    return { cleaned };
  }),

  getExpiredProjects: adminQuery.query(async () => {
    const expired = await findExpiredProjects();
    const pending = await findPendingExpiryProjects();
    return { expired, pending };
  }),

  listUsers: adminQuery
    .input(z.object({ limit: z.number().max(200).default(50), offset: z.number().default(0) }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0);
    }),

  listJobs: adminQuery
    .input(z.object({ limit: z.number().max(200).default(50), offset: z.number().default(0) }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(renderJobs)
        .orderBy(desc(renderJobs.createdAt))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0);
    }),
});
