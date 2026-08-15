// OWNER: CORE. The 10 blocking rules, in precedence order. Each is pure: (ctx) => Reason | null.
// No clock, no DB, no network — time arrives as ctx.now, and ESLint fails the build on a DB import.
import { formatUsd, toMinor, toUsd } from "@/shared/money";
import type { EvaluationContext, Reason } from "@/shared/types";

export type Rule = (ctx: EvaluationContext) => Reason | null;

// Hostnames are case-insensitive, so a blocklist compared as a raw string is bypassed by "ROGUE.Example.com".
const normalizeHost = (host: string): string => host.trim().toLowerCase();

// An EIP-55 checksummed address and its lowercase spelling are the same address on chain.
const normalizeAddress = (address: string): string => address.trim().toLowerCase();

export const ruleAgentActive: Rule = (ctx) => {
  if (ctx.agentStatus === "ACTIVE") return null;
  return {
    code: "AGENT_FROZEN",
    rule: "agent.status",
    message: "Agent is frozen and may not spend.",
    observed: ctx.agentStatus,
    expected: "ACTIVE",
  };
};

export const ruleRailAllowed: Rule = (ctx) => {
  const { allowedNetworks, allowedAssets } = ctx.policy.rules.rail;
  if (!allowedNetworks.includes(ctx.intent.network)) {
    return {
      code: "NETWORK_NOT_ALLOWED",
      rule: "rail.allowedNetworks",
      message: `Network ${ctx.intent.network} is not allowlisted.`,
      observed: ctx.intent.network,
      expected: allowedNetworks,
    };
  }
  if (!allowedAssets.includes(ctx.intent.asset)) {
    return {
      code: "ASSET_NOT_ALLOWED",
      rule: "rail.allowedAssets",
      message: `Asset ${ctx.intent.asset} is not allowlisted.`,
      observed: ctx.intent.asset,
      expected: allowedAssets,
    };
  }
  return null;
};

export const ruleMerchantNotBlocked: Rule = (ctx) => {
  const merchant = normalizeHost(ctx.intent.merchant);
  const blocked = ctx.policy.rules.merchant.blockedMerchants.map(normalizeHost);
  if (!blocked.includes(merchant)) return null;
  return {
    code: "MERCHANT_BLOCKED",
    rule: "merchant.blockedMerchants",
    message: `Merchant ${ctx.intent.merchant} is on the blocklist.`,
    observed: ctx.intent.merchant,
  };
};

// The engine turns this one Reason into BLOCK or HOLD by reading merchant.unknownMerchantAction.
// The rule stays single-shaped so precedence is decided in exactly one place.
export const ruleMerchantAllowlisted: Rule = (ctx) => {
  const merchant = normalizeHost(ctx.intent.merchant);
  const allowed = ctx.policy.rules.merchant.allowedMerchants.map(normalizeHost);
  if (allowed.includes(merchant)) return null;
  return {
    code: "MERCHANT_NOT_ALLOWLISTED",
    rule: "merchant.allowedMerchants",
    message: `Merchant ${ctx.intent.merchant} is not on the allowlist.`,
    observed: ctx.intent.merchant,
    expected: ctx.policy.rules.merchant.allowedMerchants,
  };
};

/**
 * The recipient rule 5 enforces for this merchant, or undefined when nothing is pinned.
 * Exported so risk/signals.ts scores exactly what the rule enforces, rather than a second opinion.
 * The versioned policy map wins; ctx.pinnedRecipient covers merchants pinned outside the document.
 */
export function findPinnedRecipient(ctx: EvaluationContext): string | undefined {
  const fromPolicy = Object.entries(ctx.policy.rules.merchant.pinnedRecipients).find(
    ([host]) => normalizeHost(host) === normalizeHost(ctx.intent.merchant),
  )?.[1];
  return fromPolicy ?? ctx.pinnedRecipient;
}

export const ruleRecipientPinned: Rule = (ctx) => {
  if (!ctx.policy.rules.merchant.enforceRecipientPinning) return null;
  const pinned = findPinnedRecipient(ctx);

  // An unpinned merchant is not a violation — risk/signals.ts prices that risk instead.
  if (!pinned) return null;
  if (normalizeAddress(pinned) === normalizeAddress(ctx.intent.recipient)) return null;

  return {
    code: "RECIPIENT_MISMATCH",
    rule: "merchant.pinnedRecipients",
    message: `payTo ${ctx.intent.recipient} does not match the recipient pinned for ${ctx.intent.merchant}.`,
    observed: ctx.intent.recipient,
    expected: pinned,
  };
};

export const rulePerTransactionLimit: Rule = (ctx) => {
  const limitMinor = toMinor(ctx.policy.rules.financial.maxPerTransactionUsd);
  if (ctx.intent.amountMinor <= limitMinor) return null;
  return {
    code: "PER_TRANSACTION_LIMIT_EXCEEDED",
    rule: "financial.maxPerTransactionUsd",
    message: `Transaction amount ${formatUsd(ctx.intent.amountMinor)} exceeds the per-transaction limit of ${formatUsd(limitMinor)}.`,
    observed: toUsd(ctx.intent.amountMinor),
    expected: toUsd(limitMinor),
  };
};

export const ruleAbsoluteBlockThreshold: Rule = (ctx) => {
  const thresholdMinor = toMinor(ctx.policy.rules.risk.blockAboveUsd);
  if (ctx.intent.amountMinor <= thresholdMinor) return null;
  return {
    code: "ABSOLUTE_BLOCK_THRESHOLD",
    rule: "risk.blockAboveUsd",
    message: `Transaction amount ${formatUsd(ctx.intent.amountMinor)} is above the absolute block threshold of ${formatUsd(thresholdMinor)}.`,
    observed: toUsd(ctx.intent.amountMinor),
    expected: toUsd(thresholdMinor),
  };
};

export const ruleBudgetWindows: Rule = (ctx) => {
  const { financial } = ctx.policy.rules;
  const { counters, intent } = ctx;

  // A live reservation is at most 120 s old, so it sits inside all three windows at once.
  const windows = [
    { label: "hourly", rule: "financial.hourlyBudgetUsd", spentMinor: counters.hourSpentMinor, budgetUsd: financial.hourlyBudgetUsd },
    { label: "daily", rule: "financial.dailyBudgetUsd", spentMinor: counters.daySpentMinor, budgetUsd: financial.dailyBudgetUsd },
    { label: "monthly", rule: "financial.monthlyBudgetUsd", spentMinor: counters.monthSpentMinor, budgetUsd: financial.monthlyBudgetUsd },
  ];

  for (const window of windows) {
    const budgetMinor = toMinor(window.budgetUsd);
    const wouldSpendMinor = window.spentMinor + counters.reservedMinor + intent.amountMinor;
    if (wouldSpendMinor <= budgetMinor) continue;
    return {
      code: "BUDGET_EXCEEDED",
      rule: window.rule,
      message: `This payment would take ${window.label} spend to ${formatUsd(wouldSpendMinor)}, over the ${formatUsd(budgetMinor)} ${window.label} budget.`,
      observed: toUsd(wouldSpendMinor),
      expected: toUsd(budgetMinor),
    };
  }
  return null;
};

export const ruleVelocity: Rule = (ctx) => {
  const { velocity } = ctx.policy.rules;
  const { counters } = ctx;

  const checks = [
    { rule: "velocity.maxTxPerMinute", window: "minute", observed: counters.txLastMinute, limit: velocity.maxTxPerMinute },
    { rule: "velocity.maxTxPerMerchantPerMinute", window: `minute for ${ctx.intent.merchant}`, observed: counters.txLastMinuteForMerchant, limit: velocity.maxTxPerMerchantPerMinute },
    { rule: "velocity.maxTxPerHour", window: "hour", observed: counters.txLastHour, limit: velocity.maxTxPerHour },
  ];

  for (const check of checks) {
    // The counts exclude this intent, so allowing it while already at the limit makes it the (limit + 1)th.
    if (check.observed < check.limit) continue;
    return {
      code: "VELOCITY_EXCEEDED",
      rule: check.rule,
      message: `Agent has already made ${check.observed} payments in the last ${check.window}, at a limit of ${check.limit}.`,
      observed: String(check.observed),
      expected: String(check.limit),
    };
  }
  return null;
};

export const ruleWalletAllowance: Rule = (ctx) => {
  if (ctx.intent.amountMinor <= ctx.walletAllowanceRemainingMinor) return null;
  return {
    code: "ALLOWANCE_EXHAUSTED",
    rule: "wallet.allowanceCap",
    message: `Wallet allowance of ${formatUsd(ctx.walletAllowanceRemainingMinor)} cannot cover ${formatUsd(ctx.intent.amountMinor)}.`,
    observed: toUsd(ctx.intent.amountMinor),
    expected: toUsd(ctx.walletAllowanceRemainingMinor),
  };
};

/** Ordered. The engine walks this array top-down and stops at the first non-null. */
export const BLOCKING_RULES: Rule[] = [
  ruleAgentActive,
  ruleRailAllowed,
  ruleMerchantNotBlocked,
  ruleMerchantAllowlisted,
  ruleRecipientPinned,
  rulePerTransactionLimit,
  ruleAbsoluteBlockThreshold,
  ruleBudgetWindows,
  ruleVelocity,
  ruleWalletAllowance,
];

/** Parallel to BLOCKING_RULES. The engine reports these as the rules it checked. */
export const BLOCKING_RULE_NAMES: string[] = [
  "agent.status",
  "rail",
  "merchant.blockedMerchants",
  "merchant.allowedMerchants",
  "merchant.pinnedRecipients",
  "financial.maxPerTransactionUsd",
  "risk.blockAboveUsd",
  "financial.budgets",
  "velocity",
  "wallet.allowanceCap",
];
