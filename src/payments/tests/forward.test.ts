// OWNER: PAY. An agent must not be able to impersonate the Guard or smuggle its own payment
// through the proxy. Everything here is a header an attacker would try.
import { afterEach, describe, expect, it, vi } from "vitest";
import { forwardToMerchant, isStrippedHeader } from "@/payments/gateway/forward";

afterEach(() => vi.unstubAllGlobals());

/** Captures what actually reached the merchant. */
function captureFetch() {
  const seen: { headers: Headers; method: string; body: unknown }[] = [];
  vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
    seen.push({ headers: new Headers(init.headers), method: init.method!, body: init.body });
    return new Response(null, { status: 200 });
  });
  return seen;
}

describe("isStrippedHeader", () => {
  it.each([
    "X-Guard-Key",
    "x-guard-reason",
    "X-Guard-Anything-At-All",
    "Authorization",
    "PAYMENT-REQUIRED",
    "PAYMENT-SIGNATURE",
    "PAYMENT-RESPONSE",
    "X-PAYMENT",
    "X-PAYMENT-RESPONSE",
    "Cookie",
    "Host",
    "Content-Length",
  ])("strips %s", (name) => {
    expect(isStrippedHeader(name)).toBe(true);
  });

  it.each(["Content-Type", "Accept", "User-Agent", "X-Request-Id"])("keeps %s", (name) => {
    expect(isStrippedHeader(name)).toBe(false);
  });
});

describe("forwardToMerchant", () => {
  it("drops every header an agent could use to smuggle a payment or forge the Guard", async () => {
    const seen = captureFetch();

    await forwardToMerchant({
      url: "http://merchant.test/api",
      method: "post",
      headers: {
        "X-Guard-Key": "gk_live_stolen",
        "Authorization": "Bearer someone-elses-token",
        "PAYMENT-SIGNATURE": "agent-forged-payment",
        "X-PAYMENT": "v1-legacy-forgery",
        "Accept": "application/json",
      },
      body: { query: "x402" },
    });

    const { headers } = seen[0];
    expect(headers.get("x-guard-key")).toBeNull();
    expect(headers.get("authorization")).toBeNull();
    expect(headers.get("payment-signature")).toBeNull();
    expect(headers.get("x-payment")).toBeNull();
    expect(headers.get("accept")).toBe("application/json");
  });

  it("sets PAYMENT-SIGNATURE only from its own argument, never from the agent", async () => {
    const seen = captureFetch();

    await forwardToMerchant({
      url: "http://merchant.test/api",
      method: "post",
      headers: { "PAYMENT-SIGNATURE": "agent-forged-payment" },
      paymentSignature: "signed-by-the-guard",
    });

    expect(seen[0].headers.get("payment-signature")).toBe("signed-by-the-guard");
  });

  it("uppercases the method and defaults the content type for a body", async () => {
    const seen = captureFetch();
    await forwardToMerchant({ url: "http://merchant.test/api", method: "post", body: { a: 1 } });

    expect(seen[0].method).toBe("POST");
    expect(seen[0].headers.get("content-type")).toBe("application/json");
    expect(seen[0].body).toBe('{"a":1}');
  });
});
