// OWNER: PAY. Creates or inspects the Base Sepolia agent wallet and prints balances.
// Testnet only. Never point this at mainnet.
import { createPublicClient, erc20Abi, formatEther, http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { env } from "@/shared/env";
import { formatUsd } from "@/shared/money";

/** Base Sepolia test USDC — the default asset @x402/evm resolves for eip155:84532. */
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;

const FAUCETS = [
  "test USDC  https://faucet.circle.com  (choose Base Sepolia)",
  "gas ETH    https://portal.cdp.coinbase.com/products/faucet",
];

async function main() {
  // Read process.env directly: an unset or still-placeholder key is the "generate one" path,
  // not a failure. Anything that is not a 32-byte hex key counts as unset.
  const privateKey = process.env.AGENT_WALLET_PRIVATE_KEY;
  if (!privateKey || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    console.log("No AGENT_WALLET_PRIVATE_KEY in .env.local.");
    console.log("Fresh testnet key below — paste it into .env.local, then run this again.\n");
    console.log(`AGENT_WALLET_PRIVATE_KEY="${generatePrivateKey()}"`);
    return;
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const client = createPublicClient({ chain: baseSepolia, transport: http(env.BASE_SEPOLIA_RPC_URL) });

  const [gasWei, usdcMinor] = await Promise.all([
    client.getBalance({ address: account.address }),
    client.readContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [account.address],
    }),
  ]);

  console.log(`address    ${account.address}`);
  console.log(`test USDC  ${formatUsd(usdcMinor)}`);
  console.log(`gas ETH    ${formatEther(gasWei)}`);
  console.log(`\nfaucets:\n  ${FAUCETS.join("\n  ")}`);

  // The exact scheme is EIP-3009: the facilitator broadcasts and pays gas, so USDC is the hard requirement.
  if (usdcMinor === 0n) console.log("\nUSDC balance is 0 — poc:x402 cannot settle until this is funded.");
}

main().catch((e) => { console.error(e); process.exit(1); });
