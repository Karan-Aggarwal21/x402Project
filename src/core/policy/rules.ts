/**
 * OWNER: CORE
 * WHAT: The 13 precedence rules. Each is a PURE predicate: (ctx) => Reason | null.
 *       `null` means the rule passed. A Reason means it failed.
 * RULE: No DB, no clock, no network. ESLint enforces this.
 * DOCS: ARCHITECTURE.md section 7, PRD.md section 5.3
 */
import type { EvaluationContext, Reason } from "@/shared/types";

type Rule = (ctx: EvaluationContext) => Reason | null;

export const ruleAgentActive: Rule = () => { throw new Error("NOT_IMPLEMENTED: ruleAgentActive"); };
export const ruleRailAllowed: Rule = () => { throw new Error("NOT_IMPLEMENTED: ruleRailAllowed"); };
export const ruleMerchantNotBlocked: Rule = () => { throw new Error("NOT_IMPLEMENTED: ruleMerchantNotBlocked"); };
export const ruleMerchantAllowlisted: Rule = () => { throw new Error("NOT_IMPLEMENTED: ruleMerchantAllowlisted"); };
export const ruleRecipientPinned: Rule = () => { throw new Error("NOT_IMPLEMENTED: ruleRecipientPinned"); };
export const rulePerTransactionLimit: Rule = () => { throw new Error("NOT_IMPLEMENTED: rulePerTransactionLimit"); };
export const ruleAbsoluteBlockThreshold: Rule = () => { throw new Error("NOT_IMPLEMENTED: ruleAbsoluteBlockThreshold"); };
export const ruleBudgetWindows: Rule = () => { throw new Error("NOT_IMPLEMENTED: ruleBudgetWindows"); };
export const ruleVelocity: Rule = () => { throw new Error("NOT_IMPLEMENTED: ruleVelocity"); };
export const ruleWalletAllowance: Rule = () => { throw new Error("NOT_IMPLEMENTED: ruleWalletAllowance"); };

/** Ordered. The engine walks this array top-down and stops at the first non-null. */
export const BLOCKING_RULES: Rule[] = [
  ruleAgentActive,
  ruleRailAllowed,
  ruleMerchantNotBlocked,
  ruleMerchantAllowlisted,
  ruleRecipientPinned,
  rulePerTransactionLimit,
  ruleAbsoluteBlockThreshold,
  ruleBudgetWindows,
  ruleVelocity,
  ruleWalletAllowance,
];

