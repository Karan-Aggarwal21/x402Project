/**
 * OWNER: PAY
 * WHAT: The main flow of the whole product.
 *       forward -> 402 -> build intent -> CORE.evaluate -> reserve -> sign -> retry -> settle -> commit
 *       Every failure path releases the reservation.
 * DOCS: ARCHITECTURE.md section 6 (sequence) and 6.1 (failure paths)
 * PHASE: P3 - this is the critical path of the entire project.
 */
import type { Decision, Reason } from "@/shared/types";

export interface GuardedRequestInput {
  agentId: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: unknown;
  maxAmountUsd?: string;
  reason?: string;
  idempotencyKey?: string;
}

export interface GuardedRequestResult {
  status: "SETTLED" | "BLOCKED" | "PENDING_APPROVAL" | "FAILED";
  intentId: string;
  decision: Decision;
  reasons: Reason[];
  payment?: { amount: string; txHash: `0x${string}`; explorerUrl: string; settledAt: string };
  onChain: { signed: boolean; txHash: string | null };
  response?: { status: number; headers: Record<string, string>; body: unknown };
}

export async function runGuardedRequest(_input: GuardedRequestInput): Promise<GuardedRequestResult> {
  // Day 0: import evaluate from "@/core/mock". Swap to "@/core" when CORE ships.
  throw new Error("NOT_IMPLEMENTED: runGuardedRequest");
}

