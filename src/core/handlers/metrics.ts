// OWNER: CORE · dashboard tiles · API_DOCS 5.5
// NOTE: `blockedOnChainTxCount` must always be 0. That number IS goal G2.
import { getMetricsSummary } from "@/core/db/queries";
import { handle } from "@/core/handlers/guards";
import { ok } from "@/shared/http";
import { toUsd } from "@/shared/money";

export const GET = async (request: Request): Promise<Response> =>
  handle("GET /api/v1/metrics/summary", async () => {
    const windowHours = Number(new URL(request.url).searchParams.get("window")) || 24;
    const summary = await getMetricsSummary(windowHours);

    return ok({
      windowHours,
      decisions: summary.decisions,
      spentUsd: toUsd(summary.spentMinor),
      blockedUsd: toUsd(summary.blockedMinor),
      onChainTxCount: summary.onChainTxCount,
      blockedOnChainTxCount: summary.blockedOnChainTxCount,
      topBlockReasons: summary.topBlockReasons,
      p95GuardLatencyMs: summary.p95GuardLatencyMs,
    });
  });
