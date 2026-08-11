/**
 * OWNER: PAY
 * WHAT: Typed environment access. Fails fast at boot instead of at the first payment.
 * DOCS: .env.example
 */

function required(_name: string): string {
  throw new Error("NOT_IMPLEMENTED: env.required");
}

export const env = {
  get DATABASE_URL() { return required("DATABASE_URL"); },
  get AGENT_WALLET_PRIVATE_KEY() { return required("AGENT_WALLET_PRIVATE_KEY"); },
  get X402_FACILITATOR_URL() { return required("X402_FACILITATOR_URL"); },
  get BASE_SEPOLIA_RPC_URL() { return required("BASE_SEPOLIA_RPC_URL"); },
  get GUARD_HMAC_SECRET() { return required("GUARD_HMAC_SECRET"); },
  get MERCHANT_WALLET_ADDRESS() { return required("MERCHANT_WALLET_ADDRESS"); },
  get APP_URL() { return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"; },
  get GROQ_API_KEY() { return process.env.GROQ_API_KEY ?? ""; },
  get USE_MOCKS() { return process.env.USE_MOCKS === "1"; },
};

export const BASE_SEPOLIA_CHAIN_ID = 84532;

