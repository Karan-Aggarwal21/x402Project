// OWNER: PAY. The HMAC minted when the policy engine says ALLOW. The signer will not sign without it.
// Single-use, 60 second TTL, bound to one intentHash. ARCHITECTURE.md section 9, threat T9.
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/shared/env";

export interface AllowToken { token: string; expiresAt: Date }

export class AllowTokenError extends Error {
  readonly code = "ALLOW_TOKEN_INVALID" as const;
  constructor(message: string) {
    super(message);
    this.name = "AllowTokenError";
  }
}

const TTL_MS = 60_000;
const VERSION = "v1";

// ponytail: in-process, so single-instance only. Multi-instance needs this row in Postgres,
// inserted under a unique constraint so the DB decides the replay race instead of the app.
const spent = new Map<string, number>();

/** The intentHash is never carried in the token — it is an input to the MAC, so a token is useless elsewhere. */
function mac(intentHash: string, evaluationId: string, expiresAtMs: number): string {
  return createHmac("sha256", env.GUARD_HMAC_SECRET)
    .update([VERSION, intentHash, evaluationId, expiresAtMs].join("."))
    .digest("hex");
}

export function mintAllowToken(intentHash: string, evaluationId: string): AllowToken {
  const expiresAtMs = Date.now() + TTL_MS;
  return {
    token: [VERSION, expiresAtMs, evaluationId, mac(intentHash, evaluationId, expiresAtMs)].join("."),
    expiresAt: new Date(expiresAtMs),
  };
}

/**
 * Throws if malformed, forged, expired, replayed, or bound to a different intent.
 * Never returns false quietly. Verifying and consuming are one step, so nothing can race between them.
 */
export function verifyAllowToken(token: string, intentHash: string): void {
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) throw new AllowTokenError("Malformed allowToken.");

  const [, expiresAtRaw, evaluationId, provided] = parts;
  const expiresAtMs = Number(expiresAtRaw);
  if (!Number.isSafeInteger(expiresAtMs)) throw new AllowTokenError("Malformed allowToken expiry.");

  // Authenticity first: nothing else is worth reporting on a token we cannot prove we issued.
  const expected = Buffer.from(mac(intentHash, evaluationId, expiresAtMs), "hex");
  const supplied = Buffer.from(provided, "hex");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new AllowTokenError("allowToken was not issued for this intent.");
  }

  if (Date.now() > expiresAtMs) throw new AllowTokenError("allowToken expired.");
  if (spent.has(provided)) throw new AllowTokenError("allowToken was already used.");

  spent.set(provided, expiresAtMs);
  for (const [used, expiry] of spent) if (expiry < Date.now()) spent.delete(used);
}
