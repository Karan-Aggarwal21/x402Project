/**
 * OWNER: CORE
 * WHAT: Truncate + re-seed. Wired to a dashboard button so the demo re-runs clean on stage.
 * RUN:  pnpm db:reset
 */

async function main() {
  throw new Error("NOT_IMPLEMENTED: reset");
}

main().catch((e) => { console.error(e); process.exit(1); });


export {};
