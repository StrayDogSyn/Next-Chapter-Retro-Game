import { describe, expect, it } from "vitest";
import { InputManager } from "./input";

/**
 * InputManager's constructor only needs addEventListener + a document with
 * `location.search` - a minimal fake avoids pulling in a jsdom environment
 * for what's otherwise a pure state-machine test.
 */
function createFakeWindow(): Window {
  const noop = () => {};
  const fakeDocument = {
    location: { search: "" },
    addEventListener: noop,
    removeEventListener: noop,
    hasFocus: () => true,
    activeElement: null,
  };
  const fakeWindow = {
    document: fakeDocument,
    addEventListener: noop,
    removeEventListener: noop,
  };
  return fakeWindow as unknown as Window;
}

describe("InputManager.flushPressed (menu-close input-leak fix)", () => {
  it("clears every action's pressed edge", () => {
    const input = new InputManager(createFakeWindow());
    input.state.pressed.attack = true;
    input.state.pressed.jump = true;
    input.flushPressed();
    expect(input.state.pressed.attack).toBe(false);
    expect(input.state.pressed.jump).toBe(false);
  });

  it("does not touch held state - a genuinely held key stays held", () => {
    const input = new InputManager(createFakeWindow());
    input.state.pressed.attack = true;
    input.state.held.attack = true;
    input.flushPressed();
    expect(input.state.held.attack).toBe(true);
  });

  it("a key still held after flush does not re-trigger pressed next frame (no double-consume)", () => {
    // Simulates: player pressed a key after the last update tick, the menu
    // closes and flushes, and the player is STILL holding the key.
    const input = new InputManager(createFakeWindow());
    // Drive via the internal keyboard-held state because we cannot easily
    // dispatch real DOM events in this minimal fake.
    input["keyboardHeld"].attack = true;
    input["previousHeld"].attack = false;
    input.flushPressed();
    input.update();
    expect(input.state.pressed.attack).toBe(false);
    expect(input.state.held.attack).toBe(true);
  });
});
