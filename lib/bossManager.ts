/**
 * Boss AI System - specialized enemy type with advanced behaviors
 * This system demonstrates the difference between simple enemy AI and boss patterns
 */

export type BossPhase = "idle" | "chasing" | "attacking" | "stunned" | "defeated";
export type BossType = "werewolf" | "dragon" | "cultist_lord";

export interface BossAttack {
  name: string;
  damage: number;
  range: number;
  cooldown: number;
  animation: string;
}

export interface BossInstance {
  id: string;
  type: BossType;
  x: number;
  y: number;
  velocityY: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  onGround: boolean;
  phase: BossPhase;
  direction: 1 | -1;
  attackCooldown: number;
  phaseCooldown: number;
  animationFrame: number;
  animationTimer: number;
  phaseHealth: number[]; // Health thresholds for phase changes
  attacks: BossAttack[];
  stunnedTime: number;
}

export class BossManager {
  private boss: BossInstance | null = null;
  private gravity = 500;

  createBoss(id: string, type: BossType, x: number, y: number): BossInstance {
    const bossConfigs: Record<BossType, Partial<BossInstance>> = {
      werewolf: {
        width: 64,
        height: 64,
        maxHealth: 150,
        phaseHealth: [100, 50],
        attacks: [
          {
            name: "claw_swipe",
            damage: 15,
            range: 80,
            cooldown: 1.0,
            animation: "swipe",
          },
          {
            name: "howl",
            damage: 5,
            range: 200,
            cooldown: 3.0,
            animation: "howl",
          },
          {
            name: "leap_attack",
            damage: 20,
            range: 150,
            cooldown: 2.5,
            animation: "leap",
          },
        ],
      },
      dragon: {
        width: 80,
        height: 80,
        maxHealth: 200,
        phaseHealth: [133, 66],
        attacks: [
          {
            name: "breath",
            damage: 25,
            range: 300,
            cooldown: 2.0,
            animation: "breath",
          },
          {
            name: "tail_swipe",
            damage: 20,
            range: 120,
            cooldown: 1.5,
            animation: "tail",
          },
          {
            name: "roar",
            damage: 10,
            range: 250,
            cooldown: 4.0,
            animation: "roar",
          },
        ],
      },
      cultist_lord: {
        width: 48,
        height: 64,
        maxHealth: 100,
        phaseHealth: [66, 33],
        attacks: [
          {
            name: "magic_bolt",
            damage: 18,
            range: 200,
            cooldown: 1.2,
            animation: "cast",
          },
          {
            name: "dark_ritual",
            damage: 12,
            range: 100,
            cooldown: 3.5,
            animation: "ritual",
          },
          {
            name: "teleport_strike",
            damage: 22,
            range: 150,
            cooldown: 2.0,
            animation: "teleport",
          },
        ],
      },
    };

    const config = bossConfigs[type];
    const boss: BossInstance = {
      id,
      type,
      x,
      y,
      velocityY: 0,
      width: config.width || 64,
      height: config.height || 64,
      health: config.maxHealth || 100,
      maxHealth: config.maxHealth || 100,
      onGround: false,
      phase: "idle",
      direction: 1,
      attackCooldown: 0,
      phaseCooldown: 0,
      animationFrame: 0,
      animationTimer: 0,
      phaseHealth: config.phaseHealth || [50],
      attacks: config.attacks || [],
      stunnedTime: 0,
    };

    this.boss = boss;
    return boss;
  }

  update(
    deltaTime: number,
    playerX: number,
    playerY: number,
    playerHealth: number,
    platforms: any[]
  ): void {
    if (!this.boss) return;

    const distToPlayer = Math.abs(playerX - this.boss.x);
    const verticalDist = Math.abs(playerY - this.boss.y);

    // Update phase based on health
    if (this.boss.health <= this.boss.phaseHealth[1]) {
      if (this.boss.phase !== "defeated") {
        this.boss.phase = "attacking";
        this.boss.phaseCooldown = 0.5;
      }
    } else if (this.boss.health <= this.boss.phaseHealth[0]) {
      if (this.boss.phase === "idle") {
        this.boss.phase = "chasing";
        this.boss.phaseCooldown = 1.0;
      }
    }

    // Handle stunned state
    if (this.boss.stunnedTime > 0) {
      this.boss.stunnedTime -= deltaTime;
      this.boss.phase = "stunned";
      this.boss.attackCooldown = Math.max(0, this.boss.attackCooldown - deltaTime);
      this.boss.direction = playerX > this.boss.x ? 1 : -1;
    } else {
      // Main AI logic
      if (distToPlayer < 400) {
        // Player in aggro range
        this.boss.direction = playerX > this.boss.x ? 1 : -1;

        if (distToPlayer < 100) {
          // Close range: melee attack
          this.boss.phase = "attacking";
        } else if (distToPlayer < 300) {
          // Medium range: chase or ranged attack
          this.boss.phase = "chasing";
        } else {
          this.boss.phase = "chasing";
        }
      } else {
        this.boss.phase = "idle";
      }

      // Attack logic
      if (
        (this.boss.phase === "attacking" || this.boss.phase === "chasing") &&
        this.boss.attackCooldown <= 0
      ) {
        // Choose attack based on distance
        let selectedAttack: BossAttack | null = null;

        if (distToPlayer < 100 && this.boss.attacks[0]) {
          selectedAttack = this.boss.attacks[0]; // Melee
        } else if (distToPlayer < 200 && this.boss.attacks[1]) {
          selectedAttack = this.boss.attacks[1]; // Medium
        } else if (this.boss.attacks[2]) {
          selectedAttack = this.boss.attacks[2]; // Ranged
        }

        if (selectedAttack && Math.random() < 0.6) {
          // 60% chance to attack if conditions met
          this.boss.attackCooldown = selectedAttack.cooldown;
          this.boss.phase = "attacking";
        }
      }

      // Movement during chase phase
      if (this.boss.phase === "chasing" && distToPlayer > 80) {
        const moveSpeed = 150;
        this.boss.x += moveSpeed * this.boss.direction * deltaTime;
      }

      // Simple jump behavior
      if (this.boss.onGround && Math.random() < 0.02 && distToPlayer < 200) {
        this.boss.velocityY = -260;
        this.boss.onGround = false;
      }

      // Attack cooldown
      if (this.boss.attackCooldown > 0) {
        this.boss.attackCooldown -= deltaTime;
      }

      // Phase cooldown
      if (this.boss.phaseCooldown > 0) {
        this.boss.phaseCooldown -= deltaTime;
      }
    }

    // Gravity
    this.boss.velocityY += this.gravity * deltaTime;
    this.boss.y += this.boss.velocityY * deltaTime;

    // Platform collision
    this.boss.onGround = false;
    for (const platform of platforms) {
      if (
        this.boss.x < platform.x + platform.width &&
        this.boss.x + this.boss.width > platform.x &&
        this.boss.y + this.boss.height >= platform.y &&
        this.boss.y + this.boss.height <= platform.y + platform.height &&
        this.boss.velocityY >= 0
      ) {
        this.boss.y = platform.y - this.boss.height;
        this.boss.velocityY = 0;
        this.boss.onGround = true;
        break;
      }
    }

    // Animation update
    this.boss.animationTimer += deltaTime;
    const frameRate = 0.15; // Slightly slower than regular enemies
    if (this.boss.animationTimer > frameRate) {
      this.boss.animationFrame = (this.boss.animationFrame + 1) % 6;
      this.boss.animationTimer = 0;
    }
  }

  damageABoss(damage: number): void {
    if (!this.boss) return;

    this.boss.health -= damage;
    this.boss.stunnedTime = 0.3; // Brief stun on hit

    if (this.boss.health <= 0) {
      this.boss.phase = "defeated";
      this.boss.health = 0;
    }
  }

  getBoss(): BossInstance | null {
    return this.boss;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.boss) return;

    // Draw boss
    const colorMap: Record<BossType, string> = {
      werewolf: "#8b2e2e",
      dragon: "#cc5500",
      cultist_lord: "#663366",
    };

    ctx.save();

    if (this.boss.direction === -1) {
      ctx.scale(-1, 1);
      ctx.translate(-this.boss.x * 2 - this.boss.width, 0);
    }

    // Draw boss body
    ctx.fillStyle = colorMap[this.boss.type];
    ctx.fillRect(this.boss.x, this.boss.y, this.boss.width, this.boss.height);

    // Draw stun indicator if stunned
    if (this.boss.phase === "stunned") {
      ctx.fillStyle = "#ffff00";
      ctx.fillRect(this.boss.x + 5, this.boss.y - 15, 10, 10);
      ctx.fillRect(this.boss.x + this.boss.width - 15, this.boss.y - 15, 10, 10);
    }

    ctx.restore();

    // Draw health bar
    ctx.fillStyle = "#ff0000";
    const healthPercent = this.boss.health / this.boss.maxHealth;
    const healthBarWidth = this.boss.width * healthPercent;
    ctx.fillRect(this.boss.x, this.boss.y - 12, healthBarWidth, 6);

    ctx.strokeStyle = "#ffff00";
    ctx.lineWidth = 2;
    ctx.strokeRect(this.boss.x, this.boss.y - 12, this.boss.width, 6);

    // Draw phase indicator
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px monospace";
    const phaseLabel =
      this.boss.phase.charAt(0).toUpperCase() + this.boss.phase.slice(1);
    ctx.fillText(phaseLabel, this.boss.x, this.boss.y - 25);
  }

  clear(): void {
    this.boss = null;
  }
}
