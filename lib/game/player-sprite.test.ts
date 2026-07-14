import { describe, expect, it } from "vitest";
import {
  HERO_NATIVE_FACING,
  NON_LOOPING_HERO_ANIMS,
  resolveClipFrame,
  selectPlayerAnim,
  shouldFlipHeroSprite,
} from "./player-sprite";

describe("shouldFlipHeroSprite", () => {
  it("does not flip when facing matches the sheet's native (right) facing", () => {
    expect(shouldFlipHeroSprite(HERO_NATIVE_FACING)).toBe(false);
  });

  it("flips exactly when facing is the opposite of native", () => {
    expect(shouldFlipHeroSprite(-1)).toBe(true);
  });
});

describe("selectPlayerAnim", () => {
  it("selects run when grounded and moving right past epsilon", () => {
    expect(selectPlayerAnim({ grounded: true, vx: 50, vy: 0 })).toBe("run");
  });

  it("selects run when grounded and moving left past epsilon", () => {
    expect(selectPlayerAnim({ grounded: true, vx: -50, vy: 0 })).toBe("run");
  });

  it("selects idle when grounded and |vx| is at or below epsilon", () => {
    expect(selectPlayerAnim({ grounded: true, vx: 0, vy: 0 })).toBe("idle");
    expect(selectPlayerAnim({ grounded: true, vx: 10, vy: 0 })).toBe("idle");
  });

  it("selects jump when airborne and ascending (negative vy)", () => {
    expect(selectPlayerAnim({ grounded: false, vx: 0, vy: -200 })).toBe("jump");
  });

  it("selects fall when airborne and descending (non-negative vy)", () => {
    expect(selectPlayerAnim({ grounded: false, vx: 0, vy: 5 })).toBe("fall");
    expect(selectPlayerAnim({ grounded: false, vx: 0, vy: 0 })).toBe("fall");
  });

  it("prioritizes airborne state over horizontal speed", () => {
    expect(selectPlayerAnim({ grounded: false, vx: 200, vy: -50 })).toBe("jump");
  });
});

describe("resolveClipFrame", () => {
  it("wraps looping clips via modulo", () => {
    // 6-frame clip at 9fps: frame indices should cycle 0..5 and repeat.
    expect(resolveClipFrame(6, 0, 9, true)).toBe(0);
    expect(resolveClipFrame(6, 5 / 9, 9, true)).toBe(5);
    expect(resolveClipFrame(6, 6 / 9, 9, true)).toBe(0); // wraps back
  });

  it("clamps non-looping clips on the final frame instead of wrapping", () => {
    expect(resolveClipFrame(2, 0, 9, false)).toBe(0);
    expect(resolveClipFrame(2, 1 / 9, 9, false)).toBe(1);
    expect(resolveClipFrame(2, 100, 9, false)).toBe(1); // clamped, never wraps to 0
  });

  it("always resolves single-frame clips to frame 0 regardless of time", () => {
    expect(resolveClipFrame(1, 0, 9, true)).toBe(0);
    expect(resolveClipFrame(1, 42, 9, true)).toBe(0);
    expect(resolveClipFrame(1, 42, 9, false)).toBe(0);
  });

  it("treats death as a non-looping clip that clamps", () => {
    expect(NON_LOOPING_HERO_ANIMS.has("death")).toBe(true);
    const looping = !NON_LOOPING_HERO_ANIMS.has("death");
    expect(resolveClipFrame(2, 100, 9, looping)).toBe(1);
  });

  it("treats jump/fall as non-looping pose-holds", () => {
    expect(NON_LOOPING_HERO_ANIMS.has("jump")).toBe(true);
    expect(NON_LOOPING_HERO_ANIMS.has("fall")).toBe(true);
  });

  it("treats run/idle/attack/hurt as looping", () => {
    expect(NON_LOOPING_HERO_ANIMS.has("run")).toBe(false);
    expect(NON_LOOPING_HERO_ANIMS.has("idle")).toBe(false);
    expect(NON_LOOPING_HERO_ANIMS.has("attack")).toBe(false);
    expect(NON_LOOPING_HERO_ANIMS.has("hurt")).toBe(false);
  });
});
