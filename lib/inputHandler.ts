type InputAction = "left" | "right" | "jump";

const ACTION_KEYS: Record<InputAction, string[]> = {
  left: ["ArrowLeft", "KeyA"],
  right: ["ArrowRight", "KeyD"],
  jump: ["ArrowUp", "Space", "KeyW"],
};

export class InputHandler {
  private activeKeys = new Set<string>();
  private target: Window;

  private keyDownListener = (event: KeyboardEvent) => {
    this.activeKeys.add(event.code);
  };

  private keyUpListener = (event: KeyboardEvent) => {
    this.activeKeys.delete(event.code);
  };

  constructor(target: Window) {
    this.target = target;
    target.addEventListener("keydown", this.keyDownListener);
    target.addEventListener("keyup", this.keyUpListener);
  }

  isPressed(action: InputAction) {
    return ACTION_KEYS[action].some((keyCode) => this.activeKeys.has(keyCode));
  }

  destroy() {
    this.target.removeEventListener("keydown", this.keyDownListener);
    this.target.removeEventListener("keyup", this.keyUpListener);
  }
}
