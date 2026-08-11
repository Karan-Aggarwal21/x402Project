/**
 * OWNER: CORE
 * WHAT: Sums the triggered signals, capped at 100. Pure function.
 *       Returns the individual signals too, so the UI can explain the number.
 */
import type { EvaluationContext, RiskSignal } from "@/shared/types";

export function scoreRisk(_ctx: EvaluationContext): { score: number; signals: RiskSignal[] } {
  throw new Error("NOT_IMPLEMENTED: scoreRisk");
}

