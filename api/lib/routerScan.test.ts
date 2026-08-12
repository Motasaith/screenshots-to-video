import { describe, expect, it } from "vitest";
import { ownershipSurface, scanProcedures } from "./routerScan";

/**
 * The scanner is what keeps `scripts/ownership-probe.ts` honest.
 *
 * That script probes every signed-in endpoint taking a resource id, and it gets the
 * list from here rather than from a hand-written array. So the thing worth testing is
 * that the scanner actually finds procedures and attributes ids to the right one: if
 * it silently returned nothing, the probe would report a clean run having tested
 * nothing at all.
 */
describe("scanProcedures", () => {
  const all = scanProcedures();

  it("finds the routers", () => {
    // A wrong path or a changed declaration style would leave this empty, and an
    // empty scan is the failure mode that looks like success.
    expect(all.length).toBeGreaterThan(40);
  });

  it("classifies each procedure by how it authenticates", () => {
    const kinds = new Set(all.map((p) => p.kind));
    expect(kinds).toContain("authedQuery");
    expect(kinds).toContain("publicQuery");
    expect(kinds).toContain("adminLimited");
  });

  it("attributes ids to the procedure that declares them, not the next one", () => {
    // `project.list` takes no input at all. It appeared to take an id in the first
    // version of the scanner, which read a fixed window past the declaration and so
    // swallowed the start of `project.getById`.
    const list = all.find((p) => p.path === "project.list");
    expect(list?.idFields).toEqual([]);

    const getById = all.find((p) => p.path === "project.getById");
    expect(getById?.idFields).toEqual(["id"]);
  });

  it("reads the id fields of a multi-argument procedure", () => {
    const voice = all.find((p) => p.path === "ai.generateVoiceForStep");
    expect(voice?.idFields).toEqual(["stepId"]);
  });
});

describe("ownershipSurface", () => {
  const surface = ownershipSurface();

  it("lists the endpoints an ownership probe has to cover", () => {
    expect(surface.length).toBeGreaterThan(20);
  });

  it("includes only signed-in endpoints", () => {
    // Admin endpoints act on other people's resources by design, and public ones have
    // no owner to compare against, so neither belongs in an ownership probe.
    expect(surface.every((p) => p.kind === "authedQuery")).toBe(true);
  });

  it("includes only endpoints that take an id", () => {
    expect(surface.every((p) => p.idFields.length > 0)).toBe(true);
  });

  it("covers the endpoints that turned out to be broken", () => {
    // Every one of these was found leaking by the probe. They stay named here so a
    // refactor cannot quietly drop them out of the surface being tested.
    const paths = surface.map((p) => p.path);
    expect(paths).toContain("project.update");
    expect(paths).toContain("ai.checkMediaSafety");
    expect(paths).toContain("support.markTicketRead");
  });

  it("is sorted, so a diff of the surface is readable", () => {
    const sorted = [...surface].sort((a, b) => a.path.localeCompare(b.path));
    expect(surface.map((p) => p.path)).toEqual(sorted.map((p) => p.path));
  });
});
