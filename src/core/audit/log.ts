// OWNER: CORE. Append-only event writer. Called BEFORE the payment is signed, never after.
// Each row hashes the one before it, so an edited history cannot be made to verify again.
import { sql } from "drizzle-orm";
import { GENESIS_HASH, computeRowHash } from "@/core/audit/chain";
import { type LiveEvent, publish } from "@/core/audit/events";
import { getDb, schema } from "@/core/db";
import { newId } from "@/shared/ids";

export type AuditEventType =
  | "AGENT_CREATED" | "AGENT_FROZEN" | "KEY_ROTATED"
  | "POLICY_CREATED" | "POLICY_ACTIVATED"
  | "INTENT_CREATED" | "DECISION"
  | "BUDGET_RESERVED" | "BUDGET_COMMITTED" | "BUDGET_RELEASED"
  | "APPROVAL_REQUESTED" | "APPROVED" | "REJECTED" | "EXPIRED"
  | "PAYMENT_SIGNED" | "PAYMENT_SETTLED" | "PAYMENT_FAILED"
  | "MERCHANT_ADDED" | "MERCHANT_BLOCKED";

export interface AuditContext {
  agentId?: string | null;
  intentId?: string | null;
  /** Which SSE channel this event belongs on, if any. */
  live?: LiveEvent;
}

// One chain for the whole log, so the writer is serialised on a single key. Two concurrent writers
// would otherwise read the same prevHash and fork the chain into two rows that both look valid.
const AUDIT_CHAIN_LOCK = 4_021_000_000n;

export async function writeAudit(
  type: AuditEventType,
  payload: unknown,
  actor: string,
  context: AuditContext = {},
): Promise<void> {
  const agentId = context.agentId ?? null;
  const intentId = context.intentId ?? null;

  await getDb().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${AUDIT_CHAIN_LOCK})`);

    // Aliased to last_seq, not seq: an output alias shadows the column in ORDER BY, so
    // "seq::text as seq ... order by seq" sorts as text and picks "9" over "40".
    const previous = (await tx.execute(sql`
      select seq::text as last_seq, row_hash from audit_logs order by seq desc limit 1
    `)) as unknown as Record<string, unknown>[];

    const seq = BigInt(String(previous[0]?.last_seq ?? "0")) + 1n;
    const prevHash = previous[0]?.row_hash ? String(previous[0].row_hash) : GENESIS_HASH;

    // Key set and order must match src/core/db/seed.ts exactly, or a seeded chain stops verifying.
    const row = { agentId, intentId, eventType: type, actor, payload, seq };

    await tx.insert(schema.auditLogs).values({
      id: newId("audit"),
      ...row,
      prevHash,
      rowHash: computeRowHash(prevHash, row),
    });
  });

  if (context.live) publish(context.live, { eventType: type, agentId, intentId, payload });
}
