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
  audioPath: text("audioPath"),
  audioDuration: float("audioDuration"),
  videoSegmentPath: text("videoSegmentPath"),
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
