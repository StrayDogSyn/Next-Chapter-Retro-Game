export type InputAction = "left" | "right" | "jump" | "attack" | "dodge" | "item";

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  attack: boolean;
  dodge: boolean;
  item: boolean;
}

const ACTION_KEYS: Record<InputAction, string[]> = {
  left: ["ArrowLeft", "KeyA"],
  right: ["ArrowRight", "KeyD"],
  jump: ["ArrowUp", "Space", "KeyW"],
  attack: ["KeyX", "Slash"],
  dodge: ["KeyC", "KeyB"],
  item: ["KeyE", "KeyY"],
};

// Xbox gamepad button mapping (standard layout)
const GAMEPAD_BUTTON_MAP = {
  A: 0,      // jump
  B: 1,      // dodge
  X: 2,      // attack
  Y: 3,      // item
  LB: 4,
  RB: 5,
  Back: 8,
  Start: 9,
  LeftStick: 10,
  RightStick: 11,
};

const GAMEPAD_AXES = {
  LeftStickX: 0,
  LeftStickY: 1,
  RightStickX: 2,
  RightStickY: 3,
  LT: 4,
  RT: 5,
};

export class InputHandler {
  private activeKeys = new Set<string>();
  private inputState: InputState = {
    left: false,
    right: false,
    jump: false,
    attack: false,
    dodge: false,
    item: false,
  };
  private target: Window;
  private gamepadDeadzoneThreshold = 0.5;

  private keyDownListener = (event: KeyboardEvent) => {
    this.activeKeys.add(event.code);
    this.updateInputState();
  };

  private keyUpListener = (event: KeyboardEvent) => {
    this.activeKeys.delete(event.code);
    this.updateInputState();
  };

  constructor(target: Window) {
    this.target = target;
    target.addEventListener("keydown", this.keyDownListener);
    target.addEventListener("keyup", this.keyUpListener);
  }

  /**
   * Poll gamepad state and update input state.
   * Must be called during the render loop (requestAnimationFrame).
   */
  updateGamepadState() {
    const gamepads = navigator.getGamepads();
    
    for (let i = 0; i < gamepads.length; i++) {
      const gamepad = gamepads[i];
      
      if (!gamepad) continue;
      
      // Left stick / D-pad for movement
      const leftStickX = gamepad.axes[GAMEPAD_AXES.LeftStickX];
      if (leftStickX < -this.gamepadDeadzoneThreshold) {
        this.inputState.left = true;
      } else if (leftStickX > this.gamepadDeadzoneThreshold) {
        this.inputState.right = true;
      }
      
      // D-pad (buttons 12-15 for up/down/left/right)
      if (gamepad.buttons[14]?.pressed) { // D-pad left
        this.inputState.left = true;
      }
      if (gamepad.buttons[15]?.pressed) { // D-pad right
        this.inputState.right = true;
      }
      
      // Button mapping
      if (gamepad.buttons[GAMEPAD_BUTTON_MAP.A]?.pressed) {
        this.inputState.jump = true;
      }
      if (gamepad.buttons[GAMEPAD_BUTTON_MAP.X]?.pressed) {
        this.inputState.attack = true;
      }
      if (gamepad.buttons[GAMEPAD_BUTTON_MAP.B]?.pressed) {
        this.inputState.dodge = true;
      }
      if (gamepad.buttons[GAMEPAD_BUTTON_MAP.Y]?.pressed) {
        this.inputState.item = true;
      }
      
      // Only process the first gamepad found
      break;
    }
  }

  private updateInputState() {
    this.inputState.left = ACTION_KEYS.left.some((keyCode) => this.activeKeys.has(keyCode));
    this.inputState.right = ACTION_KEYS.right.some((keyCode) => this.activeKeys.has(keyCode));
    this.inputState.jump = ACTION_KEYS.jump.some((keyCode) => this.activeKeys.has(keyCode));
    this.inputState.attack = ACTION_KEYS.attack.some((keyCode) => this.activeKeys.has(keyCode));
    this.inputState.dodge = ACTION_KEYS.dodge.some((keyCode) => this.activeKeys.has(keyCode));
    this.inputState.item = ACTION_KEYS.item.some((keyCode) => this.activeKeys.has(keyCode));
  }

  /**
   * Check if a specific action is currently pressed.
   * This interface is for backwards compatibility with keyboard-only code.
   */
  isPressed(action: InputAction) {
    return this.inputState[action];
  }

  /**
   * Get the full input state object for direct access.
   */
  getState(): InputState {
    return this.inputState;
  }

  destroy() {
    this.target.removeEventListener("keydown", this.keyDownListener);
    this.target.removeEventListener("keyup", this.keyUpListener);
  }
}
