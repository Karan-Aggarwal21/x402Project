// OWNER: PAY. The security tests for threat T9. These must pass before the demo.
// Every refusal here is a payment that would otherwise have left the wallet unapproved.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

process.env.GUARD_HMAC_SECRET ??= "test-only-secret";
// Throwaway anvil account 0. Signing is offline typed data, so no network and no funds are needed.
process.env.AGENT_WALLET_PRIVATE_KEY ??= "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

import { buildIntentFromRequirements } from "@/payments/intent/build";
import { CAPTURED_REQUIRED } from "@/payments/tests/fixtures";
import { mintAllowToken } from "@/payments/wallet/allowToken";
import { signPaymentPayload } from "@/payments/wallet/signer";
import { readPaymentRequired, type PaymentRequired } from "@/payments/x402/adapter";
import { HEADER, decodePaymentSignature } from "@/payments/x402/headers";
import type { PaymentIntent } from "@/shared/types";

let OFFER: PaymentRequired;

beforeAll(() => {
  OFFER = readPaymentRequired(
    new Response(null, { status: 402, headers: { [HEADER.required]: CAPTURED_REQUIRED } }),
  )!;
});

/** The capture came from localhost:3001, so the intent must agree or the merchant check fires. */
const approvedIntent = (): PaymentIntent =>
  buildIntentFromRequirements({
    agentId: "agt_researchbot",
    requirements: OFFER.accepts[0],
    requestUrl: "http://localhost:3001/api/gw/poc-seller",
    method: "post",
    reason: "signer test",
  });

const withOffer = (patch: Record<string, unknown>): PaymentRequired =>
  ({ ...OFFER, accepts: [{ ...OFFER.accepts[0], ...patch }] }) as PaymentRequired;

afterEach(() => vi.useRealTimers());

describe("signPaymentPayload", () => {
  it("signs when the token is valid and every term still matches", async () => {
    const intent = approvedIntent();
    const { token } = mintAllowToken(intent.intentHash, "evl_test");

    const header = await signPaymentPayload({ intent, paymentRequired: OFFER, allowToken: token });
    const authorization = decodePaymentSignature(header).payload.authorization as Record<string, string>;

    expect(authorization.to).toBe(intent.recipient);
    expect(authorization.value).toBe(intent.amountMinor.toString());
  });

  it("refuses to sign without a valid allowToken", async () => {
    const intent = approvedIntent();
    await expect(signPaymentPayload({ intent, paymentRequired: OFFER, allowToken: "" }))
      .rejects.toThrow(/Malformed allowToken/);
    await expect(signPaymentPayload({ intent, paymentRequired: OFFER, allowToken: "v1.9999999999999.evl.deadbeef" }))
      .rejects.toThrow(/not issued for this intent/);
  });

  it("refuses when the recipient changed after ALLOW", async () => {
    const intent = approvedIntent();
    const { token } = mintAllowToken(intent.intentHash, "evl_test");
    const swapped = withOffer({ payTo: "0x000000000000000000000000000000000000dEaD" });

    await expect(signPaymentPayload({ intent, paymentRequired: swapped, allowToken: token }))
      .rejects.toThrow(/No offer on the wire matches/);
  });

  it("refuses when the amount changed after ALLOW", async () => {
    const intent = approvedIntent();
    const { token } = mintAllowToken(intent.intentHash, "evl_test");

    await expect(signPaymentPayload({ intent, paymentRequired: withOffer({ amount: "2000000" }), allowToken: token }))
      .rejects.toThrow(/No offer on the wire matches/);
  });

  it("refuses when a decoy offer is appended alongside the approved one", async () => {
    const intent = approvedIntent();
    const { token } = mintAllowToken(intent.intentHash, "evl_test");
    const decoy = { ...OFFER.accepts[0], payTo: "0x000000000000000000000000000000000000dEaD" };
    const both = { ...OFFER, accepts: [decoy, OFFER.accepts[0]] } as PaymentRequired;

    const header = await signPaymentPayload({ intent, paymentRequired: both, allowToken: token });
    const authorization = decodePaymentSignature(header).payload.authorization as Record<string, string>;

    // narrowToOffer must have removed the decoy before the SDK's selector ever saw it.
    expect(authorization.to).toBe(intent.recipient);
  });

  it("refuses a replayed allowToken", async () => {
    const intent = approvedIntent();
    const { token } = mintAllowToken(intent.intentHash, "evl_test");

    await signPaymentPayload({ intent, paymentRequired: OFFER, allowToken: token });
    await expect(signPaymentPayload({ intent, paymentRequired: OFFER, allowToken: token }))
      .rejects.toThrow(/already used/);
  });

  it("refuses an expired allowToken", async () => {
    const intent = approvedIntent();
    const { token } = mintAllowToken(intent.intentHash, "evl_test");

    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 61_000);

    await expect(signPaymentPayload({ intent, paymentRequired: OFFER, allowToken: token }))
      .rejects.toThrow(/expired/);
  });

  it("refuses a token minted for a different intent", async () => {
    const intent = approvedIntent();
    const { token } = mintAllowToken(approvedIntent().intentHash, "evl_test");

    await expect(signPaymentPayload({ intent, paymentRequired: OFFER, allowToken: token }))
      .rejects.toThrow(/not issued for this intent/);
  });

  it("refuses an intent whose terms were mutated after it was hashed", async () => {
    const intent = approvedIntent();
    const { token } = mintAllowToken(intent.intentHash, "evl_test");
    const tampered = { ...intent, amountMinor: 2_000_000n };

    await expect(signPaymentPayload({ intent: tampered, paymentRequired: OFFER, allowToken: token }))
      .rejects.toThrow(/do not match its own intentHash/);
  });

  it("refuses an offer served by a merchant other than the one approved", async () => {
    const intent = approvedIntent();
    const { token } = mintAllowToken(intent.intentHash, "evl_test");
    const elsewhere = { ...OFFER, resource: { ...OFFER.resource, url: "http://evil.example.com/api/x" } } as PaymentRequired;

    await expect(signPaymentPayload({ intent, paymentRequired: elsewhere, allowToken: token }))
      .rejects.toThrow(/but localhost:3001 was approved/);
  });
});
