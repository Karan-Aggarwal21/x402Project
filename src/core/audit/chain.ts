/**
 * OWNER: CORE
 * WHAT: Tamper evidence without a blockchain.
 *       rowHash = sha256(prevHash + canonicalJson(row))
 */

export function computeRowHash(_prevHash: string, _row: unknown): string {
  throw new Error("NOT_IMPLEMENTED: computeRowHash");
}

export async function verifyChain(): Promise<{ valid: boolean; rowsChecked: number; brokenAt: string | null }> {
  throw new Error("NOT_IMPLEMENTED: verifyChain");
}

