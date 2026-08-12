import { appRouter } from "./api/router";

const procs = (appRouter as unknown as { _def: { procedures: Record<string, unknown> } })._def.procedures;
const names = Object.keys(procs);
console.log("procedures:", names.length);
console.log(names.slice(0, 8).join(", "));

const sample = procs["project.get"] as { _def?: Record<string, unknown> } | undefined;
console.log("has _def:", !!sample?._def);
console.log("def keys:", sample?._def ? Object.keys(sample._def).join(", ") : "none");
