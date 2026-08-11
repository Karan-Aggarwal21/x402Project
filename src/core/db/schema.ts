/**
 * OWNER: CORE
 * WHAT: The 12 tables. Drizzle + PostgreSQL.
 * RULE: Every money column is `bigint` minor units. Never numeric, never real.
 * DOCS: ARCHITECTURE.md section 10 (erDiagram + column list)
 * PHASE: P1 - ship this by T+1:30, everything else depends on it.
 */

// Tables to define, in this order:
//   organizations, users, agents, agent_wallets, policies, merchants,
//   payment_intents, evaluations, budget_ledger, approvals, payments, audit_logs
//
// Index hints that matter for the hot path:
//   budget_ledger  (agent_id, window_day), (agent_id, window_hour), (expires_at)
//   payment_intents(agent_id, created_at desc), unique(idempotency_key)
//   evaluations    (intent_id), (decision, created_at desc)
//   audit_logs     (org_id, created_at desc)

export {};

