import { describe, expect, it } from "vitest";
import { resolveCaption } from "./captionStyle";
import { buildCaptionsFilter } from "./ffmpeg";

/**
 * Every step row carries these, NOT NULL with defaults, whether or not anyone
 * chose them. Resolving caption fields one at a time let them shadow the
 * project's settings on every render.
 */
const untouchedScene = {
  editorCaptionText: null,
  editorCaptionStyle: "standard",
  editorCaptionSize: "medium",
  editorCaptionPosition: "bottom",
  editorCaptionColor: "#FFFFFF",
};

describe("project caption settings survive a step's column defaults", () => {
  it.each(["small", "medium", "large"])("project size %s is what renders", (size) => {
    const caption = resolveCaption(untouchedScene, { text: "Narration", size });
    expect(caption.size).toBe(size);
    expect(caption.source).toBe("project");
  });

  it("carries the project's style, position and colour too", () => {
    const caption = resolveCaption(untouchedScene, {
      text: "Narration",
      style: "outline",
      position: "top",
      color: "#FBBF24",
    });
    expect(caption).toMatchObject({
      style: "outline",
      position: "top",
      color: "#FBBF24",
      source: "project",
    });
  });
});

describe("a scene with its own caption text styles it itself", () => {
  it("takes the scene's size over the project's", () => {
    const caption = resolveCaption(
      { ...untouchedScene, editorCaptionText: "Click here", editorCaptionSize: "large" },
      { text: "Narration", size: "small" }
    );
    expect(caption).toMatchObject({ text: "Click here", size: "large", source: "scene" });
  });

  it("falls back to the project for anything the scene leaves unset", () => {
    const caption = resolveCaption(
      { editorCaptionText: "Click here" },
      { text: "Narration", size: "small", color: "#FBBF24" }
    );
    expect(caption).toMatchObject({ size: "small", color: "#FBBF24", source: "scene" });
  });
});

describe("with nothing set at all it falls back to the documented defaults", () => {
  it("returns medium/standard/bottom/white and no text", () => {
    expect(resolveCaption(undefined, undefined)).toEqual({
      text: "",
      style: "standard",
      size: "medium",
      position: "bottom",
      color: "#FFFFFF",
      source: "project",
    });
  });
});

/**
 * The resolved size has to survive into the filter as a different font size,
 * or "size does nothing" is still true one layer down.
 */
describe("the size reaches drawtext as a different font size", () => {
  const fontSizeOf = (filter: string) => Number(filter.match(/fontsize=(\d+)/)![1]);

  it("small < medium < large at 1920x1080", async () => {
    const sizes = await Promise.all(
      ["small", "medium", "large"].map((size) =>
        buildCaptionsFilter("Hello there", "standard", size, "bottom", "#FFFFFF", 1920, 1080, 3)
      )
    );
    const [small, medium, large] = sizes.map(fontSizeOf);
    expect(small).toBeLessThan(medium);
    expect(medium).toBeLessThan(large);
    // Sized off the short side, so the numbers are stable and checkable.
    expect([small, medium, large]).toEqual([54, 76, 97]);
  });

  it("scales with the frame rather than being fixed", async () => {
    const hd = fontSizeOf(
      await buildCaptionsFilter("Hello", "standard", "medium", "bottom", "#FFFFFF", 1920, 1080, 3)
    );
    const sd = fontSizeOf(
      await buildCaptionsFilter("Hello", "standard", "medium", "bottom", "#FFFFFF", 960, 540, 3)
    );
    expect(sd).toBeLessThan(hd);
  });
});
