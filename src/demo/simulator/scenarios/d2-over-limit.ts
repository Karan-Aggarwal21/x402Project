// OWNER: DEMO · One $2.00 premium report. EXPECT: BLOCK PER_TRANSACTION_LIMIT_EXCEEDED, no tx.
// The declared caller ceiling carries this block until CORE's policy engine lands; after the swap
// the $0.10 per-transaction policy limit blocks it independently — same code, still no tx.
import { guardedFetch } from "@/demo/agent/guardedFetch";
import { TOOL_ENDPOINTS } from "@/demo/agent/tools";
import { PRICING } from "@/demo/sandbox/pricing";

const CALLER_CEILING_USD = "0.10";

export async function run(log: (line: string) => void = console.log): Promise<void> {
  const url = TOOL_ENDPOINTS.premiumReport;
  const priceUsd = PRICING[url];
  log(`[D2] POST ${url} ($${priceUsd}), caller ceiling $${CALLER_CEILING_USD} — expect BLOCK, no tx`);

  const result = await guardedFetch(
    url,
    { topic: "EV battery recycling market" },
    "D2: buy the premium market report",
    { maxAmountUsd: CALLER_CEILING_USD },
  );

  if (result.ok) {
    throw new Error(`[D2] PAID $${priceUsd} — the Guard should have blocked this (tx: ${result.txHash})`);
  }

  const block = result.blocked ?? { code: "UNKNOWN", message: "Guard gave no detail" };
  log(`[D2] BLOCK ${block.code}: ${block.message}`);
  log(`[D2] attempted $${priceUsd}, spent $0.00 — no transaction exists`);

  if (block.code !== "PER_TRANSACTION_LIMIT_EXCEEDED") {
    throw new Error(`[D2] blocked, but with ${block.code} instead of PER_TRANSACTION_LIMIT_EXCEEDED`);
  }
}
