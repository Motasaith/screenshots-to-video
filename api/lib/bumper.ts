/**
 * Whether a project's intro/outro is a clip, a text card, or nothing.
 *
 * Its own module so the rule can be tested without dragging in the render
 * worker, and so intro and outro cannot drift apart the way two inline copies
 * of an `if` chain do.
 *
 * The rule: the template is the choice, and the stored path is only the file
 * that choice points at. The worker used to read the path first, which inverted
 * that — once a project had ever had a custom intro it kept rendering one
 * however the dropdown was set, so switching to "None" removed nothing and
 * picking a text template silently played the old clip instead.
 *
 * The path is deliberately kept in the database when the template moves off
 * "custom-video": it is the user's file, switching back should restore it, and
 * nothing renders it while the template does not ask for it.
 */
export type BumperPlan =
  /** Use the uploaded clip (or still) at the stored path. */
  | { kind: "clip" }
  /** Render a generated title card with this template. */
  | { kind: "text"; template: string }
  /** Emit no segment at all. */
  | { kind: "none" };

export function planBumper(
  template: string | null | undefined,
  videoPath: string | null | undefined
): BumperPlan {
  if (template === "custom-video") {
    // No file yet is "nothing", not "fall through". renderTextSegment defaults
    // to a blue card for any template it does not recognise, so falling through
    // rendered a title card nobody asked for.
    return videoPath ? { kind: "clip" } : { kind: "none" };
  }
  if (template && template !== "none") return { kind: "text", template };
  return { kind: "none" };
}
