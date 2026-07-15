import { describe, expect, it, vi } from "vitest";
import { ROOMS, START_ROOM, shuffleWorldGraph } from "./world";
import { loadWorld } from "./levelLoader";

function signature(exits: { left?: string; right?: string; up?: string; down?: string }): string {
  return Object.keys(exits).sort().join(",");
}

describe("shuffleWorldGraph (ADR-029)", () => {
  it("is deterministic: the same seed always produces the same room-order", () => {
    const a = shuffleWorldGraph(ROOMS, "SAME-SEED");
    const b = shuffleWorldGraph(ROOMS, "SAME-SEED");
    expect(a.map((r) => r.name)).toEqual(b.map((r) => r.name));
  });

  it("different seeds produce different room-orders (not a no-op)", () => {
    const seeds = ["ALPHA", "BRAVO", "CHARLIE", "DELTA", "ECHO"];
    const orders = seeds.map((s) => shuffleWorldGraph(ROOMS, s).map((r) => r.name).join("|"));
    const distinct = new Set(orders);
    expect(distinct.size).toBeGreaterThan(1);
  });

  it("pins the start room's content exactly - the player always opens on the same room", () => {
    const shuffled = shuffleWorldGraph(ROOMS, "ANY-SEED-1234");
    const startPosition = shuffled.find((r) => r.id === START_ROOM)!;
    const originalStart = ROOMS.find((r) => r.id === START_ROOM)!;
    expect(startPosition.name).toBe(originalStart.name);
    expect(startPosition.map).toBe(originalStart.map);
  });

  it("every position's id and exits (the graph shape) are unchanged from the original", () => {
    const shuffled = shuffleWorldGraph(ROOMS, "GRAPH-SHAPE-CHECK");
    expect(shuffled.map((r) => r.id)).toEqual(ROOMS.map((r) => r.id));
    for (let i = 0; i < ROOMS.length; i++) {
      expect(shuffled[i].exits).toEqual(ROOMS[i].exits);
    }
  });

  it("only ever places content at a position with the exact same exit signature", () => {
    const shuffled = shuffleWorldGraph(ROOMS, "SIGNATURE-CHECK-9999");
    for (let i = 0; i < ROOMS.length; i++) {
      const position = ROOMS[i];
      const placedContent = shuffled[i];
      // Find the original room definition that has this exact map (the content payload).
      const originalOwner = ROOMS.find((r) => r.map === placedContent.map)!;
      expect(signature(originalOwner.exits)).toBe(signature(position.exits));
    }
  });

  it("is a true permutation: every room's content is used exactly once, none dropped or duplicated", () => {
    const shuffled = shuffleWorldGraph(ROOMS, "PERMUTATION-CHECK");
    const originalMaps = new Set(ROOMS.map((r) => r.map));
    const shuffledMaps = shuffled.map((r) => r.map);
    expect(new Set(shuffledMaps).size).toBe(originalMaps.size);
    for (const m of shuffledMaps) expect(originalMaps.has(m)).toBe(true);
  });

  it("loadWorld(seed) introduces zero new dead-ends across several seeds (connectivity is guaranteed by construction, verified empirically anyway)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const seed of ["RUN-A", "RUN-B", "RUN-C", "DAILY-2026-07-15"]) {
      expect(() => loadWorld(seed)).not.toThrow();
    }
    const deadEndWarnings = warnSpy.mock.calls.filter(
      (call) => typeof call[0] === "string" && call[0].includes("genuine dead-end"),
    );
    expect(deadEndWarnings).toHaveLength(0);
    warnSpy.mockRestore();
  });

  it("loadWorld() with no seed still loads the canonical unshuffled world (existing tests' stable baseline)", () => {
    const world = loadWorld();
    for (const room of ROOMS) {
      expect(world.get(room.id)?.name).toBe(room.name);
    }
  });
});
