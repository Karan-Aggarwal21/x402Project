/**
 * OWNER: PAY
 * WHAT: PHASE 0 SPIKE. Run this before writing any product code.
 *       Proves: request -> 402 -> sign -> retry -> verify -> settle -> 200 with a real tx hash.
 * RUN:  pnpm poc:x402
 * EXIT GATE: prints a transaction hash that resolves on sepolia.basescan.org.
 *            Screenshot it - it goes on PPT slide 4.
 */

async function main() {
  // 1. build a viem account from AGENT_WALLET_PRIVATE_KEY
  // 2. wrap fetch with the x402 buyer SDK
  // 3. call /api/sandbox/search
  // 4. log the decoded PAYMENT-REQUIRED / -SIGNATURE / -RESPONSE into Docs/x402-notes.md
  throw new Error("NOT_IMPLEMENTED: poc-x402");
}

main().catch((e) => { console.error(e); process.exit(1); });


export {};
