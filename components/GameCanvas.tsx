"use client";

import { useEffect, useRef, useState } from "react";
import { Game, VIEW_W, VIEW_H, type HudSnapshot } from "@/lib/game/game";
import { GameHudOverlay } from "@/components/GameHudOverlay";
import { GameMenuModal } from "@/components/GameMenuModal";

type GameCanvasProps = {
  onSnapshot: (snapshot: HudSnapshot) => void;
  continueFromSave?: boolean;
};

export function GameCanvas({ onSnapshot, continueFromSave = false }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [snapshot, setSnapshot] = useState<HudSnapshot | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const gamepadMenuPressedRef = useRef(false);
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number }>({
    width: VIEW_W,
    height: VIEW_H,
  });

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const computeSize = () => {
      const { width: maxW, height: maxH } = stage.getBoundingClientRect();
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
    observer.observe(stage);
    computeSize();

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = new Game(canvas);
    gameRef.current = game;
    game.onSnapshot = (snap) => {
      setSnapshot(snap);
      onSnapshot(snap);
    };
    void game.start(continueFromSave);
    handleFocus();

    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, [onSnapshot, continueFromSave]);

  const handleFocus = () => {
    shellRef.current?.focus();
  };

  useEffect(() => {
    const onFocus = () => {
      handleFocus();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const toggleFullscreen = async () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (document.fullscreenElement === viewport) {
      await document.exitFullscreen();
      return;
    }
    await viewport.requestFullscreen();
    handleFocus();
  };

  useEffect(() => {
    gameRef.current?.setUiModalOpen(menuOpen);
  }, [menuOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Tab" || event.code === "KeyI") {
        event.preventDefault();
        setMenuOpen((open) => !open);
      }
      if (event.code === "Escape" && menuOpen) {
        event.preventDefault();
        setMenuOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    let frame = 0;
    const poll = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const firstConnected = Array.from(pads).find((pad) => pad && pad.connected);
      const pressed = Boolean(
        firstConnected &&
          ((firstConnected.buttons[9] && firstConnected.buttons[9].pressed) ||
            (firstConnected.buttons[8] && firstConnected.buttons[8].pressed)),
      );

      if (pressed && !gamepadMenuPressedRef.current) {
        setMenuOpen((open) => !open);
      }
      gamepadMenuPressedRef.current = pressed;
      frame = requestAnimationFrame(poll);
    };

    frame = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frame);
  }, []);

  const copySeed = async () => {
    if (!snapshot?.seed) return;
    try {
      await navigator.clipboard.writeText(snapshot.seed);
    } catch {
      // Ignore clipboard failures in unsupported environments.
    }
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
      <div
        id="game-stage-viewport"
        className="relative w-full aspect-video bg-slate-950 overflow-hidden"
        ref={viewportRef}
      >
        <div className="game-canvas-stage" ref={stageRef}>
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
        <GameHudOverlay snapshot={snapshot} onToggleMenu={() => setMenuOpen((open) => !open)} onCopySeed={copySeed} />
        <GameMenuModal open={menuOpen} snapshot={snapshot} onClose={() => setMenuOpen(false)} />
      </div>
    </div>
  );
}
