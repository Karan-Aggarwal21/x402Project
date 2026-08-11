/**
 * OWNER: PAY
 * ROUTE: POST /api/gw/request  - the only endpoint an agent needs.
 * DOCS: API_DOCS.md section 4.1
 */
export const runtime = "nodejs";
export { POST } from "@/payments/handlers/gw-request";

