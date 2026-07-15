/**
 * Pure save-payload construction (ADR-010), extracted out of Game.saveGame()
 * so the clamping/shape logic is testable without a running Game instance.
 * This is the exact shape mirrored server-side as run_state.save_data
 * (ADR-009) - keep client and any future server-side validation in sync.
 */
import type { UpgradeId, WeaponInstance } from "./items";

export type GameFlags = {
  hasKey: boolean;
  wyrmSlain: boolean;
  mechSlain: boolean;
  beastSlain: boolean;
};

export type SaveDataV1 = {
  version: 1;
  roomId: string;
  px: number;
  py: number;
  hp: number;
  coins: number;
  /** Crafting-material currency (distinct from coins), earned by scrapping. */
  materials: number;
  level: number;
  xp: number;
  xpToNext: number;
  weapon: WeaponInstance;
  secondary: WeaponInstance | null;
  /** Inventory overflow storage - see Game.BAG_CAPACITY for the cap. Absent
   *  entirely on saves written before this field existed; loaders must
   *  default to []. */
  bag: WeaponInstance[];
  upgrades: Partial<Record<UpgradeId, number>>;
  flags: GameFlags;
  visitedRooms: string[];
  shopAtkBonus: number;
};

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function cloneWeapon(weapon: WeaponInstance): WeaponInstance {
  return { ...weapon };
}

export type BuildSaveDataInput = {
  roomId: string;
  px: number;
  py: number;
  viewW: number;
  viewH: number;
  playerW: number;
  playerH: number;
  maxHp: number;
  hp: number;
  coins: number;
  materials: number;
  level: number;
  xp: number;
  xpToNext: number;
  weapon: WeaponInstance;
  secondary: WeaponInstance | null;
  bag: WeaponInstance[];
  upgrades: Partial<Record<UpgradeId, number>>;
  isUpgradeId: (id: string) => id is UpgradeId;
  flags: GameFlags;
  visitedRooms: string[];
  shopAtkBonus: number;
};

const BAG_CAPACITY = 16;

export function buildSaveData(input: BuildSaveDataInput): SaveDataV1 {
  const clampedHp = Math.round(clampNumber(input.hp, 0, input.maxHp, input.maxHp));
  const clampedCoins = Math.round(clampNumber(input.coins, 0, 999_999, 0));
  const clampedMaterials = Math.round(clampNumber(input.materials, 0, 999_999, 0));
  const clampedLevel = Math.round(clampNumber(input.level, 1, 999, 1));
  const clampedXpToNext = Math.round(clampNumber(input.xpToNext, 1, 1_000_000, 150));
  const clampedXp = Math.round(clampNumber(input.xp, 0, clampedXpToNext, 0));

  return {
    version: 1,
    roomId: input.roomId,
    px: clampNumber(input.px, 0, input.viewW - input.playerW, 0),
    py: clampNumber(input.py, 0, input.viewH - input.playerH, 0),
    hp: clampedHp,
    coins: clampedCoins,
    materials: clampedMaterials,
    level: clampedLevel,
    xp: clampedXp,
    xpToNext: clampedXpToNext,
    weapon: cloneWeapon(input.weapon),
    secondary: input.secondary ? cloneWeapon(input.secondary) : null,
    bag: input.bag.slice(0, BAG_CAPACITY).map(cloneWeapon),
    upgrades: Object.fromEntries(
      Object.entries(input.upgrades)
        .filter(([id]) => input.isUpgradeId(id))
        .map(([id, value]) => [id, Math.round(clampNumber(value, 0, 999, 0))]),
    ) as Partial<Record<UpgradeId, number>>,
    flags: { ...input.flags },
    visitedRooms: [...input.visitedRooms],
    shopAtkBonus: clampNumber(input.shopAtkBonus, 0, 999, 0),
  };
}
