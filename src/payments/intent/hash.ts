// OWNER: PAY. The canonical intent hash — what binds the signer to the exact approved fields,
// which is what makes a field swap between ALLOW and signing impossible (threat T9).
import { createHash } from "node:crypto";
import type { PaymentIntent } from "@/shared/types";

export type HashableIntent = Omit<PaymentIntent, "intentHash" | "state">;

/**
 * sha256 over a fixed field order, so the key order of the object can never change the result.
 * Covers every field the policy engine judges. `intentId` and `createdAt` are excluded: they
 * identify the record, they are not terms of the payment.
 */
export function computeIntentHash(intent: HashableIntent): string {
  const fields = [
    intent.agentId,
    intent.amountMinor.toString(),
    intent.asset,
    intent.network,
    intent.recipient,
    intent.merchant,
    intent.resource,
    intent.reason ?? "",
    intent.nonce,
  ];
  // JSON quotes each field separately, so no separator can be forged out of field content.
  return createHash("sha256").update(JSON.stringify(fields)).digest("hex");
}
