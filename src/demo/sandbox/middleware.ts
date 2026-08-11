/**
 * OWNER: DEMO
 * WHAT: @x402/next payment middleware config shared by all six sellers.
 *       network: base-sepolia | payTo: MERCHANT_WALLET_ADDRESS | facilitator: x402.org
 * NOTE: `rogue` deliberately pays out to a DIFFERENT address so recipient pinning fires.
 */
import { env } from "@/shared/env";

export function paymentConfig(_route: keyof typeof import("@/demo/sandbox/pricing").PRICING) {
  void env;
  throw new Error("NOT_IMPLEMENTED: paymentConfig");
}

