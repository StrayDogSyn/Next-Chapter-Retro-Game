type StartMenuProps = {
  onStart: () => void;
};

export function StartMenu({ onStart }: StartMenuProps) {
  return (
    <div style={{ marginBottom: "1rem" }}>
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
