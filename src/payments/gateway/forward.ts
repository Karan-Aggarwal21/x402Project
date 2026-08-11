/**
 * OWNER: PAY
 * WHAT: Proxies the agent's original request to the merchant.
 *       Strips X-Guard-*, Authorization and any PAYMENT-* header the agent tried to inject.
 */

export const STRIPPED_HEADERS = ["x-guard-key", "x-guard-reason", "authorization", "payment-required", "payment-signature", "payment-response"];

export async function forwardToMerchant(
  _url: string,
  _method: string,
  _headers: Record<string, string>,
  _body: unknown,
): Promise<Response> {
  throw new Error("NOT_IMPLEMENTED: forwardToMerchant");
}

