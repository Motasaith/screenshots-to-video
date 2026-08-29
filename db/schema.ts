import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  float,
  bigint,
  int,
  json,
  boolean,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  plan: mysqlEnum("plan", ["free", "pro", "team"]).default("free").notNull(),
  credits: int("credits").default(14).notNull(),
  videosCreatedThisMonth: int("videosCreatedThisMonth").default(0).notNull(),

  /**
   * Consent for campaigns, separate from transactional mail.
   *
   * Off by default: an account existing is not consent to be marketed to. A render
   * finishing still emails them, because they asked for that by pressing render.
   */
  marketingEmails: boolean("marketingEmails").default(false).notNull(),
  /**
   * Secret in the unsubscribe link, so one click works without a login.
   *
   * Random per user rather than derived from the id, so the link cannot be guessed
   * to unsubscribe somebody else.
   */
  unsubscribeToken: varchar("unsubscribeToken", { length: 40 }),
  monthlyResetAt: timestamp("monthlyResetAt").defaultNow().notNull(),
  // ── Bring-your-own-key: ElevenLabs (encrypted at rest, never sent to client) ──
  elevenlabsApiKey: text("elevenlabsApiKey"),
  // Last 4 chars of the key for display only (e.g. "••••1a2b"). Not sensitive.
  elevenlabsKeyHint: varchar("elevenlabsKeyHint", { length: 12 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const projects = mysqlTable("projects", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),

  /**
   * The team this project is shared with, or null for a personal project.
   *
   * Set at creation from the creator's team, so a member's work is visible to the
   * team by default. `userId` stays as the creator, because "who made this" is
   * still worth knowing and is what personal projects are scoped by.
   *
   * Every query that used to be scoped by `userId` alone must go through
   * `projectAccessWhere` in api/lib/teams.ts instead; that is the single place the
   * "mine or my team's" rule lives.
   */
  teamId: bigint("teamId", { mode: "number", unsigned: true }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  platform: mysqlEnum("platform", ["youtube", "teams", "tiktok", "linkedin"])
    .default("youtube")
    .notNull(),
  status: mysqlEnum("status", ["draft", "processing", "complete", "error"])
    .default("draft")
    .notNull(),
  voice: varchar("voice", { length: 100 }).default("en-US-AriaNeural"),
  speed: float("speed").default(1.0),
  resolution: mysqlEnum("resolution", ["720p", "1080p", "4k"])
    .default("1080p")
    .notNull(),
  musicEnabled: int("musicEnabled").default(0),
  musicTrack: varchar("musicTrack", { length: 100 }),
  aspectRatio: varchar("aspectRatio", { length: 10 }).default("16:9"),
  randomize: int("randomize").default(0),
  introTemplate: varchar("introTemplate", { length: 50 }),
  outroTemplate: varchar("outroTemplate", { length: 50 }),
  introText: text("introText"),
  outroText: text("outroText"),
  introVideoPath: text("introVideoPath"),
  outroVideoPath: text("outroVideoPath"),
  introDuration: float("introDuration").default(3.0),
  outroDuration: float("outroDuration").default(3.0),
  captionsEnabled: int("captionsEnabled").default(1),
  captionStyle: varchar("captionStyle", { length: 50 }).default("standard"),
  captionSize: varchar("captionSize", { length: 50 }).default("medium"),
  captionPosition: varchar("captionPosition", { length: 50 }).default("bottom"),
  captionColor: varchar("captionColor", { length: 20 }).default("#FFFFFF"),
  transitionDuration: float("transitionDuration").default(0.5),
  finalVideoPath: text("finalVideoPath"),
  completedAt: timestamp("completedAt"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

export const steps = mysqlTable("steps", {
  id: serial("id").primaryKey(),
  projectId: bigint("projectId", { mode: "number", unsigned: true }).notNull(),
  order: int("order").notNull(),
  description: text("description").notNull(),
  screenshotPath: text("screenshotPath"),
  aiScript: text("aiScript"),
  userEditedScript: text("userEditedScript"),
  zoomTargetX: float("zoomTargetX"),
  zoomTargetY: float("zoomTargetY"),
  zoomRectX: float("zoomRectX"),
  zoomRectY: float("zoomRectY"),
  zoomRectWidth: float("zoomRectWidth"),
  zoomRectHeight: float("zoomRectHeight"),
  // ── Multiple Highlight Regions (decoupled from zoom) ──
  editorHighlights: json("editorHighlights").$type<
    Array<{
      id: string;
      x: number;
      y: number;
      w: number;
      h: number;
      color?: string;
    }>
  >(),
  // ── Canvas Editor fields ──
  editorCaptionText: text("editorCaptionText"),
  editorCaptionPosition: varchar("editorCaptionPosition", { length: 20 }).default("bottom"),
  editorCaptionStyle: varchar("editorCaptionStyle", { length: 20 }).default("standard"),
  editorCaptionColor: varchar("editorCaptionColor", { length: 20 }).default("#FFFFFF"),
  editorCaptionSize: varchar("editorCaptionSize", { length: 20 }).default("medium"),
  editorOverlayText: text("editorOverlayText"),
  editorOverlayX: float("editorOverlayX"),
  editorOverlayY: float("editorOverlayY"),
  editorOverlayColor: varchar("editorOverlayColor", { length: 20 }).default("#FFFFFF"),
  editorOverlaySize: varchar("editorOverlaySize", { length: 20 }).default("medium"),
  editorCropX: float("editorCropX"),
  editorCropY: float("editorCropY"),
  editorCropW: float("editorCropW"),
  editorCropH: float("editorCropH"),
  editorBlurX: float("editorBlurX"),
  editorBlurY: float("editorBlurY"),
  editorBlurW: float("editorBlurW"),
  editorBlurH: float("editorBlurH"),
  editorBlurIntensity: float("editorBlurIntensity").default(20),
  // ── Multiple Blur Regions ──
  editorBlurs: json("editorBlurs").$type<
    Array<{
      id: string;
      x: number;
      y: number;
      w: number;
      h: number;
      intensity?: number;
    }>
  >(),
  // ── Redaction ──
  //
  // The four scalars below are the original single-region form, kept so steps
  // saved before `editorRedacts` existed still render. New work writes the
  // array; the renderer prefers it and only falls back to the scalars when it
  // is absent or empty.
  editorRedactX: float("editorRedactX"),
  editorRedactY: float("editorRedactY"),
  editorRedactW: float("editorRedactW"),
  editorRedactH: float("editorRedactH"),
  editorRedactColor: varchar("editorRedactColor", { length: 20 }).default("#000000"),
  // ── Multiple Redaction Regions ──
  editorRedacts: json("editorRedacts").$type<
    Array<{
      id: string;
      x: number;
      y: number;
      w: number;
      h: number;
      color?: string;
    }>
  >(),
  // ── Watermark ──
  editorWatermarkText: text("editorWatermarkText"),
  editorWatermarkPosition: varchar("editorWatermarkPosition", { length: 20 }).default("bottom-right"),
  editorWatermarkSize: varchar("editorWatermarkSize", { length: 20 }).default("small"),
  editorWatermarkColor: varchar("editorWatermarkColor", { length: 20 }).default("#FFFFFF"),
  editorWatermarkOpacity: float("editorWatermarkOpacity").default(0.5),
  // ── Pixelate ──
  editorPixelateX: float("editorPixelateX"),
  editorPixelateY: float("editorPixelateY"),
  editorPixelateW: float("editorPixelateW"),
  editorPixelateH: float("editorPixelateH"),
  editorPixelateBlockSize: float("editorPixelateBlockSize").default(20),
  // ── Multiple Pixelate Regions ──
  editorPixelates: json("editorPixelates").$type<
    Array<{
      id: string;
      x: number;
      y: number;
      w: number;
      h: number;
      blockSize?: number;
    }>
  >(),
  // ── Spotlight ──
  editorSpotlightX: float("editorSpotlightX"),
  editorSpotlightY: float("editorSpotlightY"),
  editorSpotlightW: float("editorSpotlightW"),
  editorSpotlightH: float("editorSpotlightH"),
  editorSpotlightIntensity: float("editorSpotlightIntensity").default(0.6),
  // ── Multiple Spotlight Regions ──
  editorSpotlights: json("editorSpotlights").$type<
    Array<{
      id: string;
      x: number;
      y: number;
      w: number;
      h: number;
      intensity?: number;
    }>
  >(),
  // ── Step Number Badge ──
  //
  // Legacy single-badge form; see the note on `editorRedacts`. `editorBadges`
  // supersedes it so one scene can call out several points at once.
  editorBadgeNumber: int("editorBadgeNumber"),
  editorBadgeX: float("editorBadgeX"),
  editorBadgeY: float("editorBadgeY"),
  editorBadgeColor: varchar("editorBadgeColor", { length: 20 }).default("#FBBF24"),
  // ── Multiple Step Number Badges ──
  editorBadges: json("editorBadges").$type<
    Array<{
      id: string;
      number: number;
      x: number;
      y: number;
      color?: string;
    }>
  >(),
  // ── Magnifying Glass Inset ──
  editorMagnifyX: float("editorMagnifyX"),
  editorMagnifyY: float("editorMagnifyY"),
  editorMagnifyW: float("editorMagnifyW"),
  editorMagnifyH: float("editorMagnifyH"),
  editorMagnifyScale: float("editorMagnifyScale").default(2.0),
  editorMagnifyCorner: varchar("editorMagnifyCorner", { length: 20 }).default("bottom-right"),
  // ── Color Filter ──
  editorColorFilter: varchar("editorColorFilter", { length: 20 }).default("none"),
  // How much of the filter to apply, 0-100. The filter used to be all or
  // nothing at full strength, which made sepia and high-contrast unusable on
  // screenshots where the UI still had to be readable.
  editorColorFilterStrength: float("editorColorFilterStrength").default(100),
  editorZoomScale: float("editorZoomScale"),
  editorDuration: float("editorDuration"),
  // ── Multi-Zoom (multiple zoom points on one screenshot) ──
  editorMultiZooms: json("editorMultiZooms").$type<
    Array<{
      id: string;
      targetX: number;
      targetY: number;
      rectX?: number;
      rectY?: number;
      rectW?: number;
      rectH?: number;
      zoomScale?: number;
      duration?: number;
      /**
       * Narration for this zoom point specifically.
       *
       * When set, this waypoint gets its own audio clip and the camera holds
       * for as long as that clip lasts. That inverts the default relationship:
       * normally the camera's fixed choreography sets scene length and any
       * leftover narration time becomes trailing silence, which is what made
       * three zoom points on a 6s script produce 6.5s of dead air.
       */
      script?: string;
      /**
       * For VIDEO scenes: the moment in the clip this keyframe applies to.
       *
       * Screenshots have no timeline of their own, so their zoom points are
       * sequenced by `duration`. Footage does, so its keyframes are anchored to
       * a timestamp instead. Absent on screenshot scenes.
       */
      atSec?: number;
    }>
  >(),
  /**
   * Where this scene's narration audio came from.
   *
   * `tts` is generated on every render and overwritten each time. `upload` is a
   * recording the person made themselves, so the render must use it as-is and never
   * regenerate over it. Without this flag the next render silently replaces a human
   * take with a robot one.
   */
  audioSource: mysqlEnum("audioSource", ["tts", "upload"]).default("tts").notNull(),
  audioPath: text("audioPath"),
  audioDuration: float("audioDuration"),
  transition: varchar("transition", { length: 30 }).default("fade"),
  videoSegmentPath: text("videoSegmentPath"),
  isSafe: int("isSafe").default(1),
  safetyReason: text("safetyReason"),
  status: mysqlEnum("status", ["pending", "generating", "done", "error"])
    .default("pending")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Step = typeof steps.$inferSelect;
export type InsertStep = typeof steps.$inferInsert;

export const renderJobs = mysqlTable("render_jobs", {
  id: serial("id").primaryKey(),
  projectId: bigint("projectId", { mode: "number", unsigned: true }).notNull(),
  /**
   * Queue position. Higher goes first, and equal priorities keep arrival order.
   *
   * Paid plans render before free ones, which is the whole promise of "priority
   * queue" and is why one number here is a feature. Not a plan lookup at claim
   * time: the plan at the moment of queueing is what the customer was told.
   */
  priority: int("priority").default(0).notNull(),
  status: mysqlEnum("status", ["queued", "processing", "complete", "error"])
    .default("queued")
    .notNull(),
  currentStep: int("currentStep").default(0),
  totalSteps: int("totalSteps").default(0),
  stage: varchar("stage", { length: 50 }),
  message: text("message"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type RenderJob = typeof renderJobs.$inferSelect;
export type InsertRenderJob = typeof renderJobs.$inferInsert;

/**
 * Support widget conversations, for signed-in users.
 *
 * One row is one conversation. The newest row for a user is the active one, so
 * "New chat" is an insert rather than a delete and yesterday's thread is still
 * there if it turns out to matter.
 *
 * Messages are stored as JSON rather than a row each. A support thread is short
 * and is only ever read whole, so a table of individual messages would buy a
 * join and nothing else.
 *
 * Attachments are deliberately NOT stored. An image arrives as a base64 data
 * URI of a few megabytes and a voice note as a blob URL that means nothing
 * outside the tab that made it; both are recorded as flags so the transcript
 * still reads correctly ("you sent a screenshot here") without turning this
 * table into a file store.
 */
export const supportChats = mysqlTable("support_chats", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  messages: json("messages")
    .$type<
      Array<{
        role: "user" | "assistant";
        content: string;
        /** How many images were attached, so the transcript can say so. */
        images?: number;
        /** Whether this turn was sent as a voice note. */
        note?: boolean;
      }>
    >()
    .default([]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type SupportChat = typeof supportChats.$inferSelect;
export type InsertSupportChat = typeof supportChats.$inferInsert;

/**
 * A request to talk to a person.
 *
 * Raised from the support widget when someone asks for a human, or clicks the
 * option directly. Anonymous visitors can raise one too, which is why `userId`
 * is nullable and `email` is required: without one or the other there would be
 * no way to reply.
 *
 * `transcript` is a snapshot of the chat at the moment the form was sent, so an
 * admin opening the ticket sees what the assistant already tried instead of
 * asking the customer to repeat themselves. A snapshot rather than a live link
 * to `support_chats`, because the customer may start a new chat afterwards and
 * the ticket should still show what it was about.
 */
export const supportTickets = mysqlTable("support_tickets", {
  id: serial("id").primaryKey(),
  /** Null for a visitor with no account. */
  userId: bigint("userId", { mode: "number", unsigned: true }),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 255 }),
  subject: varchar("subject", { length: 200 }).notNull(),
  message: text("message").notNull(),
  /** What the assistant and customer had said when the ticket was raised. */
  transcript: json("transcript")
    .$type<Array<{ role: "user" | "assistant"; content: string }>>()
    .default([]),
  /** Where the customer was, and what their account looked like. */
  pageUrl: varchar("pageUrl", { length: 500 }),
  accountSummary: text("accountSummary"),
  status: mysqlEnum("status", ["open", "in_progress", "waiting", "resolved"])
    .default("open")
    .notNull(),
  /**
   * The conversation between admin and customer after the ticket was raised.
   *
   * Kept on the ticket rather than in `support_chats` so a reply survives the
   * customer starting a new chat, and so an admin can answer someone who has
   * closed the tab.
   */
  replies: json("replies")
    .$type<Array<{ from: "admin" | "customer"; content: string; at: string }>>()
    .default([]),
  /** Private to admins; never returned to the customer. */
  internalNote: text("internalNote"),
  /** Set when the customer has unread admin replies, so the widget can nudge. */
  unreadForCustomer: int("unreadForCustomer").default(0).notNull(),
  /**
   * Secret that lets a visitor with no account poll their own ticket. Held in
   * the browser only; knowing it is the whole authorisation, so it never goes in
   * a URL and is never returned by any list endpoint.
   */
  accessKey: varchar("accessKey", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = typeof supportTickets.$inferInsert;

/**
 * Settings an admin changes from the dashboard instead of by deploying.
 *
 * Key and value rather than a column per setting: adding a setting should not need
 * a migration. `api/lib/appSettings.ts` owns the shape, the defaults and the
 * validation, so a row here is only storage.
 *
 * It also gives maintenance mode somewhere to live. It used to be a variable in
 * `middleware.ts`, which forgot itself on restart and, once the render worker
 * became its own process, would have let the two disagree.
 */
export const appSettings = mysqlTable("app_settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: json("value").$type<unknown>(),
  updatedBy: bigint("updatedBy", { mode: "number", unsigned: true }),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type AppSetting = typeof appSettings.$inferSelect;

/**
 * Addresses that must not be mailed.
 *
 * Hard bounces land here automatically, and an admin can add one by hand. Trying
 * a dead address again every campaign is exactly what ruins a sending domain's
 * reputation, and Brevo will start rejecting on our behalf if we do it.
 */
export const emailSuppressions = mysqlTable("email_suppressions", {
  email: varchar("email", { length: 320 }).primaryKey(),
  reason: varchar("reason", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * A promotional campaign an admin wrote.
 *
 * Kept as a record rather than fired and forgotten, so there is an answer to "what
 * did we send, to how many, and did it work". Sending is deliberately a separate
 * step from saving: `status` starts as draft and a test send happens before the
 * real one.
 */
export const emailCampaigns = mysqlTable("email_campaigns", {
  id: serial("id").primaryKey(),
  subject: varchar("subject", { length: 200 }).notNull(),
  body: text("body").notNull(),
  status: mysqlEnum("status", ["draft", "sending", "sent", "failed"]).default("draft").notNull(),
  /** Filled in as the send progresses, so a half-finished campaign is visible. */
  recipientCount: int("recipientCount").default(0).notNull(),
  sentCount: int("sentCount").default(0).notNull(),
  failedCount: int("failedCount").default(0).notNull(),
  createdBy: bigint("createdBy", { mode: "number", unsigned: true }),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type EmailCampaign = typeof emailCampaigns.$inferSelect;

/**
 * A team, which is a group of people sharing one subscription.
 *
 * A user belongs to at most one team. That constraint is deliberate: with multiple
 * memberships, every query about "my projects" has to ask which team is meant, and
 * every permission check gains a dimension. A company buying seats is the case
 * being served, and one team per person covers it.
 *
 * The billing owner is `ownerUserId` rather than a role on the membership row, so
 * there is always exactly one, and deleting the last admin cannot leave a team with
 * nobody able to pay for it.
 */
export const teams = mysqlTable("teams", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  ownerUserId: bigint("ownerUserId", { mode: "number", unsigned: true }).notNull(),
  /** Seats the plan includes before any are bought. */
  seatsIncluded: int("seatsIncluded").default(3).notNull(),
  /** Extra seats bought on top. Total allowed is the two added together. */
  seatsPurchased: int("seatsPurchased").default(0).notNull(),
  /**
   * Logo, colours and intro/outro defaults, applied to this team's renders.
   *
   * JSON rather than columns because it is a bag of presentation settings that will
   * grow, and nothing queries inside it.
   */
  brandKit: json("brandKit").$type<{
    logoKey?: string | null;
    primaryColor?: string | null;
    accentColor?: string | null;
    introText?: string | null;
    outroText?: string | null;
    watermarkText?: string | null;
  } | null>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

/**
 * Who is in a team, and what they may do.
 *
 * `owner` is the billing owner and mirrors `teams.ownerUserId`. `admin` may invite
 * and remove people. `member` may use the shared library but not change the team.
 */
export const teamMembers = mysqlTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: bigint("teamId", { mode: "number", unsigned: true }).notNull(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull().unique(),
  role: mysqlEnum("role", ["owner", "admin", "member"]).default("member").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

/**
 * An outstanding invitation.
 *
 * By email rather than by user id, because the person invited usually has no
 * account yet. The token is what the accept link carries, so it is random and long
 * enough not to be guessable.
 */
export const teamInvites = mysqlTable("team_invites", {
  id: serial("id").primaryKey(),
  teamId: bigint("teamId", { mode: "number", unsigned: true }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  role: mysqlEnum("role", ["admin", "member"]).default("member").notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  invitedBy: bigint("invitedBy", { mode: "number", unsigned: true }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * What happened, who did it, and when.
 *
 * Sold as a Team feature, but it exists because admin impersonation could mint a
 * session as any user with no record of it, which is the highest-value action in
 * the application. `teamId` is null for platform-level events such as that one.
 */
export const auditLogs = mysqlTable("audit_logs", {
  id: serial("id").primaryKey(),
  teamId: bigint("teamId", { mode: "number", unsigned: true }),
  actorUserId: bigint("actorUserId", { mode: "number", unsigned: true }),
  /** Dotted and past tense: `member.invited`, `impersonation.started`. */
  action: varchar("action", { length: 64 }).notNull(),
  targetType: varchar("targetType", { length: 32 }),
  targetId: varchar("targetId", { length: 64 }),
  metadata: json("metadata").$type<Record<string, unknown> | null>(),
  ip: varchar("ip", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Team = typeof teams.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
export type TeamInvite = typeof teamInvites.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
