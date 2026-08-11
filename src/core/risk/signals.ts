/**
 * OWNER: CORE
 * WHAT: The 7 risk signals and their point values. Deterministic weights, not a model.
 * DOCS: PRD.md section 5.4
 */

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

