/**
 * Team accounts: create one, invite people, manage seats and the brand kit.
 *
 * Two rules run through everything here.
 *
 * A user belongs to at most one team, enforced by a unique constraint on
 * `team_members.userId`, so joining while already in a team is refused rather than
 * silently making the second membership win.
 *
 * Pending invitations occupy seats. Otherwise a three-seat team invites ten people,
 * they all accept, and the limit was decoration.
 */

import { z } from "zod";
import { and, eq, gt, isNull } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { createRouter, authedQuery, rateLimitByUser, userError } from "./middleware";
import { getDb } from "./queries/connection";
import { projects, teamInvites, teamMembers, teams, users } from "@db/schema";
import { recordAudit, auditForTeam } from "./lib/audit";
import {
  canManageBilling,
  canManageTeam,
  countMembers,
  seatCostUsd,
  seatsAvailable,
} from "./lib/teams";
import { publicBaseUrl } from "./lib/mailIdentity";
import { emailConfigured, sendTransactional } from "./lib/mailer";
import { getSettings } from "./lib/appSettings";
import { createLogger } from "./lib/logger";

const log = createLogger({ path: "teams" });

/** Invitations expire, so an abandoned one stops holding a seat forever. */
const INVITE_TTL_DAYS = 14;

async function pendingInviteCount(teamId: number): Promise<number> {
  const rows = await getDb()
    .select({ id: teamInvites.id })
    .from(teamInvites)
    .where(
      and(
        eq(teamInvites.teamId, teamId),
        isNull(teamInvites.acceptedAt),
        gt(teamInvites.expiresAt, new Date())
      )
    );
  return rows.length;
}

/** The caller's team and role, or an error saying they have none. */
async function requireTeam(user: { teamId: number | null; teamRole: string | null }) {
  if (!user.teamId) throw userError("You are not in a team yet", "NOT_FOUND");
  return { teamId: user.teamId, role: user.teamRole as "owner" | "admin" | "member" };
}

export const teamRouter = createRouter({
  /**
   * The caller's team, with members, seats and pending invitations.
   *
   * Returns null rather than erroring for someone with no team: the screen that
   * calls this needs to render an invitation to create one.
   */
  mine: authedQuery.use(rateLimitByUser(60_000, 60)).query(async ({ ctx }) => {
    if (!ctx.user!.teamId) return null;

    const db = getDb();
    const teamId = ctx.user!.teamId;

    const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!team) return null;

    const members = await db
      .select({
        userId: teamMembers.userId,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId));

    const invites = await db
      .select({
        id: teamInvites.id,
        email: teamInvites.email,
        role: teamInvites.role,
        expiresAt: teamInvites.expiresAt,
        createdAt: teamInvites.createdAt,
      })
      .from(teamInvites)
      .where(
        and(
          eq(teamInvites.teamId, teamId),
          isNull(teamInvites.acceptedAt),
          gt(teamInvites.expiresAt, new Date())
        )
      );

    const seats = seatsAvailable({
      total: team.seatsIncluded + team.seatsPurchased,
      used: members.length,
      pending: invites.length,
    });

    return {
      team: {
        id: team.id,
        name: team.name,
        ownerUserId: team.ownerUserId,
        seatsIncluded: team.seatsIncluded,
        seatsPurchased: team.seatsPurchased,
        brandKit: team.brandKit ?? null,
      },
      role: ctx.user!.teamRole,
      members,
      invites,
      seats,
      seatPriceUsd: seatCostUsd(1),
      canManage: canManageTeam(ctx.user!.teamRole),
      canBill: canManageBilling(ctx.user!.teamRole),
    };
  }),

  /**
   * Start a team. The creator becomes its owner and only member.
   *
   * Their existing personal projects are deliberately left personal. Moving a
   * person's entire back catalogue into a shared library the moment they create a
   * team would expose work they never chose to share.
   */
  create: authedQuery
    .use(rateLimitByUser(3_600_000, 5))
    .input(z.object({ name: z.string().min(2).max(120) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user!.teamId) throw userError("You are already in a team");

      const db = getDb();
      const settings = await getSettings();

      const [created] = await db
        .insert(teams)
        .values({
          name: input.name.trim(),
          ownerUserId: ctx.user!.id,
          // Seats included with the plan, kept in settings so the number can change
          // without a deploy.
          seatsIncluded: Math.max(1, Math.floor(settings.teamSeatsIncluded)),
        })
        .$returningId();

      await db.insert(teamMembers).values({
        teamId: created.id,
        userId: ctx.user!.id,
        role: "owner",
      });

      await recordAudit({
        action: "team.created",
        actorUserId: ctx.user!.id,
        teamId: created.id,
        targetType: "team",
        targetId: created.id,
        metadata: { name: input.name.trim() },
        ip: ctx.ip,
      });

      log.info("Team created", { teamId: created.id, ownerUserId: ctx.user!.id });
      return { teamId: created.id };
    }),

  rename: authedQuery
    .input(z.object({ name: z.string().min(2).max(120) }))
    .mutation(async ({ ctx, input }) => {
      const { teamId, role } = await requireTeam(ctx.user!);
      if (!canManageTeam(role)) throw userError("Only a team admin can rename the team", "FORBIDDEN");

      await getDb().update(teams).set({ name: input.name.trim() }).where(eq(teams.id, teamId));
      await recordAudit({
        action: "team.renamed",
        actorUserId: ctx.user!.id,
        teamId,
        metadata: { name: input.name.trim() },
        ip: ctx.ip,
      });
      return { ok: true as const };
    }),

  /**
   * Invite someone by email.
   *
   * Refused when the seats are full, counting pending invitations, and refused for
   * someone already in a team, because a person can only be in one.
   */
  invite: authedQuery
    .use(rateLimitByUser(3_600_000, 30))
    .input(
      z.object({
        email: z.string().email().max(320),
        role: z.enum(["admin", "member"]).default("member"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { teamId, role } = await requireTeam(ctx.user!);
      if (!canManageTeam(role)) throw userError("Only a team admin can invite people", "FORBIDDEN");

      const db = getDb();
      const email = input.email.trim().toLowerCase();

      const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
      if (!team) throw userError("Team not found", "NOT_FOUND");

      const seats = seatsAvailable({
        total: team.seatsIncluded + team.seatsPurchased,
        used: await countMembers(teamId),
        pending: await pendingInviteCount(teamId),
      });
      if (seats.available <= 0) {
        throw userError(
          `All ${seats.total} seats are taken, counting invitations that have not been accepted. Buy another seat to invite someone else.`
        );
      }

      // Already a member of some team, including this one.
      const [existingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (existingUser) {
        const [existingMembership] = await db
          .select({ teamId: teamMembers.teamId })
          .from(teamMembers)
          .where(eq(teamMembers.userId, existingUser.id))
          .limit(1);
        if (existingMembership) {
          throw userError(
            existingMembership.teamId === teamId
              ? "They are already in this team"
              : "That person is already in another team"
          );
        }
      }

      // Replace any earlier invitation for the same address rather than stacking
      // them up, each holding a seat.
      await db
        .delete(teamInvites)
        .where(and(eq(teamInvites.teamId, teamId), eq(teamInvites.email, email), isNull(teamInvites.acceptedAt)));

      const token = randomBytes(24).toString("base64url");
      await db.insert(teamInvites).values({
        teamId,
        email,
        role: input.role,
        token,
        invitedBy: ctx.user!.id,
        expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
      });

      const link = `${publicBaseUrl()}/join?token=${token}`;

      if (emailConfigured()) {
        await sendTransactional({
          to: { email },
          subject: `${ctx.user!.name ?? "Someone"} invited you to ${team.name} on AIVideo`,
          text: [
            `${ctx.user!.name ?? "A colleague"} has invited you to join ${team.name} on AIVideo.`,
            ``,
            `AIVideo turns screenshots into narrated tutorial videos. Joining gives you the team's plan and access to its shared projects.`,
            ``,
            `Accept the invitation:`,
            link,
            ``,
            `The link works for ${INVITE_TTL_DAYS} days. If you were not expecting this, you can ignore it.`,
          ].join("\n"),
        });
      }

      await recordAudit({
        action: "member.invited",
        actorUserId: ctx.user!.id,
        teamId,
        targetType: "email",
        targetId: email,
        metadata: { role: input.role, emailed: emailConfigured() },
        ip: ctx.ip,
      });

      return {
        ok: true as const,
        // Returned so the inviter can pass it on by hand when mail is not set up.
        link,
        emailed: emailConfigured(),
        seatsLeft: seats.available - 1,
      };
    }),

  revokeInvite: authedQuery
    .input(z.object({ inviteId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { teamId, role } = await requireTeam(ctx.user!);
      if (!canManageTeam(role)) throw userError("Only a team admin can do that", "FORBIDDEN");

      const db = getDb();
      const [invite] = await db
        .select({ id: teamInvites.id, email: teamInvites.email })
        .from(teamInvites)
        .where(and(eq(teamInvites.id, input.inviteId), eq(teamInvites.teamId, teamId)))
        .limit(1);
      if (!invite) throw userError("Invitation not found", "NOT_FOUND");

      await db.delete(teamInvites).where(eq(teamInvites.id, invite.id));
      await recordAudit({
        action: "member.invite.revoked",
        actorUserId: ctx.user!.id,
        teamId,
        targetType: "email",
        targetId: invite.email,
        ip: ctx.ip,
      });
      return { ok: true as const };
    }),

  /**
   * What an invitation is for, before signing in.
   *
   * Public information only: the team's name and who invited them. Enough to decide
   * whether to accept, and nothing that would make a guessed token worth having.
   */
  inviteDetails: authedQuery
    .input(z.object({ token: z.string().min(10).max(64) }))
    .query(async ({ input }) => {
      const db = getDb();
      const [invite] = await db
        .select({
          email: teamInvites.email,
          role: teamInvites.role,
          expiresAt: teamInvites.expiresAt,
          acceptedAt: teamInvites.acceptedAt,
          teamName: teams.name,
        })
        .from(teamInvites)
        .innerJoin(teams, eq(teamInvites.teamId, teams.id))
        .where(eq(teamInvites.token, input.token))
        .limit(1);

      if (!invite) return { valid: false as const, reason: "That invitation link is not valid." };
      if (invite.acceptedAt) return { valid: false as const, reason: "That invitation has already been used." };
      if (invite.expiresAt < new Date()) return { valid: false as const, reason: "That invitation has expired." };

      return {
        valid: true as const,
        teamName: invite.teamName,
        role: invite.role,
        email: invite.email,
      };
    }),

  /**
   * Accept an invitation.
   *
   * The signed-in account's email must match the one invited. Without that check a
   * leaked link lets anybody into the team, and the seat is charged to the team that
   * never invited them.
   */
  acceptInvite: authedQuery
    .use(rateLimitByUser(3_600_000, 20))
    .input(z.object({ token: z.string().min(10).max(64) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user!.teamId) throw userError("You are already in a team");

      const db = getDb();
      const [invite] = await db
        .select()
        .from(teamInvites)
        .where(eq(teamInvites.token, input.token))
        .limit(1);

      if (!invite) throw userError("That invitation link is not valid", "NOT_FOUND");
      if (invite.acceptedAt) throw userError("That invitation has already been used");
      if (invite.expiresAt < new Date()) throw userError("That invitation has expired");

      const callerEmail = (ctx.user!.email ?? "").toLowerCase();
      if (!callerEmail || callerEmail !== invite.email.toLowerCase()) {
        throw userError(
          `That invitation was sent to ${invite.email}. Sign in with that address to accept it.`,
          "FORBIDDEN"
        );
      }

      // The seat check runs again here, not only at invite time: seats may have been
      // filled by other acceptances in between.
      const [team] = await db.select().from(teams).where(eq(teams.id, invite.teamId)).limit(1);
      if (!team) throw userError("That team no longer exists", "NOT_FOUND");

      const used = await countMembers(invite.teamId);
      if (used >= team.seatsIncluded + team.seatsPurchased) {
        throw userError("That team has no seats left. Ask them to buy another and invite you again.");
      }

      await db.insert(teamMembers).values({
        teamId: invite.teamId,
        userId: ctx.user!.id,
        role: invite.role,
      });
      await db.update(teamInvites).set({ acceptedAt: new Date() }).where(eq(teamInvites.id, invite.id));

      await recordAudit({
        action: "member.joined",
        actorUserId: ctx.user!.id,
        teamId: invite.teamId,
        targetType: "user",
        targetId: ctx.user!.id,
        metadata: { role: invite.role },
        ip: ctx.ip,
      });

      log.info("Member joined a team", { teamId: invite.teamId, userId: ctx.user!.id });
      return { teamId: invite.teamId, teamName: team.name };
    }),

  /**
   * Remove someone, or leave yourself.
   *
   * The owner cannot be removed and cannot leave: a team with no billing owner is a
   * subscription nobody is paying for. Transferring ownership comes first.
   *
   * Their projects stay with the team. Work paid for by the team belongs to it, and
   * a departing colleague taking the shared library with them is not what anybody
   * expects.
   */
  removeMember: authedQuery
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { teamId, role } = await requireTeam(ctx.user!);
      const removingSelf = input.userId === ctx.user!.id;

      if (!removingSelf && !canManageTeam(role)) {
        throw userError("Only a team admin can remove people", "FORBIDDEN");
      }

      const db = getDb();
      const [team] = await db.select({ ownerUserId: teams.ownerUserId }).from(teams).where(eq(teams.id, teamId)).limit(1);
      if (team?.ownerUserId === input.userId) {
        throw userError(
          removingSelf
            ? "You own this team, so you cannot leave it. Transfer ownership first, or delete the team."
            : "The team owner cannot be removed. Transfer ownership first."
        );
      }

      const [membership] = await db
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, input.userId)))
        .limit(1);
      if (!membership) throw userError("They are not in this team", "NOT_FOUND");

      await db.delete(teamMembers).where(eq(teamMembers.id, membership.id));

      await recordAudit({
        action: "member.removed",
        actorUserId: ctx.user!.id,
        teamId,
        targetType: "user",
        targetId: input.userId,
        metadata: { self: removingSelf },
        ip: ctx.ip,
      });

      return { ok: true as const };
    }),

  setRole: authedQuery
    .input(z.object({ userId: z.number(), role: z.enum(["admin", "member"]) }))
    .mutation(async ({ ctx, input }) => {
      const { teamId, role } = await requireTeam(ctx.user!);
      if (!canManageBilling(role)) throw userError("Only the team owner can change roles", "FORBIDDEN");

      const db = getDb();
      const [team] = await db.select({ ownerUserId: teams.ownerUserId }).from(teams).where(eq(teams.id, teamId)).limit(1);
      if (team?.ownerUserId === input.userId) throw userError("The owner's role cannot be changed");

      await db
        .update(teamMembers)
        .set({ role: input.role })
        .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, input.userId)));

      await recordAudit({
        action: "member.role.changed",
        actorUserId: ctx.user!.id,
        teamId,
        targetType: "user",
        targetId: input.userId,
        metadata: { role: input.role },
        ip: ctx.ip,
      });
      return { ok: true as const };
    }),

  /**
   * Change how many seats the team has bought.
   *
   * Recorded, not charged: there is no payment provider wired up yet, so this is the
   * number an admin sets after taking payment. The audit entry is what makes that
   * defensible later.
   *
   * Reducing below the number of people in the team is refused rather than silently
   * locking somebody out.
   */
  setPurchasedSeats: authedQuery
    .input(z.object({ seatsPurchased: z.number().int().min(0).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const { teamId, role } = await requireTeam(ctx.user!);
      if (!canManageBilling(role)) throw userError("Only the team owner can change seats", "FORBIDDEN");

      const db = getDb();
      const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
      if (!team) throw userError("Team not found", "NOT_FOUND");

      const used = await countMembers(teamId);
      const newTotal = team.seatsIncluded + input.seatsPurchased;
      if (newTotal < used) {
        throw userError(
          `There are ${used} people in the team, so you cannot go below ${used} seats. Remove someone first.`
        );
      }

      await db.update(teams).set({ seatsPurchased: input.seatsPurchased }).where(eq(teams.id, teamId));

      await recordAudit({
        action: "team.seats.changed",
        actorUserId: ctx.user!.id,
        teamId,
        metadata: {
          from: team.seatsPurchased,
          to: input.seatsPurchased,
          monthlyCostUsd: seatCostUsd(input.seatsPurchased),
        },
        ip: ctx.ip,
      });

      return {
        seatsTotal: newTotal,
        extraMonthlyCostUsd: seatCostUsd(input.seatsPurchased),
      };
    }),

  /** Logo, colours and intro/outro text applied to this team's videos. */
  setBrandKit: authedQuery
    .input(
      z.object({
        logoKey: z.string().max(500).nullable().optional(),
        primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
        accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
        introText: z.string().max(120).nullable().optional(),
        outroText: z.string().max(120).nullable().optional(),
        watermarkText: z.string().max(60).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { teamId, role } = await requireTeam(ctx.user!);
      if (!canManageTeam(role)) throw userError("Only a team admin can change the brand kit", "FORBIDDEN");

      const db = getDb();
      const [team] = await db.select({ brandKit: teams.brandKit }).from(teams).where(eq(teams.id, teamId)).limit(1);

      const merged = { ...(team?.brandKit ?? {}), ...input };
      await db.update(teams).set({ brandKit: merged }).where(eq(teams.id, teamId));

      await recordAudit({
        action: "team.brandkit.updated",
        actorUserId: ctx.user!.id,
        teamId,
        metadata: { fields: Object.keys(input) },
        ip: ctx.ip,
      });

      return { brandKit: merged };
    }),

  /**
   * Share a personal project with the team, or take it back.
   *
   * Only the creator may do either. Sharing is a decision about your own work, and
   * an admin pulling a colleague's private project into the shared library is not
   * theirs to make.
   */
  setProjectShared: authedQuery
    .input(z.object({ projectId: z.number(), shared: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { teamId } = await requireTeam(ctx.user!);
      const db = getDb();

      const [project] = await db
        .select({ id: projects.id, userId: projects.userId })
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user!.id)))
        .limit(1);
      if (!project) throw userError("Project not found", "NOT_FOUND");

      await db
        .update(projects)
        .set({ teamId: input.shared ? teamId : null })
        .where(eq(projects.id, project.id));

      return { shared: input.shared };
    }),

  /** This team's history. The Team feature you can sell, and the audit trail. */
  activity: authedQuery.use(rateLimitByUser(60_000, 30)).query(async ({ ctx }) => {
    const { teamId } = await requireTeam(ctx.user!);
    return auditForTeam(teamId, 100);
  }),
});
