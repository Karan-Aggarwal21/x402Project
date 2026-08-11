/**
 * OWNER: DEMO
 * WHAT: The deterministic driver. Same tools as the LLM agent, no model in the loop,
 *       so a scenario produces the same result every single time.
 * RUN:  pnpm sim -- D3_VELOCITY_LOOP
 */

export const SCENARIOS = [
  "D1_NORMAL_PAYMENT",
  "D2_OVER_LIMIT",
  "D3_VELOCITY_LOOP",
  "D4_UNKNOWN_MERCHANT",
  "D5_BUDGET_EXHAUSTION",
  "D6_PROMPT_INJECTION",
  "D7_HUMAN_ESCALATION",
] as const;

export type ScenarioName = (typeof SCENARIOS)[number];

export async function runScenario(_name: ScenarioName): Promise<void> {
  throw new Error("NOT_IMPLEMENTED: runScenario");
}

