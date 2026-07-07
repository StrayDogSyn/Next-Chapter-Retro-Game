export type AnimationState = "idle" | "walk" | "jump";

type AnimationConfig = {
  row: number;
  frames: number[];
  frameDuration: number;
  loop: boolean;
};

const SPRITE_ANIMATIONS: Record<AnimationState, AnimationConfig> = {
  idle: { row: 0, frames: [0, 1], frameDuration: 0.35, loop: true },
  walk: { row: 1, frames: [0, 1, 2, 3], frameDuration: 0.12, loop: true },
  jump: { row: 2, frames: [0], frameDuration: 0.2, loop: false },
};

export class SpriteAnimationController {
  private state: AnimationState = "idle";
  private frameIndex = 0;
  private elapsed = 0;

  setState(nextState: AnimationState) {
    if (this.state === nextState) {
      return;
    }

    this.state = nextState;
    this.frameIndex = 0;
    this.elapsed = 0;
  }

  update(deltaTime: number) {
    const animation = SPRITE_ANIMATIONS[this.state];
    this.elapsed += deltaTime;

    if (this.elapsed < animation.frameDuration) {
      return;
    }

    this.elapsed = 0;

    if (this.frameIndex < animation.frames.length - 1) {
      this.frameIndex += 1;
      return;
    }

    if (animation.loop) {
      this.frameIndex = 0;
    }
  }

  getCurrentFrame() {
    return SPRITE_ANIMATIONS[this.state].frames[this.frameIndex];
  }

  getCurrentRow() {
    return SPRITE_ANIMATIONS[this.state].row;
  }
}
