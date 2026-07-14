/**
 * Data-driven item system.
 *
 * There are NO per-item classes. Every weapon in the game is a combination of
 *   base weapon  x  prefix modifier  x  rarity tier  x  rolled stats
 * which yields 7 bases x 10 prefixes x 4 rarities = 280 distinct weapons
 * before stat rolls even differentiate them.
 *
 * Character modifications (upgrades) are equally data-driven: 12 upgrade
 * types, each stackable/tiered.
 *
 * IMPORTANT (ADR-001): the authoritative loot ROLLING lives in the Python
 * service (python-service/main.py, /loot/roll). The tables below are shared
 * *definitions* so the client can render any item the service returns, and so
 * a degraded-mode fallback roll exists when the Python service is offline
 * (see ADR-003 in docs/DECISIONS.md). Keep these tables in sync with
 * python-service/loot_tables.py — that file is generated FROM this one via
 * scripts/sync-loot-tables.py... not yet; for now both files carry a header
 * comment pointing at each other.
 */

export type WeaponKind = "melee" | "ranged" | "magic";

export type BaseWeapon = {
  id: string;
  name: string;
  kind: WeaponKind;
  damage: number;
  /** attacks per second */
  speed: number;
  /** pixels; melee arc reach or projectile lifetime-range */
  range: number;
  projectileSpeed?: number;
  sound: "sword" | "laser" | "magic";
};

export const BASE_WEAPONS: BaseWeapon[] = [
  { id: "sword", name: "Sword", kind: "melee", damage: 10, speed: 2.0, range: 26, sound: "sword" },
  { id: "spear", name: "Spear", kind: "melee", damage: 8, speed: 1.6, range: 40, sound: "sword" },
  { id: "claws", name: "Beast Claws", kind: "melee", damage: 6, speed: 3.2, range: 20, sound: "sword" },
  { id: "hammer", name: "Warhammer", kind: "melee", damage: 18, speed: 0.9, range: 28, sound: "sword" },
  { id: "pistol", name: "Laser Pistol", kind: "ranged", damage: 7, speed: 2.5, range: 220, projectileSpeed: 320, sound: "laser" },
  { id: "rifle", name: "Laser Rifle", kind: "ranged", damage: 12, speed: 1.4, range: 300, projectileSpeed: 420, sound: "laser" },
  { id: "wand", name: "Chaos Wand", kind: "magic", damage: 9, speed: 1.8, range: 240, projectileSpeed: 240, sound: "magic" },
];

export type Prefix = {
  id: string;
  name: string; // "" for plain
  damageMult: number;
  speedMult: number;
  /** extra effect hook understood by combat code */
  effect?: "burn" | "freeze" | "lifesteal" | "shock" | "curse" | "crit";
};

export const PREFIXES: Prefix[] = [
  { id: "plain", name: "", damageMult: 1.0, speedMult: 1.0 },
  { id: "rusty", name: "Rusty", damageMult: 0.8, speedMult: 0.95 },
  { id: "keen", name: "Keen", damageMult: 1.1, speedMult: 1.05, effect: "crit" },
  { id: "vicious", name: "Vicious", damageMult: 1.25, speedMult: 0.95 },
  { id: "blazing", name: "Blazing", damageMult: 1.15, speedMult: 1.0, effect: "burn" },
  { id: "frozen", name: "Frozen", damageMult: 1.05, speedMult: 0.9, effect: "freeze" },
  { id: "vampiric", name: "Vampiric", damageMult: 1.0, speedMult: 1.0, effect: "lifesteal" },
  { id: "shock", name: "Thunderstruck", damageMult: 1.1, speedMult: 1.1, effect: "shock" },
  { id: "cursed", name: "Cursed", damageMult: 1.5, speedMult: 0.85, effect: "curse" },
  { id: "swift", name: "Swift", damageMult: 0.9, speedMult: 1.35 },
];

export type Rarity = "common" | "uncommon" | "rare" | "epic";

export const RARITIES: Record<
  Rarity,
  { weight: number; statMult: number; rollSpread: number; color: string }
> = {
  common: { weight: 60, statMult: 1.0, rollSpread: 0.1, color: "#b0b0b0" },
  uncommon: { weight: 25, statMult: 1.2, rollSpread: 0.15, color: "#4ade80" },
  rare: { weight: 11, statMult: 1.5, rollSpread: 0.2, color: "#60a5fa" },
  epic: { weight: 4, statMult: 2.0, rollSpread: 0.25, color: "#c084fc" },
};

/**
 * AST-014/015: sprite art for dropped loot pickups, kept here (not
 * hardcoded in game.ts's drawPickups()) so this data-driven items module
 * stays the single source of truth for what a piece of loot looks like -
 * same reasoning as RARITIES living here rather than in the renderer.
 * Sheet contents come from scripts/prepare-assets.py's AST-014/015 blocks
 * (public/sprites/lootIcon.png, impactBurst_<rarity>.png).
 */
export const LOOT_PICKUP_SPRITE = { sheet: "lootIcon", anim: "shimmer" } as const;

export function impactBurstSheet(rarity: Rarity): string {
  return `impactBurst_${rarity}`;
}

/** A fully rolled weapon instance, as returned by the Python loot service. */
export type WeaponInstance = {
  itemType: "weapon";
  baseId: string;
  prefixId: string;
  rarity: Rarity;
  name: string;
  damage: number;
  speed: number;
  range: number;
  projectileSpeed?: number;
  kind: WeaponKind;
  effect?: string;
  sound: BaseWeapon["sound"];
  rolledBy: "python-service" | "client-fallback";
};

export type UpgradeId =
  | "maxHp"
  | "moveSpeed"
  | "jumpPower"
  | "doubleJump"
  | "dash"
  | "defense"
  | "luck"
  | "attackSpeed"
  | "lifeSteal"
  | "critChance"
  | "coinMagnet"
  | "thorns";

export type UpgradeInstance = {
  itemType: "upgrade";
  upgradeId: UpgradeId;
  rarity: Rarity;
  name: string;
  /** magnitude in the unit each upgrade type defines */
  value: number;
  rolledBy: "python-service" | "client-fallback";
};

export const UPGRADE_DEFS: Record<
  UpgradeId,
  { name: string; baseValue: number; unit: string }
> = {
  maxHp: { name: "Heart Container", baseValue: 20, unit: "HP" },
  moveSpeed: { name: "Sprint Servos", baseValue: 10, unit: "%" },
  jumpPower: { name: "Coil Boots", baseValue: 8, unit: "%" },
  doubleJump: { name: "Aether Wings", baseValue: 1, unit: "jump" },
  dash: { name: "Phase Dash Module", baseValue: 1, unit: "dash" },
  defense: { name: "Plated Vest", baseValue: 10, unit: "%" },
  luck: { name: "Lucky Fang", baseValue: 8, unit: "%" },
  attackSpeed: { name: "Adrenal Gland", baseValue: 10, unit: "%" },
  lifeSteal: { name: "Leech Sigil", baseValue: 4, unit: "%" },
  critChance: { name: "Hunter's Eye", baseValue: 6, unit: "%" },
  coinMagnet: { name: "Greed Lodestone", baseValue: 48, unit: "px" },
  thorns: { name: "Spine Mail", baseValue: 5, unit: "dmg" },
};

export type LootDrop = WeaponInstance | UpgradeInstance;

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRolledBy(value: unknown): value is WeaponInstance["rolledBy"] {
  return value === "python-service" || value === "client-fallback";
}

export function isRarity(value: unknown): value is Rarity {
  return value === "common" || value === "uncommon" || value === "rare" || value === "epic";
}

function isWeaponKind(value: unknown): value is WeaponKind {
  return value === "melee" || value === "ranged" || value === "magic";
}

function isWeaponSound(value: unknown): value is BaseWeapon["sound"] {
  return value === "sword" || value === "laser" || value === "magic";
}

export function isWeaponInstance(value: unknown): value is WeaponInstance {
  if (!isObjectRecord(value)) return false;
  if (value.itemType !== "weapon") return false;
  if (typeof value.baseId !== "string" || typeof value.prefixId !== "string") return false;
  if (!isRarity(value.rarity)) return false;
  if (typeof value.name !== "string") return false;
  if (typeof value.damage !== "number" || !Number.isFinite(value.damage)) return false;
  if (typeof value.speed !== "number" || !Number.isFinite(value.speed)) return false;
  if (typeof value.range !== "number" || !Number.isFinite(value.range)) return false;
  if (!isWeaponKind(value.kind)) return false;
  if (!isWeaponSound(value.sound)) return false;
  if (!isRolledBy(value.rolledBy)) return false;
  if (value.projectileSpeed !== undefined && (typeof value.projectileSpeed !== "number" || !Number.isFinite(value.projectileSpeed))) {
    return false;
  }
  if (value.effect !== undefined && typeof value.effect !== "string") return false;
  return true;
}

function isUpgradeInstance(value: unknown): value is UpgradeInstance {
  if (!isObjectRecord(value)) return false;
  if (value.itemType !== "upgrade") return false;
  if (typeof value.upgradeId !== "string" || !(value.upgradeId in UPGRADE_DEFS)) return false;
  if (!isRarity(value.rarity)) return false;
  if (typeof value.name !== "string") return false;
  if (typeof value.value !== "number" || !Number.isFinite(value.value)) return false;
  if (!isRolledBy(value.rolledBy)) return false;
  return true;
}

export function isLootDrop(value: unknown): value is LootDrop {
  return isWeaponInstance(value) || isUpgradeInstance(value);
}

export function describeLoot(drop: LootDrop): string {
  if (drop.itemType === "weapon") {
    return `${drop.name} (${drop.rarity}) — ${Math.round(drop.damage)} dmg @ ${drop.speed.toFixed(1)}/s`;
  }
  const def = UPGRADE_DEFS[drop.upgradeId];
  return `${drop.name} (${drop.rarity}) — +${drop.value}${def.unit}`;
}

/**
 * Degraded-mode fallback roll used ONLY when /api/loot is unreachable.
 * Mirrors python-service/main.py roll_loot(); anything rolled here is tagged
 * rolledBy: "client-fallback" so drift is visible in the HUD/log.
 *
 * Luck formula (IDENTICAL in _pick_rarity() on the Python side — change both
 * together): every non-common tier's weight is multiplied by (1 + luck/100),
 * then a weighted pick runs over the new total. Because the boost also grows
 * the total weight, the effect on final probability is deliberately
 * sub-linear: e.g. epic goes 4.00% at luck 0 -> 5.71% at luck 100, not 8%.
 * Measured and matched against the Python service in the 2026-07-08 session.
 */
/**
 * @param forcedRarity Skips the weighted rarity pick entirely (used by the
 * SYS-012 shop's Mystery Weapon Box, which promises a guaranteed rare/epic —
 * a client-only override, clearly distinct from the Python-authoritative
 * roll path per ADR-001/ADR-003).
 */
export function fallbackRoll(seedNum: number, luckPct = 0, enemyLevel = 1, forcedRarity?: Rarity): LootDrop {
  let s = seedNum >>> 0;
  const rnd = () => {
    // xorshift32 — deterministic, matches nothing fancy, just stable
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };

  let rarity: Rarity;
  if (forcedRarity) {
    rarity = forcedRarity;
  } else {
    const rarities = Object.entries(RARITIES) as [Rarity, (typeof RARITIES)[Rarity]][];
    const totalWeight = rarities.reduce(
      (sum, [r, def]) => sum + def.weight * (r === "common" ? 1 : 1 + luckPct / 100),
      0,
    );
    let pickPoint = rnd() * totalWeight;
    rarity = "common";
    for (const [r, def] of rarities) {
      pickPoint -= def.weight * (r === "common" ? 1 : 1 + luckPct / 100);
      if (pickPoint <= 0) {
        rarity = r;
        break;
      }
    }
  }
  const rdef = RARITIES[rarity];

  if (rnd() < 0.35) {
    const ids = Object.keys(UPGRADE_DEFS) as UpgradeId[];
    const upgradeId = ids[Math.floor(rnd() * ids.length)];
    const def = UPGRADE_DEFS[upgradeId];
    return {
      itemType: "upgrade",
      upgradeId,
      rarity,
      name: def.name,
      value: Math.max(1, Math.round(def.baseValue * rdef.statMult * (1 + (rnd() * 2 - 1) * rdef.rollSpread))),
      rolledBy: "client-fallback",
    };
  }

  const base = BASE_WEAPONS[Math.floor(rnd() * BASE_WEAPONS.length)];
  const prefix = PREFIXES[Math.floor(rnd() * PREFIXES.length)];
  const roll = 1 + (rnd() * 2 - 1) * rdef.rollSpread;
  // Same enemy-level damage scaling as the Python service (level_mult) —
  // without this, fallback drops were noticeably weaker in late-game rooms.
  const levelMult = 1 + 0.08 * Math.max(0, enemyLevel - 1);
  return {
    itemType: "weapon",
    baseId: base.id,
    prefixId: prefix.id,
    rarity,
    name: `${prefix.name ? prefix.name + " " : ""}${base.name}`,
    damage: base.damage * prefix.damageMult * rdef.statMult * roll * levelMult,
    speed: base.speed * prefix.speedMult,
    range: base.range,
    projectileSpeed: base.projectileSpeed,
    kind: base.kind,
    effect: prefix.effect,
    sound: base.sound,
    rolledBy: "client-fallback",
  };
}

export const STARTING_WEAPON: WeaponInstance = {
  itemType: "weapon",
  baseId: "sword",
  prefixId: "rusty",
  rarity: "common",
  name: "Rusty Sword",
  damage: 8,
  speed: 2.0,
  range: 26,
  kind: "melee",
  sound: "sword",
  rolledBy: "client-fallback",
};
