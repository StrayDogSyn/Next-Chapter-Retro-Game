type StartMenuProps = {
  onStart: () => void;
  onContinue: () => void;
  hasSave: boolean;
};

export function StartMenu({ onStart, onContinue, hasSave }: StartMenuProps) {
  return (
    <div style={{ marginBottom: "1rem", display: "flex", gap: "0.6rem" }}>
      {hasSave ? (
        <button
          type="button"
          onClick={onContinue}
          style={{
            padding: "0.5rem 0.75rem",
            border: "2px solid #60a5fa",
            background: "#1e3a5f",
            color: "#93c5fd",
            fontFamily: "inherit",
            cursor: "pointer",
          }}
        >
          Continue Game
        </button>
      ) : null}
      <button
        type="button"
        onClick={onStart}
        style={{
          padding: "0.5rem 0.75rem",
          border: "2px solid #ffcc66",
          background: "#2d4660",
          color: "#ffcc66",
          fontFamily: "inherit",
          cursor: "pointer",
        }}
      >
        Start Showcase
      </button>
    </div>
  );
}
