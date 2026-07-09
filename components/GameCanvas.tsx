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
  const gamepadMenuPressedRef = useRef(false);
  const [snapshot, setSnapshot] = useState<HudSnapshot | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;

    const updateCanvasSize = () => {
      const rect = stage.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const dpr = window.devicePixelRatio || 1;
      const pixelWidth = Math.max(1, Math.floor(rect.width * dpr));
      const pixelHeight = Math.max(1, Math.floor(rect.height * dpr));
      if (gameRef.current) {
        gameRef.current.resizeViewport(pixelWidth, pixelHeight);
      } else if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
    };

    // Ensure deterministic first frame sizing before starting the game loop.
    updateCanvasSize();

    const game = new Game(canvas);
    gameRef.current = game;
    game.onSnapshot = (snap) => {
      setSnapshot(snap);
      onSnapshot(snap);
    };
    void game.start(continueFromSave);
    const observer = new ResizeObserver(updateCanvasSize);
    observer.observe(stage);
    handleFocus();

    return () => {
      observer.disconnect();
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
    let mounted = true;
    const poll = () => {
      if (!mounted) return;
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
    return () => {
      mounted = false;
      cancelAnimationFrame(frame);
    };
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
              width: "100%",
              height: "100%",
            }}
          />
        </div>
        <GameHudOverlay snapshot={snapshot} onToggleMenu={() => setMenuOpen((open) => !open)} onCopySeed={copySeed} />
        <GameMenuModal open={menuOpen} snapshot={snapshot} onClose={() => setMenuOpen(false)} />
      </div>
    </div>
  );
}
