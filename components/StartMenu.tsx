"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type StartMenuProps = {
  onStart: () => void;
  onContinue: () => void;
  onDaily: () => void;
  onEnterSeed: (seed: string) => void;
  hasSave: boolean;
};

type MenuItem = {
  id: "continue" | "newRun" | "daily" | "enterSeed";
  label: string;
  color: string;
  glowColor: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const W = 800;
const H = 520;

// Rarity colors matching items.ts
const RARITY_COLORS = {
  common:   "#b0b0b0",
  uncommon: "#4ade80",
  rare:     "#60a5fa",
  epic:     "#c084fc",
} as const;

// Featured relic shown in the side panel — static teaser, rotates daily by day-of-year
const DAILY_RELICS = [
  { name: "Blazing Chaos Wand", rarity: "epic",     effect: "burn",      dmg: 18, spd: "1.8/s" },
  { name: "Vampiric Beast Claws", rarity: "rare",   effect: "lifesteal", dmg: 12, spd: "3.2/s" },
  { name: "Keen Laser Rifle",    rarity: "rare",    effect: "crit",      dmg: 18, spd: "1.4/s" },
  { name: "Frozen Spear",        rarity: "uncommon",effect: "freeze",    dmg: 8,  spd: "1.6/s" },
  { name: "Cursed Warhammer",    rarity: "epic",    effect: "curse",     dmg: 27, spd: "0.9/s" },
  { name: "Thunderstruck Sword", rarity: "uncommon",effect: "shock",     dmg: 11, spd: "2.0/s" },
  { name: "Swift Laser Pistol",  rarity: "rare",    effect: null,        dmg: 9,  spd: "3.4/s" },
] as const;

function getDailyRelic() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return DAILY_RELICS[dayOfYear % DAILY_RELICS.length];
}

// ─── Parallax star layers ─────────────────────────────────────────────────────

type Star = { x: number; y: number; r: number; speed: number; alpha: number };

function makeStars(count: number, seed: number): Star[] {
  // deterministic: same stars each render
  const stars: Star[] = [];
  let s = seed;
  const lcg = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
  for (let i = 0; i < count; i++) {
    stars.push({ x: lcg() * W, y: lcg() * H, r: 0.4 + lcg() * 1.2, speed: 0.06 + lcg() * 0.18, alpha: 0.3 + lcg() * 0.7 });
  }
  return stars;
}

// ─── Canvas draw helpers ───────────────────────────────────────────────────────

function pixelFont(size: number) {
  return `${size}px var(--font-pixel, "Courier New", monospace)`;
}

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// Shine sweep: returns 0..1 progress for a looping metallic shimmer
function shinePct(t: number, period = 3.5): number {
  return ((t % period) / period);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function StartMenu({ onStart, onContinue, onDaily, onEnterSeed, hasSave }: StartMenuProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
  const tRef = useRef<number>(0);
  const lastTRef = useRef<number>(0);
  const starsRef = useRef<Star[]>(makeStars(120, 0xdeadbeef));
  const mountainOffRef = useRef<number>(0);
  const cloudOffRef = useRef<number>(0);

  const [seedInput, setSeedInput] = useState("");
  const seedInputRef = useRef<HTMLInputElement | null>(null);

  // Menu items depend on hasSave
  const menuItems: MenuItem[] = [
    ...(hasSave ? [{ id: "continue" as const, label: "CONTINUE",   color: "#93c5fd", glowColor: "#3b82f6" }] : []),
    { id: "newRun",    label: "NEW RUN",     color: "#ffcc66", glowColor: "#d97706" },
    { id: "daily",     label: "DAILY SEED",  color: "#86efac", glowColor: "#16a34a" },
    { id: "enterSeed", label: "ENTER SEED",  color: "#d8b4fe", glowColor: "#7c3aed" },
  ];

  const [selectedIdx, setSelectedIdx] = useState(0);
  const selectedIdxRef = useRef(0);
  const [seedFormVisible, setSeedFormVisible] = useState(false);
  const seedFormVisibleRef = useRef(false);

  // Keep refs in sync with state so the rAF loop can read them without stale closure
  useEffect(() => { selectedIdxRef.current = selectedIdx; }, [selectedIdx]);
  useEffect(() => {
    seedFormVisibleRef.current = seedFormVisible;
    if (seedFormVisible) setTimeout(() => seedInputRef.current?.focus(), 40);
  }, [seedFormVisible]);

  // ── Activation ───────────────────────────────────────────────────────────────
  const activateSelected = useCallback(() => {
    const item = menuItems[selectedIdxRef.current];
    if (!item) return;
    switch (item.id) {
      case "continue":   onContinue(); break;
      case "newRun":     onStart(); break;
      case "daily":      onDaily(); break;
      case "enterSeed":
        setSeedFormVisible(true);
        break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSave, onContinue, onStart, onDaily]);

  // ── Keyboard / Gamepad navigation ────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (seedFormVisibleRef.current) {
        if (e.code === "Escape") { setSeedFormVisible(false); e.preventDefault(); }
        return; // seed input owns the keyboard while open
      }
      switch (e.code) {
        case "ArrowUp":
        case "KeyW":
          e.preventDefault();
          setSelectedIdx((i) => (i - 1 + menuItems.length) % menuItems.length);
          break;
        case "ArrowDown":
        case "KeyS":
          e.preventDefault();
          setSelectedIdx((i) => (i + 1) % menuItems.length);
          break;
        case "Enter":
        case "Space":
        case "KeyZ":
        case "KeyJ":
          e.preventDefault();
          activateSelected();
          break;
        case "Escape":
          setSeedFormVisible(false);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activateSelected, menuItems.length]);

  // Gamepad polling for title screen
  useEffect(() => {
    let frame = 0;
    let mounted = true;
    let prevUp = false;
    let prevDown = false;
    let prevA = false;

    const poll = () => {
      if (!mounted) return;
      if (!seedFormVisibleRef.current) {
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        const pad = Array.from(pads).find((p) => p && p.connected) ?? null;
        if (pad) {
          const up   = (pad.buttons[12]?.pressed ?? false) || (pad.axes[1] ?? 0) < -0.5;
          const down = (pad.buttons[13]?.pressed ?? false) || (pad.axes[1] ?? 0) >  0.5;
          const a    =  pad.buttons[0]?.pressed ?? false;
          if (up  && !prevUp)   setSelectedIdx((i) => (i - 1 + menuItems.length) % menuItems.length);
          if (down && !prevDown) setSelectedIdx((i) => (i + 1) % menuItems.length);
          if (a   && !prevA)    activateSelected();
          prevUp = up; prevDown = down; prevA = a;
        }
      }
      frame = requestAnimationFrame(poll);
    };
    frame = requestAnimationFrame(poll);
    return () => { mounted = false; cancelAnimationFrame(frame); };
  }, [activateSelected, menuItems.length]);

  // ── Canvas render loop ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const relic = getDailyRelic();
    const stars = starsRef.current;

    const draw = (now: number) => {
      const dt = Math.min((now - lastTRef.current) / 1000, 0.05);
      lastTRef.current = now;
      tRef.current += dt;
      const t = tRef.current;

      // Scroll layers
      mountainOffRef.current = (mountainOffRef.current + dt * 8) % W;
      cloudOffRef.current    = (cloudOffRef.current    + dt * 22) % W;

      // ── Resize to CSS size (device pixel ratio aware) ──────────────────────
      const dpr = window.devicePixelRatio || 1;
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
        canvas.width  = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
      }
      const cW = canvas.width;
      const cH = canvas.height;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cW, cH);

      // Scale all drawing to logical W×H
      const sx = cW / W;
      const sy = cH / H;
      ctx.save();
      ctx.scale(sx, sy);

      // ── 1. Deep space background gradient ────────────────────────────────
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0,    "#04091a");
      bg.addColorStop(0.55, "#0a1628");
      bg.addColorStop(1,    "#111c2e");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // ── 2. Stars (two parallax layers) ────────────────────────────────────
      for (const star of stars) {
        const px = ((star.x - cloudOffRef.current * star.speed) % W + W) % W;
        ctx.globalAlpha = star.alpha * (0.7 + 0.3 * Math.sin(t * 1.4 + star.x));
        ctx.fillStyle = "#c8d8f0";
        ctx.beginPath();
        ctx.arc(px, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // ── 3. Parallax silhouette mountains ─────────────────────────────────
      const drawMountainLayer = (off: number, yBase: number, color: string, peaks: [number, number][]) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(-off, H);
        for (const [mx, my] of peaks) {
          ctx.lineTo(mx - off, my);
        }
        ctx.lineTo(W - off + 40, H);
        ctx.closePath();
        ctx.fill();
        // tiled repeat
        ctx.beginPath();
        ctx.moveTo(W - off, H);
        for (const [mx, my] of peaks) {
          ctx.lineTo(mx - off + W, my);
        }
        ctx.lineTo(W - off + W + 40, H);
        ctx.lineTo(W - off + W, yBase);
        ctx.closePath();
        ctx.fill();
      };

      const farPeaks: [number,number][] = [
        [0,H],[60,260],[140,210],[240,250],[320,190],[420,230],[500,195],[600,240],[680,215],[780,260],[W,H]
      ];
      const nearPeaks: [number,number][] = [
        [0,H],[40,340],[110,295],[200,330],[300,280],[390,320],[470,285],[560,325],[660,295],[760,335],[W,H]
      ];
      drawMountainLayer(mountainOffRef.current * 0.4, H, "#0d1e30", farPeaks);
      drawMountainLayer(mountainOffRef.current,       H, "#0a1626", nearPeaks);

      // Ground strip
      const grd = ctx.createLinearGradient(0, H - 38, 0, H);
      grd.addColorStop(0, "#0e2038");
      grd.addColorStop(1, "#081122");
      ctx.fillStyle = grd;
      ctx.fillRect(0, H - 38, W, 38);

      // ── 4. Side panel — High Scores / Daily Bounty ────────────────────────
      const panelX = W - 202;
      const panelY = 84;
      const panelW = 190;
      const panelH = 300;

      ctx.globalAlpha = 0.82;
      drawRoundRect(ctx, panelX, panelY, panelW, panelH, 6);
      ctx.fillStyle = "#060e1c";
      ctx.fill();
      ctx.strokeStyle = "#1e3a5f";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Panel header
      ctx.fillStyle = "#60a5fa";
      ctx.font = pixelFont(7);
      ctx.textAlign = "center";
      ctx.fillText("DAILY BOUNTY", panelX + panelW / 2, panelY + 16);

      // Divider
      ctx.strokeStyle = "#1e3a5f";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(panelX + 8,  panelY + 22);
      ctx.lineTo(panelX + panelW - 8, panelY + 22);
      ctx.stroke();

      // Relic diamond icon
      const relicColor = RARITY_COLORS[relic.rarity as keyof typeof RARITY_COLORS] ?? "#fff";
      const iconX = panelX + panelW / 2;
      const iconY = panelY + 50;
      ctx.save();
      ctx.translate(iconX, iconY);
      ctx.rotate(Math.PI / 4 + Math.sin(t * 0.7) * 0.08);
      ctx.fillStyle = relicColor;
      ctx.globalAlpha = 0.9 + 0.1 * Math.sin(t * 1.2);
      ctx.fillRect(-10, -10, 20, 20);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.strokeRect(-10, -10, 20, 20);
      ctx.restore();

      // Relic glow pulse
      ctx.save();
      const glowA = 0.12 + 0.08 * Math.sin(t * 1.5);
      const glowRad = ctx.createRadialGradient(iconX, iconY, 2, iconX, iconY, 28);
      glowRad.addColorStop(0, relicColor.replace(")", `, ${glowA})`).replace("rgb", "rgba").replace("#", "rgba(0,0,0,"));
      ctx.globalAlpha = glowA * 3;
      ctx.fillStyle = relicColor;
      ctx.beginPath();
      ctx.arc(iconX, iconY, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();

      // Relic name (word-wrap to two lines)
      ctx.fillStyle = relicColor;
      ctx.font = pixelFont(6);
      ctx.textAlign = "center";
      const words = relic.name.split(" ");
      const mid = Math.ceil(words.length / 2);
      ctx.fillText(words.slice(0, mid).join(" "), panelX + panelW / 2, iconY + 32);
      ctx.fillText(words.slice(mid).join(" "),    panelX + panelW / 2, iconY + 42);

      ctx.fillStyle = "#9fb2c7";
      ctx.font = pixelFont(5.5);
      ctx.fillText(`${relic.rarity.toUpperCase()}`, panelX + panelW / 2, iconY + 56);
      ctx.fillStyle = "#e5e7eb";
      ctx.fillText(`DMG ${relic.dmg}  SPD ${relic.spd}`, panelX + panelW / 2, iconY + 68);
      if (relic.effect) {
        ctx.fillStyle = relicColor;
        ctx.fillText(`[${relic.effect.toUpperCase()}]`, panelX + panelW / 2, iconY + 80);
      }

      // High Scores header
      ctx.strokeStyle = "#1e3a5f";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(panelX + 8,  panelY + 148);
      ctx.lineTo(panelX + panelW - 8, panelY + 148);
      ctx.stroke();

      ctx.fillStyle = "#facc15";
      ctx.font = pixelFont(6.5);
      ctx.fillText("HIGH SCORES", panelX + panelW / 2, panelY + 162);

      const scores = [
        { name: "YOU?",  score: "---",    time: "--:--" },
        { name: "???",   score: "9999",   time: "12:34" },
        { name: "AAA",   score: "7420",   time: "18:02" },
      ];
      ctx.font = pixelFont(5.5);
      scores.forEach((s, i) => {
        const ry = panelY + 180 + i * 34;
        ctx.fillStyle = i === 0 ? "#ffcc66" : "#9fb2c7";
        ctx.textAlign = "left";
        ctx.fillText(`${i + 1}. ${s.name}`, panelX + 10, ry);
        ctx.textAlign = "right";
        ctx.fillText(s.score, panelX + panelW - 10, ry);
        ctx.fillStyle = "#4a6a8a";
        ctx.textAlign = "center";
        ctx.fillText(s.time, panelX + panelW / 2, ry + 12);
      });

      ctx.textAlign = "left";

      // ── 5. Stylized title block ───────────────────────────────────────────
      const titleX = W / 2 - 96;
      const titleCX = W / 2;
      // Float animation
      const titleY = 52 + Math.sin(t * 0.9) * 3.5;

      // Drop shadow
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = "#000";
      ctx.font = pixelFont(28);
      ctx.textAlign = "center";
      ctx.fillText("NEXT", titleCX + 3, titleY + 3);
      ctx.fillText("CHAPTER", titleCX + 3, titleY + 33);
      ctx.globalAlpha = 1;

      // Main title gradient — gold → amber → white shimmer
      const shine = shinePct(t, 3.2);
      const titleGrad = ctx.createLinearGradient(titleX, titleY - 28, titleX + 192, titleY + 5);
      titleGrad.addColorStop(0,                       "#d97706");
      titleGrad.addColorStop(Math.max(0, shine - 0.1),"#ffcc66");
      titleGrad.addColorStop(shine,                   "#fffbe6");
      titleGrad.addColorStop(Math.min(1, shine + 0.1),"#ffcc66");
      titleGrad.addColorStop(1,                       "#d97706");

      ctx.font = pixelFont(28);
      ctx.textAlign = "center";
      ctx.fillStyle = titleGrad;
      ctx.fillText("NEXT", titleCX, titleY);
      ctx.fillText("CHAPTER", titleCX, titleY + 30);

      // Subtitle
      ctx.font = pixelFont(8);
      ctx.fillStyle = "#60a5fa";
      ctx.fillText("RETRO GAME", titleCX, titleY + 48);

      // Thin underline accent
      const ulW = 200;
      const ulGrad = ctx.createLinearGradient(titleCX - ulW / 2, 0, titleCX + ulW / 2, 0);
      ulGrad.addColorStop(0,   "transparent");
      ulGrad.addColorStop(0.5, "#60a5fa");
      ulGrad.addColorStop(1,   "transparent");
      ctx.strokeStyle = ulGrad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(titleCX - ulW / 2, titleY + 55);
      ctx.lineTo(titleCX + ulW / 2, titleY + 55);
      ctx.stroke();

      // ── 6. Menu items with animated cursor sword ──────────────────────────
      const menuStartY = 165;
      const menuItemH  = 36;
      const menuX      = 138;

      const curSel = selectedIdxRef.current;

      menuItems.forEach((item, i) => {
        const iy = menuStartY + i * menuItemH;
        const isSelected = i === curSel;

        // Selected: glowing pill background
        if (isSelected) {
          ctx.globalAlpha = 0.18 + 0.06 * Math.sin(t * 3);
          drawRoundRect(ctx, menuX - 24, iy - 14, 260, 22, 4);
          ctx.fillStyle = item.glowColor;
          ctx.fill();
          ctx.globalAlpha = 1;

          ctx.strokeStyle = item.glowColor;
          ctx.lineWidth = 1;
          drawRoundRect(ctx, menuX - 24, iy - 14, 260, 22, 4);
          ctx.stroke();
        }

        // Sword cursor
        if (isSelected) {
          const swX = menuX - 20;
          const swY = iy - 5;
          const bob = Math.sin(t * 6) * 1.5;
          ctx.save();
          ctx.translate(swX + bob, swY);
          // Blade
          ctx.fillStyle = "#e5e7eb";
          ctx.fillRect(0, -1, 10, 2);
          // Guard
          ctx.fillStyle = "#ffcc66";
          ctx.fillRect(9, -3, 2, 6);
          // Hilt
          ctx.fillStyle = "#b45309";
          ctx.fillRect(11, -1.5, 5, 3);
          // Glow
          ctx.globalAlpha = 0.4 + 0.2 * Math.sin(t * 4);
          ctx.strokeStyle = item.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(10, 0);
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.restore();
        }

        // Menu label
        ctx.font = pixelFont(isSelected ? 11 : 9);
        ctx.textAlign = "left";
        ctx.fillStyle = isSelected
          ? item.color
          : `${item.color}99`;
        ctx.fillText(item.label, menuX, iy);
      });

      // ── 7. Controls legend at bottom ──────────────────────────────────────
      const legendY = H - 72;

      ctx.globalAlpha = 0.7;
      drawRoundRect(ctx, 8, legendY - 4, panelX - 22, 70, 5);
      ctx.fillStyle = "#050d1a";
      ctx.fill();
      ctx.strokeStyle = "#1a2e44";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.font = pixelFont(5.5);
      ctx.textAlign = "left";

      // Helper: draw a key chip
      const drawKey = (label: string, x: number, y: number, w = 28) => {
        ctx.fillStyle = "#0e1e2e";
        ctx.strokeStyle = "#4a6a8a";
        ctx.lineWidth = 1;
        drawRoundRect(ctx, x, y - 7, w, 11, 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#93c5fd";
        ctx.textAlign = "center";
        ctx.fillText(label, x + w / 2, y + 1);
        ctx.textAlign = "left";
      };

      // Row 1: movement
      ctx.fillStyle = "#6b8fa8";
      ctx.fillText("MOVE", 16, legendY + 8);
      drawKey("A/D", 52, legendY + 8, 30);
      drawKey("←→", 85, legendY + 8, 24);
      ctx.fillStyle = "#6b8fa8";
      ctx.fillText("JUMP", 116, legendY + 8);
      drawKey("SPC", 150, legendY + 8, 28);
      drawKey("Z", 182, legendY + 8, 18);
      ctx.fillText("ATTACK", 208, legendY + 8);
      drawKey("X", 252, legendY + 8, 18);
      drawKey("J", 274, legendY + 8, 18);

      // Row 2
      ctx.fillStyle = "#6b8fa8";
      ctx.fillText("DODGE", 16, legendY + 26);
      drawKey("C", 55, legendY + 26, 18);
      ctx.fillText("SWAP", 80, legendY + 26);
      drawKey("V", 112, legendY + 26, 18);
      ctx.fillText("PAUSE", 136, legendY + 26);
      drawKey("ESC", 173, legendY + 26, 28);
      ctx.fillText("MENU", 208, legendY + 26);
      drawKey("TAB", 243, legendY + 26, 26);

      // Row 3: gamepad
      ctx.fillStyle = "#4ade80";
      ctx.font = pixelFont(5);
      ctx.fillText("XBOX:", 16, legendY + 44);
      ctx.fillStyle = "#6b8fa8";
      ctx.font = pixelFont(5.5);

      // Xbox button icons (colored circles)
      const xboxBtn = (label: string, col: string, x: number, y: number) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(x, y - 3, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = pixelFont(4.5);
        ctx.textAlign = "center";
        ctx.fillText(label, x, y - 0.5);
        ctx.textAlign = "left";
        ctx.font = pixelFont(5.5);
      };

      xboxBtn("A", "#16a34a", 58,  legendY + 44);
      ctx.fillText("jump", 66, legendY + 44);
      xboxBtn("X", "#1d4ed8", 100, legendY + 44);
      ctx.fillText("atk", 108, legendY + 44);
      xboxBtn("B", "#b91c1c", 134, legendY + 44);
      ctx.fillText("dodge", 142, legendY + 44);
      xboxBtn("Y", "#92400e", 178, legendY + 44);
      ctx.fillText("swap", 186, legendY + 44);
      ctx.fillStyle = "#9fb2c7";
      ctx.fillText("LB/LT dodge  RB/RT atk  START pause", 215, legendY + 44);

      // ── 8. CRT scanlines ──────────────────────────────────────────────────
      ctx.globalAlpha = 0.045;
      ctx.fillStyle = "#000";
      for (let y = 0; y < H; y += 3) {
        ctx.fillRect(0, y, W, 1);
      }
      ctx.globalAlpha = 1;

      // ── 9. Corner decorations ─────────────────────────────────────────────
      const cornerDeco = (cx: number, cy: number, dx: number, dy: number) => {
        ctx.strokeStyle = "#2a4a6a";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy + dy * 14);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx + dx * 14, cy);
        ctx.stroke();
      };
      cornerDeco(6, 6, 1, 1);
      cornerDeco(W - 6, 6, -1, 1);
      cornerDeco(6, H - 6, 1, -1);
      cornerDeco(W - 6, H - 6, -1, -1);

      // ── 10. Version / seed hint ───────────────────────────────────────────
      ctx.font = pixelFont(5);
      ctx.fillStyle = "#2a4a6a";
      ctx.textAlign = "right";
      ctx.fillText("v0.1.0  |  24 ROOMS  |  DIABLO LOOT", W - 10, H - 6);
      ctx.textAlign = "left";

      ctx.restore(); // end logical scale

      rafRef.current = requestAnimationFrame(draw);
    };

    lastTRef.current = performance.now();
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  // menuItems changes reference each render — only re-create loop when hasSave changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSave]);

  // ── Canvas click / tap → menu item hit-test ────────────────────────────────
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (seedFormVisibleRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const lx = ((e.clientX - rect.left) / rect.width)  * W;
    const ly = ((e.clientY - rect.top)  / rect.height) * H;
    const menuStartY = 165;
    const menuItemH  = 36;
    const menuX      = 138;
    menuItems.forEach((_, i) => {
      const iy = menuStartY + i * menuItemH;
      if (lx >= menuX - 24 && lx <= menuX + 236 && ly >= iy - 14 && ly <= iy + 8) {
        setSelectedIdx(i);
        selectedIdxRef.current = i;
        activateSelected();
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activateSelected, hasSave]);

  return (
    <div className="start-screen-wrap">
      <canvas
        ref={canvasRef}
        className="start-screen-canvas"
        onClick={handleCanvasClick}
        aria-label="Start screen — use arrow keys or D-pad to navigate, Enter / A to select"
        role="application"
      />
      {/* Seed input — floats over canvas, shown only when "Enter Seed" is selected & activated */}
      <form
        className={`start-seed-form${seedFormVisible ? "" : " hidden"}`}
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = seedInput.trim();
          if (trimmed) {
            setSeedFormVisible(false);
            onEnterSeed(trimmed);
          }
        }}
      >
        <input
          ref={seedInputRef}
          type="text"
          className="start-seed-input"
          value={seedInput}
          onChange={(e) => setSeedInput(e.target.value)}
          placeholder="WOLF-4207"
          aria-label="Run seed"
          spellCheck={false}
          autoComplete="off"
        />
        <button
          type="submit"
          className="start-seed-submit"
          disabled={!seedInput.trim()}
        >
          PLAY
        </button>
        <button
          type="button"
          className="start-seed-submit"
          onClick={() => setSeedFormVisible(false)}
        >
          ESC
        </button>
      </form>
    </div>
  );
}
