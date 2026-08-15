// OWNER: CORE. `X-Guard-Key` authentication. Only a SHA-256 hash is stored; comparison is constant-time.
// Organizations are one of the deferred tables, so every agent reports the same placeholder org.
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getAgentByApiKeyHash } from "@/core/db/queries";

export const GUARD_KEY_HEADER = "X-Guard-Key";
const DEFERRED_ORG_ID = "org_default";

export interface AuthedAgent { agentId: string; orgId: string; status: "ACTIVE" | "FROZEN" }

export function hashAgentKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export function generateAgentKey(): { plaintext: string; hash: string } {
  // Shown to the operator once and never stored, so it has to carry its own entropy.
  const plaintext = `gk_live_${randomBytes(24).toString("base64url")}`;
  return { plaintext, hash: hashAgentKey(plaintext) };
}

/** Returns null on any failure. Never throws details back to the caller. */
export async function authenticateAgent(request: Request): Promise<AuthedAgent | null> {
  try {
    const presented = request.headers.get(GUARD_KEY_HEADER);
    if (!presented) return null;

    const presentedHash = hashAgentKey(presented);
    const agent = await getAgentByApiKeyHash(presentedHash);
    if (!agent) return null;

    // The lookup already matched, so this only closes the timing channel on the stored digest.
    const left = Buffer.from(presentedHash, "hex");
    const right = Buffer.from(agent.apiKeyHash, "hex");
    if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

    return { agentId: agent.id, orgId: DEFERRED_ORG_ID, status: agent.status };
  } catch {
    // An unreachable database must read as "not authenticated", never as "authenticated".
    return null;
  }
}
