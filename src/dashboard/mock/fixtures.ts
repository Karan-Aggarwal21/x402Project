/**
 * OWNER: UI
 * WHAT: Response fixtures copied VERBATIM from Docs/API_DOCS.md.
 *       If a fixture and the doc disagree, the doc wins.
 */

export const metricsSummary = {
  window: "24h",
  decisions: { allow: 37, hold: 1, block: 6 },
  spendUsd: "0.43",
  blockedUsd: "12.06",
  onChainTxCount: 37,
  blockedOnChainTxCount: 0,
  topBlockReasons: [
    { code: "PER_TRANSACTION_LIMIT_EXCEEDED", count: 3 },
    { code: "MERCHANT_NOT_ALLOWLISTED", count: 2 },
    { code: "VELOCITY_EXCEEDED", count: 1 },
  ],
  p95GuardLatencyMs: 118,
};

