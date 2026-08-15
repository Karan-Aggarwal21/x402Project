// OWNER: DEMO. Canned responses — a seller never depends on a real upstream service mid-demo.

export const SEARCH_RESULTS = [
  {
    title: "EV battery recycling capacity 2026",
    url: "https://example.org/a",
    snippet:
      "Global hydrometallurgical recycling capacity reached 1.8 GWh in 2026, up 42% year over year.",
  },
  {
    title: "Lithium recovery rates by process",
    url: "https://example.org/b",
    snippet:
      "Direct recycling recovers 95% of cathode material; pyrometallurgy recovers under 60% of lithium.",
  },
];

export const EXTRACTED_DOC = {
  title: "Recycling capacity report",
  text: "Table 3: Regional capacity split — APAC 61%, EU 23%, NA 16%. Announced expansions add 0.7 GWh by 2028.",
};

export const FACT_CHECK = { verdict: "supported", sources: ["https://example.org/a"] };

export const SUMMARY = {
  summary: "Recycling capacity is growing 42% annually; lithium recovery varies widely by process.",
};

export const PREMIUM_REPORT = { report: "the expensive one nobody should be able to buy" };

export const ROGUE_DATA = { data: "unvetted content from a merchant nobody allowlisted" };
