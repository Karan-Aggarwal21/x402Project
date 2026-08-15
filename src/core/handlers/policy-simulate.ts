// OWNER: CORE · replay history against a draft policy · API_DOCS 5.2
// Answers the question a reviewer actually has before saving an edit: "what would this have changed?"
import { z } from "zod";
import { getAgentById, getSpendCounters, listIntents } from "@/core/db/queries";
import { handle, parseBody } from "@/core/handlers/guards";
import { policyRulesSchema } from "@/core/handlers/policyRules";
import { evaluate } from "@/core/policy/engine";
import { fail, ok } from "@/shared/http";
import { toUsd } from "@/shared/money";
import type { EvaluationContext, Policy } from "@/shared/types";

const simulateSchema = z.object({
  rules: policyRulesSchema,
  limit: z.number().int().min(1).max(200).default(50),
});

const normalizeHost = (host: string): string => host.trim().toLowerCase();

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ agentId: string }> },
): Promise<Response> =>
  handle("POST /api/v1/policies/:agentId/simulate", async () => {
    const { agentId } = await params;
    const agent = await getAgentById(agentId);
    if (!agent) return fail("NOT_FOUND", { agentId });

    const parsed = await parseBody(request, simulateSchema);
    if (!parsed.ok) return parsed.response;

    const history = await listIntents({ agentId, limit: parsed.data.limit });
    const now = new Date();

    const draft: Policy = {
      policyId: "pol_draft",
      agentId,
      version: 0,
      isActive: false,
      rules: parsed.data.rules,
      createdAt: now,
    };

    const walletCeilingMinor =
      agent.walletAllowanceCapMinor < agent.walletFundedMinor
        ? agent.walletAllowanceCapMinor
        : agent.walletFundedMinor;

    const results = [];
    for (const row of history) {
      // Counters are read as of each intent's own moment, so the replay is not judged against
      // today's balances. The engine stays pure; only this loop does the I/O.
      const counters = await getSpendCounters(agentId, row.merchantDomain, row.createdAt);
      const pinned = Object.entries(parsed.data.rules.merchant.pinnedRecipients).find(
        ([host]) => normalizeHost(host) === normalizeHost(row.merchantDomain),
      )?.[1];

      const context: EvaluationContext = {
        intent: {
          intentId: row.id,
          agentId: row.agentId,
          amountMinor: row.amountMinor,
          asset: row.asset,
          network: row.network,
          recipient: row.recipient as `0x${string}`,
          merchant: row.merchantDomain,
          resource: row.resource,
          reason: row.reason ?? undefined,
          nonce: row.nonce,
          intentHash: row.intentHash,
          state: row.state,
          createdAt: row.createdAt,
        },
        policy: draft,
        counters,
        agentStatus: agent.status,
        merchantKnown: parsed.data.rules.merchant.allowedMerchants.some(
          (host) => normalizeHost(host) === normalizeHost(row.merchantDomain),
        ),
        pinnedRecipient: pinned as `0x${string}` | undefined,
        walletAllowanceRemainingMinor:
          walletCeilingMinor > counters.reservedMinor ? walletCeilingMinor - counters.reservedMinor : 0n,
        now: row.createdAt,
      };

      const simulated = evaluate(context);
      results.push({
        intentId: row.id,
        amountUsd: toUsd(row.amountMinor),
        merchant: row.merchantDomain,
        was: row.decision,
        wouldBe: simulated.decision,
        changed: row.decision !== simulated.decision,
        reasons: simulated.reasons,
      });
    }

    const changed = results.filter((entry) => entry.changed);
    return ok({
      simulated: results.length,
      changedCount: changed.length,
      // Loosening a policy is the dangerous direction, so it is called out on its own.
      newlyAllowed: changed.filter((entry) => entry.wouldBe === "ALLOW").length,
      newlyBlocked: changed.filter((entry) => entry.wouldBe === "BLOCK").length,
      results,
    });
  });
