/**
 * OWNER: DEMO
 * WHAT: Canned responses. A seller must never depend on a real upstream service during a demo.
 */

export const SEARCH_RESULTS = [
  { title: "EV battery recycling capacity 2026", url: "https://example.org/a", snippet: "..." },
  { title: "Lithium recovery rates by process", url: "https://example.org/b", snippet: "..." },
];

export const EXTRACTED_DOC = { title: "Recycling capacity report", text: "..." };
export const FACT_CHECK = { verdict: "supported", sources: ["https://example.org/a"] };
export const SUMMARY = { summary: "..." };
export const PREMIUM_REPORT = { report: "the expensive one nobody should be able to buy" };

