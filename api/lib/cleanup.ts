import { getDb } from "../queries/connection";
import { projects, steps, users } from "@db/schema";
import { eq, and, isNotNull, lt, gt, count } from "drizzle-orm";
import { deleteFromR2 } from "./r2";
import { createLogger } from "./logger";

const log = createLogger({ path: "cleanup" });

/**
 * Find all completed projects that have expired (free tier, 7 days old).
 */
export async function findExpiredProjects() {
  const now = new Date();
  return getDb()
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.status, "complete"),
        isNotNull(projects.expiresAt),
        lt(projects.expiresAt, now)
      )
    );
}

/**
 * Find all projects pending expiry (for admin dashboard).
 */
export async function findPendingExpiryProjects() {
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return getDb()
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.status, "complete"),
        isNotNull(projects.expiresAt),
        lt(projects.expiresAt, sevenDaysFromNow),
        gt(projects.expiresAt, now)
      )
    );
}

/**
 * Delete all files associated with a project from UploadThing.
 */
export async function deleteProjectFiles(projectId: number) {
  const projectSteps = await getDb()
    .select()
    .from(steps)
    .where(eq(steps.projectId, projectId));

  for (const step of projectSteps) {
    if (step.screenshotPath) {
      await deleteFromR2(step.screenshotPath).catch((e) => log.warn(`Failed to delete screenshot ${step.screenshotPath}`, { error: e instanceof Error ? e.message : String(e) }));
    }
    if (step.audioPath) {
      await deleteFromR2(step.audioPath).catch((e) => log.warn(`Failed to delete audio ${step.audioPath}`, { error: e instanceof Error ? e.message : String(e) }));
    }
    if (step.videoSegmentPath) {
      await deleteFromR2(step.videoSegmentPath).catch((e) => log.warn(`Failed to delete video segment ${step.videoSegmentPath}`, { error: e instanceof Error ? e.message : String(e) }));
    }
  }

  const [project] = await getDb()
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (project?.finalVideoPath) {
    await deleteFromR2(project.finalVideoPath).catch((e) => log.warn(`Failed to delete final video ${project.finalVideoPath}`, { error: e instanceof Error ? e.message : String(e) }));
  }
}

/**
 * Purge project data: clear file paths in DB but keep metadata.
 */
export async function purgeProjectData(projectId: number) {
  // Clear step file paths
  await getDb()
    .update(steps)
    .set({
      screenshotPath: null,
      audioPath: null,
      audioDuration: null,
      videoSegmentPath: null,
    })
    .where(eq(steps.projectId, projectId));

  // Clear project file path
  await getDb()
    .update(projects)
    .set({
      finalVideoPath: null,
      expiresAt: null,
    })
    .where(eq(projects.id, projectId));
}

/**
 * Reset monthly video counters for users whose reset date is > 30 days ago.
 */
export async function resetMonthlyCounters() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  await getDb()
    .update(users)
    .set({
      videosCreatedThisMonth: 0,
      monthlyResetAt: new Date(),
    })
    .where(lt(users.monthlyResetAt, thirtyDaysAgo));
}

/**
 * Main cleanup orchestrator.
 */
export async function cleanupExpiredProjects(): Promise<number> {
  const expired = await findExpiredProjects();
  let cleaned = 0;

  for (const project of expired) {
    try {
      log.info(`Purging project #${project.id} (expired ${project.expiresAt})`);
      await deleteProjectFiles(project.id);
      await purgeProjectData(project.id);
      cleaned++;
    } catch (err) {
      log.error(`Failed to purge project #${project.id}`, err);
    }
  }

  // Also reset monthly counters (wrapped so a failure doesn't lose the cleaned count)
  try {
    await resetMonthlyCounters();
  } catch (err) {
    log.error("Failed to reset monthly counters", err);
  }

  return cleaned;
}

/**
 * Estimate total storage usage by counting projects with file paths.
 * Returns approximate storage stats for the admin dashboard.
 *
 * Note: This is an estimate based on DB records, not actual R2/B2 bucket size.
 * For precise usage, use the B2 API or R2 dashboard.
 */
export async function getStorageStats(): Promise<{
  totalProjectsWithFiles: number;
  totalStepsWithFiles: number;
  expiredPending: number;
  expiredOverdue: number;
  estimatedFiles: number;
}> {
  const db = getDb();

  // Count projects with final video paths
  const [projectCount] = await db
    .select({ value: count() })
    .from(projects)
    .where(isNotNull(projects.finalVideoPath));

  // Count steps with any file path
  const [stepCount] = await db
    .select({ value: count() })
    .from(steps)
    .where(isNotNull(steps.screenshotPath));

  const expired = await findExpiredProjects();
  const pending = await findPendingExpiryProjects();

  // Each project has: 1 final video + N steps × (1 screenshot + 1 audio + 1 segment) = 1 + 3N
  const estimatedFiles = (projectCount?.value ?? 0) + (stepCount?.value ?? 0) * 3;

  return {
    totalProjectsWithFiles: projectCount?.value ?? 0,
    totalStepsWithFiles: stepCount?.value ?? 0,
    expiredPending: pending.length,
    expiredOverdue: expired.length,
    estimatedFiles,
  };
}
