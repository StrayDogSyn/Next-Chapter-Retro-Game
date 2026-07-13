/**
 * Regression tests for the seeded RNG's determinism and stream-independence
 * guarantees (see rng.ts's header comment and MASTER_BUILD_SPEC.md's
 * two-stream RNG rule). These are the properties the whole procgen design
 * depends on: same seed -> same world, and rolling loot must never perturb
 * layout.
 */
import { describe, expect, it } from "vitest";
import { Rng, dailySeed, generateSeedPhrase } from "./rng";

describe("Rng determinism", () => {
  it("produces an identical sequence for the same seed", () => {
    const a = new Rng("WOLF-4207");
    const b = new Rng("WOLF-4207");
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("produces a different sequence for a different seed", () => {
    const a = new Rng("WOLF-4207");
    const b = new Rng("WOLF-4208");
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it("all next() values fall in [0, 1)", () => {
    const rng = new Rng("BOUNDS-TEST");
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("Rng.fork stream independence", () => {
  it("forking the same name from the same parent seed is deterministic", () => {
    const parentA = new Rng("WOLF-4207");
    const parentB = new Rng("WOLF-4207");
    const layoutA = parentA.fork("layout");
    const layoutB = parentB.fork("layout");
    const seqA = Array.from({ length: 20 }, () => layoutA.next());
    const seqB = Array.from({ length: 20 }, () => layoutB.next());
    expect(seqA).toEqual(seqB);
  });

  it("different fork names from the same parent produce different streams", () => {
    const parent = new Rng("WOLF-4207");
    const layout = parent.fork("layout");
    const loot = parent.fork("loot");
    const seqLayout = Array.from({ length: 20 }, () => layout.next());
    const seqLoot = Array.from({ length: 20 }, () => loot.next());
    expect(seqLayout).not.toEqual(seqLoot);
  });

  it("consuming randomness from one fork never perturbs a sibling fork", () => {
    const parent = new Rng("WOLF-4207");
    const layout = parent.fork("layout");
    const lootBefore = parent.fork("loot");
    const expected = Array.from({ length: 10 }, () => lootBefore.next());

    // Re-derive the "loot" fork fresh, but only after heavily consuming "layout".
    const parentAgain = new Rng("WOLF-4207");
    const layoutAgain = parentAgain.fork("layout");
    for (let i = 0; i < 5000; i++) layoutAgain.next();
    const lootAfter = parentAgain.fork("loot");
    const actual = Array.from({ length: 10 }, () => lootAfter.next());

    expect(actual).toEqual(expected);
  });
});

describe("Rng helper methods", () => {
  it("int(min, max) is always within the inclusive bounds", () => {
    const rng = new Rng("INT-BOUNDS");
    for (let i = 0; i < 500; i++) {
      const v = rng.int(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("pick throws on an empty array", () => {
    const rng = new Rng("PICK-EMPTY");
    expect(() => rng.pick([])).toThrow();
  });

  it("shuffle returns a new array and never mutates the input", () => {
    const rng = new Rng("SHUFFLE-TEST");
    const input = [1, 2, 3, 4, 5] as const;
    const out = rng.shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect(out).not.toBe(input);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("dailySeed / generateSeedPhrase", () => {
  it("dailySeed is stable for the same UTC date", () => {
    const d = new Date("2026-07-11T23:59:00.000Z");
    expect(dailySeed(d)).toBe(dailySeed(d));
    expect(dailySeed(d)).toBe("DAILY-2026-07-11");
  });

  it("generateSeedPhrase is deterministic for the same entropy input", () => {
    expect(generateSeedPhrase("fixed-entropy")).toBe(generateSeedPhrase("fixed-entropy"));
  });

  it("generateSeedPhrase matches the WORD-#### shape", () => {
    expect(generateSeedPhrase("shape-check")).toMatch(/^[A-Z]+-\d{4}$/);
  });
});
