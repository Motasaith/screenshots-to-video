import { describe, expect, it } from "vitest";
import { planBumper } from "./bumper";

/**
 * The reported bug: a project that once had a custom intro kept rendering it
 * after the dropdown was set back to "None". The worker read the stored path
 * before the template, so the leftover upload outranked the choice.
 */
describe("the template decides, not the leftover upload", () => {
  it("renders nothing once the template is set back to none", () => {
    expect(planBumper("none", "local:users/1/bumpers/old.mp4")).toEqual({ kind: "none" });
  });

  it("renders the chosen text template rather than an old clip", () => {
    expect(planBumper("dark-minimal", "local:users/1/bumpers/old.mp4")).toEqual({
      kind: "text",
      template: "dark-minimal",
    });
  });

  it("keeps rendering the clip while custom-video is selected", () => {
    expect(planBumper("custom-video", "local:users/1/bumpers/intro.mp4")).toEqual({ kind: "clip" });
  });
});

describe("custom-video with nothing uploaded renders nothing", () => {
  // renderTextSegment falls back to a default blue card for any template it
  // does not recognise, so falling through to it produced a title card nobody
  // asked for.
  it.each([undefined, null, ""])("path %p yields no segment", (path) => {
    expect(planBumper("custom-video", path)).toEqual({ kind: "none" });
  });
});

describe("the remaining combinations are unchanged", () => {
  it.each([
    ["none", null, { kind: "none" }],
    ["none", undefined, { kind: "none" }],
    [null, null, { kind: "none" }],
    [undefined, undefined, { kind: "none" }],
    // A template with no upload was always just a text card.
    ["dark-minimal", null, { kind: "text", template: "dark-minimal" }],
    ["warm-title", "", { kind: "text", template: "warm-title" }],
  ])("template %p with path %p", (template, path, expected) => {
    expect(planBumper(template, path)).toEqual(expected);
  });

  it("never reports a clip without a path to play", () => {
    for (const template of ["none", "custom-video", "dark-minimal", null, undefined]) {
      for (const path of [null, undefined, ""]) {
        expect(planBumper(template, path).kind).not.toBe("clip");
      }
    }
  });
});
