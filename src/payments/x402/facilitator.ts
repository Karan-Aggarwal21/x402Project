/**
 * OWNER: PAY
 * WHAT: Types for the facilitator contract we CONSUME. We never implement /verify or /settle.
 * DOCS: API_DOCS.md section 7
 */

export interface VerifyResponse { isValid: boolean; invalidReason?: string }
export interface SettleResponse { success: boolean; transaction: `0x${string}`; network: string }

/** Only used by tests and by the sandbox seller. The real calls happen inside @x402/next. */
export const FACILITATOR_ROUTES = { verify: "/verify", settle: "/settle" } as const;

