// OWNER: CORE. The key formats are frozen after C6 — budget_ledger rows and the seed both store them.
import { describe, expect, it } from "vitest";
import { windowKeys } from "@/core/budget/windows";

describe("windowKeys", () => {
  it("matches the frozen contract", () => {
    expect(windowKeys(new Date("2026-08-13T09:30:00Z"))).toEqual({
      hour: "2026-08-13T09",
      day: "2026-08-13",
      month: "2026-08",
    });
  });

  it("produces the same keys the seed writes", () => {
    const at = new Date("2026-08-13T09:00:00.000Z");
    // seed.ts builds its ledger rows with these exact slices.
    expect(windowKeys(at)).toEqual({
      hour: at.toISOString().slice(0, 13),
      day: at.toISOString().slice(0, 10),
      month: at.toISOString().slice(0, 7),
    });
  });

  it("uses UTC, never the local timezone", () => {
    // 23:30Z is already the next calendar day in any timezone east of UTC. The day bucket must not move.
    const keys = windowKeys(new Date("2026-08-13T23:30:00Z"));
    expect(keys.day).toBe("2026-08-13");
    expect(keys.hour).toBe("2026-08-13T23");
  });

  it("keeps a DST-ambiguous local time in two distinct hour buckets", () => {
    // 01:30 on 2026-11-01 happens twice in America/New_York. These are different instants,
    // so they must never be summed into the same hourly budget.
    const beforeFallBack = windowKeys(new Date("2026-11-01T05:30:00Z"));
    const afterFallBack = windowKeys(new Date("2026-11-01T06:30:00Z"));
    expect(beforeFallBack.hour).toBe("2026-11-01T05");
    expect(afterFallBack.hour).toBe("2026-11-01T06");
    expect(beforeFallBack.day).toBe(afterFallBack.day);
  });

  it("rolls the month over at the boundary", () => {
    expect(windowKeys(new Date("2026-08-31T23:59:59.999Z"))).toEqual({
      hour: "2026-08-31T23",
      day: "2026-08-31",
      month: "2026-08",
    });
    expect(windowKeys(new Date("2026-09-01T00:00:00.000Z"))).toEqual({
      hour: "2026-09-01T00",
      day: "2026-09-01",
      month: "2026-09",
    });
  });

  it("rolls the year over at the boundary", () => {
    expect(windowKeys(new Date("2026-12-31T23:59:59Z")).month).toBe("2026-12");
    expect(windowKeys(new Date("2027-01-01T00:00:00Z")).month).toBe("2027-01");
  });

  it("handles a leap day", () => {
    expect(windowKeys(new Date("2028-02-29T12:00:00Z")).day).toBe("2028-02-29");
  });

  it("nests the keys, so day is a prefix of hour and month a prefix of day", () => {
    const keys = windowKeys(new Date("2026-08-13T09:30:00Z"));
    expect(keys.hour.startsWith(keys.day)).toBe(true);
    expect(keys.day.startsWith(keys.month)).toBe(true);
    expect([keys.hour.length, keys.day.length, keys.month.length]).toEqual([13, 10, 7]);
  });

  it("throws on an invalid Date rather than leaking a RangeError", () => {
    expect(() => windowKeys(new Date("not a date"))).toThrow(/invalid Date/);
  });
});
