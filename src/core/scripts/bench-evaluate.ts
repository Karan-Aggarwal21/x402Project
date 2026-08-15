// OWNER: CORE. NFR-1 gate: 500 intents through the pure engine, prints p50/p95 and fails over budget.
// The engine does no I/O, so this measures the decision itself rather than the database around it.
import { evaluate } from "@/core/policy/engine";
import { makeContext, makeCounters, makeIntent } from "@/core/tests/fixtures";
import { toMinor } from "@/shared/money";

const RUNS = 500;
const P95_BUDGET_MS = 60;

// A spread of decisions, so the walk that stops at rule 1 and the walk that reaches rule 10 both count.
const SCENARIOS = [
  { label: "ALLOW  clean payment", ctx: makeContext() },
  { label: "BLOCK  frozen agent", ctx: makeContext({ agentStatus: "FROZEN" }) },
  { label: "BLOCK  over per-transaction limit", ctx: makeContext({ intent: makeIntent({ amountMinor: toMinor("2.00") }) }) },
  {
    label: "BLOCK  daily budget exhausted",
    ctx: makeContext({
      intent: makeIntent({ amountMinor: toMinor("0.10") }),
      counters: makeCounters({ daySpentMinor: toMinor("4.95") }),
    }),
  },
  { label: "HOLD   amount in review band", ctx: makeContext({ intent: makeIntent({ amountMinor: toMinor("0.45") }) }) },
  {
    label: "BLOCK  risk over threshold",
    ctx: makeContext({ merchantKnown: false, counters: makeCounters({ blockedAttemptsLast5Min: 2 }) }),
  },
];

function percentile(sorted: number[], fraction: number): number {
  const index = Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

function main() {
  // Let the JIT settle, otherwise p95 measures compilation rather than the engine.
  for (let i = 0; i < 200; i += 1) evaluate(SCENARIOS[i % SCENARIOS.length].ctx);

  const durations: number[] = [];
  const decisions = new Map<string, number>();

  for (let i = 0; i < RUNS; i += 1) {
    const scenario = SCENARIOS[i % SCENARIOS.length];
    const startedAt = performance.now();
    const result = evaluate(scenario.ctx);
    durations.push(performance.now() - startedAt);
    decisions.set(result.decision, (decisions.get(result.decision) ?? 0) + 1);
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const p50 = percentile(sorted, 0.5);
  const p95 = percentile(sorted, 0.95);
  const max = sorted[sorted.length - 1];
  const format = (ms: number) => `${ms.toFixed(3)} ms`;

  console.log(`engine bench — ${RUNS} evaluations across ${SCENARIOS.length} scenarios`);
  for (const scenario of SCENARIOS) console.log(`  ${scenario.label} -> ${evaluate(scenario.ctx).decision}`);
  console.log(`  decisions: ${[...decisions].map(([decision, count]) => `${decision}=${count}`).join(" ")}`);
  console.log(`  p50 ${format(p50)}   p95 ${format(p95)}   max ${format(max)}   budget ${P95_BUDGET_MS} ms`);

  if (p95 > P95_BUDGET_MS) {
    console.error(`FAIL: p95 ${format(p95)} exceeds the ${P95_BUDGET_MS} ms budget (NFR-1).`);
    process.exit(1);
  }
  console.log("PASS: p95 within the NFR-1 budget.");
}

main();
