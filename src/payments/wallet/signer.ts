/**
 * OWNER: PAY
 * WHAT: The private key lives here and nowhere else. Signs a payment payload ONLY when:
 *       1. the allowToken verifies, and
 *       2. every field of the intent matches the approved intentHash.
 * SECURITY: SEC-3, SEC-4. The agent process can never reach this module.
 */
import type { PaymentIntent } from "@/shared/types";
import type { PaymentRequirements } from "@/payments/x402/adapter";

export interface SignInput {
  intent: PaymentIntent;
  requirements: PaymentRequirements;
  allowToken: string;
}

export async function signPaymentPayload(_input: SignInput): Promise<string> {
  // 1. verifyAllowToken(token, intent.intentHash)
  // 2. recompute the hash from the live requirements and compare, field by field
  // 3. only then sign
  throw new Error("NOT_IMPLEMENTED: signPaymentPayload");
}

