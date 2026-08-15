// OWNER: CORE. In-process event bus. Audit writes publish here, the SSE handler subscribes.
// Delivery is best effort by design: a dashboard that disconnects must never fail a payment.
export type LiveEvent = "decision" | "settlement" | "budget" | "approval";

export type LiveEventListener = (event: LiveEvent, data: unknown) => void;

const listeners = new Set<LiveEventListener>();

export function publish(event: LiveEvent, data: unknown): void {
  for (const listener of listeners) {
    try {
      listener(event, data);
    } catch {
      // A broken subscriber is the subscriber's problem, not the payment's.
    }
  }
}

export function subscribe(fn: LiveEventListener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Test seam — the bus is module state, so a suite that subscribes has to be able to reset it. */
export function subscriberCount(): number {
  return listeners.size;
}
