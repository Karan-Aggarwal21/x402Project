import type { Config } from "drizzle-kit";

// OWNER: CORE. drizzle-kit reads .env, Next reads .env.local — load it so one file holds the URL.
try { process.loadEnvFile(".env.local"); } catch { /* CI supplies DATABASE_URL directly */ }

export default {
  schema: "./src/core/db/schema.ts",
  out: "./src/core/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
} satisfies Config;

