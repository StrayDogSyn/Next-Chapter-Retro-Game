"use client";

import { useEffect, useMemo, useState } from "react";
import type { HudSnapshot } from "@/lib/game/game";

type Props = {
  open: boolean;
  snapshot: HudSnapshot | null;
  onClose: () => void;
  onEquipBagItem: (index: number) => void;
  onSellBagItem: (index: number) => void;
  onScrapBagItem: (index: number) => void;
  onSellEquipped: (slot: "primary" | "secondary") => void;
  onScrapEquipped: (slot: "primary" | "secondary") => void;
  onGiveUp?: () => void;
};

type TabId = "inventory" | "character" | "world";

/** What's currently selected in the Inventory tab - one unified selection
 *  model covers both loadout slots and bag cells, since primary/secondary/
 *  bag items all support the same sell/scrap actions (bag items also get
 *  Equip). Distinguishing "kind" up front means the action panel doesn't
 *  need to re-derive which item is selected from two separate pieces of
 *  state. */
type Selection = { kind: "primary" } | { kind: "secondary" } | { kind: "bag"; index: number };

function formatTime(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function GameMenuModal({
  open,
  snapshot,
  onClose,
  onEquipBagItem,
  onSellBagItem,
  onScrapBagItem,
  onSellEquipped,
  onScrapEquipped,
  onGiveUp,
}: Props) {
  const [tab, setTab] = useState<TabId>("inventory");
  const [selection, setSelection] = useState<Selection>({ kind: "primary" });
  const [confirmingQuit, setConfirmingQuit] = useState(false);

  // Reset the confirmation prompt whenever the modal closes/reopens, so it
  // never lingers open the next time the player checks the menu.
  useEffect(() => {
    if (!open) setConfirmingQuit(false);
  }, [open]);

  // A sell/scrap can remove the exact bag index the player has selected
  // (or the whole bag can shrink out from under a stale index after a
  // sale) - snap back to viewing the primary weapon rather than pointing
  // at a slot that no longer exists or silently showing the wrong item.
  useEffect(() => {
    if (!snapshot) return;
    if (selection.kind === "secondary" && !snapshot.secondary) {
      setSelection({ kind: "primary" });
    } else if (selection.kind === "bag" && selection.index >= snapshot.bag.length) {
      setSelection({ kind: "primary" });
    }
  }, [snapshot, selection]);

  const diff = useMemo(() => {
    if (!snapshot?.secondary) return null;
    const atkDelta = Math.round(snapshot.secondary.damage - snapshot.weapon.damage);
    const speedDelta = Math.round((snapshot.secondary.speed - snapshot.weapon.speed) * 10) / 10;
    return { atkDelta, speedDelta };
  }, [snapshot]);

  if (!open || !snapshot) return null;

  const selectedItem =
    selection.kind === "primary"
      ? snapshot.weapon
      : selection.kind === "secondary"
        ? snapshot.secondary
        : snapshot.bag[selection.index] ?? null;

  return (
    <div className="game-menu-backdrop" role="dialog" aria-modal="true" aria-label="Game menu">
      <section className="game-menu-modal">
        <header className="menu-header">
          <div>Run Seed: {snapshot.seed}</div>
          <div className="menu-header-actions">
            {onGiveUp ? (
              confirmingQuit ? (
                <span className="quit-run-confirm">
                  Abandon this run?
                  <button type="button" onClick={() => onGiveUp()}>Yes, quit</button>
                  <button type="button" onClick={() => setConfirmingQuit(false)}>Cancel</button>
                </span>
              ) : (
                <button type="button" className="quit-run-button" onClick={() => setConfirmingQuit(true)}>
                  Quit Run
                </button>
              )
            ) : null}
            <button type="button" onClick={onClose}>close</button>
          </div>
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
              <button
                type="button"
                className={`slot${selection.kind === "primary" ? " active" : ""}`}
                onClick={() => setSelection({ kind: "primary" })}
                style={{ borderColor: snapshot.weapon.color }}
              >
                Weapon: {snapshot.weapon.name}
              </button>
              <button
                type="button"
                className={`slot${selection.kind === "secondary" ? " active" : ""}`}
                onClick={() => setSelection({ kind: "secondary" })}
                disabled={!snapshot.secondary}
                style={snapshot.secondary ? { borderColor: snapshot.secondary.color } : undefined}
              >
                Secondary: {snapshot.secondary ? snapshot.secondary.name : "empty"}
              </button>

              {selection.kind === "secondary" && snapshot.secondary ? (
                <div className="slot-diff">
                  <div style={{ color: (diff?.atkDelta ?? 0) >= 0 ? "#74e09a" : "#ef6f6f" }}>
                    ATK {(diff?.atkDelta ?? 0) >= 0 ? `+${diff?.atkDelta ?? 0}` : diff?.atkDelta}
                  </div>
                  <div style={{ color: (diff?.speedDelta ?? 0) >= 0 ? "#74e09a" : "#ef6f6f" }}>
                    SPD {(diff?.speedDelta ?? 0) >= 0 ? `+${diff?.speedDelta ?? 0}` : diff?.speedDelta}/s
                  </div>
                </div>
              ) : null}
            </div>
            <div>
              <h3>
                Bag ({snapshot.bag.length}/{snapshot.bagCapacity}) — {snapshot.materials} materials
              </h3>
              <div className="bag-grid" aria-label="Storage bag grid">
                {Array.from({ length: snapshot.bagCapacity }).map((_, idx) => {
                  const item = snapshot.bag[idx];
                  const isSelected = selection.kind === "bag" && selection.index === idx;
                  return (
                    <button
                      type="button"
                      key={idx}
                      className={`bag-cell${isSelected ? " active" : ""}`}
                      style={item ? { borderColor: item.color } : undefined}
                      disabled={!item}
                      onClick={() => setSelection({ kind: "bag", index: idx })}
                      aria-label={item ? item.name : `Empty bag slot ${idx + 1}`}
                      title={item ? item.name : undefined}
                    >
                      {item ? item.name.slice(0, 1).toUpperCase() : ""}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedItem ? (
              <div className="menu-grid inventory-actions">
                <div className="selected-item-info">
                  <strong style={{ color: selectedItem.color }}>{selectedItem.name}</strong>
                  <span>{Math.round(selectedItem.damage)} dmg @ {selectedItem.speed.toFixed(1)}/s</span>
                </div>
                <div className="inventory-action-buttons">
                  {selection.kind === "bag" ? (
                    <button type="button" onClick={() => onEquipBagItem(selection.index)}>Equip</button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      selection.kind === "bag" ? onSellBagItem(selection.index) : onSellEquipped(selection.kind)
                    }
                  >
                    Sell
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      selection.kind === "bag" ? onScrapBagItem(selection.index) : onScrapEquipped(selection.kind)
                    }
                  >
                    Scrap
                  </button>
                </div>
              </div>
            ) : null}
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
            <div>Materials: {snapshot.materials}</div>
            <div>Time Elapsed: {formatTime(snapshot.elapsedSeconds)}</div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
