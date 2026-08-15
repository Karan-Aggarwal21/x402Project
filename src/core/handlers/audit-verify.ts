// OWNER: CORE · recompute the hash chain · API_DOCS 5.6
import { verifyChain } from "@/core/audit/chain";
import { handle } from "@/core/handlers/guards";
import { ok } from "@/shared/http";

export const GET = async (): Promise<Response> =>
  handle("GET /api/v1/audit/verify", async () => {
    const result = await verifyChain();

    // Recomputed from the stored rows on every call. A tampered history cannot make this true again.
    return ok(
      result,
      200,
      result.valid
        ? `Chain verified across ${result.rowsChecked} rows.`
        : `Chain broken at row ${result.brokenAt}.`,
    );
  });
