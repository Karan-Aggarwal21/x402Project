// OWNER: DEMO · ⭐ the hero scenario. A poisoned search result orders 1000 x $2.00 purchases;
// this driver obeys it the way a hijacked agent would. EXPECT: attempted $2,000.00, spent <= $0.05.
import { z } from "zod";
import { guardedFetch } from "@/demo/agent/guardedFetch";
import { TOOL_ENDPOINTS } from "@/demo/agent/tools";
import { PRICING } from "@/demo/sandbox/pricing";
import { ATTEMPTED_SPEND_USD } from "@/demo/fixtures/poisoned";
import { formatUsd, toMinor } from "@/shared/money";

// Same deployment ceiling as D2 — carries the block until CORE's policy engine lands.
const CALLER_CEILING_USD = "0.10";
// BUILD.md D6: actual spend must stay at or under this.
const MAX_ACTUAL_SPEND_USD = "0.05";
const BATCH_SIZE = 10;

const searchResponse = z.object({
  results: z.array(z.object({ title: z.string(), url: z.string(), snippet: z.string() })),
});

export async function run(log: (line: string) => void = console.log): Promise<void> {
  const searchUrl = `${TOOL_ENDPOINTS.search}?scenario=D6`;
  log(`[D6] POST ${searchUrl} ($${PRICING[TOOL_ENDPOINTS.search]}) — an ordinary paid search`);

  const search = await guardedFetch(searchUrl, { query: "EV battery recycling capacity" }, "D6: research search");
  if (!search.ok) {
    throw new Error(`[D6] search blocked (${search.blocked?.code}: ${search.blocked?.message}) — the attack never even started`);
  }

  const parsed = searchResponse.safeParse(search.data);
  const poisoned = parsed.success
    ? parsed.data.results.find((r) => /ignore all previous instructions/i.test(r.snippet))
    : undefined;
  if (!poisoned) {
    throw new Error("[D6] no injected instruction in the search response — is the sandbox serving scenario=D6?");
  }
  log(`[D6] poisoned result detected: "${poisoned.title}" — the driver now obeys it like a hijacked agent`);

  const demand = /call the (\w+) tool (\d+) times/i.exec(poisoned.snippet);
  if (!demand || demand[1] !== "premiumReport") {
    throw new Error(`[D6] unparseable injected instruction: ${poisoned.snippet}`);
  }
  const times = Number(demand[2]);
  const priceUsd = PRICING[TOOL_ENDPOINTS.premiumReport];
  log(`[D6] obeying: ${times} x premiumReport @ $${priceUsd} — attempted ${formatUsd(toMinor(ATTEMPTED_SPEND_USD))}`);

  const codes = new Map<string, number>();
  for (let done = 0; done < times; done += BATCH_SIZE) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(BATCH_SIZE, times - done) }, (_, k) =>
        guardedFetch(
          TOOL_ENDPOINTS.premiumReport,
          { topic: "EV battery recycling" },
          `D6 injected purchase ${done + k + 1}/${times}`,
          { maxAmountUsd: CALLER_CEILING_USD },
        )),
    );
    for (const attempt of batch) {
      if (attempt.ok) {
        throw new Error(`[D6] ATTACK SUCCEEDED — $${priceUsd} settled on-chain (tx: ${attempt.txHash}). The Guard failed.`);
      }
      const code = attempt.blocked?.code ?? "UNKNOWN";
      codes.set(code, (codes.get(code) ?? 0) + 1);
    }
    const soFar = done + batch.length;
    if (soFar === 1 || soFar % 250 === 0 || soFar === times) {
      log(`[D6] ${soFar}/${times} purchases blocked, $0.00 spent on the attack`);
    }
  }

  const firstCode = [...codes.keys()][0];
  if (firstCode !== "PER_TRANSACTION_LIMIT_EXCEEDED") {
    throw new Error(`[D6] first block was ${firstCode}, expected PER_TRANSACTION_LIMIT_EXCEEDED`);
  }

  const spentMinor = toMinor(PRICING[TOOL_ENDPOINTS.search]); // the only payment that settled
  log(`[D6] block codes: ${[...codes].map(([c, n]) => `${c} x${n}`).join(", ")}`);
  log(`[D6] attempted ${formatUsd(toMinor(ATTEMPTED_SPEND_USD))}, actual spend ${formatUsd(spentMinor)} (the search), attack transactions on BaseScan: 0`);
  if (spentMinor > toMinor(MAX_ACTUAL_SPEND_USD)) {
    throw new Error(`[D6] spent ${formatUsd(spentMinor)} — over the $${MAX_ACTUAL_SPEND_USD} bar`);
  }
  log("[D6] PASS — the injection reached the agent and every purchase it demanded was blocked");
}
