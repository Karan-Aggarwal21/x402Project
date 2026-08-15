// OWNER: CORE (frozen contract). Prefixed ULIDs so every id says what it is in a log line.
// Time-sortable and generated before insert, so no round trip for a sequence.
import { ulid } from "ulid";

export const ID_PREFIX = {
  agent: "agt",
  policy: "pol",
  intent: "int",
  evaluation: "evl",
  approval: "apr",
  payment: "pay",
  merchant: "mrc",
  audit: "aud",
  reservation: "rsv",
  ledger: "led",
  simulation: "sim",
} as const;

export type IdKind = keyof typeof ID_PREFIX;

/** newId("intent") -> "int_01J9ZQ2V8K3M..." */
export function newId(kind: IdKind): string {
  return `${ID_PREFIX[kind]}_${ulid()}`;
}

/** Cheap shape check for route params, so a malformed id fails before it reaches the DB. */
export function isId(kind: IdKind, value: string): boolean {
  return value.startsWith(`${ID_PREFIX[kind]}_`) && value.length === ID_PREFIX[kind].length + 27;
}
