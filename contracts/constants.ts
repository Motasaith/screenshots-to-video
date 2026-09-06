export const Session = {
  cookieName: "kimi_sid",
  maxAgeMs: 365 * 24 * 60 * 60 * 1000,
} as const;

export const ErrorMessages = {
  unauthenticated: "Authentication required",
  insufficientRole: "Insufficient permissions",
} as const;

export const Paths = {
  login: "/login",
  oauthCallback: "/api/oauth/callback",
} as const;

/**
 * Project description bounds.
 *
 * Shared by the client forms and both server mutations so they cannot drift.
 * They already had: `project.create` required 120 characters while
 * `project.update` required 10, so the import dialog could persist a
 * description that the create dialog would have rejected.
 *
 * 120 is a floor rather than a style preference. Beyond the screenshots, this
 * text is the main input the narration generator works from, and a one-line
 * description produces a one-line script.
 */
export const ProjectDescription = {
  min: 120,
  max: 1000,
} as const;

/**
 * Starting text for a new project.
 *
 * Both places that create a project prefill with this. The 120 character floor
 * above is right, but meeting it from an empty box reads as a wall - the create
 * dialog opens on "120 more characters needed" in red before anything has been
 * typed. Starting from a real sentence that already clears the minimum turns
 * the job from "write an essay" into "change this to describe your video",
 * which is a much smaller ask and produces better text than a reluctant 120
 * characters would.
 *
 * Deliberately generic and slightly awkward: it should be obviously a
 * placeholder worth replacing, not something anyone would happily ship. The
 * narration is written from it, so a description left untouched should read as
 * unfinished rather than as a decision.
 */
export const ProjectDefaults = {
  title: "Untitled tutorial",
  description:
    "A step-by-step walkthrough of this process, shown one screen at a time. " +
    "Replace this with what the video covers, who it is for, and what they " +
    "should be able to do by the end.",
} as const;
