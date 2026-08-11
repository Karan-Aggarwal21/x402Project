/**
 * OWNER: PAY
 * WHAT: Public API of the payments division. The only surface other divisions import.
 * RULE: Add an export here deliberately. Everything else stays internal.
 */
export { runGuardedRequest } from "@/payments/gateway/orchestrator";
export { buildIntentFromRequirements } from "@/payments/intent/build";
export { signPaymentPayload } from "@/payments/wallet/signer";
export type { GuardedRequestInput, GuardedRequestResult } from "@/payments/gateway/orchestrator";

