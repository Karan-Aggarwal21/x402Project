// OWNER: CORE · hour/day/month utilisation + wallet + velocity headroom · API_DOCS 5.5
import { getActivePolicy, getAgentById, getSpendCounters } from "@/core/db/queries";
import { handle } from "@/core/handlers/guards";
import { fail, ok } from "@/shared/http";
import { toUsd } from "@/shared/money";

/** Integer percentage of a window that is already committed or promised. */
function utilisation(spentMinor: bigint, reservedMinor: bigint, budgetMinor: bigint) {
  const usedMinor = spentMinor + reservedMinor;
  return {
    spentUsd: toUsd(spentMinor),
    reservedUsd: toUsd(reservedMinor),
    budgetUsd: toUsd(budgetMinor),
    remainingUsd: toUsd(usedMinor >= budgetMinor ? 0n : budgetMinor - usedMinor),
    usedPercent: budgetMinor === 0n ? 100 : Number((usedMinor * 100n) / budgetMinor),
  };
}

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> },
): Promise<Response> =>
  handle("GET /api/v1/budgets/:agentId", async () => {
    const { agentId } = await params;
    const [agent, policy] = await Promise.all([getAgentById(agentId), getActivePolicy(agentId)]);
    if (!agent) return fail("NOT_FOUND", { agentId });
    if (!policy) return fail("NO_ACTIVE_POLICY", { agentId });

    const counters = await getSpendCounters(agentId, "", new Date());
    const walletCeilingMinor =
      agent.walletAllowanceCapMinor < agent.walletFundedMinor
        ? agent.walletAllowanceCapMinor
        : agent.walletFundedMinor;

    return ok({
      agentId,
      policyVersion: policy.version,
      windows: {
        hour: utilisation(counters.hourSpentMinor, counters.reservedMinor, policy.hourlyBudgetMinor),
        day: utilisation(counters.daySpentMinor, counters.reservedMinor, policy.dailyBudgetMinor),
        month: utilisation(counters.monthSpentMinor, counters.reservedMinor, policy.monthlyBudgetMinor),
      },
      wallet: {
        allowanceCapUsd: toUsd(agent.walletAllowanceCapMinor),
        fundedUsd: toUsd(agent.walletFundedMinor),
        remainingUsd: toUsd(
          walletCeilingMinor > counters.reservedMinor ? walletCeilingMinor - counters.reservedMinor : 0n,
        ),
      },
      velocity: {
        lastMinute: counters.txLastMinute,
        maxTxPerMinute: policy.maxTxPerMinute,
        lastHour: counters.txLastHour,
        maxTxPerHour: policy.maxTxPerHour,
      },
    });
  });
