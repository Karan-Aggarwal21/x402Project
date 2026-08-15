// OWNER: CORE. Does the I/O the engine refuses to do, then calls the pure engine.
// Fails closed: every path out of here that is not a clean evaluation is a BLOCK.
import { writeAudit } from "@/core/audit/log";
import {
  findByIdempotencyKey,
  getActivePolicy,
  getAgentById,
  getSpendCounters,
  insertIntent,
  recordDecision,
} from "@/core/db/queries";
import { evaluate } from "@/core/policy/engine";
import { ERROR_CODES } from "@/shared/errors";
import type {
  EvaluationContext,
  EvaluationResult,
  PaymentIntent,
  Policy,
  Reason,
} from "@/shared/types";
import type { PolicyRow } from "@/core/db/schema";

export interface EvaluatePaymentInput {
  intent: PaymentIntent;
  idempotencyKey?: string;
}

function failClosed(code: "GUARD_UNAVAILABLE" | "IDEMPOTENCY_CONFLICT", latencyMs: number): EvaluationResult {
  const reason: Reason = { code, rule: "guard", message: ERROR_CODES[code].message };
  return {
    decision: "BLOCK",
    reasons: [reason],
    riskScore: 0,
    riskSignals: [],
    matchedRules: [],
    policyVersion: 0,
    latencyMs,
  };
}

function toPolicy(row: PolicyRow): Policy {
  return {
    policyId: row.id,
    agentId: row.agentId,
    version: row.version,
    isActive: row.isActive,
    rules: row.rules,
    createdAt: row.createdAt,
  };
}

const normalizeHost = (host: string): string => host.trim().toLowerCase();

export async function evaluatePayment(input: EvaluatePaymentInput): Promise<EvaluationResult> {
  const startedAt = performance.now();
  const elapsed = () => Math.round(performance.now() - startedAt);
  const { intent, idempotencyKey } = input;

  try {
    if (idempotencyKey) {
      const prior = await findByIdempotencyKey(intent.agentId, idempotencyKey);
      if (prior) {
        // Same key, different body is an attacker or a bug — either way it is not the same payment.
        if (prior.intentHash !== intent.intentHash) return failClosed("IDEMPOTENCY_CONFLICT", elapsed());
        return {
          decision: prior.decision ?? "BLOCK",
          reasons: prior.reasons ?? [],
          riskScore: prior.riskScore,
          riskSignals: prior.riskSignals ?? [],
          matchedRules: prior.matchedRules ?? [],
          policyVersion: prior.policyVersion ?? 0,
          latencyMs: elapsed(),
        };
      }
    }

    // The attempt is recorded before it is judged, so a refused payment still leaves a trace.
    await insertIntent({
      id: intent.intentId,
      agentId: intent.agentId,
      amountMinor: intent.amountMinor,
      asset: intent.asset,
      network: intent.network,
      recipient: intent.recipient,
      merchantDomain: intent.merchant,
      resource: intent.resource,
      reason: intent.reason,
      nonce: intent.nonce,
      intentHash: intent.intentHash,
      idempotencyKey: idempotencyKey ?? null,
      state: "EVALUATING",
      createdAt: intent.createdAt,
    });

    const [agent, policyRow] = await Promise.all([
      getAgentById(intent.agentId),
      getActivePolicy(intent.agentId),
    ]);

    const now = new Date();
    const counters = await getSpendCounters(intent.agentId, intent.merchant, now);

    const merchantRules = policyRow?.rules.merchant;
    const pinnedRecipient = merchantRules
      ? Object.entries(merchantRules.pinnedRecipients).find(
          ([host]) => normalizeHost(host) === normalizeHost(intent.merchant),
        )?.[1]
      : undefined;

    // Wallet allowance is capped by whichever of the grant and the balance is smaller, less the
    // money already promised. Committed spend is not subtracted: the funded figure is not re-read
    // from chain, so doing that would count the same dollars twice.
    const walletCeilingMinor =
      agent && agent.walletAllowanceCapMinor < agent.walletFundedMinor
        ? agent.walletAllowanceCapMinor
        : (agent?.walletFundedMinor ?? 0n);
    const walletAllowanceRemainingMinor =
      walletCeilingMinor > counters.reservedMinor ? walletCeilingMinor - counters.reservedMinor : 0n;

    const context: EvaluationContext = {
      intent,
      // A missing policy is left for the engine to refuse, so deny-by-default lives in one place.
      policy: policyRow ? toPolicy(policyRow) : (undefined as unknown as Policy),
      counters,
      agentStatus: agent?.status ?? "FROZEN",
      // The merchants table is deferred, so the policy allowlist is what "known" means today.
      merchantKnown: Boolean(
        merchantRules?.allowedMerchants.some((host) => normalizeHost(host) === normalizeHost(intent.merchant)),
      ),
      pinnedRecipient: pinnedRecipient as `0x${string}` | undefined,
      walletAllowanceRemainingMinor,
      now,
    };

    const result = evaluate(context);
    result.latencyMs = elapsed();

    // Audit BEFORE the result returns, so nothing can be signed against a decision that was
    // never recorded. CLAUDE.md rule 4 — this ordering is the security property, not a preference.
    await writeAudit(
      "DECISION",
      {
        decision: result.decision,
        reasons: result.reasons,
        riskScore: result.riskScore,
        amountMinor: intent.amountMinor.toString(),
        merchant: intent.merchant,
        policyVersion: result.policyVersion,
      },
      `agent:${intent.agentId}`,
      { agentId: intent.agentId, intentId: intent.intentId, live: "decision" },
    );

    await recordDecision(intent.intentId, result);
    return result;
  } catch (error) {
    console.error("evaluatePayment failed closed:", error);
    const blocked = failClosed("GUARD_UNAVAILABLE", elapsed());

    // Best effort only. The guard is already returning BLOCK; a second failure must not change that.
    try {
      await writeAudit(
        "DECISION",
        { decision: "BLOCK", reason: "GUARD_UNAVAILABLE", error: String(error) },
        "guard",
        { agentId: intent.agentId, intentId: intent.intentId, live: "decision" },
      );
      await recordDecision(intent.intentId, blocked);
    } catch {
      // The database is what failed in the first place; there is nowhere left to write.
    }

    return blocked;
  }
}
