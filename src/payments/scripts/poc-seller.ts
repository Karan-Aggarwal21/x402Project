// OWNER: PAY. Throwaway x402 seller, so the C1 buyer spike has a real 402 to pay.
// TODO(PAY): delete this and app/api/gw/poc-seller/ once DEMO ships POST /api/sandbox/search.
import { NextResponse, type NextRequest } from "next/server";
import { withX402, x402ResourceServer } from "@x402/next";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { env } from "@/shared/env";

const NETWORK = "eip155:84532";

const handler = async (_request: NextRequest) =>
  NextResponse.json({ results: [{ title: "x402 adoption 2026", source: "poc-seller" }] });

// withX402 settles only after the handler returns < 400, so a failed handler never charges.
function buildPaidHandler() {
  const server = new x402ResourceServer(
    new HTTPFacilitatorClient({ url: env.X402_FACILITATOR_URL }),
  ).register(NETWORK, new ExactEvmScheme());

  return withX402(
    handler,
    {
      accepts: { scheme: "exact", payTo: env.MERCHANT_WALLET_ADDRESS, price: "$0.01", network: NETWORK },
      description: "PAY C1 spike — throwaway paid endpoint",
    },
    server,
  );
}

// Built on first request, never at module load: reading env at import time breaks `next build`.
let paidHandler: ReturnType<typeof buildPaidHandler> | undefined;

export async function POST(request: NextRequest) {
  paidHandler ??= buildPaidHandler();
  return paidHandler(request);
}
