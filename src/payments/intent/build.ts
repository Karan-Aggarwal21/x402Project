/**
 * OWNER: PAY
 * WHAT: PAYMENT-REQUIRED -> canonical PaymentIntent. Resolves the merchant from the request host.
 * PHASE: P3
 * DOCS: API_DOCS.md section 3.1
 */
import type { PaymentIntent } from "@/shared/types";
import type { PaymentRequirements } from "@/payments/x402/adapter";

export interface BuildIntentInput {
  agentId: string;
  requirements: PaymentRequirements;
  requestUrl: string;
  method: string;
  reason?: string;
}

export function buildIntentFromRequirements(_input: BuildIntentInput): PaymentIntent {
  // Must: convert amount -> bigint minor units, derive merchant from the URL host,
  // generate a nonce, compute intentHash, set state = "EVALUATING".
  throw new Error("NOT_IMPLEMENTED: buildIntentFromRequirements");
}

