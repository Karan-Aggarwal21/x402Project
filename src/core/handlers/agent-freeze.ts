// OWNER: CORE · kill switch, effective on the next evaluation · API_DOCS 5.1
import { z } from "zod";
import { writeAudit } from "@/core/audit/log";
import { getAgentById, setAgentStatus } from "@/core/db/queries";
import { handle, parseBody, requireAdmin } from "@/core/handlers/guards";
import { toAgentDto } from "@/core/handlers/serialize";
import { fail, ok } from "@/shared/http";

const freezeSchema = z.object({ reason: z.string().min(1).max(500).default("Frozen by an operator.") });

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ agentId: string }> },
): Promise<Response> =>
  handle("POST /api/v1/agents/:agentId/freeze", async () => {
    const forbidden = await requireAdmin(request);
    if (forbidden) return forbidden;

    const { agentId } = await params;
    if (!(await getAgentById(agentId))) return fail("NOT_FOUND", { agentId });

    const parsed = await parseBody(request, freezeSchema);
    const reason = parsed.ok ? parsed.data.reason : "Frozen by an operator.";

    await setAgentStatus(agentId, "FROZEN", reason);
    await writeAudit("AGENT_FROZEN", { reason }, "dashboard", { agentId });

    const agent = await getAgentById(agentId);
    // Rule 1 reads status on every evaluation, so this takes effect on the very next payment.
    return ok({ agent: agent ? toAgentDto(agent) : null }, 200, "Agent frozen. No further payments will be authorised.");
  });
