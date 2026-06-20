import { getDb } from "../queries/connection";
import { projects, steps, users } from "@db/schema";
import { eq, and, isNotNull, lt, gt } from "drizzle-orm";
import { deleteFromR2 } from "./r2";

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
      await deleteFromR2(step.screenshotPath).catch((e) => console.warn(`[cleanup] Failed to delete screenshot ${step.screenshotPath}:`, e instanceof Error ? e.message : e));
    }
    if (step.audioPath) {
      await deleteFromR2(step.audioPath).catch((e) => console.warn(`[cleanup] Failed to delete audio ${step.audioPath}:`, e instanceof Error ? e.message : e));
    }
    if (step.videoSegmentPath) {
      await deleteFromR2(step.videoSegmentPath).catch((e) => console.warn(`[cleanup] Failed to delete video segment ${step.videoSegmentPath}:`, e instanceof Error ? e.message : e));
    }
  }

  const [project] = await getDb()
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (project?.finalVideoPath) {
    await deleteFromR2(project.finalVideoPath).catch((e) => console.warn(`[cleanup] Failed to delete final video ${project.finalVideoPath}:`, e instanceof Error ? e.message : e));
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
      console.log(`[Cleanup] Purging project #${project.id} (expired ${project.expiresAt})`);
      await deleteProjectFiles(project.id);
      await purgeProjectData(project.id);
      cleaned++;
    } catch (err) {
      console.error(`[Cleanup] Failed to purge project #${project.id}:`, err instanceof Error ? err.message : err);
    }
  }

  // Also reset monthly counters (wrapped so a failure doesn't lose the cleaned count)
  try {
    await resetMonthlyCounters();
  } catch (err) {
    console.error("[Cleanup] Failed to reset monthly counters:", err instanceof Error ? err.message : err);
  }

  return cleaned;
}
