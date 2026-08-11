/**
 * OWNER: CORE
 * WHAT: The day-0 unblock for PAY. A fake engine that always ALLOWs and a no-op ledger,
 *       so the gateway can be built end-to-end before the real engine exists.
 * SWAP: PAY changes one import line from "@/core/mock" to "@/core" when P1 lands.
 */
import type { EvaluationResult, Reservation } from "@/shared/types";

export async function evaluatePayment(): Promise<EvaluationResult> {
  return {
    decision: "ALLOW",
    reasons: [{ code: "MOCK", rule: "mock", message: "core/mock always allows" }],
    riskScore: 0,
    riskSignals: [],
    matchedRules: [],
    policyVersion: 0,
    latencyMs: 0,
  };
}

export async function reserveBudget(intentId: string, amountMinor: bigint): Promise<Reservation> {
  return { reservationId: "rsv_mock", intentId, amountMinor, expiresAt: new Date(Date.now() + 120_000) };
}

export async function commitBudget(): Promise<void> {}
export async function releaseBudget(): Promise<void> {}

