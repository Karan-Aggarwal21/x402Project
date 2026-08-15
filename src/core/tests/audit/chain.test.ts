// OWNER: CORE. The audit chain is the product's "you cannot deny this happened" claim.
// A verifier that only ever returns true would satisfy the endpoint and prove nothing, so the
// tamper cases matter more than the happy one.
import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { GENESIS_HASH, canonicalJson, computeRowHash, verifyChain } from "@/core/audit/chain";
import { getDb } from "@/core/db";

try { process.loadEnvFile(".env.local"); } catch { /* CI supplies DATABASE_URL directly */ }

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe("canonicalJson", () => {
  it("does not depend on key order", () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe(canonicalJson({ a: 2, b: 1 }));
  });

  it("serialises bigint and Date without losing them to JSON", () => {
    expect(canonicalJson({ amount: 50000n })).toBe('{"amount":"50000"}');
    expect(canonicalJson({ at: new Date("2026-08-13T09:00:00.000Z") })).toBe('{"at":"2026-08-13T09:00:00.000Z"}');
  });

  it("sorts nested keys too, so a reordered payload hashes the same", () => {
    const left = computeRowHash(GENESIS_HASH, { payload: { z: 1, a: { y: 2, x: 3 } } });
    const right = computeRowHash(GENESIS_HASH, { payload: { a: { x: 3, y: 2 }, z: 1 } });
    expect(left).toBe(right);
  });

  it("changes the hash when any value changes", () => {
    const original = computeRowHash(GENESIS_HASH, { decision: "BLOCK" });
    expect(computeRowHash(GENESIS_HASH, { decision: "ALLOW" })).not.toBe(original);
    // And the same row under a different predecessor is a different hash — that is the chaining.
    expect(computeRowHash("a".repeat(64), { decision: "BLOCK" })).not.toBe(original);
  });
});

describe.skipIf(!hasDatabase)("verifyChain", () => {
  it("verifies the chain the seed wrote", async () => {
    const result = await verifyChain();
    expect(result.valid).toBe(true);
    expect(result.rowsChecked).toBeGreaterThanOrEqual(40);
    expect(result.brokenAt).toBeNull();
  });

  it("reports the exact row when a payload is edited underneath it", async () => {
    const db = getDb();
    const [target] = (await db.execute(sql`
      select id, payload from audit_logs order by seq asc offset 5 limit 1
    `)) as unknown as Record<string, unknown>[];
    const originalPayload = JSON.stringify(target.payload);

    // Edit history exactly the way someone covering their tracks would.
    await db.execute(sql`
      update audit_logs set payload = ${JSON.stringify({ tampered: true })}::jsonb where id = ${String(target.id)}
    `);

    try {
      const broken = await verifyChain();
      expect(broken.valid).toBe(false);
      expect(broken.brokenAt).toBe(String(target.id));
      // It fails at the edited row, not at the end — the break is located, not just detected.
      expect(broken.rowsChecked).toBe(5);
    } finally {
      await db.execute(sql`
        update audit_logs set payload = ${originalPayload}::jsonb where id = ${String(target.id)}
      `);
    }

    expect((await verifyChain()).valid).toBe(true);
  });

  it("catches a row that was deleted from the middle", async () => {
    const db = getDb();
    const [target] = (await db.execute(sql`
      select id, agent_id, intent_id, event_type, actor, payload, prev_hash, row_hash, seq::text as seq_text
      from audit_logs order by seq asc offset 8 limit 1
    `)) as unknown as Record<string, unknown>[];

    await db.execute(sql`delete from audit_logs where id = ${String(target.id)}`);

    try {
      // The next row's prev_hash now points at a hash no row produces any more.
      expect((await verifyChain()).valid).toBe(false);
    } finally {
      await db.execute(sql`
        insert into audit_logs (id, agent_id, intent_id, event_type, actor, payload, prev_hash, row_hash, seq)
        values (${String(target.id)}, ${target.agent_id as string | null}, ${target.intent_id as string | null},
                ${String(target.event_type)}, ${String(target.actor)}, ${JSON.stringify(target.payload)}::jsonb,
                ${String(target.prev_hash)}, ${String(target.row_hash)}, ${String(target.seq_text)}::bigint)
      `);
    }

    expect((await verifyChain()).valid).toBe(true);
  });
});
