/**
 * OWNER: CORE
 * WHAT: NFR-1 benchmark. 500 intents through the engine, prints p50 / p95.
 * TARGET: p95 <= 60 ms for the engine, <= 150 ms end-to-end guard overhead.
 */

async function main() {
  throw new Error("NOT_IMPLEMENTED: bench-evaluate");
}

main().catch((e) => { console.error(e); process.exit(1); });


export {};
