"use client";

import { useEffect, useState } from "react";
import { GameFooter } from "@/components/GameFooter";
import { GameHeader } from "@/components/GameHeader";
import { GameCanvas } from "@/components/GameCanvas";
import { StartMenu } from "@/components/StartMenu";
import type { HudSnapshot } from "@/lib/game/game";

type LevelPayload = {
  ok: boolean;
  source: string;
  level: {
    seed: string;
    platforms: Array<{ x: number; y: number; width: number }>;
  };
  error?: string;
};

export default function Home() {
  const [gameStarted, setGameStarted] = useState(false);
  const [levelData, setLevelData] = useState<LevelPayload | null>(null);
  const [snapshot, setSnapshot] = useState<HudSnapshot | null>(null);

  useEffect(() => {
    async function loadLevelData() {
      const response = await fetch("/api/procedural-level", { cache: "no-store" });
      const payload = (await response.json()) as LevelPayload;
      setLevelData(payload);
    }

    loadLevelData().catch(() => {
      setLevelData(null);
    });
  }, []);

  return (
    <main className="game-shell">
      <section className="game-panel">
        <h1>Next Chapter Retro Game</h1>
        <p>
          A SNES-styled Metroidvania platformer — 24 interconnected rooms,
          Diablo-style loot rolled by a Python service, and boss fights.
          Hand-rolled canvas engine, no game library.
        </p>

        {!gameStarted ? (
          <>
            <StartMenu onStart={() => setGameStarted(true)} />
            <div style={{ fontFamily: "monospace", fontSize: 13, lineHeight: 1.7 }}>
              <strong>Keyboard:</strong> LEFT/RIGHT or A/D move, SPACE/W/Z jump
              (air-jump with Aether Wings), X/J attack, C/K dodge, V/L swap,
              S/DOWN drop through platforms
              <br />
              <strong>Xbox controller:</strong> left stick or D-pad move, A
              jump, X attack, B dodge, Y swap weapon (plug in any time,
              detected automatically)
            </div>
          </>
        ) : null}

        {gameStarted ? (
          <section className="game-runtime">
            <GameHeader snapshot={snapshot} />
            <div className="game-runtime-canvas">
              <GameCanvas onSnapshot={setSnapshot} />
            </div>
            <GameFooter snapshot={snapshot} />
          </section>
        ) : null}

        <div className="python-status" role="status" aria-live="polite">
          <strong>Python Service:</strong>{" "}
          {levelData
            ? `${levelData.source} (${levelData.level.platforms.length} platforms)`
            : "Waiting for response..."}
          {" · loot rolling: see HUD indicator in-game"}
        </div>
      </section>
    </main>
  );
}
