// OWNER: CORE. Proves every read query in db/queries.ts against the seeded database.
// Run: npx tsx --env-file=.env.local src/core/scripts/check-queries.ts
import { createHash } from "node:crypto";
import * as queries from "@/core/db/queries";
import { toUsd } from "@/shared/money";

// The seed stamps its timeline at a fixed epoch, so counters are only non-zero when asked about it.
const SEED_EPOCH = new Date("2026-08-13T09:00:00.000Z");
const SANDBOX = "localhost:3000";

const failures: string[] = [];
function check(label: string, passed: boolean, detail = ""): void {
  if (!passed) failures.push(label);
  console.log(`  ${passed ? "ok  " : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
}

async function main() {
  console.log("agents and policies");
  const agents = await queries.listAgents();
  check("listAgents returns both seeded agents", agents.length === 2, agents.map((a) => a.name).join(", "));

  const research = agents.find((agent) => agent.name === "ResearchBot");
  if (!research) throw new Error("ResearchBot missing — run npm run db:seed");

  check("getAgentById", (await queries.getAgentById(research.id))?.name === "ResearchBot");
  check("getAgentById on an unknown id returns null", (await queries.getAgentById("agt_nope")) === null);

  const keyHash = createHash("sha256").update("gk_live_researchbot_demo").digest("hex");
  check("getAgentByApiKeyHash", (await queries.getAgentByApiKeyHash(keyHash))?.id === research.id);
  check("getAgentByApiKeyHash on a wrong key returns null", (await queries.getAgentByApiKeyHash("nope")) === null);

  const policy = await queries.getActivePolicy(research.id);
  check("getActivePolicy returns the active version", policy?.version === 3 && policy.isActive === true, `v${policy?.version}`);

  const versions = await queries.listPolicyVersions(research.id);
  check("listPolicyVersions is newest first", versions.map((v) => v.version).join(",") === "3,2,1");

  console.log("\nspend counters at the seed epoch");
  const counters = await queries.getSpendCounters(research.id, SANDBOX, SEED_EPOCH);
  for (const [key, value] of Object.entries(counters)) {
    const shown = typeof value === "bigint" ? `${value} (${toUsd(value)})` : String(value);
    console.log(`         ${key.padEnd(26)} ${shown}`);
  }
  check("every money field is a bigint", ["hourSpentMinor", "daySpentMinor", "monthSpentMinor", "reservedMinor", "medianAmountMinor24h"]
    .every((field) => typeof counters[field as keyof typeof counters] === "bigint"));
  check("daily spend is non-zero on the seeded day", counters.daySpentMinor > 0n, `$${toUsd(counters.daySpentMinor)}`);
  check("monthly spend is at least daily spend", counters.monthSpentMinor >= counters.daySpentMinor);
  check("nothing is reserved on a freshly seeded ledger", counters.reservedMinor === 0n);
  check("a seeded agent is not on its first payment", counters.isFirstPayment === false);

  console.log("\nintents");
  const page = await queries.listIntents({ limit: 5 });
  const newestFirst = page.every((row, i) => i === 0 || page[i - 1].createdAt >= row.createdAt);
  check("listIntents is newest first", newestFirst);

  const next = await queries.listIntents({ limit: 5, cursor: page[page.length - 1].id });
  check("the cursor page does not overlap the first", !next.some((row) => page.some((seen) => seen.id === row.id)));
  check("the cursor page continues the ordering", next.every((row) => row.createdAt <= page[page.length - 1].createdAt));

  const blocked = await queries.listIntents({ decision: "BLOCK" });
  check("listIntents filters by decision", blocked.length === 8 && blocked.every((row) => row.decision === "BLOCK"), `${blocked.length} blocked`);
  check("listIntents filters by merchant", (await queries.listIntents({ merchantDomain: "rogue.example.com" })).length === 1);
  check("getIntentById round-trips", (await queries.getIntentById(page[0].id))?.id === page[0].id);
  check("findByIdempotencyKey on an unknown key returns null", (await queries.findByIdempotencyKey(research.id, "nope")) === null);

  const approvals = await queries.listPendingApprovals();
  check("listPendingApprovals returns the held payments", approvals.length === 2, approvals.map((a) => `$${toUsd(a.amountMinor)}`).join(", "));
  check("the approval queue is oldest first", approvals.every((row, i) => i === 0 || approvals[i - 1].createdAt <= row.createdAt));

  console.log("\nmetrics");
  const metrics = await queries.getMetricsSummary(720);
  console.log(`         decisions allow=${metrics.decisions.allow} hold=${metrics.decisions.hold} block=${metrics.decisions.block}`);
  console.log(`         spent=$${toUsd(metrics.spentMinor)}  blocked=$${toUsd(metrics.blockedMinor)}  p95=${metrics.p95GuardLatencyMs}ms`);
  console.log(`         topBlockReasons: ${metrics.topBlockReasons.map((r) => `${r.code}=${r.count}`).join(", ")}`);
  check("decision counts add up to the seeded 40", metrics.decisions.allow + metrics.decisions.hold + metrics.decisions.block === 40);
  check("settled spend matches the ledger's committed total", metrics.spentMinor === counters.monthSpentMinor, `$${toUsd(metrics.spentMinor)}`);
  // The whole product claim in one assertion.
  check("no blocked payment ever reached the chain", metrics.blockedOnChainTxCount === 0);
  check("blocked value is money the guard kept off-chain", metrics.blockedMinor > 0n, `$${toUsd(metrics.blockedMinor)}`);

  console.log(failures.length === 0 ? "\nall read queries verified" : `\n${failures.length} FAILED: ${failures.join("; ")}`);
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((error) => { console.error(error); process.exit(1); });
