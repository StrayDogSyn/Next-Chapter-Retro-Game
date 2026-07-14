import { describe, expect, it, vi } from "vitest";
import { loadWorld, T_EMPTY } from "./levelLoader";
import { ROOM_W, ROOM_H } from "./world";

// Space Marine Overhaul: game.ts's player hitbox grew from 14x26 to 18x32
// (ph is now exactly 2 tiles). ensureExitClearance() in levelLoader.ts was
// widened from a 2-tile to a 3-tile minimum portal so the enlarged hitbox
// gets a full tile of margin passing through inter-room exits, instead of
// exactly filling a 2-tile gap with zero clearance. This test verifies that
// widening actually landed for every declared exit in the real, loaded
// world - not just that the carve function's line count changed.
describe("door clearance (Space Marine Overhaul)", () => {
  it("loads the whole world without throwing (widened portals didn't seal any declared exit)", () => {
    expect(() => loadWorld()).not.toThrow();
  });

  it("every declared exit has at least a 3-tile-wide open portal on its edge", () => {
    const world = loadWorld();
    for (const room of world.values()) {
      for (const edge of ["left", "right", "up", "down"] as const) {
        if (!room.exits[edge]) continue;
        const isVertical = edge === "left" || edge === "right";
        const fixedCoord = edge === "left" ? 0 : edge === "right" ? ROOM_W - 1 : edge === "up" ? 0 : ROOM_H - 1;
        const span = isVertical ? ROOM_H : ROOM_W;

        let run = 0;
        let maxRun = 0;
        for (let i = 0; i < span; i++) {
          const tile = isVertical ? room.tiles[i * ROOM_W + fixedCoord] : room.tiles[fixedCoord * ROOM_W + i];
          if (tile === T_EMPTY) {
            run++;
            maxRun = Math.max(maxRun, run);
          } else {
            run = 0;
          }
        }
        expect(maxRun, `Room ${room.id}'s ${edge} exit has only ${maxRun}-tile clearance`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("does not introduce any new genuine dead-ends (BUG-003 stays fixed)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    loadWorld();
    const deadEndWarnings = warnSpy.mock.calls.filter(
      (call) => typeof call[0] === "string" && call[0].includes("genuine dead-end"),
    );
    expect(deadEndWarnings).toHaveLength(0);
    warnSpy.mockRestore();
  });
});
