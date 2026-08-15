// OWNER: PAY. Proxies the agent's original request to the merchant.
// Strips anything the agent could use to impersonate the Guard or to smuggle its own payment.
import { HEADER } from "@/payments/x402/headers";

/** Prefixes, so X-Guard-Anything and every PAYMENT-* variant are covered, not just known names. */
const STRIPPED_PREFIXES = ["x-guard-", "payment-", "x-payment"];

/** `host` and `content-length` belong to the original request and would be wrong on the new one. */
const STRIPPED_EXACT = new Set(["authorization", "cookie", "host", "content-length", "connection"]);

export const STRIPPED_HEADERS = [...STRIPPED_EXACT, "x-guard-*", "payment-*", "x-payment*"];

export function isStrippedHeader(name: string): boolean {
  const lower = name.toLowerCase();
  return STRIPPED_EXACT.has(lower) || STRIPPED_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

export interface ForwardInput {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: unknown;
  /** Set only by the orchestrator, only after the signer approved. Never copied from the agent. */
  paymentSignature?: string;
  timeoutMs?: number;
}

export async function forwardToMerchant(input: ForwardInput): Promise<Response> {
  const { url, method, headers = {}, body, paymentSignature, timeoutMs = 20_000 } = input;

  const outgoing = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (!isStrippedHeader(name)) outgoing.set(name, value);
  }
  if (body !== undefined && !outgoing.has("content-type")) outgoing.set("content-type", "application/json");
  if (paymentSignature) outgoing.set(HEADER.signature, paymentSignature);

  return fetch(url, {
    method: method.toUpperCase(),
    headers: outgoing,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
}
