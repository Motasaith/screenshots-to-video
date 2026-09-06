/**
 * What a project has to say before a script can be written for it.
 *
 * There are two ways to describe a scene to the model: the screenshot, and the
 * description the user typed. Either is enough on its own - the vision path
 * reads the picture, the text path reads the words - but `generateScript`
 * demanded descriptions unconditionally and refused to run without them:
 *
 *     Step 1 has no description. Please write a description for this step first.
 *
 * Screenshots imported from the homepage are created with `description: ""`.
 * So the exact flow the homepage advertises - "drop in the screenshots you
 * already have, AIVideo writes the narration" - hit that error on the first
 * click, and the user had to hand-write a description for every screenshot
 * before any of the promised automation would run.
 *
 * A description is now required only for scenes that have no screenshot, since
 * those genuinely leave the model nothing to work from.
 */

export interface ScriptStepLike {
  order: number;
  description?: string | null;
  screenshotPath?: string | null;
}

/** A screenshot the model can actually be shown. */
export function hasUsableScreenshot(step: ScriptStepLike): boolean {
  const path = step.screenshotPath;
  // `blob:` is an unsaved local preview: the server cannot read it.
  return Boolean(path && !path.startsWith("blob:"));
}

/** A description with something in it beyond the editor's own placeholder. */
export function hasUsableDescription(step: ScriptStepLike): boolean {
  const text = step.description?.trim();
  if (!text) return false;
  // "Scene 3" is what the editor labels an untouched scene, not a description.
  return !/^scene\s+\d+$/i.test(text);
}

/**
 * Scenes that describe themselves to the model in no way at all.
 *
 * Returns their `order` values, so the message can name them.
 */
export function stepsWithNothingToDescribe(steps: ScriptStepLike[]): number[] {
  return steps
    .filter((s) => !hasUsableScreenshot(s) && !hasUsableDescription(s))
    .map((s) => s.order);
}

/**
 * Whether to send the screenshots to a vision model or work from text alone.
 *
 * Vision as soon as any scene has a picture: the hybrid prompt takes both, and
 * a scene with only a description still contributes its text.
 */
export function scriptStrategy(steps: ScriptStepLike[]): "vision" | "text" {
  return steps.some(hasUsableScreenshot) ? "vision" : "text";
}
