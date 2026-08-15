// OWNER: CORE · ADMIN only · API_DOCS 5.4
import { z } from "zod";
import { writeAudit } from "@/core/audit/log";
import { actionApproval, getIntentById } from "@/core/db/queries";
import { handle, parseBody, requireAdmin } from "@/core/handlers/guards";
import { toIntentDto } from "@/core/handlers/serialize";
import { fail, ok } from "@/shared/http";

const rejectSchema = z.object({
  reviewerEmail: z.string().email().optional(),
  note: z.string().max(500).optional(),
});

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ approvalId: string }> },
): Promise<Response> =>
  handle("POST /api/v1/approvals/:approvalId/reject", async () => {
    const forbidden = await requireAdmin(request);
    if (forbidden) return forbidden;

    const { approvalId } = await params;
    const intent = await getIntentById(approvalId);
    if (!intent) return fail("NOT_FOUND", { approvalId });
    if (intent.approvalStatus !== "PENDING") {
      return fail("APPROVAL_REJECTED", { approvalId, approvalStatus: intent.approvalStatus });
    }

    const parsed = await parseBody(request, rejectSchema);
    const reviewer = parsed.ok ? parsed.data : {};

    // Rejection is terminal and needs no re-evaluation: the intent is BLOCKED and never signed.
    await actionApproval(approvalId, "REJECTED", reviewer.reviewerEmail, reviewer.note);
    await writeAudit("REJECTED", { reviewerEmail: reviewer.reviewerEmail ?? null, note: reviewer.note ?? null },
      reviewer.reviewerEmail ?? "dashboard", { agentId: intent.agentId, intentId: approvalId, live: "approval" });

    const updated = await getIntentById(approvalId);
    return ok({ transaction: updated ? toIntentDto(updated) : null });
  });
