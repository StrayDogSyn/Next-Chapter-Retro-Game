import { describe, it, expect } from "vitest";
import { writeFileSync } from "fs";
import { loadWorld, T_SPIKE, T_SOLID, T_PLATFORM, T_DOOR_DOUBLEJUMP, T_DOOR_DASH } from "./levelLoader";
import { ROOM_W } from "./world";

describe("scratch-spikes", () => {
  it("checks what's near every spike tile in every room", () => {
    const world = loadWorld();
    const lines: string[] = [];
    for (const room of world.values()) {
      for (let i = 0; i < room.tiles.length; i++) {
        if (room.tiles[i] !== T_SPIKE) continue;
        const col = i % ROOM_W;
        const row = Math.floor(i / ROOM_W);
        const below = room.tiles[i + ROOM_W];
        const above = row > 0 ? room.tiles[i - ROOM_W] : undefined;
        const isSurface = (t: number | undefined) =>
          t === T_SOLID || t === T_PLATFORM || t === T_DOOR_DOUBLEJUMP || t === T_DOOR_DASH;
        lines.push(
          `room=${room.id} col=${col} row=${row} below=${below} above=${above} belowIsSurface=${isSurface(below)} aboveIsSurface=${isSurface(above)}`,
        );
      }
    }
    writeFileSync("_scratch-spikes-out.txt", lines.join("\n"));
    expect(true).toBe(true);
  });
});
