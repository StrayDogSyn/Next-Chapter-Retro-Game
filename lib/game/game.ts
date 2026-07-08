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
import {
  describeLoot,
  fallbackRoll,
  RARITIES,
  STARTING_WEAPON,
  type LootDrop,
  type UpgradeId,
  type WeaponInstance,
} from "./items";

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
};

type RoomState = { enemies: Enemy[]; pickups: Pickup[] };

export type HudSnapshot = {
  hp: number;
  maxHp: number;
  coins: number;
  weapon: { name: string; rarity: string; color: string; rolledBy: string };
  secondary: { name: string; rarity: string; color: string } | null;
  roomName: string;
  zone: ZoneId;
  gamepad: string | null;
  message: string;
  boss: { name: string; hp: number; maxHp: number } | null;
  upgrades: Partial<Record<UpgradeId, number>>;
  phase: "playing" | "dead" | "victory";
  lootSource: string;
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
    hp: number;
    touchDamage: number;
    level: number;
    boss?: boolean;
  }
> = {
  bat: { sheet: "bat", w: 18, h: 14, drawW: 28, drawH: 28, hp: 15, touchDamage: 8, level: 1 },
  goblin: { sheet: "goblin", w: 22, h: 42, drawW: 52, drawH: 46, hp: 40, touchDamage: 12, level: 2 },
  imp: { sheet: "imp", w: 20, h: 30, drawW: 40, drawH: 40, hp: 25, touchDamage: 8, level: 2 },
  flower: { sheet: "flower", w: 26, h: 30, drawW: 48, drawH: 48, hp: 30, touchDamage: 10, level: 2 },
  wyrmwolf: { sheet: "wyrmwolf", w: 70, h: 46, drawW: 110, drawH: 82, hp: 220, touchDamage: 18, level: 5, boss: true },
  mech: { sheet: "mech", w: 44, h: 60, drawW: 64, drawH: 74, hp: 260, touchDamage: 16, level: 6, boss: true },
  werewolf: { sheet: "boss_werewolf", w: 44, h: 70, drawW: 84, drawH: 88, hp: 420, touchDamage: 22, level: 8, boss: true },
};

const BOSS_NAMES: Record<string, string> = {
  wyrmwolf: "WYRMWOLF",
  mech: "WAR MECH",
  werewolf: "THE ALTERED BEAST",
};

// ─────────────────────────── game class ───────────────────────────

export class Game {
  private ctx: CanvasRenderingContext2D;
  private loop = new GameLoop();
  private input: InputManager;
  private audio = new AudioManager();
  private world = loadWorld();
  private roomStates = new Map<string, RoomState>();
  private roomId = START_ROOM;
  private meta: SpriteMeta | null = null;
  private sheets = new Map<string, HTMLImageElement>();
  private lootCounter = 0;
  private runSeed = Math.floor(Math.random() * 1_000_000);
  private lootSource = "unknown";
  private message = "";
  private messageT = 0;
  private phase: "playing" | "dead" | "victory" = "playing";
  private musicMode: "none" | "bg" | "boss" = "none";
  private snapshotT = 0;

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

  onSnapshot: ((snap: HudSnapshot) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d context unavailable");
    this.ctx = ctx;
    ctx.imageSmoothingEnabled = false;
    this.input = new InputManager(window);
  }

  // ─────────────────────── lifecycle ───────────────────────

  async start() {
    const metaResp = await fetch("/sprites/spritemeta.json");
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
              console.error(`[assets] failed to load /sprites/${name}.png`);
              resolve();
            };
            img.src = `/sprites/${name}.png`;
          }),
      ),
    );

    await this.audio.loadAll({
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
    });

    this.spawnIntoRoom(START_ROOM, "spawnPoint");
    void this.probeLootService();
    this.loop.start(
      (dt) => this.update(Math.min(dt, 0.05)),
      () => this.render(),
    );
  }

  destroy() {
    this.loop.stop();
    this.input.destroy();
    this.audio.stopAllLoops();
  }

  private async probeLootService() {
    try {
      const resp = await fetch(`/api/loot?seed=${this.runSeed}&luck=0&enemyLevel=1`);
      const payload = await resp.json();
      this.lootSource = payload.ok ? "python-service" : "client-fallback";
    } catch {
      this.lootSource = "client-fallback";
    }
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
          pickups.push({ kind: "coin", x: x - 5, y: y - 12, w: 10, h: 10, vy: 0, bobT: Math.random() * 6 });
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
          });
        }
      }
    }
    return { enemies, pickups };
  }

  private spawnIntoRoom(roomId: string, mode: "spawnPoint" | { x: number; y: number }) {
    this.roomId = roomId;
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
    return 100 + this.stat("maxHp");
  }

  private moveSpeed(): number {
    return 150 * (1 + this.stat("moveSpeed") / 100);
  }

  private jumpVelocity(): number {
    return -330 * (1 + this.stat("jumpPower") / 100);
  }

  private maxJumps(): number {
    return 1 + (this.stat("doubleJump") > 0 ? 1 : 0);
  }

  private attackSpeed(): number {
    return this.weapon.speed * (1 + this.stat("attackSpeed") / 100);
  }

  private weaponDamage(): number {
    let dmg = this.weapon.damage;
    const critPct = this.stat("critChance") + (this.weapon.effect === "crit" ? 10 : 0);
    if (Math.random() * 100 < critPct) dmg *= 2;
    return dmg;
  }

  // ─────────────────────── update ───────────────────────

  private update(dt: number) {
    this.input.update();
    this.animT += dt;
    if (this.messageT > 0) this.messageT -= dt;

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

    // jumping (coyote time + optional double jump)
    if (this.onGround) {
      this.coyoteT = 0.1;
      this.jumpsUsed = 0;
    } else if (this.coyoteT > 0) {
      this.coyoteT -= dt;
    }
    if (input.pressed.jump) {
      const canGroundJump = this.onGround || this.coyoteT > 0;
      // Air-jump requires: not a ground jump, double-jump upgrade, and at least
      // one prior jump already consumed (prevents a free air-jump when knocked
      // airborne with jumpsUsed still at 0).
      const canAirJump = !canGroundJump && this.jumpsUsed >= 1 && this.jumpsUsed < this.maxJumps();
      if (canGroundJump || canAirJump) {
        this.pvy = this.jumpVelocity();
        this.jumpsUsed = canGroundJump ? 1 : this.jumpsUsed + 1;
        this.coyoteT = 0;
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
        });
      }
    }

    // weapon swap
    if (input.pressed.useItem && this.secondary) {
      const held = this.weapon;
      this.weapon = this.secondary;
      this.secondary = held;
      this.audio.play("select", 0.7);
      this.showMessage(`Swapped to ${this.weapon.name}`);
    }

    if (this.hp <= 0 && this.phase === "playing") {
      this.phase = "dead";
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
        this.damageEnemy(enemy, this.weaponDamage());
      }
    }
  }

  private damageEnemy(enemy: Enemy, amount: number) {
    enemy.hp -= amount;
    enemy.animTime = 0;
    if (this.weapon.effect === "lifesteal" || this.stat("lifeSteal") > 0) {
      const pct = (this.weapon.effect === "lifesteal" ? 8 : 0) + this.stat("lifeSteal");
      this.hp = Math.min(this.maxHp(), this.hp + (amount * pct) / 100);
    }
    if (enemy.hp <= 0) {
      this.onEnemyKilled(enemy);
    }
  }

  private onEnemyKilled(enemy: Enemy) {
    this.audio.play("kill", 0.8);
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
    }
    if (enemy.boss) this.updateMusic();

    // drops: bosses always drop loot, others 25% (plus coins)
    const dropChance = enemy.boss ? 1 : 0.25;
    if (Math.random() < dropChance) {
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
      enemy.animTime += dt;
      enemy.stateTime += dt;
      const distX = pcx - (enemy.x + enemy.w / 2);
      const distY = pcy - (enemy.y + enemy.h / 2);
      const dist = Math.hypot(distX, distY);

      switch (enemy.kind) {
        case "bat": {
          enemy.anim = "fly";
          if (dist < 140) {
            enemy.vx = Math.sign(distX) * 60;
            enemy.vy = Math.sign(distY) * 45 + Math.sin(this.animT * 6 + enemy.homeX) * 25;
          } else {
            enemy.vx = Math.sin(this.animT * 2 + enemy.homeX) * 30;
            enemy.vy = Math.cos(this.animT * 2.4 + enemy.homeY) * 20;
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
          const speed = near ? 70 : 35;
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
          enemy.vx = near ? Math.sign(distX) * 80 : Math.sin(this.animT + enemy.homeX) * 30;
          enemy.facing = enemy.vx < 0 ? -1 : 1;
          this.enemyWalk(enemy, dt);
          break;
        }
        case "flower": {
          const near = dist < 210;
          enemy.anim = near ? "attack" : "idle";
          if (near && enemy.stateTime > 2.2) {
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
            enemy.vx = Math.sign(distX) * 150;
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
            enemy.vx = Math.sign(distX) * (enemy.hp < enemy.maxHp / 2 ? 200 : 150);
          } else if (enemy.state !== "charge") {
            this.enemyWalk(enemy, dt);
          }
          break;
        }
        case "mech": {
          // hovers in a slow sine, volleys lasers
          enemy.anim = "idle";
          enemy.y = enemy.homeY - enemy.h - 30 + Math.sin(this.animT * 1.4) * 22;
          enemy.x += Math.sign(distX) * 22 * dt;
          enemy.facing = distX < 0 ? -1 : 1;
          const volleyEvery = enemy.hp < enemy.maxHp / 2 ? 1.6 : 2.4;
          if (dist < 320 && enemy.stateTime > volleyEvery) {
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
            enemy.vx = Math.sign(distX) * (enraged ? 130 : 70);
            enemy.facing = enemy.vx < 0 ? -1 : 1;
            this.enemyWalk(enemy, dt);
            if (Math.abs(distX) < 60 && Math.abs(distY) < 60) {
              enemy.state = "attack";
              enemy.stateTime = 0;
              enemy.anim = "attack";
              enemy.animTime = 0;
            } else if (enraged && enemy.stateTime > 6) {
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
            this.damageEnemy(enemy, p.damage);
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
        if (pickup.y > VIEW_H) return false;
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
        case "coin":
          this.coins += 1;
          this.audio.play("coin", 0.6);
          return false;
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
          this.audio.play("levelup");
          this.showMessage("Aether Wings — press jump in mid-air!");
          return false;
        case "dash":
          this.upgrades.dash = 1;
          this.audio.play("levelup");
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
          this.applyLoot(pickup.loot);
          return false;
        }
      }
      return true;
    });
  }

  private applyLoot(loot: LootDrop) {
    if (loot.itemType === "upgrade") {
      const current = this.upgrades[loot.upgradeId] ?? 0;
      this.upgrades[loot.upgradeId] = current + loot.value;
      if (loot.upgradeId === "maxHp") this.hp += loot.value;
      this.audio.play("levelup");
      this.showMessage(`${describeLoot(loot)} [${loot.rolledBy}]`);
      return;
    }
    // weapon: auto-equip if better DPS, otherwise stash to secondary
    const dps = (w: WeaponInstance) => w.damage * w.speed;
    this.audio.play("powerup", 0.8);
    if (dps(loot) >= dps(this.weapon)) {
      this.secondary = this.weapon;
      this.weapon = loot;
      this.showMessage(`Equipped ${describeLoot(loot)}`);
    } else if (!this.secondary || dps(loot) > dps(this.secondary)) {
      this.secondary = loot;
      this.showMessage(`Stashed ${describeLoot(loot)} (Y/L to swap)`);
    } else {
      this.coins += 5;
      this.showMessage(`Scrapped ${loot.name} (+5 coins)`);
    }
  }

  private async rollLoot(enemyLevel: number): Promise<LootDrop> {
    this.lootCounter += 1;
    const seed = this.runSeed + this.lootCounter * 7919;
    const luck = this.stat("luck");
    try {
      // Timeout so a hung request degrades to the fallback instead of a drop
      // that never lands (fetch has no default timeout).
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), 3000);
      const resp = await fetch(
        `/api/loot?seed=${seed}&luck=${luck}&enemyLevel=${enemyLevel}`,
        { signal: abort.signal },
      );
      clearTimeout(timer);
      const payload = await resp.json();
      if (payload.ok && payload.drop) {
        this.lootSource = "python-service";
        return payload.drop as LootDrop;
      }
      throw new Error(payload.error ?? "loot service unavailable");
    } catch {
      this.lootSource = "client-fallback";
      return fallbackRoll(seed, luck, enemyLevel);
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
    this.px = position.x;
    this.py = position.y;
    this.projectiles = [];
    this.roomState(roomId); // materialize
    this.updateMusic();
  }

  private respawn() {
    this.hp = this.maxHp();
    this.phase = "playing";
    this.roomStates.clear(); // enemies respawn; upgrades/weapons/flags are kept
    this.musicMode = "none";
    this.spawnIntoRoom(START_ROOM, "spawnPoint");
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
      coins: this.coins,
      weapon: {
        name: this.weapon.name,
        rarity: this.weapon.rarity,
        color: RARITIES[this.weapon.rarity].color,
        rolledBy: this.weapon.rolledBy,
      },
      secondary: this.secondary
        ? {
            name: this.secondary.name,
            rarity: this.secondary.rarity,
            color: RARITIES[this.secondary.rarity].color,
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
    });
  }

  // ─────────────────────── rendering ───────────────────────

  private render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    this.drawBackground();
    this.drawTiles();
    this.drawPickups();
    this.drawEnemies();
    this.drawPlayer();
    this.drawProjectiles();
    if (this.phase === "dead") this.drawOverlay("YOU DIED", "press JUMP to rise again");
    if (this.phase === "victory")
      this.drawOverlay("THE BEAST IS SLAIN", "a hero's rest — press JUMP for new game+");
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
          ctx.drawImage(tilesImg, this.tileIndex(name) * TILE, 0, TILE, TILE, x, y, TILE, TILE);
        } else if (tile === T_PLATFORM && tilesImg) {
          ctx.drawImage(tilesImg, this.tileIndex("platform") * TILE, 0, TILE, TILE, x, y, TILE, TILE);
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
    const frame = Math.floor(animTime * fps) % animDef.frames;
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

    const drawW = 32;
    const drawH = 34;
    const dx = this.px + this.pw / 2 - drawW / 2;
    const dy = this.py + this.ph - drawH;
    const moving = Math.abs(this.pvx) > 10;
    // hero sheet has side-walk rows; walkLeft row is already left-facing
    const anim = this.facing > 0 ? "walkRight" : "walkLeft";
    this.drawSheetAnim("hero", anim, moving ? this.animT : 0, dx, dy, drawW, drawH, false, 9);

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
      // most sheets face left natively (goblin/werewolf art) — flip when moving right
      const flip = enemy.facing > 0;
      this.drawSheetAnim(def.sheet, enemy.anim, enemy.animTime, dx, dy, def.drawW, def.drawH, flip);
      // small health bar for damaged non-bosses
      if (!enemy.boss && enemy.hp < enemy.maxHp) {
        ctx.fillStyle = "#111";
        ctx.fillRect(dx, dy - 6, def.drawW, 3);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(dx, dy - 6, (def.drawW * enemy.hp) / enemy.maxHp, 3);
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
          ctx.fillStyle = pickup.opened ? "#57534e" : "#92400e";
          ctx.fillRect(x, y + 4, 20, 12);
          ctx.fillStyle = pickup.opened ? "#78716c" : "#b45309";
          ctx.fillRect(x, y, 20, 6);
          ctx.fillStyle = "#facc15";
          ctx.fillRect(x + 8, y + 5, 4, 4);
          break;
        case "loot": {
          const color = pickup.loot ? RARITIES[pickup.loot.rarity].color : "#fff";
          ctx.fillStyle = color;
          ctx.save();
          ctx.translate(x + 8, y + 8);
          ctx.rotate(Math.PI / 4);
          ctx.fillRect(-6, -6, 12, 12);
          ctx.restore();
          ctx.strokeStyle = "#fff";
          ctx.strokeRect(x + 2, y + 2, 12, 12);
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

  private drawOverlay(title: string, subtitle: string) {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = title.includes("SLAIN") ? "#facc15" : "#ef4444";
    ctx.font = "bold 28px monospace";
    ctx.textAlign = "center";
    ctx.fillText(title, VIEW_W / 2, VIEW_H / 2 - 10);
    ctx.fillStyle = "#e5e7eb";
    ctx.font = "14px monospace";
    ctx.fillText(subtitle, VIEW_W / 2, VIEW_H / 2 + 20);
    ctx.textAlign = "left";
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
