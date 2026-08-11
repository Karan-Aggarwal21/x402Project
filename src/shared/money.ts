/**
 * OWNER: CORE
 * WHAT: Money helpers. USDC has 6 decimals, so $0.05 is 50000n minor units.
 * RULE: No float ever touches a money value. See CLAUDE.md rule 6.
 */

export const USDC_DECIMALS = 6;
const SCALE = 10n ** BigInt(USDC_DECIMALS);

/** "0.05" -> 50000n */
export function toMinor(_usd: string): bigint {
  throw new Error("NOT_IMPLEMENTED: toMinor");
}

/** 50000n -> "0.05" */
export function toUsd(_minor: bigint): string {
  throw new Error("NOT_IMPLEMENTED: toUsd");
}

/** Formats for display: 50000n -> "$0.05" */
export function formatUsd(_minor: bigint): string {
  throw new Error("NOT_IMPLEMENTED: formatUsd");
}

export { SCALE };

