import { describe, expect, it } from "vitest";
import { buildSaveData, type BuildSaveDataInput } from "./save-data";
import type { WeaponInstance } from "./items";

const WEAPON: WeaponInstance = {
  itemType: "weapon",
  baseId: "sword",
  prefixId: "plain",
  rarity: "common",
  name: "Sword",
  damage: 10,
  speed: 2,
  range: 26,
  kind: "melee",
  sound: "sword",
  rolledBy: "python-service",
};

const isUpgradeId = (id: string): id is "maxHp" => id === "maxHp";

function baseInput(overrides: Partial<BuildSaveDataInput> = {}): BuildSaveDataInput {
  return {
    roomId: "R01",
    px: 100,
    py: 50,
    viewW: 640,
    viewH: 352,
    playerW: 16,
    playerH: 24,
    maxHp: 100,
    hp: 80,
    coins: 42,
    materials: 7,
    level: 3,
    xp: 10,
    xpToNext: 150,
    weapon: WEAPON,
    secondary: null,
    bag: [],
    upgrades: {},
    isUpgradeId,
    flags: { hasKey: false, wyrmSlain: false, mechSlain: false, beastSlain: false },
    visitedRooms: ["R01"],
    shopAtkBonus: 0,
    ...overrides,
  };
}

describe("buildSaveData", () => {
  it("carries through well-formed values unchanged", () => {
    const data = buildSaveData(baseInput());
    expect(data).toMatchObject({
      version: 1,
      roomId: "R01",
      hp: 80,
      coins: 42,
      level: 3,
      xp: 10,
      xpToNext: 150,
    });
  });

  it("clamps hp to [0, maxHp]", () => {
    expect(buildSaveData(baseInput({ hp: -50 })).hp).toBe(0);
    expect(buildSaveData(baseInput({ hp: 9999, maxHp: 100 })).hp).toBe(100);
  });

  it("clamps coins to [0, 999_999]", () => {
    expect(buildSaveData(baseInput({ coins: -1 })).coins).toBe(0);
    expect(buildSaveData(baseInput({ coins: 5_000_000 })).coins).toBe(999_999);
  });

  it("clamps materials to [0, 999_999]", () => {
    expect(buildSaveData(baseInput({ materials: -1 })).materials).toBe(0);
    expect(buildSaveData(baseInput({ materials: 5_000_000 })).materials).toBe(999_999);
  });

  it("caps the bag at 16 items and clones each entry rather than aliasing", () => {
    const bag = Array.from({ length: 20 }, (_, i) => ({ ...WEAPON, name: `Sword ${i}` }));
    const data = buildSaveData(baseInput({ bag }));
    expect(data.bag).toHaveLength(16);
    expect(data.bag[0]).toEqual(bag[0]);
    expect(data.bag[0]).not.toBe(bag[0]);
  });

  it("clamps level to [1, 999] and xp to [0, xpToNext]", () => {
    expect(buildSaveData(baseInput({ level: 0 })).level).toBe(1);
    expect(buildSaveData(baseInput({ level: 5000 })).level).toBe(999);
    expect(buildSaveData(baseInput({ xp: -10, xpToNext: 150 })).xp).toBe(0);
    expect(buildSaveData(baseInput({ xp: 99999, xpToNext: 150 })).xp).toBe(150);
  });

  it("falls back to safe defaults for non-finite input", () => {
    const data = buildSaveData(baseInput({ hp: NaN, coins: Infinity, level: -Infinity }));
    expect(Number.isFinite(data.hp)).toBe(true);
    expect(Number.isFinite(data.coins)).toBe(true);
    expect(Number.isFinite(data.level)).toBe(true);
  });

  it("drops upgrade entries that fail isUpgradeId and clamps kept values", () => {
    const data = buildSaveData(
      baseInput({ upgrades: { maxHp: 5000, notReal: 3 } as unknown as BuildSaveDataInput["upgrades"] }),
    );
    expect(data.upgrades).toEqual({ maxHp: 999 });
  });

  it("copies visitedRooms rather than aliasing the input array", () => {
    const input = baseInput();
    const data = buildSaveData(input);
    expect(data.visitedRooms).toEqual(input.visitedRooms);
    expect(data.visitedRooms).not.toBe(input.visitedRooms);
  });

  it("clamps px/py into the room bounds given player size", () => {
    const data = buildSaveData(baseInput({ px: -100, py: 99999, viewW: 640, viewH: 352, playerW: 16, playerH: 24 }));
    expect(data.px).toBe(0);
    expect(data.py).toBe(352 - 24);
  });
});
