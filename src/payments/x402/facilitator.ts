// OWNER: PAY. The facilitator contract we CONSUME. We never implement /verify or /settle.
// The real calls happen inside the seller's @x402/next middleware, never in our process.
export type { SettleResponse, VerifyResponse } from "@x402/core/types";

export const FACILITATOR_ROUTES = { verify: "/verify", settle: "/settle", supported: "/supported" } as const;
