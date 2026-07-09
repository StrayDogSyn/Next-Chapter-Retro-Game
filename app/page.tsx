"use client";

import { useEffect, useState } from "react";
import { GameCanvas } from "@/components/GameCanvas";
import { StartMenu } from "@/components/StartMenu";
import { Game, type HudSnapshot } from "@/lib/game/game";

export default function Home() {
  const [gameStarted, setGameStarted] = useState(false);
  const [continueFromSave, setContinueFromSave] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  const [snapshot, setSnapshot] = useState<HudSnapshot | null>(null);
  const [controlsOpen, setControlsOpen] = useState(false);

  useEffect(() => {
    setHasSave(Game.hasSave());
  }, []);

  return (
    <main className="game-shell">
      <section className={`game-panel${gameStarted ? " game-panel--runtime" : ""}`}>
        {!gameStarted ? (
          <>
            <h1>Next Chapter Retro Game</h1>
            <p>
              A SNES-styled Metroidvania platformer — 24 interconnected rooms,
              Diablo-style loot rolled by a Python service, and boss fights.
              Hand-rolled canvas engine, no game library.
            </p>
          </>
        ) : null}

        {!gameStarted ? (
          <>
            <StartMenu
              onStart={() => {
                setContinueFromSave(false);
                setGameStarted(true);
              }}
              onContinue={() => {
                setContinueFromSave(true);
                setGameStarted(true);
              }}
              hasSave={hasSave}
            />
            <div style={{ fontFamily: "monospace", fontSize: 13, lineHeight: 1.7 }}>
              <strong>Keyboard:</strong> LEFT/RIGHT or A/D move, SPACE/W/Z jump
              (air-jump with Aether Wings), X/J attack, C/K dodge, V/L swap,
              S/DOWN drop through platforms, ESC/P pause
              <br />
              <strong>Xbox controller:</strong> left stick or D-pad move, A
              jump, X or RB/RT attack, B or LT dodge, Y or LB swap weapon,
              START pause (plug in any time, detected automatically)
            </div>
          </>
        ) : null}

        {gameStarted ? (
          <section className="game-runtime">
            <div className="game-runtime-canvas">
              <GameCanvas onSnapshot={setSnapshot} continueFromSave={continueFromSave} />
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
