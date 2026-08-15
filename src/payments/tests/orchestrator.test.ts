// OWNER: PAY. The whole flow, and the rule that matters most: once a reservation exists, every
// exit path releases it. A leaked reservation silently shrinks the budget until someone restarts.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

process.env.GUARD_HMAC_SECRET ??= "test-only-secret";
process.env.AGENT_WALLET_PRIVATE_KEY ??= "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

import { CAPTURED_REQUIRED, CAPTURED_RESPONSE, SETTLED_TX_HASH, asHeader } from "@/payments/tests/fixtures";
import { HEADER } from "@/payments/x402/headers";
import type { EvaluationResult } from "@/shared/types";

const core = vi.hoisted(() => ({
  evaluatePayment: vi.fn(),
  reserveBudget: vi.fn(),
  commitBudget: vi.fn(),
  releaseBudget: vi.fn(),
}));
vi.mock("@/core", () => core);

const forward = vi.hoisted(() => ({ forwardToMerchant: vi.fn(), isStrippedHeader: vi.fn() }));
vi.mock("@/payments/gateway/forward", () => forward);

const { runGuardedRequest } = await import("@/payments/gateway/orchestrator");

const ALLOW: EvaluationResult = {
  decision: "ALLOW", reasons: [], riskScore: 0, riskSignals: [], matchedRules: [], policyVersion: 1, latencyMs: 1,
};

// The capture was served from localhost:3001, so the request URL must agree or the signer's
// merchant check fires before any failure path is reached.
const REQUEST = { agentId: "agt_researchbot", url: "http://localhost:3001/api/gw/poc-seller", method: "POST" };

const quoted = () => new Response(null, { status: 402, headers: { [HEADER.required]: CAPTURED_REQUIRED } });
const settled = () => new Response(JSON.stringify({ results: [] }), { status: 200, headers: { [HEADER.response]: CAPTURED_RESPONSE } });

/** First call is the unpaid probe, second is the paid retry. */
function merchantReplies(unpaid: () => Response, paid: () => Response | Promise<never>) {
  forward.forwardToMerchant.mockImplementationOnce(async () => unpaid());
  forward.forwardToMerchant.mockImplementationOnce(async () => paid());
}

beforeEach(() => {
  vi.clearAllMocks();
  core.evaluatePayment.mockResolvedValue(ALLOW);
  core.reserveBudget.mockResolvedValue({ reservationId: "rsv_test", intentId: "int_test", amountMinor: 10_000n, expiresAt: new Date(Date.now() + 120_000) });
  core.commitBudget.mockResolvedValue(undefined);
  core.releaseBudget.mockResolvedValue(undefined);
});

afterEach(() => vi.useRealTimers());

describe("runGuardedRequest — happy path", () => {
  it("settles, commits the budget and returns the tx hash", async () => {
    merchantReplies(quoted, settled);

    const result = await runGuardedRequest(REQUEST);

    expect(result.status).toBe("SETTLED");
    expect(result.onChain).toEqual({ signed: true, txHash: SETTLED_TX_HASH });
    expect(result.payment?.amount).toBe("0.01");
    expect(result.payment?.explorerUrl).toContain(SETTLED_TX_HASH);
    expect(core.commitBudget).toHaveBeenCalledOnce();
    expect(core.releaseBudget).not.toHaveBeenCalled();
  });

  it("passes a free resource straight through without touching the budget", async () => {
    forward.forwardToMerchant.mockResolvedValueOnce(new Response(JSON.stringify({ free: true }), { status: 200 }));

    const result = await runGuardedRequest(REQUEST);

    expect(result.status).toBe("SETTLED");
    expect(result.onChain.signed).toBe(false);
    expect(core.reserveBudget).not.toHaveBeenCalled();
    expect(core.releaseBudget).not.toHaveBeenCalled();
  });

  it.each([404, 403, 500, 503])("reports a merchant %i as FAILED, never as a free resource", async (status) => {
    forward.forwardToMerchant.mockResolvedValueOnce(new Response("nope", { status }));

    const result = await runGuardedRequest(REQUEST);

    expect(result.status).toBe("FAILED");
    expect(result.reasons[0].code).toBe("UPSTREAM_UNAVAILABLE");
    expect(core.reserveBudget).not.toHaveBeenCalled();
  });
});

describe("runGuardedRequest — nothing is signed before ALLOW", () => {
  it("blocks without reserving or signing", async () => {
    forward.forwardToMerchant.mockResolvedValueOnce(quoted());
    core.evaluatePayment.mockResolvedValue({ ...ALLOW, decision: "BLOCK", reasons: [{ code: "BUDGET_EXCEEDED", rule: "financial.dailyBudgetUsd", message: "over budget" }] });

    const result = await runGuardedRequest(REQUEST);

    expect(result.status).toBe("BLOCKED");
    expect(result.onChain).toEqual({ signed: false, txHash: null });
    expect(result.reasons[0].code).toBe("BUDGET_EXCEEDED");
    expect(core.reserveBudget).not.toHaveBeenCalled();
    expect(forward.forwardToMerchant).toHaveBeenCalledOnce();
  });

  it("holds for human review without reserving", async () => {
    forward.forwardToMerchant.mockResolvedValueOnce(quoted());
    core.evaluatePayment.mockResolvedValue({ ...ALLOW, decision: "HOLD" });

    const result = await runGuardedRequest(REQUEST);

    expect(result.status).toBe("PENDING_APPROVAL");
    expect(result.onChain.signed).toBe(false);
    expect(core.reserveBudget).not.toHaveBeenCalled();
  });

  // The real ledger throws instead of returning a decision when a window has no room. That is a
  // policy outcome, so it has to read as BLOCKED here — a FAILED would claim the guard broke.
  it("blocks, and signs nothing, when the ledger refuses the reservation", async () => {
    forward.forwardToMerchant.mockResolvedValueOnce(quoted());
    core.reserveBudget.mockRejectedValueOnce(
      Object.assign(new Error("This payment would take daily spend over the $5.00 daily budget."), { code: "BUDGET_EXCEEDED" }),
    );

    const result = await runGuardedRequest(REQUEST);

    expect(result.status).toBe("BLOCKED");
    expect(result.onChain).toEqual({ signed: false, txHash: null });
    expect(result.reasons[0].code).toBe("BUDGET_EXCEEDED");
    // Nothing was reserved, so nothing may be released — a stray release would credit a phantom.
    expect(core.releaseBudget).not.toHaveBeenCalled();
    expect(forward.forwardToMerchant).toHaveBeenCalledOnce();
  });

  it("blocks on the caller's own maxAmountUsd before CORE is even asked", async () => {
    forward.forwardToMerchant.mockResolvedValueOnce(quoted());

    const result = await runGuardedRequest({ ...REQUEST, maxAmountUsd: "0.005" });

    expect(result.status).toBe("BLOCKED");
    expect(result.reasons[0].code).toBe("PER_TRANSACTION_LIMIT_EXCEEDED");
    expect(core.evaluatePayment).not.toHaveBeenCalled();
    expect(core.reserveBudget).not.toHaveBeenCalled();
  });
});

describe("runGuardedRequest — every failure path releases the reservation", () => {
  const FAILURES: Array<[string, () => void, string]> = [
    ["merchant 500", () => merchantReplies(quoted, () => new Response("boom", { status: 500 })), "UPSTREAM_UNAVAILABLE"],
    ["402 on retry", () => merchantReplies(quoted, () => new Response(null, { status: 402 })), "SETTLEMENT_FAILED"],
    ["verify-fail: paid 200 with no settlement header", () => merchantReplies(quoted, () => new Response("{}", { status: 200 })), "SETTLEMENT_FAILED"],
    ["settle-fail: facilitator reports success false", () => merchantReplies(quoted, () => new Response("{}", {
      status: 200,
      headers: { [HEADER.response]: asHeader({ success: false, transaction: "", network: "eip155:84532", errorReason: "insufficient_funds" }) },
    })), "SETTLEMENT_FAILED"],
    ["timeout", () => merchantReplies(quoted, () => { throw Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" }); }), "UPSTREAM_UNAVAILABLE"],
  ];

  it.each(FAILURES)("%s", async (_label, arrange, expectedCode) => {
    arrange();

    const result = await runGuardedRequest(REQUEST);

    expect(result.status).toBe("FAILED");
    expect(result.onChain).toEqual({ signed: false, txHash: null });
    expect(result.reasons[0].code).toBe(expectedCode);
    expect(core.releaseBudget).toHaveBeenCalledOnce();
    expect(core.commitBudget).not.toHaveBeenCalled();
  });

  it("releases when the signer itself refuses, and never retries the merchant", async () => {
    // The offer is served by a host other than the one the intent was built for, so the signer's
    // merchant check fires and the paid retry is never issued.
    const elsewhere = asHeader({
      x402Version: 2,
      resource: { url: "http://evil.example.com/api/gw/poc-seller" },
      accepts: [{ scheme: "exact", network: "eip155:84532", amount: "10000", asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", payTo: "0x2de7B9388C249D20800bA097eD5DEb66e4437Dc4" }],
    });
    forward.forwardToMerchant.mockResolvedValueOnce(new Response(null, { status: 402, headers: { [HEADER.required]: elsewhere } }));

    const result = await runGuardedRequest(REQUEST);

    expect(result.status).toBe("FAILED");
    expect(result.reasons[0].message).toMatch(/evil\.example\.com/);
    expect(core.releaseBudget).toHaveBeenCalledOnce();
    expect(core.commitBudget).not.toHaveBeenCalled();
    expect(forward.forwardToMerchant).toHaveBeenCalledOnce();
  });
});
