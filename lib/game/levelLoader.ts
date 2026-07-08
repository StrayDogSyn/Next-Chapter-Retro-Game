/**
 * Level loader — parses the ASCII room maps in world.ts into collision grids
 * and entity spawn lists, and validates the whole world graph up front:
 *   - every room is exactly 40x22
 *   - every declared exit points at a room that exists
 *   - every declared exit has an actual opening on that edge
 *   - exactly one player spawn exists in the start room
 * Any violation throws at load with a message naming the room — no silent
 * sealed rooms.
 */

import { ROOMS, ROOM_H, ROOM_W, START_ROOM, type RoomDef, type ZoneId } from "./world";

export const T_EMPTY = 0;
export const T_SOLID = 1;
export const T_PLATFORM = 2;
export const T_SPIKE = 3;
export const T_DOOR_KEY = 4; // 'D' — solid until flags.hasKey
export const T_DOOR_BEAST = 5; // 'd' — solid until flags.mechSlain

export type SpawnKind =
  | "player"
  | "bat"
  | "goblin"
  | "imp"
  | "flower"
  | "wyrmwolf"
  | "mech"
  | "werewolf"
  | "chest"
  | "coin"
  | "health"
  | "key"
  | "doubleJump"
  | "dash";

export type Spawn = { kind: SpawnKind; col: number; row: number };

export type LoadedRoom = {
  id: string;
  name: string;
  zone: ZoneId;
  boss: boolean;
  tiles: Uint8Array; // ROOM_W * ROOM_H
  spawns: Spawn[];
  exits: RoomDef["exits"];
};

const ENTITY_CHARS: Record<string, SpawnKind> = {
  P: "player",
  b: "bat",
  g: "goblin",
  i: "imp",
  f: "flower",
  Y: "wyrmwolf",
  M: "mech",
  W: "werewolf",
  C: "chest",
  c: "coin",
  "+": "health",
  K: "key",
  J: "doubleJump",
  A: "dash",
};

function parseRoom(def: RoomDef): LoadedRoom {
  if (def.map.length !== ROOM_H) {
    throw new Error(
      `[world] Room ${def.id} has ${def.map.length} rows, expected ${ROOM_H}`,
    );
  }
  const tiles = new Uint8Array(ROOM_W * ROOM_H);
  const spawns: Spawn[] = [];

  def.map.forEach((rowStr, row) => {
    if (rowStr.length !== ROOM_W) {
      throw new Error(
        `[world] Room ${def.id} row ${row} is ${rowStr.length} chars, expected ${ROOM_W}: "${rowStr}"`,
      );
    }
    for (let col = 0; col < ROOM_W; col++) {
      const ch = rowStr[col];
      let tile = T_EMPTY;
      if (ch === "#") tile = T_SOLID;
      else if (ch === "-") tile = T_PLATFORM;
      else if (ch === "^") tile = T_SPIKE;
      else if (ch === "D") tile = T_DOOR_KEY;
      else if (ch === "d") tile = T_DOOR_BEAST;
      else if (ENTITY_CHARS[ch]) spawns.push({ kind: ENTITY_CHARS[ch], col, row });
      else if (ch !== "." && ch !== " ") {
        throw new Error(`[world] Room ${def.id} row ${row} col ${col}: unknown char "${ch}"`);
      }
      tiles[row * ROOM_W + col] = tile;
    }
  });

  return {
    id: def.id,
    name: def.name,
    zone: def.zone,
    boss: def.boss ?? false,
    tiles,
    spawns,
    exits: def.exits,
  };
}

function hasOpening(room: LoadedRoom, edge: "left" | "right" | "up" | "down"): boolean {
  const at = (col: number, row: number) =>
    room.tiles[row * ROOM_W + col] !== T_SOLID;
  if (edge === "left") {
    for (let row = 1; row < ROOM_H - 1; row++) if (at(0, row)) return true;
  } else if (edge === "right") {
    for (let row = 1; row < ROOM_H - 1; row++) if (at(ROOM_W - 1, row)) return true;
  } else if (edge === "up") {
    for (let col = 1; col < ROOM_W - 1; col++) if (at(col, 0)) return true;
  } else {
    for (let col = 1; col < ROOM_W - 1; col++) if (at(col, ROOM_H - 1)) return true;
  }
  return false;
}

export function loadWorld(): Map<string, LoadedRoom> {
  const world = new Map<string, LoadedRoom>();
  for (const def of ROOMS) {
    if (world.has(def.id)) throw new Error(`[world] Duplicate room id ${def.id}`);
    world.set(def.id, parseRoom(def));
  }

  for (const room of Array.from(world.values())) {
    for (const [edge, target] of Object.entries(room.exits) as [
      "left" | "right" | "up" | "down",
      string,
    ][]) {
      if (!world.has(target)) {
        throw new Error(`[world] Room ${room.id} exit ${edge} -> ${target}: no such room`);
      }
      if (!hasOpening(room, edge)) {
        throw new Error(`[world] Room ${room.id} declares ${edge} exit but the edge is sealed`);
      }
    }
  }

  const start = world.get(START_ROOM);
  if (!start) throw new Error(`[world] Start room ${START_ROOM} missing`);
  const playerSpawns = start.spawns.filter((s) => s.kind === "player");
  if (playerSpawns.length !== 1) {
    throw new Error(
      `[world] Start room must have exactly 1 player spawn, found ${playerSpawns.length}`,
    );
  }

  console.info(`[world] Loaded ${world.size} rooms, all exits validated.`);
  return world;
}
