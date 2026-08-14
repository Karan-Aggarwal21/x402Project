/**
 * OWNER: CORE
 * WHAT: Starter policies offered when an agent is registered.
 * DOCS: PRD.md section 5.2 (defaults column)
 */
import type { PolicyRules } from "@/shared/types";

export const CONSERVATIVE: PolicyRules = {
  financial: { maxPerTransactionUsd: "0.10", hourlyBudgetUsd: "1.00", dailyBudgetUsd: "5.00", monthlyBudgetUsd: "50.00" },
  merchant: {
    allowedMerchants: [],
    blockedMerchants: [],
    pinnedRecipients: {},
    unknownMerchantAction: "BLOCK",
    enforceRecipientPinning: true,
  },
  velocity: { maxTxPerMinute: 10, maxTxPerHour: 100, maxTxPerMerchantPerMinute: 5 },
  rail: { allowedNetworks: ["base-sepolia"], allowedAssets: ["USDC"] },
  risk: { autoApproveBelowUsd: "0.10", holdBetweenUsd: ["0.10", "1.00"], blockAboveUsd: "1.00", riskHoldScore: 30, riskBlockScore: 60 },
};

export const TEMPLATES = { conservative: CONSERVATIVE } as const;

