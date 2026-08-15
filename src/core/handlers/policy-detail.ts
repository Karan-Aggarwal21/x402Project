// OWNER: CORE · GET active / PUT new version (returns a diff) · API_DOCS 5.2
import { writeAudit } from "@/core/audit/log";
import { createPolicyVersion, getActivePolicy, getAgentById } from "@/core/db/queries";
import { handle, parseBody, requireAdmin } from "@/core/handlers/guards";
import { toPolicyDto } from "@/core/handlers/serialize";
import { diffPolicyRules, policyUpdateSchema } from "@/core/handlers/policyRules";
import { fail, ok } from "@/shared/http";

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> },
): Promise<Response> =>
  handle("GET /api/v1/policies/:agentId", async () => {
    const { agentId } = await params;
    const policy = await getActivePolicy(agentId);
    if (!policy) return fail("NO_ACTIVE_POLICY", { agentId });
    return ok({ policy: toPolicyDto(policy) });
  });

export const PUT = async (
  request: Request,
  { params }: { params: Promise<{ agentId: string }> },
): Promise<Response> =>
  handle("PUT /api/v1/policies/:agentId", async () => {
    const forbidden = await requireAdmin(request);
    if (forbidden) return forbidden;

    const { agentId } = await params;
    if (!(await getAgentById(agentId))) return fail("NOT_FOUND", { agentId });

    const parsed = await parseBody(request, policyUpdateSchema);
    if (!parsed.ok) return parsed.response;

    const previous = await getActivePolicy(agentId);
    const created = await createPolicyVersion(agentId, parsed.data.rules, parsed.data.updatedByEmail);
    const changes = diffPolicyRules(previous?.rules, parsed.data.rules);

    await writeAudit("POLICY_ACTIVATED", { version: created.version, changes }, "dashboard", { agentId });

    // The diff is what a reviewer actually reads: "what did this edit loosen?"
    return ok({ policy: toPolicyDto(created), previousVersion: previous?.version ?? null, changes });
  });
