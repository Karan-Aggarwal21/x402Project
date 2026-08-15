// OWNER: PAY. The x402 SDK boundary — if the SDK surface changes, this folder is what changes.
// Split into read / sign / read so the policy decision fits between knowing the price and paying it.
import { x402Client, x402HTTPClient } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import type { ClientEvmSigner } from "@x402/evm";
import type { PaymentRequirements } from "@x402/core/types";
import {
  HEADER,
  PaymentHeaderError,
  decodePaymentRequired,
  decodePaymentResponse,
  encodePaymentSignature,
} from "@/payments/x402/headers";
import type { PaymentRequired } from "@/payments/x402/headers";
import type { SettlementResult } from "@/shared/types";

export type { ClientEvmSigner } from "@x402/evm";
export type { PaymentRequirements } from "@x402/core/types";
export type { PaymentPayload, PaymentRequired } from "@/payments/x402/headers";

/** Reads the merchant's price. `null` means the resource was free, so there is nothing to judge. */
export function readPaymentRequired(response: Response): PaymentRequired | null {
  if (response.status !== 402) return null;
  const header = response.headers.get(HEADER.required);
  if (!header) {
    throw new PaymentHeaderError(
      "INVALID_PAYMENT_REQUIREMENTS",
      `Merchant returned 402 without a ${HEADER.required} header.`,
    );
  }
  return decodePaymentRequired(header);
}

/**
 * Rebuilds the offer envelope around the single approved entry, so the SDK's selector cannot
 * choose a different one than the policy engine judged. This is the binding that closes threat T9.
 */
export function narrowToOffer(paymentRequired: PaymentRequired, offer: PaymentRequirements): PaymentRequired {
  return { ...paymentRequired, accepts: [offer] };
}

/**
 * Signs an approved offer and returns the PAYMENT-SIGNATURE header value.
 * Signs whatever it is handed — narrow with {@link narrowToOffer} and check the allowToken first.
 */
export async function createPaymentSignature(
  paymentRequired: PaymentRequired,
  signer: ClientEvmSigner,
): Promise<string> {
  const client = new x402Client();
  for (const offer of paymentRequired.accepts) {
    client.register(offer.network, new ExactEvmScheme(signer));
  }
  const payload = await new x402HTTPClient(client).createPaymentPayload(paymentRequired);
  return encodePaymentSignature(payload);
}

/** Reads the settlement confirmation. A paid response without one has not proven anything. */
export function readSettlement(response: Response): SettlementResult {
  const header = response.headers.get(HEADER.response);
  if (!header) {
    throw new PaymentHeaderError(
      "SETTLEMENT_FAILED",
      `Merchant returned ${response.status} without a ${HEADER.response} header.`,
    );
  }
  return decodePaymentResponse(header);
}
