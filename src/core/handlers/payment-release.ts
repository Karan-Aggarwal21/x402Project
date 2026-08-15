// OWNER: CORE · release the reservation after a failure · API_DOCS 4.4
import { z } from "zod";
import { writeAudit } from "@/core/audit/log";
import { GUARD_KEY_HEADER, authenticateAgent } from "@/core/auth/agentKey";
import { releaseBudget } from "@/core/budget/ledger";
import { getIntentById, recordFailure } from "@/core/db/queries";
import { handle, parseBody } from "@/core/handlers/guards";
import { toIntentDto } from "@/core/handlers/serialize";
import { fail, ok } from "@/shared/http";

const releaseSchema = z.object({
  reservationId: z.string().min(1),
  reason: z.string().min(1).max(500).default("Released by the agent after a failure."),
});

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ intentId: string }> },
): Promise<Response> =>
  handle("POST /api/v1/payments/:intentId/release", async () => {
    const agent = await authenticateAgent(request);
    if (!agent) return fail("GUARD_UNAVAILABLE", { header: GUARD_KEY_HEADER });

    const { intentId } = await params;
    const intent = await getIntentById(intentId);
    if (!intent) return fail("NOT_FOUND", { intentId });
    if (intent.agentId !== agent.agentId) return fail("FORBIDDEN", { intentId });

    const parsed = await parseBody(request, releaseSchema);
    if (!parsed.ok) return parsed.response;

    // Releasing twice is harmless, so a retrying agent cannot corrupt the ledger.
    await releaseBudget(parsed.data.reservationId, parsed.data.reason);
    await recordFailure(intentId, parsed.data.reason);
    await writeAudit("BUDGET_RELEASED", { reason: parsed.data.reason }, `agent:${agent.agentId}`, {
      agentId: agent.agentId,
      intentId,
      live: "budget",
    });

    const updated = await getIntentById(intentId);
    return ok({ payment: updated ? toIntentDto(updated) : null });
  });
