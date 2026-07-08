"use client";

import type { HudSnapshot } from "@/lib/game/game";

type GameFooterProps = {
  snapshot: HudSnapshot | null;
};

export function GameFooter({ snapshot }: GameFooterProps) {
  const gamepad = snapshot?.gamepad;
  const source = snapshot?.lootSource ?? "unknown";

  return (
    <footer className="game-footer">
      <div className="hud-line controls">
        <span className="hud-chip">
          Keyboard: LEFT/RIGHT or A/D move, SPACE/W/Z jump, X/J attack, C/K dodge, V/L swap, ESC/P pause, S/DOWN drop
        </span>
        <span className="hud-chip">
          Xbox: left stick or D-pad move, A jump, X/RB/RT attack, B/LT dodge, Y/LB swap, START pause
        </span>
      </div>
      <div className="hud-line">
        <span className="hud-chip" style={{ color: gamepad ? "#4ade80" : "#9fb2c7" }}>
          Input: {gamepad ? `gamepad (${gamepad})` : "keyboard"}
        </span>
        <span className="hud-chip" style={{ color: source === "python-service" ? "#4ade80" : "#fbbf24" }}>
          Loot source: {source}
        </span>
        <span className="hud-chip">State: {snapshot?.phase ?? "loading"}</span>
      </div>
      {snapshot && snapshot.respawnHoldPct > 0 ? (
        <div className="hud-line">
          <span className="hud-chip" style={{ color: "#fbbf24" }}>
            Resetting position...
          </span>
          <div style={{ height: 8, width: 140, border: "1px solid #47627d", background: "#122030", borderRadius: 3, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${snapshot.respawnHoldPct * 100}%`,
                background: "#fbbf24",
              }}
            />
          </div>
        </div>
      ) : null}
      <div className="hud-line message" role="status" aria-live="polite">
        {snapshot?.message ? snapshot.message : " "}
      </div>
    </footer>
  );
}
