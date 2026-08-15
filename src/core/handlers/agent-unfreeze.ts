// OWNER: CORE · API_DOCS 5.1
import { writeAudit } from "@/core/audit/log";
import { getAgentById, setAgentStatus } from "@/core/db/queries";
import { handle, requireAdmin } from "@/core/handlers/guards";
import { toAgentDto } from "@/core/handlers/serialize";
import { fail, ok } from "@/shared/http";

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ agentId: string }> },
): Promise<Response> =>
  handle("POST /api/v1/agents/:agentId/unfreeze", async () => {
    const forbidden = await requireAdmin(request);
    if (forbidden) return forbidden;

    const { agentId } = await params;
    if (!(await getAgentById(agentId))) return fail("NOT_FOUND", { agentId });

    await setAgentStatus(agentId, "ACTIVE");
    // Unfreezing is as auditable as freezing: both change what the agent may spend.
    await writeAudit("AGENT_FROZEN", { status: "ACTIVE" }, "dashboard", { agentId });

    const agent = await getAgentById(agentId);
    return ok({ agent: agent ? toAgentDto(agent) : null });
  });
