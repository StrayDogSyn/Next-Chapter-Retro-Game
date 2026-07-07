"use client";

import { useEffect, useState } from "react";
import { GameCanvas } from "@/components/GameCanvas";
import { StartMenu } from "@/components/StartMenu";

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
          A beginner-friendly SNES-styled platformer scaffold with a custom
          canvas loop and a Python-powered level endpoint.
        </p>

        {!gameStarted ? (
          <StartMenu onStart={() => setGameStarted(true)} />
        ) : (
          <GameCanvas />
        )}

        <div className="python-status" role="status" aria-live="polite">
          <strong>Python Service:</strong>{" "}
          {levelData
            ? `${levelData.source} (${levelData.level.platforms.length} platforms)`
            : "Waiting for response..."}
        </div>
      </section>
    </main>
  );
}
