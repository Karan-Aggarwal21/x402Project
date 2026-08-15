// OWNER: CORE · the HOLD queue · API_DOCS 5.4
import { listPendingApprovals } from "@/core/db/queries";
import { handle } from "@/core/handlers/guards";
import { toIntentDto } from "@/core/handlers/serialize";
import { ok } from "@/shared/http";

export const GET = async (): Promise<Response> =>
  handle("GET /api/v1/approvals", async () => {
    const pending = await listPendingApprovals();
    const now = Date.now();

    const approvals = pending.map((intent) => ({
      ...toIntentDto(intent),
      // The queue is worked by urgency, so the UI needs the countdown, not just the timestamp.
      expiresInSeconds: intent.approvalExpiresAt
        ? Math.max(0, Math.round((intent.approvalExpiresAt.getTime() - now) / 1000))
        : null,
    }));

    return ok({ approvals, total: approvals.length });
  });
