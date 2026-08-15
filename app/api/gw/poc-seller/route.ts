/**
 * OWNER: PAY
 * ROUTE: POST /api/gw/poc-seller — throwaway paid endpoint for the C1 spike.
 * TODO(PAY): delete when DEMO ships POST /api/sandbox/search.
 */
export const runtime = "nodejs";
export { POST } from "@/payments/scripts/poc-seller";
