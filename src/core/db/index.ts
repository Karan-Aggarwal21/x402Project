// OWNER: CORE. Drizzle client. Lazy so importing this file never requires DATABASE_URL at build time.
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/core/db/schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

declare global {
  // Serverless reloads would otherwise open a new pool per request.
  var __aspgDb: Db | undefined;
}

export function getDb(): Db {
  if (!globalThis.__aspgDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    globalThis.__aspgDb = drizzle(postgres(url, { max: 5, prepare: false }), { schema });
  }
  return globalThis.__aspgDb;
}

export { schema };
