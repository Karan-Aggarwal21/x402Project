// OWNER: PAY. The main flow: forward -> 402 -> evaluate -> reserve -> sign -> retry -> settle -> commit.
// Once a reservation exists, every exit path releases it. A leak silently shrinks the agent's budget.
import { commitBudget, evaluatePayment, releaseBudget, reserveBudget } from "@/core/mock";
import { buildIntentFromRequirements, resolveTarget } from "@/payments/intent/build";
import { forwardToMerchant } from "@/payments/gateway/forward";
import { mintAllowToken } from "@/payments/wallet/allowToken";
import { signPaymentPayload } from "@/payments/wallet/signer";
import { readPaymentRequired, readSettlement } from "@/payments/x402/adapter";
import { newId } from "@/shared/ids";
import { toMinor, toUsd } from "@/shared/money";
import type { Decision, PaymentIntent, Reason } from "@/shared/types";

const EXPLORER = "https://sepolia.basescan.org/tx/";

export interface GuardedRequestInput {
  agentId: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: unknown;
  maxAmountUsd?: string;
  reason?: string;
  idempotencyKey?: string;
}

export interface GuardedRequestResult {
  status: "SETTLED" | "BLOCKED" | "PENDING_APPROVAL" | "FAILED";
  intentId: string;
  decision: Decision;
  reasons: Reason[];
  merchant: string;
  resource: string;
  amountUsd: string | null;
  payment?: { amount: string; txHash: `0x${string}`; explorerUrl: string; settledAt: string };
  onChain: { signed: boolean; txHash: string | null };
  response?: { status: number; headers: Record<string, string>; body: unknown };
}

const UNSIGNED = { signed: false, txHash: null } as const;

function reason(code: string, message: string, rule = "gateway"): Reason {
  return { code, rule, message };
}

/** Anything thrown past the reservation carries an ERROR_CODES key when we know one. */
function failureReason(error: unknown): Reason {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : "UPSTREAM_UNAVAILABLE";
  return reason(code, error instanceof Error ? error.message : String(error));
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function describe(response: Response): Promise<GuardedRequestResult["response"]> {
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers),
    body: await readBody(response),
  };
}

export async function runGuardedRequest(input: GuardedRequestInput): Promise<GuardedRequestResult> {
  const { agentId, url, method, headers, body, maxAmountUsd, reason: why } = input;

  const target = resolveTarget(url, method);

  const unpaid = await forwardToMerchant({ url, method, headers, body });
  const paymentRequired = readPaymentRequired(unpaid);

  if (!paymentRequired) {
    // No 402 means either a free resource or an upstream fault. Only a 2xx is a free resource —
    // anything else reported as SETTLED would tell the agent a failed call succeeded.
    const free = unpaid.ok;
    return {
      status: free ? "SETTLED" : "FAILED",
      intentId: newId("intent"),
      ...target,
      amountUsd: null,
      decision: "ALLOW",
      reasons: [free
        ? reason("NO_PAYMENT_REQUIRED", "The merchant served this resource without charging.")
        : reason("UPSTREAM_UNAVAILABLE", `Merchant returned ${unpaid.status} before any payment was quoted.`)],
      onChain: UNSIGNED,
      response: await describe(unpaid),
    };
  }

  const intent: PaymentIntent = buildIntentFromRequirements({
    agentId,
    requirements: paymentRequired.accepts[0],
    requestUrl: url,
    method,
    reason: why,
  });

  // The agent's own declared ceiling, checked before CORE is even asked. maxAmountUsd is dollars,
  // so toMinor is right here — unlike the wire amount, which already arrives in minor units.
  if (maxAmountUsd && intent.amountMinor > toMinor(maxAmountUsd)) {
    return {
      status: "BLOCKED",
      intentId: intent.intentId,
      ...target,
      amountUsd: toUsd(intent.amountMinor),
      decision: "BLOCK",
      reasons: [reason(
        "PER_TRANSACTION_LIMIT_EXCEEDED",
        `Quoted ${toUsd(intent.amountMinor)} exceeds the caller's maxAmountUsd of ${maxAmountUsd}.`,
        "gateway.maxAmountUsd",
      )],
      onChain: UNSIGNED,
    };
  }

  const evaluation = await evaluatePayment({ intent } as any);
  if (evaluation.decision !== "ALLOW") {
    return {
      status: evaluation.decision === "HOLD" ? "PENDING_APPROVAL" : "BLOCKED",
      intentId: intent.intentId,
      ...target,
      amountUsd: toUsd(intent.amountMinor),
      decision: evaluation.decision,
      reasons: evaluation.reasons,
      onChain: UNSIGNED,
    };
  }

  // TODO(PAY): C7 must capture the returned reservationId and pass it to commit/release, which the
  // real @/core API requires and the mock does not accept. See blocker B7.
  const reservation = await reserveBudget(agentId, intent.intentId, intent.amountMinor);

  try {
    const allowToken = mintAllowToken(intent.intentHash, newId("evaluation")).token;
    const paymentSignature = await signPaymentPayload({ intent, paymentRequired, allowToken });

    const paid = await forwardToMerchant({ url, method, headers, body, paymentSignature });
    if (!paid.ok) {
      // A second 402 means the merchant rejected our payment; anything else is an upstream fault.
      const code = paid.status === 402 ? "SETTLEMENT_FAILED" : "UPSTREAM_UNAVAILABLE";
      throw Object.assign(new Error(`Merchant returned ${paid.status} to the paid request.`), { code });
    }

    const settlement = readSettlement(paid);
    await commitBudget(reservation.reservationId, settlement.txHash);

    return {
      status: "SETTLED",
      intentId: intent.intentId,
      ...target,
      amountUsd: toUsd(intent.amountMinor),
      decision: "ALLOW",
      reasons: evaluation.reasons,
      payment: {
        amount: toUsd(intent.amountMinor),
        txHash: settlement.txHash,
        explorerUrl: `${EXPLORER}${settlement.txHash}`,
        settledAt: settlement.settledAt.toISOString(),
      },
      onChain: { signed: true, txHash: settlement.txHash },
      response: await describe(paid),
    };
  } catch (error) {
    // Signing, retry, timeout, verify, settle — whichever failed, the reservation goes back.
    await releaseBudget(reservation.reservationId, "settlement failed");
    return {
      status: "FAILED",
      intentId: intent.intentId,
      ...target,
      amountUsd: toUsd(intent.amountMinor),
      decision: "ALLOW",
      reasons: [failureReason(error)],
      onChain: UNSIGNED,
    };
  }
}
