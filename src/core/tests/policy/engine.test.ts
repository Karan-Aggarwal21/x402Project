/**
 * OWNER: CORE
 * WHAT: Properties of the engine itself, not of individual rules.
 */
import { describe, it } from "vitest";

describe("policy engine", () => {
  it.todo("returns the FIRST failing rule, in documented precedence order");
  it.todo("is deterministic: same context => same decision, 1000 runs");
  it.todo("fails CLOSED when a rule throws");
  it.todo("fails CLOSED when the policy is missing");
  it.todo("never returns ALLOW when any blocking rule produced a Reason");
});

