/**
 * OWNER: CORE
 * WHAT: ⭐ The decision. Pure function, zero I/O, fully deterministic.
 *       Walks BLOCKING_RULES in order, then risk tiering, then ALLOW.
 *       Any thrown error is caught by the caller and turned into BLOCK (fail-closed).
 * DOCS: ARCHITECTURE.md section 7
 * TESTS: src/core/tests/policy/
 */
import type { EvaluationContext, EvaluationResult } from "@/shared/types";

export function evaluate(_ctx: EvaluationContext): EvaluationResult {
  // 1. walk BLOCKING_RULES -> first non-null Reason becomes a BLOCK
  // 2. compute the risk score
  // 3. score >= riskBlockScore            -> BLOCK
  // 4. score >= riskHoldScore, or amount in holdBetweenUsd -> HOLD
  // 5. otherwise                          -> ALLOW
  throw new Error("NOT_IMPLEMENTED: evaluate");
}

