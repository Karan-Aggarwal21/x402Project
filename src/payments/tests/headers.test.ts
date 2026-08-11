/**
 * OWNER: PAY
 * WHAT: Header codecs tested against the REAL captures recorded during Phase 0.
 *       Paste the actual base64 values from Docs/x402-notes.md into the fixtures below.
 */
import { describe, it, expect } from "vitest";

describe("x402 header codecs", () => {
  it.todo("decodes a real PAYMENT-REQUIRED capture from P0");
  it.todo("round-trips a PAYMENT-SIGNATURE payload");
  it.todo("extracts the tx hash from a real PAYMENT-RESPONSE");
  it.todo("throws INVALID_PAYMENT_REQUIREMENTS on a malformed header");
});

