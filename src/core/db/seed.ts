/**
 * OWNER: CORE
 * WHAT: Realistic demo data. UI builds against this from hour 2, so ship it early.
 * RUN:  pnpm db:seed
 *
 * Seeds:
 *   1 organization, 1 admin user
 *   2 agents: "ResearchBot" (conservative policy), "DataBot" (standard policy)
 *   6 merchants: 4 sandbox sellers allowlisted, premium + rogue not allowlisted
 *   3 policy versions on ResearchBot so the version-history UI has something to show
 *   40 payment intents: ~30 ALLOW/SETTLED, ~8 BLOCK with varied reason codes, ~2 HOLD
 */

async function main() {
  throw new Error("NOT_IMPLEMENTED: seed");
}

main().catch((e) => { console.error(e); process.exit(1); });


export {};
