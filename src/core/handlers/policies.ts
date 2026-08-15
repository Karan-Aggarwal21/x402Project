// OWNER: CORE · POST create a policy version · API_DOCS 5.2
import { z } from "zod";
import { writeAudit } from "@/core/audit/log";
import { createPolicyVersion, getActivePolicy, getAgentById } from "@/core/db/queries";
import { handle, parseBody, requireAdmin } from "@/core/handlers/guards";
import { diffPolicyRules, policyRulesSchema } from "@/core/handlers/policyRules";
import { toPolicyDto } from "@/core/handlers/serialize";
import { fail, ok } from "@/shared/http";

const createSchema = z.object({
  agentId: z.string().min(1),
  rules: policyRulesSchema,
  createdByEmail: z.string().email().optional(),
});

export const POST = async (request: Request): Promise<Response> =>
  handle("POST /api/v1/policies", async () => {
    const forbidden = await requireAdmin(request);
    if (forbidden) return forbidden;

    const parsed = await parseBody(request, createSchema);
    if (!parsed.ok) return parsed.response;

    const { agentId, rules, createdByEmail } = parsed.data;
    if (!(await getAgentById(agentId))) return fail("NOT_FOUND", { agentId });

    const previous = await getActivePolicy(agentId);
    const created = await createPolicyVersion(agentId, rules, createdByEmail);
    const changes = diffPolicyRules(previous?.rules, rules);

    await writeAudit("POLICY_CREATED", { version: created.version, changes }, "dashboard", { agentId });

    return ok({ policy: toPolicyDto(created), changes }, 201);
  });
