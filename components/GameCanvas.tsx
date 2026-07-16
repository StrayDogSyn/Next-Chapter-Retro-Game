"use client";

import { useEffect, useRef, useState } from "react";
import { Game, VIEW_W, VIEW_H, type HudSnapshot } from "@/lib/game/game";
import { GameHudOverlay } from "@/components/GameHudOverlay";
import { GameMenuModal } from "@/components/GameMenuModal";
import { TouchControlsOverlay } from "@/components/TouchControlsOverlay";
import { TouchInputManager, type TouchRenderState } from "@/lib/game/touchInput";

type TouchControlsPreference = "auto" | "on" | "off";

const TOUCH_CONTROLS_KEY = "ncrg:touchControls";

type GameCanvasProps = {
  onSnapshot: (snapshot: HudSnapshot) => void;
  continueFromSave?: boolean;
  seedOverride?: string;
  onGiveUp?: () => void;
};

export function GameCanvas({ onSnapshot, continueFromSave = false, seedOverride, onGiveUp }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const gamepadMenuPressedRef = useRef(false);
  const lastPhysicalInputAtRef = useRef(0);
  const touchInputRef = useRef<TouchInputManager | null>(null);
  const [snapshot, setSnapshot] = useState<HudSnapshot | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [touchPreference, setTouchPreference] = useState<TouchControlsPreference>("auto");
  const [touchSeen, setTouchSeen] = useState(false);
  const [touchState, setTouchState] = useState<TouchRenderState>({
    scheme: "virtualGamepad",
    active: false,
    visible: true,
    ghosted: false,
    joystick: { baseX: 0, baseY: 0, knobX: 0, knobY: 0, radius: 64, engaged: false },
    buttons: [],
    hotbar: [],
  });
  const [touchCapable, setTouchCapable] = useState(false);
  const [isLandscape, setIsLandscape] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setTouchCapable("ontouchstart" in window || navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches);
    setIsLandscape(window.innerWidth >= window.innerHeight);

    const stored = localStorage.getItem(TOUCH_CONTROLS_KEY);
    if (stored === "auto" || stored === "on" || stored === "off") {
      setTouchPreference(stored);
    }

    const updateOrientation = () => {
      setIsLandscape(window.innerWidth >= window.innerHeight);
    };
    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);
    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(TOUCH_CONTROLS_KEY, touchPreference);
  }, [touchPreference]);

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
      touchInputRef.current?.setViewportRect(rect);
    };

    // Ensure deterministic first frame sizing before starting the game loop.
    updateCanvasSize();

    const touchInput = new TouchInputManager({ onRenderStateChange: setTouchState });
    touchInput.setViewportRect(stage.getBoundingClientRect());
    touchInput.bind(stage);
    touchInputRef.current = touchInput;

    const game = new Game(canvas, { seedOverride, touchInput });
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
      touchInput.destroy();
      touchInputRef.current = null;
      gameRef.current = null;
    };
  }, [onSnapshot, continueFromSave, seedOverride]);

  useEffect(() => {
    const now = performance.now();
    const physicalActive = now - lastPhysicalInputAtRef.current < 1700;
    const touchEnabled = touchCapable && touchPreference !== "off";
    const visible =
      touchCapable &&
      touchPreference !== "off" &&
      (touchPreference === "on" || (touchPreference === "auto" && touchSeen && !physicalActive));
    const ghosted = visible && (!touchState.active || touchPreference === "auto");
    touchInputRef.current?.setEnabled(touchEnabled);
    touchInputRef.current?.setVisible(visible, ghosted);
  }, [touchCapable, touchPreference, touchSeen, touchState.active]);

  const handleFocus = () => {
    shellRef.current?.focus();
  };

  useEffect(() => {
    const onFocus = () => {
      handleFocus();
    };
    const onKeyDown = () => {
      lastPhysicalInputAtRef.current = performance.now();
    };
    const onMouseDown = () => {
      lastPhysicalInputAtRef.current = performance.now();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("keydown", onKeyDown, { capture: true });
    window.addEventListener("mousedown", onMouseDown, { capture: true });
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("keydown", onKeyDown, { capture: true });
      window.removeEventListener("mousedown", onMouseDown, { capture: true });
    };
  }, []);

  const toggleFullscreen = async () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    try {
      if (document.fullscreenElement === viewport) {
        await document.exitFullscreen();
        handleFocus();
        return;
      }
      await viewport.requestFullscreen();
      handleFocus();
    } catch {
      // Fullscreen can be denied by browser policy or embedding context.
    }
  };

  useEffect(() => {
    gameRef.current?.setUiModalOpen(menuOpen);
  }, [menuOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape" && snapshot?.phase === "dead") {
        event.preventDefault();
        setMenuOpen(false);
        onGiveUp?.();
        return;
      }
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
  }, [menuOpen, onGiveUp, snapshot?.phase]);

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
        lastPhysicalInputAtRef.current = performance.now();
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

  // Inventory actions (Game holds the real state; these just forward the
  // call). No manual snapshot refresh needed - pushSnapshot() already runs
  // on a ~100ms throttle every frame regardless of menu state, so the next
  // tick picks up the mutation.
  const equipBagItem = (index: number) => gameRef.current?.equipBagItem(index);
  const sellBagItem = (index: number) => gameRef.current?.sellBagItem(index);
  const scrapBagItem = (index: number) => gameRef.current?.scrapBagItem(index);
  const sellEquipped = (slot: "primary" | "secondary") => gameRef.current?.sellEquipped(slot);
  const scrapEquipped = (slot: "primary" | "secondary") => gameRef.current?.scrapEquipped(slot);

  return (
    <div
      className="game-canvas-shell"
      ref={shellRef}
      tabIndex={0}
      onMouseDown={handleFocus}
      onTouchStart={handleFocus}
      onPointerDown={(event) => {
        if (event.pointerType !== "touch") return;
        setTouchSeen(true);
      }}
    >
      <div className="stage-toolbar">
        {touchCapable ? (
          <div className="touch-pref-toolbar" role="group" aria-label="Touch controls mode">
            <button type="button" className="fullscreen-toggle" onClick={() => setTouchPreference("auto")} aria-pressed={touchPreference === "auto"}>auto</button>
            <button type="button" className="fullscreen-toggle" onClick={() => setTouchPreference("on")} aria-pressed={touchPreference === "on"}>on</button>
            <button type="button" className="fullscreen-toggle" onClick={() => setTouchPreference("off")} aria-pressed={touchPreference === "off"}>off</button>
          </div>
        ) : null}
        <button type="button" className="fullscreen-toggle" onClick={toggleFullscreen}>
          fullscreen
        </button>
      </div>
      <div
        id="game-stage-viewport"
        className="relative w-full bg-slate-950 overflow-hidden"
        ref={viewportRef}
      >
        <div className="game-canvas-stage" ref={stageRef}>
          <canvas
            className="game-stage-canvas"
            ref={canvasRef}
            width={VIEW_W}
            height={VIEW_H}
          />
        </div>
        <TouchControlsOverlay state={touchState} visible={touchCapable && touchState.visible} />
        {touchCapable && !isLandscape ? (
          <div className="rotate-overlay" role="status" aria-live="polite">
            <strong>Rotate device for landscape</strong>
            <span>You can still play in portrait, but controls are tighter.</span>
          </div>
        ) : null}
        <GameHudOverlay snapshot={snapshot} onToggleMenu={() => setMenuOpen((open) => !open)} onCopySeed={copySeed} />
        <GameMenuModal
          open={menuOpen}
          snapshot={snapshot}
          onClose={() => setMenuOpen(false)}
          onEquipBagItem={equipBagItem}
          onSellBagItem={sellBagItem}
          onScrapBagItem={scrapBagItem}
          onSellEquipped={sellEquipped}
          onScrapEquipped={scrapEquipped}
        />
      </div>
    </div>
  );
}
