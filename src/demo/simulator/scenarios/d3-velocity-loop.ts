// OWNER: DEMO · 20 fact-check calls in a burst. EXPECT: at most 10 settle (maxTxPerMinute),
// the rest block VELOCITY_EXCEEDED. Needs CORE's velocity rule — fails loudly while it is stubbed.
import { guardedFetch, type GuardedResult } from "@/demo/agent/guardedFetch";
import { TOOL_ENDPOINTS } from "@/demo/agent/tools";
import { PRICING } from "@/demo/sandbox/pricing";

const CALLS = 20;
// Mirrors the seeded policy velocity.maxTxPerMinute. If CORE reseeds this, update here too.
const MAX_SETTLED = 10;

export async function run(log: (line: string) => void = console.log): Promise<void> {
  const url = TOOL_ENDPOINTS.factCheck;
  const priceUsd = PRICING[url];
  log(`[D3] ${CALLS} × POST ${url} ($${priceUsd}) in one burst — expect ×${MAX_SETTLED} ALLOW then BLOCK`);

  const results: GuardedResult[] = [];
  for (let i = 1; i <= CALLS; i++) {
    results.push(await guardedFetch(url, { claim: `velocity probe ${i}` }, `D3: velocity loop call ${i}`));
  }

  const settled = results.filter((r) => r.ok);
  const blocked = results.filter((r) => !r.ok);
  const firstVelocityBlock = blocked.findIndex((r) => r.blocked?.code === "VELOCITY_EXCEEDED");

  settled.forEach((_, i) => log(`[D3] call ${i + 1}: ALLOW (settled)`));
  blocked.forEach((r) => log(`[D3] BLOCK ${r.blocked?.code}: ${r.blocked?.message}`));

  const spent = (settled.length * Number(priceUsd)).toFixed(2);
  log(`[D3] attempted $${(CALLS * Number(priceUsd)).toFixed(2)}, spent $${spent}`);

  if (firstVelocityBlock === -1) {
    throw new Error(`[D3] ${settled.length}/${CALLS} settled and none blocked VELOCITY_EXCEEDED — the velocity rule did not fire`);
  }
  if (settled.length > MAX_SETTLED) {
    throw new Error(`[D3] ${settled.length} settled before the block — policy allows at most ${MAX_SETTLED}/minute`);
  }
  log(`[D3] velocity rule fired at call ${firstVelocityBlock + 1} — guard held`);
}
