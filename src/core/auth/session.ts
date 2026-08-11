/**
 * OWNER: CORE
 * WHAT: Dashboard session + RBAC. ADMIN may write policies and action approvals; VIEWER may not.
 */

export type Role = "ADMIN" | "VIEWER";
export interface Session { userId: string; orgId: string; role: Role }

export async function requireSession(_req: Request, _role?: Role): Promise<Session> {
  throw new Error("NOT_IMPLEMENTED: requireSession");
}

