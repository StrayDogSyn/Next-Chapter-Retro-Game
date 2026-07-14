// Pure, canvas-free logic for the swm hero sprite (ADR-020). Extracted so
// facing/anim/frame selection is unit-testable without a canvas-backed Game,
// mirroring the jump-physics.ts / save-data.ts pattern from earlier ADRs.

/** The sheet's own art faces right at rest (see ADR-020's grid derivation). */
export const HERO_NATIVE_FACING: 1 | -1 = 1;

/** Canvas transform is applied at most once per draw call by the caller;
 * this only decides whether that single flip should happen. */
export function shouldFlipHeroSprite(facing: 1 | -1): boolean {
  return facing !== HERO_NATIVE_FACING;
}

export type PlayerAnimName = "idle" | "run" | "jump" | "fall";

export interface PlayerAnimState {
  grounded: boolean;
  vx: number;
  vy: number;
}

/** Matches the existing `moving = Math.abs(this.pvx) > 10` threshold already
 * used elsewhere in game.ts for the run/idle walk-cycle switch. */
const RUN_EPSILON = 10;

/** Run clip active iff grounded and |vx| > epsilon; otherwise jump/fall is
 * selected by vy sign while airborne (negative vy = ascending, in this
 * codebase's canvas-Y-down convention where gravity increases vy). */
export function selectPlayerAnim(state: PlayerAnimState): PlayerAnimName {
  if (!state.grounded) {
    return state.vy < 0 ? "jump" : "fall";
  }
  return Math.abs(state.vx) > RUN_EPSILON ? "run" : "idle";
}

/** Frame index within a clip. Looping clips wrap via modulo; non-looping
 * clips (jump/fall pose-holds, death) clamp on the final frame instead of
 * wrapping back to frame 0. */
export function resolveClipFrame(
  frameCount: number,
  animTime: number,
  fps: number,
  looping: boolean,
): number {
  if (frameCount <= 0) return 0;
  const raw = Math.floor(Math.max(0, animTime) * fps);
  return looping ? raw % frameCount : Math.min(raw, frameCount - 1);
}

/** Clips that hold their final frame instead of looping back to frame 0. */
export const NON_LOOPING_HERO_ANIMS: ReadonlySet<string> = new Set(["jump", "fall", "death"]);
