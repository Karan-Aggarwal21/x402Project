// OWNER: PAY. The adapter split, proven without a chain: reading a price and signing for it are
// separate calls, which is the only reason a policy decision can sit between them.
import { describe, expect, it } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import {
  createPaymentSignature,
  narrowToOffer,
  readPaymentRequired,
  readSettlement,
} from "@/payments/x402/adapter";
import { HEADER, decodePaymentSignature } from "@/payments/x402/headers";
import { CAPTURED_REQUIRED, CAPTURED_RESPONSE, SETTLED_TX_HASH } from "@/payments/tests/fixtures";

const respond = (status: number, headers: Record<string, string> = {}) => new Response(null, { status, headers });

const paid = () => respond(200, { [HEADER.response]: CAPTURED_RESPONSE });
const unpaid = () => respond(402, { [HEADER.required]: CAPTURED_REQUIRED });

// Throwaway key: EIP-3009 signing is offline typed data, so this test never touches the network.
const TEST_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

describe("readPaymentRequired", () => {
  it("returns null when the resource was free", () => {
    expect(readPaymentRequired(respond(200))).toBeNull();
  });

  it("decodes the offer from a real 402", () => {
    expect(readPaymentRequired(unpaid())?.accepts[0]).toMatchObject({
      network: "eip155:84532",
      amount: "10000",
      payTo: "0x2de7B9388C249D20800bA097eD5DEb66e4437Dc4",
    });
  });

  it("refuses a 402 that carries no payment offer", () => {
    expect(() => readPaymentRequired(respond(402))).toThrow(/without a PAYMENT-REQUIRED header/);
  });
});

describe("narrowToOffer", () => {
  it("leaves exactly the approved offer for the SDK to sign", () => {
    const paymentRequired = readPaymentRequired(unpaid())!;
    const decoy = { ...paymentRequired.accepts[0], payTo: "0x000000000000000000000000000000000000dEaD" };

    const narrowed = narrowToOffer({ ...paymentRequired, accepts: [...paymentRequired.accepts, decoy] }, paymentRequired.accepts[0]);

    expect(narrowed.accepts).toHaveLength(1);
    expect(narrowed.accepts[0].payTo).toBe("0x2de7B9388C249D20800bA097eD5DEb66e4437Dc4");
  });
});

describe("createPaymentSignature", () => {
  it("signs the approved offer and nothing else", async () => {
    const account = privateKeyToAccount(TEST_KEY);
    const paymentRequired = readPaymentRequired(unpaid())!;

    const header = await createPaymentSignature(narrowToOffer(paymentRequired, paymentRequired.accepts[0]), account);
    const authorization = decodePaymentSignature(header).payload.authorization as Record<string, string>;

    expect(authorization.from).toBe(account.address);
    expect(authorization.to).toBe("0x2de7B9388C249D20800bA097eD5DEb66e4437Dc4");
    expect(authorization.value).toBe("10000");
  });
});

describe("readSettlement", () => {
  it("extracts the tx hash from a real settled response", () => {
    expect(readSettlement(paid()).txHash).toBe(SETTLED_TX_HASH);
  });

  it("refuses a 200 that never proved settlement", () => {
    expect(() => readSettlement(respond(200))).toThrow(/without a PAYMENT-RESPONSE header/);
  });
});
