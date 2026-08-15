// OWNER: PAY. Typed environment access, read through getters so a missing key fails
// at first use rather than at import time — importing must never break the build.

function required(name: string): string {
  const value = process.env[name];
  // .env.example ships "0x..." placeholders. Treat them as unset, so the error names the
  // variable instead of surfacing as a curve or address error deep inside a library.
  if (!value || value === "0x...") throw new Error(`Missing required environment variable: ${name}`);
  return value;
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

// The values the x402 wire actually carries. Policies allowlist these exact strings, so a symbol
// like "USDC" must never appear in an allowlist — it is merchant-supplied and therefore forgeable.
export const BASE_SEPOLIA_NETWORK_ID = "eip155:84532";
export const BASE_SEPOLIA_USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

