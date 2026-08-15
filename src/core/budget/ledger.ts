// OWNER: CORE. Reserve -> commit -> release. This is what makes concurrent overspend impossible:
// all three take a per-agent advisory lock, so one payment at a time is inside check-then-write.
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { windowKeys } from "@/core/budget/windows";
import { getDb, schema } from "@/core/db";
import type { ErrorCode } from "@/shared/errors";
import { newId } from "@/shared/ids";
import { formatUsd } from "@/shared/money";
import type { Reservation } from "@/shared/types";

export const RESERVATION_TTL_MS = 120_000;

/** pg_advisory_xact_lock takes a signed bigint, so the digest is folded into that range. */
export function hashAgentId(agentId: string): bigint {
  return BigInt.asIntN(64, createHash("sha256").update(agentId).digest().readBigUInt64BE(0));
}

type LedgerError = Error & { code: ErrorCode; details?: Record<string, string> };

function ledgerError(code: ErrorCode, message: string, details?: Record<string, string>): LedgerError {
  return Object.assign(new Error(message), { code, details });
}

const toMinorUnits = (value: unknown): bigint => BigInt(String(value ?? "0"));

type Executor = { execute: (query: ReturnType<typeof sql>) => Promise<unknown> };

async function queryRows(executor: Executor, query: ReturnType<typeof sql>): Promise<Record<string, unknown>[]> {
  return (await executor.execute(query)) as unknown as Record<string, unknown>[];
}

interface ReservationRow {
  agentId: string;
  intentId: string | null;
  amountMinor: bigint;
  windowHour: string;
  windowDay: string;
  windowMonth: string;
  isSettled: boolean;
}

async function loadReservation(executor: Executor, reservationId: string): Promise<ReservationRow | null> {
  const [row] = await queryRows(executor, sql`
    select
      agent_id, intent_id, amount_minor::text as amount_minor, window_hour, window_day, window_month,
      (select count(*) from budget_ledger settled
         where settled.reservation_id = ${reservationId}
           and settled.entry_type in ('COMMIT','RELEASE'))::int as settled_count
    from budget_ledger
    where reservation_id = ${reservationId} and entry_type = 'RESERVE'
    limit 1
  `);
  if (!row) return null;
  return {
    agentId: String(row.agent_id),
    intentId: row.intent_id === null ? null : String(row.intent_id),
    amountMinor: toMinorUnits(row.amount_minor),
    windowHour: String(row.window_hour),
    windowDay: String(row.window_day),
    windowMonth: String(row.window_month),
    isSettled: Number(row.settled_count ?? 0) > 0,
  };
}

/** Throws BUDGET_EXCEEDED if the windows have no room. TTL 120 seconds. */
export async function reserveBudget(agentId: string, intentId: string, amountMinor: bigint): Promise<Reservation> {
  if (amountMinor <= 0n) {
    throw ledgerError("BUDGET_EXCEEDED", "A reservation must be for a positive amount.", {
      requested: String(amountMinor),
    });
  }

  const now = new Date();
  const keys = windowKeys(now);
  const expiresAt = new Date(now.getTime() + RESERVATION_TTL_MS);

  return getDb().transaction(async (tx) => {
    // Advisory lock is per-agent so two agents never contend for the same budget row. Taken FIRST:
    // everything below is a read-then-write, and outside the lock two payments both read "room left".
    // Advisory lock is per-agent so two agents never contend for the same budget row. Taken FIRST:
    // everything below is a read-then-write, and outside the lock two payments both read "room left".
    await tx.execute(sql`select pg_advisory_xact_lock(${hashAgentId(agentId)})`);

    const [policy] = await queryRows(tx, sql`
      select hourly_budget_minor::text as hourly, daily_budget_minor::text as daily,
             monthly_budget_minor::text as monthly
      from policies where agent_id = ${agentId} and is_active = true
      order by version desc limit 1
    `);
    if (!policy) {
      throw ledgerError("NO_ACTIVE_POLICY", `No active policy for agent ${agentId}.`);
    }

    const [sums] = await queryRows(tx, sql`
      select
        coalesce(sum(amount_minor) filter (where entry_type = 'COMMIT' and window_hour = ${keys.hour}), 0)::text as hour_spent,
        coalesce(sum(amount_minor) filter (where entry_type = 'COMMIT' and window_day = ${keys.day}), 0)::text as day_spent,
        coalesce(sum(amount_minor) filter (where entry_type = 'COMMIT' and window_month = ${keys.month}), 0)::text as month_spent,
        (coalesce(sum(amount_minor) filter (where entry_type = 'RESERVE'), 0)
          - coalesce(sum(amount_minor) filter (where entry_type = 'COMMIT'), 0)
          - coalesce(sum(amount_minor) filter (where entry_type = 'RELEASE'), 0))::text as reserved
      from budget_ledger where agent_id = ${agentId}
    `);

    const reservedMinor = toMinorUnits(sums?.reserved);
    const windows = [
      { label: "hourly", spentMinor: toMinorUnits(sums?.hour_spent), budgetMinor: toMinorUnits(policy.hourly) },
      { label: "daily", spentMinor: toMinorUnits(sums?.day_spent), budgetMinor: toMinorUnits(policy.daily) },
      { label: "monthly", spentMinor: toMinorUnits(sums?.month_spent), budgetMinor: toMinorUnits(policy.monthly) },
    ];

    for (const window of windows) {
      const wouldSpendMinor = window.spentMinor + reservedMinor + amountMinor;
      if (wouldSpendMinor <= window.budgetMinor) continue;
      throw ledgerError(
        "BUDGET_EXCEEDED",
        `This payment would take ${window.label} spend to ${formatUsd(wouldSpendMinor)}, over the ${formatUsd(window.budgetMinor)} ${window.label} budget.`,
        { window: window.label, requested: formatUsd(amountMinor), limit: formatUsd(window.budgetMinor) },
      );
    }

    const reservationId = newId("reservation");
    await tx.insert(schema.budgetLedger).values({
      id: newId("ledger"),
      agentId,
      intentId,
      reservationId,
      entryType: "RESERVE",
      amountMinor,
      windowHour: keys.hour,
      windowDay: keys.day,
      windowMonth: keys.month,
      expiresAt,
    });

    return { reservationId, intentId, amountMinor, expiresAt };
  });
}

/** Called after PAYMENT-RESPONSE confirms settlement. */
export async function commitBudget(reservationId: string, txHash: string): Promise<void> {
  const db = getDb();
  const outside = await loadReservation(db, reservationId);
  if (!outside) throw ledgerError("GUARD_UNAVAILABLE", `Unknown reservation ${reservationId}.`);

  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${hashAgentId(outside.agentId)})`);

    // Re-read under the lock: the sweeper may have released this reservation since the check above.
    const reservation = await loadReservation(tx, reservationId);
    if (!reservation || reservation.isSettled) return;

    await tx.insert(schema.budgetLedger).values({
      id: newId("ledger"),
      agentId: reservation.agentId,
      intentId: reservation.intentId,
      reservationId,
      entryType: "COMMIT",
      amountMinor: reservation.amountMinor,
      // The COMMIT inherits the RESERVE's windows: the money belongs to the window that admitted it,
      // not to whichever window the settlement happened to land in.
      windowHour: reservation.windowHour,
      windowDay: reservation.windowDay,
      windowMonth: reservation.windowMonth,
    });

    // Stamped in the same transaction as the ledger row, so a committed budget and a settled
    // intent can never disagree. The ledger has no column for a tx hash; the intent does.
    if (reservation.intentId) {
      await tx.execute(sql`
        update payment_intents
        set tx_hash = ${txHash}, settled_at = now(), state = 'SETTLED', updated_at = now()
        where id = ${reservation.intentId}
      `);
    }
  });
}

/** Called on every failure path, and by the TTL sweeper. */
export async function releaseBudget(reservationId: string, reason: string): Promise<void> {
  const db = getDb();
  const outside = await loadReservation(db, reservationId);
  if (!outside) throw ledgerError("GUARD_UNAVAILABLE", `Unknown reservation ${reservationId}.`);

  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${hashAgentId(outside.agentId)})`);

    // Releasing twice must be harmless: the orchestrator releases on failure and so does the sweeper.
    const reservation = await loadReservation(tx, reservationId);
    if (!reservation || reservation.isSettled) return;

    await tx.insert(schema.budgetLedger).values({
      id: newId("ledger"),
      agentId: reservation.agentId,
      intentId: reservation.intentId,
      reservationId,
      entryType: "RELEASE",
      amountMinor: reservation.amountMinor,
      windowHour: reservation.windowHour,
      windowDay: reservation.windowDay,
      windowMonth: reservation.windowMonth,
    });

    if (reservation.intentId) {
      await tx.execute(sql`
        update payment_intents set failure_reason = ${reason}, updated_at = now()
        where id = ${reservation.intentId} and state <> 'SETTLED'
      `);
    }
  });
}

/** Sweeper: releases reservations whose TTL elapsed. Wired to /api/v1/cron/sweep. */
export async function sweepExpiredReservations(): Promise<number> {
  const expired = await queryRows(getDb(), sql`
    select reservation_id from budget_ledger reserved
    where reserved.entry_type = 'RESERVE'
      and reserved.expires_at < now()
      and not exists (
        select 1 from budget_ledger settled
        where settled.reservation_id = reserved.reservation_id
          and settled.entry_type in ('COMMIT','RELEASE'))
  `);

  let released = 0;
  for (const row of expired) {
    await releaseBudget(String(row.reservation_id), "Reservation TTL elapsed.");
    released += 1;
  }
  return released;
}
