// OWNER: CORE · audit stream · API_DOCS 5.6
import { listAuditLogs } from "@/core/db/queries";
import { handle } from "@/core/handlers/guards";
import { toAuditDto } from "@/core/handlers/serialize";
import { ok } from "@/shared/http";

export const GET = async (request: Request): Promise<Response> =>
  handle("GET /api/v1/audit", async () => {
    const params = new URL(request.url).searchParams;
    const entries = await listAuditLogs({
      agentId: params.get("agentId") ?? undefined,
      intentId: params.get("intentId") ?? undefined,
      limit: Number(params.get("limit")) || undefined,
    });

    return ok({ entries: entries.map(toAuditDto), total: entries.length });
  });
