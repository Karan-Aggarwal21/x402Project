// OWNER: CORE. Guards the two primitives every money path depends on.
import { describe, expect, it } from "vitest";
import { formatUsd, toMinor, toUsd } from "@/shared/money";
import { canonicalJson, computeRowHash, GENESIS_HASH } from "@/core/audit/chain";

describe("toMinor", () => {
  it("converts dollars to 6-decimal minor units", () => {
    expect(toMinor("0.05")).toBe(50_000n);
    expect(toMinor("1")).toBe(1_000_000n);
    expect(toMinor("2000.00")).toBe(2_000_000_000n);
    expect(toMinor("0.000001")).toBe(1n);
  });

  it("rejects anything that is not a plain positive decimal", () => {
    for (const bad of ["-1.00", "1.0000001", "1e3", "", "abc", "1.", "$1.00"]) {
      expect(() => toMinor(bad)).toThrow();
    }
  });

  it("round-trips through toUsd", () => {
    for (const usd of ["0.05", "1.00", "12.34", "2000.00"]) {
      expect(toUsd(toMinor(usd))).toBe(usd);
    }
    expect(formatUsd(50_000n)).toBe("$0.05");
  });
});

describe("audit chain", () => {
  it("is independent of key order", () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe(canonicalJson({ a: 2, b: 1 }));
  });

  it("serialises bigint and Date instead of throwing", () => {
    expect(canonicalJson({ amountMinor: 50_000n })).toBe('{"amountMinor":"50000"}');
    expect(canonicalJson(new Date("2026-08-13T09:00:00.000Z"))).toBe('"2026-08-13T09:00:00.000Z"');
  });

  it("changes every downstream hash when a row is edited", () => {
    const rows = [{ seq: 1n, event: "A" }, { seq: 2n, event: "B" }];
    const chain = (input: typeof rows) =>
      input.reduce<string[]>((acc, row) => [...acc, computeRowHash(acc.at(-1) ?? GENESIS_HASH, row)], []);

    const original = chain(rows);
    const tampered = chain([{ seq: 1n, event: "TAMPERED" }, rows[1]]);
    expect(tampered[0]).not.toBe(original[0]);
    expect(tampered[1]).not.toBe(original[1]);
  });
});
