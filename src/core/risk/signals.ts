// OWNER: CORE. The 7 risk signals: their weights and exactly what trips each one.
// Fixed weights, no model, no randomness — "why 71?" must have the same answer every time.
import { findPinnedRecipient } from "@/core/policy/rules";
import { toMinor } from "@/shared/money";
import type { EvaluationContext } from "@/shared/types";

export const SIGNAL_POINTS = {
  unknown_merchant: 40,
  recipient_not_pinned: 30,
  over_half_remaining_daily_budget: 25,
  blocked_attempts_recent: 25,
  over_5x_median_amount: 20,
  velocity_near_limit: 15,
  first_payment_by_agent: 10,
} as const;

export type SignalName = keyof typeof SIGNAL_POINTS;

export interface SignalDefinition {
  name: SignalName;
  points: number;
  triggered: (ctx: EvaluationContext) => boolean;
}

/** Integer 80%-of-limit test, so no float ever decides a signal. */
const isNearLimit = (observed: number, limit: number): boolean => limit > 0 && observed * 5 >= limit * 4;

/** Declaration order is the order the UI renders, so it stays fixed. */
export const RISK_SIGNALS: SignalDefinition[] = [
  {
    name: "unknown_merchant",
    points: SIGNAL_POINTS.unknown_merchant,
    triggered: (ctx) => !ctx.merchantKnown,
  },
  {
    name: "recipient_not_pinned",
    points: SIGNAL_POINTS.recipient_not_pinned,
    // Enforcement being off counts too: an unenforced pin protects nothing.
    triggered: (ctx) =>
      !ctx.policy.rules.merchant.enforceRecipientPinning || !findPinnedRecipient(ctx),
  },
  {
    name: "over_half_remaining_daily_budget",
    points: SIGNAL_POINTS.over_half_remaining_daily_budget,
    triggered: (ctx) => {
      const budgetMinor = toMinor(ctx.policy.rules.financial.dailyBudgetUsd);
      const remainingMinor = budgetMinor - ctx.counters.daySpentMinor - ctx.counters.reservedMinor;
      return ctx.intent.amountMinor * 2n > remainingMinor;
    },
  },
  {
    name: "blocked_attempts_recent",
    points: SIGNAL_POINTS.blocked_attempts_recent,
    triggered: (ctx) => ctx.counters.blockedAttemptsLast5Min > 0,
  },
  {
    name: "over_5x_median_amount",
    points: SIGNAL_POINTS.over_5x_median_amount,
    // A zero median means no history to be an outlier against, so first_payment_by_agent carries it.
    triggered: (ctx) =>
      ctx.counters.medianAmountMinor24h > 0n &&
      ctx.intent.amountMinor > ctx.counters.medianAmountMinor24h * 5n,
  },
  {
    name: "velocity_near_limit",
    points: SIGNAL_POINTS.velocity_near_limit,
    triggered: (ctx) => {
      const { velocity } = ctx.policy.rules;
      const { counters } = ctx;
      return (
        isNearLimit(counters.txLastMinute, velocity.maxTxPerMinute) ||
        isNearLimit(counters.txLastMinuteForMerchant, velocity.maxTxPerMerchantPerMinute) ||
        isNearLimit(counters.txLastHour, velocity.maxTxPerHour)
      );
    },
  },
  {
    name: "first_payment_by_agent",
    points: SIGNAL_POINTS.first_payment_by_agent,
    triggered: (ctx) => ctx.counters.isFirstPayment,
  },
];
