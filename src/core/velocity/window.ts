/**
 * OWNER: CORE
 * WHAT: Sliding-window transaction counts. Feeds rule 9 and the risk score.
 * NOTE: Postgres is enough at demo volume. Redis is post-MVP (PRD section 15).
 */

export interface VelocityCounts {
  lastMinute: number;
  lastHour: number;
  lastMinuteForMerchant: number;
}

export async function getVelocity(_agentId: string, _merchant: string, _now: Date): Promise<VelocityCounts> {
  throw new Error("NOT_IMPLEMENTED: getVelocity");
}

