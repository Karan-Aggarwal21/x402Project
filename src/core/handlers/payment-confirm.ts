// OWNER: CORE · commit the reservation after settlement · API_DOCS 4.3
import { z } from "zod";
import { writeAudit } from "@/core/audit/log";
import { GUARD_KEY_HEADER, authenticateAgent } from "@/core/auth/agentKey";
import { commitBudget } from "@/core/budget/ledger";
import { getIntentById, recordSettlement } from "@/core/db/queries";
import { handle, parseBody } from "@/core/handlers/guards";
import { toIntentDto } from "@/core/handlers/serialize";
import { fail, ok } from "@/shared/http";

const confirmSchema = z.object({
  reservationId: z.string().min(1),
  txHash: z.string().regex(/^0x[a-fA-F0-9]+$/),
  settlementResponse: z.unknown().optional(),
});

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ intentId: string }> },
): Promise<Response> =>
  handle("POST /api/v1/payments/:intentId/confirm", async () => {
    const agent = await authenticateAgent(request);
    if (!agent) return fail("GUARD_UNAVAILABLE", { header: GUARD_KEY_HEADER });

    const { intentId } = await params;
    const intent = await getIntentById(intentId);
    if (!intent) return fail("NOT_FOUND", { intentId });
    // An agent may only confirm its own payment, or one agent could settle another's reservation.
    if (intent.agentId !== agent.agentId) return fail("FORBIDDEN", { intentId });

    const parsed = await parseBody(request, confirmSchema);
    if (!parsed.ok) return parsed.response;

    await commitBudget(parsed.data.reservationId, parsed.data.txHash);
    await recordSettlement(intentId, parsed.data.txHash, parsed.data.settlementResponse ?? null);
    await writeAudit("PAYMENT_SETTLED", { txHash: parsed.data.txHash }, `agent:${agent.agentId}`, {
      agentId: agent.agentId,
      intentId,
      live: "settlement",
    });

    const updated = await getIntentById(intentId);
    return ok({ payment: updated ? toIntentDto(updated) : null });
  });
