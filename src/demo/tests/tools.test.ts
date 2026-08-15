// OWNER: DEMO. C5: every tool pays through the Guard, and a block comes back as data the model can use.
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildTools, callPaidTool, TOOL_ENDPOINTS, type ToolCallRecord } from "@/demo/agent/tools";

const envelope = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const gatewayOk = (response: unknown, txHash = "0xabc") =>
  envelope(200, { status: true, statusCode: 200, data: { onChain: { txHash }, response } });

afterEach(() => vi.unstubAllGlobals());

describe("buildTools", () => {
  it("exposes exactly the five paid tools", () => {
    expect(Object.keys(buildTools()).sort()).toEqual(Object.keys(TOOL_ENDPOINTS).sort());
  });

  it("search returns the merchant body on success and records the spend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(gatewayOk({ results: [{ title: "t" }] }, "0xfeed"));
    vi.stubGlobal("fetch", fetchMock);
    const calls: ToolCallRecord[] = [];

    const output = await buildTools((r) => calls.push(r)).search.execute!(
      { query: "x402" },
      { toolCallId: "t1", messages: [], context: {} },
    );

    expect(output).toEqual({ results: [{ title: "t" }] });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string).url).toMatch(/\/api\/sandbox\/search$/);
    expect(calls).toEqual([{ tool: "search", priceUsd: "0.02", status: "PAID", txHash: "0xfeed" }]);
  });

  it("a 402 comes back as { blocked: true, code } so the model can adapt", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(envelope(402, {
      status: false, statusCode: 402,
      message: "Amount $2.00 exceeds the per-transaction limit of $0.10.",
      error: { code: "PER_TRANSACTION_LIMIT_EXCEEDED" },
    })));
    const calls: ToolCallRecord[] = [];

    const output = await buildTools((r) => calls.push(r)).premiumReport.execute!(
      { topic: "EV batteries" },
      { toolCallId: "t2", messages: [], context: {} },
    );

    expect(output).toEqual({
      blocked: true,
      code: "PER_TRANSACTION_LIMIT_EXCEEDED",
      message: "Amount $2.00 exceeds the per-transaction limit of $0.10.",
    });
    expect(calls).toEqual([
      { tool: "premiumReport", priceUsd: "2.00", status: "BLOCKED", code: "PER_TRANSACTION_LIMIT_EXCEEDED" },
    ]);
  });

  it("callPaidTool reports a dead Guard as a block, never a throw", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    const output = await callPaidTool("summarize", { topic: "x" });
    expect(output).toMatchObject({ blocked: true, code: "GUARD_UNAVAILABLE" });
  });
});
