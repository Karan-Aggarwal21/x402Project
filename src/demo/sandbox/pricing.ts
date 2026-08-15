// OWNER: DEMO. Single source of truth for demo prices — must match CORE's seed (BUILD.md C1).
// The policy defaults and demo scenarios are calibrated against these: change one, re-check both.

export const PRICING = {
  "/api/sandbox/search": "0.02",
  "/api/sandbox/extract": "0.03",
  "/api/sandbox/fact-check": "0.08",
  "/api/sandbox/summarize": "0.05",
  "/api/sandbox/premium-report": "2.00",   // the over-limit trap (demo D2)
  "/api/sandbox/rogue": "0.04",            // unallowlisted merchant (demo D4)
} as const;

export type SandboxRoute = keyof typeof PRICING;

