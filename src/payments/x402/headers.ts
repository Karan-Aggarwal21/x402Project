/**
 * OWNER: PAY
 * WHAT: Codecs for the three x402 headers. Base64-encoded JSON.
 *       PAYMENT-REQUIRED -> PAYMENT-SIGNATURE -> PAYMENT-RESPONSE
 * DOCS: ARCHITECTURE.md section 5.1
 */
import type { PaymentRequirements } from "@/payments/x402/adapter";

export const HEADER = {
  required: "PAYMENT-REQUIRED",
  signature: "PAYMENT-SIGNATURE",
  response: "PAYMENT-RESPONSE",
} as const;

export function decodePaymentRequired(_headerValue: string): PaymentRequirements {
  throw new Error("NOT_IMPLEMENTED: decodePaymentRequired");
}

export function encodePaymentSignature(_payload: unknown): string {
  throw new Error("NOT_IMPLEMENTED: encodePaymentSignature");
}

export function decodePaymentResponse(_headerValue: string): { txHash: `0x${string}`; raw: unknown } {
  throw new Error("NOT_IMPLEMENTED: decodePaymentResponse");
}

