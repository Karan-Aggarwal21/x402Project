/**
 * OWNER: PAY
 * ROUTE: POST /api/gw/request
 * DOCS: API_DOCS.md section 4.1
 */
import { notImplemented } from "@/shared/http";

export async function POST(_req: Request): Promise<Response> {
  // authenticate the agent key -> runGuardedRequest -> map the result to 200 / 202 / 402
  return notImplemented("POST /api/gw/request");
}

