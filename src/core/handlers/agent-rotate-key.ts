// OWNER: CORE · returns the new plaintext key once · API_DOCS 5.1
import { writeAudit } from "@/core/audit/log";
import { generateAgentKey } from "@/core/auth/agentKey";
import { getAgentById, rotateAgentKey } from "@/core/db/queries";
import { handle, requireAdmin } from "@/core/handlers/guards";
import { fail, ok } from "@/shared/http";

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ agentId: string }> },
): Promise<Response> =>
  handle("POST /api/v1/agents/:agentId/rotate-key", async () => {
    const forbidden = await requireAdmin(request);
    if (forbidden) return forbidden;

    const { agentId } = await params;
    if (!(await getAgentById(agentId))) return fail("NOT_FOUND", { agentId });

    const { plaintext, hash } = generateAgentKey();
    await rotateAgentKey(agentId, hash);
    // The key itself is never audited — only that it changed, and when.
    await writeAudit("KEY_ROTATED", { rotatedAt: new Date().toISOString() }, "dashboard", { agentId });

    return ok({ agentId, apiKey: plaintext }, 200, "The previous key stopped working immediately.");
  });
