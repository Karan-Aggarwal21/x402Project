/**
 * OWNER: DEMO
 * WHAT: The ten attack drills from DEVELOPMENT_PLAN.md Phase 5. Each records
 *       attempted spend, actual spend, and which control fired.
 * RUN:  pnpm drills
 * OUT:  Docs/ATTACK_DRILLS.md  -> feeds PPT slide 5 (Feasibility & Viability)
 */

export const DRILLS = [
  { id: "5.1", name: "runaway loop", owner: "DEMO", expect: "velocity blocks after the limit" },
  { id: "5.2", name: "prompt injection", owner: "DEMO", expect: "spend <= daily budget" },
  { id: "5.3", name: "unknown merchant", owner: "DEMO", expect: "allowlist BLOCK" },
  { id: "5.4", name: "recipient swap", owner: "PAY", expect: "RECIPIENT_MISMATCH" },
  { id: "5.5", name: "wrong rail", owner: "PAY", expect: "rail BLOCK" },
  { id: "5.6", name: "replay", owner: "CORE", expect: "single charge, 409 on conflict" },
  { id: "5.7", name: "budget race", owner: "CORE", expect: "no overspend across 50 parallel" },
  { id: "5.8", name: "policy bypass", owner: "PAY", expect: "allowToken check refuses" },
  { id: "5.9", name: "fail closed", owner: "CORE", expect: "DB down => BLOCK" },
  { id: "5.10", name: "frozen agent", owner: "UI", expect: "next payment blocked immediately" },
] as const;

async function main() {
  throw new Error("NOT_IMPLEMENTED: drills");
}

main().catch((e) => { console.error(e); process.exit(1); });

