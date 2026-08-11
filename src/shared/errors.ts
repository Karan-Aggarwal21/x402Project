/**
 * OWNER: CORE (append-only - add your code at the bottom, never reorder)
 * WHAT: The canonical error code catalogue. Every 402/4xx the Guard emits uses one of these.
 * DOCS: API_DOCS.md section 2.5
 */

export const ERROR_CODES = {
  // --- policy rules, in precedence order (ARCHITECTURE.md section 7) ---
  AGENT_FROZEN: { http: 403, message: "Agent is frozen." },
  NO_ACTIVE_POLICY: { http: 402, message: "No active policy for this agent." },
  NETWORK_NOT_ALLOWED: { http: 402, message: "Network is not allowlisted." },
  ASSET_NOT_ALLOWED: { http: 402, message: "Asset is not allowlisted." },
  MERCHANT_BLOCKED: { http: 402, message: "Merchant is on the blocklist." },
  MERCHANT_NOT_ALLOWLISTED: { http: 402, message: "Merchant is not on the allowlist." },
  RECIPIENT_MISMATCH: { http: 402, message: "payTo does not match the pinned recipient." },
  PER_TRANSACTION_LIMIT_EXCEEDED: { http: 402, message: "Amount exceeds the per-transaction limit." },
  ABSOLUTE_BLOCK_THRESHOLD: { http: 402, message: "Amount exceeds the absolute block threshold." },
  BUDGET_EXCEEDED: { http: 402, message: "Budget window would be exceeded." },
  VELOCITY_EXCEEDED: { http: 402, message: "Too many payments in this window." },
  ALLOWANCE_EXHAUSTED: { http: 402, message: "Wallet allowance is insufficient." },
  RISK_TOO_HIGH: { http: 402, message: "Risk score exceeds the block threshold." },

  // --- approvals ---
  APPROVAL_REQUIRED: { http: 202, message: "Payment is awaiting human review." },
  APPROVAL_REJECTED: { http: 402, message: "A reviewer rejected this payment." },
  APPROVAL_EXPIRED: { http: 402, message: "Approval window elapsed, auto-rejected." },

  // --- lifecycle / transport ---
  INTENT_EXPIRED: { http: 408, message: "Reservation TTL elapsed." },
  IDEMPOTENCY_CONFLICT: { http: 409, message: "Same idempotency key, different body." },
  INVALID_PAYMENT_REQUIREMENTS: { http: 422, message: "The 402 payment requirements could not be decoded." },
  SETTLEMENT_FAILED: { http: 502, message: "Verification or settlement failed; reservation released." },
  UPSTREAM_UNAVAILABLE: { http: 502, message: "Merchant or facilitator unreachable." },
  RATE_LIMITED: { http: 429, message: "Rate limit exceeded." },
  GUARD_UNAVAILABLE: { http: 503, message: "Guard dependency unavailable; failing closed." },
  NOT_IMPLEMENTED: { http: 501, message: "Not implemented yet." },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

/** Positive reason codes, used when a rule passes. */
export const PASS_CODES = [
  "WITHIN_TRANSACTION_LIMIT",
  "MERCHANT_ALLOWLISTED",
  "BUDGET_AVAILABLE",
  "VELOCITY_OK",
  "RAIL_ALLOWED",
  "RISK_LOW",
] as const;

