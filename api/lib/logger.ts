/**
 * Structured logging system with file-based storage and automatic rotation.
 *
 * Features:
 * - Writes logs to files in `logs/` directory
 * - Daily rotation: each day gets its own log file
 * - Auto-deletes logs older than 30 days (configurable via LOG_RETENTION_DAYS)
 * - Per-user logging: admin can query logs filtered by userId
 * - Structured JSON log entries for easy parsing
 * - Log levels: debug, info, warn, error
 * - Also mirrors to console in development mode
 *
 * Log file format: logs/YYYY-MM-DD.log
 * Each line is a JSON object: { ts, level, msg, userId?, ip?, path?, error?, ...meta }
 */

import fs from "fs";
import path from "path";

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  ts: string;
  level: LogLevel;
  msg: string;
  userId?: number;
  ip?: string;
  path?: string;
  error?: string;
  stack?: string;
  [key: string]: unknown;
}

const LOG_DIR = path.resolve(process.cwd(), "logs");
const RETENTION_DAYS = parseInt(process.env.LOG_RETENTION_DAYS || "30", 10);
const MAX_FILE_SIZE_MB = 50;

// Ensure log directory exists
try {
  fs.mkdirSync(LOG_DIR, { recursive: true });
} catch {
  // Directory creation might fail in serverless environments — that's OK,
  // logging will gracefully degrade to console-only.
}

let lastRotationCheck = 0;

/**
 * Get today's log file path.
 */
function getLogFilePath(date = new Date()): string {
  const dateStr = date.toISOString().slice(0, 10);
  return path.join(LOG_DIR, `${dateStr}.log`);
}

/**
 * Remove log files older than RETENTION_DAYS.
 * Runs at most once per hour to avoid filesystem overhead on every log call.
 */
function cleanupOldLogs() {
  const now = Date.now();
  if (now - lastRotationCheck < 3600_000) return; // 1 hour
  lastRotationCheck = now;

  try {
    const files = fs.readdirSync(LOG_DIR);
    const cutoff = now - RETENTION_DAYS * 24 * 60 * 60 * 1000;

    for (const file of files) {
      if (!file.endsWith(".log")) continue;
      const filePath = path.join(LOG_DIR, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat.mtimeMs < cutoff) {
          fs.unlinkSync(filePath);
        }
      } catch {
        // File may have been deleted concurrently — ignore
      }
    }
  } catch {
    // Filesystem errors are non-fatal for logging
  }
}

/**
 * Rotate the current log file if it exceeds MAX_FILE_SIZE_MB.
 */
function rotateIfNeeded(filePath: string) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      const rotated = filePath.replace(/\.log$/, `-${Date.now()}.log`);
      fs.renameSync(filePath, rotated);
    }
  } catch {
    // File doesn't exist yet or can't be stat'd — no rotation needed
  }
}

/**
 * Write a log entry to file and optionally console.
 */
function writeLog(entry: LogEntry) {
  const line = JSON.stringify(entry) + "\n";

  // Always log to console in development
  if (process.env.NODE_ENV !== "production") {
    const consoleMsg = `[${entry.level.toUpperCase()}] ${entry.msg}`;
    switch (entry.level) {
      case "error":
        console.error(consoleMsg, entry.error || "");
        break;
      case "warn":
        console.warn(consoleMsg);
        break;
      case "debug":
        console.debug(consoleMsg);
        break;
      default:
        console.log(consoleMsg);
    }
  } else {
    // In production, only mirror errors to console (for Docker/PM2 logs)
    if (entry.level === "error") {
      console.error(`[ERROR] ${entry.msg}`, entry.error || "");
    }
  }

  // Write to file (best-effort — silently fails in serverless environments)
  try {
    const filePath = getLogFilePath();
    rotateIfNeeded(filePath);
    fs.appendFileSync(filePath, line, { flag: "a" });
    cleanupOldLogs();
  } catch {
    // Filesystem not available (e.g., Vercel serverless) — console-only mode
  }
}

/**
 * Create a logger instance scoped to a specific context (e.g., a request).
 */
export function createLogger(context?: { userId?: number; ip?: string; path?: string }) {
  function log(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
    const entry: LogEntry = {
      ts: new Date().toISOString(),
      level,
      msg,
      ...context,
      ...meta,
    };
    writeLog(entry);
  }

  return {
    debug: (msg: string, meta?: Record<string, unknown>) => log("debug", msg, meta),
    info: (msg: string, meta?: Record<string, unknown>) => log("info", msg, meta),
    warn: (msg: string, meta?: Record<string, unknown>) => log("warn", msg, meta),
    error: (msg: string, error?: unknown, meta?: Record<string, unknown>) => {
      const errorMeta: Record<string, unknown> = {};
      if (error instanceof Error) {
        errorMeta.error = error.message;
        errorMeta.stack = error.stack;
      } else if (error) {
        errorMeta.error = String(error);
      }
      log("error", msg, { ...errorMeta, ...meta });
    },
  };
}

/**
 * Global logger for use outside of request context (e.g., worker, boot).
 */
export const logger = createLogger();

/**
 * Read log files for the admin dashboard.
 * Returns parsed log entries, optionally filtered.
 */
export function readLogs(options?: {
  date?: string; // YYYY-MM-DD, defaults to today
  level?: LogLevel;
  userId?: number;
  search?: string;
  /**
   * Match the `path` field by prefix, e.g. "support" catches both
   * "supportRouter" and "support.chat".
   *
   * Support widget failures were already being written here, but finding them
   * meant knowing to type the right word into a free-text search. A prefix
   * filter makes them a listed source instead of folklore.
   */
  pathPrefix?: string;
  limit?: number;
}): { entries: LogEntry[]; total: number; file: string } {
  const dateStr = options?.date || new Date().toISOString().slice(0, 10);
  const filePath = path.join(LOG_DIR, `${dateStr}.log`);

  let entries: LogEntry[] = [];

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as LogEntry;

        // Apply filters
        if (options?.level && entry.level !== options.level) continue;
        if (options?.userId && entry.userId !== options.userId) continue;
        if (options?.pathPrefix && !(entry.path || "").startsWith(options.pathPrefix)) continue;
        if (options?.search) {
          const searchStr = options.search.toLowerCase();
          const entryStr = JSON.stringify(entry).toLowerCase();
          if (!entryStr.includes(searchStr)) continue;
        }

        entries.push(entry);
      } catch {
        // Skip malformed lines
      }
    }
  } catch {
    // File doesn't exist — return empty
    return { entries: [], total: 0, file: dateStr };
  }

  // Reverse chronological order (newest first)
  entries.reverse();

  const total = entries.length;
  const limit = options?.limit ?? 200;
  entries = entries.slice(0, limit);

  return { entries, total, file: dateStr };
}

/**
 * List available log dates (for the admin dashboard date picker).
 */
export function listLogDates(): string[] {
  try {
    const files = fs.readdirSync(LOG_DIR);
    return files
      .filter((f) => f.endsWith(".log"))
      .map((f) => f.replace(".log", ""))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

/**
 * Get log statistics for the admin dashboard.
 */
export function getLogStats(): {
  totalFiles: number;
  totalSizeBytes: number;
  oldestDate: string | null;
  newestDate: string | null;
  todayCounts: Record<LogLevel, number>;
} {
  try {
    const files = fs.readdirSync(LOG_DIR).filter((f) => f.endsWith(".log"));
    let totalSizeBytes = 0;
    let oldestDate: string | null = null;
    let newestDate: string | null = null;

    for (const file of files) {
      const filePath = path.join(LOG_DIR, file);
      try {
        const stat = fs.statSync(filePath);
        totalSizeBytes += stat.size;
        const date = file.replace(".log", "");
        if (!oldestDate || date < oldestDate) oldestDate = date;
        if (!newestDate || date > newestDate) newestDate = date;
      } catch {
        // ignore
      }
    }

    // Count today's log levels
    const todayCounts: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
    };

    const today = new Date().toISOString().slice(0, 10);
    const todayFile = path.join(LOG_DIR, `${today}.log`);
    try {
      const content = fs.readFileSync(todayFile, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as LogEntry;
          if (entry.level in todayCounts) {
            todayCounts[entry.level]++;
          }
        } catch {
          // skip
        }
      }
    } catch {
      // no today file
    }

    return {
      totalFiles: files.length,
      totalSizeBytes,
      oldestDate,
      newestDate,
      todayCounts,
    };
  } catch {
    return {
      totalFiles: 0,
      totalSizeBytes: 0,
      oldestDate: null,
      newestDate: null,
      todayCounts: { debug: 0, info: 0, warn: 0, error: 0 },
    };
  }
}