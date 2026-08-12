/**
 * Reading the routers' source to find endpoints that take an id.
 *
 * Every one of those is a place where forgetting to scope a query by owner lets one
 * customer read or change another's data. The audit that found none of them was a
 * manual read, which is worth exactly as much as the day it was done.
 *
 * Source analysis rather than importing the router, because importing it pulls in
 * ffmpeg, the TTS engines and the database layer, which is far too heavy for a test
 * that only needs to know which procedures exist and what they accept.
 */

import fs from "node:fs";
import path from "node:path";

/** Field names that identify a resource, so a wrong one must be refused. */
const ID_FIELD =
  /\b(id|projectId|stepId|jobId|ticketId|inviteId|sourceId|userId)\s*:\s*z\s*\.\s*number\s*\(\s*\)/g;

/** The procedure builders, and whether each one requires a signed-in user. */
const KINDS = [
  "authedQuery",
  "publicQuery",
  "adminQuery",
  "adminLimited",
  "adminMutationLimited",
] as const;

export type ProcedureKind = (typeof KINDS)[number];

export interface ScannedProcedure {
  /** As called over tRPC, for example `project.getById`. */
  path: string;
  kind: ProcedureKind;
  /** Id-shaped input fields, deduplicated and sorted. */
  idFields: string[];
}

const ROUTER_FILES: Array<{ file: string; namespace: string }> = [
  { file: "projectRouter.ts", namespace: "project" },
  { file: "stepRouter.ts", namespace: "step" },
  { file: "renderRouter.ts", namespace: "render" },
  { file: "aiRouter.ts", namespace: "ai" },
  { file: "settingsRouter.ts", namespace: "settings" },
  { file: "supportRouter.ts", namespace: "support" },
  { file: "teamRouter.ts", namespace: "team" },
  { file: "adminRouter.ts", namespace: "admin" },
];

/**
 * Every procedure, with the id fields it accepts.
 *
 * A procedure's body runs to the start of the next one, so an id belonging to the
 * following endpoint is not attributed to this one. Getting that wrong made the first
 * version of this report `project.list` as taking an id, which it does not.
 */
export function scanProcedures(apiDir = path.resolve(import.meta.dirname, "..")): ScannedProcedure[] {
  const kindPattern = KINDS.join("|");
  const declaration = new RegExp(`^ {2}([a-zA-Z][a-zA-Z0-9]*):\\s*(${kindPattern})\\b`, "gm");

  const results: ScannedProcedure[] = [];

  for (const { file, namespace } of ROUTER_FILES) {
    const full = path.join(apiDir, file);
    if (!fs.existsSync(full)) continue;
    const src = fs.readFileSync(full, "utf8");

    const declarations = [...src.matchAll(declaration)];
    declarations.forEach((match, index) => {
      const start = match.index ?? 0;
      const end = declarations[index + 1]?.index ?? src.length;
      const body = src.slice(start, end);

      const idFields = [...body.matchAll(ID_FIELD)].map((m) => m[1]);
      results.push({
        path: `${namespace}.${match[1]}`,
        kind: match[2] as ProcedureKind,
        idFields: [...new Set(idFields)].sort(),
      });
    });
  }

  return results;
}

/**
 * Signed-in endpoints that accept a resource id.
 *
 * These are the ones an ownership test has to cover: called with somebody else's id,
 * each must refuse. Admin endpoints are excluded because acting on other people's
 * resources is their whole purpose.
 */
export function ownershipSurface(apiDir?: string): ScannedProcedure[] {
  return scanProcedures(apiDir)
    .filter((p) => p.kind === "authedQuery" && p.idFields.length > 0)
    .sort((a, b) => a.path.localeCompare(b.path));
}
