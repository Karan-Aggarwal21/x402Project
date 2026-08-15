// OWNER: PAY. Codecs for the three x402 protocol headers, plus the validation the SDK omits.
// Protocol-defined headers: never wrapped in the API envelope (see ../../CLAUDE.md section 1).
import { z } from "zod";
import {
  decodePaymentRequiredHeader,
  decodePaymentResponseHeader,
  decodePaymentSignatureHeader,
  encodePaymentSignatureHeader,
} from "@x402/core/http";
import type { PaymentPayload, PaymentRequired } from "@x402/core/types";
import type { ErrorCode } from "@/shared/errors";
import type { SettlementResult } from "@/shared/types";

export type { PaymentPayload, PaymentRequired } from "@x402/core/types";

export const HEADER = {
  required: "PAYMENT-REQUIRED",
  signature: "PAYMENT-SIGNATURE",
  response: "PAYMENT-RESPONSE",
} as const;

/** Carries an ERROR_CODES key so the gateway maps a bad header straight to fail() (../../CLAUDE.md section 1). */
export class PaymentHeaderError extends Error {
  constructor(readonly code: ErrorCode, message: string) {
    super(message);
    this.name = "PaymentHeaderError";
  }
}

// The SDK decoders check base64 shape and JSON.parse, nothing more — an empty object decodes
// happily. These schemas are what makes an unreadable offer a BLOCK (../../CLAUDE.md rule 2).
const requirementsSchema = z.object({
  scheme: z.string().min(1),
  network: z.string().min(1),
  // Integer minor units as a string. A float here would mean the merchant is quoting dollars.
  amount: z.string().regex(/^\d+$/),
  asset: z.string().min(1),
  payTo: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
});

const paymentRequiredSchema = z.object({
  x402Version: z.number().int().positive(),
  accepts: z.array(requirementsSchema).min(1),
});

const paymentPayloadSchema = z.object({
  x402Version: z.number().int().positive(),
  payload: z.object({}).passthrough(),
});

const settleResponseSchema = z.object({
  success: z.boolean(),
  transaction: z.string(),
  network: z.string().min(1),
  errorReason: z.string().optional(),
});

const TX_HASH = /^0x[0-9a-fA-F]{64}$/;

function decodeOrThrow(
  headerValue: string,
  name: string,
  code: ErrorCode,
  decoder: (value: string) => unknown,
): unknown {
  if (!headerValue) throw new PaymentHeaderError(code, `Missing ${name} header.`);
  try {
    return decoder(headerValue);
  } catch {
    throw new PaymentHeaderError(code, `${name} header is not valid base64-encoded JSON.`);
  }
}

export function decodePaymentRequired(headerValue: string): PaymentRequired {
  const raw = decodeOrThrow(headerValue, HEADER.required, "INVALID_PAYMENT_REQUIREMENTS", decodePaymentRequiredHeader);
  if (!paymentRequiredSchema.safeParse(raw).success) {
    throw new PaymentHeaderError("INVALID_PAYMENT_REQUIREMENTS", `${HEADER.required} header is not a usable payment offer.`);
  }
  return raw as PaymentRequired;
}

export function encodePaymentSignature(payload: PaymentPayload): string {
  return encodePaymentSignatureHeader(payload);
}

export function decodePaymentSignature(headerValue: string): PaymentPayload {
  const raw = decodeOrThrow(headerValue, HEADER.signature, "INVALID_PAYMENT_REQUIREMENTS", decodePaymentSignatureHeader);
  if (!paymentPayloadSchema.safeParse(raw).success) {
    throw new PaymentHeaderError("INVALID_PAYMENT_REQUIREMENTS", `${HEADER.signature} header is not a usable payment payload.`);
  }
  return raw as PaymentPayload;
}

/** A settlement we cannot read is a settlement we cannot prove, so it fails closed rather than reporting success. */
export function decodePaymentResponse(headerValue: string): SettlementResult {
  const raw = decodeOrThrow(headerValue, HEADER.response, "SETTLEMENT_FAILED", decodePaymentResponseHeader);
  const parsed = settleResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new PaymentHeaderError("SETTLEMENT_FAILED", `${HEADER.response} header is not a usable settlement result.`);
  }
  const { success, transaction, errorReason } = parsed.data;
  if (!success) {
    throw new PaymentHeaderError("SETTLEMENT_FAILED", errorReason ?? "The facilitator reported settlement failure.");
  }
  if (!TX_HASH.test(transaction)) {
    throw new PaymentHeaderError("SETTLEMENT_FAILED", `Settlement reported success without a usable transaction hash.`);
  }
  // The header carries no timestamp, so settledAt is when we read the confirmation.
  return { txHash: transaction as `0x${string}`, settledAt: new Date(), raw };
}
