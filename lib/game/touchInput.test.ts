import { describe, expect, it } from "vitest";
import { TouchInputManager } from "./touchInput";

function createFakeTarget() {
  const noop = () => {};
  return {
    addEventListener: noop,
    removeEventListener: noop,
  };
}

function pointer(pointerId: number, clientX: number, clientY: number) {
  return { pointerId, clientX, clientY, pointerType: "touch", preventDefault() {} };
}

function pointerEvent(pointerId: number, clientX: number, clientY: number) {
  return pointer(pointerId, clientX, clientY) as unknown as PointerEvent;
}

describe("TouchInputManager", () => {
  it("tracks joystick and action button independently for multi-touch", () => {
    const manager = new TouchInputManager();
    manager.setViewportRect({ left: 0, top: 0, width: 400, height: 240 });
    manager.bind(createFakeTarget());

    (manager as any).handlePointerDown(pointerEvent(1, 70, 180));
    (manager as any).handlePointerDown(pointerEvent(2, 350, 182));
    (manager as any).handlePointerMove(pointerEvent(1, 20, 180));

    const frame = manager.consumeGameplayFrame();
    expect(frame.axisX).toBeLessThan(0);
    expect(frame.held.left).toBe(true);
    expect(frame.pressed.attack).toBe(true);
  });

  it("releases held state on pointer cancel", () => {
    const manager = new TouchInputManager();
    manager.setViewportRect({ left: 0, top: 0, width: 400, height: 240 });
    manager.bind(createFakeTarget());

    (manager as any).handlePointerDown(pointerEvent(9, 350, 182));
    let frame = manager.consumeGameplayFrame();
    expect(frame.held.attack).toBe(true);

    (manager as any).handlePointerCancel(pointerEvent(9, 350, 182));
    frame = manager.consumeGameplayFrame();
    expect(frame.held.attack).toBe(false);
  });

  it("disables touch input when manager is disabled", () => {
    const manager = new TouchInputManager();
    manager.setViewportRect({ left: 0, top: 0, width: 400, height: 240 });
    manager.setEnabled(false);

    (manager as any).handlePointerDown(pointerEvent(1, 350, 182));
    const frame = manager.consumeGameplayFrame();
    expect(frame.held.attack).toBe(false);
  });
});