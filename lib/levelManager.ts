/**
 * Level Manager - handles loading, rendering, and collision for tilemap-based levels
 */

export interface Tile {
  id: number;
  solid: boolean;
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Enemy {
  id: string;
  x: number;
  y: number;
  type: "goblin" | "dragon" | "boss" | "cultist";
  width: number;
  height: number;
}

export interface LevelExit {
  x: number;
  y: number;
  width: number;
  height: number;
  target: string;
}

export interface Level {
  id: string;
  name: string;
  width: number;
  height: number;
  tileset: Tile[][];
  platforms: Platform[];
  enemies: Enemy[];
  exits: LevelExit[];
  spawns: { x: number; y: number };
}

/**
 * Pre-defined tilemap levels. In a real game, this would be loaded from a file or database.
 * Using a data-driven approach allows procedural generation and level reuse.
 */
export const LEVELS: Record<string, Level> = {
  "level-1": {
    id: "level-1",
    name: "The Ruined Descent",
    width: 1280,
    height: 720,
    tileset: [],
    platforms: [
      { x: 0, y: 660, width: 1280, height: 60 }, // ground
      { x: 100, y: 580, width: 200, height: 40 },
      { x: 400, y: 520, width: 200, height: 40 },
      { x: 700, y: 460, width: 200, height: 40 },
      { x: 950, y: 520, width: 200, height: 40 },
      { x: 600, y: 360, width: 150, height: 40 },
    ],
    enemies: [
      { id: "gob-1", x: 450, y: 470, type: "goblin", width: 32, height: 32 },
      { id: "gob-2", x: 1000, y: 470, type: "goblin", width: 32, height: 32 },
    ],
    exits: [
      { x: 1200, y: 620, width: 60, height: 80, target: "level-2" },
    ],
    spawns: { x: 50, y: 600 },
  },
  "level-2": {
    id: "level-2",
    name: "The Dark Caverns",
    width: 1280,
    height: 720,
    tileset: [],
    platforms: [
      { x: 0, y: 660, width: 1280, height: 60 }, // ground
      { x: 50, y: 580, width: 180, height: 40 },
      { x: 300, y: 500, width: 200, height: 40 },
      { x: 600, y: 420, width: 200, height: 40 },
      { x: 900, y: 500, width: 180, height: 40 },
      { x: 400, y: 340, width: 150, height: 40 },
      { x: 800, y: 340, width: 150, height: 40 },
    ],
    enemies: [
      { id: "dragon-1", x: 620, y: 370, type: "dragon", width: 48, height: 48 },
      { id: "gob-3", x: 350, y: 450, type: "goblin", width: 32, height: 32 },
    ],
    exits: [
      { x: 1200, y: 620, width: 60, height: 80, target: "level-3" },
      { x: 10, y: 620, width: 50, height: 80, target: "level-1" },
    ],
    spawns: { x: 100, y: 600 },
  },
  "level-3": {
    id: "level-3",
    name: "The Beast's Lair",
    width: 1280,
    height: 720,
    tileset: [],
    platforms: [
      { x: 0, y: 660, width: 1280, height: 60 }, // ground
      { x: 100, y: 560, width: 150, height: 40 },
      { x: 350, y: 460, width: 180, height: 40 },
      { x: 650, y: 380, width: 150, height: 40 },
      { x: 900, y: 460, width: 180, height: 40 },
      { x: 500, y: 280, width: 200, height: 40 },
    ],
    enemies: [
      { id: "boss-werewolf", x: 540, y: 230, type: "boss", width: 64, height: 64 },
      { id: "gob-4", x: 400, y: 410, type: "goblin", width: 32, height: 32 },
      { id: "gob-5", x: 950, y: 410, type: "goblin", width: 32, height: 32 },
    ],
    exits: [
      { x: 10, y: 620, width: 50, height: 80, target: "level-2" },
    ],
    spawns: { x: 150, y: 600 },
  },
  "level-4": {
    id: "level-4",
    name: "The Sci-Fi Outpost",
    width: 1280,
    height: 720,
    tileset: [],
    platforms: [
      { x: 0, y: 660, width: 1280, height: 60 },
      { x: 80, y: 580, width: 200, height: 40 },
      { x: 350, y: 500, width: 200, height: 40 },
      { x: 650, y: 420, width: 200, height: 40 },
      { x: 950, y: 500, width: 200, height: 40 },
      { x: 520, y: 320, width: 220, height: 40 },
    ],
    enemies: [
      { id: "cult-1", x: 370, y: 450, type: "cultist", width: 32, height: 32 },
      { id: "cult-2", x: 970, y: 450, type: "cultist", width: 32, height: 32 },
    ],
    exits: [
      { x: 10, y: 620, width: 50, height: 80, target: "level-3" },
    ],
    spawns: { x: 130, y: 600 },
  },
};

export class LevelManager {
  private currentLevelId: string;
  private levels: Map<string, Level>;

  constructor(startingLevelId: string = "level-1") {
    this.currentLevelId = startingLevelId;
    this.levels = new Map(Object.entries(LEVELS));
  }

  getCurrentLevel(): Level {
    const level = this.levels.get(this.currentLevelId);
    if (!level) {
      throw new Error(`Level ${this.currentLevelId} not found`);
    }
    return level;
  }

  getLevel(levelId: string): Level {
    const level = this.levels.get(levelId);
    if (!level) {
      throw new Error(`Level ${levelId} not found`);
    }
    return level;
  }

  loadLevel(levelId: string) {
    if (!this.levels.has(levelId)) {
      throw new Error(`Level ${levelId} not found`);
    }
    this.currentLevelId = levelId;
  }

  checkCollision(x: number, y: number, width: number, height: number): Platform | null {
    const level = this.getCurrentLevel();
    
    for (const platform of level.platforms) {
      if (
        x < platform.x + platform.width &&
        x + width > platform.x &&
        y < platform.y + platform.height &&
        y + height > platform.y
      ) {
        return platform;
      }
    }
    
    return null;
  }

  checkExitCollision(x: number, y: number, width: number, height: number): LevelExit | null {
    const level = this.getCurrentLevel();
    
    for (const exit of level.exits) {
      if (
        x < exit.x + exit.width &&
        x + width > exit.x &&
        y < exit.y + exit.height &&
        y + height > exit.y
      ) {
        return exit;
      }
    }
    
    return null;
  }

  renderLevel(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    const level = this.getCurrentLevel();

    // Draw sky/background
    ctx.fillStyle = "#1d4b67";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw platforms
    ctx.fillStyle = "#3f7d20";
    for (const platform of level.platforms) {
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    }

    // Draw level exits as visual markers
    ctx.fillStyle = "#ffaa00";
    for (const exit of level.exits) {
      ctx.fillRect(exit.x, exit.y, exit.width, exit.height);
      ctx.strokeStyle = "#ff6600";
      ctx.lineWidth = 2;
      ctx.strokeRect(exit.x, exit.y, exit.width, exit.height);
    }
  }

  getEnemies(): Enemy[] {
    return this.getCurrentLevel().enemies;
  }

  getSpawnPoint() {
    return this.getCurrentLevel().spawns;
  }
}
