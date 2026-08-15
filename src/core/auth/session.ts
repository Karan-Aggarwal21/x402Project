// OWNER: CORE. Dashboard session + RBAC. ADMIN may write policies and action approvals; VIEWER may not.
// Users and organizations are deferred tables, so a session is a shared admin token rather than a login.
import { timingSafeEqual } from "node:crypto";

export type Role = "ADMIN" | "VIEWER";
export interface Session { userId: string; orgId: string; role: Role }

const DEFERRED_ORG_ID = "org_default";

export class ForbiddenError extends Error {
  constructor(message = "This action requires an ADMIN session.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

function constantTimeEquals(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * ADMIN requires `Authorization: Bearer <ASPG_ADMIN_TOKEN>`.
 *
 * With ASPG_ADMIN_TOKEN unset the dashboard runs open, which is the local demo default and is
 * NOT safe to deploy — set the variable before the dashboard is reachable by anyone else.
 */
export async function requireSession(request: Request, role: Role = "VIEWER"): Promise<Session> {
  const expected = process.env.ASPG_ADMIN_TOKEN;
  const presented = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const isAdmin = expected ? constantTimeEquals(presented, expected) : true;

  if (role === "ADMIN" && !isAdmin) throw new ForbiddenError();

  return {
    userId: isAdmin ? "user_admin" : "user_viewer",
    orgId: DEFERRED_ORG_ID,
    role: isAdmin ? "ADMIN" : "VIEWER",
  };
}
