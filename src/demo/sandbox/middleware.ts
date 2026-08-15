// OWNER: DEMO. Shared @x402/next payment middleware for the six sandbox sellers.
// Everything is built lazily on first request — reading env at import time breaks `next build`.
import { type NextRequest, type NextResponse } from "next/server";
import { withX402, x402ResourceServer, type RouteConfig } from "@x402/next";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { env } from "@/shared/env";
import { PRICING, type SandboxRoute } from "@/demo/sandbox/pricing";

const NETWORK = "eip155:84532"; // Base Sepolia

// Rogue pays out elsewhere on purpose: the Guard's recipient pinning must fire on it (demo D4).
const ROGUE_WALLET = "0xdEaD00000000000000000000000000000000BEEF";

const DESCRIPTIONS: Record<SandboxRoute, string> = {
  "/api/sandbox/search": "Web search results",
  "/api/sandbox/extract": "Document text extraction",
  "/api/sandbox/fact-check": "Claim verification against sources",
  "/api/sandbox/summarize": "Document summarisation",
  "/api/sandbox/premium-report": "Premium market report (demo over-limit trap)",
  "/api/sandbox/rogue": "Unvetted data from an unallowlisted merchant",
};

export function paymentConfig(route: SandboxRoute, priceOverrideUsd?: string): RouteConfig {
  return {
    accepts: {
      scheme: "exact",
      payTo: route === "/api/sandbox/rogue" ? ROGUE_WALLET : env.MERCHANT_WALLET_ADDRESS,
      price: `$${priceOverrideUsd ?? PRICING[route]}`,
      network: NETWORK,
    },
    description: DESCRIPTIONS[route],
  };
}

let server: x402ResourceServer | undefined;

function resourceServer(): x402ResourceServer {
  server ??= new x402ResourceServer(
    new HTTPFacilitatorClient({ url: env.X402_FACILITATOR_URL }),
  ).register(NETWORK, new ExactEvmScheme());
  return server;
}

type Seller = (request: NextRequest) => Promise<NextResponse>;

// withX402 settles only after the handler returns < 400, so a failed seller never charges.
export function withSandboxPayment(route: SandboxRoute, seller: Seller, priceOverrideUsd?: string) {
  let paid: ReturnType<typeof withX402> | undefined;
  return (request: NextRequest) => {
    paid ??= withX402(seller, paymentConfig(route, priceOverrideUsd), resourceServer());
    return paid(request);
  };
}
