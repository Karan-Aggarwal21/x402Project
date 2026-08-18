// OWNER: CORE. Demo data every other division builds against. Run: npm run db:seed
// Deterministic on purpose — the stage demo must look identical every rehearsal.
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/core/db";
import { computeRowHash, GENESIS_HASH } from "@/core/audit/chain";
import { newId } from "@/shared/ids";
import { toMinor } from "@/shared/money";
import { ALGORAND_TESTNET_NETWORK_ID, ALGORAND_TESTNET_USDC_ASA } from "@/shared/env";
import type { PolicyRules } from "@/shared/types";

const SANDBOX = "localhost:3000";
// Algorand ids are base32 over A-Z2-7 — 58 characters for an address, 52 for a transaction id.
// These are deterministic stand-ins with the right alphabet and length, not real encodings, so
// every shape check behaves exactly as it does against the chain.
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32Shaped(input: string, length: number): string {
  const digest = createHash("sha256").update(input).digest();
  return Array.from({ length }, (_, i) => BASE32[digest[i % digest.length] % 32]).join("");
}
const placeholderAddress = (role: string) => base32Shaped(`address:${role}`, 58);

// Pinned recipient must be the address the sandbox actually pays to, or rule 5 blocks every payment.
// The fallbacks keep `npm run db:seed` working on a machine with no wallet set up — but a seed
// built on them blocks every real payment, which is a failure this project has already hit once.
// Set these in .env.local before seeding anything you intend to demo.
const MERCHANT_WALLET = process.env.MERCHANT_ALGORAND_ADDRESS ?? placeholderAddress("merchant");
const ROGUE_WALLET = process.env.ROGUE_ALGORAND_ADDRESS ?? placeholderAddress("rogue");
const AGENT_WALLET = process.env.AGENT_ALGORAND_ADDRESS ?? placeholderAddress("agent");

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
    // The exact strings that arrive on the wire. The network is the full genesis hash form, not
    // the truncated CAIP-2 constant the SDK uses internally, and the asset is an ASA id rather
    // than a contract address. Either one wrong and every payment blocks as NETWORK_NOT_ALLOWED.
    rail: { allowedNetworks: [ALGORAND_TESTNET_NETWORK_ID], allowedAssets: [ALGORAND_TESTNET_USDC_ASA] },
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
  const budgetBotId = newId("agent");
  const velocityBotId = newId("agent");

  await db.insert(schema.agents).values([
    {
      id: researchBotId,
      name: "ResearchBot",
      description: "Research assistant that buys search, summarise and fact-check calls.",
      status: "ACTIVE",
      apiKeyHash: hashKey("gk_live_researchbot_demo"),
      walletAddress: AGENT_WALLET,
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
      walletAddress: base32Shaped("address:databot", 58),
      walletAllowanceCapMinor: toMinor("10.00"),
      walletFundedMinor: toMinor("4.00"),
      frozenAt: minutesAgo(45),
      frozenReason: "Velocity limit tripped 3 times in 5 minutes.",
      createdAt: minutesAgo(540),
    },
    {
      id: budgetBotId,
      name: "BudgetBot",
      description: "Metered reporting agent. Has already spent its entire hourly allowance.",
      status: "ACTIVE",
      apiKeyHash: hashKey("gk_live_budgetbot_demo"),
      walletAddress: AGENT_WALLET,
      walletAllowanceCapMinor: toMinor("25.00"),
      walletFundedMinor: toMinor("10.00"),
      createdAt: minutesAgo(300),
    },
    {
      id: velocityBotId,
      name: "VelocityBot",
      description: "High-frequency search agent. Kept separate so burst tests start from a clean history.",
      status: "ACTIVE",
      apiKeyHash: hashKey("gk_live_velocitybot_demo"),
      walletAddress: AGENT_WALLET,
      walletAllowanceCapMinor: toMinor("25.00"),
      walletFundedMinor: toMinor("10.00"),
      createdAt: minutesAgo(420),
    },
  ]);

  // Three versions on ResearchBot so the version-history UI has something real to diff.
  const v1 = newId("policy");
  const v2 = newId("policy");
  const v3 = newId("policy");
  const dataBotPolicyId = newId("policy");
  const budgetBotPolicyId = newId("policy");
  const velocityBotPolicyId = newId("policy");

  const v1Rules = policyRules({
    financial: { maxPerTransactionUsd: "0.05", hourlyBudgetUsd: "0.50", dailyBudgetUsd: "2.00", monthlyBudgetUsd: "20.00" },
  });
  const v2Rules = policyRules({
    merchant: { ...policyRules().merchant, allowedMerchants: [SANDBOX, "api.exchangerate.host"] },
  });
  const v3Rules = policyRules();
  // DataBot's typed columns are tighter than the defaults, and the engine reads `rules` — so the
  // JSON has to carry the same numbers or the row describes a policy that is not being enforced.
  // All three windows are the same $0.50 on purpose. The spend below is stamped with the seed's
  // own window keys, so the hourly window is the one that trips during a demo seeded that hour —
  // and the monthly window keeps the agent exhausted for the rest of the month if it is not.
  // Without that, a database seeded at 14:59 would hand D5 a fresh budget at 15:00.
  const budgetBotRules = policyRules({
    financial: { maxPerTransactionUsd: "1.00", hourlyBudgetUsd: "0.50", dailyBudgetUsd: "0.50", monthlyBudgetUsd: "0.50" },
  });

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
    {
      id: budgetBotPolicyId, agentId: budgetBotId, version: 1, isActive: true,
      maxPerTransactionMinor: toMinor("1.00"), hourlyBudgetMinor: toMinor("0.50"),
      dailyBudgetMinor: toMinor("0.50"), monthlyBudgetMinor: toMinor("0.50"),
      maxTxPerMinute: 10, maxTxPerHour: 100, rules: budgetBotRules,
      createdByEmail: "admin@aspg.dev", createdAt: minutesAgo(300),
    },
    {
      id: velocityBotPolicyId, agentId: velocityBotId, version: 1, isActive: true,
      maxPerTransactionMinor: toMinor("1.00"), hourlyBudgetMinor: toMinor("1.00"),
      dailyBudgetMinor: toMinor("5.00"), monthlyBudgetMinor: toMinor("50.00"),
      maxTxPerMinute: 10, maxTxPerHour: 100, rules: policyRules(),
      createdByEmail: "admin@aspg.dev", createdAt: minutesAgo(420),
    },
  ]);

  await db.update(schema.agents).set({ activePolicyId: v3 }).where(eq(schema.agents.id, researchBotId));
  await db.update(schema.agents).set({ activePolicyId: dataBotPolicyId }).where(eq(schema.agents.id, dataBotId));
  await db.update(schema.agents).set({ activePolicyId: budgetBotPolicyId }).where(eq(schema.agents.id, budgetBotId));
  await db.update(schema.agents).set({ activePolicyId: velocityBotPolicyId }).where(eq(schema.agents.id, velocityBotId));

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
        id: intentId, agentId: researchBotId, amountMinor, asset: ALGORAND_TESTNET_USDC_ASA, network: ALGORAND_TESTNET_NETWORK_ID,
        recipient: MERCHANT_WALLET, merchantDomain: SANDBOX, resource: resource.path, reason: resource.reason,
        nonce: `nonce_${i}`, intentHash: createHash("sha256").update(`${intentId}${resource.path}`).digest("hex"),
        state: "SETTLED", decision: "ALLOW", policyVersion: 3, reasons: [],
        matchedRules: ["financial.maxPerTransactionUsd", "merchant.allowedMerchants"],
        riskScore: 5 + (i % 12), riskSignals: [], latencyMs: 18 + (i % 20),
        // Synthetic: shaped like an Algorand transaction id but not on chain, so this link 404s
        // on Lora. The clickable proof in the demo is a live D1 payment, never a seeded row.
        txHash: base32Shaped(`tx${i}`, 52),
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

  // BudgetBot's history: five $0.10 settlements that add up to exactly its $0.50 allowance.
  // Dated inside the current hour so all three budget windows read as spent. This is what makes
  // D5 a single instant call instead of an impossible burst.
  for (let i = 0; i < 5; i++) {
    const at = minutesAgo(20 - i * 4);
    const intentId = newId("intent");
    const amountMinor = toMinor("0.10");
    pushIntent(
      {
        id: intentId, agentId: budgetBotId, amountMinor, asset: ALGORAND_TESTNET_USDC_ASA, network: ALGORAND_TESTNET_NETWORK_ID,
        recipient: MERCHANT_WALLET, merchantDomain: SANDBOX, resource: "POST /api/sandbox/summarize",
        reason: "metered reporting run", nonce: `nonce_budget_${i}`,
        intentHash: createHash("sha256").update(`${intentId}budget`).digest("hex"),
        state: "SETTLED", decision: "ALLOW", policyVersion: 1, reasons: [],
        matchedRules: ["financial.budgets"], riskScore: 8 + i, riskSignals: [], latencyMs: 16 + i,
        txHash: base32Shaped(`budgettx${i}`, 52),
        settledAt: at, createdAt: at, updatedAt: at,
      },
      "PAYMENT_SETTLED",
      { amountUsd: "0.10", merchant: SANDBOX },
    );

    const reservationId = newId("reservation");
    for (const entryType of ["RESERVE", "COMMIT"] as const) {
      ledger.push({
        id: newId("ledger"), agentId: budgetBotId, intentId, reservationId,
        entryType, amountMinor, ...windowKeys(at), createdAt: at,
      });
    }
  }

  // VelocityBot's history: three old settlements, dated at the fixed epoch so they touch no
  // current budget or velocity window. Their only job is to make isFirstPayment false, which
  // would otherwise add 10 risk points to the first call of every burst.
  for (let i = 0; i < 3; i++) {
    const at = minutesAgo(400 - i * 30);
    const intentId = newId("intent");
    const amountMinor = toMinor("0.02");
    pushIntent(
      {
        id: intentId, agentId: velocityBotId, amountMinor, asset: ALGORAND_TESTNET_USDC_ASA, network: ALGORAND_TESTNET_NETWORK_ID,
        recipient: MERCHANT_WALLET, merchantDomain: SANDBOX, resource: "POST /api/sandbox/search",
        reason: "high-frequency search", nonce: `nonce_velocity_${i}`,
        intentHash: createHash("sha256").update(`${intentId}velocity`).digest("hex"),
        state: "SETTLED", decision: "ALLOW", policyVersion: 1, reasons: [],
        matchedRules: ["velocity"], riskScore: 6 + i, riskSignals: [], latencyMs: 14 + i,
        txHash: base32Shaped(`velocitytx${i}`, 52),
        settledAt: at, createdAt: at, updatedAt: at,
      },
      "PAYMENT_SETTLED",
      { amountUsd: "0.02", merchant: SANDBOX },
    );

    const reservationId = newId("reservation");
    for (const entryType of ["RESERVE", "COMMIT"] as const) {
      ledger.push({
        id: newId("ledger"), agentId: velocityBotId, intentId, reservationId,
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
        id: intentId, agentId: researchBotId, amountMinor: toMinor(block.usd), asset: ALGORAND_TESTNET_USDC_ASA, network: ALGORAND_TESTNET_NETWORK_ID,
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
        id: intentId, agentId: researchBotId, amountMinor: toMinor(hold.usd), asset: ALGORAND_TESTNET_USDC_ASA, network: ALGORAND_TESTNET_NETWORK_ID,
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

  console.log(`seeded: 4 agents, 6 policies, ${intents.length} intents, ${ledger.length} ledger rows, ${auditRows.length} audit rows`);
  console.log(`ResearchBot api key: gk_live_researchbot_demo`);
  console.log(`BudgetBot api key:   gk_live_budgetbot_demo    (budget already at 100% — demo D5)`);
  console.log(`VelocityBot api key: gk_live_velocitybot_demo  (clean history for the burst — demo D3)`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
