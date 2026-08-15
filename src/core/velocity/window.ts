// OWNER: CORE. Sliding-window transaction counts. Feeds rule 9 and the risk score.
// NOTE: Postgres is enough at demo volume. Redis is post-MVP (PRD section 15).
import { getSpendCounters } from "@/core/db/queries";

export interface VelocityCounts {
  lastMinute: number;
  lastHour: number;
  lastMinuteForMerchant: number;
}

/**
 * The engine reads these off SpendCounters, which is one round trip for all ten inputs. This is the
 * standalone view for callers that only want the counts, and it deliberately shares that one query
 * rather than keeping a second definition of "what counts as a payment" that could drift.
 */
export async function getVelocity(agentId: string, merchant: string, now: Date): Promise<VelocityCounts> {
  const counters = await getSpendCounters(agentId, merchant, now);
  return {
    lastMinute: counters.txLastMinute,
    lastHour: counters.txLastHour,
    lastMinuteForMerchant: counters.txLastMinuteForMerchant,
  };
}
