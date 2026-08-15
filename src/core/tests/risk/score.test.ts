// OWNER: CORE. Every signal both directions, plus the clamp and the determinism claim.
// If this file goes red, "the score is not a model" stops being true.
import { describe, expect, it } from "vitest";
import { scoreRisk } from "@/core/risk/score";
import { RISK_SIGNALS, SIGNAL_POINTS } from "@/core/risk/signals";
import { toMinor } from "@/shared/money";
import {
  makeContext,
  makeCounters,
  makeIntent,
  makePolicy,
  makePolicyRules,
} from "@/core/tests/fixtures";

const codesOf = (ctx: Parameters<typeof scoreRisk>[0]) =>
  scoreRisk(ctx).signals.map((signal) => signal.signal);

describe("scoreRisk", () => {
  it("scores a clean payment at zero with no signals", () => {
    expect(scoreRisk(makeContext())).toEqual({ score: 0, signals: [] });
  });

  it("fires unknown_merchant only when the merchant is unknown", () => {
    const ctx = makeContext({ merchantKnown: false });
    expect(codesOf(ctx)).toContain("unknown_merchant");
    expect(scoreRisk(ctx).score).toBe(SIGNAL_POINTS.unknown_merchant);
    expect(codesOf(makeContext())).not.toContain("unknown_merchant");
  });

  it("fires recipient_not_pinned when no pin exists", () => {
    const rules = makePolicyRules({
      merchant: { ...makePolicyRules().merchant, pinnedRecipients: {} },
    });
    const ctx = makeContext({ policy: makePolicy({ rules }), pinnedRecipient: undefined });
    expect(codesOf(ctx)).toContain("recipient_not_pinned");
    expect(codesOf(makeContext())).not.toContain("recipient_not_pinned");
  });

  it("fires recipient_not_pinned when pinning is switched off — an unenforced pin protects nothing", () => {
    const rules = makePolicyRules({
      merchant: { ...makePolicyRules().merchant, enforceRecipientPinning: false },
    });
    expect(codesOf(makeContext({ policy: makePolicy({ rules }) }))).toContain("recipient_not_pinned");
  });

  it("fires over_half_remaining_daily_budget past half of what is left", () => {
    // $5.00 daily budget, $4.00 already spent, so $1.00 remains and $0.60 is over half of it.
    const ctx = makeContext({
      intent: makeIntent({ amountMinor: toMinor("0.60") }),
      counters: makeCounters({ daySpentMinor: toMinor("4.00") }),
    });
    expect(codesOf(ctx)).toContain("over_half_remaining_daily_budget");

    const exactlyHalf = makeContext({
      intent: makeIntent({ amountMinor: toMinor("0.50") }),
      counters: makeCounters({ daySpentMinor: toMinor("4.00") }),
    });
    expect(codesOf(exactlyHalf)).not.toContain("over_half_remaining_daily_budget");
  });

  it("counts reservations as spent when sizing the remaining budget", () => {
    const ctx = makeContext({
      intent: makeIntent({ amountMinor: toMinor("0.60") }),
      counters: makeCounters({ daySpentMinor: toMinor("3.00"), reservedMinor: toMinor("1.00") }),
    });
    expect(codesOf(ctx)).toContain("over_half_remaining_daily_budget");
  });

  it("fires blocked_attempts_recent after a single recent block", () => {
    expect(codesOf(makeContext({ counters: makeCounters({ blockedAttemptsLast5Min: 1 }) })))
      .toContain("blocked_attempts_recent");
    expect(codesOf(makeContext({ counters: makeCounters({ blockedAttemptsLast5Min: 0 }) })))
      .not.toContain("blocked_attempts_recent");
  });

  it("fires over_5x_median_amount past five times the median", () => {
    const counters = makeCounters({ medianAmountMinor24h: toMinor("0.02") });
    const outlier = makeContext({ intent: makeIntent({ amountMinor: toMinor("0.11") }), counters });
    expect(codesOf(outlier)).toContain("over_5x_median_amount");

    const exactlyFiveX = makeContext({ intent: makeIntent({ amountMinor: toMinor("0.10") }), counters });
    expect(codesOf(exactlyFiveX)).not.toContain("over_5x_median_amount");
  });

  it("does not fire over_5x_median_amount with no history to compare against", () => {
    const ctx = makeContext({
      intent: makeIntent({ amountMinor: toMinor("5.00") }),
      counters: makeCounters({ medianAmountMinor24h: 0n }),
    });
    expect(codesOf(ctx)).not.toContain("over_5x_median_amount");
  });

  it("fires velocity_near_limit at 80% of any velocity limit", () => {
    // 8 of 10 per minute is exactly 80%.
    expect(codesOf(makeContext({ counters: makeCounters({ txLastMinute: 8 }) })))
      .toContain("velocity_near_limit");
    expect(codesOf(makeContext({ counters: makeCounters({ txLastMinute: 7 }) })))
      .not.toContain("velocity_near_limit");
    // The per-merchant and hourly limits count too: 4 of 5, and 80 of 100.
    expect(codesOf(makeContext({ counters: makeCounters({ txLastMinuteForMerchant: 4 }) })))
      .toContain("velocity_near_limit");
    expect(codesOf(makeContext({ counters: makeCounters({ txLastHour: 80 }) })))
      .toContain("velocity_near_limit");
  });

  it("fires first_payment_by_agent on the agent's first payment", () => {
    expect(codesOf(makeContext({ counters: makeCounters({ isFirstPayment: true }) })))
      .toContain("first_payment_by_agent");
    expect(codesOf(makeContext())).not.toContain("first_payment_by_agent");
  });

  it("clamps to 100 when every signal fires, and reports all seven", () => {
    const rules = makePolicyRules({
      merchant: { ...makePolicyRules().merchant, pinnedRecipients: {} },
    });
    const worst = makeContext({
      intent: makeIntent({ amountMinor: toMinor("3.00") }),
      policy: makePolicy({ rules }),
      pinnedRecipient: undefined,
      merchantKnown: false,
      counters: makeCounters({
        blockedAttemptsLast5Min: 3,
        txLastMinute: 9,
        medianAmountMinor24h: toMinor("0.03"),
        isFirstPayment: true,
      }),
    });
    const { score, signals } = scoreRisk(worst);
    const rawTotal = signals.reduce((sum, signal) => sum + signal.points, 0);

    expect(signals).toHaveLength(RISK_SIGNALS.length);
    expect(rawTotal).toBe(165);
    expect(score).toBe(100);
  });

  it("is deterministic — the same context scores identically on 100 runs", () => {
    const ctx = makeContext({
      intent: makeIntent({ amountMinor: toMinor("0.60") }),
      merchantKnown: false,
      counters: makeCounters({ daySpentMinor: toMinor("4.00"), txLastMinute: 8 }),
    });
    const first = JSON.stringify(scoreRisk(ctx));
    for (let i = 0; i < 100; i += 1) {
      expect(JSON.stringify(scoreRisk(ctx))).toBe(first);
    }
  });

  it("always returns an integer inside 0-100", () => {
    const contexts = [
      makeContext(),
      makeContext({ merchantKnown: false }),
      makeContext({ counters: makeCounters({ isFirstPayment: true, blockedAttemptsLast5Min: 9 }) }),
      makeContext({ intent: makeIntent({ amountMinor: toMinor("4.99") }) }),
    ];
    for (const ctx of contexts) {
      const { score } = scoreRisk(ctx);
      expect(Number.isInteger(score)).toBe(true);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it("reports signals in the fixed declaration order", () => {
    const declaration = RISK_SIGNALS.map((signal) => signal.name);
    const ctx = makeContext({
      merchantKnown: false,
      counters: makeCounters({ blockedAttemptsLast5Min: 1, isFirstPayment: true }),
    });
    const reported = codesOf(ctx);
    const expectedOrder = declaration.filter((name) => reported.includes(name));
    expect(reported).toEqual(expectedOrder);
  });

  it("keeps every declared signal weighted exactly as SIGNAL_POINTS says", () => {
    expect(RISK_SIGNALS).toHaveLength(7);
    for (const signal of RISK_SIGNALS) {
      expect(signal.points).toBe(SIGNAL_POINTS[signal.name]);
    }
  });
});
