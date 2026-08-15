// OWNER: PAY. Header codecs against the REAL captures in ./fixtures.ts, never invented values.
import { describe, expect, it } from "vitest";
import {
  PaymentHeaderError,
  decodePaymentRequired,
  decodePaymentResponse,
  decodePaymentSignature,
  encodePaymentSignature,
} from "@/payments/x402/headers";
import { CAPTURED_REQUIRED, CAPTURED_RESPONSE, CAPTURED_SIGNATURE, SETTLED_TX_HASH, asHeader } from "@/payments/tests/fixtures";


/** Every field the policy engine judges, as it really arrived. */
const offer = () => decodePaymentRequired(CAPTURED_REQUIRED).accepts[0];

describe("decodePaymentRequired", () => {
  it("decodes the real C1 capture", () => {
    expect(decodePaymentRequired(CAPTURED_REQUIRED).x402Version).toBe(2);
    expect(offer()).toMatchObject({
      scheme: "exact",
      network: "eip155:84532",
      amount: "10000",
      asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      payTo: "0x2de7B9388C249D20800bA097eD5DEb66e4437Dc4",
    });
  });

  it("keeps the amount as integer minor units, never a float", () => {
    expect(offer().amount).toBe("10000");
    expect(BigInt(offer().amount)).toBe(10_000n);
  });

  it("rejects a malformed header with INVALID_PAYMENT_REQUIREMENTS instead of a raw parse error", () => {
    expect(() => decodePaymentRequired("not base64 !!")).toThrow(PaymentHeaderError);
    try {
      decodePaymentRequired("not base64 !!");
    } catch (error) {
      expect((error as PaymentHeaderError).code).toBe("INVALID_PAYMENT_REQUIREMENTS");
    }
  });

  it("rejects an empty header", () => {
    expect(() => decodePaymentRequired("")).toThrow(PaymentHeaderError);
  });

  it("rejects well-formed base64 JSON that is not a payment offer", () => {
    expect(() => decodePaymentRequired(asHeader({}))).toThrow(/not a usable payment offer/);
  });

  it("rejects an offer with no accepted payment methods", () => {
    expect(() => decodePaymentRequired(asHeader({ x402Version: 2, accepts: [] }))).toThrow(PaymentHeaderError);
  });

  it("rejects a merchant quoting dollars instead of minor units", () => {
    const dollars = {
      x402Version: 2,
      accepts: [{ ...offer(), amount: "0.01" }],
    };
    expect(() => decodePaymentRequired(asHeader(dollars))).toThrow(PaymentHeaderError);
  });
});

describe("encodePaymentSignature", () => {
  it("round-trips a real C1 payload", () => {
    const payload = decodePaymentSignature(CAPTURED_SIGNATURE);
    expect(decodePaymentSignature(encodePaymentSignature(payload))).toEqual(payload);
  });

  it("preserves the signed authorization byte for byte", () => {
    const payload = decodePaymentSignature(CAPTURED_SIGNATURE);
    expect(encodePaymentSignature(payload)).toBe(CAPTURED_SIGNATURE);
  });
});

describe("decodePaymentResponse", () => {
  it("extracts the tx hash from the real C1 capture", () => {
    const settlement = decodePaymentResponse(CAPTURED_RESPONSE);
    expect(settlement.txHash).toBe(SETTLED_TX_HASH);
    expect(settlement.settledAt).toBeInstanceOf(Date);
  });

  it("fails closed when the facilitator reports failure", () => {
    const failed = asHeader({ success: false, transaction: "", network: "eip155:84532", errorReason: "insufficient_funds" });
    expect(() => decodePaymentResponse(failed)).toThrow(/insufficient_funds/);
    try {
      decodePaymentResponse(failed);
    } catch (error) {
      expect((error as PaymentHeaderError).code).toBe("SETTLEMENT_FAILED");
    }
  });

  it("fails closed when success is claimed without a usable transaction hash", () => {
    const bogus = asHeader({ success: true, transaction: "0xnope", network: "eip155:84532" });
    expect(() => decodePaymentResponse(bogus)).toThrow(/transaction hash/);
  });
});
