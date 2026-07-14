/**
 * Game orchestrator. Hand-rolled canvas engine per ADR-002 — no game library.
 *
 * Responsibilities: fixed-ish timestep update from rAF delta time, AABB tile
 * physics, room transitions across the Metroidvania graph, combat (melee arcs
 * + projectiles), data-driven enemies/bosses, loot via the Python service
 * (ADR-001, client fallback per ADR-003), audio, and rendering.
 *
 * React (GameCanvas.tsx) only mounts this class and reads HUD snapshots —
 * game state never lives in React state.
 */

import { AudioManager } from "@/lib/audioManager";
import { GameLoop } from "@/lib/gameLoop";
import { InputManager } from "./input";
import {
  computeRoomCoords,
  loadWorld,
  type LoadedRoom,
  type Spawn,
  T_DOOR_BEAST,
  T_DOOR_KEY,
  T_EMPTY,
  T_PLATFORM,
  T_SOLID,
  T_SPIKE,
} from "./levelLoader";
import { ROOM_H, ROOM_W, START_ROOM, TILE, type ZoneId } from "./world";
import { assetUrl } from "./asset-url";
import {
  jumpVelocity as jumpPhysicsJumpVelocity,
  maxJumps as jumpPhysicsMaxJumps,
  resolveJumpPress,
  tickGroundedState,
} from "./jump-physics";
import { fetchLootRoll } from "./loot-client";
import { getOrCreatePlayerId } from "./player-identity";
import { loadFromServer, registerPlayer, saveToServer } from "./save-client";
import { buildSaveData } from "./save-data";
import {
  describeLoot,
  fallbackRoll,
  impactBurstSheet,
  isWeaponInstance,
  LOOT_PICKUP_SPRITE,
  RARITIES,
  STARTING_WEAPON,
  UPGRADE_DEFS,
  type LootDrop,
  type Rarity,
  type UpgradeId,
  type WeaponInstance,
} from "./items";
import { Rng, generateSeedPhrase } from "./rng";
import {
  NON_LOOPING_HERO_ANIMS,
  resolveClipFrame,
  selectPlayerAnim,
  shouldFlipHeroSprite,
} from "./player-sprite";
import { loadAssetManifest, resolveManifestAsset, type AssetManifest } from "./assetManifest";
import type { TouchInputManager } from "./touchInput";

export const VIEW_W = ROOM_W * TILE; // 640
export const VIEW_H = ROOM_H * TILE; // 352

// ─────────────────────────── types ───────────────────────────

type SpriteMeta = Record<
  string,
  { cellW: number; cellH: number; anims: Record<string, { row: number; frames: number }> }
> & { tiles: { tileSize: number; order: string[] } };

type EnemyKind = "bat" | "goblin" | "imp" | "flower" | "wyrmwolf" | "mech" | "werewolf";

type Enemy = {
  kind: EnemyKind;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  facing: 1 | -1;
  anim: string;
  animTime: number;
  stateTime: number;
  state: string;
  homeX: number;
  homeY: number;
  touchDamage: number;
  level: number;
  boss: boolean;
  burnT: number;
  burnTickT: number;
  freezeT: number;
  shockT: number;
  curseT: number;
};

type PickupKind =
  | "coin"
  | "health"
  | "key"
  | "doubleJump"
  | "dash"
  | "chest"
  | "loot";

type Pickup = {
  kind: PickupKind;
  x: number;
  y: number;
  w: number;
  h: number;
  vy: number;
  loot?: LootDrop;
  opened?: boolean;
  bobT: number;
};

type Projectile = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  friendly: boolean;
  ttl: number;
  color: string;
  r: number;
  effect?: WeaponInstance["effect"];
};

/** Persistent, non-consumable room entities (SYS-011 shrine, SYS-012 shopkeeper). */
type Interactable = { kind: "shrine" | "shopkeeper"; x: number; y: number; w: number; h: number };

type RoomState = { enemies: Enemy[]; pickups: Pickup[]; interactables: Interactable[] };

/** Cosmetic-only: coin sparkles, floating "+N" text, equip-swap bursts (UI-002/UX-006). */
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  text?: string;
};

type DamageOptions = {
  effect?: WeaponInstance["effect"];
  bypassStatusMult?: boolean;
  applyOnHitEffects?: boolean;
};

export type HudSnapshot = {
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  coins: number;
  weapon: { name: string; rarity: string; color: string; rolledBy: string; damage: number; speed: number };
  secondary: { name: string; rarity: string; color: string; damage: number; speed: number } | null;
  roomName: string;
  zone: ZoneId;
  gamepad: string | null;
  message: string;
  boss: { name: string; hp: number; maxHp: number } | null;
  upgrades: Partial<Record<UpgradeId, number>>;
  phase: "playing" | "paused" | "dead" | "victory";
  lootSource: string;
  saveSource: string;
  /** Shareable run seed — show on death screen for bug reports / challenges */
  seed: string;
  respawnHoldPct: number;
  level: number;
  xp: number;
  xpToNext: number;
  elapsedSeconds: number;
  enemiesDefeated: number;
  stats: {
    toughnessPct: number;
    critChancePct: number;
    lifeStealPct: number;
    dodgeInvulnMs: number;
    attackPower: number;
    defensePct: number;
  };
  minimap: MinimapRoom[];
};

export type MinimapRoom = {
  id: string;
  x: number;
  y: number;
  visited: boolean;
  cleared: boolean;
  current: boolean;
  boss: boolean;
};

type GameOptions = {
  seedOverride?: string;
  touchInput?: TouchInputManager | null;
};

// ─────────────────────── enemy definitions ───────────────────────

const ENEMY_DEFS: Record<
  EnemyKind,
  {
    sheet: string;
    w: number;
    h: number;
    drawW: number;
    drawH: number;
    nativeFacing: 1 | -1;
    hp: number;
    touchDamage: number;
    level: number;
    boss?: boolean;
  }
> = {
  bat: { sheet: "bat", w: 18, h: 14, drawW: 28, drawH: 28, nativeFacing: -1, hp: 15, touchDamage: 8, level: 1 },
  goblin: { sheet: "goblin", w: 22, h: 42, drawW: 52, drawH: 46, nativeFacing: 1, hp: 40, touchDamage: 12, level: 2 },
  imp: { sheet: "imp", w: 20, h: 30, drawW: 40, drawH: 40, nativeFacing: 1, hp: 25, touchDamage: 8, level: 2 },
  flower: { sheet: "flower", w: 26, h: 30, drawW: 48, drawH: 48, nativeFacing: 1, hp: 30, touchDamage: 10, level: 2 },
  wyrmwolf: { sheet: "wyrmwolf", w: 70, h: 46, drawW: 110, drawH: 82, nativeFacing: 1, hp: 220, touchDamage: 18, level: 5, boss: true },
  mech: { sheet: "mech", w: 44, h: 60, drawW: 64, drawH: 74, nativeFacing: 1, hp: 260, touchDamage: 16, level: 6, boss: true },
  werewolf: { sheet: "boss_werewolf", w: 44, h: 70, drawW: 84, drawH: 88, nativeFacing: 1, hp: 420, touchDamage: 22, level: 8, boss: true },
};

const BOSS_NAMES: Record<string, string> = {
  wyrmwolf: "WYRMWOLF",
  mech: "WAR MECH",
  werewolf: "THE ALTERED BEAST",
};

// ─────────────────────────── game class ───────────────────────────

export class Game {
  private ctx: CanvasRenderingContext2D;
  private camera = { x: 0, y: 0 };
  private cameraZoom = 1;
  private manualCameraPan = { x: 0, y: 0 };
  private loop = new GameLoop();
  private input: InputManager;
  private audio = new AudioManager();
  private world = loadWorld();
  private roomCoords = computeRoomCoords(this.world);
  private visitedRooms = new Set<string>([START_ROOM]);
  private clearedRooms = new Set<string>();
  private roomStates = new Map<string, RoomState>();
  private roomId = START_ROOM;
  private meta: SpriteMeta | null = null;
  private sheets = new Map<string, HTMLImageElement>();
  private dropLootCounter = 0;
  private shopLootCounter = 0;
  // ADR-008/ADR-017: seeded deterministic RNG. One root seed per run, each
  // subsystem forks its own stream so draws in one system never shift
  // another's sequence (opening an extra chest must not reshuffle combat
  // crits). seedPhrase is surfaced in the HUD for shareable runs and
  // reproducible bug reports. Assigned in the constructor (not a field
  // initializer) so a caller can override it - daily seed / enter-seed mode.
  readonly seedPhrase: string;
  private rng: Rng;
  private combatRng: Rng;
  private lootRng: Rng;
  private shopRng: Rng;
  private vfxRng: Rng;
  // numeric seed for the /api/loot path + fallbackRoll — derived from the
  // root seed so the whole run remains reproducible from seedPhrase alone
  private runSeed: number;
  // pity: consecutive drops below rare; feeds effective luck in rollLoot()
  private lootPity = 0;
  private lootSource = "unknown";
  private saveSource = "unknown";
  private message = "";
  private messageT = 0;
  private phase: "playing" | "paused" | "dead" | "victory" = "playing";
  private musicMode: "none" | "bg" | "boss" = "none";
  private snapshotT = 0;
  private assetManifest: AssetManifest | null = null;

  // player
  private px = 0;
  private py = 0;
  private pvx = 0;
  private pvy = 0;
  private readonly pw = 14;
  private readonly ph = 26;
  private facing: 1 | -1 = 1;
  private onGround = false;
  private jumpsUsed = 0;
  private coyoteT = 0;
  private hp = 100;
  private iframes = 0;
  private attackCooldown = 0;
  private attackAnimT = 0;
  private dashT = 0;
  private dashCooldown = 0;
  private coins = 0;
  private weapon: WeaponInstance = { ...STARTING_WEAPON };
  private secondary: WeaponInstance | null = null;
  private upgrades: Partial<Record<UpgradeId, number>> = {};
  private flags = { hasKey: false, wyrmSlain: false, mechSlain: false, beastSlain: false };

  private projectiles: Projectile[] = [];
  private animT = 0;
  private stepT = 0;

  // UX-004: self-destruct/respawn (hold R for RESPAWN_HOLD_SECONDS)
  private respawnHoldT = 0;
  private fadeT = 0;
  private static readonly RESPAWN_HOLD_SECONDS = 1.2;

  // UI-002 / UX-006: cosmetic feedback state
  private particles: Particle[] = [];
  // AST-015: rarity-tinted impact burst FX (hits + pickups), separate from
  // the generic dot/text Particle system since these are sprite-animated.
  private rarityBursts: { x: number; y: number; rarity: Rarity; animT: number }[] = [];
  private equipFlashT = 0;
  private comboCount = 0;
  private comboT = 0;

  // UI-008: fullscreen-safe help overlay (pauses gameplay updates while open)
  private helpOpen = false;

  // SYS-009: XP/leveling + inventory overlay
  private level = 1;
  private xp = 0;
  private xpToNext = 150;
  private inventoryOpen = false;
  private externalMenuOpen = false;
  private externalMenuPaused = false;
  private runStartedAt = performance.now();
  private enemiesDefeated = 0;
  // ADR-017: this-seed death count for the run summary screen - reset only
  // by a genuinely new seed (Game construction), not by respawn().
  private deathsThisSeed = 0;

  // SYS-011 / SYS-012: shrine checkpoints + NPC shop
  private static readonly SAVE_KEY = "next_chapter_save_v1";
  private shopOpen = false;
  private shopSelection = 0;
  private shopAtkBonus = 0;
  private touchInput: TouchInputManager | null = null;

  onSnapshot: ((snap: HudSnapshot) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, options: GameOptions = {}) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d context unavailable");
    this.ctx = ctx;
    ctx.imageSmoothingEnabled = false;
    this.touchInput = options.touchInput ?? null;
    this.input = new InputManager(window, this.touchInput);

    // ADR-017: daily seed / enter-seed mode override the random default.
    this.seedPhrase = options.seedOverride ?? generateSeedPhrase();
    this.rng = new Rng(this.seedPhrase);
    this.combatRng = this.rng.fork("combat");
    this.lootRng = this.rng.fork("loot");
    this.shopRng = this.rng.fork("shop");
    this.vfxRng = this.rng.fork("vfx");
    this.runSeed = this.rng.fork("loot-seed").int(0, 999_999);
  }

  resizeViewport(width: number, height: number) {
    const nextW = Math.max(1, Math.floor(width));
    const nextH = Math.max(1, Math.floor(height));
    const canvas = this.ctx.canvas;
    if (canvas.width === nextW && canvas.height === nextH) return;
    canvas.width = nextW;
    canvas.height = nextH;
    // Reset after backing store resize, otherwise browsers re-enable smoothing.
    this.ctx.imageSmoothingEnabled = false;
  }

  // ─────────────────────── lifecycle ───────────────────────

  async start(continueFromSave = false) {
    this.assetManifest = await loadAssetManifest();

    const metaResp = await fetch(assetUrl("/sprites/spritemeta.json"));
    this.meta = (await metaResp.json()) as SpriteMeta;

    const sheetNames = [
      "hero",
      "bat",
      "goblin",
      "imp",
      "flower",
      "mech",
      "wyrmwolf",
      "boss_werewolf",
      "tiles",
      "bg_mountain_sky",
      "bg_mountain_far",
      "bg_mountain_near",
      "bg_mountain_trees",
      "bg_sky",
      "bg_mangrove",
      "bg_tissue",
      LOOT_PICKUP_SPRITE.sheet,
      ...(["common", "uncommon", "rare", "epic"] as const).map(impactBurstSheet),
    ];
    await Promise.all(
      sheetNames.map(
        (name) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              this.sheets.set(name, img);
              resolve();
            };
            img.onerror = () => {
              console.error(`[assets] failed to load sprite for ${name}`);
              resolve();
            };
            img.src =
              resolveManifestAsset(this.assetManifest, name, [".png", ".webp", ".jpg", ".jpeg"]) ??
              assetUrl(`/sprites/${name}.png`);
          }),
      ),
    );

    // Deliberately unprefixed here (ADR-011) - these are raw fallback paths,
    // prefixed via assetUrl() below where audioEntries is built. Never fetch
    // one of these literals directly.
    const audioFiles: Record<string, string> = {
      jump: "/audio/jump.wav",
      hit: "/audio/hit.wav",
      coin: "/audio/coin.wav",
      powerup: "/audio/powerup.wav",
      explosion: "/audio/explosion.wav",
      select: "/audio/select.wav",
      shoot: "/audio/shoot.wav",
      wrong: "/audio/wrong.wav",
      door: "/audio/door.wav",
      sword: "/audio/sword.mp3",
      kill: "/audio/kill.mp3",
      laser: "/audio/laser.mp3",
      chest: "/audio/chest.mp3",
      levelup: "/audio/levelup.mp3",
      boss_music: "/audio/boss_music.mp3",
      bg_music: "/audio/bg_music.mp3",
      gameover: "/audio/gameover.mp3",
      victory: "/audio/victory.mp3",
      roar: "/audio/roar.mp3",
      growl: "/audio/growl.mp3",
      magic: "/audio/magic.mp3",
      step: "/audio/step.mp3",
      // ADR-015/016: extracted-pack stems wired via resolveManifestAsset
      // (100-cc0-sfx + 8-bit-sound-effect-pack, both CC0) - no fallback
      // file exists at these paths on purpose, stem-match is the only path
      // (falls through to no sound if a stem is ever renamed upstream,
      // same as any other audio id would if its curated file went missing).
      shrineChime: "/audio/bell_01.mp3",
      enemyHit: "/audio/hit_01.mp3",
      deathBat: "/audio/hit1.mp3",
      deathGoblin: "/audio/ouch.mp3",
      deathImp: "/audio/explodify.mp3",
      deathFlower: "/audio/splash.mp3",
      deathWyrmwolf: "/audio/explodify3.mp3",
      deathMech: "/audio/blast.mp3",
      deathWerewolf: "/audio/echosplosion.mp3",
      menuOpenSfx: "/audio/switch_01.mp3",
      menuCloseSfx: "/audio/switch_02.mp3",
      purchase: "/audio/bonus.mp3",
      collectCommon: "/audio/collect1.mp3",
      collectUncommon: "/audio/collect2.mp3",
      collectRare: "/audio/collect3.mp3",
      collectEpic: "/audio/collect4.mp3",
      doubleJumpGet: "/audio/spring_05.mp3",
      dashGet: "/audio/whistle.mp3",
    };

    const audioEntries = Object.fromEntries(
      Object.entries(audioFiles).map(([id, fallbackPath]) => {
        const stem = fallbackPath.split("/").pop()?.split(".")[0] ?? id;
        const resolved = resolveManifestAsset(this.assetManifest, stem, [".wav", ".ogg", ".mp3", ".flac"]);
        return [id, resolved ?? assetUrl(fallbackPath)];
      }),
    );

    await this.audio.loadAll(audioEntries);

    const playerId = getOrCreatePlayerId();
    if (playerId) void registerPlayer(playerId);

    const loaded = continueFromSave && (await this.loadSavedGame());
    if (!loaded) this.spawnIntoRoom(START_ROOM, "spawnPoint");
    void this.probeLootService();
    this.loop.start(
      (dt) => this.update(Math.min(dt, 0.05)),
      () => this.render(),
    );
  }

  destroy() {
    this.loop.stop();
    this.input.destroy();
    void this.audio.close();
  }

  /** UI-008: called from the React "?" button in GameCanvas.tsx. */
  toggleHelp() {
    this.helpOpen = !this.helpOpen;
  }

  setUiModalOpen(open: boolean) {
    const wasOpen = this.externalMenuOpen;
    this.externalMenuOpen = open;
    if (open) {
      this.inventoryOpen = false;
      this.helpOpen = false;
      this.shopOpen = false;
    }
    // Bug fix (Windsurf review): whatever key was "just pressed" at the
    // moment the menu closes (e.g. attack) must not leak into gameplay the
    // instant control returns to it.
    if (wasOpen && !open) this.input.flushPressed();
    if (open !== wasOpen) this.audio.play(open ? "menuOpenSfx" : "menuCloseSfx", 0.6);
    if (open && this.phase === "playing") {
      this.phase = "paused";
      this.externalMenuPaused = true;
      this.showMessage("Menu opened");
    } else if (!open && this.externalMenuPaused && this.phase === "paused") {
      this.phase = "playing";
      this.externalMenuPaused = false;
      this.showMessage("Menu closed");
    }
  }

  private async probeLootService() {
    const result = await fetchLootRoll(this.runSeed, 0, 1);
    this.lootSource = result.ok ? "python-service" : "client-fallback";
  }

  // ─────────────────────── room handling ───────────────────────

  private room(): LoadedRoom {
    const room = this.world.get(this.roomId);
    if (!room) throw new Error(`missing room ${this.roomId}`);
    return room;
  }

  private roomState(id: string): RoomState {
    let state = this.roomStates.get(id);
    if (!state) {
      const room = this.world.get(id);
      if (!room) throw new Error(`roomState: unknown room id "${id}"`);
      state = this.buildRoomState(room);
      this.roomStates.set(id, state);
    }
    return state;
  }

  private buildRoomState(room: LoadedRoom): RoomState {
    const enemies: Enemy[] = [];
    const pickups: Pickup[] = [];
    const interactables: Interactable[] = [];
    for (const spawn of room.spawns) {
      const x = spawn.col * TILE + TILE / 2;
      const y = spawn.row * TILE + TILE;
      switch (spawn.kind) {
        case "player":
          break;
        case "chest":
          pickups.push({ kind: "chest", x: x - 10, y: y - 16, w: 20, h: 16, vy: 0, bobT: 0 });
          break;
        case "coin":
          pickups.push({ kind: "coin", x: x - 5, y: y - 12, w: 10, h: 10, vy: 0, bobT: this.vfxRng.next() * 6 });
          break;
        case "health":
          pickups.push({ kind: "health", x: x - 7, y: y - 14, w: 14, h: 12, vy: 0, bobT: 0 });
          break;
        case "key":
          pickups.push({ kind: "key", x: x - 6, y: y - 14, w: 12, h: 12, vy: 0, bobT: 0 });
          break;
        case "doubleJump":
          pickups.push({ kind: "doubleJump", x: x - 8, y: y - 16, w: 16, h: 16, vy: 0, bobT: 0 });
          break;
        case "dash":
          pickups.push({ kind: "dash", x: x - 8, y: y - 16, w: 16, h: 16, vy: 0, bobT: 0 });
          break;
        case "shrine":
          interactables.push({ kind: "shrine", x: x - 10, y: y - 20, w: 20, h: 20 });
          break;
        case "shopkeeper":
          interactables.push({ kind: "shopkeeper", x: x - 12, y: y - 32, w: 24, h: 32 });
          break;
        default: {
          const def = ENEMY_DEFS[spawn.kind as EnemyKind];
          if (!def) break;
          enemies.push({
            kind: spawn.kind as EnemyKind,
            x: x - def.w / 2,
            y: y - def.h,
            w: def.w,
            h: def.h,
            vx: 0,
            vy: 0,
            hp: def.hp,
            maxHp: def.hp,
            facing: -1,
            anim: "idle",
            animTime: 0,
            stateTime: 0,
            state: "idle",
            homeX: x,
            homeY: y,
            touchDamage: def.touchDamage,
            level: def.level,
            boss: def.boss ?? false,
            burnT: 0,
            burnTickT: 0,
            freezeT: 0,
            shockT: 0,
            curseT: 0,
          });
        }
      }
    }
    return { enemies, pickups, interactables };
  }

  private spawnIntoRoom(roomId: string, mode: "spawnPoint" | { x: number; y: number }) {
    this.roomId = roomId;
    this.visitedRooms.add(roomId);
    const room = this.room();
    if (mode === "spawnPoint") {
      const spawn = room.spawns.find((s: Spawn) => s.kind === "player");
      this.px = (spawn ? spawn.col : 3) * TILE;
      this.py = (spawn ? spawn.row : 3) * TILE - this.ph;
    } else {
      this.px = mode.x;
      this.py = mode.y;
    }
    this.pvx = 0;
    this.pvy = 0;
    this.projectiles = [];
    this.updateMusic();
  }

  private updateMusic() {
    const room = this.room();
    const bossAlive = this.roomState(this.roomId).enemies.some((e) => e.boss && e.hp > 0);
    const wanted: "bg" | "boss" = room.boss && bossAlive ? "boss" : "bg";
    if (wanted !== this.musicMode) {
      this.musicMode = wanted;
      this.audio.playLoop("music", wanted === "boss" ? "boss_music" : "bg_music");
      if (wanted === "boss") this.audio.play("roar");
    }
  }

  // ─────────────────────── tiles / physics ───────────────────────

  private tileAt(col: number, row: number): number {
    if (col < 0 || col >= ROOM_W || row < 0 || row >= ROOM_H) return T_EMPTY;
    return this.room().tiles[row * ROOM_W + col];
  }

  private isSolidTile(tile: number): boolean {
    if (tile === T_SOLID) return true;
    if (tile === T_DOOR_KEY) return !this.flags.hasKey;
    if (tile === T_DOOR_BEAST) return !this.flags.mechSlain;
    return false;
  }

  private solidAt(x: number, y: number): boolean {
    return this.isSolidTile(this.tileAt(Math.floor(x / TILE), Math.floor(y / TILE)));
  }

  /** Move an AABB with tile collision. Returns {hitX, hitY, onGround}. */
  private moveBody(
    body: { x: number; y: number; w: number; h: number; vx: number; vy: number },
    dt: number,
    dropThrough = false,
  ) {
    let hitX = false;
    let hitY = false;
    let onGround = false;

    // horizontal
    let nx = body.x + body.vx * dt;
    if (body.vx !== 0) {
      const edge = body.vx > 0 ? nx + body.w : nx;
      for (let y = body.y + 1; y < body.y + body.h; y += TILE / 2) {
        if (this.solidAt(edge, y) || this.solidAt(edge, body.y + body.h - 1)) {
          hitX = true;
          break;
        }
      }
      if (hitX) {
        const col = Math.floor((body.vx > 0 ? nx + body.w : nx) / TILE);
        nx = body.vx > 0 ? col * TILE - body.w - 0.01 : (col + 1) * TILE + 0.01;
        body.vx = 0;
      }
    }
    body.x = nx;

    // vertical
    let ny = body.y + body.vy * dt;
    if (body.vy > 0) {
      const feetY = ny + body.h;
      const cols = [body.x + 1, body.x + body.w / 2, body.x + body.w - 1];
      for (const cx of cols) {
        const col = Math.floor(cx / TILE);
        const row = Math.floor(feetY / TILE);
        const tile = this.tileAt(col, row);
        const solid = this.isSolidTile(tile);
        const platform =
          tile === T_PLATFORM &&
          !dropThrough &&
          body.y + body.h <= row * TILE + 1; // was above the platform top
        if (solid || platform) {
          ny = row * TILE - body.h - 0.01;
          body.vy = 0;
          hitY = true;
          onGround = true;
          break;
        }
      }
    } else if (body.vy < 0) {
      const headY = ny;
      const cols = [body.x + 1, body.x + body.w - 1];
      for (const cx of cols) {
        if (this.solidAt(cx, headY)) {
          const row = Math.floor(headY / TILE);
          ny = (row + 1) * TILE + 0.01;
          body.vy = 0;
          hitY = true;
          break;
        }
      }
    }
    body.y = ny;
    return { hitX, hitY, onGround };
  }

  // ─────────────────────── stats from upgrades ───────────────────────

  private stat(id: UpgradeId): number {
    return this.upgrades[id] ?? 0;
  }

  private maxHp(): number {
    return 100 + this.stat("maxHp") + (this.level - 1) * 3;
  }

  private moveSpeed(): number {
    return 150 * (1 + this.stat("moveSpeed") / 100);
  }

  private jumpVelocity(): number {
    return -jumpPhysicsJumpVelocity(this.stat("jumpPower"));
  }

  private maxJumps(): number {
    return jumpPhysicsMaxJumps(this.stat("doubleJump") > 0);
  }

  private attackSpeed(): number {
    return this.weapon.speed * (1 + this.stat("attackSpeed") / 100);
  }

  private weaponDamage(): number {
    let dmg = this.weapon.damage + (this.level - 1) + this.shopAtkBonus;
    const critPct = this.stat("critChance") + (this.weapon.effect === "crit" ? 10 : 0);
    if (critPct > 0 && this.combatRng.next() * 100 < critPct) dmg *= 2;
    return dmg;
  }

  /** SYS-009: award XP for a kill and roll over as many level-ups as it earns. */
  private awardXp(amount: number) {
    this.xp += amount;
    let leveledUp = false;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level += 1;
      this.xpToNext = Math.round(this.level * 100 * 1.5);
      this.hp = this.maxHp();
      this.audio.play("levelup");
      this.showMessage(`LEVEL UP! Now level ${this.level}`);
      leveledUp = true;
    }
    // ADR-010: save once even if a single kill rolls over multiple levels.
    if (leveledUp) this.saveGame();
  }

  // ─────────────────────── update ───────────────────────

  private update(dt: number) {
    this.input.update();
    this.applyTouchTacticalFrame();
    if (this.externalMenuOpen) {
      this.pushSnapshot(dt);
      return;
    }
    if (this.input.state.pressed.help || (this.helpOpen && this.input.state.pressed.pause)) {
      this.helpOpen = !this.helpOpen;
    }
    // CR-009: Tab/KeyI ("inventory" in input.ts) used to also toggle
    // this.inventoryOpen here, racing against GameCanvas.tsx's own Tab/KeyI
    // listener (which drives the React GameMenuModal and always wins in
    // practice - it runs synchronously off the native keydown event, before
    // the next update() tick, and setUiModalOpen(true) early-returns above
    // before this line is ever reached). That made this dead code reachable
    // only by a timing coincidence, with input.ts's "inventory" action
    // bound to no other input source (no gamepad button). Removed so
    // GameCanvas.tsx is the single, unambiguous owner of Tab/KeyI;
    // this.inventoryOpen and drawInventoryOverlay() are left in place
    // (still forced false by setUiModalOpen(true) below) rather than torn
    // out, since retiring that overlay entirely is a separate decision
    // (see AST/CR-006's dead-UI-path note) outside this fix's scope.
    if (this.shopOpen) {
      this.updateShop();
      this.pushSnapshot(dt);
      return;
    }
    if (this.helpOpen || this.inventoryOpen) {
      this.pushSnapshot(dt);
      return;
    }

    this.animT += dt;
    if (this.messageT > 0) this.messageT -= dt;
    if (this.fadeT > 0) this.fadeT = Math.max(0, this.fadeT - dt / 0.5);
    if (this.equipFlashT > 0) this.equipFlashT -= dt;
    if (this.comboT > 0) this.comboT -= dt;
    this.updateParticles(dt);
    this.updateRarityBursts(dt);

    if (this.input.state.pressed.pause) {
      if (this.phase === "playing") {
        this.phase = "paused";
        this.showMessage("Paused");
        console.info("[game] paused");
      } else if (this.phase === "paused") {
        this.phase = "playing";
        this.showMessage("Resumed");
        console.info("[game] resumed");
      }
    }

    if (this.phase === "paused") {
      this.pushSnapshot(dt);
      return;
    }

    if (this.phase === "dead" || this.phase === "victory") {
      if (this.input.state.pressed.jump || this.input.state.pressed.interact) {
        this.respawn();
      }
      this.pushSnapshot(dt);
      return;
    }

    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updatePickups(dt);
    this.checkTransitions();
    this.pushSnapshot(dt);
  }

  private updatePlayer(dt: number) {
    const input = this.input.state;

    if (this.iframes > 0) this.iframes -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.attackAnimT > 0) this.attackAnimT -= dt;
    if (this.dashCooldown > 0) this.dashCooldown -= dt;

    if (input.held.respawn) {
      this.respawnHoldT += dt;
      if (this.respawnHoldT >= Game.RESPAWN_HOLD_SECONDS) {
        this.respawnHoldT = 0;
        this.handleSelfDestruct();
      }
    } else {
      this.respawnHoldT = 0;
    }

    // movement
    const speed = this.moveSpeed();
    if (this.dashT > 0) {
      this.dashT -= dt;
      this.pvx = this.facing * speed * 2.6;
    } else {
      const ax = input.axisX;
      this.pvx = ax * speed;
      if (ax < 0) this.facing = -1;
      if (ax > 0) this.facing = 1;
    }

    // jumping (coyote time + optional double jump) — state machine lives in
    // jump-physics.ts (ADR-014) so the coyote/double-jump edge cases are
    // unit-testable without a canvas-backed Game.
    const grounded = tickGroundedState(
      { onGround: this.onGround, coyoteT: this.coyoteT, jumpsUsed: this.jumpsUsed },
      dt,
    );
    this.coyoteT = grounded.coyoteT;
    this.jumpsUsed = grounded.jumpsUsed;
    if (input.pressed.jump) {
      const resolution = resolveJumpPress(
        { onGround: this.onGround, coyoteT: this.coyoteT, jumpsUsed: this.jumpsUsed },
        this.maxJumps(),
      );
      this.coyoteT = resolution.coyoteT;
      this.jumpsUsed = resolution.jumpsUsed;
      if (resolution.jumped) {
        this.pvy = this.jumpVelocity();
        this.audio.play("jump", 0.7);
      }
    }
    // variable jump height
    if (!input.held.jump && this.pvy < -120) this.pvy = -120;

    // dodge / dash
    if (input.pressed.dodge && this.dashCooldown <= 0) {
      const hasModule = this.stat("dash") > 0;
      this.dashT = hasModule ? 0.22 : 0.12;
      this.dashCooldown = 0.7;
      this.iframes = Math.max(this.iframes, this.dashT + 0.1);
    }

    // gravity
    this.pvy += 900 * dt;
    if (this.pvy > 420) this.pvy = 420;

    const body = { x: this.px, y: this.py, w: this.pw, h: this.ph, vx: this.pvx, vy: this.pvy };
    const result = this.moveBody(body, dt, input.held.down);
    this.px = body.x;
    this.py = body.y;
    this.pvx = body.vx;
    this.pvy = body.vy;
    this.onGround = result.onGround;

    // AST-005: footstep cadence while walking on solid ground
    if (this.onGround && Math.abs(this.pvx) > 10 && this.dashT <= 0) {
      this.stepT -= dt;
      if (this.stepT <= 0) {
        this.stepT = 0.28;
        this.audio.play("step", 0.35);
      }
    } else {
      this.stepT = 0;
    }

    // spikes
    const midCol = Math.floor((this.px + this.pw / 2) / TILE);
    const feetRow = Math.floor((this.py + this.ph) / TILE);
    if (this.tileAt(midCol, feetRow) === T_SPIKE && this.iframes <= 0) {
      this.damagePlayer(12);
      this.pvy = -260;
    }

    // attack
    if (input.pressed.attack && this.attackCooldown <= 0) {
      this.attackCooldown = 1 / this.attackSpeed();
      this.attackAnimT = 0.14;
      this.audio.play(this.weapon.sound, 0.8);
      if (this.weapon.kind === "melee") {
        this.meleeStrike();
      } else {
        const speed = this.weapon.projectileSpeed ?? 300;
        this.projectiles.push({
          x: this.px + this.pw / 2 + this.facing * 10,
          y: this.py + this.ph * 0.45,
          vx: this.facing * speed,
          vy: 0,
          damage: this.weaponDamage(),
          friendly: true,
          ttl: this.weapon.range / speed,
          color: this.weapon.kind === "magic" ? "#c084fc" : "#f87171",
          r: this.weapon.kind === "magic" ? 4 : 2.5,
          effect: this.weapon.effect,
        });
      }
    }

    this.checkInteractables(input);

    // weapon swap
    if (input.pressed.useItem && this.secondary) {
      const held = this.weapon;
      this.weapon = this.secondary;
      this.secondary = held;
      this.audio.play("select", 0.7);
      this.showMessage(`Swapped to ${this.weapon.name}`);
      this.triggerEquipFx();
    }

    if (this.hp <= 0 && this.phase === "playing") {
      this.phase = "dead";
      this.deathsThisSeed += 1;
      this.audio.stopAllLoops();
      this.musicMode = "none";
      this.audio.play("gameover");
    }
  }

  private meleeStrike() {
    const reach = this.weapon.range;
    const hitbox = {
      x: this.facing > 0 ? this.px + this.pw : this.px - reach,
      y: this.py - 4,
      w: reach,
      h: this.ph + 8,
    };
    const enemies = this.roomState(this.roomId).enemies;
    for (const enemy of enemies) {
      if (enemy.hp <= 0) continue;
      if (rectsOverlap(hitbox, enemy)) {
        this.damageEnemy(enemy, this.weaponDamage(), { effect: this.weapon.effect });
      }
    }
  }

  private applyStatus(effect: WeaponInstance["effect"], enemy: Enemy, amount: number) {
    if (!effect) return;
    if (effect === "burn") {
      enemy.burnT = Math.max(enemy.burnT, 3.5);
      return;
    }
    if (effect === "freeze") {
      enemy.freezeT = Math.max(enemy.freezeT, 1.75);
      return;
    }
    if (effect === "shock") {
      enemy.shockT = Math.max(enemy.shockT, 0.6);
      const splash = amount * 0.35;
      if (splash > 0) {
        const enemies = this.roomState(this.roomId).enemies;
        for (const other of enemies) {
          if (other === enemy || other.hp <= 0) continue;
          if (Math.abs(other.x - enemy.x) <= 42 && Math.abs(other.y - enemy.y) <= 32) {
            this.damageEnemy(other, splash, {
              bypassStatusMult: true,
              applyOnHitEffects: false,
            });
          }
        }
      }
      return;
    }
    if (effect === "curse") {
      enemy.curseT = Math.max(enemy.curseT, 4.5);
    }
  }

  private damageEnemy(enemy: Enemy, amount: number, options: DamageOptions = {}) {
    const scaled =
      !options.bypassStatusMult && enemy.curseT > 0 ? amount * 1.22 : amount;
    enemy.hp -= scaled;
    enemy.animTime = 0;
    // AST-015: hit FX reflects the equipped weapon's rarity - a heavier,
    // more dramatic burst for a rarer weapon reinforces its quality on
    // every swing, not just on the moment it was picked up.
    this.spawnRarityBurst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, this.weapon.rarity);
    if (
      options.applyOnHitEffects !== false &&
      (this.weapon.effect === "lifesteal" || this.stat("lifeSteal") > 0)
    ) {
      const pct = (this.weapon.effect === "lifesteal" ? 8 : 0) + this.stat("lifeSteal");
      this.hp = Math.min(this.maxHp(), this.hp + (scaled * pct) / 100);
    }
    if (enemy.hp > 0 && options.effect) {
      this.applyStatus(options.effect, enemy, scaled);
    }
    if (enemy.hp <= 0) {
      this.onEnemyKilled(enemy);
    } else {
      // ADR-016: distinct from "kill" (death) and from the player's own
      // "hit" (damage taken) - a hit that doesn't finish the enemy off.
      this.audio.play("enemyHit", 0.5);
    }
  }

  // ADR-016: per-enemy-kind death sound, falling back to the original
  // shared "kill" for any kind not explicitly mapped (keeps this additive,
  // never a silent regression if a new EnemyKind is added later).
  private static readonly DEATH_SOUND: Partial<Record<EnemyKind, string>> = {
    bat: "deathBat",
    goblin: "deathGoblin",
    imp: "deathImp",
    flower: "deathFlower",
    wyrmwolf: "deathWyrmwolf",
    mech: "deathMech",
    werewolf: "deathWerewolf",
  };

  private onEnemyKilled(enemy: Enemy) {
    this.enemiesDefeated += 1;
    this.audio.play(Game.DEATH_SOUND[enemy.kind] ?? "kill", 0.8);
    this.awardXp(enemy.level * 10);
    const killedInRoom = this.roomId;
    const cx = enemy.x + enemy.w / 2;
    const cy = enemy.y + enemy.h / 2;

    if (enemy.kind === "werewolf") {
      this.flags.beastSlain = true;
      this.phase = "victory";
      this.audio.stopAllLoops();
      this.musicMode = "none";
      this.audio.play("victory");
    }
    if (enemy.kind === "wyrmwolf") this.flags.wyrmSlain = true;
    if (enemy.kind === "mech") {
      this.flags.mechSlain = true;
      this.showMessage("The beast door grinds open...");
      this.audio.play("door", 0.9);
      this.audio.play("explosion", 0.9);
    }
    if (enemy.boss) this.updateMusic();

    // drops: bosses always drop loot, others 25% (plus coins)
    const dropChance = enemy.boss ? 1 : 0.25;
    if (this.lootRng.chance(dropChance)) {
      const stateAtKill = this.roomStates.get(killedInRoom);
      void this.rollLoot(enemy.level).then((loot) => {
        if (!stateAtKill || this.roomStates.get(killedInRoom) !== stateAtKill) return;
        stateAtKill.pickups.push({
          kind: "loot",
          x: cx - 8,
          y: cy - 8,
          w: 16,
          h: 16,
          vy: -120,
          loot,
          bobT: 0,
        });
      });
    } else {
      this.roomState(killedInRoom).pickups.push({ kind: "coin", x: cx - 5, y: cy - 5, w: 10, h: 10, vy: -100, bobT: 0 });
    }
  }

  private damagePlayer(amount: number) {
    if (this.iframes > 0 || this.phase !== "playing") return;
    const reduced = amount * (1 - Math.min(60, this.stat("defense")) / 100);
    this.hp -= reduced;
    this.iframes = 0.8;
    this.audio.play("hit", 0.9);
    if (this.stat("thorns") > 0) {
      // thorns damages nearby enemies
      const enemies = this.roomState(this.roomId).enemies;
      for (const enemy of enemies) {
        if (enemy.hp > 0 && Math.abs(enemy.x - this.px) < 40 && Math.abs(enemy.y - this.py) < 40) {
          this.damageEnemy(enemy, this.stat("thorns"));
        }
      }
    }
  }

  // ─────────────────────── enemies ───────────────────────

  private updateEnemies(dt: number) {
    const state = this.roomState(this.roomId);
    const pcx = this.px + this.pw / 2;
    const pcy = this.py + this.ph / 2;
    // Summons (werewolf howl) are queued and appended AFTER the loop —
    // pushing into state.enemies while for..of iterates it would make the
    // iterator visit and update brand-new entries mid-frame.
    const summons: Enemy[] = [];

    for (const enemy of state.enemies) {
      if (enemy.hp <= 0) continue;
      // Prefix effects on weapons are resolved here so they work for any enemy.
      // Burn deals periodic DOT; freeze/shock slow behavior; curse amplifies damage.
      if (enemy.burnT > 0) {
        enemy.burnT = Math.max(0, enemy.burnT - dt);
        enemy.burnTickT -= dt;
        if (enemy.burnTickT <= 0) {
          enemy.burnTickT = 0.45;
          this.damageEnemy(enemy, 3 + enemy.level * 0.7, {
            bypassStatusMult: true,
            applyOnHitEffects: false,
          });
          if (enemy.hp <= 0) continue;
        }
      } else {
        enemy.burnTickT = 0;
      }
      if (enemy.freezeT > 0) enemy.freezeT = Math.max(0, enemy.freezeT - dt);
      if (enemy.shockT > 0) enemy.shockT = Math.max(0, enemy.shockT - dt);
      if (enemy.curseT > 0) enemy.curseT = Math.max(0, enemy.curseT - dt);

      enemy.animTime += dt;
      enemy.stateTime += dt;
      const distX = pcx - (enemy.x + enemy.w / 2);
      const distY = pcy - (enemy.y + enemy.h / 2);
      const dist = Math.hypot(distX, distY);
      const speedScale =
        enemy.freezeT > 0 ? 0.42 : enemy.shockT > 0 ? 0.7 : 1;
      const stunned = enemy.shockT > 0;

      switch (enemy.kind) {
        case "bat": {
          enemy.anim = "fly";
          if (dist < 140) {
            enemy.vx = Math.sign(distX) * 60 * speedScale;
            enemy.vy =
              (Math.sign(distY) * 45 + Math.sin(this.animT * 6 + enemy.homeX) * 25) *
              speedScale;
          } else {
            enemy.vx = Math.sin(this.animT * 2 + enemy.homeX) * 30 * speedScale;
            enemy.vy = Math.cos(this.animT * 2.4 + enemy.homeY) * 20 * speedScale;
          }
          enemy.x += enemy.vx * dt;
          enemy.y += enemy.vy * dt;
          enemy.facing = enemy.vx < 0 ? -1 : 1;
          break;
        }
        case "goblin": {
          // patrol; lunge when player near on similar height
          const near = Math.abs(distX) < 120 && Math.abs(distY) < 40;
          enemy.anim = near ? "attack" : "walk";
          const speed = (near ? 70 : 35) * speedScale;
          if (enemy.state === "idle") {
            enemy.state = "patrol";
            enemy.vx = -speed;
          }
          if (near) enemy.vx = Math.sign(distX) * speed;
          enemy.facing = enemy.vx < 0 ? -1 : 1;
          this.enemyWalk(enemy, dt);
          break;
        }
        case "imp": {
          const near = Math.abs(distX) < 180 && Math.abs(distY) < 60;
          enemy.anim = enemy.vx < 0 ? "walkLeft" : "walkRight";
          enemy.vx = near
            ? Math.sign(distX) * 80 * speedScale
            : Math.sin(this.animT + enemy.homeX) * 30 * speedScale;
          enemy.facing = enemy.vx < 0 ? -1 : 1;
          this.enemyWalk(enemy, dt);
          break;
        }
        case "flower": {
          const near = dist < 210;
          enemy.anim = near ? "attack" : "idle";
          if (!stunned && near && enemy.stateTime > 2.2) {
            enemy.stateTime = 0;
            const angle = Math.atan2(distY, distX);
            this.projectiles.push({
              x: enemy.x + enemy.w / 2,
              y: enemy.y + 6,
              vx: Math.cos(angle) * 130,
              vy: Math.sin(angle) * 130,
              damage: 10,
              friendly: false,
              ttl: 2.4,
              color: "#a3e635",
              r: 4,
            });
            this.audio.play("magic", 0.5);
          }
          break;
        }
        case "wyrmwolf": {
          // charges back and forth, roars on aggro
          enemy.anim = "idle";
          if (enemy.state === "idle" && dist < 260) {
            enemy.state = "charge";
            enemy.stateTime = 0;
            enemy.vx = Math.sign(distX) * 150 * speedScale;
            this.audio.play("growl", 0.9);
          }
          if (enemy.state === "charge") {
            enemy.facing = enemy.vx < 0 ? -1 : 1;
            const walked = this.enemyWalk(enemy, dt, false);
            if (walked.hitX || enemy.stateTime > 2.4) {
              enemy.state = "rest";
              enemy.stateTime = 0;
              enemy.vx = 0;
            }
          } else if (enemy.state === "rest" && enemy.stateTime > 0.9) {
            enemy.state = "charge";
            enemy.stateTime = 0;
            enemy.vx =
              Math.sign(distX) *
              (enemy.hp < enemy.maxHp / 2 ? 200 : 150) *
              speedScale;
          } else if (enemy.state !== "charge") {
            this.enemyWalk(enemy, dt);
          }
          break;
        }
        case "mech": {
          // hovers in a slow sine, volleys lasers
          enemy.anim = "idle";
          enemy.y = enemy.homeY - enemy.h - 30 + Math.sin(this.animT * 1.4) * 22;
          enemy.x += Math.sign(distX) * 22 * speedScale * dt;
          enemy.facing = distX < 0 ? -1 : 1;
          const volleyEvery = enemy.hp < enemy.maxHp / 2 ? 1.6 : 2.4;
          if (!stunned && dist < 320 && enemy.stateTime > volleyEvery) {
            enemy.stateTime = 0;
            for (const spread of [-0.15, 0, 0.15]) {
              const angle = Math.atan2(distY, distX) + spread;
              this.projectiles.push({
                x: enemy.x + enemy.w / 2,
                y: enemy.y + enemy.h / 2,
                vx: Math.cos(angle) * 190,
                vy: Math.sin(angle) * 190,
                damage: 12,
                friendly: false,
                ttl: 2.2,
                color: "#f87171",
                r: 3,
              });
            }
            this.audio.play("laser", 0.6);
          }
          break;
        }
        case "werewolf": {
          const enraged = enemy.hp < enemy.maxHp / 2;
          if (enemy.state === "idle") {
            if (dist < 300) {
              enemy.state = "chase";
              this.audio.play("roar");
            }
            enemy.anim = "idle";
          } else if (enemy.state === "chase") {
            enemy.anim = enraged ? "run" : "walk";
            enemy.vx = Math.sign(distX) * (enraged ? 130 : 70) * speedScale;
            enemy.facing = enemy.vx < 0 ? -1 : 1;
            this.enemyWalk(enemy, dt);
            if (!stunned && Math.abs(distX) < 60 && Math.abs(distY) < 60) {
              enemy.state = "attack";
              enemy.stateTime = 0;
              enemy.anim = "attack";
              enemy.animTime = 0;
            } else if (!stunned && enraged && enemy.stateTime > 6) {
              enemy.state = "howl";
              enemy.stateTime = 0;
              enemy.animTime = 0;
              this.audio.play("roar");
            }
          } else if (enemy.state === "attack") {
            enemy.anim = "attack";
            enemy.vx = 0;
            if (enemy.stateTime > 0.5 && enemy.stateTime < 0.65) {
              const clawBox = {
                x: enemy.facing > 0 ? enemy.x + enemy.w : enemy.x - 36,
                y: enemy.y,
                w: 36,
                h: enemy.h,
              };
              if (rectsOverlap(clawBox, { x: this.px, y: this.py, w: this.pw, h: this.ph })) {
                this.damagePlayer(20);
              }
            }
            if (enemy.stateTime > 0.9) {
              enemy.state = "chase";
              enemy.stateTime = 0;
            }
          } else if (enemy.state === "howl") {
            enemy.anim = "howl";
            enemy.vx = 0;
            if (enemy.stateTime > 1.4) {
              enemy.state = "chase";
              enemy.stateTime = 0;
              // summon two bats (queued; appended after the loop)
              for (const offset of [-60, 60]) {
                const def = ENEMY_DEFS.bat;
                summons.push({
                  kind: "bat",
                  x: enemy.x + offset,
                  y: enemy.y - 40,
                  w: def.w,
                  h: def.h,
                  vx: 0,
                  vy: 0,
                  hp: def.hp,
                  maxHp: def.hp,
                  facing: -1,
                  anim: "fly",
                  animTime: 0,
                  stateTime: 0,
                  state: "idle",
                  homeX: enemy.x + offset,
                  homeY: enemy.y - 40,
                  touchDamage: def.touchDamage,
                  level: def.level,
                  boss: false,
                  burnT: 0,
                  burnTickT: 0,
                  freezeT: 0,
                  shockT: 0,
                  curseT: 0,
                });
              }
            }
          }
          break;
        }
      }

      // contact damage
      if (
        this.iframes <= 0 &&
        rectsOverlap(enemy, { x: this.px, y: this.py, w: this.pw, h: this.ph })
      ) {
        this.damagePlayer(enemy.touchDamage);
        this.pvx = Math.sign(this.px - enemy.x) * 180;
        this.pvy = -180;
      }
    }

    if (summons.length) state.enemies.push(...summons);
  }

  /** Ground enemy movement with gravity + ledge/wall handling. */
  private enemyWalk(enemy: Enemy, dt: number, turnAtLedges = true) {
    enemy.vy += 900 * dt;
    if (enemy.vy > 420) enemy.vy = 420;
    const body = { x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h, vx: enemy.vx, vy: enemy.vy };
    const result = this.moveBody(body, dt);
    enemy.x = body.x;
    enemy.y = body.y;
    enemy.vy = body.vy;
    if (result.hitX) {
      enemy.vx = -enemy.vx;
      enemy.facing = enemy.vx < 0 ? -1 : 1;
    } else if (turnAtLedges && result.onGround && enemy.vx !== 0) {
      const aheadX = enemy.vx > 0 ? enemy.x + enemy.w + 2 : enemy.x - 2;
      const footY = enemy.y + enemy.h + 4;
      const tile = this.tileAt(Math.floor(aheadX / TILE), Math.floor(footY / TILE));
      if (tile === T_EMPTY) {
        enemy.vx = -enemy.vx;
        enemy.facing = enemy.vx < 0 ? -1 : 1;
      }
    }
    return result;
  }

  // ─────────────────────── projectiles & pickups ───────────────────────

  private updateProjectiles(dt: number) {
    const enemies = this.roomState(this.roomId).enemies;
    this.projectiles = this.projectiles.filter((p) => {
      p.ttl -= dt;
      if (p.ttl <= 0) return false;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (this.solidAt(p.x, p.y)) return false;

      if (p.friendly) {
        for (const enemy of enemies) {
          if (enemy.hp > 0 && pointInRect(p.x, p.y, enemy)) {
            this.damageEnemy(enemy, p.damage, { effect: p.effect });
            return false;
          }
        }
      } else if (
        this.iframes <= 0 &&
        pointInRect(p.x, p.y, { x: this.px, y: this.py, w: this.pw, h: this.ph })
      ) {
        this.damagePlayer(p.damage);
        return false;
      }
      return true;
    });
  }

  /**
    * Nearest solid/platform floor Y for a given column, scanning upward from
    * the bottom of the room. Falls back to the room's vertical center if the
   * column is a sheer drop with no floor (open bottom edge) so pit rescue
   * always has somewhere to land instead of despawning the item.
   */
  private findGroundY(x: number): number {
    const col = Math.floor(x / TILE);
    for (let row = ROOM_H - 1; row >= 0; row--) {
      if (this.isSolidTile(this.tileAt(col, row)) || this.tileAt(col, row) === T_PLATFORM) {
        return row * TILE;
      }
    }
    return VIEW_H / 2;
  }

  /** UI-002: brief gold tint + particle burst around the hero on any weapon (un)equip. */
  private triggerEquipFx() {
    this.equipFlashT = 0.3;
    this.spawnSparkle(this.px + this.pw / 2, this.py + this.ph / 2, RARITIES[this.weapon.rarity].color, 8);
  }

  private spawnSparkle(x: number, y: number, color = "#facc15", count = 4) {
    for (let i = 0; i < count; i++) {
      const angle = this.vfxRng.next() * Math.PI * 2;
      const speed = 40 + this.vfxRng.next() * 50;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        life: 0.45,
        maxLife: 0.45,
        color,
      });
    }
  }

  private spawnFloatingText(x: number, y: number, text: string, color = "#ffe08a") {
    this.particles.push({ x, y, vx: 0, vy: -34, life: 0.6, maxLife: 0.6, color, text });
  }

  // AST-015: 48x48 7-frame burst sheets, cropped/registered per-rarity by
  // scripts/prepare-assets.py (see its comment block for the colour-to-
  // rarity mapping rationale). Non-looping - one play-through then removed.
  private static readonly IMPACT_BURST_FPS = 14;
  private spawnRarityBurst(x: number, y: number, rarity: Rarity) {
    this.rarityBursts.push({ x, y, rarity, animT: 0 });
  }

  private updateRarityBursts(dt: number) {
    const BURST_FRAMES = 7;
    const maxT = BURST_FRAMES / Game.IMPACT_BURST_FPS;
    this.rarityBursts = this.rarityBursts.filter((b) => {
      b.animT += dt;
      return b.animT < maxT;
    });
  }

  private drawRarityBursts() {
    for (const b of this.rarityBursts) {
      this.drawSheetAnim(
        impactBurstSheet(b.rarity),
        "burst",
        b.animT,
        b.x - 24,
        b.y - 24,
        48,
        48,
        false,
        Game.IMPACT_BURST_FPS,
      );
    }
  }

  private updateParticles(dt: number) {
    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 90 * dt;
      return p.life > 0;
    });
  }

  private drawParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      if (p.text) {
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(p.text, p.x, p.y);
        ctx.textAlign = "left";
      } else {
        ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
      }
    }
    ctx.globalAlpha = 1;
  }

  private updatePickups(dt: number) {
    const state = this.roomState(this.roomId);
    const magnet = this.stat("coinMagnet");
    const playerRect = { x: this.px, y: this.py, w: this.pw, h: this.ph };

    state.pickups = state.pickups.filter((pickup) => {
      pickup.bobT += dt;
      // simple gravity for dropped loot
      if (pickup.vy !== 0) {
        pickup.vy += 700 * dt;
        pickup.y += pickup.vy * dt;
        if (this.solidAt(pickup.x + pickup.w / 2, pickup.y + pickup.h)) {
          pickup.y = Math.floor((pickup.y + pickup.h) / TILE) * TILE - pickup.h;
          pickup.vy = 0;
        }
        if (pickup.y > VIEW_H) {
          // Pit rescue (BUG-001): the column had no floor before the item fell
          // out of view (open bottom edge / bottomless pit). Rather than
          // despawn a real reward, place it on the nearest solid ground in
          // its column, clamped inside the room so it's always reachable.
          const rescueX = Math.min(Math.max(pickup.x, TILE), VIEW_W - pickup.w - TILE);
          pickup.x = rescueX;
          pickup.y = this.findGroundY(rescueX + pickup.w / 2) - pickup.h;
          pickup.vy = 0;
        }
      }
      // coin magnet
      if (pickup.kind === "coin" && magnet > 0) {
        const dx = this.px - pickup.x;
        const dy = this.py - pickup.y;
        if (Math.hypot(dx, dy) < magnet) {
          pickup.x += Math.sign(dx) * 120 * dt;
          pickup.y += Math.sign(dy) * 120 * dt;
        }
      }

      if (!rectsOverlap(pickup, playerRect)) return true;

      switch (pickup.kind) {
        case "coin": {
          this.coins += 1;
          // UX-006: rapid consecutive pickups pitch the coin sound up (combo feel).
          this.comboCount = this.comboT > 0 ? Math.min(5, this.comboCount + 1) : 1;
          this.comboT = 1.5;
          const rate = 1 + (this.comboCount - 1) * 0.125;
          this.audio.play("coin", 0.6, rate);
          this.spawnFloatingText(pickup.x + pickup.w / 2, pickup.y, "+1");
          this.spawnSparkle(pickup.x + pickup.w / 2, pickup.y + pickup.h / 2);
          return false;
        }
        case "health":
          this.hp = Math.min(this.maxHp(), this.hp + 30);
          this.audio.play("powerup", 0.7);
          this.showMessage("+30 HP");
          return false;
        case "key":
          this.flags.hasKey = true;
          this.audio.play("levelup");
          this.showMessage("Ancient Key — a sealed door somewhere unlocks");
          return false;
        case "doubleJump":
          this.upgrades.doubleJump = 1;
          // ADR-016: an ability unlock is a bigger moment than a stat pickup
          // - it earns its own sound, not the shared "levelup".
          this.audio.play("doubleJumpGet", 0.9);
          this.showMessage("Aether Wings — press jump in mid-air!");
          return false;
        case "dash":
          this.upgrades.dash = 1;
          this.audio.play("dashGet", 0.9);
          this.showMessage("Phase Dash Module — dodge goes further");
          return false;
        case "chest": {
          if (pickup.opened) return true;
          pickup.opened = true;
          this.audio.play("chest", 0.9);
          // Capture the room the chest lives in AT OPEN TIME. Comparing against
          // this.roomId at resolution time (the old code) had two failure modes:
          // loot silently lost if the player walked to another room mid-roll,
          // and — same category as the respawn loot race — a wrong-room check
          // after roomStates.clear(). Identity check on the captured room's
          // state object covers both.
          const roomAtOpen = this.roomId;
          const stateAtOpen = this.roomStates.get(roomAtOpen);
          void this.rollLoot(3).then((loot) => {
            if (!stateAtOpen || this.roomStates.get(roomAtOpen) !== stateAtOpen) return;
            stateAtOpen.pickups.push({
              kind: "loot",
              x: pickup.x,
              y: pickup.y - 14,
              w: 16,
              h: 16,
              vy: -140,
              loot,
              bobT: 0,
            });
          });
          return true;
        }
        case "loot": {
          if (!pickup.loot) return false;
          this.applyLoot(pickup.loot, pickup.x + pickup.w / 2, pickup.y + pickup.h / 2);
          return false;
        }
      }
      return true;
    });
  }

  // ADR-016: common vs epic loot should SOUND different, not just look it -
  // reuses the 4-tier Rarity scale already on every LootDrop.
  private static readonly RARITY_SOUND: Record<Rarity, string> = {
    common: "collectCommon",
    uncommon: "collectUncommon",
    rare: "collectRare",
    epic: "collectEpic",
  };

  /** x/y default to the player's center (shop/mystery-box purchases have no
   *  world pickup location) so every call site doesn't need to special-case it. */
  private applyLoot(loot: LootDrop, x = this.px + this.pw / 2, y = this.py + this.ph / 2) {
    // AST-015: rarity-colored burst on every pickup, not just weapon
    // equips (which already get triggerEquipFx()'s separate gold ring).
    this.spawnRarityBurst(x, y, loot.rarity);
    if (loot.itemType === "upgrade") {
      const current = this.upgrades[loot.upgradeId] ?? 0;
      this.upgrades[loot.upgradeId] = current + loot.value;
      if (loot.upgradeId === "maxHp") this.hp += loot.value;
      this.audio.play(Game.RARITY_SOUND[loot.rarity], 0.8);
      this.showMessage(`${describeLoot(loot)} [${loot.rolledBy}]`);
      return;
    }
    // weapon: auto-equip if better DPS, otherwise stash to secondary
    const dps = (w: WeaponInstance) => w.damage * w.speed;
    this.audio.play(Game.RARITY_SOUND[loot.rarity], 0.8);
    if (dps(loot) >= dps(this.weapon)) {
      this.secondary = this.weapon;
      this.weapon = loot;
      this.showMessage(`Equipped ${describeLoot(loot)}`);
      this.triggerEquipFx();
      this.saveGame(); // ADR-010: equipment change is a save checkpoint
    } else if (!this.secondary || dps(loot) > dps(this.secondary)) {
      this.secondary = loot;
      this.showMessage(`Stashed ${describeLoot(loot)} (Y/L to swap)`);
    } else {
      this.coins += 5;
      this.showMessage(`Scrapped ${loot.name} (+5 coins)`);
    }
  }

  /** Luck-equivalent added per consecutive sub-rare drop. Rides the existing
   *  luck formula (identical on Python + fallback paths, see items.ts), so
   *  pity works on BOTH paths with zero changes to either roller. */
  private static readonly PITY_LUCK_PER_MISS = 15;

  private async rollLoot(enemyLevel: number): Promise<LootDrop> {
    this.dropLootCounter += 1;
    const seed = this.runSeed + this.dropLootCounter * 7919;
    // Pity timer: each sub-rare drop raises effective luck; rare+ resets it.
    // Capped so a long drought guarantees "very likely", not "certain" —
    // certainty would let testers farm pity deliberately.
    const luck = this.stat("luck") + Math.min(300, this.lootPity * Game.PITY_LUCK_PER_MISS);
    const drop = await this.fetchOrFallbackRoll(seed, luck, enemyLevel);
    const pityReset = rarityAtLeast(drop.rarity, "rare");
    if (pityReset) {
      this.lootPity = 0;
    } else {
      this.lootPity += 1;
    }
    return drop;
  }

  private async fetchOrFallbackRoll(seed: number, luck: number, enemyLevel: number): Promise<LootDrop> {
    const abort = new AbortController();
    // Timeout so a hung request degrades to the fallback instead of a drop
    // that never lands (fetch has no default timeout).
    const timer = setTimeout(() => abort.abort(), 3000);
    try {
      const result = await fetchLootRoll(seed, luck, enemyLevel, abort.signal);
      if (!result.ok) {
        console.warn(`[loot] ${result.error} from python-service — using client fallback`);
        this.lootSource = "client-fallback";
        return fallbackRoll(seed, luck, enemyLevel);
      }
      this.lootSource = "python-service";
      return result.drop;
    } finally {
      clearTimeout(timer);
    }
  }

  // ─────────────────────── transitions / respawn ───────────────────────

  private checkTransitions() {
    const exits = this.room().exits;
    if (this.px + this.pw < 0) {
      if (exits.left) this.goToRoom(exits.left, { x: VIEW_W - this.pw - 2, y: this.py });
      else this.px = 0;
    } else if (this.px > VIEW_W) {
      if (exits.right) this.goToRoom(exits.right, { x: 2, y: this.py });
      else this.px = VIEW_W - this.pw;
    } else if (this.py + this.ph < 0) {
      if (exits.up) this.goToRoom(exits.up, { x: this.px, y: VIEW_H - this.ph - 2 });
      else this.py = 0;
    } else if (this.py > VIEW_H) {
      if (exits.down) this.goToRoom(exits.down, { x: this.px, y: 2 });
      else this.py = VIEW_H - this.ph;
    }
  }

  private goToRoom(roomId: string, position: { x: number; y: number }) {
    this.roomId = roomId;
    this.visitedRooms.add(roomId);
    this.px = position.x;
    this.py = position.y;
    this.projectiles = [];
    this.roomState(roomId); // materialize
    this.updateMusic();
    // ADR-010: room transition is the primary auto-save checkpoint - frequent
    // enough that "continue" resumes close to where the player left off,
    // without saving mid-death (respawn() below never calls saveGame()).
    this.saveGame();
  }

  private respawn() {
    this.hp = this.maxHp();
    this.phase = "playing";
    // Snapshot cleared state before wiping room states so the minimap survives respawn.
    for (const [id, state] of this.roomStates) {
      if (state.enemies.every((e) => e.hp <= 0)) this.clearedRooms.add(id);
    }
    this.roomStates.clear(); // enemies respawn; upgrades/weapons/flags are kept
    this.musicMode = "none";
    this.spawnIntoRoom(START_ROOM, "spawnPoint");
  }

  /**
   * UX-004: soft-lock recovery. Holding "respawn" teleports the player to a
   * safe standable spot in the CURRENT room (no full room reset, unlike
   * respawn() above) so a dead-end doesn't force a hard page refresh that
   * wipes progress. Costs 10% of current coins, or 1 HP if broke — never
   * enough to cause a cheap game-over on its own.
   */
  private handleSelfDestruct() {
    if (this.coins > 0) {
      this.coins = Math.max(0, this.coins - Math.max(1, Math.round(this.coins * 0.1)));
    } else {
      this.hp = Math.max(1, this.hp - 1);
    }
    const safeX = VIEW_W / 2;
    this.px = safeX - this.pw / 2;
    this.py = this.findGroundY(safeX) - this.ph;
    this.pvx = 0;
    this.pvy = 0;
    this.iframes = 1;
    this.fadeT = 1;
    this.audio.play("magic", 0.8);
    this.showMessage("Reset to safety");
  }

  // ─────────────────────── shrine / shop interactables (SYS-011 / SYS-012) ───────────────────────

  private checkInteractables(input: import("./input").InputState) {
    if (!input.pressed.interact) return;
    const playerRect = { x: this.px, y: this.py, w: this.pw, h: this.ph };
    for (const it of this.roomState(this.roomId).interactables) {
      if (!rectsOverlap(playerRect, { x: it.x - 6, y: it.y - 6, w: it.w + 12, h: it.h + 12 })) continue;
      if (it.kind === "shrine") {
        this.activateShrine();
      } else if (it.kind === "shopkeeper") {
        this.shopOpen = true;
      }
      break;
    }
  }

  private activateShrine() {
    this.hp = this.maxHp();
    this.saveGame();
    this.audio.play("shrineChime", 0.8);
    this.showMessage("GAME SAVED");
  }

  private saveGame() {
    if (typeof localStorage === "undefined") return;
    const data = buildSaveData({
      roomId: this.world.has(this.roomId) ? this.roomId : START_ROOM,
      px: this.px,
      py: this.py,
      viewW: VIEW_W,
      viewH: VIEW_H,
      playerW: this.pw,
      playerH: this.ph,
      maxHp: this.maxHp(),
      hp: this.hp,
      coins: this.coins,
      level: this.level,
      xp: this.xp,
      xpToNext: this.xpToNext,
      weapon: this.weapon,
      secondary: this.secondary,
      upgrades: this.upgrades,
      isUpgradeId,
      flags: this.flags,
      visitedRooms: Array.from(this.visitedRooms).filter((id) => this.world.has(id)),
      shopAtkBonus: this.shopAtkBonus,
    });
    try {
      localStorage.setItem(Game.SAVE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn("[save] failed to write localStorage", error);
    }
    // Best-effort server mirror (ADR-009) - localStorage above is always the
    // source of truth; this never blocks or throws into the caller.
    const playerId = getOrCreatePlayerId();
    if (playerId) {
      void saveToServer(playerId, data).then((ok) => {
        this.saveSource = ok ? "python-service" : "client-fallback";
      });
    }
  }

  static hasSave(): boolean {
    try {
      return typeof localStorage !== "undefined" && localStorage.getItem(Game.SAVE_KEY) !== null;
    } catch {
      return false;
    }
  }

  /**
   * Restores a shrine save, if one exists and parses cleanly. Tries the
   * server save first (ADR-009 - keyed on the anonymous player id), falling
   * back to the localStorage save if the server is unreachable or has
   * nothing for this player. Returns whether a save was applied.
   */
  private async loadSavedGame(): Promise<boolean> {
    const playerId = getOrCreatePlayerId();
    if (playerId) {
      const remote = await loadFromServer(playerId);
      if (remote && this.applySaveData(remote)) {
        this.saveSource = "python-service";
        return true;
      }
    }
    if (typeof localStorage === "undefined") return false;
    try {
      const raw = localStorage.getItem(Game.SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      const applied = this.applySaveData(data);
      if (applied) this.saveSource = "client-fallback";
      return applied;
    } catch (error) {
      console.warn("[save] failed to load localStorage save", error);
      return false;
    }
  }

  private applySaveData(data: unknown): boolean {
    try {
      if (!data || typeof data !== "object") return false;
      const d = data as Record<string, unknown>;
      if (d.version !== 1 || typeof d.roomId !== "string") return false;
      if (!isWeaponInstance(d.weapon)) return false;
      if (d.secondary !== null && d.secondary !== undefined && !isWeaponInstance(d.secondary)) return false;
      if (!isGameFlags(d.flags)) return false;

      const roomId = this.world.has(d.roomId) ? d.roomId : START_ROOM;
      const level = Math.round(clampNumber(d.level, 1, 999, 1));
      const xpToNext = Math.round(clampNumber(d.xpToNext, 1, 1_000_000, Math.round(level * 100 * 1.5)));
      const xp = Math.round(clampNumber(d.xp, 0, xpToNext, 0));
      const maxHpAtLevel = 100 + (level - 1) * 3;

      this.level = level;
      this.xpToNext = xpToNext;
      this.xp = xp;
      this.hp = Math.round(clampNumber(d.hp, 0, maxHpAtLevel, maxHpAtLevel));
      this.coins = Math.round(clampNumber(d.coins, 0, 999_999, 0));
      this.weapon = { ...d.weapon };
      this.secondary = d.secondary ? { ...d.secondary } : null;
      const upgradesInput = d.upgrades && typeof d.upgrades === "object" ? d.upgrades : {};
      const normalizedUpgrades: Partial<Record<UpgradeId, number>> = {};
      for (const [id, value] of Object.entries(upgradesInput as Record<string, unknown>)) {
        if (!isUpgradeId(id)) continue;
        normalizedUpgrades[id] = Math.round(clampNumber(value, 0, 999, 0));
      }
      this.upgrades = normalizedUpgrades;
      this.flags = { ...d.flags };
      const visited = Array.isArray(d.visitedRooms)
        ? d.visitedRooms.filter((id: unknown): id is string => typeof id === "string" && this.world.has(id))
        : [];
      this.visitedRooms = new Set<string>(visited);
      this.visitedRooms.add(roomId);
      this.shopAtkBonus = clampNumber(d.shopAtkBonus, 0, 999, 0);
      const x = clampNumber(d.px, 0, VIEW_W - this.pw, 0);
      const y = clampNumber(d.py, 0, VIEW_H - this.ph, 0);
      this.spawnIntoRoom(roomId, { x, y });
      this.hp = Math.min(this.hp, this.maxHp());
      return true;
    } catch (error) {
      console.warn("[save] failed to apply save data", error);
      return false;
    }
  }

  private static readonly SHOP_ITEMS = [
    { name: "Health Potion", cost: 50 },
    { name: "Stat Booster", cost: 200 },
    { name: "Mystery Weapon Box", cost: 300 },
  ] as const;

  private updateShop() {
    const input = this.input.state;
    if (input.pressed.pause) {
      this.shopOpen = false;
      return;
    }
    if (input.pressed.up) {
      this.shopSelection = (this.shopSelection + Game.SHOP_ITEMS.length - 1) % Game.SHOP_ITEMS.length;
    }
    if (input.pressed.down) {
      this.shopSelection = (this.shopSelection + 1) % Game.SHOP_ITEMS.length;
    }
    if (input.pressed.interact) {
      this.purchaseShopItem(this.shopSelection);
    }
  }

  private purchaseShopItem(index: number) {
    const item = Game.SHOP_ITEMS[index];
    if (!item || this.coins < item.cost) {
      this.audio.play("wrong", 0.6);
      this.showMessage("Not enough coins");
      return;
    }
    this.coins -= item.cost;
    switch (index) {
      case 0:
        this.hp = Math.min(this.maxHp(), this.hp + this.maxHp() * 0.5);
        break;
      case 1:
        this.upgrades.maxHp = (this.upgrades.maxHp ?? 0) + 5;
        this.hp += 5;
        this.shopAtkBonus += 2;
        break;
      case 2:
        void this.buyMysteryBox();
        break;
    }
    if (index !== 2) this.audio.play("purchase", 0.8); // mystery box plays its own rarity-tiered sound via applyLoot()
    this.showMessage(`Purchased ${item.name}`);
  }

  private async buyMysteryBox() {
    this.shopLootCounter += 1;
    const seed = this.runSeed + this.shopLootCounter * 104729;
    const forcedRarity: Rarity = this.shopRng.chance(0.5) ? "rare" : "epic";
    // Client-only forced-rarity roll (see fallbackRoll's forcedRarity doc) —
    // deliberately not routed through the Python-authoritative /api/loot path
    // since "guaranteed rare+" is a shop mechanic, not a real drop roll.
    const loot = fallbackRoll(seed, 100, this.level, forcedRarity);
    this.applyLoot(loot);
  }

  private showMessage(text: string) {
    this.message = text;
    this.messageT = 3.5;
  }

  private pushSnapshot(dt: number) {
    this.snapshotT -= dt;
    if (this.snapshotT > 0 || !this.onSnapshot) return;
    this.snapshotT = 0.1;
    const bossEnemy = this.roomState(this.roomId).enemies.find((e) => e.boss && e.hp > 0);
    this.onSnapshot({
      hp: Math.max(0, Math.round(this.hp)),
      maxHp: this.maxHp(),
      shield: 0,
      maxShield: 0,
      coins: this.coins,
      weapon: {
        name: this.weapon.name,
        rarity: this.weapon.rarity,
        color: RARITIES[this.weapon.rarity].color,
        rolledBy: this.weapon.rolledBy,
        damage: this.weapon.damage + this.shopAtkBonus,
        speed: this.weapon.speed,
      },
      secondary: this.secondary
        ? {
            name: this.secondary.name,
            rarity: this.secondary.rarity,
            color: RARITIES[this.secondary.rarity].color,
            damage: this.secondary.damage,
            speed: this.secondary.speed,
          }
        : null,
      roomName: `${this.room().name} (${this.roomId})`,
      zone: this.room().zone,
      gamepad: this.input.state.gamepadConnected ? this.input.state.gamepadId : null,
      message: this.messageT > 0 ? this.message : "",
      boss: bossEnemy
        ? {
            name: BOSS_NAMES[bossEnemy.kind] ?? bossEnemy.kind,
            hp: Math.max(0, Math.round(bossEnemy.hp)),
            maxHp: bossEnemy.maxHp,
          }
        : null,
      // copy — handing React the live object means mutations are invisible
      // (same identity) and racy; a fresh object per snapshot fixes both
      upgrades: { ...this.upgrades },
      phase: this.phase,
      lootSource: this.lootSource,
      saveSource: this.saveSource,
      seed: this.seedPhrase,
      respawnHoldPct: Math.min(1, this.respawnHoldT / Game.RESPAWN_HOLD_SECONDS),
      level: this.level,
      xp: this.xp,
      xpToNext: this.xpToNext,
      elapsedSeconds: Math.max(0, (performance.now() - this.runStartedAt) / 1000),
      enemiesDefeated: this.enemiesDefeated,
      stats: {
        toughnessPct: Math.min(60, this.stat("defense")),
        critChancePct: this.stat("critChance") + (this.weapon.effect === "crit" ? 10 : 0),
        lifeStealPct: this.stat("lifeSteal") + (this.weapon.effect === "lifesteal" ? 8 : 0),
        dodgeInvulnMs: Math.round((0.12 + (this.stat("dash") > 0 ? 0.1 : 0)) * 1000),
        attackPower: Math.round(this.weapon.damage + this.shopAtkBonus),
        defensePct: Math.min(60, this.stat("defense")),
      },
      minimap: Array.from(this.world.values()).map((room) => {
        const coord = this.roomCoords.get(room.id) ?? { x: 0, y: 0 };
        const state = this.roomStates.get(room.id);
        return {
          id: room.id,
          x: coord.x,
          y: coord.y,
          visited: this.visitedRooms.has(room.id),
          cleared: this.clearedRooms.has(room.id) || (state ? state.enemies.every((e) => e.hp <= 0) : false),
          current: room.id === this.roomId,
          boss: room.boss,
        };
      }),
    });
  }

  // ─────────────────────── rendering ───────────────────────

  private updateCamera() {
    const roomWidth = ROOM_W * TILE;
    const roomHeight = ROOM_H * TILE;
    const visibleW = VIEW_W / this.cameraZoom;
    const visibleH = VIEW_H / this.cameraZoom;
    const targetX = this.px + this.pw / 2 - visibleW / 2 + this.manualCameraPan.x;
    const targetY = this.py + this.ph / 2 - visibleH / 2 + this.manualCameraPan.y;
    const maxX = Math.max(0, roomWidth - visibleW);
    const maxY = Math.max(0, roomHeight - visibleH);
    this.camera.x = Math.min(Math.max(0, targetX), maxX);
    this.camera.y = Math.min(Math.max(0, targetY), maxY);
  }

  private render() {
    const ctx = this.ctx;
    const canvas = ctx.canvas;
    const scaleX = canvas.width / VIEW_W;
    const scaleY = canvas.height / VIEW_H;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

    this.updateCamera();
    this.drawBackground();
    ctx.save();
    ctx.scale(this.cameraZoom, this.cameraZoom);
    ctx.translate(-this.camera.x, -this.camera.y);
    this.drawTiles();
    this.drawInteractables();
    this.drawPickups();
    this.drawEnemies();
    this.drawPlayer();
    this.drawProjectiles();
    this.drawParticles();
    this.drawRarityBursts();
    ctx.restore();
    if (this.phase === "paused") this.drawOverlay("PAUSED", "press START / ESC / P to resume");
    if (this.phase === "dead") this.drawRunSummary("YOU DIED", "press JUMP to rise again");
    if (this.phase === "victory")
      this.drawRunSummary("THE BEAST IS SLAIN", "a hero's rest — press JUMP for new game+");
    if (this.fadeT > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this.fadeT})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (this.helpOpen) this.drawHelpOverlay();
    if (this.inventoryOpen) this.drawInventoryOverlay();
    if (this.shopOpen) this.drawShopOverlay();
  }

  private applyTouchTacticalFrame() {
    if (!this.touchInput || this.touchInput.getScheme() !== "tacticalTap") return;
    const frame = this.touchInput.consumeTacticalFrame();
    if (frame.zoomDelta !== 1) {
      this.cameraZoom = clampNumber(this.cameraZoom * frame.zoomDelta, 0.85, 1.75, 1);
    }
    if (frame.panDelta) {
      const visibleW = VIEW_W / this.cameraZoom;
      const visibleH = VIEW_H / this.cameraZoom;
      this.manualCameraPan.x += frame.panDelta.x * visibleW;
      this.manualCameraPan.y += frame.panDelta.y * visibleH;
      this.manualCameraPan.x = clampNumber(this.manualCameraPan.x, -visibleW * 0.35, visibleW * 0.35, 0);
      this.manualCameraPan.y = clampNumber(this.manualCameraPan.y, -visibleH * 0.35, visibleH * 0.35, 0);
    } else {
      this.manualCameraPan.x *= 0.82;
      this.manualCameraPan.y *= 0.82;
      if (Math.abs(this.manualCameraPan.x) < 0.5) this.manualCameraPan.x = 0;
      if (Math.abs(this.manualCameraPan.y) < 0.5) this.manualCameraPan.y = 0;
    }
    if (frame.tap) this.handleTacticalTap(frame.tap.x, frame.tap.y);
    if (frame.quickSlotAction === "pause") {
      this.phase = this.phase === "paused" ? "playing" : "paused";
    }
  }

  private handleTacticalTap(normX: number, normY: number) {
    const visibleW = VIEW_W / this.cameraZoom;
    const visibleH = VIEW_H / this.cameraZoom;
    const worldX = this.camera.x + visibleW * normX;
    const worldY = this.camera.y + visibleH * normY;

    const enemy = this.roomState(this.roomId).enemies.find((candidate) => pointInRect(worldX, worldY, candidate));
    if (enemy) {
      this.facing = enemy.x >= this.px ? 1 : -1;
      this.input.queuePressed("attack");
      return;
    }

    const interactable = this.roomState(this.roomId).interactables.find((candidate) =>
      pointInRect(worldX, worldY, { x: candidate.x - 8, y: candidate.y - 8, w: candidate.w + 16, h: candidate.h + 16 }),
    );
    if (interactable) {
      this.input.queuePressed("interact");
      return;
    }

    if (worldY < this.py - TILE && this.onGround) {
      this.input.state.pressed.jump = true;
      return;
    }

    const dx = worldX - (this.px + this.pw / 2);
    this.input.state.axisX = clampNumber(dx / 96, -1, 1, 0);
    this.input.state.held.left = this.input.state.axisX < -0.15;
    this.input.state.held.right = this.input.state.axisX > 0.15;
  }

  private drawShopOverlay() {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(6,10,16,0.88)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = "#ffcc66";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    ctx.fillText("SHOPKEEPER", VIEW_W / 2, 40);
    ctx.font = "12px monospace";
    ctx.fillText(`Coins: ${this.coins}`, VIEW_W / 2, 62);

    ctx.textAlign = "left";
    Game.SHOP_ITEMS.forEach((item, i) => {
      const y = 100 + i * 26;
      const affordable = this.coins >= item.cost;
      ctx.fillStyle = i === this.shopSelection ? "#ffcc66" : affordable ? "#e5e7eb" : "#6b7280";
      ctx.fillText(`${i === this.shopSelection ? "> " : "  "}${item.name} — ${item.cost} coins`, 60, y);
    });

    ctx.fillStyle = "#9fb2c7";
    ctx.textAlign = "center";
    ctx.font = "11px monospace";
    ctx.fillText("UP/DOWN select, E buy, ESC/P leave", VIEW_W / 2, VIEW_H - 14);
    ctx.textAlign = "left";
  }

  private drawInventoryOverlay() {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(6,10,16,0.88)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = "#ffcc66";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    ctx.fillText("INVENTORY & STATS", VIEW_W / 2, 30);
    ctx.font = "12px monospace";
    ctx.textAlign = "left";

    let y = 58;
    const line = (text: string, color = "#e5e7eb") => {
      ctx.fillStyle = color;
      ctx.fillText(text, 40, y);
      y += 18;
    };

    line(`Level ${this.level}  —  XP ${Math.round(this.xp)}/${this.xpToNext}`, "#facc15");
    line(`HP ${Math.round(this.hp)}/${this.maxHp()}   Coins ${this.coins}`);
    line("");
    line(`Weapon: ${this.weapon.name} (${this.weapon.rarity})`, RARITIES[this.weapon.rarity].color);
    line(`  ${Math.round(this.weapon.damage)} dmg @ ${this.weapon.speed.toFixed(1)}/s, range ${this.weapon.range}${this.weapon.effect ? `, effect: ${this.weapon.effect}` : ""}`);
    line(
      this.secondary
        ? `Secondary: ${this.secondary.name} (${this.secondary.rarity})`
        : "Secondary: empty",
      this.secondary ? RARITIES[this.secondary.rarity].color : "#6b7280",
    );
    line("");
    line("Upgrades:", "#9fb2c7");
    const upgradeIds = Object.keys(this.upgrades) as UpgradeId[];
    if (upgradeIds.length === 0) {
      line("  none yet");
    } else {
      for (const id of upgradeIds) {
        const def = UPGRADE_DEFS[id];
        const value = this.upgrades[id] ?? 0;
        line(`  ${def.name}: +${value}${def.unit}`);
      }
    }
    ctx.fillStyle = "#9fb2c7";
    ctx.textAlign = "center";
    ctx.fillText("TAB / I — close inventory", VIEW_W / 2, VIEW_H - 14);
    ctx.textAlign = "left";
  }

  private drawHelpOverlay() {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(6,10,16,0.88)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = "#ffcc66";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "center";
    ctx.fillText("CONTROLS", VIEW_W / 2, 30);
    ctx.font = "12px monospace";
    ctx.fillStyle = "#e5e7eb";
    const lines = [
      "Keyboard: LEFT/RIGHT or A/D move, SPACE/W/Z jump",
      "X/J attack, C/K dodge, V/L swap weapon, S/DOWN drop through",
      "Hold R: reset position (costs 10% coins or 1 HP)",
      "Xbox: stick/D-pad move, A jump, X attack, B dodge, Y swap",
      "",
      `Zone: ${this.room().zone}   Room: ${this.room().name}`,
      `Weapon: ${this.weapon.name} (${this.weapon.rarity})   Coins: ${this.coins}`,
      "",
      "F1 / ? / gamepad View — close this help",
    ];
    lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 62 + i * 18));
    ctx.textAlign = "left";
  }

  private drawBackground() {
    const ctx = this.ctx;
    const zone = this.room().zone;
    const draw = (name: string, y = 0) => {
      const img = this.sheets.get(name);
      if (!img) return;
      const scale = VIEW_H / img.height;
      const w = img.width * scale;
      for (let x = 0; x < VIEW_W; x += w) {
        ctx.drawImage(img, x, y, w, VIEW_H);
      }
    };
    if (zone === "outskirts" || zone === "citadel") {
      draw("bg_mountain_sky");
      draw("bg_mountain_far");
      draw("bg_mountain_near");
      if (zone === "citadel") {
        ctx.fillStyle = "rgba(20, 8, 40, 0.45)";
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }
    } else if (zone === "sky") {
      draw("bg_sky");
    } else if (zone === "caverns") {
      ctx.fillStyle = "#131c26";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      const img = this.sheets.get("bg_mangrove");
      if (img) {
        ctx.globalAlpha = 0.35;
        ctx.drawImage(img, VIEW_W / 2 - 150, VIEW_H - 260, 300, 227);
        ctx.globalAlpha = 1;
      }
    } else if (zone === "hive") {
      const img = this.sheets.get("bg_tissue");
      if (img) {
        for (let y = 0; y < VIEW_H; y += img.height) {
          for (let x = 0; x < VIEW_W; x += img.width) {
            ctx.drawImage(img, x, y);
          }
        }
        ctx.fillStyle = "rgba(30, 0, 10, 0.35)";
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      } else {
        ctx.fillStyle = "#2a0a12";
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }
    }
  }

  private tileIndex(name: string): number {
    return this.meta?.tiles.order.indexOf(name) ?? 0;
  }

  private drawTiles() {
    const ctx = this.ctx;
    const tilesImg = this.sheets.get("tiles");
    const room = this.room();
    for (let row = 0; row < ROOM_H; row++) {
      for (let col = 0; col < ROOM_W; col++) {
        const tile = room.tiles[row * ROOM_W + col];
        const x = col * TILE;
        const y = row * TILE;
        if (tile === T_SOLID && tilesImg) {
          const above = this.tileAt(col, row - 1);
          const left = this.tileAt(col - 1, row);
          const right = this.tileAt(col + 1, row);
          let name = "fill";
          if (above !== T_SOLID) {
            if (left !== T_SOLID) name = "topLeft";
            else if (right !== T_SOLID) name = "topRight";
            else name = "top";
          } else if (left !== T_SOLID) name = "wallLeft";
          else if (right !== T_SOLID) name = "wallRight";
          const idx = this.tileIndex(name);
          if (idx >= 0) {
            ctx.drawImage(tilesImg, idx * TILE, 0, TILE, TILE, x, y, TILE, TILE);
          } else {
            ctx.fillStyle = "#334155";
            ctx.fillRect(x, y, TILE, TILE);
          }
        } else if (tile === T_PLATFORM && tilesImg) {
          const idx = this.tileIndex("platform");
          if (idx >= 0) {
            ctx.drawImage(tilesImg, idx * TILE, 0, TILE, TILE, x, y, TILE, TILE);
          } else {
            ctx.fillStyle = "#60a5fa";
            ctx.fillRect(x, y + TILE - 4, TILE, 4);
          }
        } else if (tile === T_SOLID) {
          ctx.fillStyle = "#334155";
          ctx.fillRect(x, y, TILE, TILE);
        } else if (tile === T_PLATFORM) {
          ctx.fillStyle = "#60a5fa";
          ctx.fillRect(x, y + TILE - 4, TILE, 4);
        } else if (tile === T_SPIKE) {
          ctx.fillStyle = "#cbd5e1";
          for (let i = 0; i < 4; i++) {
            const sx = x + i * 4;
            ctx.beginPath();
            ctx.moveTo(sx, y + TILE);
            ctx.lineTo(sx + 2, y + 4);
            ctx.lineTo(sx + 4, y + TILE);
            ctx.fill();
          }
        } else if (tile === T_DOOR_KEY && !this.flags.hasKey) {
          ctx.fillStyle = "#a16207";
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = "#facc15";
          ctx.fillRect(x + 5, y + 5, 6, 6);
        } else if (tile === T_DOOR_BEAST && !this.flags.mechSlain) {
          ctx.fillStyle = "#581c87";
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = "#c084fc";
          ctx.fillRect(x + 6, y + 3, 4, 10);
        }
      }
    }
  }

  private drawSheetAnim(
    sheet: string,
    anim: string,
    animTime: number,
    x: number,
    y: number,
    drawW: number,
    drawH: number,
    flip: boolean,
    fps = 8,
  ) {
    const ctx = this.ctx;
    const img = this.sheets.get(sheet);
    const metaEntry = this.meta?.[sheet];
    if (!img || !metaEntry || !("anims" in metaEntry)) return;
    const animDef = metaEntry.anims[anim] ?? metaEntry.anims[Object.keys(metaEntry.anims)[0]];
    if (!animDef) return;
    const frame = resolveClipFrame(animDef.frames, animTime, fps, !NON_LOOPING_HERO_ANIMS.has(anim));
    const sx = frame * metaEntry.cellW;
    const sy = animDef.row * metaEntry.cellH;
    ctx.save();
    if (flip) {
      ctx.translate(x + drawW, y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, sx, sy, metaEntry.cellW, metaEntry.cellH, 0, 0, drawW, drawH);
    } else {
      ctx.drawImage(img, sx, sy, metaEntry.cellW, metaEntry.cellH, x, y, drawW, drawH);
    }
    ctx.restore();
  }

  private drawPlayer() {
    if (this.phase === "dead") return;
    const ctx = this.ctx;
    if (this.iframes > 0 && Math.floor(this.animT * 12) % 2 === 0) return; // flicker

    // Anchor math (ADR-020, scale corrected under the hero-scale fix pack):
    // hitbox (this.pw/this.ph) is unchanged. The sprite anchors at
    // feet-center of the physics box — horizontal offset centers the wider
    // render box on the narrower hitbox, vertical offset aligns the render
    // box's bottom edge with the hitbox's bottom edge. Visual overhang
    // beyond the hitbox is expected.
    //
    // Scale derivation (measured, not assumed - see SESSION_LOG for the
    // full pixel measurements): drawW/drawH were never actually the bug.
    // They were 32x34 before AND after the ADR-020 swap - identical. What
    // changed is how much of that box the source art fills. The retired
    // hero_0.png went through pack_rows(), which trims each frame to its
    // content bbox and rescales it to fill its packed cell (fill ratio
    // ~37/48 = 0.7708 measured on its walkRight row). char-sheet-alpha.png
    // was copied into the pipeline as-is (ADR-020's "no pack_rows() needed"
    // call), so its cells carry real unfilled padding (fill ratio ~32/46 =
    // 0.6957 measured on its run row). Same 32x34 box, less of it filled ->
    // the character reads smaller even though nothing about "S" was ever
    // set below 1. Fix: scale the box by S = 0.7708/0.6957 ~= 1.108 to
    // restore the old sheet's effective on-screen stature, using the
    // existing per-entity draw-scale mechanism (drawW/drawH are already a
    // per-call parameter to drawSheetAnim(), the same one every enemy uses
    // via ENEMY_DEFS[...].drawW/drawH) rather than reprocessing the sheet.
    const HERO_SCALE = 1.108;
    const drawW = Math.round(32 * HERO_SCALE); // 35
    const drawH = Math.round(34 * HERO_SCALE); // 38
    const dx = this.px + this.pw / 2 - drawW / 2;
    const dy = this.py + this.ph - drawH;
    // ADR-020: char-sheet-alpha.png is single-facing (always faces right in
    // the source art, unlike the retired hero_0.png which had dedicated
    // walkLeft/walkRight rows). Flip via canvas transform when runtime facing
    // differs from HERO_NATIVE_FACING, matching the existing enemy pattern.
    const anim = selectPlayerAnim({ grounded: this.onGround, vx: this.pvx, vy: this.pvy });
    const flip = shouldFlipHeroSprite(this.facing);
    this.drawSheetAnim("hero", anim, this.animT, dx, dy, drawW, drawH, flip, 9);

    // UI-002: gold flash ring on equip/swap, fading out over equipFlashT's lifespan
    if (this.equipFlashT > 0) {
      ctx.save();
      ctx.globalAlpha = this.equipFlashT / 0.3;
      ctx.strokeStyle = RARITIES[this.weapon.rarity].color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.px + this.pw / 2, this.py + this.ph / 2, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // melee swing arc
    if (this.attackAnimT > 0 && this.weapon.kind === "melee") {
      ctx.strokeStyle = RARITIES[this.weapon.rarity].color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      const cx = this.px + this.pw / 2;
      const cy = this.py + this.ph / 2;
      const start = this.facing > 0 ? -0.9 : Math.PI - 0.9;
      ctx.arc(cx, cy, this.weapon.range, start, start + 1.8);
      ctx.stroke();
    }
  }

  private drawEnemies() {
    const ctx = this.ctx;
    const state = this.roomState(this.roomId);
    for (const enemy of state.enemies) {
      if (enemy.hp <= 0) continue;
      const def = ENEMY_DEFS[enemy.kind];
      const dx = enemy.x + enemy.w / 2 - def.drawW / 2;
      const dy = enemy.y + enemy.h - def.drawH;
      // Flip only when desired runtime facing differs from each sheet's native orientation.
      // Imp uses explicit left/right animation rows, so it should not be mirrored.
      const flip = enemy.kind === "imp" ? false : enemy.facing !== def.nativeFacing;
      this.drawSheetAnim(def.sheet, enemy.anim, enemy.animTime, dx, dy, def.drawW, def.drawH, flip);
      // Lightweight status readout so roll effects are visible in moment-to-moment play.
      let pipX = dx + 2;
      const pipY = dy - 12;
      const drawPip = (color: string) => {
        ctx.fillStyle = color;
        ctx.fillRect(pipX, pipY, 6, 6);
        pipX += 8;
      };
      if (enemy.burnT > 0) drawPip("#fb923c");
      if (enemy.freezeT > 0) drawPip("#67e8f9");
      if (enemy.shockT > 0) drawPip("#fde047");
      if (enemy.curseT > 0) drawPip("#c084fc");
      // small health bar for damaged non-bosses
      if (!enemy.boss && enemy.hp < enemy.maxHp) {
        ctx.fillStyle = "#111";
        ctx.fillRect(dx, dy - 6, def.drawW, 3);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(dx, dy - 6, (def.drawW * enemy.hp) / enemy.maxHp, 3);
      }
    }
  }

  private drawInteractables() {
    const ctx = this.ctx;
    for (const it of this.roomState(this.roomId).interactables) {
      if (it.kind === "shrine") {
        const glow = 0.6 + Math.sin(this.animT * 2) * 0.25;
        ctx.fillStyle = `rgba(96, 165, 250, ${glow})`;
        ctx.beginPath();
        ctx.arc(it.x + it.w / 2, it.y + it.h / 2, it.w / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#dbeafe";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.fillStyle = "#8b5e34";
        ctx.fillRect(it.x + 4, it.y + 10, it.w - 8, it.h - 10);
        ctx.fillStyle = "#e2b877";
        ctx.beginPath();
        ctx.arc(it.x + it.w / 2, it.y + 8, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#facc15";
        ctx.fillRect(it.x + it.w / 2 - 6, it.y + it.h - 8, 12, 5);
      }
    }
  }

  private drawPickups() {
    const ctx = this.ctx;
    const state = this.roomState(this.roomId);
    for (const pickup of state.pickups) {
      const bob = Math.sin(pickup.bobT * 3) * 2;
      const x = pickup.x;
      const y = pickup.y + bob;
      switch (pickup.kind) {
        case "coin":
          ctx.fillStyle = "#facc15";
          ctx.beginPath();
          ctx.arc(x + 5, y + 5, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#a16207";
          ctx.fillRect(x + 4, y + 2, 2, 6);
          break;
        case "health":
          ctx.fillStyle = "#ef4444";
          ctx.fillRect(x + 4, y, 6, 12);
          ctx.fillRect(x, y + 3, 14, 6);
          break;
        case "key":
          ctx.fillStyle = "#facc15";
          ctx.fillRect(x, y + 4, 8, 3);
          ctx.beginPath();
          ctx.arc(x + 9, y + 5, 3, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "doubleJump":
          ctx.fillStyle = "#7dd3fc";
          ctx.beginPath();
          ctx.moveTo(x, y + 12);
          ctx.lineTo(x + 8, y);
          ctx.lineTo(x + 16, y + 12);
          ctx.fill();
          break;
        case "dash":
          ctx.fillStyle = "#c084fc";
          ctx.fillRect(x, y + 6, 16, 4);
          ctx.fillRect(x + 10, y + 2, 6, 12);
          break;
        case "chest":
          ctx.fillStyle = pickup.opened ? "#78716c" : "#b45309";
          ctx.fillRect(x, y, 20, 6);
          ctx.fillStyle = "#facc15";
          ctx.fillRect(x + 8, y + 5, 4, 4);
          break;
        case "loot": {
          // AST-014: real sprite art (a 12-frame shimmering gem, cropped
          // from powerups-sheet-alpha.png) instead of a flat rotated rect.
          // Rarity is still communicated by color - a ring drawn around the
          // sprite in RARITIES[rarity].color, preserving the existing
          // color-coding scheme (RARITY_SOUND, HUD chips) rather than
          // inventing a second, inconsistent rarity-to-hue mapping.
          const color = pickup.loot ? RARITIES[pickup.loot.rarity].color : "#fff";
          this.drawSheetAnim(
            LOOT_PICKUP_SPRITE.sheet,
            LOOT_PICKUP_SPRITE.anim,
            pickup.bobT,
            x,
            y,
            16,
            16,
            false,
            6,
          );
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x + 8, y + 8, 10, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
      }
    }
  }

  private drawProjectiles() {
    const ctx = this.ctx;
    for (const p of this.projectiles) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * ADR-017: run summary on death AND victory - seed, time, rooms explored,
   * coins, level, weapon, and the this-seed death count. Most of this data
   * already existed for the HUD (elapsedSeconds, enemiesDefeated, coins,
   * level, weapon, visitedRooms) - this is presentation plus deathsThisSeed,
   * the one new counter.
   */
  private drawRunSummary(title: string, subtitle: string) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.78)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = title.includes("SLAIN") ? "#facc15" : "#ef4444";
    ctx.font = "bold 26px monospace";
    ctx.textAlign = "center";
    ctx.fillText(title, VIEW_W / 2, 46);

    const elapsedSeconds = Math.max(0, (performance.now() - this.runStartedAt) / 1000);
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = Math.floor(elapsedSeconds % 60);
    const time = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

    ctx.font = "13px monospace";
    ctx.fillStyle = "#9fb2c7";
    ctx.fillText(`seed: ${this.seedPhrase}  (use the "seed" button to copy)`, VIEW_W / 2, 72);

    const lines = [
      `Time: ${time}`,
      `Rooms: ${this.visitedRooms.size}/${this.world.size}`,
      `Coins: ${this.coins}`,
      `Level: ${this.level}`,
      `Weapon: ${this.weapon.name} (${this.weapon.rarity})`,
      `Enemies defeated: ${this.enemiesDefeated}`,
      `Deaths this seed: ${this.deathsThisSeed}`,
    ];
    ctx.fillStyle = "#e5e7eb";
    ctx.font = "14px monospace";
    let y = 106;
    for (const line of lines) {
      ctx.fillText(line, VIEW_W / 2, y);
      y += 20;
    }

    ctx.fillStyle = "#e5e7eb";
    ctx.font = "14px monospace";
    ctx.fillText(subtitle, VIEW_W / 2, VIEW_H - 24);
    ctx.restore();
  }

  private drawOverlay(title: string, subtitle: string) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = title.includes("SLAIN") ? "#facc15" : "#ef4444";
    ctx.font = "bold 28px monospace";
    ctx.textAlign = "center";
    ctx.fillText(title, VIEW_W / 2, VIEW_H / 2 - 10);
    ctx.fillStyle = "#e5e7eb";
    ctx.font = "14px monospace";
    ctx.fillText(subtitle, VIEW_W / 2, VIEW_H / 2 + 20);
    ctx.restore();
  }
}

// ─────────────────────── helpers ───────────────────────

function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function pointInRect(
  px: number,
  py: number,
  r: { x: number; y: number; w: number; h: number },
): boolean {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function isUpgradeId(value: string): value is UpgradeId {
  return value in UPGRADE_DEFS;
}

function isGameFlags(value: unknown): value is {
  hasKey: boolean;
  wyrmSlain: boolean;
  mechSlain: boolean;
  beastSlain: boolean;
} {
  if (typeof value !== "object" || value === null) return false;
  const flags = value as Record<string, unknown>;
  return (
    typeof flags.hasKey === "boolean" &&
    typeof flags.wyrmSlain === "boolean" &&
    typeof flags.mechSlain === "boolean" &&
    typeof flags.beastSlain === "boolean"
  );
}

const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "epic"];

function rarityAtLeast(rarity: Rarity, minimum: Rarity): boolean {
  return RARITY_ORDER.indexOf(rarity) >= RARITY_ORDER.indexOf(minimum);
}
