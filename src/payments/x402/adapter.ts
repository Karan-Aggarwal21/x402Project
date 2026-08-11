/**
 * OWNER: PAY
 * WHAT: The ONLY file in the repo allowed to import the x402 SDK.
 *       If the real SDK surface differs from the docs, this is the single file that changes.
 * PHASE: P3 (shapes discovered in P0)
 * DOCS: ARCHITECTURE.md section 5, Docs/x402-notes.md
 */
// import { wrapFetchWithPayment } from "@x402/fetch";   // enable after P0 pins the version
// import { createSigner } from "@x402/evm";

import type { PaymentIntent, SettlementResult } from "@/shared/types";

/** Requirements as they arrive in the PAYMENT-REQUIRED header. */
export interface PaymentRequirements {
  amount: string;
  asset: string;
  network: string;
  payTo: `0x${string}`;
  scheme: string;
  resource?: string;
}

/** Sends the original request unpaid and returns the 402 requirements, or null if it was free. */
export async function fetchPaymentRequirements(_url: string, _init: RequestInit): Promise<PaymentRequirements | null> {
  throw new Error("NOT_IMPLEMENTED: fetchPaymentRequirements");
}

/** Retries the request with PAYMENT-SIGNATURE and returns the settled response. */
export async function retryWithPayment(
  _url: string,
  _init: RequestInit,
  _paymentSignature: string,
): Promise<{ response: Response; settlement: SettlementResult }> {
  throw new Error("NOT_IMPLEMENTED: retryWithPayment");
}

/** Builds the signed payment payload for an approved intent. */
export async function createPaymentPayload(_intent: PaymentIntent, _req: PaymentRequirements): Promise<string> {
  throw new Error("NOT_IMPLEMENTED: createPaymentPayload");
}

