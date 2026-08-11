/**
 * OWNER: CORE
 * WHAT: ⭐ Reserve -> commit -> release. This is what makes concurrent overspend impossible.
 *       All three run inside a transaction holding `pg_advisory_xact_lock(agent_id)`,
 *       so only one payment per agent is ever in the check-then-write window.
 * DOCS: ARCHITECTURE.md section 10.2 (the sequence diagram)
 * TESTS: src/core/tests/ledger/ - 50 concurrent intents on a $1 budget
 */
import type { Reservation } from "@/shared/types";

/** Throws BUDGET_EXCEEDED if the windows have no room. TTL 120 seconds. */
export async function reserveBudget(_agentId: string, _intentId: string, _amountMinor: bigint): Promise<Reservation> {
  throw new Error("NOT_IMPLEMENTED: reserveBudget");
}

/** Called after PAYMENT-RESPONSE confirms settlement. */
export async function commitBudget(_reservationId: string, _txHash: string): Promise<void> {
  throw new Error("NOT_IMPLEMENTED: commitBudget");
}

/** Called on every failure path, and by the TTL sweeper. */
export async function releaseBudget(_reservationId: string, _reason: string): Promise<void> {
  throw new Error("NOT_IMPLEMENTED: releaseBudget");
}

/** Sweeper: releases reservations whose TTL elapsed. Wired to /api/v1/cron/sweep. */
export async function sweepExpiredReservations(): Promise<number> {
  throw new Error("NOT_IMPLEMENTED: sweepExpiredReservations");
}

