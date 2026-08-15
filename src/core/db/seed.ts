// OWNER: CORE. Demo data every other division builds against. Run: npm run db:seed
// Deterministic on purpose — the stage demo must look identical every rehearsal.
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/core/db";
import { computeRowHash, GENESIS_HASH } from "@/core/audit/chain";
import { newId } from "@/shared/ids";
import { toMinor } from "@/shared/money";
import type { PolicyRules } from "@/shared/types";

const SANDBOX = "localhost:3000";
const MERCHANT_WALLET = "0x9a2B4c6D8e0F1a3B5c7D9e1F2a4B6c8D0e2F4a6B";
const ROGUE_WALLET = "0xdEaD00000000000000000000000000000000BEEF";

const RESOURCES = [
  { path: "POST /api/sandbox/search", usd: "0.02", reason: "search for x402 adoption data" },
  { path: "POST /api/sandbox/summarize", usd: "0.05", reason: "summarise the fetched articles" },
  { path: "POST /api/sandbox/extract", usd: "0.03", reason: "extract tables from the report" },
  { path: "POST /api/sandbox/fact-check", usd: "0.08", reason: "verify the quoted figures" },
];

function policyRules(overrides: Partial<PolicyRules> = {}): PolicyRules {
  return {
    // The per-transaction cap has to clear the top of holdBetweenUsd, or rule 6 blocks every
    // amount the review band is meant to catch and the approvals queue can never fill.
    financial: { maxPerTransactionUsd: "1.00", hourlyBudgetUsd: "1.00", dailyBudgetUsd: "5.00", monthlyBudgetUsd: "50.00" },
    merchant: {
      allowedMerchants: [SANDBOX],
      blockedMerchants: ["rogue.example.com"],
      pinnedRecipients: { [SANDBOX]: MERCHANT_WALLET },
      unknownMerchantAction: "BLOCK",
      enforceRecipientPinning: true,
    },
    velocity: { maxTxPerMinute: 10, maxTxPerHour: 100, maxTxPerMerchantPerMinute: 5 },
    rail: { allowedNetworks: ["base-sepolia"], allowedAssets: ["USDC"] },
    risk: {
      autoApproveBelowUsd: "0.10",
      holdBetweenUsd: ["0.10", "1.00"],
      blockAboveUsd: "1.00",
      riskHoldScore: 30,
      riskBlockScore: 60,
    },
    ...overrides,
  };
}

function hashKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

// Fixed epoch so every reseed produces the same timeline. Newest intent is ~2 minutes old.
const T0 = new Date("2026-08-13T09:00:00.000Z");
const minutesAgo = (n: number) => new Date(T0.getTime() - n * 60_000);
const windowKeys = (at: Date) => ({
  windowHour: at.toISOString().slice(0, 13),
  windowDay: at.toISOString().slice(0, 10),
  windowMonth: at.toISOString().slice(0, 7),
});

async function main() {
  const db = getDb();

  // Order matters: every other table references agents.
  await db.delete(schema.auditLogs);
  await db.delete(schema.budgetLedger);
  await db.delete(schema.paymentIntents);
  await db.delete(schema.policies);
  await db.delete(schema.agents);

  const researchBotId = newId("agent");
  const dataBotId = newId("agent");

  await db.insert(schema.agents).values([
    {
      id: researchBotId,
      name: "ResearchBot",
      description: "Research assistant that buys search, summarise and fact-check calls.",
      status: "ACTIVE",
      apiKeyHash: hashKey("gk_live_researchbot_demo"),
      walletAddress: "0x1F3a5C7e9B0d2F4a6C8e0B2d4F6a8C0e2B4d6F8a",
      walletAllowanceCapMinor: toMinor("25.00"),
      walletFundedMinor: toMinor("10.00"),
      createdAt: minutesAgo(600),
    },
    {
      id: dataBotId,
      name: "DataBot",
      description: "Bulk extraction agent. Frozen after a velocity incident.",
      status: "FROZEN",
      apiKeyHash: hashKey("gk_live_databot_demo"),
      walletAddress: "0x2A4b6C8d0E2f4A6b8C0d2E4f6A8b0C2d4E6f8A0b",
      walletAllowanceCapMinor: toMinor("10.00"),
      walletFundedMinor: toMinor("4.00"),
      frozenAt: minutesAgo(45),
      frozenReason: "Velocity limit tripped 3 times in 5 minutes.",
      createdAt: minutesAgo(540),
    },
  ]);

  // Three versions on ResearchBot so the version-history UI has something real to diff.
  const v1 = newId("policy");
  const v2 = newId("policy");
  const v3 = newId("policy");
  const dataBotPolicyId = newId("policy");

  const v1Rules = policyRules({
    financial: { maxPerTransactionUsd: "0.05", hourlyBudgetUsd: "0.50", dailyBudgetUsd: "2.00", monthlyBudgetUsd: "20.00" },
  });
  const v2Rules = policyRules({
    merchant: { ...policyRules().merchant, allowedMerchants: [SANDBOX, "api.exchangerate.host"] },
  });
  const v3Rules = policyRules();
  // DataBot's typed columns are tighter than the defaults, and the engine reads `rules` — so the
  // JSON has to carry the same numbers or the row describes a policy that is not being enforced.
  const dataBotRules = policyRules({
    financial: { maxPerTransactionUsd: "1.00", hourlyBudgetUsd: "0.50", dailyBudgetUsd: "2.00", monthlyBudgetUsd: "20.00" },
    velocity: { maxTxPerMinute: 3, maxTxPerHour: 20, maxTxPerMerchantPerMinute: 5 },
  });

  await db.insert(schema.policies).values([
    {
      id: v1, agentId: researchBotId, version: 1, isActive: false,
      maxPerTransactionMinor: toMinor("0.05"), hourlyBudgetMinor: toMinor("0.50"),
      dailyBudgetMinor: toMinor("2.00"), monthlyBudgetMinor: toMinor("20.00"),
      maxTxPerMinute: 10, maxTxPerHour: 100, rules: v1Rules,
      createdByEmail: "admin@aspg.dev", createdAt: minutesAgo(600),
    },
    {
      id: v2, agentId: researchBotId, version: 2, isActive: false,
      maxPerTransactionMinor: toMinor("1.00"), hourlyBudgetMinor: toMinor("1.00"),
      dailyBudgetMinor: toMinor("5.00"), monthlyBudgetMinor: toMinor("50.00"),
      maxTxPerMinute: 10, maxTxPerHour: 100, rules: v2Rules,
      createdByEmail: "admin@aspg.dev", createdAt: minutesAgo(300),
    },
    {
      id: v3, agentId: researchBotId, version: 3, isActive: true,
      maxPerTransactionMinor: toMinor("1.00"), hourlyBudgetMinor: toMinor("1.00"),
      dailyBudgetMinor: toMinor("5.00"), monthlyBudgetMinor: toMinor("50.00"),
      maxTxPerMinute: 10, maxTxPerHour: 100, rules: v3Rules,
      createdByEmail: "admin@aspg.dev", createdAt: minutesAgo(120),
    },
    {
      id: dataBotPolicyId, agentId: dataBotId, version: 1, isActive: true,
      maxPerTransactionMinor: toMinor("1.00"), hourlyBudgetMinor: toMinor("0.50"),
      dailyBudgetMinor: toMinor("2.00"), monthlyBudgetMinor: toMinor("20.00"),
      maxTxPerMinute: 3, maxTxPerHour: 20, rules: dataBotRules,
      createdByEmail: "admin@aspg.dev", createdAt: minutesAgo(540),
    },
  ]);

  await db.update(schema.agents).set({ activePolicyId: v3 }).where(eq(schema.agents.id, researchBotId));
  await db.update(schema.agents).set({ activePolicyId: dataBotPolicyId }).where(eq(schema.agents.id, dataBotId));

  type SeedIntent = typeof schema.paymentIntents.$inferInsert;
  const intents: SeedIntent[] = [];
  const ledger: (typeof schema.budgetLedger.$inferInsert)[] = [];
  const events: { agentId: string; intentId: string; eventType: string; payload: Record<string, unknown> }[] = [];

  const pushIntent = (row: SeedIntent, event: string, payload: Record<string, unknown>) => {
    intents.push(row);
    events.push({ agentId: row.agentId, intentId: row.id!, eventType: event, payload });
  };

  // 30 settled payments spread over the last 8 hours.
  for (let i = 0; i < 30; i++) {
    const resource = RESOURCES[i % RESOURCES.length];
    const at = minutesAgo(480 - i * 15);
    const intentId = newId("intent");
    const amountMinor = toMinor(resource.usd);
    pushIntent(
      {
        id: intentId, agentId: researchBotId, amountMinor, asset: "USDC", network: "base-sepolia",
        recipient: MERCHANT_WALLET, merchantDomain: SANDBOX, resource: resource.path, reason: resource.reason,
        nonce: `nonce_${i}`, intentHash: createHash("sha256").update(`${intentId}${resource.path}`).digest("hex"),
        state: "SETTLED", decision: "ALLOW", policyVersion: 3, reasons: [],
        matchedRules: ["financial.maxPerTransactionUsd", "merchant.allowedMerchants"],
        riskScore: 5 + (i % 12), riskSignals: [], latencyMs: 18 + (i % 20),
        txHash: `0x${createHash("sha256").update(`tx${i}`).digest("hex")}`,
        settledAt: at, createdAt: at, updatedAt: at,
      },
      "PAYMENT_SETTLED",
      { amountUsd: resource.usd, merchant: SANDBOX },
    );

    const reservationId = newId("reservation");
    for (const entryType of ["RESERVE", "COMMIT"] as const) {
      ledger.push({
        id: newId("ledger"), agentId: researchBotId, intentId, reservationId,
        entryType, amountMinor, ...windowKeys(at), createdAt: at,
      });
    }
  }

  // 8 blocked attempts — one per headline reason code. No txHash, ever.
  const blocks: { usd: string; code: string; rule: string; message: string; merchant: string; recipient: string; risk: number }[] = [
    { usd: "2.00", code: "PER_TRANSACTION_LIMIT_EXCEEDED", rule: "financial.maxPerTransactionUsd", message: "Amount $2.00 exceeds the per-transaction limit of $0.10.", merchant: SANDBOX, recipient: MERCHANT_WALLET, risk: 42 },
    { usd: "5.00", code: "ABSOLUTE_BLOCK_THRESHOLD", rule: "risk.blockAboveUsd", message: "Amount $5.00 exceeds the absolute block threshold of $1.00.", merchant: SANDBOX, recipient: MERCHANT_WALLET, risk: 71 },
    { usd: "0.04", code: "MERCHANT_NOT_ALLOWLISTED", rule: "merchant.allowedMerchants", message: "unknown-seller.example.com is not on the allowlist.", merchant: "unknown-seller.example.com", recipient: MERCHANT_WALLET, risk: 55 },
    { usd: "0.09", code: "MERCHANT_BLOCKED", rule: "merchant.blockedMerchants", message: "rogue.example.com is on the blocklist.", merchant: "rogue.example.com", recipient: ROGUE_WALLET, risk: 88 },
    { usd: "0.05", code: "RECIPIENT_MISMATCH", rule: "merchant.pinnedRecipients", message: "payTo does not match the recipient pinned for this merchant.", merchant: SANDBOX, recipient: ROGUE_WALLET, risk: 94 },
    { usd: "0.06", code: "VELOCITY_EXCEEDED", rule: "velocity.maxTxPerMinute", message: "11 payments in the last minute, limit is 10.", merchant: SANDBOX, recipient: MERCHANT_WALLET, risk: 48 },
    { usd: "0.30", code: "BUDGET_EXCEEDED", rule: "financial.hourlyBudgetUsd", message: "Hourly budget of $1.00 would be exceeded.", merchant: SANDBOX, recipient: MERCHANT_WALLET, risk: 33 },
    { usd: "2000.00", code: "ABSOLUTE_BLOCK_THRESHOLD", rule: "risk.blockAboveUsd", message: "Prompt injection attempted $2000.00 against a $1.00 ceiling.", merchant: SANDBOX, recipient: ROGUE_WALLET, risk: 100 },
  ];

  blocks.forEach((block, i) => {
    const at = minutesAgo(200 - i * 20);
    const intentId = newId("intent");
    pushIntent(
      {
        id: intentId, agentId: researchBotId, amountMinor: toMinor(block.usd), asset: "USDC", network: "base-sepolia",
        recipient: block.recipient, merchantDomain: block.merchant, resource: "POST /api/sandbox/premium-report",
        reason: "buy the premium dataset", nonce: `nonce_block_${i}`,
        intentHash: createHash("sha256").update(`${intentId}block`).digest("hex"),
        state: "BLOCKED", decision: "BLOCK", policyVersion: 3,
        reasons: [{ code: block.code, rule: block.rule, message: block.message }],
        matchedRules: [block.rule], riskScore: block.risk, riskSignals: [], latencyMs: 12 + i,
        createdAt: at, updatedAt: at,
      },
      "PAYMENT_BLOCKED",
      { amountUsd: block.usd, code: block.code },
    );
  });

  // 2 held payments waiting on a human. The approvals queue needs these on first load.
  [
    { usd: "0.45", reason: "buy the quarterly market report", risk: 38 },
    { usd: "0.80", reason: "purchase extended API access", risk: 44 },
  ].forEach((hold, i) => {
    const at = minutesAgo(30 - i * 10);
    const intentId = newId("intent");
    pushIntent(
      {
        id: intentId, agentId: researchBotId, amountMinor: toMinor(hold.usd), asset: "USDC", network: "base-sepolia",
        recipient: MERCHANT_WALLET, merchantDomain: SANDBOX, resource: "POST /api/sandbox/premium-report",
        reason: hold.reason, nonce: `nonce_hold_${i}`,
        intentHash: createHash("sha256").update(`${intentId}hold`).digest("hex"),
        state: "HELD", decision: "HOLD", policyVersion: 3,
        reasons: [{ code: "APPROVAL_REQUIRED", rule: "risk.holdBetweenUsd", message: `$${hold.usd} falls in the $0.10-$1.00 review band.` }],
        matchedRules: ["risk.holdBetweenUsd"], riskScore: hold.risk, riskSignals: [], latencyMs: 21,
        approvalStatus: "PENDING", approvalExpiresAt: new Date(at.getTime() + 15 * 60_000),
        createdAt: at, updatedAt: at,
      },
      "PAYMENT_HELD",
      { amountUsd: hold.usd },
    );
  });

  await db.insert(schema.paymentIntents).values(intents);
  await db.insert(schema.budgetLedger).values(ledger);

  // Audit rows are chained, so /api/v1/audit/verify returns valid on a fresh seed.
  let prevHash = GENESIS_HASH;
  const auditRows = events.map((event, i) => {
    const seq = BigInt(i + 1);
    const row = { agentId: event.agentId, intentId: event.intentId, eventType: event.eventType, actor: "seed", payload: event.payload, seq };
    const rowHash = computeRowHash(prevHash, row);
    const entry = { id: newId("audit"), ...row, prevHash, rowHash, createdAt: minutesAgo(500 - i) };
    prevHash = rowHash;
    return entry;
  });
  await db.insert(schema.auditLogs).values(auditRows);

  console.log(`seeded: 2 agents, 4 policies, ${intents.length} intents, ${ledger.length} ledger rows, ${auditRows.length} audit rows`);
  console.log(`ResearchBot api key: gk_live_researchbot_demo`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
