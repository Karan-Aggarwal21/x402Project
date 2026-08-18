// OWNER: CORE · GET list / POST create agent · API_DOCS 5.1
import { z } from "zod";
import { writeAudit } from "@/core/audit/log";
import { generateAgentKey } from "@/core/auth/agentKey";
import { createAgent, createPolicyVersion, listAgents } from "@/core/db/queries";
import { handle, parseBody, requireAdmin } from "@/core/handlers/guards";
import { toAgentDto, toPolicyDto } from "@/core/handlers/serialize";
import { CONSERVATIVE } from "@/core/policy/templates";
import { newId } from "@/shared/ids";
import { ok } from "@/shared/http";
import { toMinor } from "@/shared/money";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  walletNetwork: z.string().max(60).default("algorand-testnet"),
  allowanceCapUsd: z.string().regex(/^\d+(\.\d{1,6})?$/).default("25.00"),
  fundedUsd: z.string().regex(/^\d+(\.\d{1,6})?$/).default("0.00"),
  createdByEmail: z.string().email().optional(),
});

export const GET = async (): Promise<Response> =>
  handle("GET /api/v1/agents", async () => {
    const agents = await listAgents();
    return ok({ agents: agents.map(toAgentDto), total: agents.length });
  });

export const POST = async (request: Request): Promise<Response> =>
  handle("POST /api/v1/agents", async () => {
    const forbidden = await requireAdmin(request);
    if (forbidden) return forbidden;

    const parsed = await parseBody(request, createSchema);
    if (!parsed.ok) return parsed.response;

    const { plaintext, hash } = generateAgentKey();
    const agentId = newId("agent");

    const agent = await createAgent({
      id: agentId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      status: "ACTIVE",
      apiKeyHash: hash,
      walletAddress: parsed.data.walletAddress ?? null,
      walletNetwork: parsed.data.walletNetwork,
      walletAllowanceCapMinor: toMinor(parsed.data.allowanceCapUsd),
      walletFundedMinor: toMinor(parsed.data.fundedUsd),
    });

    // An agent with no policy would be refused by the engine on its first payment, so it starts
    // on the conservative template rather than in a state that can only fail.
    const policy = await createPolicyVersion(agentId, CONSERVATIVE, parsed.data.createdByEmail);

    await writeAudit("AGENT_CREATED", { name: agent.name, policyVersion: policy.version }, "dashboard", {
      agentId,
    });

    return ok(
      {
        agent: toAgentDto(agent),
        policy: toPolicyDto(policy),
        // Shown once and never again: only the hash is stored.
        apiKey: plaintext,
      },
      201,
      "Store this key now — it cannot be retrieved again.",
    );
  });
