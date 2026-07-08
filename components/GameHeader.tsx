"use client";

import type { HudSnapshot } from "@/lib/game/game";

type GameHeaderProps = {
  snapshot: HudSnapshot | null;
};

const barShell: React.CSSProperties = {
  height: 12,
  border: "1px solid #47627d",
  background: "#122030",
  borderRadius: 3,
  overflow: "hidden",
};

export function GameHeader({ snapshot }: GameHeaderProps) {
  if (!snapshot) {
    return (
      <header className="game-header" role="status" aria-live="polite">
        <div className="hud-line">Loading game state...</div>
      </header>
    );
  }

  const hpPct = Math.max(0, Math.min(1, snapshot.hp / snapshot.maxHp));

  return (
    <header className="game-header">
      <div className="hud-line">
        <span className="hud-chip">{snapshot.roomName}</span>
        <span className="hud-chip">Zone: {snapshot.zone}</span>
        <span className="hud-chip coin">Coins: {snapshot.coins}</span>
      </div>

      <div className="hud-line">
        <span className="hud-label">HP</span>
        <div style={{ ...barShell, width: 220 }}>
          <div
            style={{
              height: "100%",
              width: `${hpPct * 100}%`,
              background: hpPct > 0.35 ? "#3fd47a" : "#e74b4b",
              transition: "width 120ms linear",
            }}
          />
        </div>
        <span className="hud-chip">{snapshot.hp}/{snapshot.maxHp}</span>
        <span className="hud-chip" style={{ color: snapshot.weapon.color }}>
          {snapshot.weapon.name} ({snapshot.weapon.rarity})
        </span>
        <span className="hud-chip">
          Swap: {snapshot.secondary ? (
            <span style={{ color: snapshot.secondary.color }}>
              {snapshot.secondary.name} ({snapshot.secondary.rarity})
            </span>
          ) : (
            "empty"
          )}
        </span>
      </div>

      {snapshot.boss ? (
        <div className="hud-line">
          <span className="hud-label boss">{snapshot.boss.name}</span>
          <div style={{ ...barShell, width: 320 }}>
            <div
              style={{
                height: "100%",
                width: `${Math.max(0, Math.min(1, snapshot.boss.hp / snapshot.boss.maxHp)) * 100}%`,
                background: "#d43737",
              }}
            />
          </div>
          <span className="hud-chip">{snapshot.boss.hp}/{snapshot.boss.maxHp}</span>
        </div>
      ) : null}
    </header>
  );
}
