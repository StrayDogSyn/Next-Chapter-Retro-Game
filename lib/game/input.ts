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
  | "pause"
  | "respawn"
  | "help"
  | "inventory";

import type { TouchInputManager } from "./touchInput";

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
  "respawn",
  "help",
  "inventory",
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
  KeyR: "respawn",
  F1: "help",
  Slash: "help",
  Tab: "inventory",
  KeyI: "inventory",
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
  4: "useItem", // LB
  5: "attack", // RB
  6: "dodge", // LT (analog trigger)
  7: "attack", // RT (analog trigger)
  9: "pause", // Menu/Start
  12: "up", // D-pad up
  13: "down", // D-pad down
  14: "left", // D-pad left
  15: "right", // D-pad right
};

const STICK_DEADZONE = 0.25;

function applyDeadzone(value: number, deadzone: number): number {
  if (Math.abs(value) <= deadzone) return 0;
  const sign = value < 0 ? -1 : 1;
  const normalized = (Math.abs(value) - deadzone) / (1 - deadzone);
  return sign * Math.min(1, normalized);
}

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
  private windowTarget: Window;
  private documentTarget: Document;
  private touchInput: TouchInputManager | null;
  private debug = false;
  private lastDebugFrame = "";

  private onKeyDown = (event: KeyboardEvent) => {
    const action = KEY_BINDINGS[event.code];
    if (!action) return;
    // Keep the page from scrolling on arrows/space while playing.
    event.preventDefault();
    this.keyboardHeld[action] = true;
    if (this.debug) {
      const active = this.documentTarget.activeElement?.tagName ?? "none";
      console.info(
        `[input/debug] keydown code=${event.code} action=${action} hasFocus=${this.documentTarget.hasFocus()} active=${active}`,
      );
    }
  };

  private onKeyUp = (event: KeyboardEvent) => {
    const action = KEY_BINDINGS[event.code];
    if (!action) return;
    this.keyboardHeld[action] = false;
    if (this.debug) {
      console.info(`[input/debug] keyup code=${event.code} action=${action}`);
    }
  };

  private releaseAllKeys = () => {
    // If the window loses focus while keys are held, their keyup events are
    // lost (alt-tab, clicking outside) and the key would stay "held" forever —
    // the exact stuck-input bug found in the deleted lib/inputHandler.ts.
    // Releasing everything on blur is the standard fix.
    for (const action of ACTIONS) {
      this.keyboardHeld[action] = false;
      this.state.held[action] = false;
      this.state.pressed[action] = false;
      this.previousHeld[action] = false;
    }
    this.state.axisX = 0;
    if (this.debug) {
      console.info("[input/debug] released all keys due to focus loss/visibility change");
    }
  };

  private onBlur = () => {
    this.releaseAllKeys();
  };

  private onVisibilityChange = () => {
    if (this.documentTarget.visibilityState !== "visible") {
      this.releaseAllKeys();
    }
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

  constructor(target: Window, touchInput: TouchInputManager | null = null) {
    this.windowTarget = target;
    this.documentTarget = target.document;
    this.touchInput = touchInput;
    this.debug = this.documentTarget.location.search.includes("inputDebug=1");

    // Keyboard listeners on document are more reliable than window for focus
    // transitions inside the page (controls, overlays, fullscreen changes).
    this.documentTarget.addEventListener("keydown", this.onKeyDown, { capture: true });
    this.documentTarget.addEventListener("keyup", this.onKeyUp, { capture: true });
    this.documentTarget.addEventListener("visibilitychange", this.onVisibilityChange);

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

    const touchFrame = this.touchInput?.consumeGameplayFrame() ?? null;
    if (touchFrame) {
      for (const [action, held] of Object.entries(touchFrame.held) as Array<[InputAction, boolean]>) {
        if (held) merged[action] = true;
      }
      axisX = touchFrame.axisX;
    }

    const pad = this.pollGamepad();
    if (pad) {
      for (const [indexStr, action] of Object.entries(GAMEPAD_BUTTON_BINDINGS)) {
        const button = pad.buttons[Number(indexStr)];
        if (button && (button.pressed || button.value > 0.6)) merged[action] = true;
      }
      const stickX = applyDeadzone(pad.axes[0] ?? 0, STICK_DEADZONE);
      const stickY = applyDeadzone(pad.axes[1] ?? 0, STICK_DEADZONE);
      if (stickX !== 0) {
        axisX = stickX;
        if (stickX < 0) merged.left = true;
        if (stickX > 0) merged.right = true;
      }
      // Left stick vertical for up/down (menus, ladders).
      if (stickY < 0) merged.up = true;
      if (stickY > 0) merged.down = true;
    }

    if (merged.left && !merged.right) axisX = Math.min(axisX || -1, -Math.abs(axisX) || -1);
    if (merged.right && !merged.left) axisX = Math.max(axisX || 1, Math.abs(axisX) || 1);
    if (!merged.left && !merged.right) axisX = 0;

    for (const action of ACTIONS) {
      const touchPressed = touchFrame?.pressed[action] ?? false;
      this.state.pressed[action] = touchPressed || (merged[action] && !this.previousHeld[action]);
      this.state.held[action] = merged[action];
      this.previousHeld[action] = merged[action];
    }
    this.state.axisX = axisX;

    if (this.debug) {
      const debugFrame = `L${Number(this.state.held.left)} R${Number(this.state.held.right)} U${Number(this.state.held.up)} D${Number(this.state.held.down)} P${Number(this.state.held.pause)}|pL${Number(this.state.pressed.left)} pR${Number(this.state.pressed.right)} pU${Number(this.state.pressed.up)} pD${Number(this.state.pressed.down)} pP${Number(this.state.pressed.pause)}|ax=${this.state.axisX.toFixed(2)}`;
      if (debugFrame !== this.lastDebugFrame) {
        this.lastDebugFrame = debugFrame;
        console.info(`[input/debug] frame ${debugFrame}`);
      }
    }
  }

  /**
   * Clears the "just pressed" edge for every action without touching `held`.
   * update() computes `pressed` every frame regardless of whether a UI
   * overlay is open (it has to, so the close/cancel key itself still
   * registers) — so whatever was just pressed at the moment an overlay
   * closes (e.g. the attack key, if the player happened to press it right
   * as a menu closed) would otherwise fire in gameplay the instant control
   * returns to it. Callers close a modal/menu THEN call this so that stale
   * edge never leaks through. Does not touch `previousHeld`, so a still-held
   * key correctly reports pressed=false next frame (no re-trigger) while a
   * genuinely new press after the flush still registers normally.
   */
  flushPressed() {
    for (const action of ACTIONS) {
      this.state.pressed[action] = false;
    }
  }

  queuePressed(action: InputAction) {
    this.state.pressed[action] = true;
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
    this.documentTarget.removeEventListener("keydown", this.onKeyDown, { capture: true });
    this.documentTarget.removeEventListener("keyup", this.onKeyUp, { capture: true });
    this.documentTarget.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.windowTarget.removeEventListener("blur", this.onBlur);
    this.windowTarget.removeEventListener("gamepadconnected", this.onGamepadConnected);
    this.windowTarget.removeEventListener("gamepaddisconnected", this.onGamepadDisconnected);
  }
}
