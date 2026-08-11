/**
 * OWNER: CORE
 * WHAT: Window keys stored as text so a sliding sum is a plain indexed WHERE.
 *       hour "2026-08-10T14" | day "2026-08-10" | month "2026-08"
 */

export function windowKeys(_now: Date): { hour: string; day: string; month: string } {
  throw new Error("NOT_IMPLEMENTED: windowKeys");
}

