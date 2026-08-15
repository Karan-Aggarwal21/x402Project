// OWNER: CORE · version history · API_DOCS 5.2
import { listPolicyVersions } from "@/core/db/queries";
import { handle } from "@/core/handlers/guards";
import { diffPolicyRules } from "@/core/handlers/policyRules";
import { toPolicyDto } from "@/core/handlers/serialize";
import { ok } from "@/shared/http";

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> },
): Promise<Response> =>
  handle("GET /api/v1/policies/:agentId/versions", async () => {
    const { agentId } = await params;
    const versions = await listPolicyVersions(agentId);

    // Newest first, each carrying what it changed relative to the version below it.
    const withDiffs = versions.map((policy, index) => ({
      ...toPolicyDto(policy),
      changes: diffPolicyRules(versions[index + 1]?.rules, policy.rules),
    }));

    return ok({ versions: withDiffs, total: withDiffs.length });
  });
