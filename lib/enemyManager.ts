/**
 * Enemy Manager - handles enemy states, movement, and AI
 */

export interface EnemyInstance {
  id: string;
  type: "goblin" | "dragon" | "boss" | "cultist";
  x: number;
  y: number;
  velocityY: number;
  width: number;
  height: number;
  onGround: boolean;
  direction: 1 | -1; // 1 = right, -1 = left
  health: number;
  maxHealth: number;
  attackCooldown: number;
  state: "idle" | "walking" | "attacking" | "dead";
  animationFrame: number;
  animationTimer: number;
}

export class EnemyManager {
  private enemies: Map<string, EnemyInstance> = new Map();
  private gravity = 500;
  private readonly speeds: Record<string, number> = {
    goblin: 80,
    dragon: 120,
    boss: 60,
    cultist: 90,
  };

  addEnemy(
    id: string,
    type: "goblin" | "dragon" | "boss" | "cultist",
    x: number,
    y: number
  ) {
    const healthMap: Record<string, number> = {
      goblin: 10,
      dragon: 30,
      boss: 50,
      cultist: 15,
    };

    const enemy: EnemyInstance = {
      id,
      type,
      x,
      y,
      velocityY: 0,
      width: type === "boss" ? 64 : type === "dragon" ? 48 : 32,
      height: type === "boss" ? 64 : type === "dragon" ? 48 : 32,
      onGround: false,
      direction: 1,
      health: healthMap[type],
      maxHealth: healthMap[type],
      attackCooldown: 0,
      state: "idle",
      animationFrame: 0,
      animationTimer: 0,
    };

    this.enemies.set(id, enemy);
  }

  update(deltaTime: number, playerX: number, playerY: number, platforms: any[]) {
    for (const enemy of this.enemies.values()) {
      if (enemy.state === "dead") continue;

      // Simple AI: walk towards player if in range
      const distToPlayer = Math.abs(playerX - enemy.x);
      const seeingDistance = 300;

      if (distToPlayer < seeingDistance) {
        // Walk towards player
        enemy.state = "walking";
        enemy.direction = playerX > enemy.x ? 1 : -1;
      } else {
        // Idle movement (patrol)
        enemy.state = "idle";
        if (Math.random() < 0.02) {
          enemy.direction = (Math.random() < 0.5 ? 1 : -1) as 1 | -1;
        }
      }

      // Apply gravity
      enemy.velocityY += this.gravity * deltaTime;
      enemy.y += enemy.velocityY * deltaTime;

      // Platform collision
      enemy.onGround = false;
      for (const platform of platforms) {
        if (
          enemy.x < platform.x + platform.width &&
          enemy.x + enemy.width > platform.x &&
          enemy.y + enemy.height >= platform.y &&
          enemy.y + enemy.height <= platform.y + platform.height &&
          enemy.velocityY >= 0
        ) {
          enemy.y = platform.y - enemy.height;
          enemy.velocityY = 0;
          enemy.onGround = true;
          break;
        }
      }

      // Movement
      const speed = this.speeds[enemy.type];
      if (enemy.state === "walking") {
        enemy.x += speed * enemy.direction * deltaTime;
      }

      // Simple jump behavior for some enemies
      if (
        enemy.onGround &&
        Math.random() < 0.01 &&
        (enemy.type === "goblin" || enemy.type === "cultist")
      ) {
        enemy.velocityY = -260;
        enemy.onGround = false;
      }

      // Attack cooldown
      if (enemy.attackCooldown > 0) {
        enemy.attackCooldown -= deltaTime;
      }

      // Simple attack logic
      if (
        distToPlayer < 60 &&
        enemy.state !== "attacking" &&
        enemy.attackCooldown <= 0
      ) {
        enemy.state = "attacking";
        enemy.attackCooldown = 1.0; // 1 second between attacks
      } else if (enemy.state === "attacking" && enemy.attackCooldown <= 0.5) {
        enemy.state = "walking";
      }

      // Animation update
      enemy.animationTimer += deltaTime;
      const frameRate = 0.1; // 10 fps animation
      if (enemy.animationTimer > frameRate) {
        enemy.animationFrame = (enemy.animationFrame + 1) % 4;
        enemy.animationTimer = 0;
      }
    }
  }

  getEnemies(): EnemyInstance[] {
    return Array.from(this.enemies.values());
  }

  getEnemy(id: string): EnemyInstance | undefined {
    return this.enemies.get(id);
  }

  damageEnemy(id: string, damage: number): boolean {
    const enemy = this.enemies.get(id);
    if (!enemy) return false;

    enemy.health -= damage;
    if (enemy.health <= 0) {
      enemy.state = "dead";
      return true; // Enemy died
    }
    return false;
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const enemy of this.enemies.values()) {
      if (enemy.state === "dead") continue;

      // Draw enemy as a colored rectangle (placeholder)
      const colorMap: Record<string, string> = {
        goblin: "#4a7c3c",
        dragon: "#8b2e2e",
        boss: "#1a1a2e",
        cultist: "#6b3e3e",
      };

      ctx.fillStyle = colorMap[enemy.type];
      ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);

      // Draw health bar
      ctx.fillStyle = "#ff0000";
      const healthBarWidth = (enemy.health / enemy.maxHealth) * enemy.width;
      ctx.fillRect(enemy.x, enemy.y - 8, healthBarWidth, 4);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.strokeRect(enemy.x, enemy.y - 8, enemy.width, 4);

      // Direction indicator
      if (enemy.direction === -1) {
        ctx.scale(-1, 1);
        ctx.translate(-enemy.x * 2 - enemy.width, 0);
      }

      ctx.restore();
    }
  }

  clear() {
    this.enemies.clear();
  }
}
