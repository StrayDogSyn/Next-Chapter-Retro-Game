/**
 * lib/game/loot.ts — seeded loot generation with rarity tiers and a pity timer.
 *
 * Uses a forked stream from rng.ts so chest contents are reproducible per run
 * seed, and opening chests never perturbs layout/enemy randomness.
 *
 * Pity timer: every miss on rare+ nudges the odds up; a rare+ drop resets it.
 * Guarantees no tester sits through 30 gray drops in a row (the "Diablo 3
 * launch" failure mode), while keeping the math deterministic per seed.
 */

import { Rng } from "./rng";

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface LootItem {
  id: string;
  name: string;
  rarity: Rarity;
  kind: "weapon" | "relic" | "essence" | "consumable";
  /** For essence: amount of meta-currency. */
  amount?: number;
}

interface RarityConfig {
  weight: number;      // base roll weight
  pityBonus: number;   // added weight per consecutive miss
}

const RARITY_TABLE: Record<Rarity, RarityConfig> = {
  common:    { weight: 100, pityBonus: 0 },
  uncommon:  { weight: 40,  pityBonus: 0 },
  rare:      { weight: 12,  pityBonus: 3 },
  epic:      { weight: 4,   pityBonus: 1.5 },
  legendary: { weight: 1,   pityBonus: 0.5 },
};

/** Rarities that count as a "hit" for the pity timer. */
const PITY_TIERS: ReadonlySet<Rarity> = new Set(["rare", "epic", "legendary"]);

/** Starter item pools — Altered Beast flavor. Extend freely; ids stay stable. */
const ITEM_POOLS: Record<Rarity, ReadonlyArray<Omit<LootItem, "rarity">>> = {
  common: [
    { id: "essence-small", name: "Faint Essence", kind: "essence", amount: 5 },
    { id: "salve", name: "Crude Salve", kind: "consumable" },
    { id: "rusted-blade", name: "Rusted Blade", kind: "weapon" },
  ],
  uncommon: [
    { id: "essence-medium", name: "Pulsing Essence", kind: "essence", amount: 15 },
    { id: "soldier-sidearm", name: "Marine Sidearm", kind: "weapon" },
    { id: "beast-charm", name: "Beast Charm", kind: "relic" },
  ],
  rare: [
    { id: "essence-large", name: "Howling Essence", kind: "essence", amount: 40 },
    { id: "wolf-fang-blade", name: "Wolf-Fang Blade", kind: "weapon" },
    { id: "lunar-sigil", name: "Lunar Sigil", kind: "relic" },
  ],
  epic: [
    { id: "graviton-maul", name: "Graviton Maul", kind: "weapon" },
    { id: "corrupted-heart", name: "Corrupted Heart", kind: "relic" },
  ],
  legendary: [
    { id: "dark-saber", name: "Dark Saber", kind: "weapon" },
    { id: "primal-totem", name: "Primal Totem", kind: "relic" },
  ],
};

export interface LootResult {
  item: LootItem;
  rarity: Rarity;
  /** Pity counter after this open — surface in debug overlay. */
  pity: number;
}

export class LootGenerator {
  private readonly rng: Rng;
  private pity = 0;

  /**
   * @param runRng the run's root Rng — LootGenerator forks its own stream.
   * @param streamName vary per context ("loot:zone-2") for per-zone tables later.
   */
  constructor(runRng: Rng, streamName: string = "loot") {
    this.rng = runRng.fork(streamName);
  }

  /** Open a chest: roll rarity (with pity), then an item within that tier. */
  open(): LootResult {
    const rarity = this.rollRarity();
    const pool = ITEM_POOLS[rarity];
    const base = this.rng.pick(pool);
    const item: LootItem = { ...base, rarity };

    if (PITY_TIERS.has(rarity)) {
      this.pity = 0;
    } else {
      this.pity++;
    }
    return { item, rarity, pity: this.pity };
  }

  private rollRarity(): Rarity {
    const entries = (Object.keys(RARITY_TABLE) as Rarity[]).map((r) => {
      const cfg = RARITY_TABLE[r];
      const w = cfg.weight + (PITY_TIERS.has(r) ? cfg.pityBonus * this.pity : 0);
      return [r, w] as const;
    });
    return this.rng.weighted(entries);
  }
}
