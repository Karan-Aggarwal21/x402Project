/**
 * OWNER: CORE
 * WHAT: Drizzle client. Single connection, reused across route handlers.
 */
import { env } from "@/shared/env";

export function getDb() {
  void env;
  throw new Error("NOT_IMPLEMENTED: getDb");
}

