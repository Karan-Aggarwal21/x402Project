// OWNER: CORE. Tamper evidence without a blockchain: rowHash = sha256(prevHash + canonicalJson(row)).
// Editing any historical row breaks every hash after it, which verifyChain reports.
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";

export const GENESIS_HASH = "0".repeat(64);

/** Key order must not change the hash, so keys are sorted at every level. */
export function canonicalJson(value: unknown): string {
  if (typeof value === "bigint") return JSON.stringify(value.toString());
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : 1));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

export function computeRowHash(prevHash: string, row: unknown): string {
  return createHash("sha256").update(prevHash + canonicalJson(row)).digest("hex");
}

export async function verifyChain(): Promise<{ valid: boolean; rowsChecked: number; brokenAt: string | null }> {
  const { getDb } = await import("@/core/db");
  // seq is aliased away from its own name: an output alias wins in ORDER BY, and ordering the
  // chain as text would walk it 1, 10, 11, 2 and report a perfectly good chain as broken.
  const rows = (await getDb().execute(sql`
    select id, agent_id, intent_id, event_type, actor, payload, prev_hash, row_hash, seq::text as seq_text
    from audit_logs order by seq asc
  `)) as unknown as Record<string, unknown>[];

  let expectedPrevHash = GENESIS_HASH;
  let rowsChecked = 0;

  for (const stored of rows) {
    // Recomputed from the stored fields, so editing any of them shows up here and in every row after.
    const row = {
      agentId: stored.agent_id ?? null,
      intentId: stored.intent_id ?? null,
      eventType: stored.event_type,
      actor: stored.actor,
      payload: stored.payload,
      seq: BigInt(String(stored.seq_text)),
    };
    const brokeLink = String(stored.prev_hash) !== expectedPrevHash;
    const brokeRow = computeRowHash(expectedPrevHash, row) !== String(stored.row_hash);

    if (brokeLink || brokeRow) {
      return { valid: false, rowsChecked, brokenAt: String(stored.id) };
    }

    expectedPrevHash = String(stored.row_hash);
    rowsChecked += 1;
  }

  return { valid: true, rowsChecked, brokenAt: null };
}

