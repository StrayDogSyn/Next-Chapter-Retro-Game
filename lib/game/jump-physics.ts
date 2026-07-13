/**
 * Pure jump physics (ADR-014), extracted out of Game so the coyote-time /
 * double-jump state machine is unit-testable without a canvas-backed Game
 * instance. game.ts's update() delegates here and writes the result back
 * onto instance fields; nothing here holds state itself.
 */

export const GRAVITY = 900; // px/s^2
export const JUMP_BASE_VELOCITY = 330; // px/s, upward (negated by callers)
export const COYOTE_SECONDS = 0.1;

// See ADR-014 for the full derivation: capped so a maxed single jump (5.8
// tiles) stays well below double-jump's ~7-tile reach (levelLoader.ts's
// UPGRADED_JUMP_RISE_TILES) - jumpPower is comfort/expression, never a
// progression key.
export const JUMP_POWER_CAP_PCT = 24;

/** Upward jump speed (positive px/s; callers negate for their own sign convention). */
export function jumpVelocity(jumpPowerPct: number): number {
  const capped = Math.min(Math.max(jumpPowerPct, 0), JUMP_POWER_CAP_PCT);
  return JUMP_BASE_VELOCITY * (1 + capped / 100);
}

/** Rise-to-apex height in px for a given upward launch speed (v^2 / 2g). */
export function jumpApexPx(velocity: number): number {
  return (velocity * velocity) / (2 * GRAVITY);
}

export function maxJumps(hasDoubleJump: boolean): number {
  return hasDoubleJump ? 2 : 1;
}

export type JumpState = {
  onGround: boolean;
  coyoteT: number;
  jumpsUsed: number;
};

export type JumpResolution = {
  jumped: boolean;
  coyoteT: number;
  jumpsUsed: number;
};

/**
 * One frame's worth of grounded/coyote bookkeeping, run BEFORE checking the
 * jump button (mirrors game.ts's update() order exactly).
 */
export function tickGroundedState(state: JumpState, dt: number): Pick<JumpState, "coyoteT" | "jumpsUsed"> {
  if (state.onGround) {
    return { coyoteT: COYOTE_SECONDS, jumpsUsed: 0 };
  }
  if (state.coyoteT > 0) {
    return { coyoteT: state.coyoteT - dt, jumpsUsed: state.jumpsUsed };
  }
  return { coyoteT: state.coyoteT, jumpsUsed: state.jumpsUsed };
}

/**
 * Resolves a jump-button press against current state. A coyote-time jump
 * (pressed just after leaving a ledge) is treated as the FIRST jump
 * (jumpsUsed -> 1), not a bonus - double-jump remains available afterward
 * exactly as if the player had jumped from solid ground.
 */
export function resolveJumpPress(state: JumpState, maxJumpsAllowed: number): JumpResolution {
  const canGroundJump = state.onGround || state.coyoteT > 0;
  const canAirJump = !canGroundJump && state.jumpsUsed >= 1 && state.jumpsUsed < maxJumpsAllowed;
  if (!canGroundJump && !canAirJump) {
    return { jumped: false, coyoteT: state.coyoteT, jumpsUsed: state.jumpsUsed };
  }
  return {
    jumped: true,
    coyoteT: 0,
    jumpsUsed: canGroundJump ? 1 : state.jumpsUsed + 1,
  };
}
