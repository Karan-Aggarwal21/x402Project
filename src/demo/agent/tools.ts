// OWNER: DEMO. The five paid tools, shared by both drivers (simulator and LLM agent).
// Every execute() goes through guardedFetch — no tool can pay by itself.
import { tool } from "ai";
import { z } from "zod";
import { guardedFetch } from "@/demo/agent/guardedFetch";
import { PRICING } from "@/demo/sandbox/pricing";

export const TOOL_ENDPOINTS = {
  search: "/api/sandbox/search",
  extract: "/api/sandbox/extract",
  factCheck: "/api/sandbox/fact-check",
  summarize: "/api/sandbox/summarize",
  premiumReport: "/api/sandbox/premium-report",
} as const;

export type ToolName = keyof typeof TOOL_ENDPOINTS;

export interface ToolCallRecord {
  tool: ToolName;
  priceUsd: string;
  status: "PAID" | "BLOCKED";
  code?: string;
  txHash?: string;
}

/** What a tool hands back to the model when the Guard blocks the payment — data, never a throw. */
export interface ToolBlocked {
  blocked: true;
  code: string;
  message: string;
}

export async function callPaidTool(
  name: ToolName,
  body: unknown,
  onCall?: (record: ToolCallRecord) => void,
): Promise<unknown | ToolBlocked> {
  const url = TOOL_ENDPOINTS[name];
  const result = await guardedFetch(url, body, `agent tool call: ${name}`);

  if (!result.ok) {
    const code = result.blocked?.code ?? "UNKNOWN";
    onCall?.({ tool: name, priceUsd: PRICING[url], status: "BLOCKED", code });
    return { blocked: true, code, message: result.blocked?.message ?? "blocked" };
  }

  onCall?.({ tool: name, priceUsd: PRICING[url], status: "PAID", txHash: result.txHash });
  return result.data;
}

/** Descriptions carry the price on purpose: cost-aware tool choice is the demo's UX layer. */
export function buildTools(onCall?: (record: ToolCallRecord) => void) {
  return {
    search: tool({
      description: "Search the web. Costs $0.02 per call.",
      inputSchema: z.object({ query: z.string().describe("the search query") }),
      execute: (input) => callPaidTool("search", input, onCall),
    }),
    extract: tool({
      description: "Extract the text of a document. Costs $0.03 per call.",
      inputSchema: z.object({ url: z.string().describe("URL of the document to extract") }),
      execute: (input) => callPaidTool("extract", input, onCall),
    }),
    factCheck: tool({
      description: "Verify a claim against sources. Costs $0.08 per call.",
      inputSchema: z.object({ claim: z.string().describe("the claim to verify") }),
      execute: (input) => callPaidTool("factCheck", input, onCall),
    }),
    summarize: tool({
      description: "Summarise findings into a short brief. Costs $0.05 per call.",
      inputSchema: z.object({ topic: z.string().describe("what to summarise") }),
      execute: (input) => callPaidTool("summarize", input, onCall),
    }),
    premiumReport: tool({
      description: "Buy the premium market report. Costs $2.00 — expensive, use only if essential.",
      inputSchema: z.object({ topic: z.string().describe("the report topic") }),
      execute: (input) => callPaidTool("premiumReport", input, onCall),
    }),
  };
}
