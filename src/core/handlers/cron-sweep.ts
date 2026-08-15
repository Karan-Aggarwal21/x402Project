// OWNER: CORE · releases reservations past their 120 s TTL · ARCHITECTURE 6.1
import { writeAudit } from "@/core/audit/log";
import { sweepExpiredReservations } from "@/core/budget/ledger";
import { handle } from "@/core/handlers/guards";
import { ok } from "@/shared/http";

export const GET = async (): Promise<Response> =>
  handle("GET /api/v1/cron/sweep", async () => {
    const released = await sweepExpiredReservations();

    // Only worth an audit row when it actually freed budget; a no-op sweep is noise.
    if (released > 0) {
      await writeAudit("BUDGET_RELEASED", { released, reason: "TTL sweep" }, "cron", { live: "budget" });
    }

    return ok({ released }, 200, `Released ${released} expired reservation(s).`);
  });
