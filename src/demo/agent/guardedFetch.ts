/**
 * OWNER: DEMO
 * ⭐ The agent's ONLY route to the outside world.
 * It carries a Guard API key and nothing else - no private key, no RPC, no signer.
 * A 402 is returned as DATA, not thrown, so the agent can adapt instead of crashing.
 */

export interface GuardedResult {
  ok: boolean;
  blocked?: { code: string; message: string };
  data?: unknown;
  txHash?: string;
}

export async function guardedFetch(_url: string, _body: unknown, _reason: string): Promise<GuardedResult> {
  throw new Error("NOT_IMPLEMENTED: guardedFetch");
}

