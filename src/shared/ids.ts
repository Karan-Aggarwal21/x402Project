/**
 * OWNER: CORE
 * WHAT: Prefixed ULIDs so every id says what it is in a log line.
 * DOCS: API_DOCS.md - "IDs" in the header table
 */

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
  simulation: "sim",
} as const;

export type IdKind = keyof typeof ID_PREFIX;

/** newId("intent") -> "int_01J9ZQ2V8K3M..." */
export function newId(_kind: IdKind): string {
  throw new Error("NOT_IMPLEMENTED: newId");
}

