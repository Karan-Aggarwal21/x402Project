// OWNER: DEMO. The agent's ONLY route to the outside world: POST /api/gw/request.
// One credential, one endpoint — no private key, no RPC, no signer. A 402 is data, never a throw.
import { z } from "zod";
import { env } from "@/shared/env";

export interface GuardedResult {
  ok: boolean;
  blocked?: { code: string; message: string };
  data?: unknown;
  txHash?: string;
  explorerUrl?: string;
  /** Present on a 202 APPROVAL_REQUIRED — D7 uses the intentId to find and approve the hold. */
  approval?: { intentId?: string; expiresAt?: string };
}

export interface GuardedOptions {
  // The caller's own ceiling, enforced by the gateway before policy is even asked (D2).
  maxAmountUsd?: string;
  // Ties a post-approval retry to the held intent (D7).
  idempotencyKey?: string;
}

const GUARD_KEY = "gk_live_researchbot_demo";
const GUARD_KEY_HEADER = "X-Guard-Key";

const successEnvelope = z.object({
  status: z.literal(true),
  data: z.object({
    onChain: z.object({
      txHash: z.string().nullable(),
      explorerUrl: z.string().nullable().optional(),
    }).passthrough(),
    response: z.unknown(),
  }).passthrough(),
});

const failureEnvelope = z.object({
  status: z.literal(false),
  message: z.string(),
  error: z.object({
    code: z.string(),
    details: z.object({
      intentId: z.string().optional(),
      expiresAt: z.string().optional(),
    }).passthrough().optional(),
  }).passthrough(),
});

function blockedResult(code: string, message: string): GuardedResult {
  return { ok: false, blocked: { code, message } };
}

export async function guardedFetch(
  url: string,
  body: unknown,
  reason: string,
  options?: GuardedOptions,
): Promise<GuardedResult> {
  const target = url.startsWith("http") ? url : `${env.APP_URL}${url}`;

  let response: Response;
  try {
    response = await fetch(`${env.APP_URL}/api/gw/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json", [GUARD_KEY_HEADER]: GUARD_KEY },
      body: JSON.stringify({
        url: target,
        method: "POST",
        body,
        reason,
        ...(options?.maxAmountUsd ? { maxAmountUsd: options.maxAmountUsd } : {}),
        ...(options?.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : {}),
      }),
    });
  } catch (error) {
    // An unreachable Guard is a block, not a crash — the agent reports it and moves on.
    return blockedResult("GUARD_UNAVAILABLE", error instanceof Error ? error.message : "Guard unreachable.");
  }

  const json: unknown = await response.json().catch(() => null);

  if (response.status === 200) {
    const parsed = successEnvelope.safeParse(json);
    return parsed.success
      ? {
          ok: true,
          data: parsed.data.data.response,
          txHash: parsed.data.data.onChain.txHash ?? undefined,
          explorerUrl: parsed.data.data.onChain.explorerUrl ?? undefined,
        }
      : blockedResult("GUARD_UNAVAILABLE", "Guard returned a malformed success envelope.");
  }

  const parsed = failureEnvelope.safeParse(json);
  if (!parsed.success) {
    return blockedResult("GUARD_UNAVAILABLE", `Guard returned ${response.status} without a readable envelope.`);
  }
  const { code } = parsed.data.error;
  const details = parsed.data.error.details;
  const result = blockedResult(code, parsed.data.message);
  if (code === "APPROVAL_REQUIRED" && details?.intentId) {
    result.approval = { intentId: details.intentId, expiresAt: details.expiresAt };
  }
  return result;
}
