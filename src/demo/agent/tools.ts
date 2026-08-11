/**
 * OWNER: DEMO
 * WHAT: The five paid tools. Shared by BOTH drivers (deterministic simulator and LLM agent).
 *       Every tool goes through guardedFetch. None of them can pay by itself.
 */

export const TOOL_ENDPOINTS = {
  search: "/api/sandbox/search",
  extract: "/api/sandbox/extract",
  factCheck: "/api/sandbox/fact-check",
  summarize: "/api/sandbox/summarize",
  premiumReport: "/api/sandbox/premium-report",
} as const;

export function buildTools() {
  // ai-sdk `tool({ description, parameters, execute })` for each entry above.
  // execute() -> guardedFetch(); on a 402 return { blocked: true, code } so the model can adapt.
  throw new Error("NOT_IMPLEMENTED: buildTools");
}

