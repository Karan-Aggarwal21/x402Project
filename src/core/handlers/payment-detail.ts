// OWNER: CORE · intent status, the HOLD poll target · API_DOCS 4.5
import { getIntentById } from "@/core/db/queries";
import { handle } from "@/core/handlers/guards";
import { toIntentDto } from "@/core/handlers/serialize";
import { fail, ok } from "@/shared/http";

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ intentId: string }> },
): Promise<Response> =>
  handle("GET /api/v1/payments/:intentId", async () => {
    const { intentId } = await params;
    const intent = await getIntentById(intentId);
    if (!intent) return fail("NOT_FOUND", { intentId });

    // The agent polls this after a 202, so it needs to know whether waiting is still worthwhile.
    const settled = intent.state === "SETTLED" || intent.state === "FAILED" || intent.state === "BLOCKED";
    return ok({ payment: toIntentDto(intent), isTerminal: settled });
  });
