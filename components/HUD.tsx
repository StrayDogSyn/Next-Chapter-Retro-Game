type HUDProps = {
  score: number;
  lives: number;
};

export function HUD({ score, lives }: HUDProps) {
  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        left: 8,
        right: 8,
        display: "flex",
        justifyContent: "space-between",
        color: "#f8fafc",
        fontSize: "14px",
        textShadow: "1px 1px 0 #000",
        pointerEvents: "none",
      }}
    >
      <span>Score: {Math.floor(score)}</span>
      <span>Lives: {lives}</span>
    </div>
  );
}
