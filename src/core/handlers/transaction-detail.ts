// OWNER: CORE · intent + evaluation + ledger + settlement + explorer URL · API_DOCS 5.5
import { getIntentById, listAuditLogs, listLedgerForIntent } from "@/core/db/queries";
import { handle } from "@/core/handlers/guards";
import { toAuditDto, toIntentDto, toLedgerDto } from "@/core/handlers/serialize";
import { fail, ok } from "@/shared/http";

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ intentId: string }> },
): Promise<Response> =>
  handle("GET /api/v1/transactions/:intentId", async () => {
    const { intentId } = await params;
    const intent = await getIntentById(intentId);
    if (!intent) return fail("NOT_FOUND", { intentId });

    const [ledger, audit] = await Promise.all([
      listLedgerForIntent(intentId),
      listAuditLogs({ intentId, limit: 50 }),
    ]);

    return ok({
      transaction: toIntentDto(intent),
      ledger: ledger.map(toLedgerDto),
      // The decision trail for this one payment, so "why was this blocked" is answerable in the UI.
      audit: audit.map(toAuditDto),
    });
  });
