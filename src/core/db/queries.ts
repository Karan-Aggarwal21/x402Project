// OWNER: CORE. The only place outside budget/ledger.ts that touches the database.
// Handlers call these; they never import getDb() directly. That keeps a future
// change like adding multi-tenancy to one file instead of twenty-six.
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/core/db";
import type { AgentRow, PaymentIntentRow, PolicyRow } from "@/core/db/schema";
import { windowKeys } from "@/core/budget/windows";
import type { SpendCounters } from "@/shared/types";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

// Aggregates come back from the driver as strings so a bigint never loses precision on the way out.
const toMinorUnits = (value: unknown): bigint => BigInt(String(value ?? "0"));
const toCount = (value: unknown): number => Number(value ?? 0);

// --- agents ---------------------------------------------------------------

export async function getAgentByApiKeyHash(hash: string): Promise<AgentRow | null> {
  const [agent] = await getDb().select().from(schema.agents).where(eq(schema.agents.apiKeyHash, hash)).limit(1);
  return agent ?? null;
}

export async function getAgentById(agentId: string): Promise<AgentRow | null> {
  const [agent] = await getDb().select().from(schema.agents).where(eq(schema.agents.id, agentId)).limit(1);
  return agent ?? null;
}

export async function listAgents(): Promise<AgentRow[]> {
  return getDb().select().from(schema.agents).orderBy(asc(schema.agents.name));
}

export async function createAgent(_input: Partial<AgentRow>): Promise<AgentRow> {
  throw new Error("NOT_IMPLEMENTED: createAgent");
}

export async function setAgentStatus(_agentId: string, _status: "ACTIVE" | "FROZEN", _reason?: string): Promise<void> {
  throw new Error("NOT_IMPLEMENTED: setAgentStatus");
}

// --- policies -------------------------------------------------------------

export async function getActivePolicy(agentId: string): Promise<PolicyRow | null> {
  const [policy] = await getDb()
    .select()
    .from(schema.policies)
    .where(and(eq(schema.policies.agentId, agentId), eq(schema.policies.isActive, true)))
    .orderBy(desc(schema.policies.version))
    .limit(1);
  return policy ?? null;
}

export async function listPolicyVersions(agentId: string): Promise<PolicyRow[]> {
  return getDb()
    .select()
    .from(schema.policies)
    .where(eq(schema.policies.agentId, agentId))
    .orderBy(desc(schema.policies.version));
}

/** Creates version n+1 and flips is_active in one transaction. Never mutates a version. */
export async function createPolicyVersion(_agentId: string, _rules: unknown, _byEmail?: string): Promise<PolicyRow> {
  throw new Error("NOT_IMPLEMENTED: createPolicyVersion");
}

// --- intents --------------------------------------------------------------

export async function insertIntent(_input: Partial<PaymentIntentRow>): Promise<PaymentIntentRow> {
  throw new Error("NOT_IMPLEMENTED: insertIntent");
}

/** Writes the decision onto the intent. Must happen before anything is signed. */
export async function recordDecision(_intentId: string, _result: unknown): Promise<void> {
  throw new Error("NOT_IMPLEMENTED: recordDecision");
}

export async function setIntentState(_intentId: string, _state: PaymentIntentRow["state"]): Promise<void> {
  throw new Error("NOT_IMPLEMENTED: setIntentState");
}

export async function recordSettlement(_intentId: string, _txHash: string, _raw: unknown): Promise<void> {
  throw new Error("NOT_IMPLEMENTED: recordSettlement");
}

export async function recordFailure(_intentId: string, _failureReason: string): Promise<void> {
  throw new Error("NOT_IMPLEMENTED: recordFailure");
}

export async function getIntentById(intentId: string): Promise<PaymentIntentRow | null> {
  const [intent] = await getDb()
    .select()
    .from(schema.paymentIntents)
    .where(eq(schema.paymentIntents.id, intentId))
    .limit(1);
  return intent ?? null;
}

export async function findByIdempotencyKey(agentId: string, key: string): Promise<PaymentIntentRow | null> {
  const [intent] = await getDb()
    .select()
    .from(schema.paymentIntents)
    .where(and(eq(schema.paymentIntents.agentId, agentId), eq(schema.paymentIntents.idempotencyKey, key)))
    .limit(1);
  return intent ?? null;
}

export interface IntentFilters {
  agentId?: string;
  decision?: "ALLOW" | "HOLD" | "BLOCK";
  merchantDomain?: string;
  limit?: number;
  cursor?: string;
}

export async function listIntents(filters: IntentFilters): Promise<PaymentIntentRow[]> {
  const conditions = [];
  if (filters.agentId) conditions.push(eq(schema.paymentIntents.agentId, filters.agentId));
  if (filters.decision) conditions.push(eq(schema.paymentIntents.decision, filters.decision));
  if (filters.merchantDomain) conditions.push(eq(schema.paymentIntents.merchantDomain, filters.merchantDomain));

  // Keyset on (created_at, id), not on the id alone: a ULID sorts by generation time, which is not
  // the same as created_at once a row carries a backdated timestamp — as every seeded row does.
  // An unknown cursor makes the subquery NULL and returns an empty page rather than the first one.
  if (filters.cursor) {
    conditions.push(sql`(${schema.paymentIntents.createdAt}, ${schema.paymentIntents.id})
      < (select created_at, id from payment_intents where id = ${filters.cursor})`);
  }

  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, filters.limit ?? DEFAULT_PAGE_SIZE));

  return getDb()
    .select()
    .from(schema.paymentIntents)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(schema.paymentIntents.createdAt), desc(schema.paymentIntents.id))
    .limit(limit);
}

// --- counters (the engine's inputs) --------------------------------------

/** Ledger sums + velocity counts + risk inputs, in as few round trips as possible. */
export async function getSpendCounters(
  agentId: string,
  merchantDomain: string,
  now: Date,
): Promise<SpendCounters> {
  const db = getDb();
  const keys = windowKeys(now);
  // A raw sql`` parameter reaches the driver unserialised, so timestamps cross as ISO text and are
  // cast on the Postgres side. Passing the Date itself throws inside postgres-js.
  const at = (msAgo: number): string => new Date(now.getTime() - msAgo).toISOString();
  const nowIso = now.toISOString();
  const minuteAgo = at(60_000);
  const hourAgo = at(60 * 60_000);
  const fiveMinutesAgo = at(5 * 60_000);
  const dayAgo = at(24 * 60 * 60_000);

  // Two round trips, not ten: FILTER lets one pass over each table answer every question about it.
  const [ledgerRows, intentRows] = await Promise.all([
    db.execute(sql`
      select
        coalesce(sum(amount_minor) filter (where entry_type = 'COMMIT' and window_hour = ${keys.hour}), 0)::text as hour_spent,
        coalesce(sum(amount_minor) filter (where entry_type = 'COMMIT' and window_day = ${keys.day}), 0)::text as day_spent,
        coalesce(sum(amount_minor) filter (where entry_type = 'COMMIT' and window_month = ${keys.month}), 0)::text as month_spent,
        (coalesce(sum(amount_minor) filter (where entry_type = 'RESERVE'), 0)
          - coalesce(sum(amount_minor) filter (where entry_type = 'COMMIT'), 0)
          - coalesce(sum(amount_minor) filter (where entry_type = 'RELEASE'), 0))::text as reserved
      from budget_ledger
      where agent_id = ${agentId}
    `),
    db.execute(sql`
      select
        count(*) filter (where decision in ('ALLOW','HOLD') and created_at >= ${minuteAgo}::timestamptz)::int as tx_last_minute,
        count(*) filter (where decision in ('ALLOW','HOLD') and created_at >= ${hourAgo}::timestamptz)::int as tx_last_hour,
        count(*) filter (where decision in ('ALLOW','HOLD') and created_at >= ${minuteAgo}::timestamptz
                          and merchant_domain = ${merchantDomain})::int as tx_last_minute_for_merchant,
        count(*) filter (where decision = 'BLOCK' and created_at >= ${fiveMinutesAgo}::timestamptz)::int as blocked_attempts,
        count(*) filter (where decision in ('ALLOW','HOLD'))::int as payments_ever,
        coalesce(percentile_disc(0.5) within group (order by amount_minor)
          filter (where decision in ('ALLOW','HOLD') and created_at >= ${dayAgo}::timestamptz), 0)::text as median_24h
      from payment_intents
      where agent_id = ${agentId} and created_at <= ${nowIso}::timestamptz
    `),
  ]);

  const ledger = (ledgerRows as unknown as Record<string, unknown>[])[0] ?? {};
  const intents = (intentRows as unknown as Record<string, unknown>[])[0] ?? {};

  return {
    hourSpentMinor: toMinorUnits(ledger.hour_spent),
    daySpentMinor: toMinorUnits(ledger.day_spent),
    monthSpentMinor: toMinorUnits(ledger.month_spent),
    // Committed and released reservations net to zero, so an all-time sum leaves only live ones.
    reservedMinor: toMinorUnits(ledger.reserved),
    txLastMinute: toCount(intents.tx_last_minute),
    txLastHour: toCount(intents.tx_last_hour),
    txLastMinuteForMerchant: toCount(intents.tx_last_minute_for_merchant),
    blockedAttemptsLast5Min: toCount(intents.blocked_attempts),
    medianAmountMinor24h: toMinorUnits(intents.median_24h),
    isFirstPayment: toCount(intents.payments_ever) === 0,
  };
}

// --- approvals ------------------------------------------------------------

export async function listPendingApprovals(): Promise<PaymentIntentRow[]> {
  return getDb()
    .select()
    .from(schema.paymentIntents)
    .where(eq(schema.paymentIntents.approvalStatus, "PENDING"))
    // Oldest first: it is a queue, and the one closest to expiring is the one to action.
    .orderBy(asc(schema.paymentIntents.createdAt));
}

export async function actionApproval(
  _intentId: string,
  _status: "APPROVED" | "REJECTED" | "EXPIRED",
  _reviewerEmail?: string,
  _note?: string,
): Promise<void> {
  throw new Error("NOT_IMPLEMENTED: actionApproval");
}

// --- metrics --------------------------------------------------------------

export interface MetricsSummary {
  decisions: { allow: number; hold: number; block: number };
  spentMinor: bigint;
  blockedMinor: bigint;
  onChainTxCount: number;
  blockedOnChainTxCount: number;
  topBlockReasons: { code: string; count: number }[];
  p95GuardLatencyMs: number;
}

export async function getMetricsSummary(windowHours: number): Promise<MetricsSummary> {
  const db = getDb();
  const since = new Date(Date.now() - windowHours * 60 * 60_000).toISOString();

  const [totalRows, reasonRows] = await Promise.all([
    db.execute(sql`
      select
        count(*) filter (where decision = 'ALLOW')::int as allow_count,
        count(*) filter (where decision = 'HOLD')::int as hold_count,
        count(*) filter (where decision = 'BLOCK')::int as block_count,
        coalesce(sum(amount_minor) filter (where state = 'SETTLED'), 0)::text as spent,
        coalesce(sum(amount_minor) filter (where decision = 'BLOCK'), 0)::text as blocked,
        count(*) filter (where tx_hash is not null)::int as on_chain,
        -- The headline claim: a blocked payment must never have reached the chain.
        count(*) filter (where decision = 'BLOCK' and tx_hash is not null)::int as blocked_on_chain,
        coalesce(percentile_disc(0.95) within group (order by latency_ms)
          filter (where latency_ms is not null), 0)::int as p95_latency
      from payment_intents
      where created_at >= ${since}::timestamptz
    `),
    db.execute(sql`
      -- Aliased as block_reason(entry), because a bare "reason" would bind to the intent's own
      -- text column instead of the unnested element, and ->> would fail on text.
      select block_reason.entry->>'code' as code, count(*)::int as count
      from payment_intents, jsonb_array_elements(coalesce(reasons, '[]'::jsonb)) as block_reason(entry)
      where decision = 'BLOCK' and created_at >= ${since}::timestamptz
      group by 1
      order by count desc, code asc
      limit 5
    `),
  ]);

  const totals = (totalRows as unknown as Record<string, unknown>[])[0] ?? {};
  const reasons = reasonRows as unknown as Record<string, unknown>[];

  return {
    decisions: {
      allow: toCount(totals.allow_count),
      hold: toCount(totals.hold_count),
      block: toCount(totals.block_count),
    },
    spentMinor: toMinorUnits(totals.spent),
    blockedMinor: toMinorUnits(totals.blocked),
    onChainTxCount: toCount(totals.on_chain),
    blockedOnChainTxCount: toCount(totals.blocked_on_chain),
    topBlockReasons: reasons.map((row) => ({ code: String(row.code), count: toCount(row.count) })),
    p95GuardLatencyMs: toCount(totals.p95_latency),
  };
}
