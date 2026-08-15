/**
 * OWNER: CORE
 * ⭐ The core decision endpoint. POST /api/v1/payments/evaluate
 * FLOW: authenticate -> validate -> build context -> evaluate -> reserve on ALLOW -> audit -> respond
 * DOCS: API_DOCS.md section 4.2
 */
import { z } from "zod";
import { writeAudit } from "@/core/audit/log";
import { GUARD_KEY_HEADER, authenticateAgent } from "@/core/auth/agentKey";
import { checkRateLimit } from "@/core/auth/rateLimit";
import { reserveBudget } from "@/core/budget/ledger";
import { setIntentState } from "@/core/db/queries";
import { handle, parseBody } from "@/core/handlers/guards";
import { evaluatePayment } from "@/core/policy/context";
import { ERROR_CODES, type ErrorCode } from "@/shared/errors";
import { fail, ok } from "@/shared/http";
import { newId } from "@/shared/ids";
import { toMinor, toUsd } from "@/shared/money";
import type { PaymentIntent } from "@/shared/types";

const RATE_LIMIT_PER_MINUTE = 60;

const evaluateSchema = z.object({
  amountUsd: z.string().regex(/^\d+(\.\d{1,6})?$/),
  asset: z.string().min(1).max(80),
  network: z.string().min(1).max(80),
  recipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  merchant: z.string().min(1).max(255),
  resource: z.string().min(1).max(500),
  reason: z.string().max(500).optional(),
  nonce: z.string().min(1).max(200).optional(),
  intentHash: z.string().min(1).max(200).optional(),
  idempotencyKey: z.string().max(200).optional(),
});

const asErrorCode = (code: string | undefined): ErrorCode =>
  code && code in ERROR_CODES ? (code as ErrorCode) : "GUARD_UNAVAILABLE";

export const POST = async (request: Request): Promise<Response> =>
  handle("POST /api/v1/payments/evaluate", async () => {
    const agent = await authenticateAgent(request);
    if (!agent) return fail("GUARD_UNAVAILABLE", { header: GUARD_KEY_HEADER }, "Agent key missing or not recognised.");

    // 429 is transport hygiene and is deliberately not the policy velocity 402.
    if (!(await checkRateLimit(agent.agentId, RATE_LIMIT_PER_MINUTE))) {
      return fail("RATE_LIMITED", { agentId: agent.agentId });
    }

    const parsed = await parseBody(request, evaluateSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const intentId = newId("intent");
    const intent: PaymentIntent = {
      intentId,
      agentId: agent.agentId,
      amountMinor: toMinor(body.amountUsd),
      asset: body.asset,
      network: body.network,
      recipient: body.recipient as `0x${string}`,
      merchant: body.merchant,
      resource: body.resource,
      reason: body.reason,
      nonce: body.nonce ?? intentId,
      intentHash: body.intentHash ?? intentId,
      state: "EVALUATING",
      createdAt: new Date(),
    };

    const evaluation = await evaluatePayment({ intent, idempotencyKey: body.idempotencyKey });

    const payload = {
      intentId,
      decision: evaluation.decision,
      amountUsd: toUsd(intent.amountMinor),
      merchant: intent.merchant,
      resource: intent.resource,
      reasons: evaluation.reasons,
      riskScore: evaluation.riskScore,
      riskSignals: evaluation.riskSignals,
      matchedRules: evaluation.matchedRules,
      policyVersion: evaluation.policyVersion,
      latencyMs: evaluation.latencyMs,
    };

    if (evaluation.decision === "BLOCK") {
      const [first] = evaluation.reasons;
      // txHash is spelled out as null so the refusal carries its own proof that nothing settled.
      return fail(asErrorCode(first?.code), { ...payload, txHash: null }, first?.message);
    }

    if (evaluation.decision === "HOLD") {
      return ok({ ...payload, txHash: null }, 202, "Payment is awaiting human review.");
    }

    // ALLOW: hold the money before the caller is told it may spend, or two payments race the budget.
    try {
      const reservation = await reserveBudget(agent.agentId, intentId, intent.amountMinor);
      await setIntentState(intentId, "RESERVED");
      await writeAudit(
        "BUDGET_RESERVED",
        { reservationId: reservation.reservationId, amountUsd: toUsd(reservation.amountMinor) },
        `agent:${agent.agentId}`,
        { agentId: agent.agentId, intentId, live: "budget" },
      );

      return ok({
        ...payload,
        reservationId: reservation.reservationId,
        expiresAt: reservation.expiresAt.toISOString(),
      });
    } catch (error) {
      // The engine said yes and the ledger said no. The ledger wins — it is the one holding money.
      const code = asErrorCode((error as { code?: string }).code);
      await setIntentState(intentId, "BLOCKED");
      return fail(code, { ...payload, decision: "BLOCK", txHash: null }, (error as Error).message);
    }
  });
