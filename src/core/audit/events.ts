/**
 * OWNER: CORE
 * WHAT: In-process event bus. Audit writes publish here, the SSE handler subscribes.
 * DOCS: API_DOCS.md section 5.7
 */

export type LiveEvent = "decision" | "settlement" | "budget" | "approval";

export function publish(_event: LiveEvent, _data: unknown): void {
  throw new Error("NOT_IMPLEMENTED: publish");
}

export function subscribe(_fn: (event: LiveEvent, data: unknown) => void): () => void {
  throw new Error("NOT_IMPLEMENTED: subscribe");
}

