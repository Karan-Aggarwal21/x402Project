/**
 * OWNER: CORE
 * WHAT: Does the I/O the engine refuses to do, then calls the pure engine.
 *       Loads the active policy, spend counters, merchant record and wallet allowance,
 *       writes the evaluation + audit row, and returns the decision.
 * NOTE: This is the file that may touch the database. `engine.ts` may not.
 */
import type { EvaluationResult, PaymentIntent } from "@/shared/types";

export interface EvaluatePaymentInput {
  intent: PaymentIntent;
  idempotencyKey?: string;
}

export async function evaluatePayment(_input: EvaluatePaymentInput): Promise<EvaluationResult> {
  // On ANY error: log it and return a BLOCK with GUARD_UNAVAILABLE. Never rethrow to the caller
  // in a way that could be interpreted as "allow".
  throw new Error("NOT_IMPLEMENTED: evaluatePayment");
}

