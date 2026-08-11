/**
 * OWNER: PAY
 * WHAT: The security tests for threat T9. These must pass before the demo.
 */
import { describe, it } from "vitest";

describe("signer", () => {
  it.todo("refuses to sign without a valid allowToken");
  it.todo("refuses to sign when the recipient changed after ALLOW");
  it.todo("refuses to sign when the amount changed after ALLOW");
  it.todo("refuses a replayed allowToken");
  it.todo("refuses an expired allowToken");
});
