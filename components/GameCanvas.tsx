"use client";

import { useEffect, useRef, useState } from "react";
import { HUD } from "@/components/HUD";
import { Game, VIEW_H, VIEW_W, type HudSnapshot } from "@/lib/game/game";

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [snapshot, setSnapshot] = useState<HudSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let game: Game | null = null;
    try {
      game = new Game(canvas);
      game.onSnapshot = setSnapshot;
      game.start().catch((err: unknown) => {
        console.error("[game] failed to start:", err);
        setError(err instanceof Error ? err.message : String(err));
      });
    } catch (err) {
      console.error("[game] failed to construct:", err);
      setError(err instanceof Error ? err.message : String(err));
    }

    return () => {
      game?.destroy();
    };
  }, []);

  return (
    <div
      style={{
        position: "relative",
        border: "2px solid #6b7280",
        width: VIEW_W,
        maxWidth: "100%",
      }}
    >
      <HUD snapshot={snapshot} />
      {error ? (
        <div style={{ color: "#f87171", padding: 16, fontFamily: "monospace" }}>
          Failed to start game: {error}
        </div>
      ) : null}
      <canvas
        ref={canvasRef}
        width={VIEW_W}
        height={VIEW_H}
        style={{
          imageRendering: "pixelated",
          display: "block",
          width: "100%",
          height: "auto",
          background: "#0b1020",
        }}
      />
    </div>
  );
}
