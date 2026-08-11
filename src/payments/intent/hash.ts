/**
 * OWNER: PAY
 * WHAT: Canonical intent hash. This is what binds the signer to the exact approved fields,
 *       which is what makes a TOCTOU field swap impossible (threat T9).
 * DOCS: ARCHITECTURE.md section 9
 */
import type { PaymentIntent } from "@/shared/types";

/** sha256(agentId | amount | asset | network | recipient | resource | nonce) */
export function computeIntentHash(_intent: Omit<PaymentIntent, "intentHash" | "state">): string {
  throw new Error("NOT_IMPLEMENTED: computeIntentHash");
}

