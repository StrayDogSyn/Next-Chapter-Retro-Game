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

function Minimap({ rooms }: { rooms: HudSnapshot["minimap"] }) {
  if (rooms.length === 0) return null;
  const xs = rooms.map((r) => r.x);
  const ys = rooms.map((r) => r.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const cols = Math.max(...xs) - minX + 1;
  const rows = Math.max(...ys) - minY + 1;
  const cell = 12;

  return (
    <div
      className="minimap"
      style={{
        position: "relative",
        width: cols * cell,
        height: rows * cell,
      }}
      title="Explored map"
    >
      {rooms
        .filter((r) => r.visited)
        .map((r) => (
          <div
            key={r.id}
            className={`minimap-cell${r.current ? " current" : ""}${r.boss ? " boss" : ""}${r.cleared ? " cleared" : ""}`}
            style={{
              position: "absolute",
              left: (r.x - minX) * cell,
              top: (r.y - minY) * cell,
              width: cell - 2,
              height: cell - 2,
            }}
          />
        ))}
    </div>
  );
}

export function GameHeader({ snapshot }: GameHeaderProps) {
  if (!snapshot) {
    return (
      <header className="game-header" role="status" aria-live="polite">
        <div className="hud-line">Loading game state...</div>
      </header>
    );
  }

  const hpPct = Math.max(0, Math.min(1, snapshot.hp / snapshot.maxHp));
  const xpPct = Math.max(0, Math.min(1, snapshot.xp / snapshot.xpToNext));

  return (
    <header className="game-header">
      <div className="hud-line" style={{ justifyContent: "space-between" }}>
        <div className="hud-line" style={{ margin: 0 }}>
          <span className="hud-chip">{snapshot.roomName}</span>
          <span className="hud-chip">Zone: {snapshot.zone}</span>
          <span className="hud-chip coin">Coins: {snapshot.coins}</span>
          <span className="hud-chip">Lv.{snapshot.level}</span>
        </div>
        <Minimap rooms={snapshot.minimap} />
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
        <span className="hud-chip weapon" style={{ color: snapshot.weapon.color }}>
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

      <div className="hud-line">
        <span className="hud-label">XP</span>
        <div style={{ ...barShell, height: 6, width: 220, border: "1px solid #3d5670" }}>
          <div
            style={{
              height: "100%",
              width: `${xpPct * 100}%`,
              background: "#60a5fa",
              transition: "width 120ms linear",
            }}
          />
        </div>
        <span className="hud-chip">{Math.round(snapshot.xp)}/{snapshot.xpToNext} XP</span>
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
