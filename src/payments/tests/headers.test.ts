// OWNER: PAY. Header codecs against the REAL captures recorded in C1 (../../../../Docs/x402-notes.md).
// Every base64 string below crossed the wire during tx 0x3646125c…4eda9 on Base Sepolia.
import { describe, expect, it } from "vitest";
import {
  PaymentHeaderError,
  decodePaymentRequired,
  decodePaymentResponse,
  decodePaymentSignature,
  encodePaymentSignature,
} from "@/payments/x402/headers";

const CAPTURED_REQUIRED =
  "eyJ4NDAyVmVyc2lvbiI6MiwiZXJyb3IiOiJQYXltZW50IHJlcXVpcmVkIiwicmVzb3VyY2UiOnsidXJsIjoiaHR0cDovL2xvY2FsaG9zdDozMDAxL2FwaS9ndy9wb2Mtc2VsbGVyIiwiZGVzY3JpcHRpb24iOiJQQVkgQzEgc3Bpa2Ug4oCUIHRocm93YXdheSBwYWlkIGVuZHBvaW50IiwibWltZVR5cGUiOiIifSwiYWNjZXB0cyI6W3sic2NoZW1lIjoiZXhhY3QiLCJuZXR3b3JrIjoiZWlwMTU1Ojg0NTMyIiwiYW1vdW50IjoiMTAwMDAiLCJhc3NldCI6IjB4MDM2Q2JENTM4NDJjNTQyNjYzNGU3OTI5NTQxZUMyMzE4ZjNkQ0Y3ZSIsInBheVRvIjoiMHgyZGU3QjkzODhDMjQ5RDIwODAwYkEwOTdlRDVERWI2NmU0NDM3RGM0IiwibWF4VGltZW91dFNlY29uZHMiOjMwMCwiZXh0cmEiOnsibmFtZSI6IlVTREMiLCJ2ZXJzaW9uIjoiMiJ9fV19";

const CAPTURED_SIGNATURE =
  "eyJ4NDAyVmVyc2lvbiI6MiwicGF5bG9hZCI6eyJhdXRob3JpemF0aW9uIjp7ImZyb20iOiIweDBEM0NhQzVmMjc3MDVDNGM3MjE4NUI4Qjc0QTU0M0YzNTMwRjg0ZWYiLCJ0byI6IjB4MmRlN0I5Mzg4QzI0OUQyMDgwMGJBMDk3ZUQ1REViNjZlNDQzN0RjNCIsInZhbHVlIjoiMTAwMDAiLCJ2YWxpZEFmdGVyIjoiMCIsInZhbGlkQmVmb3JlIjoiMTc4NjczNDg3OSIsIm5vbmNlIjoiMHg1ZTU1ZGM5NWZmYjk4YzNjNzhkYzllZjk4ZWMxMTY4YTNiZmU0YmFlYjg2ZDIyYjMxMzZmMjNhYzc1OWE5OWZlIn0sInNpZ25hdHVyZSI6IjB4MTIzZjJmNTU1ZjFhNmIwNTM2MzdlMzY1Mzg3ODc2M2E1ZjYwMTI3ZDA3NTNmMTcyYmRlYjllY2RiYjA2ZTM1YjVkZWQ5N2MzNzliZWJmMjM2NWIxNWNlMTJjMGQ0OTQ3Zjg3N2FkZGFlN2U1MjkwODk5M2E2YWZiODVkMjk1MDAxYyJ9LCJyZXNvdXJjZSI6eyJ1cmwiOiJodHRwOi8vbG9jYWxob3N0OjMwMDEvYXBpL2d3L3BvYy1zZWxsZXIiLCJkZXNjcmlwdGlvbiI6IlBBWSBDMSBzcGlrZSDigJQgdGhyb3dhd2F5IHBhaWQgZW5kcG9pbnQiLCJtaW1lVHlwZSI6IiJ9LCJhY2NlcHRlZCI6eyJzY2hlbWUiOiJleGFjdCIsIm5ldHdvcmsiOiJlaXAxNTU6ODQ1MzIiLCJhbW91bnQiOiIxMDAwMCIsImFzc2V0IjoiMHgwMzZDYkQ1Mzg0MmM1NDI2NjM0ZTc5Mjk1NDFlQzIzMThmM2RDRjdlIiwicGF5VG8iOiIweDJkZTdCOTM4OEMyNDlEMjA4MDBiQTA5N2VENURFYjY2ZTQ0MzdEYzQiLCJtYXhUaW1lb3V0U2Vjb25kcyI6MzAwLCJleHRyYSI6eyJuYW1lIjoiVVNEQyIsInZlcnNpb24iOiIyIn19fQ==";

const CAPTURED_RESPONSE =
  "eyJzdWNjZXNzIjp0cnVlLCJwYXllciI6IjB4MEQzQ2FDNWYyNzcwNUM0YzcyMTg1QjhCNzRBNTQzRjM1MzBGODRlZiIsInRyYW5zYWN0aW9uIjoiMHgzNjQ2MTI1YzAyNzc1ODU0OTJhYmEwMTM5YzA4YzQzYjRmNjg0OTM2MmQ5M2U0MjQ0Mzk3NzY4ZDU3YTRlZGE5IiwibmV0d29yayI6ImVpcDE1NTo4NDUzMiJ9";

const asHeader = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64");

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
    expect(settlement.txHash).toBe("0x3646125c0277585492aba0139c08c43b4f6849362d93e4244397768d57a4eda9");
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
