/**
 * Pure jump physics (ADR-014), extracted out of Game so the coyote-time /
 * double-jump state machine is unit-testable without a canvas-backed Game
 * instance. game.ts's update() delegates here and writes the result back
 * onto instance fields; nothing here holds state itself.
 */

export const GRAVITY = 900; // px/s^2
// Space Marine Overhaul: buffed from an original 330 (through intermediate
// 345/355 steps) to 380 px/s, chosen empirically via simulateJumpFlight()
// (not guessed) to satisfy this mission's explicit requirement that the
// base (0% jumpPower) apex clear "at least 4.5 to 5 tiles": simulated base
// apex is 4.82 tiles (analytic 5.02). The capped-jumpPower apex rises to
// 7.47 simulated tiles - a 0.53-tile margin below double-jump's ~9-tile
// reach (levelLoader.ts's UPGRADED_JUMP_RISE_TILES), preserving the
// ADR-014 invariant this constant exists to protect (checked by a test).
//
// A "dynamically derive this from the real level geometry" version was
// tried and reverted (see ADR-025 / SESSION_LOG): it computed a
// `HIGHEST_FLOATING_PLATFORM_STEP_TILES` from world.ts by finding, for each
// floating platform, the nearest OTHER support surface within 7 columns and
// taking the world-wide max of those per-platform minimums. In room R22, a
// platform's only "nearby" support within that column window turned out to
// be the room's own main floor 13 rows down - the algorithm doesn't know
// that room has an "up" exit the player likely enters from near that
// platform, or that multi-hop/double-jump paths exist. It derived a
// 13-tile jump requirement, which would have trivialized nearly every
// double-jump-gated platform in the game. The existing, more sophisticated
// `floodReachable()`/`validateReachability()` system in levelLoader.ts
// already solves this correctly (real BFS from real room entry points,
// under both movement profiles) - a naive nearest-surface heuristic isn't
// a safe substitute for it, so this stays a hand-verified constant,
// cross-checked against simulation, same as before.
export const JUMP_BASE_VELOCITY = 380; // px/s, upward (negated by callers)
export const COYOTE_SECONDS = 0.1;

// See ADR-014 for the full derivation: capped so a maxed single jump (7.71
// analytic / 7.47 simulated tiles) stays below double-jump's ~9-tile reach
// (levelLoader.ts's UPGRADED_JUMP_RISE_TILES) - jumpPower is
// comfort/expression, never a progression key.
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

/** Default frame step used by the simulation below; matches a 60fps loop. */
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
