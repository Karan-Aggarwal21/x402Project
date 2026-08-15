// OWNER: PAY. The intent is what CORE judges and what the signer is bound to. These tests prove
// the hash moves when any judged term moves, which is the whole of threat T9.
import { describe, expect, it } from "vitest";
import { buildIntentFromRequirements } from "@/payments/intent/build";
import { computeIntentHash, type HashableIntent } from "@/payments/intent/hash";
import { readPaymentRequired } from "@/payments/x402/adapter";
import { HEADER } from "@/payments/x402/headers";
import { CAPTURED_REQUIRED } from "@/payments/tests/fixtures";

const REQUIREMENTS = readPaymentRequired(
  new Response(null, { status: 402, headers: { [HEADER.required]: CAPTURED_REQUIRED } }),
)!.accepts[0];

const build = (overrides: Partial<Parameters<typeof buildIntentFromRequirements>[0]> = {}) =>
  buildIntentFromRequirements({
    agentId: "agt_researchbot",
    requirements: REQUIREMENTS,
    requestUrl: "http://localhost:3000/api/sandbox/search?q=x402",
    method: "post",
    reason: "search for x402 adoption data",
    ...overrides,
  });

describe("buildIntentFromRequirements", () => {
  it("carries the wire terms across unchanged", () => {
    expect(build()).toMatchObject({
      agentId: "agt_researchbot",
      amountMinor: 10_000n,
      asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      network: "eip155:84532",
      recipient: "0x2de7B9388C249D20800bA097eD5DEb66e4437Dc4",
      state: "EVALUATING",
    });
  });

  it("treats the wire amount as minor units, never as dollars", () => {
    // toMinor("10000") would give 10000000000n. That factor-of-10^6 slip is the bug this guards.
    expect(build().amountMinor).toBe(10_000n);
    expect(typeof build().amountMinor).toBe("bigint");
  });

  it("uses host including port as the merchant, since that is the allowlist key", () => {
    expect(build().merchant).toBe("localhost:3000");
  });

  it("normalises the resource to METHOD and path, dropping the query string", () => {
    expect(build().resource).toBe("POST /api/sandbox/search");
  });

  it("gives every intent a fresh nonce, so two identical requests never share a hash", () => {
    expect(build().nonce).not.toBe(build().nonce);
    expect(build().intentHash).not.toBe(build().intentHash);
  });

  it("refuses a merchant quoting dollars instead of minor units", () => {
    expect(() => build({ requirements: { ...REQUIREMENTS, amount: "0.01" } })).toThrow(/minor units/);
  });

  it("refuses a payTo that is not an address", () => {
    expect(() => build({ requirements: { ...REQUIREMENTS, payTo: "0xnope" } })).toThrow(/not an address/);
  });
});

describe("computeIntentHash", () => {
  const base = (): HashableIntent => {
    const { intentHash: _hash, state: _state, ...terms } = build();
    return terms;
  };

  it("is stable for identical terms", () => {
    const terms = base();
    expect(computeIntentHash(terms)).toBe(computeIntentHash({ ...terms }));
  });

  it("ignores the key order of the object", () => {
    const terms = base();
    const reordered = Object.fromEntries(Object.entries(terms).reverse()) as HashableIntent;
    expect(computeIntentHash(reordered)).toBe(computeIntentHash(terms));
  });

  const TAMPERS: Array<[string, Partial<HashableIntent>]> = [
    ["agentId", { agentId: "agt_attacker" }],
    ["amountMinor", { amountMinor: 10_001n }],
    ["asset", { asset: "0x0000000000000000000000000000000000000001" }],
    ["network", { network: "eip155:1" }],
    ["recipient", { recipient: "0x000000000000000000000000000000000000dEaD" }],
    ["merchant", { merchant: "evil.example.com" }],
    ["resource", { resource: "POST /api/sandbox/premium-report" }],
    ["reason", { reason: "something else entirely" }],
    ["nonce", { nonce: "00000000000000000000000000000000" }],
  ];

  it.each(TAMPERS)("changes when %s changes", (_field, tamper) => {
    const terms = base();
    expect(computeIntentHash({ ...terms, ...tamper })).not.toBe(computeIntentHash(terms));
  });

  it("ignores fields that identify the record rather than the payment", () => {
    const terms = base();
    const relabelled = { ...terms, intentId: "int_completely_different", createdAt: new Date(0) };
    expect(computeIntentHash(relabelled)).toBe(computeIntentHash(terms));
  });
});
