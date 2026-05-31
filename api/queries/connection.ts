import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2";
import fs from "fs";
import path from "path";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;

export function getDb() {
  if (!instance) {
    const pool = mysql.createPool({
      uri: env.databaseUrl,
      ssl: {
        ca: fs.readFileSync(path.resolve(process.cwd(), "assets/ca(1).pem")),
      },
    });
    instance = drizzle(pool, { schema: fullSchema, mode: "default" });
  }
  return instance;
}
