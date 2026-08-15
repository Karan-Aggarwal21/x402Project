// OWNER: PAY. Gateway-edge authentication and rate limiting for POST /api/gw/request.
// CORE owns both for real; these are the USE_MOCKS=1 stand-ins so DEMO is not blocked on CORE.
import { authenticateAgent as coreAuthenticateAgent, type AuthedAgent } from "@/core/auth/agentKey";
import { checkRateLimit as coreCheckRateLimit } from "@/core/auth/rateLimit";
import { env } from "@/shared/env";

export const GUARD_KEY_HEADER = "X-Guard-Key";
export const RATE_LIMIT_PER_MINUTE = 60;

/** The one key BUILD.md's C7 example uses. Local only — never reachable with USE_MOCKS unset. */
const DEMO_AGENTS: Record<string, AuthedAgent> = {
  gk_live_researchbot_demo: { agentId: "agt_researchbot", orgId: "org_demo", status: "ACTIVE" },
};

// ponytail: in-process counters, so limits are per-instance. CORE's real limiter replaces this.
const hits = new Map<string, number[]>();

export async function authenticateAgent(request: Request): Promise<AuthedAgent | null> {
  if (!env.USE_MOCKS) return coreAuthenticateAgent(request);
  const key = request.headers.get(GUARD_KEY_HEADER);
  return key ? DEMO_AGENTS[key] ?? null : null;
}

/** True when the request may proceed. Transport hygiene only — never the policy velocity rule. */
export async function checkRateLimit(key: string, limitPerMinute = RATE_LIMIT_PER_MINUTE): Promise<boolean> {
  if (!env.USE_MOCKS) return coreCheckRateLimit(key, limitPerMinute);

  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((at) => now - at < 60_000);
  if (recent.length >= limitPerMinute) {
    hits.set(key, recent);
    return false;
  }
  hits.set(key, [...recent, now]);
  return true;
}
