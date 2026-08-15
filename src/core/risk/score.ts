// OWNER: CORE. Sums the triggered signals, clamped to 0-100. Pure and deterministic.
// Returns the signals too, because the UI has to answer "why 71?" on the transaction detail page.
import { RISK_SIGNALS } from "@/core/risk/signals";
import type { EvaluationContext, RiskSignal } from "@/shared/types";

export const MIN_RISK_SCORE = 0;
export const MAX_RISK_SCORE = 100;

export function scoreRisk(ctx: EvaluationContext): { score: number; signals: RiskSignal[] } {
  const signals: RiskSignal[] = [];
  let total = 0;

  for (const definition of RISK_SIGNALS) {
    if (!definition.triggered(ctx)) continue;
    signals.push({ signal: definition.name, points: definition.points });
    total += definition.points;
  }

  // The weights sum past 100, so the cap is load-bearing rather than defensive.
  return { score: Math.min(MAX_RISK_SCORE, Math.max(MIN_RISK_SCORE, total)), signals };
}
