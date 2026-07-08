/**
 * Unified input layer.
 *
 * BOTH keyboard and gamepad write into the same abstracted InputState object.
 * Game logic reads InputState only — it never touches KeyboardEvent or the
 * Gamepad API directly. This is deliberate: rebinding UIs or new controller
 * types only ever touch this file.
 *
 * Keyboard: addEventListener('keydown'/'keyup') tracking held keys in a Set.
 * Gamepad:  there is NO push event for button presses — the Gamepad API is
 *           poll-based, so pollGamepad() must be called once per frame from
 *           the requestAnimationFrame loop. 'gamepadconnected' only tells us
 *           a pad appeared; state still has to be read via
 *           navigator.getGamepads() each frame.
 */

export type InputAction =
  | "left"
  | "right"
  | "up"
  | "down"
  | "jump"
  | "attack"
  | "dodge"
  | "useItem"
  | "interact"
  | "pause";

export type InputState = {
  /** True while the control is held this frame. */
  held: Record<InputAction, boolean>;
  /** True only on the frame the control transitioned from up -> down. */
  pressed: Record<InputAction, boolean>;
  /** Analog horizontal axis, -1..1 (keyboard snaps to -1/0/1). */
  axisX: number;
  /** Whether a gamepad is currently connected and being polled. */
  gamepadConnected: boolean;
  gamepadId: string | null;
};

const ACTIONS: InputAction[] = [
  "left",
  "right",
  "up",
  "down",
  "jump",
  "attack",
  "dodge",
  "useItem",
  "interact",
  "pause",
];

const KEY_BINDINGS: Record<string, InputAction> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  Space: "jump",
  KeyZ: "jump",
  KeyJ: "attack",
  KeyX: "attack",
  KeyK: "dodge",
  KeyC: "dodge",
  KeyL: "useItem",
  KeyV: "useItem",
  KeyE: "interact",
  Enter: "interact",
  Escape: "pause",
  KeyP: "pause",
};

/**
 * Standard-layout Xbox mapping (https://w3c.github.io/gamepad/#remapping):
 * buttons[0]=A, [1]=B, [2]=X, [3]=Y, [12..15]=D-pad, axes[0]=left stick X.
 */
const GAMEPAD_BUTTON_BINDINGS: Record<number, InputAction> = {
  0: "jump", // A
  1: "dodge", // B
  2: "attack", // X
  3: "useItem", // Y
  9: "pause", // Menu/Start
  12: "up", // D-pad up
  13: "down", // D-pad down
  14: "left", // D-pad left
  15: "right", // D-pad right
};

const STICK_DEADZONE = 0.25;

function blankRecord(): Record<InputAction, boolean> {
  return Object.fromEntries(ACTIONS.map((a) => [a, false])) as Record<
    InputAction,
    boolean
  >;
}

export class InputManager {
  readonly state: InputState = {
    held: blankRecord(),
    pressed: blankRecord(),
    axisX: 0,
    gamepadConnected: false,
    gamepadId: null,
  };

  private keyboardHeld = blankRecord();
  private previousHeld = blankRecord();
  private gamepadIndex: number | null = null;
  private target: Window;

  private onKeyDown = (event: KeyboardEvent) => {
    const action = KEY_BINDINGS[event.code];
    if (!action) return;
    // Keep the page from scrolling on arrows/space while playing.
    event.preventDefault();
    this.keyboardHeld[action] = true;
  };

  private onKeyUp = (event: KeyboardEvent) => {
    const action = KEY_BINDINGS[event.code];
    if (!action) return;
    this.keyboardHeld[action] = false;
  };

  private onBlur = () => {
    // If the window loses focus while keys are held, their keyup events are
    // lost (alt-tab, clicking outside) and the key would stay "held" forever —
    // the exact stuck-input bug found in the deleted lib/inputHandler.ts.
    // Releasing everything on blur is the standard fix.
    for (const action of ACTIONS) this.keyboardHeld[action] = false;
  };

  private onGamepadConnected = (event: GamepadEvent) => {
    // Informational only — actual state is read by polling every frame.
    this.gamepadIndex = event.gamepad.index;
    this.state.gamepadConnected = true;
    this.state.gamepadId = event.gamepad.id;
    console.info(
      `[input] Gamepad connected (index ${event.gamepad.index}): ${event.gamepad.id} — mapping: ${event.gamepad.mapping || "non-standard"}`,
    );
  };

  private onGamepadDisconnected = (event: GamepadEvent) => {
    if (this.gamepadIndex === event.gamepad.index) {
      this.gamepadIndex = null;
      this.state.gamepadConnected = false;
      this.state.gamepadId = null;
      console.info(`[input] Gamepad disconnected: ${event.gamepad.id}`);
    }
  };

  constructor(target: Window) {
    this.target = target;
    target.addEventListener("keydown", this.onKeyDown);
    target.addEventListener("keyup", this.onKeyUp);
    target.addEventListener("blur", this.onBlur);
    target.addEventListener("gamepadconnected", this.onGamepadConnected);
    target.addEventListener("gamepaddisconnected", this.onGamepadDisconnected);
  }

  /**
   * Must be called exactly once per frame, from the rAF game loop, BEFORE
   * game logic reads the state. Merges keyboard + polled gamepad and computes
   * pressed (edge) flags.
   */
  update() {
    const merged = { ...this.keyboardHeld };
    let axisX = 0;

    const pad = this.pollGamepad();
    if (pad) {
      for (const [indexStr, action] of Object.entries(GAMEPAD_BUTTON_BINDINGS)) {
        const button = pad.buttons[Number(indexStr)];
        if (button?.pressed) merged[action] = true;
      }
      const stickX = pad.axes[0] ?? 0;
      if (Math.abs(stickX) > STICK_DEADZONE) {
        axisX = stickX;
        if (stickX < 0) merged.left = true;
        if (stickX > 0) merged.right = true;
      }
      // Left stick vertical for up/down (menus, ladders).
      const stickY = pad.axes[1] ?? 0;
      if (stickY < -STICK_DEADZONE) merged.up = true;
      if (stickY > STICK_DEADZONE) merged.down = true;
    }

    if (merged.left && !merged.right) axisX = Math.min(axisX || -1, -Math.abs(axisX) || -1);
    if (merged.right && !merged.left) axisX = Math.max(axisX || 1, Math.abs(axisX) || 1);
    if (!merged.left && !merged.right) axisX = 0;

    for (const action of ACTIONS) {
      this.state.pressed[action] = merged[action] && !this.previousHeld[action];
      this.state.held[action] = merged[action];
      this.previousHeld[action] = merged[action];
    }
    this.state.axisX = axisX;
  }

  /** Poll-based read — required because gamepads have no per-button events. */
  private pollGamepad(): Gamepad | null {
    if (typeof navigator === "undefined" || !navigator.getGamepads) return null;
    const pads = navigator.getGamepads();
    // Prefer the pad we saw connect; otherwise take the first live one so
    // pads connected before page load (no event fired) still work.
    if (this.gamepadIndex !== null) {
      const pad = pads[this.gamepadIndex];
      // Some browsers keep the array slot with connected=false after unplug;
      // reading buttons from that snapshot would freeze the last-held state
      // into the game (stuck input). Treat it as gone and fall through.
      if (pad && pad.connected) return pad;
      this.gamepadIndex = null;
      this.state.gamepadConnected = false;
      this.state.gamepadId = null;
    }
    for (const pad of pads) {
      if (pad && pad.connected) {
        if (this.gamepadIndex === null) {
          console.info(
            `[input] Gamepad detected via poll (index ${pad.index}): ${pad.id}`,
          );
        }
        this.gamepadIndex = pad.index;
        this.state.gamepadConnected = true;
        this.state.gamepadId = pad.id;
        return pad;
      }
    }
    return null;
  }

  destroy() {
    this.target.removeEventListener("keydown", this.onKeyDown);
    this.target.removeEventListener("keyup", this.onKeyUp);
    this.target.removeEventListener("blur", this.onBlur);
    this.target.removeEventListener("gamepadconnected", this.onGamepadConnected);
    this.target.removeEventListener("gamepaddisconnected", this.onGamepadDisconnected);
  }
}
