// OWNER: CORE. Per-key request limiter -> 429.
// NOTE: This is transport hygiene. It is NOT the policy velocity rule, which returns 402.
//       Never conflate the two - API_DOCS.md section 9.
const WINDOW_MS = 60_000;

// Counters are per process, so a multi-instance deploy limits per instance. Redis is post-MVP
// (PRD section 15) — the policy velocity rule, which is the one that must be exact, uses Postgres.
const hits = new Map<string, number[]>();

/** True when the request may proceed. */
export async function checkRateLimit(key: string, limitPerMinute: number): Promise<boolean> {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((at) => now - at < WINDOW_MS);

  if (recent.length >= limitPerMinute) {
    hits.set(key, recent);
    return false;
  }

  recent.push(now);
  hits.set(key, recent);
  return true;
}

/** Test seam: the window is module state and a suite has to be able to start from empty. */
export function resetRateLimits(): void {
  hits.clear();
}
