"use client";

import { useState } from "react";

type StartMenuProps = {
  onStart: () => void;
  onContinue: () => void;
  onDaily: () => void;
  onEnterSeed: (seed: string) => void;
  hasSave: boolean;
};

const buttonStyle = (border: string, bg: string, color: string) => ({
  padding: "0.5rem 0.75rem",
  border: `2px solid ${border}`,
  background: bg,
  color,
  fontFamily: "inherit",
  cursor: "pointer",
});

export function StartMenu({ onStart, onContinue, onDaily, onEnterSeed, hasSave }: StartMenuProps) {
  const [seedInput, setSeedInput] = useState("");

  return (
    <div style={{ marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
        {hasSave ? (
          <button type="button" onClick={onContinue} style={buttonStyle("#60a5fa", "#1e3a5f", "#93c5fd")}>
            Continue Game
          </button>
        ) : null}
        <button type="button" onClick={onStart} style={buttonStyle("#ffcc66", "#2d4660", "#ffcc66")}>
          New Run
        </button>
        <button
          type="button"
          onClick={onDaily}
          style={buttonStyle("#4ade80", "#1e3a2e", "#86efac")}
          title="Everyone playing today gets the same seed"
        >
          Daily Seed
        </button>
      </div>
      <form
        style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = seedInput.trim();
          if (trimmed) onEnterSeed(trimmed);
        }}
      >
        <input
          type="text"
          value={seedInput}
          onChange={(e) => setSeedInput(e.target.value)}
          placeholder="Enter a seed (e.g. WOLF-4207)"
          style={{
            padding: "0.4rem 0.6rem",
            border: "2px solid #47627d",
            background: "#0b1622",
            color: "#e5e7eb",
            fontFamily: "inherit",
            fontSize: "0.85rem",
          }}
        />
        <button type="submit" disabled={!seedInput.trim()} style={buttonStyle("#9f7aea", "#2a2050", "#d6bcfa")}>
          Play Seed
        </button>
      </form>
    </div>
  );
}
