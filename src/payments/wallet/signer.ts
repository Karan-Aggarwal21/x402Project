// OWNER: PAY. The private key lives here and nowhere else. Signs only when the allowToken verifies
// and the offer still matches the approved intent term for term. SEC-3, SEC-4, threat T9.
import { privateKeyToAccount } from "viem/accounts";
import { computeIntentHash } from "@/payments/intent/hash";
import { verifyAllowToken } from "@/payments/wallet/allowToken";
import { createPaymentSignature, narrowToOffer } from "@/payments/x402/adapter";
import type { PaymentRequired, PaymentRequirements } from "@/payments/x402/adapter";
import { env } from "@/shared/env";
import type { PaymentIntent } from "@/shared/types";

export interface SignInput {
  intent: PaymentIntent;
  paymentRequired: PaymentRequired;
  allowToken: string;
}

export class SignerRefusedError extends Error {
  readonly code = "ALLOW_TOKEN_INVALID" as const;
  constructor(message: string) {
    super(message);
    this.name = "SignerRefusedError";
  }
}

let account: ReturnType<typeof privateKeyToAccount> | undefined;

/** Derived on first signature, never at import, so building the app never needs the key. */
function agentAccount() {
  account ??= privateKeyToAccount(env.AGENT_WALLET_PRIVATE_KEY as `0x${string}`);
  return account;
}

function matchesIntent(intent: PaymentIntent, offer: PaymentRequirements): boolean {
  return offer.amount === intent.amountMinor.toString()
    && offer.asset === intent.asset
    && offer.network === intent.network
    && offer.payTo.toLowerCase() === intent.recipient.toLowerCase();
}

export async function signPaymentPayload(input: SignInput): Promise<string> {
  const { intent, paymentRequired, allowToken } = input;

  // 1. The intent must still hash to what CORE approved. Catches any term mutated after evaluation.
  if (computeIntentHash(intent) !== intent.intentHash) {
    throw new SignerRefusedError("Intent terms do not match its own intentHash.");
  }

  // 2. The offer we are about to sign must be the approved one, not merely a similar one.
  const offer = paymentRequired.accepts.find((candidate) => matchesIntent(intent, candidate));
  if (!offer) throw new SignerRefusedError("No offer on the wire matches the approved intent.");

  // 3. And it must have come from the merchant the policy engine judged.
  const offeredBy = paymentRequired.resource?.url;
  if (offeredBy && new URL(offeredBy).host !== intent.merchant) {
    throw new SignerRefusedError(`Offer came from ${new URL(offeredBy).host}, but ${intent.merchant} was approved.`);
  }

  // 4. Consume the authorisation last, so a mismatch above never burns a valid token.
  verifyAllowToken(allowToken, intent.intentHash);

  return createPaymentSignature(narrowToOffer(paymentRequired, offer), agentAccount());
}
