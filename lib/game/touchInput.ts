import type { InputAction } from "./input";

export type TouchControlScheme = "virtualGamepad" | "tacticalTap";

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
  joystick: {
    baseX: number;
    baseY: number;
    knobX: number;
    knobY: number;
    radius: number;
    engaged: boolean;
  };
  buttons: TouchRenderButton[];
  hotbar: Array<{ id: string; label: string; pressed: boolean }>;
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
  edgePanWidth: number;
  tapDeadzone: number;
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
    }
  | {
      role: "hotbar";
      slotIndex: number;
      startX: number;
      startY: number;
      currentX: number;
      currentY: number;
    }
  | {
      role: "tap";
      startX: number;
      startY: number;
      currentX: number;
      currentY: number;
      startedAt: number;
      moved: boolean;
      edgePan: boolean;
    };

type TouchLike = { identifier: number; clientX: number; clientY: number };

type TouchBindingTarget = {
  addEventListener: (type: string, listener: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean) => void;
  removeEventListener: (type: string, listener: EventListenerOrEventListenerObject, options?: EventListenerOptions | boolean) => void;
};

type ViewportRect = { left: number; top: number; width: number; height: number };

type TouchInputManagerOptions = {
  scheme?: TouchControlScheme;
  hotbarSlots?: TouchHotbarSlot[];
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
  private hotbarSlots: TouchHotbarSlot[];
  private onRenderStateChange: ((state: TouchRenderState) => void) | null;
  private target: TouchBindingTarget | null = null;
  private viewportRect: ViewportRect = { left: 0, top: 0, width: 1, height: 1 };
  private touches = new Map<number, TrackedTouch>();
  private held = blankHeld();
  private pressed = blankHeld();
  private axisX = 0;
  private axisY = 0;
  private tacticalTap: { x: number; y: number } | null = null;
  private tacticalPanDelta = { x: 0, y: 0 };
  private tacticalZoomDelta = 1;
  private tacticalQuickSlotAction: InputAction | null = null;
  private renderState: TouchRenderState = {
    scheme: "virtualGamepad",
    active: false,
    joystick: { baseX: 0, baseY: 0, knobX: 0, knobY: 0, radius: 64, engaged: false },
    buttons: [],
    hotbar: [],
  };

  private readonly boundTouchStart = (event: Event) => this.handleTouchStart(event as TouchEvent);
  private readonly boundTouchMove = (event: Event) => this.handleTouchMove(event as TouchEvent);
  private readonly boundTouchEnd = (event: Event) => this.handleTouchEnd(event as TouchEvent);
  private readonly boundTouchCancel = (event: Event) => this.handleTouchCancel(event as TouchEvent);

  constructor(options: TouchInputManagerOptions = {}) {
    this.scheme = options.scheme ?? "virtualGamepad";
    this.hotbarSlots = options.hotbarSlots ?? DEFAULT_HOTBAR;
    this.onRenderStateChange = options.onRenderStateChange ?? null;
    this.syncRenderState();
  }

  bind(target: TouchBindingTarget) {
    if (this.target === target) return;
    this.unbind();
    this.target = target;
    const passiveFalse = { passive: false };
    target.addEventListener("touchstart", this.boundTouchStart, passiveFalse);
    target.addEventListener("touchmove", this.boundTouchMove, passiveFalse);
    target.addEventListener("touchend", this.boundTouchEnd, passiveFalse);
    target.addEventListener("touchcancel", this.boundTouchCancel, passiveFalse);
  }

  unbind() {
    if (!this.target) return;
    this.target.removeEventListener("touchstart", this.boundTouchStart);
    this.target.removeEventListener("touchmove", this.boundTouchMove);
    this.target.removeEventListener("touchend", this.boundTouchEnd);
    this.target.removeEventListener("touchcancel", this.boundTouchCancel);
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
    const pan =
      this.tacticalPanDelta.x !== 0 || this.tacticalPanDelta.y !== 0
        ? { x: this.tacticalPanDelta.x, y: this.tacticalPanDelta.y }
        : null;
    const frame = {
      tap: this.tacticalTap,
      panDelta: pan,
      zoomDelta: this.tacticalZoomDelta,
      quickSlotAction: this.tacticalQuickSlotAction,
    };
    this.tacticalTap = null;
    this.tacticalPanDelta = { x: 0, y: 0 };
    this.tacticalZoomDelta = 1;
    this.tacticalQuickSlotAction = null;
    return frame;
  }

  private handleTouchStart(event: TouchEvent) {
    this.preventDefault(event);
    const layout = this.layout();
    for (const touch of Array.from(event.changedTouches)) {
      const point = this.toLocalPoint(touch);
      if (this.scheme === "virtualGamepad") {
        const button = this.hitButton(point.x, point.y, layout);
        if (button) {
          this.touches.set(touch.identifier, {
            role: "button",
            buttonId: button.id,
            startX: point.x,
            startY: point.y,
            currentX: point.x,
            currentY: point.y,
          });
          this.setButtonState(button.id, true, true);
          continue;
        }
        if (point.x <= layout.width * 0.58) {
          this.touches.set(touch.identifier, {
            role: "joystick",
            startX: point.x,
            startY: point.y,
            currentX: point.x,
            currentY: point.y,
          });
          this.updateJoystick(point.x, point.y, layout);
          continue;
        }
      }

      const hotbarIndex = this.hitHotbarIndex(point.x, point.y, layout);
      if (hotbarIndex >= 0) {
        this.touches.set(touch.identifier, {
          role: "hotbar",
          slotIndex: hotbarIndex,
          startX: point.x,
          startY: point.y,
          currentX: point.x,
          currentY: point.y,
        });
        this.markHotbarPressed(hotbarIndex);
        continue;
      }

      this.touches.set(touch.identifier, {
        role: "tap",
        startX: point.x,
        startY: point.y,
        currentX: point.x,
        currentY: point.y,
        startedAt: performance.now(),
        moved: false,
        edgePan: point.x <= layout.edgePanWidth || point.x >= layout.width - layout.edgePanWidth,
      });
    }

    this.syncDerivedState();
  }

  private handleTouchMove(event: TouchEvent) {
    this.preventDefault(event);
    const layout = this.layout();
    for (const touch of Array.from(event.changedTouches)) {
      const tracked = this.touches.get(touch.identifier);
      if (!tracked) continue;
      const point = this.toLocalPoint(touch);
      tracked.currentX = point.x;
      tracked.currentY = point.y;

      if (tracked.role === "joystick") {
        this.updateJoystick(point.x, point.y, layout);
        continue;
      }

      if (tracked.role === "button") {
        const button = layout.buttons.find((entry) => entry.id === tracked.buttonId);
        if (!button) continue;
        const inside = distance(point.x, point.y, button.x, button.y) <= layout.buttonHitRadius;
        this.setButtonState(tracked.buttonId, inside, false);
        continue;
      }

      if (tracked.role === "tap") {
        const movedDistance = distance(tracked.startX, tracked.startY, point.x, point.y);
        if (movedDistance >= layout.tapDeadzone) tracked.moved = true;
      }
    }

    this.updateGestureDeltas();
    this.syncDerivedState();
  }

  private handleTouchEnd(event: TouchEvent) {
    this.preventDefault(event);
    const layout = this.layout();
    for (const touch of Array.from(event.changedTouches)) {
      const tracked = this.touches.get(touch.identifier);
      if (!tracked) continue;
      const point = this.toLocalPoint(touch);

      if (tracked.role === "button") {
        this.setButtonState(tracked.buttonId, false, false);
      } else if (tracked.role === "joystick") {
        this.axisX = 0;
        this.axisY = 0;
      } else if (tracked.role === "tap") {
        const elapsed = performance.now() - tracked.startedAt;
        const travel = distance(tracked.startX, tracked.startY, point.x, point.y);
        if (!tracked.edgePan && !tracked.moved && elapsed <= 300 && travel <= layout.tapDeadzone) {
          this.tacticalTap = {
            x: clamp(point.x / layout.width, 0, 1),
            y: clamp(point.y / layout.height, 0, 1),
          };
        }
      }

      this.touches.delete(touch.identifier);
    }

    this.updateGestureDeltas();
    this.syncDerivedState();
  }

  private handleTouchCancel(event: TouchEvent) {
    this.preventDefault(event);
    for (const touch of Array.from(event.changedTouches)) {
      const tracked = this.touches.get(touch.identifier);
      if (tracked?.role === "button") this.setButtonState(tracked.buttonId, false, false);
      this.touches.delete(touch.identifier);
    }
    this.syncDerivedState();
  }

  private updateGestureDeltas() {
    if (this.scheme !== "tacticalTap") {
      this.tacticalPanDelta = { x: 0, y: 0 };
      this.tacticalZoomDelta = 1;
      return;
    }

    const tapTouches = Array.from(this.touches.values()).filter((touch) => touch.role === "tap");
    if (tapTouches.length >= 2) {
      const [a, b] = tapTouches;
      const startDistance = distance(a.startX, a.startY, b.startX, b.startY);
      const currentDistance = distance(a.currentX, a.currentY, b.currentX, b.currentY);
      if (startDistance > 0) {
        this.tacticalZoomDelta = clamp(currentDistance / startDistance, 0.85, 1.2);
      }
      this.tacticalPanDelta = {
        x: ((a.currentX - a.startX) + (b.currentX - b.startX)) / (2 * this.viewportRect.width),
        y: ((a.currentY - a.startY) + (b.currentY - b.startY)) / (2 * this.viewportRect.height),
      };
      return;
    }

    const edgePanTouch = tapTouches.find((touch) => touch.edgePan);
    if (edgePanTouch) {
      this.tacticalPanDelta = {
        x: (edgePanTouch.currentX - edgePanTouch.startX) / this.viewportRect.width,
        y: (edgePanTouch.currentY - edgePanTouch.startY) / this.viewportRect.height,
      };
      this.tacticalZoomDelta = 1;
      return;
    }

    this.tacticalPanDelta = { x: 0, y: 0 };
    this.tacticalZoomDelta = 1;
  }

  private markHotbarPressed(slotIndex: number) {
    const slot = this.hotbarSlots[slotIndex];
    if (!slot) return;
    this.tacticalQuickSlotAction = slot.action;
    this.pressed[slot.action] = true;
    this.held[slot.action] = true;
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

    for (const slot of this.hotbarSlots) {
      const hasTouch = Array.from(this.touches.values()).some(
        (touch) => touch.role === "hotbar" && slot === this.hotbarSlots[touch.slotIndex],
      );
      if (!hasTouch) this.held[slot.action] = false;
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
      hotbar: this.hotbarSlots.map((slot) => ({
        id: slot.id,
        label: slot.label,
        pressed: Boolean(this.held[slot.action]),
      })),
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
      edgePanWidth: clamp(width * 0.08, 24, 56),
      tapDeadzone: clamp(shortSide * 0.025, 12, 24),
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

  private hitHotbarIndex(x: number, y: number, layout: TouchLayout) {
    if (this.scheme !== "tacticalTap") return -1;
    const slotCount = this.hotbarSlots.length;
    const slotWidth = clamp(layout.width / (slotCount + 2), 56, 90);
    const gap = 10;
    const totalWidth = slotWidth * slotCount + gap * (slotCount - 1);
    const startX = (layout.width - totalWidth) / 2;
    const topY = layout.height - clamp(layout.height * 0.11, 56, 84);
    const height = 44;
    if (y < topY || y > topY + height) return -1;
    for (let index = 0; index < slotCount; index += 1) {
      const left = startX + index * (slotWidth + gap);
      if (x >= left && x <= left + slotWidth) return index;
    }
    return -1;
  }

  private toLocalPoint(touch: TouchLike) {
    return {
      x: clamp(touch.clientX - this.viewportRect.left, 0, this.viewportRect.width),
      y: clamp(touch.clientY - this.viewportRect.top, 0, this.viewportRect.height),
    };
  }

  private preventDefault(event: TouchEvent) {
    if (event.cancelable) event.preventDefault();
    event.stopPropagation();
  }

  private resetAllState() {
    this.touches.clear();
    this.held = blankHeld();
    this.pressed = blankHeld();
    this.axisX = 0;
    this.axisY = 0;
    this.tacticalTap = null;
    this.tacticalPanDelta = { x: 0, y: 0 };
    this.tacticalZoomDelta = 1;
    this.tacticalQuickSlotAction = null;
  }
}