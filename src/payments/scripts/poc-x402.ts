// OWNER: PAY. C1 spike: request -> 402 -> sign -> retry -> settle -> 200 with a real tx hash.
// RUN: `npm run dev` in one terminal (hosts the seller), then `npm run poc:x402`.
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { privateKeyToAccount } from "viem/accounts";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import {
  decodePaymentRequiredHeader,
  decodePaymentResponseHeader,
  decodePaymentSignatureHeader,
} from "@x402/core/http";
import { env } from "@/shared/env";

const NETWORK = "eip155:84532";
const TARGET = `${env.APP_URL}/api/gw/poc-seller`;
const NOTES_PATH = resolve(process.cwd(), "../Docs/x402-notes.md");

const HEADER = {
  required: "PAYMENT-REQUIRED",
  signature: "PAYMENT-SIGNATURE",
  response: "PAYMENT-RESPONSE",
} as const;

/** Raw base64 header values exactly as they crossed the wire. C2 tests use these as fixtures. */
const captured: Record<string, string> = {};

const capturingFetch: typeof globalThis.fetch = async (input, init) => {
  // The SDK retries by passing a Request object with no init, so the signed header lives there.
  const sent = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  const signature = sent.get(HEADER.signature);
  if (signature) captured[HEADER.signature] = signature;

  const response = await fetch(input, init);
  for (const name of [HEADER.required, HEADER.response]) {
    const value = response.headers.get(name);
    if (value) captured[name] = value;
  }
  return response;
};

function requireCaptured(name: string): string {
  const value = captured[name];
  if (!value) throw new Error(`No ${name} header captured — the flow stopped before this step.`);
  return value;
}

function writeNotes(decoded: Record<string, unknown>) {
  const section = (name: string) =>
    `## ${name}\n\n\`\`\`\n${requireCaptured(name)}\n\`\`\`\n\n\`\`\`json\n${JSON.stringify(decoded[name], null, 2)}\n\`\`\`\n`;
  const body = [
    "# x402 wire captures — C1 spike",
    "",
    `Captured from \`${TARGET}\` on network \`${NETWORK}\` via \`npm run poc:x402\`.`,
    "Protocol v2. These are real values, not fixtures — C2 header tests decode exactly these.",
    "",
    section(HEADER.required),
    section(HEADER.signature),
    section(HEADER.response),
  ].join("\n");
  writeFileSync(NOTES_PATH, body, "utf8");
}

async function main() {
  const account = privateKeyToAccount(env.AGENT_WALLET_PRIVATE_KEY as `0x${string}`);

  // wrapFetchWithPayment auto-signs and auto-retries. Allowed in this spike ONLY: inside the
  // gateway orchestrator it would sign before the policy engine runs, which is the whole product.
  const client = new x402Client().register(NETWORK, new ExactEvmScheme(account));
  const fetchWithPayment = wrapFetchWithPayment(capturingFetch, client);

  console.log(`buyer   ${account.address}`);
  console.log(`target  ${TARGET}\n`);

  const response = await fetchWithPayment(TARGET, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "x402 adoption" }),
  });
  if (!response.ok) throw new Error(`Seller returned ${response.status}: ${await response.text()}`);

  const decoded = {
    [HEADER.required]: decodePaymentRequiredHeader(requireCaptured(HEADER.required)),
    [HEADER.signature]: decodePaymentSignatureHeader(requireCaptured(HEADER.signature)),
    [HEADER.response]: decodePaymentResponseHeader(requireCaptured(HEADER.response)),
  };
  const settlement = decoded[HEADER.response];

  for (const [name, value] of Object.entries(decoded)) {
    console.log(`--- ${name} ---`);
    console.log(JSON.stringify(value, null, 2));
  }

  writeNotes(decoded);

  console.log(`\nbody      ${JSON.stringify(await response.json())}`);
  console.log(`notes     ${NOTES_PATH}`);
  console.log(`settled   ${settlement.success}`);
  console.log(`txHash    ${settlement.transaction}`);
  console.log(`explorer  https://sepolia.basescan.org/tx/${settlement.transaction}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
