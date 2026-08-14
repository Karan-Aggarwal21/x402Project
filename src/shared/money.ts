// OWNER: CORE (frozen contract). USDC has 6 decimals, so $0.05 is 50000n minor units.
// RULE: no float ever touches a money value. See ../../CLAUDE.md rule 6.

export const USDC_DECIMALS = 6;
const SCALE = 10n ** BigInt(USDC_DECIMALS);

/** "0.05" -> 50000n. Rejects floats, negatives and sub-cent precision we cannot represent. */
export function toMinor(usd: string): bigint {
  const match = /^(\d+)(?:\.(\d{1,6}))?$/.exec(usd.trim());
  if (!match) throw new Error(`Invalid USD amount: ${JSON.stringify(usd)}`);
  const [, whole, fraction = ""] = match;
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(USDC_DECIMALS, "0"));
}

/** 50000n -> "0.05". Always 6 decimals trimmed to at least 2. */
export function toUsd(minor: bigint): string {
  if (minor < 0n) throw new Error(`Negative money value: ${minor}`);
  const whole = minor / SCALE;
  const fraction = (minor % SCALE).toString().padStart(USDC_DECIMALS, "0").replace(/0+$/, "");
  return `${whole}.${fraction.padEnd(2, "0")}`;
}

/** 50000n -> "$0.05" */
export function formatUsd(minor: bigint): string {
  return `$${toUsd(minor)}`;
}

export { SCALE };
