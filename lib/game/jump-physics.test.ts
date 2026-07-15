import { describe, expect, it } from "vitest";
import {
  GRAVITY,
  JUMP_BASE_VELOCITY,
  JUMP_POWER_CAP_PCT,
  jumpApexPx,
  jumpVelocity,
  maxJumps,
  resolveJumpPress,
  simulateDoubleJumpFlight,
  simulateJumpFlight,
  tickGroundedState,
  type JumpState,
} from "./jump-physics";
import {
  JUMP_GAP_TILES,
  JUMP_RISE_TILES,
  UPGRADED_JUMP_GAP_TILES,
  UPGRADED_JUMP_RISE_TILES,
} from "./levelLoader";

const TILE = 16;
const MOVE_SPEED = 150; // px/s, matches game.ts's moveSpeed() base value

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
  it("a maxed single jump (24% jumpPower) apexes below double-jump's now-buffed ~14-tile reach", () => {
    const maxedApex = jumpApexPx(jumpVelocity(JUMP_POWER_CAP_PCT));
    const doubleJumpReachPx = UPGRADED_JUMP_RISE_TILES * 16; // levelLoader.ts
    expect(maxedApex).toBeLessThan(doubleJumpReachPx);
  });

  it("base (unupgraded) jump apexes at ~7.51 tiles analytic (user feedback: 'about 1.5x higher' than the prior 380px/s round's 4.82 simulated tiles), still at/above levelLoader.ts's JUMP_RISE_TILES floor", () => {
    const baseApex = jumpApexPx(jumpVelocity(0));
    expect(baseApex / 16).toBeCloseTo(7.51, 1);
    expect(baseApex / 16).toBeGreaterThanOrEqual(JUMP_RISE_TILES);
  });

  it("gravity/base-velocity constants match the physics levelLoader.ts's reachability math assumes", () => {
    expect(GRAVITY).toBe(900);
    expect(JUMP_BASE_VELOCITY).toBe(465);
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

// Fix Pack mission, Increment 2.1: derive the jump envelope from the real
// physics constants and cross-check it against levelLoader.ts's hand-derived
// reachability tile constants via a frame-stepped simulation, per the
// mission's own instruction ("analytic and simulated must agree within a
// tile; if they don't, trust the simulation - discrete integration order
// matters"). See levelLoader.ts's BUG-003 comment block for the analytic
// derivation these numbers were originally hand-computed from.
describe("jump envelope: simulated (game.ts's actual integration order) vs analytic", () => {
  it("base jump: simulated apex agrees with the analytic v^2/2g formula within one tile", () => {
    const v = jumpVelocity(0); // 330 px/s, no upgrades
    const analyticApex = jumpApexPx(v); // 60.5px
    const sim = simulateJumpFlight(v);
    expect(Math.abs(sim.apexPx - analyticApex)).toBeLessThan(TILE);
  });

  it("base jump: simulated apex is at or above levelLoader.ts's JUMP_RISE_TILES (the constant stays a safe floor, not an overclaim)", () => {
    const sim = simulateJumpFlight(jumpVelocity(0));
    expect(sim.apexPx / TILE).toBeGreaterThanOrEqual(JUMP_RISE_TILES);
  });

  it("'Space Marine' Physical Overhaul round 3: simulated base apex is ~1.5x the previous round's (4.82 -> ~7.2-7.3 tiles), per explicit user feedback", () => {
    const sim = simulateJumpFlight(jumpVelocity(0));
    const tiles = sim.apexPx / TILE;
    const PREVIOUS_ROUND_APEX_TILES = 4.82; // 380px/s round (ADR-025/026)
    expect(tiles / PREVIOUS_ROUND_APEX_TILES).toBeCloseTo(1.5, 1);
    expect(tiles).toBeGreaterThanOrEqual(7);
    expect(tiles).toBeLessThanOrEqual(7.5);
  });

  it("base jump: simulated full-flight horizontal gap is at or above levelLoader.ts's JUMP_GAP_TILES", () => {
    const sim = simulateJumpFlight(jumpVelocity(0));
    const gapTiles = (sim.airtimeS * MOVE_SPEED) / TILE;
    expect(gapTiles).toBeGreaterThanOrEqual(JUMP_GAP_TILES);
  });

  it("double jump (second impulse at first apex): simulated total rise is at or above UPGRADED_JUMP_RISE_TILES", () => {
    const sim = simulateDoubleJumpFlight(jumpVelocity(0));
    expect(sim.apexPx / TILE).toBeGreaterThanOrEqual(UPGRADED_JUMP_RISE_TILES);
  });

  it("double jump: simulated full-flight horizontal gap is at or above UPGRADED_JUMP_GAP_TILES", () => {
    const sim = simulateDoubleJumpFlight(jumpVelocity(0));
    const gapTiles = (sim.airtimeS * MOVE_SPEED) / TILE;
    expect(gapTiles).toBeGreaterThanOrEqual(UPGRADED_JUMP_GAP_TILES);
  });

  it("the envelope shrinks when the underlying constants shrink (sanity check: not a hardcoded pass)", () => {
    const weak = simulateJumpFlight(jumpVelocity(0) * 0.5);
    const normal = simulateJumpFlight(jumpVelocity(0));
    expect(weak.apexPx).toBeLessThan(normal.apexPx);
    expect(weak.airtimeS).toBeLessThan(normal.airtimeS);
  });

  it("a smaller simulation step (higher fidelity) converges toward the analytic value, confirming dt=1/60 is the source of the gap, not a bug", () => {
    const v = jumpVelocity(0);
    const analyticApex = jumpApexPx(v);
    const coarse = simulateJumpFlight(v, 1 / 60);
    const fine = simulateJumpFlight(v, 1 / 6000);
    expect(Math.abs(fine.apexPx - analyticApex)).toBeLessThan(Math.abs(coarse.apexPx - analyticApex));
  });
});
