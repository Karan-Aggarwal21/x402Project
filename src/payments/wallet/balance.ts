/**
 * OWNER: PAY
 * WHAT: Reads the agent wallet's test-USDC and ETH balances from the Base Sepolia RPC.
 *       Feeds the "wallet allowance remaining" input of the policy engine (rule 10).
 */

export async function getUsdcBalanceMinor(_address: `0x${string}`): Promise<bigint> {
  throw new Error("NOT_IMPLEMENTED: getUsdcBalanceMinor");
}

export async function getGasBalanceWei(_address: `0x${string}`): Promise<bigint> {
  throw new Error("NOT_IMPLEMENTED: getGasBalanceWei");
}

