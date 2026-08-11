/**
 * OWNER: DEMO
 * WHAT: Single source of truth for demo prices. The policy defaults and the demo scenarios
 *       are both calibrated against these numbers - change one, re-check both.
 * DOCS: API_DOCS.md section 6
 */

export const PRICING = {
  "/api/sandbox/search": "0.01",
  "/api/sandbox/extract": "0.03",
  "/api/sandbox/fact-check": "0.02",
  "/api/sandbox/summarize": "0.02",
  "/api/sandbox/premium-report": "2.00",   // the over-limit trap (demo D2)
  "/api/sandbox/rogue": "0.03",            // unallowlisted merchant (demo D4)
} as const;

