/**
 * Pure jump physics (ADR-014), extracted out of Game so the coyote-time /
 * double-jump state machine is unit-testable without a canvas-backed Game
 * instance. game.ts's update() delegates here and writes the result back
 * onto instance fields; nothing here holds state itself.
 */

import { HIGHEST_FLOATING_PLATFORM_STEP_TILES, TILE } from "./world";

export const GRAVITY = 900; // px/s^2

/**
 * Default frame step used by the simulation below; matches a 60fps loop.
 * Declared here, ahead of everything that calls simulateJumpFlight() at
 * module-init time (deriveBaseJumpVelocity() below), because that call
 * relies on this as simulateJumpFlight()'s default `dt` parameter - a
 * `const` referenced before its own declaration line has run throws
 * (temporal dead zone), even though the *function* using it is hoisted.
 * This was a real bug in an earlier version of this file: derivation ran
 * eagerly at import time, before SIM_DT (previously declared much further
 * down, next to simulateJumpFlight itself) had been initialized, crashing
 * every module that imports from here (including levelLoader.ts).
 */
export const SIM_DT = 1 / 60;

export type FlightSim = { apexPx: number; airtimeS: number };

/**
 * Frame-stepped simulation of one jump's vertical flight, reproducing the
 * EXACT integration order game.ts's update() uses (semi-implicit/symplectic
 * Euler: velocity updated by gravity first, then position by the new
 * velocity, every frame - not the continuous-time v^2/2g formula). Used to
 * cross-check the analytic apex (jumpApexPx()) and the hand-derived tile
 * constants in levelLoader.ts's reachability auditor, per the "Fix Pack"
 * mission's own instruction: "if analytic and simulated don't agree, trust
 * the simulation - discrete integration order matters."
 *
 * y is treated in the same canvas-Y-down convention as game.ts (up = more
 * negative); apexPx is returned as a positive rise distance for readability.
 * dt defaults to SIM_DT (60fps) since the mission's tolerance check assumes
 * a realistic frame step, not the continuous-time limit.
 */
export function simulateJumpFlight(launchVelocity: number, dt: number = SIM_DT): FlightSim {
  let vy = -launchVelocity; // launchVelocity is the positive upward speed; canvas convention is negative-up
  let y = 0;
  let minY = 0;
  let t = 0;
  // Landing = returning to y=0 while moving downward again (full flight,
  // not just to apex) - this is what a horizontal-gap estimate needs.
  while (true) {
    vy += GRAVITY * dt;
    y += vy * dt;
    t += dt;
    if (y < minY) minY = y;
    if (y >= 0 && vy > 0) break;
    if (t > 10) throw new Error("simulateJumpFlight: flight did not land within 10s - check inputs");
  }
  return { apexPx: -minY, airtimeS: t };
}

/**
 * Frame-stepped simulation of a double jump where the second impulse is
 * applied at the exact apex of the first (the worst case for total rise
 * levelLoader.ts's UPGRADED_JUMP_RISE_TILES comment describes: "a second
 * jump at any point in the arc roughly doubles achievable rise").
 */
export function simulateDoubleJumpFlight(launchVelocity: number, dt: number = SIM_DT): FlightSim {
  let vy = -launchVelocity;
  let y = 0;
  let minY = 0;
  let t = 0;
  let usedSecondJump = false;
  while (true) {
    vy += GRAVITY * dt;
    y += vy * dt;
    t += dt;
    if (y < minY) minY = y;
    if (!usedSecondJump && vy >= 0) {
      usedSecondJump = true;
      vy = -launchVelocity;
      continue;
    }
    if (usedSecondJump && y >= 0 && vy > 0) break;
    if (t > 10) throw new Error("simulateDoubleJumpFlight: flight did not land within 10s - check inputs");
  }
  return { apexPx: -minY, airtimeS: t };
}

// Space Marine Overhaul: rather than hand-picking a velocity number (as an
// earlier pass of this mission did - 330 -> 345 -> 355 -> 380, each one
// guessed and manually verified against the level geometry), this mission's
// own original framing asked to "dynamically calculate the required jump
// velocity to clear the existing platforms rather than guessing a
// hardcoded value." HIGHEST_FLOATING_PLATFORM_STEP_TILES (world.ts) scans
// every room's actual authored platform geometry for the tallest rise a
// player must clear between two floating-platform surfaces within jump-gap
// horizontal range, and JUMP_BASE_VELOCITY is derived by searching for the
// smallest integer velocity whose *simulated* (not analytic) apex clears
// that height plus a fixed comfort margin. If the level geometry ever
// changes, this constant recomputes itself instead of silently going stale.
export const JUMP_CLEARANCE_MARGIN_TILES = 0.75;
export const REQUIRED_BASE_JUMP_RISE_PX =
  (HIGHEST_FLOATING_PLATFORM_STEP_TILES + JUMP_CLEARANCE_MARGIN_TILES) * TILE;

function deriveBaseJumpVelocity(): number {
  for (let velocity = 1; velocity <= 2000; velocity++) {
    if (simulateJumpFlight(velocity).apexPx >= REQUIRED_BASE_JUMP_RISE_PX) return velocity;
  }
  throw new Error("Unable to derive a safe base jump velocity for current level geometry");
}

export const JUMP_BASE_VELOCITY = deriveBaseJumpVelocity(); // px/s, upward (negated by callers)
export const COYOTE_SECONDS = 0.1;

// See ADR-014 for the full derivation: this cap must keep a maxed single
// jump's apex below double-jump's reach (levelLoader.ts's
// UPGRADED_JUMP_RISE_TILES, itself derived from this same JUMP_BASE_VELOCITY
// below) - checked by a test, not just asserted here - since jumpPower is
// meant to be comfort/expression, never a progression key.
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

const BASE_FLIGHT = simulateJumpFlight(JUMP_BASE_VELOCITY);
const UPGRADED_FLIGHT = simulateDoubleJumpFlight(JUMP_BASE_VELOCITY);
export const BASE_JUMP_RISE_TILES = Math.floor(BASE_FLIGHT.apexPx / TILE);
export const BASE_JUMP_GAP_TILES = Math.floor((BASE_FLIGHT.airtimeS * 150) / TILE);
export const DOUBLE_JUMP_RISE_TILES = Math.floor(UPGRADED_FLIGHT.apexPx / TILE);
export const DOUBLE_JUMP_GAP_TILES = Math.floor((UPGRADED_FLIGHT.airtimeS * 150) / TILE) + 5;

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
