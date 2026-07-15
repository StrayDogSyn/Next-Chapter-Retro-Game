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
// Ability-gate doors (restored 2026-07-15, ADR-028): the jump-envelope buff
// that let the base (no-upgrades) jump reach every previously ability-gated
// item (24 -> 0, see ADR-027) meant physics-based gating could no longer be
// trusted to actually block anything. These reuse the exact same "solid
// until a runtime flag is true" pattern as T_DOOR_KEY/T_DOOR_BEAST, so
// gating is now robust to future jump retuning instead of being an
// incidental property of exact velocity numbers.
export const T_DOOR_DOUBLEJUMP = 6; // 'j' — solid until upgrades.doubleJump > 0
export const T_DOOR_DASH = 7; // 'a' — solid until upgrades.dash > 0

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
  | "dash"
  | "shrine"
  | "shopkeeper";

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
  S: "shrine",
  N: "shopkeeper",
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
      else if (ch === "j") tile = T_DOOR_DOUBLEJUMP;
      else if (ch === "a") tile = T_DOOR_DASH;
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

function getTile(room: LoadedRoom, col: number, row: number): number {
  return room.tiles[row * ROOM_W + col];
}

function setTile(room: LoadedRoom, col: number, row: number, tile: number) {
  room.tiles[row * ROOM_W + col] = tile;
}

function isPassableEdgeTile(tile: number): boolean {
  return tile !== T_SOLID;
}

/**
 * Some authored rooms had single-cell edge openings; after transition the
 * player could be wedged against nearby solids and feel trapped. Normalize
 * every declared exit to a minimum 4-cell portal and clear one tile inward.
 *
 * Space Marine Overhaul: widened 2 cells (32px) -> 3 cells (48px) -> now 4
 * cells (64px) as the hitbox itself grew across two passes (14x26 -> 18x32
 * -> 24x44). ph=44 is 2.75 tiles; a 4-tile portal leaves a full 1.25-tile
 * (20px) margin passing through, instead of the near-zero margin a 3-tile
 * portal would now leave.
 */
function ensureExitClearance(room: LoadedRoom) {
  const midRow = Math.floor(ROOM_H / 2);
  const midCol = Math.floor(ROOM_W / 2);

  const chooseRow = (edgeCol: number): number => {
    let best: number | null = null;
    for (let row = 1; row < ROOM_H - 1; row++) {
      if (!isPassableEdgeTile(getTile(room, edgeCol, row))) continue;
      if (best === null || Math.abs(row - midRow) < Math.abs(best - midRow)) best = row;
    }
    return best ?? midRow;
  };

  const chooseCol = (edgeRow: number): number => {
    let best: number | null = null;
    for (let col = 1; col < ROOM_W - 1; col++) {
      if (!isPassableEdgeTile(getTile(room, col, edgeRow))) continue;
      if (best === null || Math.abs(col - midCol) < Math.abs(best - midCol)) best = col;
    }
    return best ?? midCol;
  };

  const carveVerticalPortal = (edgeCol: number, innerCol: number) => {
    const anchor = chooseRow(edgeCol);
    const top = Math.max(1, Math.min(ROOM_H - 5, anchor - 1));
    for (let row = top; row <= top + 3; row++) {
      setTile(room, edgeCol, row, T_EMPTY);
      setTile(room, innerCol, row, T_EMPTY);
    }
  };

  const carveHorizontalPortal = (edgeRow: number, innerRow: number) => {
    const anchor = chooseCol(edgeRow);
    const left = Math.max(1, Math.min(ROOM_W - 5, anchor - 1));
    for (let col = left; col <= left + 3; col++) {
      setTile(room, col, edgeRow, T_EMPTY);
      setTile(room, col, innerRow, T_EMPTY);
    }
  };

  if (room.exits.left) carveVerticalPortal(0, 1);
  if (room.exits.right) carveVerticalPortal(ROOM_W - 1, ROOM_W - 2);
  if (room.exits.up) carveHorizontalPortal(0, 1);
  if (room.exits.down) carveHorizontalPortal(ROOM_H - 1, ROOM_H - 2);
}

function hasOpening(room: LoadedRoom, edge: "left" | "right" | "up" | "down"): boolean {
  const at = (col: number, row: number) =>
    isPassableEdgeTile(getTile(room, col, row));
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

// ─────────────────────── reachability validation (BUG-003) ───────────────────────
//
// Jump metrics, derived from the real player physics in game.ts (not guessed):
//   jumpVelocity() = -465 px/s (base, no upgrades; buffed from an original
//   330 through intermediate 345/355/380 steps to 465 under the "Space
//   Marine" Physical Overhaul, this last step a direct ~1.5x apex increase
//   per explicit user feedback - see jump-physics.ts's JUMP_BASE_VELOCITY
//   comment), gravity = 900 px/s^2.
//   Rise to apex = v^2 / (2*g) = 465^2 / 1800 = 120.1px = 7.51 tiles
//   analytic, 7.27 tiles per simulateJumpFlight() (16px tiles).
// JUMP_RISE_TILES is rounded DOWN to 7 tiles (raised from 4). This is the
// classification threshold the world's ability-gating relies on
// (ADR-004/ADR-023): raising it reclassifies more previously double-jump-
// gated content as base-reachable - measured, not assumed, each time this
// constant moves (see SESSION_LOG for the before/after gated-item count
// this round). UPGRADED_JUMP_RISE_TILES below moves with the base velocity
// too (double-jump reuses this same base velocity for its second impulse),
// keeping the relative gap between "base-reachable" and "ability-gated"
// content roughly the same shape rather than collapsing it.
// Exported so jump-physics.test.ts can cross-check these hand-derived
// constants against a real frame-stepped simulation (Fix Pack mission,
// Increment 2.1) without duplicating the numbers.
export const JUMP_RISE_TILES = 7;
// Full up-and-down airtime at base jump velocity = 2 * (465/900) = 1.033s
// analytic. At base move speed (150px/s) that's ~9.7 tiles of horizontal
// travel across a dead-air gap; floors to 9 tiles.
export const JUMP_GAP_TILES = 9;
// Falling (no ascent needed) gets extra horizontal drift credit per tile of
// drop, since airtime -- and therefore horizontal travel while falling -- keeps
// growing the longer the drop. Capped so the estimate doesn't run away on deep
// pits.
const FALL_DRIFT_BONUS_PER_TILE = 1;
const FALL_DRIFT_BONUS_CAP = 6;

// "Upgraded" profile: a player who found Aether Wings (double jump) and the
// Phase Dash Module. A second jump applied at the first jump's exact apex
// (the worst case) simulates to 14.53 tiles of total rise at the Space
// Marine Overhaul's now-465px/s base velocity (up from 9.63 tiles at the
// previous 380px/s pass), floored to 14 (raised from 9); the 0.22s dash
// burst at 2.6x move speed adds horizontal reach on top of the base jump
// gap, simulating to ~16.4 tiles, floored to 16 (raised from 13). Both
// raised in step with the base velocity bump above since double-jump
// reuses the same base velocity for its second impulse - this profile
// exists so the auditor doesn't flag intentional ability-gated bonus
// content (ADR-004) as broken — only report an item as a genuine dead-end
// if it's unreachable even with the full movement kit.
export const UPGRADED_JUMP_RISE_TILES = 14;
export const UPGRADED_JUMP_GAP_TILES = 16;

type Cell = { c: number; r: number };
type ReachProfile = { riseTiles: number; gapTiles: number };
const BASE_PROFILE: ReachProfile = { riseTiles: JUMP_RISE_TILES, gapTiles: JUMP_GAP_TILES };
const UPGRADED_PROFILE: ReachProfile = { riseTiles: UPGRADED_JUMP_RISE_TILES, gapTiles: UPGRADED_JUMP_GAP_TILES };

function isFloorTile(tile: number): boolean {
  // Reachability treats key/beast/ability-gate doors as passable (best case:
  // player has the gate condition) since gate state is a runtime flag, not
  // load-time data. This means an item behind a door no longer shows up in
  // the `gated` audit list once a door is placed in front of it - the door
  // itself is now the real, explicit gate; a jump-envelope comparison isn't
  // a meaningful description of its reachability anymore.
  return (
    tile === T_SOLID ||
    tile === T_PLATFORM ||
    tile === T_DOOR_KEY ||
    tile === T_DOOR_BEAST ||
    tile === T_DOOR_DOUBLEJUMP ||
    tile === T_DOOR_DASH
  );
}

function isOpenTile(tile: number): boolean {
  return (
    tile !== T_SOLID &&
    tile !== T_DOOR_KEY &&
    tile !== T_DOOR_BEAST &&
    tile !== T_DOOR_DOUBLEJUMP &&
    tile !== T_DOOR_DASH
  );
}

/** A cell the player could stand on: open, with floor directly beneath (or room bottom). */
function standableCells(room: LoadedRoom): Cell[] {
  const cells: Cell[] = [];
  for (let r = 0; r < ROOM_H; r++) {
    for (let c = 0; c < ROOM_W; c++) {
      const tile = room.tiles[r * ROOM_W + c];
      if (!isOpenTile(tile)) continue;
      const below = r + 1 < ROOM_H ? room.tiles[(r + 1) * ROOM_W + c] : T_SOLID;
      if (isFloorTile(below) || r === ROOM_H - 1) cells.push({ c, r });
    }
  }
  return cells;
}

/** Falls straight down (with a little column tolerance) from a raw point to the nearest standable cell. */
function nearestStandableBelow(room: LoadedRoom, cells: Cell[], from: Cell): Cell | null {
  let best: Cell | null = null;
  for (const cell of cells) {
    if (Math.abs(cell.c - from.c) > 2) continue;
    if (cell.r < from.r) continue;
    if (!best || cell.r < best.r) best = cell;
  }
  return best;
}

function canJumpBetween(a: Cell, b: Cell, profile: ReachProfile): boolean {
  const dr = b.r - a.r; // positive = b is lower
  if (dr < -profile.riseTiles) return false; // b is higher than this profile can reach
  const dc = Math.abs(b.c - a.c);
  const fallBonus = dr > 0 ? Math.min(dr, FALL_DRIFT_BONUS_CAP) * FALL_DRIFT_BONUS_PER_TILE : 0;
  return dc <= profile.gapTiles + fallBonus;
}

/** Opening cell nearest the edge midpoint, for use as an exit/entry anchor. */
function openingCell(room: LoadedRoom, edge: "left" | "right" | "up" | "down"): Cell | null {
  const at = (c: number, r: number) => room.tiles[r * ROOM_W + c] !== T_SOLID;
  const mid = edge === "left" || edge === "right" ? Math.floor(ROOM_H / 2) : Math.floor(ROOM_W / 2);
  if (edge === "left" || edge === "right") {
    const c = edge === "left" ? 0 : ROOM_W - 1;
    let best: number | null = null;
    for (let r = 1; r < ROOM_H - 1; r++) {
      if (at(c, r) && (best === null || Math.abs(r - mid) < Math.abs(best - mid))) best = r;
    }
    return best === null ? null : { c, r: best };
  }
  const r = edge === "up" ? 0 : ROOM_H - 1;
  let best: number | null = null;
  for (let c = 1; c < ROOM_W - 1; c++) {
    if (at(c, r) && (best === null || Math.abs(c - mid) < Math.abs(best - mid))) best = c;
  }
  return best === null ? null : { c: best, r };
}

const PICKUP_KINDS = new Set<SpawnKind>([
  "chest",
  "coin",
  "health",
  "key",
  "doubleJump",
  "dash",
  "shrine",
  "shopkeeper",
]);

function floodReachable(room: LoadedRoom, cells: Cell[], entries: Cell[], profile: ReachProfile): Set<string> {
  const visited = new Set<string>();
  const key = (c: Cell) => `${c.c},${c.r}`;
  const queue: Cell[] = [];
  for (const e of entries) {
    const k = key(e);
    if (!visited.has(k)) {
      visited.add(k);
      queue.push(e);
    }
  }
  while (queue.length) {
    const cur = queue.shift()!;
    for (const candidate of cells) {
      const k = key(candidate);
      if (visited.has(k)) continue;
      if (canJumpBetween(cur, candidate, profile)) {
        visited.add(k);
        queue.push(candidate);
      }
    }
  }
  return visited;
}

/**
 * Flood-fills every standable cell reachable from the room's entry points
 * (its own declared exits, since this world graph is reciprocal — see
 * checkTransitions()/goToRoom() in game.ts — plus the player spawn for the
 * start room), under two movement profiles: BASE (no upgrades) and UPGRADED
 * (double jump + dash). Only an item unreachable under BOTH is reported as a
 * genuine dead-end; base-only misses are expected ability-gated bonus content
 * (ADR-004) and are informational, not warnings. Heuristic auditor, not a
 * certifier — it intentionally treats key/beast doors as open (isFloorTile)
 * since gate state is a runtime flag, not load-time data.
 */
function validateReachability(room: LoadedRoom): { deadEnds: string[]; gated: string[] } {
  const deadEnds: string[] = [];
  const gated: string[] = [];
  const cells = standableCells(room);
  if (cells.length === 0) return { deadEnds, gated };

  const entryRaw: Cell[] = [];
  for (const edge of ["left", "right", "up", "down"] as const) {
    if (room.exits[edge]) {
      const cell = openingCell(room, edge);
      if (cell) entryRaw.push(cell);
    }
  }
  for (const spawn of room.spawns) {
    if (spawn.kind === "player") entryRaw.push({ c: spawn.col, r: spawn.row });
  }
  if (entryRaw.length === 0) return { deadEnds, gated }; // nothing to validate from

  const entries = entryRaw
    .map((raw) => nearestStandableBelow(room, cells, raw))
    .filter((c): c is Cell => c !== null);

  const key = (c: Cell) => `${c.c},${c.r}`;
  const visitedBase = floodReachable(room, cells, entries, BASE_PROFILE);
  const visitedUpgraded = floodReachable(room, cells, entries, UPGRADED_PROFILE);

  const check = (label: string, landing: Cell | null, requireBaseOnly = false) => {
    if (!landing) {
      deadEnds.push(`[world] Room ${room.id}: ${label} has no standable landing at all`);
      return;
    }
    const k = key(landing);
    if (requireBaseOnly) {
      // An ability pickup (double-jump/dash) can't legitimately require
      // itself to reach — checking it against the upgraded profile is
      // circular. Hold it to the base (no-upgrades) profile only.
      if (!visitedBase.has(k)) {
        deadEnds.push(`[world] Room ${room.id}: ${label} looks unreachable without already having the ability it grants`);
      }
      return;
    }
    if (!visitedUpgraded.has(k)) {
      deadEnds.push(`[world] Room ${room.id}: ${label} looks unreachable even with double-jump + dash`);
    } else if (!visitedBase.has(k)) {
      gated.push(`[world] Room ${room.id}: ${label} requires double-jump and/or dash to reach (expected ability gating)`);
    }
  };

  for (const spawn of room.spawns) {
    if (!PICKUP_KINDS.has(spawn.kind)) continue;
    const isAbilityPickup = spawn.kind === "doubleJump" || spawn.kind === "dash";
    check(
      `${spawn.kind} at (${spawn.col},${spawn.row})`,
      nearestStandableBelow(room, cells, { c: spawn.col, r: spawn.row }),
      isAbilityPickup,
    );
  }
  for (const edge of ["left", "right", "up", "down"] as const) {
    if (!room.exits[edge]) continue;
    const cell = openingCell(room, edge);
    check(`${edge} exit -> ${room.exits[edge]}`, cell && nearestStandableBelow(room, cells, cell));
  }
  return { deadEnds, gated };
}

// ─────────────────────── mini-map coordinates (UI-007) ───────────────────────

/** Grid position of every room, BFS'd from START_ROOM along exit directions. */
export function computeRoomCoords(world: Map<string, LoadedRoom>): Map<string, { x: number; y: number }> {
  const coords = new Map<string, { x: number; y: number }>();
  const start = world.get(START_ROOM);
  if (!start) return coords;
  coords.set(START_ROOM, { x: 0, y: 0 });
  const queue = [START_ROOM];
  const DELTA: Record<"left" | "right" | "up" | "down", { x: number; y: number }> = {
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
  };
  while (queue.length) {
    const id = queue.shift()!;
    const room = world.get(id);
    const at = coords.get(id);
    if (!room || !at) continue;
    for (const [edge, target] of Object.entries(room.exits) as [keyof typeof DELTA, string][]) {
      if (coords.has(target)) continue;
      const d = DELTA[edge];
      coords.set(target, { x: at.x + d.x, y: at.y + d.y });
      queue.push(target);
    }
  }
  return coords;
}

export function loadWorld(): Map<string, LoadedRoom> {
  const world = new Map<string, LoadedRoom>();
  for (const def of ROOMS) {
    if (world.has(def.id)) throw new Error(`[world] Duplicate room id ${def.id}`);
    const room = parseRoom(def);
    ensureExitClearance(room);
    world.set(def.id, room);
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

  const audits = Array.from(world.values()).map(validateReachability);
  const deadEnds = audits.flatMap((a) => a.deadEnds);
  const gated = audits.flatMap((a) => a.gated);
  if (deadEnds.length) {
    console.warn(
      `[world] Reachability audit found ${deadEnds.length} genuine dead-end(s) (unreachable even with double-jump+dash):\n` +
        deadEnds.map((i) => `  - ${i}`).join("\n"),
    );
  } else {
    console.info(
      `[world] Reachability audit: no dead-ends. ${gated.length} item(s) are intentionally ability-gated.`,
    );
  }

  console.info(`[world] Loaded ${world.size} rooms, all exits validated.`);
  return world;
}
