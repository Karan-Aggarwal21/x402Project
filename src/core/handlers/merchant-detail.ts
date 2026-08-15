// OWNER: CORE · API_DOCS 5.3
// The merchant id IS the domain — merchants are deferred into policy.rules rather than a table.
import { z } from "zod";
import { writeAudit } from "@/core/audit/log";
import { createPolicyVersion, getActivePolicy } from "@/core/db/queries";
import { handle, parseBody, requireAdmin } from "@/core/handlers/guards";
import { fail, ok } from "@/shared/http";

const patchSchema = z.object({
  agentId: z.string().min(1),
  pinnedRecipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/).nullable().optional(),
  block: z.boolean().optional(),
  updatedByEmail: z.string().email().optional(),
});

export const PATCH = async (
  request: Request,
  { params }: { params: Promise<{ merchantId: string }> },
): Promise<Response> =>
  handle("PATCH /api/v1/merchants/:merchantId", async () => {
    const forbidden = await requireAdmin(request);
    if (forbidden) return forbidden;

    const { merchantId } = await params;
    const parsed = await parseBody(request, patchSchema);
    if (!parsed.ok) return parsed.response;

    const policy = await getActivePolicy(parsed.data.agentId);
    if (!policy) return fail("NO_ACTIVE_POLICY", { agentId: parsed.data.agentId });

    const current = policy.rules.merchant;
    const pinnedRecipients = { ...current.pinnedRecipients };
    if (parsed.data.pinnedRecipient === null) delete pinnedRecipients[merchantId];
    else if (parsed.data.pinnedRecipient) pinnedRecipients[merchantId] = parsed.data.pinnedRecipient;

    const rules = {
      ...policy.rules,
      merchant: {
        ...current,
        pinnedRecipients,
        blockedMerchants:
          parsed.data.block && !current.blockedMerchants.includes(merchantId)
            ? [...current.blockedMerchants, merchantId]
            : current.blockedMerchants,
        allowedMerchants: parsed.data.block
          ? current.allowedMerchants.filter((domain) => domain !== merchantId)
          : current.allowedMerchants,
      },
    };

    const created = await createPolicyVersion(parsed.data.agentId, rules, parsed.data.updatedByEmail);
    await writeAudit("MERCHANT_ADDED", { merchant: merchantId, policyVersion: created.version },
      "dashboard", { agentId: parsed.data.agentId });

    return ok({ merchant: merchantId, policyVersion: created.version });
  });

export const DELETE = async (
  request: Request,
  { params }: { params: Promise<{ merchantId: string }> },
): Promise<Response> =>
  handle("DELETE /api/v1/merchants/:merchantId", async () => {
    const forbidden = await requireAdmin(request);
    if (forbidden) return forbidden;

    const { merchantId } = await params;
    const agentId = new URL(request.url).searchParams.get("agentId");
    if (!agentId) return fail("VALIDATION_FAILED", { query: "agentId is required" });

    const policy = await getActivePolicy(agentId);
    if (!policy) return fail("NO_ACTIVE_POLICY", { agentId });

    const current = policy.rules.merchant;
    const pinnedRecipients = { ...current.pinnedRecipients };
    delete pinnedRecipients[merchantId];

    // Removing from the allowlist means unknownMerchantAction decides what happens next.
    const rules = {
      ...policy.rules,
      merchant: {
        ...current,
        allowedMerchants: current.allowedMerchants.filter((domain) => domain !== merchantId),
        pinnedRecipients,
      },
    };

    const created = await createPolicyVersion(agentId, rules);
    await writeAudit("MERCHANT_BLOCKED", { merchant: merchantId, removed: true, policyVersion: created.version },
      "dashboard", { agentId });

    return ok({ merchant: merchantId, policyVersion: created.version });
  });
