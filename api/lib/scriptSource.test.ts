import { describe, expect, it } from "vitest";
import {
  hasUsableDescription,
  hasUsableScreenshot,
  scriptStrategy,
  stepsWithNothingToDescribe,
} from "./scriptSource";

/** Exactly what the homepage importer writes: a screenshot, no description. */
const imported = (order: number) => ({
  order,
  description: "",
  screenshotPath: `local:users/1/screenshots/shot${order}.webp`,
});

describe("a homepage import can be scripted without the user typing anything", () => {
  const project = [imported(1), imported(2), imported(3)];

  it("blocks nothing", () => {
    expect(stepsWithNothingToDescribe(project)).toEqual([]);
  });

  it("sends the screenshots to the vision model", () => {
    expect(scriptStrategy(project)).toBe("vision");
  });
});

describe("a scene is fine with either a screenshot or a description", () => {
  it.each([
    ["screenshot only", { order: 1, description: "", screenshotPath: "local:a.webp" }],
    ["description only", { order: 1, description: "Open the settings menu", screenshotPath: null }],
    ["both", { order: 1, description: "Open settings", screenshotPath: "local:a.webp" }],
  ])("%s", (_label, step) => {
    expect(stepsWithNothingToDescribe([step])).toEqual([]);
  });

  it("blocks only a scene offering neither, and names it", () => {
    const steps = [
      { order: 1, description: "Open settings", screenshotPath: null },
      { order: 2, description: "  ", screenshotPath: null },
      { order: 3, description: "", screenshotPath: "local:c.webp" },
    ];
    expect(stepsWithNothingToDescribe(steps)).toEqual([2]);
  });
});

describe("placeholders do not count as descriptions", () => {
  it.each(["Scene 1", "scene 12", "  Scene 3  "])("%p is a placeholder", (text) => {
    expect(hasUsableDescription({ order: 1, description: text })).toBe(false);
  });

  it("but a real description mentioning a scene does count", () => {
    expect(hasUsableDescription({ order: 1, description: "Scene 3 of the checkout flow" })).toBe(true);
  });
});

describe("an unsaved local preview is not a screenshot the server can read", () => {
  it("rejects blob: urls", () => {
    expect(hasUsableScreenshot({ order: 1, screenshotPath: "blob:http://localhost/abc" })).toBe(false);
  });

  it("so a blob-only scene with no description is blocked", () => {
    expect(
      stepsWithNothingToDescribe([{ order: 1, description: "", screenshotPath: "blob:http://x/y" }])
    ).toEqual([1]);
  });

  it("accepts a stored key", () => {
    expect(hasUsableScreenshot({ order: 1, screenshotPath: "local:users/1/a.webp" })).toBe(true);
  });
});

describe("strategy falls back to text when there is nothing to look at", () => {
  it("uses text when no scene has a screenshot", () => {
    expect(
      scriptStrategy([{ order: 1, description: "Open settings", screenshotPath: null }])
    ).toBe("text");
  });

  it("uses vision as soon as one scene has one", () => {
    expect(
      scriptStrategy([
        { order: 1, description: "Open settings", screenshotPath: null },
        { order: 2, description: "", screenshotPath: "local:b.webp" },
      ])
    ).toBe("vision");
  });
});
