"use client";

import type { HudSnapshot } from "@/lib/game/game";

type Props = {
  snapshot: HudSnapshot | null;
  onToggleMenu: () => void;
  onCopySeed: () => void;
};

function pct(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

function MiniMap({ rooms }: { rooms: HudSnapshot["minimap"] }) {
  if (rooms.length === 0) return null;

  const visited = rooms.filter((room) => room.visited);
  if (visited.length === 0) return null;

  const xs = visited.map((room) => room.x);
  const ys = visited.map((room) => room.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const cols = Math.max(...xs) - minX + 1;
  const rows = Math.max(...ys) - minY + 1;

  return (
    <div className="hud-minimap" style={{ width: cols * 14, height: rows * 14 }}>
      {visited.map((room) => (
        <div
          key={room.id}
          className={`hud-minimap-cell${room.current ? " current" : ""}${room.cleared ? " cleared" : ""}${room.boss ? " boss" : ""}`}
          style={{ left: (room.x - minX) * 14, top: (room.y - minY) * 14 }}
        />
      ))}
    </div>
  );
}

/**
 * ADR-013: surfaces Game's existing lootSource/saveSource so testers can
 * tell, and report, whether they were online or on client-fallback
 * (ADR-003/ADR-009) — a dimmed brass lamp when either has fallen back.
 */
function ConnectionStatus({ lootSource, saveSource }: { lootSource: string; saveSource: string }) {
  const offline = lootSource === "client-fallback" || saveSource === "client-fallback";
  const pending = lootSource === "unknown" && saveSource === "unknown";
  const label = pending ? "connecting…" : offline ? "offline mode" : "online";
  return (
    <div
      className={`hud-status-chip${offline ? " offline" : ""}${pending ? " pending" : ""}`}
      title={`loot: ${lootSource} · save: ${saveSource}`}
    >
      <span className="hud-status-dot" />
      {label}
    </div>
  );
}

export function GameHudOverlay({ snapshot, onToggleMenu, onCopySeed }: Props) {
  if (!snapshot) return null;

  const hpPct = pct(snapshot.hp, snapshot.maxHp);
  const xpPct = pct(snapshot.xp, snapshot.xpToNext);
  // There's no shield mechanic wired up yet (Game always reports 0/0) — showing
  // a bar that can never fill reads as a broken visual, not an empty stat.
  const hasShield = snapshot.maxShield > 0;

  return (
    <div className="game-hud-overlay" aria-hidden={false}>
      <section className="hud-panel hud-panel--vitals">
        <div className="hud-row hud-row--between">
          <strong>Lv.{snapshot.level}</strong>
          <span>{snapshot.coins}c</span>
        </div>
        <div className="hud-bar-shell hp">
          <div className="hud-bar-fill" style={{ width: `${hpPct}%` }} />
        </div>
        <div className="hud-row hud-row--between">
          <span>HP</span>
          <span>{snapshot.hp}/{snapshot.maxHp}</span>
        </div>
        {hasShield ? (
          <>
            <div className="hud-bar-shell shield">
              <div className="hud-bar-fill" style={{ width: `${pct(snapshot.shield, snapshot.maxShield)}%` }} />
            </div>
            <div className="hud-row hud-row--between">
              <span>Shield</span>
              <span>{snapshot.shield}/{snapshot.maxShield}</span>
            </div>
          </>
        ) : null}
        <div className="hud-bar-shell xp">
          <div className="hud-bar-fill" style={{ width: `${xpPct}%` }} />
        </div>
      </section>

      <section className="hud-panel hud-panel--equipment">
        <div className="equip-chip">
          WPN: <span style={{ color: snapshot.weapon.color }}>{snapshot.weapon.name}</span>
        </div>
        <div className="equip-chip">
          ARM: <span>{snapshot.stats.toughnessPct}% DR</span>
        </div>
      </section>

      <section className="hud-panel hud-panel--intel">
        <MiniMap rooms={snapshot.minimap} />
        <div className="hud-feed">{snapshot.message || "..."}</div>
        <div className="hud-row hud-row--between">
          <ConnectionStatus lootSource={snapshot.lootSource} saveSource={snapshot.saveSource} />
          <div className="hud-actions">
            <button type="button" onClick={onToggleMenu}>menu</button>
            <button type="button" onClick={onCopySeed}>seed</button>
          </div>
        </div>
      </section>
    </div>
  );
}
