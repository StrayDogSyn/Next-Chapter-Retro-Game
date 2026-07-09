"use client";

import { useMemo, useState } from "react";
import type { HudSnapshot } from "@/lib/game/game";

type Props = {
  open: boolean;
  snapshot: HudSnapshot | null;
  onClose: () => void;
};

type TabId = "inventory" | "character" | "world";

function formatTime(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function GameMenuModal({ open, snapshot, onClose }: Props) {
  const [tab, setTab] = useState<TabId>("inventory");
  const [selectedSlot, setSelectedSlot] = useState<"primary" | "secondary">("primary");

  const diff = useMemo(() => {
    if (!snapshot?.secondary) return null;
    const atkDelta = Math.round((snapshot.secondary ? 1 : 0) * 8);
    const defDelta = snapshot.secondary ? 3 : 0;
    return { atkDelta, defDelta };
  }, [snapshot]);

  if (!open || !snapshot) return null;

  return (
    <div className="game-menu-backdrop" role="dialog" aria-modal="true" aria-label="Game menu">
      <section className="game-menu-modal">
        <header className="menu-header">
          <div>Run Seed: {snapshot.seed}</div>
          <button type="button" onClick={onClose}>close</button>
        </header>

        <div className="menu-tabs" role="tablist" aria-label="Game menu tabs">
          <button type="button" role="tab" aria-selected={tab === "inventory"} onClick={() => setTab("inventory")}>Inventory</button>
          <button type="button" role="tab" aria-selected={tab === "character"} onClick={() => setTab("character")}>Character</button>
          <button type="button" role="tab" aria-selected={tab === "world"} onClick={() => setTab("world")}>World</button>
        </div>

        {tab === "inventory" ? (
          <div className="menu-grid inventory-grid">
            <div>
              <h3>Loadout</h3>
              <button type="button" className={`slot${selectedSlot === "primary" ? " active" : ""}`} onClick={() => setSelectedSlot("primary")}>
                Weapon: {snapshot.weapon.name}
              </button>
              <button
                type="button"
                className={`slot${selectedSlot === "secondary" ? " active" : ""}`}
                onClick={() => setSelectedSlot("secondary")}
                disabled={!snapshot.secondary}
              >
                Secondary: {snapshot.secondary ? snapshot.secondary.name : "empty"}
              </button>

              {selectedSlot === "secondary" && snapshot.secondary ? (
                <div className="slot-diff">
                  <div style={{ color: (diff?.atkDelta ?? 0) >= 0 ? "#74e09a" : "#ef6f6f" }}>
                    ATK {(diff?.atkDelta ?? 0) >= 0 ? `+${diff?.atkDelta ?? 0}` : diff?.atkDelta}
                  </div>
                  <div style={{ color: (diff?.defDelta ?? 0) >= 0 ? "#74e09a" : "#ef6f6f" }}>
                    DEF {(diff?.defDelta ?? 0) >= 0 ? `+${diff?.defDelta ?? 0}` : diff?.defDelta}
                  </div>
                </div>
              ) : null}
            </div>
            <div>
              <h3>Bag</h3>
              <div className="bag-grid" aria-label="Storage bag grid">
                {Array.from({ length: 16 }).map((_, idx) => (
                  <div key={idx} className="bag-cell">
                    {idx === 0 && snapshot.secondary ? "S" : ""}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {tab === "character" ? (
          <div className="menu-grid character-grid">
            <div>Base Attack: {snapshot.stats.attackPower}</div>
            <div>Toughness: {snapshot.stats.toughnessPct}%</div>
            <div>Max HP: {snapshot.maxHp}</div>
            <div>Crit Chance: {snapshot.stats.critChancePct}%</div>
            <div>Lifesteal: {snapshot.stats.lifeStealPct}%</div>
            <div>Dodge iFrames: {snapshot.stats.dodgeInvulnMs}ms</div>
          </div>
        ) : null}

        {tab === "world" ? (
          <div className="menu-grid world-grid">
            <div>Rooms Visited: {snapshot.minimap.filter((room) => room.visited).length}</div>
            <div>Enemies Defeated: {snapshot.enemiesDefeated}</div>
            <div>Coins Banked: {snapshot.coins}</div>
            <div>Time Elapsed: {formatTime(snapshot.elapsedSeconds)}</div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
