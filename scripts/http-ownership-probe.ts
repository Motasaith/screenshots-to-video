/**
 * Call the raw HTTP routes as the wrong user. Each one must refuse.
 *
 * The companion to scripts/ownership-probe.ts, which only speaks tRPC. The
 * routes in api/boot.ts serve files and mint URLs, take a key or an id
 * belonging to somebody, and were covered by nothing: `/api/signed-url`
 * authenticated the caller and then signed whatever key it was handed, for
 * anybody, and no test noticed for as long as it existed.
 *
 * Run it against a server that is up:
 *
 *   npx tsx scripts/http-ownership-probe.ts
 *
 * It needs two accounts and one project belonging to the first, both found in
 * the database. Reads only: nothing is created and nothing is left changed.
 */

import "dotenv/config";
import { desc, eq, ne } from "drizzle-orm";
import { getDb } from "../api/queries/connection";
import { projects, steps, users } from "../db/schema";
import { signSessionToken } from "../api/kimi/session";

const BASE = process.env.PROBE_BASE_URL ?? "http://localhost:3000";

const db = getDb();

const [victim] = await db.select().from(users).orderBy(users.id).limit(1);
const [attacker] = await db
  .select()
  .from(users)
  .where(ne(users.id, victim.id))
  .orderBy(users.id)
  .limit(1);

if (!victim || !attacker) {
  console.error("Need two accounts in the database to probe with.");
  process.exit(1);
}

const [victimProject] = await db
  .select()
  .from(projects)
  .where(eq(projects.userId, victim.id))
  .orderBy(desc(projects.id))
  .limit(1);

const [victimStep] = victimProject
  ? await db
    .select()
    .from(steps)
    .where(eq(steps.projectId, victimProject.id))
    .orderBy(desc(steps.id))
    .limit(1)
  : [];

if (!victimStep?.screenshotPath) {
  console.error("The first account needs a project with an uploaded screenshot.");
  process.exit(1);
}

const key = victimStep.screenshotPath.split("#")[0];

console.log(`victim   ${victim.email} (user ${victim.id})`);
console.log(`attacker ${attacker.email} (user ${attacker.id})`);
console.log(`target   step ${victimStep.id}, key ${key}`);
console.log(`base     ${BASE}\n`);

const asAttacker = `${(await import("../contracts/constants")).Session.cookieName}=${await signSessionToken(
  { unionId: attacker.unionId!, clientId: "web" }
)}`;
const asVictim = `${(await import("../contracts/constants")).Session.cookieName}=${await signSessionToken(
  { unionId: victim.unionId!, clientId: "web" }
)}`;

const cases: Array<{ name: string; url: string; why: string }> = [
  {
    name: "/api/file",
    url: `/api/file?key=${encodeURIComponent(key)}`,
    why: "serves another user's screenshot",
  },
  {
    name: "/api/thumb",
    url: `/api/thumb?stepId=${victimStep.id}&w=192`,
    why: "renders a thumbnail of another user's screenshot",
  },
  {
    name: "/api/signed-url",
    url: `/api/signed-url?key=${encodeURIComponent(key)}`,
    why: "mints a download URL for another user's key",
  },
  // Traversal. `resolveLocalPath` should refuse anything leaving the store, but
  // a probe that only tried valid keys would never notice if it stopped.
  {
    name: "/api/file (traversal)",
    url: `/api/file?key=${encodeURIComponent("local:../../.env")}`,
    why: "reads a file outside the storage root",
  },
  {
    name: "/api/file (absolute)",
    url: `/api/file?key=${encodeURIComponent("local:/etc/passwd")}`,
    why: "reads an absolute path",
  },
];

let leaking = 0;
for (const t of cases) {
  const res = await fetch(BASE + t.url, { headers: { cookie: asAttacker } });
  const leaked = res.status === 200;
  if (leaked) leaking++;
  console.log(
    `${leaked ? "LEAK" : "ok  "}  ${t.name.padEnd(24)} ${res.status}` +
    (leaked ? `  <- ${t.why}` : "")
  );
}

/**
 * The same key as its owner.
 *
 * Without this, a server that refused everything - or a key whose file is not
 * on this machine - would look like a clean run. A refusal only means something
 * if the same request succeeds for the person it belongs to.
 */
const control = await fetch(`${BASE}/api/file?key=${encodeURIComponent(key)}`, {
  headers: { cookie: asVictim },
});
const controlOk = control.status === 200;
console.log(
  `\ncontrol: the owner fetching the same key -> ${control.status} ` +
  (controlOk
    ? "(serves, as it should)"
    : "(INCONCLUSIVE - the refusals above may just be a missing file, not the ownership check)")
);

console.log(`\n${cases.length} probed, ${leaking} leaking${controlOk ? "" : ", control failed"}`);
process.exit(leaking > 0 || !controlOk ? 1 : 0);
