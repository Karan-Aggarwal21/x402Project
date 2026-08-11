/**
 * OWNER: PAY
 * WHAT: HMAC token minted when the policy engine says ALLOW. The signer will not sign without it.
 *       Single-use, 60 second TTL, bound to the intentHash.
 * DOCS: ARCHITECTURE.md section 9, threat T9
 */

export interface AllowToken { token: string; expiresAt: Date }

export function mintAllowToken(_intentHash: string, _evaluationId: string): AllowToken {
  throw new Error("NOT_IMPLEMENTED: mintAllowToken");
}

/** Throws if expired, replayed, or if the hash does not match. Never returns false quietly. */
export function verifyAllowToken(_token: string, _intentHash: string): void {
  throw new Error("NOT_IMPLEMENTED: verifyAllowToken");
}

