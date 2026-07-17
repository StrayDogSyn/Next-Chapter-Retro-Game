"use client";

import { useEffect, useState } from "react";
import { GameCanvas } from "@/components/GameCanvas";
import { StartMenu } from "@/components/StartMenu";
import { Game, type HudSnapshot } from "@/lib/game/game";
import { dailySeed } from "@/lib/game/rng";

// ADR-017: per-day "attempted" flag - informational only (replaying your
// own daily seed is always allowed, this isn't a gate).
const DAILY_ATTEMPTED_KEY = "ncrg:dailyAttempted";

export default function Home() {
  const [gameStarted, setGameStarted] = useState(false);
  const [continueFromSave, setContinueFromSave] = useState(false);
  const [seedOverride, setSeedOverride] = useState<string | undefined>(undefined);
  const [hasSave, setHasSave] = useState(false);
  const [snapshot, setSnapshot] = useState<HudSnapshot | null>(null);
  const [controlsOpen, setControlsOpen] = useState(false);

  useEffect(() => {
    setHasSave(Game.hasSave());
  }, []);

  return (
    <main className={`game-shell${gameStarted ? " game-shell--runtime" : ""}`}>
      <section className={`game-panel${gameStarted ? " game-panel--runtime" : ""}`}>
        {!gameStarted ? (
          <StartMenu
            onStart={() => {
              // A fresh run must not clobber the continue-save until the
              // first save trigger actually fires (ADR-010's triggers) -
              // starting a new run here only affects in-memory state.
              setContinueFromSave(false);
              setSeedOverride(undefined);
              setGameStarted(true);
            }}
            onContinue={() => {
              setContinueFromSave(true);
              setSeedOverride(undefined);
              setGameStarted(true);
            }}
            onDaily={() => {
              try {
                localStorage.setItem(DAILY_ATTEMPTED_KEY, dailySeed());
              } catch {
                // localStorage unavailable - daily still works, just not tracked
              }
              setContinueFromSave(false);
              setSeedOverride(dailySeed());
              setGameStarted(true);
            }}
            onEnterSeed={(seed) => {
              setContinueFromSave(false);
              setSeedOverride(seed);
              setGameStarted(true);
            }}
            hasSave={hasSave}
          />
        ) : null}

        {gameStarted ? (
          <section className="game-runtime">
            <div className="game-runtime-canvas">
              <GameCanvas
                onSnapshot={setSnapshot}
                continueFromSave={continueFromSave}
                seedOverride={seedOverride}
                onGiveUp={() => {
                  setGameStarted(false);
                  setContinueFromSave(false);
                  setSeedOverride(undefined);
                  setControlsOpen(false);
                  setSnapshot(null);
                }}
              />
            </div>
            <div className="controls-drawer">
              <button type="button" className="controls-drawer-toggle" onClick={() => setControlsOpen((open) => !open)}>
                {controlsOpen ? "Hide Controls" : "Show Controls"}
              </button>
              {controlsOpen ? (
                <div className="controls-drawer-content">
                  <span className="kbd-chip">A / D Move</span>
                  <span className="kbd-chip">Space Jump</span>
                  <span className="kbd-chip">X Attack</span>
                  <span className="kbd-chip">C Dodge</span>
                  <span className="kbd-chip">Tab / I Menu</span>
                  <span className="kbd-chip">Start / Select Menu</span>
                  <span className="kbd-chip">Esc Close Menu</span>
                  {snapshot ? <span className="kbd-chip">Seed: {snapshot.seed}</span> : null}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

      </section>
    </main>
  );
}
