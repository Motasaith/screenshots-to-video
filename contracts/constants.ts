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
