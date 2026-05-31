import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import fs from 'fs';

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    ssl: {
      ca: fs.readFileSync('./assets/ca(1).pem').toString(),
    },
  },
});
