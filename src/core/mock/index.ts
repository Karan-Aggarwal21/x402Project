// OWNER: CORE. The day-0 unblock for PAY: a fake engine that always ALLOWs and a no-op ledger.
// Signatures mirror @/core exactly, so swapping the import is the only change PAY has to make.
import type { EvaluatePaymentInput } from "@/core/policy/context";
import { RESERVATION_TTL_MS } from "@/core/budget/ledger";
import type { EvaluationResult, Reservation } from "@/shared/types";

export async function evaluatePayment(_input: EvaluatePaymentInput): Promise<EvaluationResult> {
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

export async function reserveBudget(
  _agentId: string,
  intentId: string,
  amountMinor: bigint,
): Promise<Reservation> {
  return {
    reservationId: "rsv_mock",
    intentId,
    amountMinor,
    expiresAt: new Date(Date.now() + RESERVATION_TTL_MS),
  };
}

export async function commitBudget(_reservationId: string, _txHash: string): Promise<void> {}
export async function releaseBudget(_reservationId: string, _reason: string): Promise<void> {}
export async function sweepExpiredReservations(): Promise<number> {
  return 0;
}
