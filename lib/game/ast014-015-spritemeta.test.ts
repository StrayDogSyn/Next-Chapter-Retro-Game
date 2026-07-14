import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// Mirrors hero-spritemeta.test.ts's pattern (ADR-020) for the AST-014
// (lootIcon) and AST-015 (impactBurst_<rarity>) sheets added this pass.
function pngDimensions(path: string): { width: number; height: number } {
  const buf = readFileSync(path);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const SPRITES_DIR = join(__dirname, "..", "..", "public", "sprites");
const meta = JSON.parse(readFileSync(join(SPRITES_DIR, "spritemeta.json"), "utf-8"));

const RARITIES = ["common", "uncommon", "rare", "epic"] as const;
const BURST_SHEET_NAMES = RARITIES.map((r) => `impactBurst_${r}`);
const ALL_SHEET_NAMES = ["lootIcon", ...BURST_SHEET_NAMES];

describe("AST-014/015 spritemeta clip validity", () => {
  it("every new sheet is registered in spritemeta.json", () => {
    for (const name of ALL_SHEET_NAMES) {
      expect(meta[name], `missing spritemeta entry for ${name}`).toBeDefined();
    }
  });

  it("every new sheet's real PNG dimensions match its spritemeta cell geometry's implied bounds", () => {
    for (const name of ALL_SHEET_NAMES) {
      const dims = pngDimensions(join(SPRITES_DIR, `${name}.png`));
      const entry = meta[name];
      expect(entry.cellW, `${name} cellW`).toBeGreaterThan(0);
      expect(entry.cellH, `${name} cellH`).toBeGreaterThan(0);
      for (const [animName, animDef] of Object.entries<{ row: number; frames: number }>(entry.anims)) {
        const maxX = animDef.frames * entry.cellW;
        const maxY = (animDef.row + 1) * entry.cellH;
        expect(maxX, `${name}.${animName}: frames*cellW exceeds sheet width`).toBeLessThanOrEqual(
          dims.width,
        );
        expect(maxY, `${name}.${animName}: (row+1)*cellH exceeds sheet height`).toBeLessThanOrEqual(
          dims.height,
        );
      }
    }
  });

  it("every clip has non-degenerate frame rects (w>0, h>0) and at least 1 frame", () => {
    for (const name of ALL_SHEET_NAMES) {
      const entry = meta[name];
      for (const [animName, animDef] of Object.entries<{ row: number; frames: number }>(entry.anims)) {
        expect(entry.cellW, `${name}.${animName} cellW`).toBeGreaterThan(0);
        expect(entry.cellH, `${name}.${animName} cellH`).toBeGreaterThan(0);
        expect(animDef.frames, `${name}.${animName} frame count`).toBeGreaterThan(0);
        expect(animDef.row, `${name}.${animName} row`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("lootIcon has a 12-frame shimmer clip at 16x16", () => {
    expect(meta.lootIcon.cellW).toBe(16);
    expect(meta.lootIcon.cellH).toBe(16);
    expect(meta.lootIcon.anims.shimmer.frames).toBe(12);
  });

  it("all 4 impactBurst_<rarity> sheets have identical geometry (48x48, 7-frame burst clip)", () => {
    for (const name of BURST_SHEET_NAMES) {
      expect(meta[name].cellW, `${name} cellW`).toBe(48);
      expect(meta[name].cellH, `${name} cellH`).toBe(48);
      expect(meta[name].anims.burst.frames, `${name} burst frame count`).toBe(7);
    }
  });

  it("all 4 impactBurst_<rarity> PNGs have identical real dimensions", () => {
    const base = pngDimensions(join(SPRITES_DIR, "impactBurst_common.png"));
    for (const name of BURST_SHEET_NAMES) {
      const dims = pngDimensions(join(SPRITES_DIR, `${name}.png`));
      expect(dims, `${name}.png dimensions`).toEqual(base);
    }
  });

  it("every rarity tier maps to a distinct impactBurst sheet (no two tiers accidentally share art)", () => {
    // Not a color check (that needs pixel decoding) - just confirms the
    // pipeline produced 4 genuinely separate files, not 4 copies of one.
    const sizes = BURST_SHEET_NAMES.map(
      (name) => readFileSync(join(SPRITES_DIR, `${name}.png`)).length,
    );
    const uniqueByteLengths = new Set(sizes);
    expect(uniqueByteLengths.size, "expected 4 distinct file contents (byte length as a cheap proxy)").toBe(
      4,
    );
  });
});
