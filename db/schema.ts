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
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  plan: mysqlEnum("plan", ["free", "pro", "team"]).default("free").notNull(),
  credits: int("credits").default(5).notNull(),
  videosCreatedThisMonth: int("videosCreatedThisMonth").default(0).notNull(),
  monthlyResetAt: timestamp("monthlyResetAt").defaultNow().notNull(),
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
  // ── Redaction ──
  editorRedactX: float("editorRedactX"),
  editorRedactY: float("editorRedactY"),
  editorRedactW: float("editorRedactW"),
  editorRedactH: float("editorRedactH"),
  editorRedactColor: varchar("editorRedactColor", { length: 20 }).default("#000000"),
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
  // ── Spotlight ──
  editorSpotlightX: float("editorSpotlightX"),
  editorSpotlightY: float("editorSpotlightY"),
  editorSpotlightW: float("editorSpotlightW"),
  editorSpotlightH: float("editorSpotlightH"),
  editorSpotlightIntensity: float("editorSpotlightIntensity").default(0.6),
  // ── Step Number Badge ──
  editorBadgeNumber: int("editorBadgeNumber"),
  editorBadgeX: float("editorBadgeX"),
  editorBadgeY: float("editorBadgeY"),
  editorBadgeColor: varchar("editorBadgeColor", { length: 20 }).default("#FBBF24"),
  // ── Magnifying Glass Inset ──
  editorMagnifyX: float("editorMagnifyX"),
  editorMagnifyY: float("editorMagnifyY"),
  editorMagnifyW: float("editorMagnifyW"),
  editorMagnifyH: float("editorMagnifyH"),
  editorMagnifyScale: float("editorMagnifyScale").default(2.0),
  editorMagnifyCorner: varchar("editorMagnifyCorner", { length: 20 }).default("bottom-right"),
  // ── Color Filter ──
  editorColorFilter: varchar("editorColorFilter", { length: 20 }).default("none"),
  editorZoomScale: float("editorZoomScale").default(1.6),
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
    }>
  >(),
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

// ── AI Video Studio Tables (completely separate from screenshot wizard) ──

export const studioProjects = mysqlTable("studio_projects", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  topic: text("topic").notNull(),
  style: mysqlEnum("style", ["educational", "entertaining", "promotional", "documentary"])
    .default("educational")
    .notNull(),
  targetDuration: int("targetDuration").default(120).notNull(), // seconds
  audience: varchar("audience", { length: 255 }).default("general"),
  tone: mysqlEnum("tone", ["professional", "casual", "energetic", "calm"])
    .default("professional")
    .notNull(),
  platform: mysqlEnum("platform", ["youtube", "tiktok", "linkedin", "instagram"])
    .default("youtube")
    .notNull(),
  resolution: mysqlEnum("resolution", ["720p", "1080p", "4k"])
    .default("1080p")
    .notNull(),
  voice: varchar("voice", { length: 100 }).default("en-US-AriaNeural"),
  speed: float("speed").default(1.0),
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
  status: mysqlEnum("status", ["draft", "scripted", "media_ready", "processing", "complete", "error"])
    .default("draft")
    .notNull(),
  scriptJson: text("scriptJson"), // Full generated script JSON
  finalVideoPath: text("finalVideoPath"),
  completedAt: timestamp("completedAt"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type StudioProject = typeof studioProjects.$inferSelect;
export type InsertStudioProject = typeof studioProjects.$inferInsert;

export const studioScenes = mysqlTable("studio_scenes", {
  id: serial("id").primaryKey(),
  projectId: bigint("projectId", { mode: "number", unsigned: true }).notNull(),
  order: int("order").notNull(),
  narration: text("narration").notNull(), // TTS text
  sceneDescription: text("sceneDescription"), // Visual description
  mediaType: mysqlEnum("mediaType", ["image", "video"]).default("image").notNull(),
  mediaUrl: text("mediaUrl"), // Pexels URL
  mediaLocalPath: text("mediaLocalPath"), // Downloaded local path
  searchQuery: varchar("searchQuery", { length: 255 }), // What was searched on Pexels
  photographerName: varchar("photographerName", { length: 255 }), // Pexels attribution
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

export type StudioScene = typeof studioScenes.$inferSelect;
export type InsertStudioScene = typeof studioScenes.$inferInsert;

export const studioRenderJobs = mysqlTable("studio_render_jobs", {
  id: serial("id").primaryKey(),
  projectId: bigint("projectId", { mode: "number", unsigned: true }).notNull(),
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

export type StudioRenderJob = typeof studioRenderJobs.$inferSelect;
export type InsertStudioRenderJob = typeof studioRenderJobs.$inferInsert;
