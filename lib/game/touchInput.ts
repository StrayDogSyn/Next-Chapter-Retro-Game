import type { InputAction } from "./input";

export type TouchControlScheme = "virtualGamepad";

export type TouchActionButtonId = "jump" | "attack" | "dodge" | "interact" | "useItem" | "pause";

export type TouchHotbarSlot = {
  id: string;
  label: string;
  action: InputAction;
};

export type TouchGameplayFrame = {
  axisX: number;
  held: Partial<Record<InputAction, boolean>>;
  pressed: Partial<Record<InputAction, boolean>>;
};

export type TacticalTouchFrame = {
  tap: { x: number; y: number } | null;
  panDelta: { x: number; y: number } | null;
  zoomDelta: number;
  quickSlotAction: InputAction | null;
};

export type TouchRenderButton = {
  id: TouchActionButtonId;
  label: string;
  x: number;
  y: number;
  radius: number;
  pressed: boolean;
};

export type TouchRenderState = {
  scheme: TouchControlScheme;
  active: boolean;
  visible: boolean;
  ghosted: boolean;
  joystick: {
    baseX: number;
    baseY: number;
    knobX: number;
    knobY: number;
    radius: number;
    engaged: boolean;
  };
  buttons: TouchRenderButton[];
  hotbar: [];
};

type LayoutButton = {
  id: TouchActionButtonId;
  label: string;
  action: InputAction;
  x: number;
  y: number;
  radius: number;
};

type TouchLayout = {
  width: number;
  height: number;
  joystickCenterX: number;
  joystickCenterY: number;
  joystickRadius: number;
  buttonRadius: number;
  buttonHitRadius: number;
  buttons: LayoutButton[];
};

type TrackedTouch =
  | {
      role: "joystick";
      startX: number;
      startY: number;
      currentX: number;
      currentY: number;
    }
  | {
      role: "button";
      buttonId: TouchActionButtonId;
      startX: number;
      startY: number;
      currentX: number;
      currentY: number;
    };

type PointerLike = {
  pointerId: number;
  clientX: number;
  clientY: number;
};

type TouchBindingTarget = {
  addEventListener: (type: string, listener: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean) => void;
  removeEventListener: (type: string, listener: EventListenerOrEventListenerObject, options?: EventListenerOptions | boolean) => void;
};

type ViewportRect = { left: number; top: number; width: number; height: number };

type TouchInputManagerOptions = {
  scheme?: TouchControlScheme;
  onRenderStateChange?: (state: TouchRenderState) => void;
};

const DEFAULT_HOTBAR: TouchHotbarSlot[] = [
  { id: "atk", label: "ATK", action: "attack" },
  { id: "dsh", label: "DSH", action: "dodge" },
  { id: "use", label: "USE", action: "useItem" },
  { id: "int", label: "INT", action: "interact" },
  { id: "pau", label: "PAU", action: "pause" },
];

const BUTTON_LABELS: Record<TouchActionButtonId, string> = {
  jump: "J",
  attack: "A",
  dodge: "D",
  interact: "I",
  useItem: "S",
  pause: "P",
};

const BUTTON_ACTIONS: Record<TouchActionButtonId, InputAction> = {
  jump: "jump",
  attack: "attack",
  dodge: "dodge",
  interact: "interact",
  useItem: "useItem",
  pause: "pause",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function distance(x1: number, y1: number, x2: number, y2: number) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function blankHeld(): Partial<Record<InputAction, boolean>> {
  return {};
}

export class TouchInputManager {
  private scheme: TouchControlScheme;
  private onRenderStateChange: ((state: TouchRenderState) => void) | null;
  private target: TouchBindingTarget | null = null;
  private enabled = true;
  private viewportRect: ViewportRect = { left: 0, top: 0, width: 1, height: 1 };
  private touches = new Map<number, TrackedTouch>();
  private held = blankHeld();
  private pressed = blankHeld();
  private axisX = 0;
  private axisY = 0;
  private visible = true;
  private renderState: TouchRenderState = {
    scheme: "virtualGamepad",
    active: false,
    visible: true,
    ghosted: false,
    joystick: { baseX: 0, baseY: 0, knobX: 0, knobY: 0, radius: 64, engaged: false },
    buttons: [],
    hotbar: [],
  };

  private readonly boundPointerDown = (event: Event) => this.handlePointerDown(event as PointerEvent);
  private readonly boundPointerMove = (event: Event) => this.handlePointerMove(event as PointerEvent);
  private readonly boundPointerUp = (event: Event) => this.handlePointerUp(event as PointerEvent);
  private readonly boundPointerCancel = (event: Event) => this.handlePointerCancel(event as PointerEvent);
  private readonly boundLostPointerCapture = (event: Event) => this.handlePointerCancel(event as PointerEvent);

  constructor(options: TouchInputManagerOptions = {}) {
    this.scheme = options.scheme ?? "virtualGamepad";
    this.onRenderStateChange = options.onRenderStateChange ?? null;
    this.syncRenderState();
  }

  bind(target: TouchBindingTarget) {
    if (this.target === target) return;
    this.unbind();
    this.target = target;
    target.addEventListener("pointerdown", this.boundPointerDown);
    target.addEventListener("pointermove", this.boundPointerMove);
    target.addEventListener("pointerup", this.boundPointerUp);
    target.addEventListener("pointercancel", this.boundPointerCancel);
    target.addEventListener("lostpointercapture", this.boundLostPointerCapture);
  }

  unbind() {
    if (!this.target) return;
    this.target.removeEventListener("pointerdown", this.boundPointerDown);
    this.target.removeEventListener("pointermove", this.boundPointerMove);
    this.target.removeEventListener("pointerup", this.boundPointerUp);
    this.target.removeEventListener("pointercancel", this.boundPointerCancel);
    this.target.removeEventListener("lostpointercapture", this.boundLostPointerCapture);
    this.target = null;
  }

  destroy() {
    this.unbind();
    this.resetAllState();
  }

  setViewportRect(rect: ViewportRect) {
    this.viewportRect = {
      left: rect.left,
      top: rect.top,
      width: Math.max(1, rect.width),
      height: Math.max(1, rect.height),
    };
    this.syncRenderState();
  }

  setScheme(scheme: TouchControlScheme) {
    if (this.scheme === scheme) return;
    this.scheme = scheme;
    this.resetAllState();
    this.syncRenderState();
  }

  setVisible(visible: boolean, ghosted: boolean) {
    if (this.visible === visible && this.renderState.ghosted === ghosted) return;
    this.visible = visible;
    this.renderState.ghosted = ghosted;
    this.syncRenderState();
  }

  setEnabled(enabled: boolean) {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (!enabled) this.resetAllState();
    this.syncRenderState();
  }

  getScheme() {
    return this.scheme;
  }

  getRenderState() {
    return this.renderState;
  }

  isTouchActive() {
    return this.touches.size > 0;
  }

  consumeGameplayFrame(): TouchGameplayFrame {
    const frame = {
      axisX: this.axisX,
      held: { ...this.held },
      pressed: { ...this.pressed },
    };
    this.pressed = blankHeld();
    return frame;
  }

  consumeTacticalFrame(): TacticalTouchFrame {
    // Tactical mode is deprecated; keep this method for compatibility with Game.
    return {
      tap: null,
      panDelta: null,
      zoomDelta: 1,
      quickSlotAction: null,
    };
  }

  private handlePointerDown(event: PointerEvent) {
    if (!this.enabled) return;
    if (event.pointerType !== "touch") return;
    const layout = this.layout();
    const point = this.toLocalPoint(event);
    const button = this.hitButton(point.x, point.y, layout);
    if (button) {
      this.touches.set(event.pointerId, {
        role: "button",
        buttonId: button.id,
        startX: point.x,
        startY: point.y,
        currentX: point.x,
        currentY: point.y,
      });
      this.setButtonState(button.id, true, true);
      event.preventDefault();
      this.capturePointer(event);
      this.syncDerivedState();
      return;
    }

    if (point.x <= layout.width * 0.58) {
      this.touches.set(event.pointerId, {
        role: "joystick",
        startX: point.x,
        startY: point.y,
        currentX: point.x,
        currentY: point.y,
      });
      this.updateJoystick(point.x, point.y, layout);
      event.preventDefault();
      this.capturePointer(event);
      this.syncDerivedState();
      return;
    }

    // Ignore touches outside controls so gameplay taps don't hijack pointers.
  }

  private handlePointerMove(event: PointerEvent) {
    if (!this.enabled) return;
    if (event.pointerType !== "touch") return;
    const layout = this.layout();
    const tracked = this.touches.get(event.pointerId);
    if (!tracked) return;
    const point = this.toLocalPoint(event);
    tracked.currentX = point.x;
    tracked.currentY = point.y;

    if (tracked.role === "joystick") {
      this.updateJoystick(point.x, point.y, layout);
      event.preventDefault();
      this.syncDerivedState();
      return;
    }

    if (tracked.role === "button") {
      const button = layout.buttons.find((entry) => entry.id === tracked.buttonId);
      if (!button) return;
      const inside = distance(point.x, point.y, button.x, button.y) <= layout.buttonHitRadius;
      this.setButtonState(tracked.buttonId, inside, false);
      event.preventDefault();
    }

    this.syncDerivedState();
  }

  private handlePointerUp(event: PointerEvent) {
    if (!this.enabled) return;
    if (event.pointerType !== "touch") return;
    this.releasePointer(event.pointerId);
    event.preventDefault();
    this.syncDerivedState();
  }

  private handlePointerCancel(event: PointerEvent) {
    if (!this.enabled) return;
    if (event.pointerType !== "touch") return;
    this.releasePointer(event.pointerId);
    this.syncDerivedState();
  }

  private releasePointer(pointerId: number) {
    const tracked = this.touches.get(pointerId);
    if (!tracked) return;
    if (tracked.role === "button") this.setButtonState(tracked.buttonId, false, false);
    if (tracked.role === "joystick") {
      this.axisX = 0;
      this.axisY = 0;
    }
    this.touches.delete(pointerId);
  }

  private setButtonState(buttonId: TouchActionButtonId, held: boolean, pressed: boolean) {
    const action = BUTTON_ACTIONS[buttonId];
    this.held[action] = held;
    if (pressed && held) this.pressed[action] = true;
  }

  private updateJoystick(x: number, y: number, layout: TouchLayout) {
    const dx = x - layout.joystickCenterX;
    const dy = y - layout.joystickCenterY;
    const len = Math.hypot(dx, dy);
    const clamped = len > layout.joystickRadius ? layout.joystickRadius / len : 1;
    const normalizedX = clamp((dx * clamped) / layout.joystickRadius, -1, 1);
    const normalizedY = clamp((dy * clamped) / layout.joystickRadius, -1, 1);
    this.axisX = Math.abs(normalizedX) < 0.14 ? 0 : normalizedX;
    this.axisY = Math.abs(normalizedY) < 0.18 ? 0 : normalizedY;
    this.held.left = this.axisX < -0.2;
    this.held.right = this.axisX > 0.2;
    this.held.up = this.axisY < -0.35;
    this.held.down = this.axisY > 0.35;
  }

  private syncDerivedState() {
    if (!Array.from(this.touches.values()).some((touch) => touch.role === "joystick")) {
      this.axisX = 0;
      this.axisY = 0;
      this.held.left = false;
      this.held.right = false;
      this.held.up = false;
      this.held.down = false;
    }

    for (const buttonId of Object.keys(BUTTON_ACTIONS) as TouchActionButtonId[]) {
      const hasTouch = Array.from(this.touches.values()).some(
        (touch) => touch.role === "button" && touch.buttonId === buttonId,
      );
      if (!hasTouch) this.held[BUTTON_ACTIONS[buttonId]] = false;
    }

    this.syncRenderState();
  }

  private syncRenderState() {
    const layout = this.layout();
    const knobX = layout.joystickCenterX + this.axisX * layout.joystickRadius * 0.58;
    const knobY = layout.joystickCenterY + this.axisY * layout.joystickRadius * 0.58;
    this.renderState = {
      scheme: this.scheme,
      active: this.touches.size > 0,
      visible: this.visible && this.enabled,
      ghosted: this.renderState.ghosted,
      joystick: {
        baseX: layout.joystickCenterX,
        baseY: layout.joystickCenterY,
        knobX,
        knobY,
        radius: layout.joystickRadius,
        engaged: this.axisX !== 0 || this.axisY !== 0,
      },
      buttons: layout.buttons.map((button) => ({
        id: button.id,
        label: button.label,
        x: button.x,
        y: button.y,
        radius: button.radius,
        pressed: Boolean(this.held[button.action]),
      })),
      hotbar: [],
    };
    this.onRenderStateChange?.(this.renderState);
  }

  private layout(): TouchLayout {
    const { width, height } = this.viewportRect;
    const shortSide = Math.min(width, height);
    const buttonRadius = clamp(shortSide * 0.075, 30, 44);
    const joystickRadius = clamp(shortSide * 0.12, 48, 84);
    const marginX = clamp(width * 0.045, 18, 36);
    const marginY = clamp(height * 0.06, 18, 42);
    const baseY = height - marginY - joystickRadius;
    const buttonY = height - marginY - buttonRadius;

    return {
      width,
      height,
      joystickCenterX: marginX + joystickRadius,
      joystickCenterY: baseY,
      joystickRadius,
      buttonRadius,
      buttonHitRadius: buttonRadius * 1.35,
      buttons: [
        { id: "attack", label: BUTTON_LABELS.attack, action: "attack", x: width - marginX - buttonRadius, y: buttonY, radius: buttonRadius },
        { id: "jump", label: BUTTON_LABELS.jump, action: "jump", x: width - marginX - buttonRadius * 2.55, y: buttonY - buttonRadius * 1.4, radius: buttonRadius * 0.95 },
        { id: "dodge", label: BUTTON_LABELS.dodge, action: "dodge", x: width - marginX - buttonRadius * 3.65, y: buttonY + buttonRadius * 0.1, radius: buttonRadius * 0.88 },
        { id: "interact", label: BUTTON_LABELS.interact, action: "interact", x: width - marginX - buttonRadius * 1.25, y: buttonY - buttonRadius * 2.45, radius: buttonRadius * 0.78 },
        { id: "useItem", label: BUTTON_LABELS.useItem, action: "useItem", x: width - marginX - buttonRadius * 4.6, y: buttonY - buttonRadius * 1.55, radius: buttonRadius * 0.78 },
        { id: "pause", label: BUTTON_LABELS.pause, action: "pause", x: width - marginX - buttonRadius * 0.45, y: buttonY - buttonRadius * 3.55, radius: buttonRadius * 0.72 },
      ],
    };
  }

  private hitButton(x: number, y: number, layout: TouchLayout) {
    return layout.buttons.find((button) => distance(x, y, button.x, button.y) <= layout.buttonHitRadius) ?? null;
  }

  private toLocalPoint(pointer: PointerLike) {
    return {
      x: clamp(pointer.clientX - this.viewportRect.left, 0, this.viewportRect.width),
      y: clamp(pointer.clientY - this.viewportRect.top, 0, this.viewportRect.height),
    };
  }

  private capturePointer(event: PointerEvent) {
    if (!this.target || !(this.target as unknown as HTMLElement).setPointerCapture) return;
    const element = this.target as unknown as HTMLElement;
    try {
      element.setPointerCapture(event.pointerId);
    } catch {
      // Ignore capture failures from transient pointer states.
    }
  }

  private resetAllState() {
    this.touches.clear();
    this.held = blankHeld();
    this.pressed = blankHeld();
    this.axisX = 0;
    this.axisY = 0;
  }
}