/**
 * OWNER: CORE
 * WHAT: Per-key request limiter -> 429.
 * NOTE: This is transport hygiene. It is NOT the policy velocity rule, which returns 402.
 *       Never conflate the two - API_DOCS.md section 9.
 */

export async function checkRateLimit(_key: string, _limitPerMinute: number): Promise<boolean> {
  throw new Error("NOT_IMPLEMENTED: checkRateLimit");
}

