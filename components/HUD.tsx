"use client";

import type { HudSnapshot } from "@/lib/game/game";

const barOuter: React.CSSProperties = {
  background: "#1f2937",
  border: "1px solid #4b5563",
  height: 10,
  width: 140,
  borderRadius: 2,
  overflow: "hidden",
};

export function HUD({ snapshot }: { snapshot: HudSnapshot | null }) {
  if (!snapshot) {
    return (
      <div style={hudShell}>
        <span style={{ color: "#9ca3af" }}>loading…</span>
      </div>
    );
  }

  const hpPct = Math.max(0, Math.min(1, snapshot.hp / snapshot.maxHp));
  const upgradeCount = Object.values(snapshot.upgrades).reduce(
    (sum, v) => sum + (v ? 1 : 0),
    0,
  );

  return (
    <div style={hudShell}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "#f87171" }}>HP</span>
        <div style={barOuter}>
          <div
            style={{
              height: "100%",
              width: `${hpPct * 100}%`,
              background: hpPct > 0.35 ? "#22c55e" : "#ef4444",
              transition: "width 120ms linear",
            }}
          />
        </div>
        <span>
          {snapshot.hp}/{snapshot.maxHp}
        </span>
        <span style={{ color: "#facc15", marginLeft: 8 }}>◉ {snapshot.coins}</span>
        <span style={{ marginLeft: 8, color: snapshot.weapon.color }}>
          {snapshot.weapon.name}
        </span>
        {snapshot.secondary ? (
          <span style={{ color: "#6b7280", fontSize: 11 }}>
            [swap: <span style={{ color: snapshot.secondary.color }}>{snapshot.secondary.name}</span>]
          </span>
        ) : null}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11 }}>
        <span style={{ color: "#9ca3af" }}>{snapshot.roomName}</span>
        <span style={{ color: "#818cf8" }}>mods: {upgradeCount}</span>
        <span style={{ color: snapshot.gamepad ? "#4ade80" : "#6b7280" }}>
          🎮 {snapshot.gamepad ? "connected" : "keyboard"}
        </span>
        <span style={{ color: snapshot.lootSource === "python-service" ? "#4ade80" : "#f59e0b" }}>
          loot: {snapshot.lootSource}
        </span>
      </div>

      {snapshot.boss ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
          <span style={{ color: "#f87171", fontWeight: 700, fontSize: 11 }}>
            {snapshot.boss.name}
          </span>
          <div style={{ ...barOuter, width: 260 }}>
            <div
              style={{
                height: "100%",
                width: `${(snapshot.boss.hp / snapshot.boss.maxHp) * 100}%`,
                background: "#dc2626",
              }}
            />
          </div>
        </div>
      ) : null}

      {snapshot.message ? (
        <div style={{ color: "#fbbf24", fontSize: 12, marginTop: 2 }}>{snapshot.message}</div>
      ) : null}
    </div>
  );
}

const hudShell: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  zIndex: 10,
  padding: "6px 10px",
  fontFamily: "monospace",
  fontSize: 13,
  color: "#e5e7eb",
  background: "linear-gradient(rgba(3,7,18,0.85), rgba(3,7,18,0))",
  pointerEvents: "none",
  display: "flex",
  flexDirection: "column",
  gap: 2,
};
