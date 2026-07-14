import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// Reads width/height straight out of the PNG IHDR chunk (bytes 16-23) rather
// than pulling in an image-decoding dependency just for a bounds check.
function pngDimensions(path: string): { width: number; height: number } {
  const buf = readFileSync(path);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const SPRITES_DIR = join(__dirname, "..", "..", "public", "sprites");
const meta = JSON.parse(readFileSync(join(SPRITES_DIR, "spritemeta.json"), "utf-8"));

const HERO_SHEET_NAMES = ["hero", ...Array.from({ length: 8 }, (_, i) => `hero_skin_${i + 1}`)];

describe("hero spritemeta clip validity (M2 Step 4.4 test 1)", () => {
  it("every hero sheet is registered in spritemeta.json", () => {
    for (const name of HERO_SHEET_NAMES) {
      expect(meta[name], `missing spritemeta entry for ${name}`).toBeDefined();
    }
  });

  it("every hero sheet's real PNG dimensions match its spritemeta cell geometry's implied bounds", () => {
    for (const name of HERO_SHEET_NAMES) {
      const dims = pngDimensions(join(SPRITES_DIR, `${name}.png`));
      const entry = meta[name];
      expect(entry.cellW, `${name} cellW`).toBeGreaterThan(0);
      expect(entry.cellH, `${name} cellH`).toBeGreaterThan(0);
      // Every clip's frame rect must fit inside the actual PNG bounds.
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

  it("every clip on every hero sheet has non-degenerate frame rects (w>0, h>0) and at least 1 frame", () => {
    for (const name of HERO_SHEET_NAMES) {
      const entry = meta[name];
      for (const [animName, animDef] of Object.entries<{ row: number; frames: number }>(entry.anims)) {
        expect(entry.cellW, `${name}.${animName} cellW`).toBeGreaterThan(0);
        expect(entry.cellH, `${name}.${animName} cellH`).toBeGreaterThan(0);
        expect(animDef.frames, `${name}.${animName} frame count`).toBeGreaterThan(0);
        expect(animDef.row, `${name}.${animName} row`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("requires the minimum clip set (idle, run, jump, fall, attack, hurt, death) on every hero sheet", () => {
    const required = ["idle", "run", "jump", "fall", "attack", "hurt", "death"];
    for (const name of HERO_SHEET_NAMES) {
      for (const clip of required) {
        expect(meta[name].anims[clip], `${name} missing required clip "${clip}"`).toBeDefined();
      }
    }
  });

  it("all 8 skin variants share an identical clip map with the base hero sheet (geometry parity)", () => {
    const base = JSON.stringify(meta.hero.anims);
    for (let i = 1; i <= 8; i++) {
      expect(JSON.stringify(meta[`hero_skin_${i}`].anims), `hero_skin_${i} anim map diverges from base`).toBe(
        base,
      );
      expect(meta[`hero_skin_${i}`].cellW).toBe(meta.hero.cellW);
      expect(meta[`hero_skin_${i}`].cellH).toBe(meta.hero.cellH);
    }
  });

  it("all 8 skin variant PNGs have identical real dimensions to the base hero PNG", () => {
    const base = pngDimensions(join(SPRITES_DIR, "hero.png"));
    for (let i = 1; i <= 8; i++) {
      const dims = pngDimensions(join(SPRITES_DIR, `hero_skin_${i}.png`));
      expect(dims, `hero_skin_${i}.png dimensions`).toEqual(base);
    }
  });
});
