/**
 * Call every signed-in endpoint that takes a resource id, as the wrong user.
 *
 * Each one must refuse. This is the check that replaces reading the routers by hand:
 * an audit is worth what it was worth on the day it was done, and this can be run
 * before every release.
 *
 * Run it against a server that is up:
 *
 *   npx tsx scripts/ownership-probe.ts
 *
 * It needs two accounts and one project belonging to the first. Both are found in the
 * database; nothing is created and nothing is left changed.
 */

import "dotenv/config";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "../api/queries/connection";
import { projects, steps, users } from "../db/schema";
import { signSessionToken } from "../api/kimi/session";
import { ownershipSurface } from "../api/lib/routerScan";

const BASE = process.env.PROBE_BASE_URL ?? "http://localhost:3000";

/**
 * Extra required input per endpoint, beyond the id being probed.
 *
 * Only what the schema demands. A validation failure would be reported as a pass,
 * since the endpoint did refuse, but it would be refusing for the wrong reason and
 * would keep passing even if the ownership check were removed.
 */
const EXTRA_INPUT: Record<string, Record<string, unknown>> = {
  "project.update": { title: "probe" },
  "step.create": { order: 99, description: "probe scene description for the ownership probe" },
  "step.update": { description: "probe" },
  // Without these the schema rejects the call before the ownership check runs,
  // and the probe reports "inconclusive" rather than testing anything.
  "step.reorder": { stepIds: [1] },
  "step.applyFocus": {
    frames: [{ stepId: 1, highlights: [{ x: 10, y: 10, w: 10, h: 10, zoom: false }] }],
  },
  "team.setRole": { role: "member" },
  "team.setProjectShared": { shared: true },
  "support.replyToTicket": { message: "probe" },
  "ai.editScene": { instruction: "probe" },
  "render.regenerateStep": { projectId: 0 },
  // A `local:` key rather than a URL: `parseMediaRef` refuses anything else, and a
  // rejection there would be another refusal for the wrong reason.
  "ai.checkMediaSafety": { mediaUrl: "local:users/1/screenshots/probe.png" },
  "step.checkSafety": { mediaUrl: "local:users/1/screenshots/probe.png" },
  "ai.generateVoiceForStep": { voice: "en-US-AriaNeural", speed: 1 },
  "ai.generateAllVoices": { voice: "en-US-AriaNeural", speed: 1 },
};

/**
 * Endpoints excluded from the probe, each with a reason.
 *
 * Not a way to make the count look good: anything here is a decision to be argued
 * with, which is why the reason is required.
 */
const EXEMPT: Record<string, string> = {
  // Acts on a team membership, and the surface is covered by team.removeMember.
  "team.revokeInvite": "needs a real invite row in another team, covered by removeMember",
  /*
   * A stub that ignores its stepId and returns a fixed string, so there is nothing
   * about the other user's scene to leak.
   *
   * Remove this line the moment it is implemented: at that point it starts reading a
   * scene by id and becomes exactly the shape this script exists to catch.
   */
  "ai.analyzeScreenshot": "stub, ignores stepId and returns a constant. Un-exempt when implemented",
};

interface Probe {
  path: string;
  input: Record<string, unknown>;
}

function buildProbe(
  path: string,
  idFields: string[],
  victim: { projectId: number; stepId: number; userId: number }
): Probe {
  const input: Record<string, unknown> = { ...(EXTRA_INPUT[path] ?? {}) };
  for (const field of idFields) {
    if (field === "projectId" || field === "id") {
      // `id` on a step router means a step; elsewhere it means a project.
      input[field] = path.startsWith("step.") ? victim.stepId : victim.projectId;
    } else if (field === "stepId") input[field] = victim.stepId;
    else if (field === "userId") input[field] = victim.userId;
    else input[field] = 999_999_999; // ticketId, inviteId: a row that is not theirs
  }
  return { path, input };
}

/**
 * Call a procedure, trying both transports.
 *
 * tRPC queries are GET and mutations are POST, and using the wrong one returns 405
 * without the handler ever running. The first version of this script POSTed to
 * everything and recorded seven 405s as passes, which is precisely the false sense of
 * safety it exists to prevent. So POST first, and on a 405 try GET.
 */
async function call(path: string, input: Record<string, unknown>, token: string) {
  const headers = {
    "Content-Type": "application/json",
    Cookie: `kimi_sid=${token}`,
    Origin: BASE,
  };

  const post = await fetch(`${BASE}/api/trpc/${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ json: input }),
  });
  if (post.status !== 405) {
    return { status: post.status, body: (await post.text()).slice(0, 300), verb: "POST" };
  }

  const query = encodeURIComponent(JSON.stringify({ json: input }));
  const get = await fetch(`${BASE}/api/trpc/${path}?input=${query}`, { headers });
  return { status: get.status, body: (await get.text()).slice(0, 300), verb: "GET" };
}

async function main() {
  const db = getDb();

  // Two accounts that are not in the same team, so team sharing cannot make a pass
  // look like a leak or the reverse.
  const candidates = await db
    .select({ id: users.id, email: users.email, unionId: users.unionId })
    .from(users)
    .limit(20);

  const victim = candidates.find((u) => !!u.unionId);
  const attacker = candidates.find((u) => u.id !== victim?.id && !!u.unionId);
  if (!victim || !attacker) {
    console.log("Need two accounts with a session identity. Nothing probed.");
    process.exit(1);
  }

  const [victimProject] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.userId, victim.id), isNull(projects.teamId)))
    .orderBy(desc(projects.id))
    .limit(1);

  if (!victimProject) {
    console.log(`No personal project owned by ${victim.email}. Nothing probed.`);
    process.exit(1);
  }

  const [victimStep] = await db
    .select({ id: steps.id })
    .from(steps)
    .where(eq(steps.projectId, victimProject.id))
    .limit(1);

  // The attacker must not be in a team with the victim, or shared access is correct
  // behaviour and the probe would be measuring the wrong thing.
  const attackerToken = await signSessionToken({ unionId: attacker.unionId!, clientId: "web" });

  const target = {
    projectId: victimProject.id,
    stepId: victimStep?.id ?? 999_999_999,
    userId: victim.id,
  };

  console.log(`victim   ${victim.email} (user ${victim.id}, project ${target.projectId}, step ${target.stepId})`);
  console.log(`attacker ${attacker.email} (user ${attacker.id})`);
  console.log(`base     ${BASE}\n`);

  const surface = ownershipSurface().filter((p) => !(p.path in EXEMPT));
  const leaks: string[] = [];
  const suspicious: string[] = [];

  for (const proc of surface) {
    const probe = buildProbe(proc.path, proc.idFields, target);
    const { status, body, verb } = await call(probe.path, probe.input, attackerToken);

    /*
     * A 200 is not automatically a leak for a query that returns null.
     *
     * `project.getById` answers `{"result":{"data":{"json":null}}}` for something the
     * caller may not see, which is a correct refusal expressed as an empty result. A
     * 200 carrying actual data is the failure.
     */
    if (status === 200) {
      const emptyResult = /"json"\s*:\s*(null|\[\s*\])/.test(body);
      if (emptyResult) {
        console.log(`ok    ${proc.path.padEnd(28)} ${status} ${verb} (empty result)`);
        continue;
      }
      leaks.push(`${proc.path}: returned data for another user's resource (${verb})`);
      console.log(`LEAK  ${proc.path.padEnd(28)} 200 ${verb}`);
      continue;
    }

    if (status === 405) {
      suspicious.push(`${proc.path}: neither POST nor GET reached the handler`);
      console.log(`?     ${proc.path.padEnd(28)} 405 (not reached)`);
      continue;
    }

    // A validation error means the probe sent the wrong shape, so the endpoint
    // refused for a reason unrelated to ownership. That is a gap in this script, not
    // proof of safety, so it is reported separately.
    const inputError = /BAD_REQUEST|invalid_type|Required|too_small/i.test(body);
    if (inputError) {
      suspicious.push(`${proc.path}: refused on input validation, ownership not exercised`);
      console.log(`?     ${proc.path.padEnd(28)} ${status} ${verb} (input rejected, not an ownership test)`);
      continue;
    }

    console.log(`ok    ${proc.path.padEnd(28)} ${status} ${verb}`);
  }

  /**
   * The same call as the person it belongs to.
   *
   * Without this a server refusing everything reads as a perfect score. That is
   * not hypothetical: run against a port serving a different application, or
   * behind something that blocks the whole surface, every line above turns into
   * a confident `ok` and the summary says zero leaking. The refusals only mean
   * "not yours" if the identical request succeeds for the owner.
   */
  const controlRes = await fetch(`${BASE}/api/trpc/project.getById?input=${encodeURIComponent(
    JSON.stringify({ json: { id: victimProject.id } })
  )}`, {
    headers: { Cookie: `kimi_sid=${await signSessionToken({ unionId: victim.unionId!, clientId: "web" })}` },
  });
  const controlBody = await controlRes.text();
  // A 200 whose payload is an empty result would mean the owner cannot see their
  // own project either, which is the same failure wearing a success code.
  const controlOk = controlRes.status === 200 && controlBody.includes(`"id":${victimProject.id}`);

  console.log(
    `\ncontrol: the owner reading their own project -> ${controlRes.status} ` +
    (controlOk
      ? "(returns it, as it should)"
      : "(INCONCLUSIVE - every refusal above may be the whole surface being blocked, not the ownership checks)")
  );

  console.log(`\n${surface.length} probed, ${leaks.length} leaking, ${suspicious.length} inconclusive${controlOk ? "" : ", control failed"}`);
  for (const s of suspicious) console.log(`  inconclusive: ${s}`);
  for (const l of leaks) console.log(`  LEAK: ${l}`);

  if (Object.keys(EXEMPT).length) {
    console.log("\nexempt:");
    for (const [path, why] of Object.entries(EXEMPT)) console.log(`  ${path}: ${why}`);
  }

  process.exit(leaks.length > 0 || !controlOk ? 1 : 0);
}

void main();
