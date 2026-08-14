// OWNER: CORE. The only place outside budget/ledger.ts that touches the database.
// Handlers call these; they never import getDb() directly. That keeps a future
// change like adding multi-tenancy to one file instead of twenty-six.
import type { AgentRow, PaymentIntentRow, PolicyRow } from "@/core/db/schema";
import type { SpendCounters } from "@/shared/types";

// --- agents ---------------------------------------------------------------

export async function getAgentByApiKeyHash(_hash: string): Promise<AgentRow | null> {
  throw new Error("NOT_IMPLEMENTED: getAgentByApiKeyHash");
}

export async function getAgentById(_agentId: string): Promise<AgentRow | null> {
  throw new Error("NOT_IMPLEMENTED: getAgentById");
}

export async function listAgents(): Promise<AgentRow[]> {
  throw new Error("NOT_IMPLEMENTED: listAgents");
}

export async function createAgent(_input: Partial<AgentRow>): Promise<AgentRow> {
  throw new Error("NOT_IMPLEMENTED: createAgent");
}

export async function setAgentStatus(_agentId: string, _status: "ACTIVE" | "FROZEN", _reason?: string): Promise<void> {
  throw new Error("NOT_IMPLEMENTED: setAgentStatus");
}

// --- policies -------------------------------------------------------------

export async function getActivePolicy(_agentId: string): Promise<PolicyRow | null> {
  throw new Error("NOT_IMPLEMENTED: getActivePolicy");
}

export async function listPolicyVersions(_agentId: string): Promise<PolicyRow[]> {
  throw new Error("NOT_IMPLEMENTED: listPolicyVersions");
}

/** Creates version n+1 and flips is_active in one transaction. Never mutates a version. */
export async function createPolicyVersion(_agentId: string, _rules: unknown, _byEmail?: string): Promise<PolicyRow> {
  throw new Error("NOT_IMPLEMENTED: createPolicyVersion");
}

// --- intents --------------------------------------------------------------

export async function insertIntent(_input: Partial<PaymentIntentRow>): Promise<PaymentIntentRow> {
  throw new Error("NOT_IMPLEMENTED: insertIntent");
}

/** Writes the decision onto the intent. Must happen before anything is signed. */
export async function recordDecision(_intentId: string, _result: unknown): Promise<void> {
  throw new Error("NOT_IMPLEMENTED: recordDecision");
}

export async function setIntentState(_intentId: string, _state: PaymentIntentRow["state"]): Promise<void> {
  throw new Error("NOT_IMPLEMENTED: setIntentState");
}

export async function recordSettlement(_intentId: string, _txHash: string, _raw: unknown): Promise<void> {
  throw new Error("NOT_IMPLEMENTED: recordSettlement");
}

export async function recordFailure(_intentId: string, _failureReason: string): Promise<void> {
  throw new Error("NOT_IMPLEMENTED: recordFailure");
}

export async function getIntentById(_intentId: string): Promise<PaymentIntentRow | null> {
  throw new Error("NOT_IMPLEMENTED: getIntentById");
}

export async function findByIdempotencyKey(_agentId: string, _key: string): Promise<PaymentIntentRow | null> {
  throw new Error("NOT_IMPLEMENTED: findByIdempotencyKey");
}

export interface IntentFilters {
  agentId?: string;
  decision?: "ALLOW" | "HOLD" | "BLOCK";
  merchantDomain?: string;
  limit?: number;
  cursor?: string;
}

export async function listIntents(_filters: IntentFilters): Promise<PaymentIntentRow[]> {
  throw new Error("NOT_IMPLEMENTED: listIntents");
}

// --- counters (the engine's inputs) --------------------------------------

/** Ledger sums + velocity counts + risk inputs, in as few round trips as possible. */
export async function getSpendCounters(_agentId: string, _merchantDomain: string, _now: Date): Promise<SpendCounters> {
  throw new Error("NOT_IMPLEMENTED: getSpendCounters");
}

// --- approvals ------------------------------------------------------------

export async function listPendingApprovals(): Promise<PaymentIntentRow[]> {
  throw new Error("NOT_IMPLEMENTED: listPendingApprovals");
}

export async function actionApproval(
  _intentId: string,
  _status: "APPROVED" | "REJECTED" | "EXPIRED",
  _reviewerEmail?: string,
  _note?: string,
): Promise<void> {
  throw new Error("NOT_IMPLEMENTED: actionApproval");
}

// --- metrics --------------------------------------------------------------

export interface MetricsSummary {
  decisions: { allow: number; hold: number; block: number };
  spentMinor: bigint;
  blockedMinor: bigint;
  onChainTxCount: number;
  blockedOnChainTxCount: number;
  topBlockReasons: { code: string; count: number }[];
  p95GuardLatencyMs: number;
}

export async function getMetricsSummary(_windowHours: number): Promise<MetricsSummary> {
  throw new Error("NOT_IMPLEMENTED: getMetricsSummary");
}
