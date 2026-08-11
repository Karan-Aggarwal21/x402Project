/**
 * OWNER: CORE
 * WHAT: `X-Guard-Key` authentication. Only a SHA-256 hash is stored; comparison is constant-time.
 * DOCS: API_DOCS.md section 2.1, SEC-1
 */

export interface AuthedAgent { agentId: string; orgId: string; status: "ACTIVE" | "FROZEN" }

export function generateAgentKey(): { plaintext: string; hash: string } {
  throw new Error("NOT_IMPLEMENTED: generateAgentKey");
}

/** Returns null on any failure. Never throws details back to the caller. */
export async function authenticateAgent(_req: Request): Promise<AuthedAgent | null> {
  throw new Error("NOT_IMPLEMENTED: authenticateAgent");
}

