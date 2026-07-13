import { describe, expect, it } from "vitest";
import { TouchInputManager } from "./touchInput";

function createFakeTarget() {
  const noop = () => {};
  return {
    addEventListener: noop,
    removeEventListener: noop,
  };
}

function touch(identifier: number, clientX: number, clientY: number) {
  return { identifier, clientX, clientY };
}

function touchEvent(touches: Array<{ identifier: number; clientX: number; clientY: number }>) {
  return {
    changedTouches: touches,
    cancelable: true,
    preventDefault() {},
    stopPropagation() {},
  } as unknown as TouchEvent;
}

describe("TouchInputManager", () => {
  it("tracks joystick and action button independently for multi-touch", () => {
    const manager = new TouchInputManager({ scheme: "virtualGamepad" });
    manager.setViewportRect({ left: 0, top: 0, width: 400, height: 240 });
    manager.bind(createFakeTarget());

    (manager as any).handleTouchStart(touchEvent([touch(1, 70, 180), touch(2, 350, 182)]));
    (manager as any).handleTouchMove(touchEvent([touch(1, 20, 180)]));

    const frame = manager.consumeGameplayFrame();
    expect(frame.axisX).toBeLessThan(0);
    expect(frame.held.left).toBe(true);
    expect(frame.pressed.attack).toBe(true);
  });

  it("emits tactical tap and pinch zoom deltas", () => {
    const manager = new TouchInputManager({ scheme: "tacticalTap" });
    manager.setViewportRect({ left: 0, top: 0, width: 400, height: 240 });

    (manager as any).handleTouchStart(touchEvent([touch(1, 120, 90), touch(2, 220, 90)]));
    (manager as any).handleTouchMove(touchEvent([touch(2, 270, 90)]));

    const gestureFrame = manager.consumeTacticalFrame();
    expect(gestureFrame.zoomDelta).toBeGreaterThan(1);

    (manager as any).handleTouchEnd(touchEvent([touch(1, 120, 90), touch(2, 270, 90)]));
    (manager as any).handleTouchStart(touchEvent([touch(3, 200, 120)]));
    (manager as any).handleTouchEnd(touchEvent([touch(3, 200, 120)]));

    const tapFrame = manager.consumeTacticalFrame();
    expect(tapFrame.tap).not.toBeNull();
    expect(tapFrame.tap?.x).toBeCloseTo(0.5, 1);
  });
});