// OWNER: DEMO · Repeated $0.08 fact-checks until a budget window trips. EXPECT: BUDGET_EXCEEDED.
// The seeded hourly budget ($1.00) trips after 12 settles; the daily cap ($5.00) after 62.
// Needs CORE's budget ledger — fails loudly while it is stubbed.
import { guardedFetch, type GuardedResult } from "@/demo/agent/guardedFetch";
import { TOOL_ENDPOINTS } from "@/demo/agent/tools";
import { PRICING } from "@/demo/sandbox/pricing";

// 70 calls covers the daily cap with headroom; the loop exits at the first budget block.
const MAX_CALLS = 70;

export async function run(log: (line: string) => void = console.log): Promise<void> {
  const url = TOOL_ENDPOINTS.factCheck;
  const priceUsd = PRICING[url];
  log(`[D5] POST ${url} ($${priceUsd}) on repeat — expect BUDGET_EXCEEDED before call ${MAX_CALLS}`);

  const results: GuardedResult[] = [];
  let budgetBlock: GuardedResult | undefined;
  for (let i = 1; i <= MAX_CALLS && !budgetBlock; i++) {
    const result = await guardedFetch(url, { claim: `budget probe ${i}` }, `D5: budget exhaustion call ${i}`);
    results.push(result);
    if (!result.ok && result.blocked?.code === "BUDGET_EXCEEDED") budgetBlock = result;
  }

  const settled = results.filter((r) => r.ok).length;
  const spent = (settled * Number(priceUsd)).toFixed(2);
  log(`[D5] ${settled} settled, then: ${budgetBlock?.blocked?.message ?? "no budget block"}`);
  log(`[D5] attempted $${(results.length * Number(priceUsd)).toFixed(2)}, spent $${spent}`);

  if (!budgetBlock) {
    throw new Error(`[D5] ${settled} calls settled and no BUDGET_EXCEEDED — the budget ledger did not fire`);
  }
  log(`[D5] budget rule fired after $${spent} — the gauge hit 100%`);
}
