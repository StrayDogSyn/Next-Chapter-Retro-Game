/**
 * lib/game/rng.ts — seeded deterministic RNG with forked streams.
 *
 * Why not Math.random(): unreproducible runs, no shareable seeds, no daily
 * challenge, no usable bug reports. Why not an external randomness API on
 * static hosting: latency, rate limits, offline death, and still no replay.
 *
 * Design: xmur3 string hash seeds an sfc32 generator. Each subsystem forks
 * its own stream ("layout", "loot", "enemies") so consuming randomness in one
 * system never shifts the sequence of another — opening an extra chest must
 * not reshuffle the next room's layout.
 */

/** xmur3: string -> 32-bit hash factory (call repeatedly for more seed words). */
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/** sfc32: fast, high-quality 128-bit-state PRNG. Returns floats in [0, 1). */
function sfc32(a: number, b: number, c: number, d: number): () => number {
  return () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    const t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    const out = (t + d) | 0;
    c = (c + out) | 0;
    return (out >>> 0) / 4294967296;
  };
}

const SEED_WORDS = [
  "BEAST", "WOLF", "BEAR", "HAWK", "FANG", "CLAW", "MOON", "BLOOD",
  "IRON", "GHOUL", "GRAVE", "STORM", "EMBER", "VOID", "RUNE", "HOWL",
] as const;

export class Rng {
  readonly seed: string;
  private readonly next01: () => number;

  constructor(seed: string) {
    this.seed = seed;
    const h = xmur3(seed);
    this.next01 = sfc32(h(), h(), h(), h());
    // sfc32 needs a few warm-up calls to decorrelate from weak seeds
    for (let i = 0; i < 12; i++) this.next01();
  }

  /** Independent child stream. Same parent seed + same name = same stream, always. */
  fork(name: string): Rng {
    return new Rng(`${this.seed}::${name}`);
  }

  /** Float in [0, 1). Drop-in for Math.random(). */
  next(): number {
    return this.next01();
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next01() * (max - min + 1));
  }

  /** Float in [min, max). */
  float(min: number, max: number): number {
    return min + this.next01() * (max - min);
  }

  /** True with probability p (0..1). */
  chance(p: number): boolean {
    return this.next01() < p;
  }

  /** Random element. Throws on empty array — an empty pool is a content bug. */
  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error("Rng.pick: empty array");
    return arr[Math.floor(this.next01() * arr.length)];
  }

  /** Weighted pick: entries of [item, weight]. */
  weighted<T>(entries: ReadonlyArray<readonly [T, number]>): T {
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let roll = this.next01() * total;
    for (const [item, w] of entries) {
      roll -= w;
      if (roll < 0) return item;
    }
    return entries[entries.length - 1][0];
  }

  /** Fisher–Yates shuffle. Returns a new array; input untouched. */
  shuffle<T>(arr: readonly T[]): T[] {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next01() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
}

/** Human-shareable seed like "WOLF-4207" for the death screen / bug reports. */
export function generateSeedPhrase(entropy: string = `${Date.now()}`): string {
  const h = xmur3(entropy);
  const word = SEED_WORDS[h() % SEED_WORDS.length];
  const num = h() % 10000;
  return `${word}-${num.toString().padStart(4, "0")}`;
}

/** Same seed for every player on a given UTC date — daily challenge, zero server. */
export function dailySeed(date: Date = new Date()): string {
  const day = date.toISOString().slice(0, 10); // "2026-07-08"
  return `DAILY-${day}`;
}
