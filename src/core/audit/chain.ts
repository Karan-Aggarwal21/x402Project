// OWNER: CORE. Tamper evidence without a blockchain: rowHash = sha256(prevHash + canonicalJson(row)).
// Editing any historical row breaks every hash after it, which verifyChain reports.
import { createHash } from "node:crypto";

export const GENESIS_HASH = "0".repeat(64);

/** Key order must not change the hash, so keys are sorted at every level. */
export function canonicalJson(value: unknown): string {
  if (typeof value === "bigint") return JSON.stringify(value.toString());
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : 1));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

export function computeRowHash(prevHash: string, row: unknown): string {
  return createHash("sha256").update(prevHash + canonicalJson(row)).digest("hex");
}

export async function verifyChain(): Promise<{ valid: boolean; rowsChecked: number; brokenAt: string | null }> {
  throw new Error("NOT_IMPLEMENTED: verifyChain");
}

