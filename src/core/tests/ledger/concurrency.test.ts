/**
 * OWNER: CORE
 * WHAT: NFR-4. The test that proves budgets cannot be raced.
 */
import { describe, it } from "vitest";

describe("budget ledger", () => {
  it.todo("50 concurrent $0.60 reservations against a $1.00 daily budget => exactly 1 ALLOW");
  it.todo("COMMIT converts a reservation without double counting");
  it.todo("RELEASE frees the window immediately");
  it.todo("the sweeper releases reservations after the 120 s TTL");
  it.todo("hourly, daily and monthly windows are enforced independently");
});

