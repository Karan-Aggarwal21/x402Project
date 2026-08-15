// OWNER: PAY. The frozen contract DEMO codes against, plus the rules about what an agent
// must never receive back. Changing a shape here breaks DEMO — announce before you do.
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

process.env.USE_MOCKS = "1";

const orchestrator = vi.hoisted(() => ({ runGuardedRequest: vi.fn() }));
vi.mock("@/payments/gateway/orchestrator", () => orchestrator);

const { POST } = await import("@/payments/handlers/gw-request");

const DEMO_KEY = "gk_live_researchbot_demo";
const TX = "0x3646125c0277585492aba0139c08c43b4f6849362d93e4244397768d57a4eda9";

const post = (body: unknown, headers: Record<string, string> = { "X-Guard-Key": DEMO_KEY }) =>
  POST(new Request("http://localhost:3000/api/gw/request", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  }));

const VALID = { url: "http://localhost:3000/api/sandbox/search", method: "POST", body: { query: "x402 adoption" }, reason: "demo" };

const BASE = {
  intentId: "int_01J9TEST",
  decision: "ALLOW" as const,
  reasons: [],
  merchant: "localhost:3000",
  resource: "POST /api/sandbox/search",
  amountUsd: "0.01",
};

// The limiter's counters are in-process and outlive each test, so every test starts one window later.
let clock = Date.now();
vi.useFakeTimers({ toFake: ["Date"] });

beforeEach(() => {
  vi.clearAllMocks();
  clock += 61_000;
  vi.setSystemTime(clock);
});

afterAll(() => vi.useRealTimers());

describe("auth and transport", () => {
  it("rejects a request with no agent key", async () => {
    const response = await post(VALID, {});
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("GUARD_UNAVAILABLE");
    expect(orchestrator.runGuardedRequest).not.toHaveBeenCalled();
  });

  it("rejects an unknown agent key", async () => {
    const response = await post(VALID, { "X-Guard-Key": "gk_live_not_a_real_key" });
    expect(response.status).toBe(503);
    expect(orchestrator.runGuardedRequest).not.toHaveBeenCalled();
  });

  it("returns 429 for rate limiting, which is NOT a policy 402", async () => {
    orchestrator.runGuardedRequest.mockResolvedValue({ ...BASE, status: "SETTLED", onChain: { signed: false, txHash: null } });

    let limited: Response | undefined;
    for (let attempt = 0; attempt < 70 && !limited; attempt++) {
      const response = await post(VALID);
      if (response.status === 429) limited = response;
    }

    expect(limited).toBeDefined();
    const payload = await limited!.json();
    expect(payload.error.code).toBe("RATE_LIMITED");
    expect(payload.statusCode).toBe(429);
  });
});

describe("request validation", () => {
  it.each([
    ["a missing url", { method: "POST" }],
    ["a non-http url", { url: "file:///etc/passwd" }],
    ["a cloud metadata url", { url: "http://169.254.169.254/latest/meta-data/" }],
    ["dollars with too much precision", { url: "http://localhost:3000/x", maxAmountUsd: "0.0000001" }],
  ])("rejects %s without calling the orchestrator", async (_label, body) => {
    const response = await post(body);
    expect(response.status).toBe(422);
    expect(orchestrator.runGuardedRequest).not.toHaveBeenCalled();
  });
});

describe("the frozen contract", () => {
  it("returns 200 with the settled shape DEMO codes against", async () => {
    orchestrator.runGuardedRequest.mockResolvedValue({
      ...BASE,
      status: "SETTLED",
      onChain: { signed: true, txHash: TX },
      payment: { amount: "0.01", txHash: TX, explorerUrl: `https://sepolia.basescan.org/tx/${TX}`, settledAt: new Date().toISOString() },
      response: { status: 200, headers: { "x-internal": "leak me" }, body: { results: [] } },
    });

    const response = await post(VALID);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe(true);
    expect(payload.statusCode).toBe(200);
    expect(payload.data).toMatchObject({
      intentId: "int_01J9TEST",
      decision: "ALLOW",
      amountUsd: "0.01",
      merchant: "localhost:3000",
      resource: "POST /api/sandbox/search",
      onChain: { signed: true, txHash: TX, explorerUrl: `https://sepolia.basescan.org/tx/${TX}` },
      response: { results: [] },
    });
  });

  it("returns 402 with txHash null when the policy blocks", async () => {
    orchestrator.runGuardedRequest.mockResolvedValue({
      ...BASE,
      status: "BLOCKED",
      decision: "BLOCK",
      amountUsd: "2.00",
      reasons: [{ code: "PER_TRANSACTION_LIMIT_EXCEEDED", rule: "financial.maxPerTransactionUsd", message: "Transaction amount $2.00 exceeds the per-transaction limit of $0.10." }],
      onChain: { signed: false, txHash: null },
    });

    const response = await post(VALID);
    const payload = await response.json();

    expect(response.status).toBe(402);
    expect(payload.status).toBe(false);
    expect(payload.statusCode).toBe(402);
    expect(payload.error.code).toBe("PER_TRANSACTION_LIMIT_EXCEEDED");
    expect(payload.error.details.onChain).toEqual({ signed: false, txHash: null });
    expect(payload.message).toMatch(/exceeds the per-transaction limit/);
  });

  it("returns 202 with an expiry when a payment is held for review", async () => {
    orchestrator.runGuardedRequest.mockResolvedValue({
      ...BASE, status: "PENDING_APPROVAL", decision: "HOLD", onChain: { signed: false, txHash: null },
    });

    const response = await post(VALID);
    const payload = await response.json();

    expect(response.status).toBe(202);
    expect(payload.error.code).toBe("APPROVAL_REQUIRED");
    expect(Date.parse(payload.error.details.expiresAt)).toBeGreaterThan(Date.now());
  });

  it("maps an off-catalogue reason code to GUARD_UNAVAILABLE rather than inventing one", async () => {
    orchestrator.runGuardedRequest.mockResolvedValue({
      ...BASE, status: "FAILED", reasons: [{ code: "SOMETHING_NEW", rule: "gateway", message: "unknown" }],
      onChain: { signed: false, txHash: null },
    });

    const payload = await (await post(VALID)).json();
    expect(payload.error.code).toBe("GUARD_UNAVAILABLE");
  });
});

describe("what the agent must never receive", () => {
  it("leaks no key, RPC URL, signer or merchant response headers", async () => {
    orchestrator.runGuardedRequest.mockResolvedValue({
      ...BASE,
      status: "SETTLED",
      onChain: { signed: true, txHash: TX },
      payment: { amount: "0.01", txHash: TX, explorerUrl: `https://sepolia.basescan.org/tx/${TX}`, settledAt: new Date().toISOString() },
      response: { status: 200, headers: { "set-cookie": "session=secret", "x-internal": "leak me" }, body: { results: [] } },
    });

    const raw = await (await post(VALID)).text();

    for (const forbidden of ["PRIVATE_KEY", "0xac0974", "sepolia.base.org", "set-cookie", "leak me", "GUARD_HMAC"]) {
      expect(raw).not.toContain(forbidden);
    }
  });
});
