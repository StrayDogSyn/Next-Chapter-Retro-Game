"use client";

import { useEffect, useRef, useState } from "react";
import type { HudSnapshot } from "@/lib/game/game";
import { assetUrl } from "@/lib/game/asset-url";

type Props = {
  snapshot: HudSnapshot | null;
  onToggleMenu: () => void;
  onCopySeed: () => void;
};

function pct(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

// Module-level so every SpriteBar instance shares one decode/load, not one each.
let uiSheetImg: HTMLImageElement | null = null;
let uiSheetPromise: Promise<HTMLImageElement> | null = null;
function loadUiSheet(): Promise<HTMLImageElement> {
  if (uiSheetPromise) return uiSheetPromise;
  uiSheetPromise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      uiSheetImg = img;
      resolve(img);
    };
    img.onerror = reject;
    img.src = assetUrl("/sprites/ui_upscaled.png");
  });
  return uiSheetPromise;
}

/**
 * Cropped-sprite HUD bar, replacing the flat CSS-fill `.hud-bar-shell` divs
 * for HP/XP with the ornate framed-bar art from `ui_upscaled.png` (UI-008
 * follow-up). The sheet bundles three identical bar tracks stacked
 * vertically (rows at source y=20/40/60, each 16px tall) next to three
 * separate colored fill strips (source x=241-341, 8px tall) - exact pixel
 * ranges below were measured directly off the sheet (row/column alpha
 * histogram + point sampling), not guessed. The frame crop starts at
 * sx=87 (just past the shared circular portrait socket on the far left,
 * which spans the full sheet height and can't be cleanly split per-row) so
 * each bar only shows its own track + end-cap gem.
 */
const UI_TRACK = {
  hp: { frameSy: 20, fillSy: 24 },
  xp: { frameSy: 40, fillSy: 44 },
} as const;
const UI_FRAME_SX = 87;
const UI_FRAME_SW = 129;
const UI_FRAME_SH = 16;
const UI_FILL_SX = 241;
const UI_FILL_SW = 100;
const UI_FILL_SH = 8;
// Fill area's position/size *within* the frame crop (frame crop's own local
// coordinate space, i.e. relative to UI_FRAME_SX/frameSy).
const FILL_LOCAL_X = 91 - UI_FRAME_SX;
const FILL_LOCAL_Y = 22 - 20;
const FILL_LOCAL_W = 189 - 91;
const FILL_LOCAL_H = 33 - 22;
const BAR_SCALE = 1.35;

function SpriteBar({ track, pct: fillPct }: { track: "hp" | "xp"; pct: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(uiSheetImg !== null);

  useEffect(() => {
    if (uiSheetImg) return;
    let cancelled = false;
    loadUiSheet()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        // Sheet failed to load (e.g. offline dev without the asset built) -
        // stay unready; nothing renders rather than a broken-image glyph.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const destW = Math.round(UI_FRAME_SW * BAR_SCALE);
  const destH = Math.round(UI_FRAME_SH * BAR_SCALE);

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = uiSheetImg;
    if (!canvas || !img || !ready) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, destW, destH);

    const { frameSy, fillSy } = UI_TRACK[track];
    ctx.drawImage(img, UI_FRAME_SX, frameSy, UI_FRAME_SW, UI_FRAME_SH, 0, 0, destW, destH);

    const clampedPct = Math.max(0, Math.min(100, fillPct));
    const fillSw = (UI_FILL_SW * clampedPct) / 100;
    if (fillSw > 0) {
      const fillDx = FILL_LOCAL_X * BAR_SCALE;
      const fillDy = FILL_LOCAL_Y * BAR_SCALE;
      const fillDw = (FILL_LOCAL_W * BAR_SCALE * clampedPct) / 100;
      const fillDh = FILL_LOCAL_H * BAR_SCALE;
      ctx.drawImage(img, UI_FILL_SX, fillSy, fillSw, UI_FILL_SH, fillDx, fillDy, fillDw, fillDh);
    }
  }, [track, fillPct, ready, destW, destH]);

  if (!ready) {
    // Sheet not loaded yet - fall back to the plain CSS bar so there's never
    // a blank gap while the image decodes on first mount.
    return (
      <div className={`hud-bar-shell ${track}`}>
        <div className="hud-bar-fill" style={{ width: `${fillPct}%` }} />
      </div>
    );
  }

  return <canvas ref={canvasRef} width={destW} height={destH} className={`hud-sprite-bar ${track}`} />;
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
        <SpriteBar track="hp" pct={hpPct} />
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
        <SpriteBar track="xp" pct={xpPct} />
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
