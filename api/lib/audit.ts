/**
 * A record of who did what.
 *
 * Sold as a Team feature, but it exists because of a security finding: admin
 * impersonation mints a session token as any user and left no trace, which makes it
 * the most valuable action in the application and the one nobody could review.
 *
 * Writes never throw. An audit log that can break the action it is recording is
 * worse than no audit log, because the first outage teaches everyone to remove it.
 */

import { desc, eq } from "drizzle-orm";
import { auditLogs } from "@db/schema";
import { getDb } from "../queries/connection";
import { createLogger } from "./logger";

const log = createLogger({ path: "audit" });

/**
 * Actions worth recording, named consistently so they can be filtered.
 *
 * Dotted and past tense throughout: the log describes what happened, not what
 * someone intended.
 */
export type AuditAction =
  | "team.created"
  | "team.renamed"
  | "team.deleted"
  | "team.brandkit.updated"
  | "team.seats.changed"
  | "member.invited"
  | "member.invite.revoked"
  | "member.joined"
  | "member.removed"
  | "member.role.changed"
  | "project.deleted"
  | "impersonation.started"
  | "impersonation.ended"
  | "credits.granted"
  | "settings.changed";

export interface AuditEntry {
  action: AuditAction;
  actorUserId?: number | null;
  /** Null for platform events such as impersonation, which belong to no team. */
  teamId?: number | null;
  targetType?: string | null;
  targetId?: string | number | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
}

export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await getDb()
      .insert(auditLogs)
      .values({
        action: entry.action,
        actorUserId: entry.actorUserId ?? null,
        teamId: entry.teamId ?? null,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId === undefined || entry.targetId === null ? null : String(entry.targetId),
        metadata: entry.metadata ?? null,
        ip: entry.ip ?? null,
      });
  } catch (err) {
    // Also written to the ordinary log, so the event is not lost entirely when the
    // table is unavailable.
    log.warn("Could not write an audit entry", {
      action: entry.action,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/** A team's own history, for the Team settings screen. */
export async function auditForTeam(teamId: number, limit = 100) {
  return getDb()
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.teamId, teamId))
    .orderBy(desc(auditLogs.id))
    .limit(limit);
}

/** Everything, for the admin dashboard. */
export async function auditRecent(limit = 200) {
  return getDb().select().from(auditLogs).orderBy(desc(auditLogs.id)).limit(limit);
}
