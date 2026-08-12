/**
 * Teams: membership, seats, and who may see which project.
 *
 * The important thing in this file is `projectAccessWhere`. Before teams, every
 * project query was scoped with `eq(projects.userId, ctx.user.id)`, and that single
 * condition was the whole authorisation model. Sharing projects across a team means
 * widening it to "mine, or my team's", and widening an authorisation rule in twenty
 * scattered places is how a data leak between customers happens.
 *
 * So it is widened exactly once, here, and every call site asks this function.
 * `isStorableMediaRef` earned its keep the same way.
 */

import { and, eq, or, isNull } from "drizzle-orm";
import { projects, teamMembers, teams } from "@db/schema";
import { getDb } from "../queries/connection";

export type TeamRole = "owner" | "admin" | "member";

export interface TeamContext {
  teamId: number;
  role: TeamRole;
  /** The team's plan, which overrides the member's own. */
  plan: "team";
  name: string;
  seatsTotal: number;
  seatsUsed: number;
}

/**
 * The team a user belongs to, if any.
 *
 * A user is in at most one team, which is enforced by a unique constraint on
 * `team_members.userId` rather than by hoping the code never inserts twice.
 */
export async function teamForUser(userId: number): Promise<TeamContext | null> {
  const db = getDb();
  const [row] = await db
    .select({
      teamId: teams.id,
      name: teams.name,
      role: teamMembers.role,
      seatsIncluded: teams.seatsIncluded,
      seatsPurchased: teams.seatsPurchased,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(teamMembers.userId, userId))
    .limit(1);

  if (!row) return null;

  const used = await countMembers(row.teamId);

  return {
    teamId: row.teamId,
    role: row.role,
    // Being in a team is what grants the team plan. That single line is why every
    // existing plan gate, 4K, retention, queue priority, already works for members
    // without being touched.
    plan: "team",
    name: row.name,
    seatsTotal: row.seatsIncluded + row.seatsPurchased,
    seatsUsed: used,
  };
}

export async function countMembers(teamId: number): Promise<number> {
  const rows = await getDb()
    .select({ userId: teamMembers.userId })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));
  return rows.length;
}

/**
 * The one authorisation rule for reading a project.
 *
 * Without a team: exactly the old behaviour, projects you created.
 * With a team: projects you created, plus every project shared with your team.
 *
 * A personal project made before joining a team stays personal, because its
 * `teamId` is null and only the creator matches.
 */
export function projectAccessWhere(user: { id: number; teamId?: number | null }) {
  if (!user.teamId) return eq(projects.userId, user.id);
  return or(eq(projects.userId, user.id), eq(projects.teamId, user.teamId))!;
}

/**
 * Stricter rule for destructive actions.
 *
 * Deleting a colleague's project is not something an ordinary member should be able
 * to do by accident, so removal stays with the creator, the team's admins and its
 * owner. Editing is shared; deleting is not.
 */
export function projectDeleteWhere(user: {
  id: number;
  teamId?: number | null;
  teamRole?: TeamRole | null;
}) {
  const privileged = user.teamRole === "owner" || user.teamRole === "admin";
  if (!user.teamId || !privileged) return eq(projects.userId, user.id);
  return or(eq(projects.userId, user.id), eq(projects.teamId, user.teamId))!;
}

/** Projects that belong to nobody's team, for reporting. */
export function personalProjectsWhere(userId: number) {
  return and(eq(projects.userId, userId), isNull(projects.teamId))!;
}

export interface SeatState {
  total: number;
  used: number;
  /** Pending invitations count against seats, or a team can oversubscribe. */
  pending: number;
  available: number;
}

/**
 * Whether there is room for one more person.
 *
 * Pending invites count. Otherwise a three-seat team can invite ten people, they
 * all accept, and the seat limit was decoration.
 */
export function seatsAvailable(state: { total: number; used: number; pending: number }): SeatState {
  const available = Math.max(0, state.total - state.used - state.pending);
  return { ...state, available };
}

/** What extra seats cost, so the number is in one place. */
export const SEAT_PRICE_USD = 19;

export function seatCostUsd(extraSeats: number): number {
  return Math.max(0, Math.floor(extraSeats)) * SEAT_PRICE_USD;
}

/** Whether a role may change the team: invite, remove, rename, edit the brand kit. */
export function canManageTeam(role: TeamRole | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

/** Whether a role may do the things only the person paying should: seats, deletion. */
export function canManageBilling(role: TeamRole | null | undefined): boolean {
  return role === "owner";
}
