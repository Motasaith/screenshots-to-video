import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, adminQuery, authedQuery, isMaintenanceMode, setMaintenanceMode, rateLimitByUser } from "./middleware";
import { getDb } from "./queries/connection";
import { users, projects, renderJobs, supportTickets } from "@db/schema";
import { desc, count, eq, and, gte, sql, like, or } from "drizzle-orm";
import { signSessionToken } from "./kimi/session";
import { env } from "./lib/env";
import * as cookie from "cookie";
import { Session } from "@contracts/constants";
import { getSessionCookieOptions } from "./lib/cookies";
import { createLogger } from "./lib/logger";

import { cleanupExpiredProjects, findExpiredProjects, findPendingExpiryProjects } from "./lib/cleanup";

// Admin rate-limited query/mutation helpers
const log = createLogger({ path: "adminRouter" });

const adminLimited = adminQuery.use(rateLimitByUser(60_000, 30));
const adminMutationLimited = adminQuery.use(rateLimitByUser(60_000, 20));

export const adminRouter = createRouter({
  // ── Detailed stats for the dashboard overview ──
  getDetailedStats: adminLimited.query(async () => {
    const db = getDb();

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // User counts
    const [totalUsersRow] = await db.select({ value: count() }).from(users);
    const [newUsers24hRow] = await db
      .select({ value: count() })
      .from(users)
      .where(gte(users.createdAt, since24h));
    const [newUsers7dRow] = await db
      .select({ value: count() })
      .from(users)
      .where(gte(users.createdAt, since7d));

    // Plan distribution
    const [freeRow] = await db
      .select({ value: count() })
      .from(users)
      .where(eq(users.plan, "free"));
    const [proRow] = await db
      .select({ value: count() })
      .from(users)
      .where(eq(users.plan, "pro"));
    const [teamRow] = await db
      .select({ value: count() })
      .from(users)
      .where(eq(users.plan, "team"));

    // Project counts
    const [totalProjectsRow] = await db.select({ value: count() }).from(projects);

    // Render job stats
    const [totalJobsRow] = await db.select({ value: count() }).from(renderJobs);
    const [queuedJobsRow] = await db
      .select({ value: count() })
      .from(renderJobs)
      .where(eq(renderJobs.status, "queued"));
    const [processingJobsRow] = await db
      .select({ value: count() })
      .from(renderJobs)
      .where(eq(renderJobs.status, "processing"));
    const [completeJobsRow] = await db
      .select({ value: count() })
      .from(renderJobs)
      .where(eq(renderJobs.status, "complete"));
    const [errorJobsRow] = await db
      .select({ value: count() })
      .from(renderJobs)
      .where(eq(renderJobs.status, "error"));

    // Jobs in last 24h
    const [jobs24hRow] = await db
      .select({ value: count() })
      .from(renderJobs)
      .where(gte(renderJobs.createdAt, since24h));

    // Total credits issued
    const [creditsRow] = await db
      .select({ value: sql<number>`COALESCE(SUM(${users.credits}), 0)` })
      .from(users);

    // Active (signed in within 24h) users — approximate via lastSignInAt
    const [active24hRow] = await db
      .select({ value: count() })
      .from(users)
      .where(gte(users.lastSignInAt, since24h));

    const totalJobs = totalJobsRow.value || 0;
    const errorJobs = errorJobsRow.value || 0;
    const errorRate = totalJobs > 0 ? Math.round((errorJobs / totalJobs) * 1000) / 10 : 0;

    return {
      users: {
        total: totalUsersRow.value,
        new24h: newUsers24hRow.value,
        new7d: newUsers7dRow.value,
        active24h: active24hRow.value,
        byPlan: {
          free: freeRow.value,
          pro: proRow.value,
          team: teamRow.value,
        },
      },
      projects: {
        total: totalProjectsRow.value,
      },
      jobs: {
        total: totalJobs,
        queued: queuedJobsRow.value,
        processing: processingJobsRow.value,
        complete: completeJobsRow.value,
        error: errorJobs,
        jobs24h: jobs24hRow.value,
        errorRate,
      },
      credits: {
        totalIssued: Number(creditsRow.value) || 0,
      },
      maintenanceMode: isMaintenanceMode,
    };
  }),

  // ── Daily signups + jobs for the last 14 days (for sparkline charts) ──
  getTimeseries: adminLimited.query(async () => {
    const db = getDb();
    const days = 14;
    const start = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);

    const userSeries = await db
      .select({
        day: sql<string>`DATE(${users.createdAt})`.as("day"),
        count: count(),
      })
      .from(users)
      .where(gte(users.createdAt, start))
      .groupBy(sql`DATE(${users.createdAt})`)
      .orderBy(sql`DATE(${users.createdAt})`);

    const jobSeries = await db
      .select({
        day: sql<string>`DATE(${renderJobs.createdAt})`.as("day"),
        count: count(),
      })
      .from(renderJobs)
      .where(gte(renderJobs.createdAt, start))
      .groupBy(sql`DATE(${renderJobs.createdAt})`)
      .orderBy(sql`DATE(${renderJobs.createdAt})`);

    // Fill missing days
    const map: Record<string, { users: number; jobs: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      map[d.toISOString().slice(0, 10)] = { users: 0, jobs: 0 };
    }
    for (const r of userSeries) {
      if (map[r.day]) map[r.day].users = r.count;
    }
    for (const r of jobSeries) {
      if (map[r.day]) map[r.day].jobs = r.count;
    }

    return Object.entries(map).map(([day, v]) => ({ day, ...v }));
  }),

  toggleMaintenance: adminMutationLimited
    .input(z.object({ enabled: z.boolean() }))
    .mutation(({ input }) => {
      setMaintenanceMode(input.enabled);
      return { maintenanceMode: isMaintenanceMode };
    }),

  updateUserPlan: adminMutationLimited
    .input(z.object({ userId: z.number(), plan: z.enum(["free", "pro", "team"]), credits: z.number() }))
    .mutation(async ({ input }) => {
      await getDb()
        .update(users)
        .set({ plan: input.plan, credits: input.credits })
        .where(eq(users.id, input.userId));
      return { success: true };
    }),

  impersonateUser: adminMutationLimited
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

      // Store the admin's original session token in a short-lived cookie
      // so it can be restored when the admin wants to return to their account.
      // This cookie is NOT httpOnly so the frontend can detect it via document.cookie
      // and show the "Return to Admin" button.
      const adminToken = ctx.req.headers.get("cookie")?.match(/aivideo_session=([^;]+)/)?.[1];
      if (adminToken) {
        ctx.resHeaders.append(
          "set-cookie",
          cookie.serialize("aivideo_admin_restore", adminToken, {
            httpOnly: false,
            path: opts.path,
            sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
            secure: opts.secure,
            maxAge: 3600, // 1 hour to restore
          })
        );
      }

      return { success: true };
    }),

  // ── Restore admin session after impersonation ──
  // Uses authedQuery (not adminQuery) because the admin is currently logged in
  // as the impersonated user, so they don't have admin role in their session.
  restoreAdminSession: authedQuery
    .use(rateLimitByUser(60_000, 5))
    .mutation(async ({ ctx }) => {
      // This endpoint is called by the impersonated user's session,
      // so ctx.user is the target user, not the admin.
      // We need to read the admin restore cookie and set it back as the main session.
      const restoreToken = ctx.req.headers.get("cookie")?.match(/aivideo_admin_restore=([^;]+)/)?.[1];
      if (!restoreToken) {
        throw new Error("No admin session to restore. The restore cookie may have expired.");
      }

      const opts = getSessionCookieOptions(ctx.req.headers);
      // Set the admin's original token back as the main session
      ctx.resHeaders.append(
        "set-cookie",
        cookie.serialize(Session.cookieName, restoreToken, {
          httpOnly: opts.httpOnly,
          path: opts.path,
          sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
          secure: opts.secure,
          maxAge: Session.maxAgeMs / 1000,
        })
      );
      // Clear the restore cookie
      ctx.resHeaders.append(
        "set-cookie",
        cookie.serialize("aivideo_admin_restore", "", {
          httpOnly: opts.httpOnly,
          path: opts.path,
          sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
          secure: opts.secure,
          maxAge: 0,
        })
      );

      return { success: true };
    }),

  cancelJob: adminMutationLimited
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ input }) => {
      await getDb()
        .update(renderJobs)
        .set({ status: "error", message: "Job cancelled by Admin." })
        .where(eq(renderJobs.id, input.jobId));
      return { success: true };
    }),

  retryJob: adminMutationLimited
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ input }) => {
      await getDb()
        .update(renderJobs)
        .set({ status: "queued", message: "Manually re-queued by Admin." })
        .where(eq(renderJobs.id, input.jobId));
      return { success: true };
    }),

  runCleanup: adminMutationLimited.mutation(async () => {
    const cleaned = await cleanupExpiredProjects();
    return { cleaned };
  }),

  getExpiredProjects: adminLimited.query(async () => {
    const expired = await findExpiredProjects();
    const pending = await findPendingExpiryProjects();
    return { expired, pending };
  }),

  listUsers: adminLimited
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

  listJobs: adminLimited
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

  // ── Search users by name/email/unionId ──
  searchUsers: adminLimited
    .input(z.object({ query: z.string().min(1).max(100) }))
    .query(async ({ input }) => {
      const db = getDb();
      const pattern = `%${input.query}%`;
      return db
        .select()
        .from(users)
        .where(
          or(
            like(users.name, pattern),
            like(users.email, pattern),
            like(users.unionId, pattern),
          ),
        )
        .orderBy(desc(users.createdAt))
        .limit(50);
    }),

  // ── List projects (screenshot wizard) with user info ──
  listProjects: adminLimited
    .input(
      z
        .object({
          limit: z.number().max(200).default(50),
          offset: z.number().default(0),
          status: z.enum(["draft", "processing", "complete", "error"]).optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input?.status) conditions.push(eq(projects.status, input.status));
      const where = conditions.length ? and(...conditions) : undefined;

      const rows = await db
        .select({
          project: projects,
          userName: users.name,
          userEmail: users.email,
        })
        .from(projects)
        .leftJoin(users, eq(projects.userId, users.id))
        .where(where ?? sql`1=1`)
        .orderBy(desc(projects.createdAt))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0);

      return rows;
    }),

  // ── Delete a project (and its steps) ──
  deleteProject: adminMutationLimited
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(projects).where(eq(projects.id, input.projectId));
      return { success: true };
    }),

  // ── Log Viewer: read logs with filters ──
  getLogs: adminLimited
    .input(
      z
        .object({
          date: z.string().optional(),
          level: z.enum(["debug", "info", "warn", "error"]).optional(),
          userId: z.number().optional(),
          search: z.string().optional(),
          pathPrefix: z.string().max(60).optional(),
          limit: z.number().max(500).default(200),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const { readLogs } = await import("./lib/logger");
      return readLogs(input);
    }),

  // ── Log Viewer: list available log dates ──
  getLogDates: adminLimited.query(async () => {
    const { listLogDates } = await import("./lib/logger");
    return listLogDates();
  }),

  // ── Log Viewer: get log statistics ──
  getLogStats: adminLimited.query(async () => {
    const { getLogStats } = await import("./lib/logger");
    return getLogStats();
  }),

  // ── Storage usage stats ──
  getStorageStats: adminLimited.query(async () => {
    const { getStorageStats } = await import("./lib/cleanup");
    const { STORAGE_ALERT_THRESHOLD_GB, STORAGE_HARD_LIMIT_GB, RETENTION_DAYS } = await import("./lib/render-config");
    const stats = await getStorageStats();
    return {
      ...stats,
      alertThresholdGB: STORAGE_ALERT_THRESHOLD_GB,
      hardLimitGB: STORAGE_HARD_LIMIT_GB,
      retentionDays: RETENTION_DAYS,
    };
  }),

  // ── Render queue stats ──
  getQueueStats: adminLimited.query(async () => {
    const { MAX_QUEUE_DEPTH, MAX_CONCURRENT_RENDERS_PER_USER, CREDIT_COST, RENDER_TIMEOUT_MS } = await import("./lib/render-config");
    const db = getDb();

    const [queuedCount] = await db
      .select({ value: count() })
      .from(renderJobs)
      .where(eq(renderJobs.status, "queued"));

    const [processingCount] = await db
      .select({ value: count() })
      .from(renderJobs)
      .where(eq(renderJobs.status, "processing"));

    const [errorCount] = await db
      .select({ value: count() })
      .from(renderJobs)
      .where(eq(renderJobs.status, "error"));

    return {
      queued: queuedCount?.value ?? 0,
      processing: processingCount?.value ?? 0,
      errors: errorCount?.value ?? 0,
      maxQueueDepth: MAX_QUEUE_DEPTH,
      maxConcurrentPerUser: MAX_CONCURRENT_RENDERS_PER_USER,
      creditCost: CREDIT_COST,
      renderTimeoutMs: RENDER_TIMEOUT_MS,
    };
  }),

  /* --------------------------------------------------------- support queue */

  /**
   * The support queue.
   *
   * Open tickets first, because a queue sorted purely by date buries the thing
   * that still needs doing under everything already resolved.
   */
  listTickets: adminLimited
    .input(
      z
        .object({
          status: z.enum(["open", "in_progress", "waiting", "resolved", "all"]).default("open"),
          limit: z.number().min(1).max(100).default(50),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const status = input?.status ?? "open";
      const db = getDb();

      const rows = await db
        .select()
        .from(supportTickets)
        .where(status === "all" ? undefined : eq(supportTickets.status, status))
        .orderBy(desc(supportTickets.id))
        .limit(input?.limit ?? 50);

      const [openCount] = await db
        .select({ value: count() })
        .from(supportTickets)
        .where(eq(supportTickets.status, "open"));

      return { tickets: rows, openCount: openCount?.value ?? 0 };
    }),

  /**
   * One ticket, by id.
   *
   * The detail pane reads from here rather than from the filtered list, because
   * replying moves a ticket to "waiting" and it would drop straight out of the
   * default "open" filter, emptying the pane the admin was reading.
   */
  getTicket: adminLimited
    .input(z.object({ ticketId: z.number() }))
    .query(async ({ input }) => {
      const [ticket] = await getDb()
        .select()
        .from(supportTickets)
        .where(eq(supportTickets.id, input.ticketId))
        .limit(1);
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });
      return ticket;
    }),

  /**
   * Answer a customer.
   *
   * The reply lands on the ticket, which the widget polls, so it appears in the
   * customer's chat without them reloading. `unreadForCustomer` is what lets the
   * widget nudge someone who has the panel closed.
   *
   * Moves the ticket to "waiting" unless it is being explicitly resolved: after
   * answering, the ball is with the customer.
   */
  replyToTicket: adminLimited
    .input(
      z.object({
        ticketId: z.number(),
        message: z.string().min(1).max(4000),
        resolve: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [ticket] = await db
        .select()
        .from(supportTickets)
        .where(eq(supportTickets.id, input.ticketId))
        .limit(1);

      if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });

      const replies = [
        ...(ticket.replies ?? []),
        { from: "admin" as const, content: input.message, at: new Date().toISOString() },
      ];

      await db
        .update(supportTickets)
        .set({
          replies,
          status: input.resolve ? "resolved" : "waiting",
          unreadForCustomer: (ticket.unreadForCustomer ?? 0) + 1,
        })
        .where(eq(supportTickets.id, ticket.id));

      log.info("Admin replied to support ticket", {
        userId: ctx.user!.id,
        ticketId: ticket.id,
        resolved: input.resolve,
      });

      // Only reaches the customer once a mail provider is configured; the reply
      // is already in their widget either way. See api/lib/notify.ts.
      const { notifyCustomerOfReply } = await import("./lib/notify");
      void notifyCustomerOfReply({
        to: ticket.email,
        subject: ticket.subject,
        reply: input.message,
      }).catch(() => {});

      return { ok: true as const };
    }),

  /** Move a ticket through the queue without replying. */
  setTicketStatus: adminLimited
    .input(
      z.object({
        ticketId: z.number(),
        status: z.enum(["open", "in_progress", "waiting", "resolved"]),
      })
    )
    .mutation(async ({ input }) => {
      await getDb()
        .update(supportTickets)
        .set({ status: input.status })
        .where(eq(supportTickets.id, input.ticketId));
      return { ok: true as const };
    }),

  /** A note only admins ever see. */
  setTicketNote: adminLimited
    .input(z.object({ ticketId: z.number(), note: z.string().max(4000) }))
    .mutation(async ({ input }) => {
      await getDb()
        .update(supportTickets)
        .set({ internalNote: input.note })
        .where(eq(supportTickets.id, input.ticketId));
      return { ok: true as const };
    }),
});
