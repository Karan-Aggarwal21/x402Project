// OWNER: PAY. Spike: request -> 402 -> [policy gap] -> sign -> retry -> settle, via the adapter.
// RUN: `npm run dev` in one terminal (hosts the seller), then `npm run poc:x402`.
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { privateKeyToAccount } from "viem/accounts";
import {
  createPaymentSignature,
  narrowToOffer,
  readPaymentRequired,
  readSettlement,
} from "@/payments/x402/adapter";
import { HEADER, decodePaymentRequired, decodePaymentResponse, decodePaymentSignature } from "@/payments/x402/headers";
import { env } from "@/shared/env";
import { toUsd } from "@/shared/money";

const TARGET = `${env.APP_URL}/api/sandbox/search`;
const NOTES_PATH = resolve(process.cwd(), "../Docs/x402-notes.md");

const REQUEST = {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query: "x402 adoption" }),
} satisfies RequestInit;

/** Raw base64 exactly as it crossed the wire. The C2 header tests decode these captures. */
function writeNotes(captured: Record<string, string>, decoded: Record<string, unknown>) {
  const section = (name: string) =>
    `## ${name}\n\n\`\`\`\n${captured[name]}\n\`\`\`\n\n\`\`\`json\n${JSON.stringify(decoded[name], null, 2)}\n\`\`\`\n`;
  writeFileSync(
    NOTES_PATH,
    [
      "# x402 wire captures — PAY spike",
      "",
      `Captured from \`${TARGET}\` via \`npm run poc:x402\`, routed through \`x402/adapter.ts\`.`,
      "Protocol v2. These are real values, not fixtures — the C2 header tests decode exactly these.",
      "",
      section(HEADER.required),
      section(HEADER.signature),
      section(HEADER.response),
    ].join("\n"),
    "utf8",
  );
}

function requireHeader(response: Response, name: string): string {
  const value = response.headers.get(name);
  if (!value) throw new Error(`No ${name} header on the ${response.status} response.`);
  return value;
}

async function main() {
  const account = privateKeyToAccount(env.AGENT_WALLET_PRIVATE_KEY as `0x${string}`);
  console.log(`buyer    ${account.address}`);
  console.log(`target   ${TARGET}\n`);

  const unpaid = await fetch(TARGET, REQUEST);
  const paymentRequired = readPaymentRequired(unpaid);
  if (!paymentRequired) {
    // A 404 here almost always means next dev fell back to another port because 3000 was taken,
    // so NEXT_PUBLIC_APP_URL points at whatever else is listening.
    throw new Error(
      `Expected 402 from the seller, got ${unpaid.status}. Is \`npm run dev\` serving ${env.APP_URL}?`,
    );
  }

  const offer = paymentRequired.accepts[0];
  console.log(`price    ${toUsd(BigInt(offer.amount))} USDC on ${offer.network}`);
  console.log(`payTo    ${offer.payTo}`);
  console.log("policy   <- C6 calls evaluatePayment here. Nothing is signed before ALLOW.\n");

  const signature = await createPaymentSignature(narrowToOffer(paymentRequired, offer), account);

  const paid = await fetch(TARGET, {
    ...REQUEST,
    headers: { ...REQUEST.headers, [HEADER.signature]: signature },
  });
  if (!paid.ok) throw new Error(`Seller returned ${paid.status}: ${await paid.text()}`);

  const settlement = readSettlement(paid);
  const captured = {
    [HEADER.required]: requireHeader(unpaid, HEADER.required),
    [HEADER.signature]: signature,
    [HEADER.response]: requireHeader(paid, HEADER.response),
  };
  writeNotes(captured, {
    [HEADER.required]: decodePaymentRequired(captured[HEADER.required]),
    [HEADER.signature]: decodePaymentSignature(captured[HEADER.signature]),
    [HEADER.response]: decodePaymentResponse(captured[HEADER.response]).raw,
  });

  console.log(`body     ${JSON.stringify(await paid.json())}`);
  console.log(`notes    ${NOTES_PATH}`);
  console.log(`txHash   ${settlement.txHash}`);
  console.log(`explorer https://sepolia.basescan.org/tx/${settlement.txHash}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
