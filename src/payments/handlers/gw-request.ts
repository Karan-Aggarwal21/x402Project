// OWNER: PAY. Route body for POST /api/gw/request — the only endpoint an agent needs.
// The agent gets a decision, a result and a hash. Never a key, an RPC URL or a facilitator body.
import { z } from "zod";
import { GUARD_KEY_HEADER, authenticateAgent, checkRateLimit } from "@/payments/handlers/agentAuth";
import { runGuardedRequest, type GuardedRequestResult } from "@/payments/gateway/orchestrator";
import { ERROR_CODES, type ErrorCode } from "@/shared/errors";
import { fail, ok } from "@/shared/http";

/** Provisional: CORE owns the real approval window and does not return one yet. See blocker B8. */
const APPROVAL_TTL_MS = 15 * 60_000;

/** Cloud metadata endpoints. The agent chooses the URL, so this is an SSRF boundary. */
const FORBIDDEN_HOSTS = new Set(["169.254.169.254", "metadata.google.internal", "metadata.goog"]);

const requestSchema = z.object({
  url: z.string().url().refine((value) => {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && !FORBIDDEN_HOSTS.has(url.hostname);
  }, "url must be http(s) and must not target a metadata endpoint"),
  method: z.string().min(1).max(10).default("GET"),
  headers: z.record(z.string()).optional(),
  body: z.unknown().optional(),
  maxAmountUsd: z.string().regex(/^\d+(\.\d{1,6})?$/).optional(),
  reason: z.string().max(500).optional(),
  idempotencyKey: z.string().max(200).optional(),
});

/** An unrecognised code fails closed rather than escaping the catalogue CLAUDE.md section 1 requires. */
function toErrorCode(code: string | undefined): ErrorCode {
  return code && code in ERROR_CODES ? (code as ErrorCode) : "GUARD_UNAVAILABLE";
}

function blocked(result: GuardedRequestResult): Response {
  const [first] = result.reasons;
  return fail(
    toErrorCode(first?.code),
    {
      intentId: result.intentId,
      merchant: result.merchant,
      resource: result.resource,
      requested: result.amountUsd,
      onChain: result.onChain,
      reasons: result.reasons,
    },
    first?.message,
  );
}

export async function POST(request: Request): Promise<Response> {
  const agent = await authenticateAgent(request).catch(() => null);
  if (!agent) return fail("GUARD_UNAVAILABLE", { header: GUARD_KEY_HEADER }, "Agent key missing or not recognised.");
  if (agent.status === "FROZEN") return fail("AGENT_FROZEN", { agentId: agent.agentId });

  // 429 is transport hygiene and is deliberately distinct from a policy 402 VELOCITY_EXCEEDED.
  if (!(await checkRateLimit(agent.agentId).catch(() => false))) {
    return fail("RATE_LIMITED", { agentId: agent.agentId });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("INVALID_PAYMENT_REQUIREMENTS", { issues: parsed.error.flatten().fieldErrors }, "Request body is invalid.");
  }

  const result = await runGuardedRequest({ agentId: agent.agentId, ...parsed.data });

  switch (result.status) {
    case "SETTLED":
      return ok({
        intentId: result.intentId,
        decision: result.decision,
        amountUsd: result.amountUsd,
        merchant: result.merchant,
        resource: result.resource,
        onChain: result.onChain.signed
          ? { ...result.onChain, explorerUrl: result.payment?.explorerUrl }
          : result.onChain,
        // The merchant's body only. Its headers and the raw facilitator payload stay server-side.
        response: result.response?.body ?? null,
      });

    case "PENDING_APPROVAL":
      return fail("APPROVAL_REQUIRED", {
        intentId: result.intentId,
        merchant: result.merchant,
        resource: result.resource,
        requested: result.amountUsd,
        expiresAt: new Date(Date.now() + APPROVAL_TTL_MS).toISOString(),
      });

    default:
      return blocked(result);
  }
}
