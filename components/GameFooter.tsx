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
          Keyboard: LEFT/RIGHT or A/D move, SPACE/W/Z jump, X/J attack, C/K dodge, V/L swap, S/DOWN drop
        </span>
        <span className="hud-chip">
          Xbox: left stick or D-pad move, A jump, X attack, B dodge, Y swap
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
      <div className="hud-line message" role="status" aria-live="polite">
        {snapshot?.message ? snapshot.message : " "}
      </div>
    </footer>
  );
}
