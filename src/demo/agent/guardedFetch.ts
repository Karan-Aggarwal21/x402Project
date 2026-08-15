// OWNER: DEMO. The agent's ONLY route to the outside world: POST /api/gw/request.
// One credential, one endpoint — no private key, no RPC, no signer. A 402 is data, never a throw.
import { z } from "zod";
import { env } from "@/shared/env";

export interface GuardedResult {
  ok: boolean;
  blocked?: { code: string; message: string };
  data?: unknown;
  txHash?: string;
}

export interface GuardedOptions {
  // The caller's own ceiling, enforced by the gateway before policy is even asked (D2).
  maxAmountUsd?: string;
}

const GUARD_KEY = "gk_live_researchbot_demo";
const GUARD_KEY_HEADER = "X-Guard-Key";

const successEnvelope = z.object({
  status: z.literal(true),
  data: z.object({
    onChain: z.object({ txHash: z.string().nullable() }).passthrough(),
    response: z.unknown(),
  }).passthrough(),
});

const failureEnvelope = z.object({
  status: z.literal(false),
  message: z.string(),
  error: z.object({ code: z.string() }).passthrough(),
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
      ? { ok: true, data: parsed.data.data.response, txHash: parsed.data.data.onChain.txHash ?? undefined }
      : blockedResult("GUARD_UNAVAILABLE", "Guard returned a malformed success envelope.");
  }

  const parsed = failureEnvelope.safeParse(json);
  return parsed.success
    ? blockedResult(parsed.data.error.code, parsed.data.message)
    : blockedResult("GUARD_UNAVAILABLE", `Guard returned ${response.status} without a readable envelope.`);
}
