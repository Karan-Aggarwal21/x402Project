// OWNER: PAY. Fake signer + facilitator, so CORE, UI and DEMO can run the whole flow with no
// chain, no RPC and no funded wallet. Mirrors the adapter surface, enabled by USE_MOCKS=1.
import type { PaymentRequired } from "@/payments/x402/adapter";
import type { SettlementResult } from "@/shared/types";

/** Obviously fake, but still a well-formed 32-byte hash so validation behaves as in production. */
export const MOCK_TX_HASH = `0x${"deadbeef".repeat(8)}` as `0x${string}`;

export async function createPaymentSignature(paymentRequired: PaymentRequired): Promise<string> {
  const payload = { x402Version: paymentRequired.x402Version, payload: { mock: true } };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

export function readSettlement(_response?: Response): SettlementResult {
  return { txHash: MOCK_TX_HASH, settledAt: new Date(), raw: { mock: true } };
}
