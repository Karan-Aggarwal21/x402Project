/**
 * OWNER: PAY
 * WHAT: Fake signer + fake facilitator so CORE, UI and DEMO can run the whole flow with no chain,
 *       no RPC and no funded wallet. Enabled by USE_MOCKS=1.
 * DOCS: REPO_STRUCTURE.md - "the mock rule"
 */
import type { SettlementResult } from "@/shared/types";

export async function mockSign(): Promise<string> {
  return "mock-payment-signature";
}

export async function mockSettle(): Promise<SettlementResult> {
  return {
    txHash: "0xmock0000000000000000000000000000000000000000000000000000000000",
    settledAt: new Date(),
    raw: { mock: true },
  };
}

