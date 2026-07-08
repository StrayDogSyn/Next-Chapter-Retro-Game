"use client";

import { useEffect, useRef, useState } from "react";
import { HUD } from "@/components/HUD";
import { Game, VIEW_W, VIEW_H, type HudSnapshot } from "@/lib/game/game";

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [snapshot, setSnapshot] = useState<HudSnapshot | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = new Game(canvas);
    game.onSnapshot = (snap) => setSnapshot(snap);
    void game.start();

    return () => {
      game.destroy();
    };
  }, []);

  return (
    <div style={{ position: "relative", border: "2px solid #6b7280", width: VIEW_W }}>
      <HUD snapshot={snapshot} />
      <canvas
        ref={canvasRef}
        width={VIEW_W}
        height={VIEW_H}
        style={{ imageRendering: "pixelated", display: "block", width: "100%", height: "auto" }}
      />
    </div>
  );
}
