// OWNER: CORE. Window keys stored as text so a sliding sum is a plain indexed WHERE.
// hour "2026-08-10T14" | day "2026-08-10" | month "2026-08"

export interface WindowKeys {
  hour: string;
  day: string;
  month: string;
}

export function windowKeys(now: Date): WindowKeys {
  // An invalid Date would make toISOString throw a bare RangeError halfway down the money path.
  if (Number.isNaN(now.getTime())) throw new Error("windowKeys received an invalid Date");

  // toISOString is always UTC, so the machine running the demo cannot shift a bucket.
  const iso = now.toISOString();
  return { hour: iso.slice(0, 13), day: iso.slice(0, 10), month: iso.slice(0, 7) };
}
