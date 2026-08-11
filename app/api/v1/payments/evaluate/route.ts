/**
 * OWNER: CORE
 * ROUTE: POST /api/v1/payments/evaluate - the core decision endpoint.
 * DOCS: API_DOCS.md section 4.2
 */
export const runtime = "nodejs";
export { POST } from "@/core/handlers/payments-evaluate";

