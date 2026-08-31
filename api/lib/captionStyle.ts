/**
 * Which caption a scene renders, and in whose styling.
 *
 * Two sources feed the same drawtext filter:
 *
 *  - the project's caption settings, which subtitle the narration on every
 *    scene, and
 *  - a scene's own `editorCaptionText`, a one-off caption that replaces it.
 *
 * The styling has to follow whichever TEXT won, as a group. Resolving each
 * field on its own with `editor ?? project` reads as equivalent and is not:
 * `steps.editorCaptionSize`/`Style`/`Position`/`Color` are NOT NULL with
 * defaults ("medium", "standard", "bottom", "#FFFFFF"), so every step carries a
 * truthy value whether or not anyone chose one. Those defaults shadowed the
 * project's settings on every render, which is why picking Small or Large in
 * the captions panel changed nothing in the exported video.
 *
 * Its own module so the rule is testable without booting a render, and so the
 * two render paths that need it cannot drift apart.
 */

export interface CaptionStyle {
  text: string;
  style: string;
  size: string;
  position: string;
  color: string;
  /** Which source won, for callers that want to explain themselves. */
  source: "scene" | "project";
}

export interface SceneCaption {
  editorCaptionText?: string | null;
  editorCaptionStyle?: string | null;
  editorCaptionSize?: string | null;
  editorCaptionPosition?: string | null;
  editorCaptionColor?: string | null;
}

export interface ProjectCaption {
  text?: string | null;
  style?: string | null;
  size?: string | null;
  position?: string | null;
  color?: string | null;
}

export function resolveCaption(
  scene: SceneCaption | undefined,
  project: ProjectCaption | undefined
): CaptionStyle {
  // The scene's own text is the only thing that hands it control of the
  // styling. Without it the scene is showing the project's narration caption,
  // so it is the project's settings that describe it.
  if (scene?.editorCaptionText) {
    return {
      text: scene.editorCaptionText,
      style: scene.editorCaptionStyle || project?.style || "standard",
      size: scene.editorCaptionSize || project?.size || "medium",
      position: scene.editorCaptionPosition || project?.position || "bottom",
      color: scene.editorCaptionColor || project?.color || "#FFFFFF",
      source: "scene",
    };
  }

  return {
    text: project?.text || "",
    style: project?.style || "standard",
    size: project?.size || "medium",
    position: project?.position || "bottom",
    color: project?.color || "#FFFFFF",
    source: "project",
  };
}
