/**
 * OWNER: CORE
 * WHAT: Append-only event writer. Called BEFORE the payment is signed, never after.
 * DOCS: CLAUDE.md rule 4, API_DOCS.md section 5.6 (event types)
 */

export type AuditEventType =
  | "AGENT_CREATED" | "AGENT_FROZEN" | "KEY_ROTATED"
  | "POLICY_CREATED" | "POLICY_ACTIVATED"
  | "INTENT_CREATED" | "DECISION"
  | "BUDGET_RESERVED" | "BUDGET_COMMITTED" | "BUDGET_RELEASED"
  | "APPROVAL_REQUESTED" | "APPROVED" | "REJECTED" | "EXPIRED"
  | "PAYMENT_SIGNED" | "PAYMENT_SETTLED" | "PAYMENT_FAILED"
  | "MERCHANT_ADDED" | "MERCHANT_BLOCKED";

export async function writeAudit(_type: AuditEventType, _payload: unknown, _actor: string): Promise<void> {
  throw new Error("NOT_IMPLEMENTED: writeAudit");
}

