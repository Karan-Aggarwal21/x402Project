// OWNER: CORE · decision + settlement history, with a summary block · API_DOCS 5.5
import { getMetricsSummary, listIntents } from "@/core/db/queries";
import { handle } from "@/core/handlers/guards";
import { toIntentDto } from "@/core/handlers/serialize";
import { ok } from "@/shared/http";

export const GET = async (request: Request): Promise<Response> =>
  handle("GET /api/v1/transactions", async () => {
    const params = new URL(request.url).searchParams;
    const decision = params.get("decision");

    const transactions = await listIntents({
      agentId: params.get("agentId") ?? undefined,
      decision: decision === "ALLOW" || decision === "HOLD" || decision === "BLOCK" ? decision : undefined,
      merchantDomain: params.get("merchant") ?? undefined,
      limit: Number(params.get("limit")) || undefined,
      cursor: params.get("cursor") ?? undefined,
    });

    const summary = await getMetricsSummary(Number(params.get("window")) || 24 * 30);
    const last = transactions[transactions.length - 1];

    return ok({
      transactions: transactions.map(toIntentDto),
      total: transactions.length,
      // Cursor is null on the last page, so the UI knows to stop asking.
      nextCursor: transactions.length > 0 ? last.id : null,
      summary: {
        decisions: summary.decisions,
        blockedOnChainTxCount: summary.blockedOnChainTxCount,
      },
    });
  });
