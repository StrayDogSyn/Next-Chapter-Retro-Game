import { describe, expect, it } from "vitest";
import {
  GRAVITY,
  JUMP_BASE_VELOCITY,
  JUMP_POWER_CAP_PCT,
  jumpApexPx,
  jumpVelocity,
  maxJumps,
  resolveJumpPress,
  tickGroundedState,
  type JumpState,
} from "./jump-physics";

describe("jumpVelocity", () => {
  it("returns the base velocity with no jumpPower", () => {
    expect(jumpVelocity(0)).toBe(JUMP_BASE_VELOCITY);
  });

  it("scales up with jumpPower below the cap", () => {
    expect(jumpVelocity(8)).toBeCloseTo(JUMP_BASE_VELOCITY * 1.08, 5);
  });

  it("clamps at the cap even when jumpPower exceeds it", () => {
    const atCap = jumpVelocity(JUMP_POWER_CAP_PCT);
    const wayOver = jumpVelocity(9999);
    expect(wayOver).toBeCloseTo(atCap, 10);
    expect(wayOver).toBeCloseTo(JUMP_BASE_VELOCITY * 1.24, 5);
  });

  it("never goes below base velocity for negative input", () => {
    expect(jumpVelocity(-50)).toBe(JUMP_BASE_VELOCITY);
  });
});

describe("ADR-014: capped single-jump apex stays below double-jump's reach", () => {
  it("a maxed single jump (24% jumpPower) apexes below double-jump's ~7-tile reach", () => {
    const maxedApex = jumpApexPx(jumpVelocity(JUMP_POWER_CAP_PCT));
    const doubleJumpReachPx = 7 * 16; // levelLoader.ts's UPGRADED_JUMP_RISE_TILES
    expect(maxedApex).toBeLessThan(doubleJumpReachPx);
  });

  it("base (unupgraded) jump apexes at ~3.78 tiles, matching levelLoader.ts's JUMP_RISE_TILES assumption", () => {
    const baseApex = jumpApexPx(jumpVelocity(0));
    expect(baseApex / 16).toBeCloseTo(3.78, 1);
  });

  it("gravity/base-velocity constants match the physics levelLoader.ts's reachability math assumes", () => {
    expect(GRAVITY).toBe(900);
    expect(JUMP_BASE_VELOCITY).toBe(330);
  });
});

describe("maxJumps", () => {
  it("is 1 without double-jump, 2 with it", () => {
    expect(maxJumps(false)).toBe(1);
    expect(maxJumps(true)).toBe(2);
  });
});

describe("coyote-time + double-jump interaction", () => {
  const withDoubleJump = maxJumps(true);

  it("a coyote-time jump consumes the FIRST jump, leaving double-jump available", () => {
    // Player just left a ledge: not grounded, coyote window still open, no jumps used yet.
    const afterLeavingLedge: JumpState = { onGround: false, coyoteT: 0.06, jumpsUsed: 0 };
    const first = resolveJumpPress(afterLeavingLedge, withDoubleJump);
    expect(first.jumped).toBe(true);
    expect(first.jumpsUsed).toBe(1); // treated as jump #1, not a bonus

    // Immediately after, still airborne — the second (double) jump must still be available.
    const midAir: JumpState = { onGround: false, coyoteT: first.coyoteT, jumpsUsed: first.jumpsUsed };
    const second = resolveJumpPress(midAir, withDoubleJump);
    expect(second.jumped).toBe(true);
    expect(second.jumpsUsed).toBe(2);

    // A third press with no jumps left must fail.
    const outOfJumps: JumpState = { onGround: false, coyoteT: 0, jumpsUsed: second.jumpsUsed };
    const third = resolveJumpPress(outOfJumps, withDoubleJump);
    expect(third.jumped).toBe(false);
  });

  it("without double-jump, a coyote-time jump still only grants one jump total", () => {
    const afterLeavingLedge: JumpState = { onGround: false, coyoteT: 0.06, jumpsUsed: 0 };
    const first = resolveJumpPress(afterLeavingLedge, maxJumps(false));
    expect(first.jumped).toBe(true);
    const second = resolveJumpPress(
      { onGround: false, coyoteT: first.coyoteT, jumpsUsed: first.jumpsUsed },
      maxJumps(false),
    );
    expect(second.jumped).toBe(false);
  });

  it("an air-jump is rejected if no jump has been used yet (no free air-jump when knocked airborne)", () => {
    const knockedAirborne: JumpState = { onGround: false, coyoteT: 0, jumpsUsed: 0 };
    const attempt = resolveJumpPress(knockedAirborne, withDoubleJump);
    expect(attempt.jumped).toBe(false);
  });

  it("expired coyote time blocks a ground-style jump, but an air-jump still works if one jump was already used", () => {
    const expired: JumpState = { onGround: false, coyoteT: 0, jumpsUsed: 1 };
    const attempt = resolveJumpPress(expired, withDoubleJump);
    expect(attempt.jumped).toBe(true);
    expect(attempt.jumpsUsed).toBe(2);
  });

  it("tickGroundedState resets jumpsUsed and refills coyote time on landing", () => {
    const landed = tickGroundedState({ onGround: true, coyoteT: 0, jumpsUsed: 2 }, 0.016);
    expect(landed.jumpsUsed).toBe(0);
    expect(landed.coyoteT).toBeGreaterThan(0);
  });

  it("tickGroundedState counts down coyote time while airborne", () => {
    const airborne = tickGroundedState({ onGround: false, coyoteT: 0.1, jumpsUsed: 0 }, 0.03);
    expect(airborne.coyoteT).toBeCloseTo(0.07, 5);
  });
});
