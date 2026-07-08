"use client";

import { useEffect, useRef, useState } from "react";
import { Game, VIEW_W, VIEW_H, type HudSnapshot } from "@/lib/game/game";

type GameCanvasProps = {
  onSnapshot: (snapshot: HudSnapshot) => void;
};

export function GameCanvas({ onSnapshot }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number }>({
    width: VIEW_W,
    height: VIEW_H,
  });

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const computeSize = () => {
      const { width: maxW, height: maxH } = shell.getBoundingClientRect();
      if (maxW <= 0 || maxH <= 0) return;

      const fitScale = Math.min(maxW / VIEW_W, maxH / VIEW_H);
      const integerScale = Math.floor(fitScale);
      const scale = integerScale >= 1 ? integerScale : fitScale;
      const clamped = Math.max(0.25, scale);

      setDisplaySize({
        width: Math.max(1, Math.floor(VIEW_W * clamped)),
        height: Math.max(1, Math.floor(VIEW_H * clamped)),
      });
    };

    const observer = new ResizeObserver(computeSize);
    observer.observe(shell);
    computeSize();

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = new Game(canvas);
    game.onSnapshot = (snap) => onSnapshot(snap);
    void game.start();
    handleFocus();

    return () => {
      game.destroy();
    };
  }, [onSnapshot]);

  const handleFocus = () => {
    shellRef.current?.focus();
  };

  const toggleFullscreen = async () => {
    const shell = shellRef.current;
    if (!shell) return;
    if (document.fullscreenElement === shell) {
      await document.exitFullscreen();
      return;
    }
    await shell.requestFullscreen();
    handleFocus();
  };

  return (
    <div
      className="game-canvas-shell"
      ref={shellRef}
      tabIndex={0}
      onMouseDown={handleFocus}
      onTouchStart={handleFocus}
    >
      <button type="button" className="fullscreen-toggle" onClick={toggleFullscreen}>
        fullscreen
      </button>
      <div className="game-canvas-stage">
        <canvas
          ref={canvasRef}
          width={VIEW_W}
          height={VIEW_H}
          style={{
            imageRendering: "pixelated",
            display: "block",
            width: displaySize.width,
            height: displaySize.height,
          }}
        />
      </div>
    </div>
  );
}
