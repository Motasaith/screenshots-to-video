import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, adminQuery, authedQuery, isMaintenanceMode, setMaintenanceMode, rateLimitByUser, userError} from "./middleware";
import { auditRecent, recordAudit } from "./lib/audit";
import {
  emailConfigured,
  promotionalAudience,
  sendPromotional,
  sendTransactional,
  verifyMailer,
} from "./lib/mailer";
import { ensureUnsubscribeToken, publicBaseUrl } from "./lib/mailIdentity";
import {
  announcementLive,
  creditsForDollars,
  freeVideoAllowance,
  getSettings,
  promoActive,
  setSetting,
  type AppSettingsShape,
} from "./lib/appSettings";
import { getDb } from "./queries/connection";
import { users, projects, renderJobs, supportTickets,
  emailCampaigns,
} from "@db/schema";
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

      if (!targetUser) throw userError("User not found", "NOT_FOUND");

      /**
       * Recorded before the token is minted, not after.
       *
       * This endpoint issues a valid session as any user in the system, which makes
       * it the most powerful action in the application. It previously left no trace
       * at all, so there was no way to answer "who looked at this customer's account
       * and when". Written first so a failure later in the handler still leaves the
       * attempt on record.
       */
      await recordAudit({
        action: "impersonation.started",
        actorUserId: ctx.user!.id,
        targetType: "user",
        targetId: targetUser.id,
        metadata: { targetEmail: targetUser.email, targetPlan: targetUser.plan },
        ip: ctx.ip,
      });

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
   * Everything editable from the dashboard, with its current values.
   *
   * Returns the effective free allowance as well as the raw numbers, so the admin
   * sees "6 x 4 = 24" rather than having to work the promotion out.
   */
  getAppSettings: adminLimited.query(async () => {
    const settings = await getSettings();
    return {
      settings,
      effective: {
        freeVideosPerPeriod: freeVideoAllowance(settings),
        promoActive: promoActive(settings),
        announcementLive: announcementLive(settings.announcement),
      },
    };
  }),

  /**
   * Change one or more settings.
   *
   * Every field is optional so the UI can save one section without sending the
   * rest, and each is bounded here rather than trusted from the form. A
   * multiplier of 400 or a negative allowance is a mistake, not a promotion.
   */
  updateAppSettings: adminLimited
    .input(
      z.object({
        maintenanceMode: z.boolean().optional(),
        freeVideosPerMonth: z.number().int().min(0).max(1000).optional(),
        freeResetDays: z.number().int().min(1).max(365).optional(),
        promoMultiplier: z.number().int().min(1).max(20).optional(),
        promoLabel: z.string().max(120).optional(),
        promoEndsAt: z.string().max(40).optional(),
        creditDollarValue: z.number().min(0.01).max(100).optional(),
        teamSeatsIncluded: z.number().int().min(1).max(100).optional(),
        proRendersPerMonth: z.number().int().min(0).max(10_000).optional(),
        announcement: z
          .object({
            message: z.string().max(300),
            level: z.enum(["info", "warning", "success"]),
            linkUrl: z.string().max(500),
            linkLabel: z.string().max(60),
            active: z.boolean(),
            dismissible: z.boolean(),
            startsAt: z.string().max(40),
            endsAt: z.string().max(40),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const adminId = ctx.user!.id;

      for (const [key, value] of Object.entries(input)) {
        if (value === undefined) continue;
        await setSetting(key as keyof AppSettingsShape, value as never, adminId);
      }

      await recordAudit({
        action: "settings.changed",
        actorUserId: adminId,
        metadata: { keys: Object.keys(input) },
        ip: ctx.ip,
      });

      log.info("App settings updated", { adminId, keys: Object.keys(input) });
      const settings = await getSettings();
      return { settings, effective: { freeVideosPerPeriod: freeVideoAllowance(settings) } };
    }),

  /**
   * Give a user credits, priced in dollars or counted directly.
   *
   * Two ways in because both come up: a refund is "give them back $10", while a
   * goodwill gesture is "give them 5 renders". `creditDollarValue` in settings is
   * what converts the first into the second.
   */
  grantCredits: adminLimited
    .input(
      z.object({
        userId: z.number(),
        credits: z.number().int().min(-1000).max(1000).optional(),
        dollars: z.number().min(-1000).max(1000).optional(),
        reason: z.string().max(200),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.credits === undefined && input.dollars === undefined) {
        throw userError("Give either an amount of credits or a dollar value");
      }

      const settings = await getSettings();
      const amount =
        input.credits !== undefined
          ? input.credits
          : Math.sign(input.dollars!) * creditsForDollars(settings, Math.abs(input.dollars!));

      const db = getDb();
      const [target] = await db
        .select({ id: users.id, email: users.email, credits: users.credits })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);
      if (!target) throw userError("User not found", "NOT_FOUND");

      // Never leave a negative balance, whatever was deducted.
      const next = Math.max(0, target.credits + amount);
      await db.update(users).set({ credits: next }).where(eq(users.id, target.id));

      await recordAudit({
        action: "credits.granted",
        actorUserId: ctx.user!.id,
        targetType: "user",
        targetId: target.id,
        metadata: { amount, dollars: input.dollars, reason: input.reason, from: target.credits, to: next },
        ip: ctx.ip,
      });

      log.info("Admin granted credits", {
        adminId: ctx.user!.id,
        targetUserId: target.id,
        amount,
        dollars: input.dollars,
        from: target.credits,
        to: next,
        reason: input.reason,
      });

      return { credits: next, granted: amount, worthDollars: amount * settings.creditDollarValue };
    }),

  /**
   * Everything privileged that has happened, newest first.
   *
   * The reason the audit table exists: impersonation could previously mint a session
   * as any user with no record of it.
   */
  auditTrail: adminLimited
    .input(z.object({ limit: z.number().int().min(1).max(500).default(200) }).optional())
    .query(async ({ input }) => auditRecent(input?.limit ?? 200)),

  /** Whether mail can be sent, and whether the credentials actually work. */
  mailStatus: adminLimited.query(async () => {
    if (!emailConfigured()) {
      return {
        configured: false,
        ok: false,
        error: "Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_KEY and MAIL_FROM, then restart.",
        audienceSize: 0,
      };
    }
    const [check, audience] = await Promise.all([verifyMailer(), promotionalAudience()]);
    return { configured: true, ok: check.ok, error: check.error, audienceSize: audience.length };
  }),

  /** Campaigns, newest first. */
  listCampaigns: adminLimited.query(async () => {
    const rows = await getDb()
      .select()
      .from(emailCampaigns)
      .orderBy(desc(emailCampaigns.id))
      .limit(50);
    return rows;
  }),

  saveCampaign: adminLimited
    .input(
      z.object({
        id: z.number().optional(),
        subject: z.string().min(3).max(200),
        body: z.string().min(10).max(20_000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      if (input.id) {
        const [existing] = await db
          .select({ status: emailCampaigns.status })
          .from(emailCampaigns)
          .where(eq(emailCampaigns.id, input.id))
          .limit(1);
        if (!existing) throw userError("Campaign not found", "NOT_FOUND");
        // A sent campaign is a record of what went out; editing it would make that
        // record a lie.
        if (existing.status !== "draft") throw userError("That campaign has already been sent");

        await db
          .update(emailCampaigns)
          .set({ subject: input.subject, body: input.body })
          .where(eq(emailCampaigns.id, input.id));
        return { id: input.id };
      }

      const [row] = await db
        .insert(emailCampaigns)
        .values({ subject: input.subject, body: input.body, createdBy: ctx.user!.id })
        .$returningId();
      return { id: row.id };
    }),

  /** Send one copy to a chosen address. Always do this before a real send. */
  sendTestEmail: adminLimited
    .input(z.object({ to: z.string().email(), subject: z.string().min(1).max(200), body: z.string().min(1).max(20_000) }))
    .mutation(async ({ input }) => {
      const sent = await sendTransactional({
        to: { email: input.to },
        subject: `[test] ${input.subject}`,
        text: input.body,
      });
      if (!sent) throw userError("The test did not send. Check the mail status above.");
      return { ok: true as const };
    }),

  /**
   * Send a campaign to everyone who consented.
   *
   * Sequential with a small gap rather than all at once: a burst of hundreds of
   * messages is what makes a relay throttle you, and Brevo's free tier has a daily
   * cap worth respecting. Progress is written as it goes, so a send that dies
   * halfway is visible rather than mysterious.
   */
  sendCampaign: adminLimited
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [campaign] = await db
        .select()
        .from(emailCampaigns)
        .where(eq(emailCampaigns.id, input.id))
        .limit(1);
      if (!campaign) throw userError("Campaign not found", "NOT_FOUND");
      if (campaign.status !== "draft") throw userError("That campaign has already been sent");
      if (!emailConfigured()) throw userError("Mail is not configured yet");

      const audience = await promotionalAudience();
      if (audience.length === 0) {
        throw userError("Nobody has opted in to marketing email yet");
      }

      await db
        .update(emailCampaigns)
        .set({ status: "sending", recipientCount: audience.length, sentCount: 0, failedCount: 0 })
        .where(eq(emailCampaigns.id, campaign.id));

      log.info("Campaign send started", {
        adminId: ctx.user!.id,
        campaignId: campaign.id,
        recipients: audience.length,
      });

      // Deliberately not awaited into the response: a thousand recipients would
      // outlive the request. The row carries the progress.
      void (async () => {
        let sent = 0;
        let failed = 0;
        for (const person of audience) {
          const token = await ensureUnsubscribeToken(person.id);
          const ok = await sendPromotional(
            {
              to: { email: person.email, name: person.name },
              subject: campaign.subject,
              text: campaign.body,
            },
            `${publicBaseUrl()}/api/unsubscribe?token=${token}`
          );
          if (ok) sent += 1;
          else failed += 1;

          await db
            .update(emailCampaigns)
            .set({ sentCount: sent, failedCount: failed })
            .where(eq(emailCampaigns.id, campaign.id));

          // Gentle pacing. Brevo throttles bursts and the free tier has a daily cap.
          await new Promise((resolve) => setTimeout(resolve, 250));
        }

        await db
          .update(emailCampaigns)
          .set({ status: failed >= audience.length ? "failed" : "sent", sentAt: new Date() })
          .where(eq(emailCampaigns.id, campaign.id));

        log.info("Campaign send finished", { campaignId: campaign.id, sent, failed });
      })();

      return { started: true as const, recipients: audience.length };
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
