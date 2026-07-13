"use client";

import type { TouchRenderState } from "@/lib/game/touchInput";

type TouchControlsOverlayProps = {
  state: TouchRenderState;
  visible: boolean;
};

export function TouchControlsOverlay({ state, visible }: TouchControlsOverlayProps) {
  if (!visible) return null;

  return (
    <div className="touch-overlay" aria-hidden="true">
      {state.scheme === "virtualGamepad" ? (
        <>
          <div
            className={`touch-joystick-base${state.joystick.engaged ? " is-active" : ""}`}
            style={{
              left: state.joystick.baseX - state.joystick.radius,
              top: state.joystick.baseY - state.joystick.radius,
              width: state.joystick.radius * 2,
              height: state.joystick.radius * 2,
            }}
          >
            <div
              className="touch-joystick-knob"
              style={{
                left: state.joystick.knobX - state.joystick.baseX + state.joystick.radius - state.joystick.radius * 0.42,
                top: state.joystick.knobY - state.joystick.baseY + state.joystick.radius - state.joystick.radius * 0.42,
                width: state.joystick.radius * 0.84,
                height: state.joystick.radius * 0.84,
              }}
            />
          </div>
          {state.buttons.map((button) => (
            <div
              key={button.id}
              className={`touch-action-button${button.pressed ? " is-pressed" : ""}`}
              style={{
                left: button.x - button.radius,
                top: button.y - button.radius,
                width: button.radius * 2,
                height: button.radius * 2,
              }}
            >
              <span>{button.label}</span>
            </div>
          ))}
        </>
      ) : (
        <div className="touch-hotbar">
          {state.hotbar.map((slot) => (
            <div key={slot.id} className={`touch-hotbar-slot${slot.pressed ? " is-pressed" : ""}`}>
              {slot.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}