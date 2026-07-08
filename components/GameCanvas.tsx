"use client";

import { useEffect, useRef, useState } from "react";
import { HUD } from "@/components/HUD";
import { AudioManager } from "@/lib/audioManager";
import { GameLoop } from "@/lib/gameLoop";
import { InputHandler } from "@/lib/inputHandler";
import {
  SpriteAnimationController,
  type AnimationState,
} from "@/lib/spriteAnimator";
import { LevelManager } from "@/lib/levelManager";
import { EnemyManager } from "@/lib/enemyManager";

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const PLAYER_SPEED = 300;
const GRAVITY = 500;
const JUMP_FORCE = -260;

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [currentLevel, setCurrentLevel] = useState("level-1");
  const [gameOverMessage, setGameOverMessage] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const levelManager = new LevelManager("level-1");
    const enemyManager = new EnemyManager();
    const loop = new GameLoop();
    const input = new InputHandler(window);
    const sprite = new SpriteAnimationController();
    const audio = new AudioManager();
    const spriteSheet = new Image();
    spriteSheet.src = "/sprites/hero-placeholder.png";

    audio.load("jump", "/audio/jump-placeholder.wav").catch(() => {
      // Placeholder files may not exist yet
    });

    // Player state
    const player = { 
      x: 0, 
      y: 0, 
      velocityY: 0, 
      onGround: true,
      health: 30,
      maxHealth: 30,
      direction: 1, // 1 = right, -1 = left
      attackCooldown: 0,
    };

    // Initialize first level
    const loadLevel = (levelId: string) => {
      levelManager.loadLevel(levelId);
      enemyManager.clear();
      const level = levelManager.getCurrentLevel();
      
      // Spawn player
      player.x = level.spawns.x;
      player.y = level.spawns.y;
      player.velocityY = 0;
      
      // Spawn enemies
      for (const enemy of level.enemies) {
        enemyManager.addEnemy(enemy.id, enemy.type, enemy.x, enemy.y);
      }
      
      setCurrentLevel(levelId);
    };

    // Load initial level
    loadLevel("level-1");

    let gameOver = false;
    let lastScore = 0;

    loop.start((deltaTime) => {
      if (gameOver) return;

      // Poll gamepad state every frame
      input.updateGamepadState();

      const level = levelManager.getCurrentLevel();
      const moveLeft = input.isPressed("left");
      const moveRight = input.isPressed("right");
      const shouldJump = input.isPressed("jump");
      const shouldAttack = input.isPressed("attack");

      // Update player direction based on movement
      if (moveLeft) player.direction = -1;
      if (moveRight) player.direction = 1;

      // Horizontal movement
      if (moveLeft) {
        player.x -= PLAYER_SPEED * deltaTime;
      }
      if (moveRight) {
        player.x += PLAYER_SPEED * deltaTime;
      }

      // Jumping
      if (shouldJump && player.onGround) {
        player.velocityY = JUMP_FORCE;
        player.onGround = false;
        audio.play("jump");
      }

      // Gravity
      player.velocityY += GRAVITY * deltaTime;
      player.y += player.velocityY * deltaTime;

      // Platform collision
      player.onGround = false;
      const collision = levelManager.checkCollision(player.x, player.y, 32, 32);
      if (collision && player.velocityY >= 0) {
        player.y = collision.y - 32;
        player.velocityY = 0;
        player.onGround = true;
      }

      // Level exit collision (transition to next level)
      const exit = levelManager.checkExitCollision(player.x, player.y, 32, 32);
      if (exit) {
        loadLevel(exit.target);
        lastScore = score;
      }

      // Bounds checking
      player.x = Math.max(0, Math.min(level.width - 32, player.x));

      // Update animation state
      let state: AnimationState = "idle";
      if (!player.onGround) {
        state = "jump";
      } else if (moveLeft || moveRight) {
        state = "walk";
      }
      sprite.setState(state);
      sprite.update(deltaTime);

      // Update enemies
      enemyManager.update(deltaTime, player.x, player.y, level.platforms);

      // Attack logic
      if (shouldAttack && player.attackCooldown <= 0) {
        player.attackCooldown = 0.3;
        
        // Check collision with enemies
        for (const enemy of enemyManager.getEnemies()) {
          const attackRange = player.direction === 1 ? 60 : -60;
          const attackX = player.x + 16 + attackRange;
          
          if (
            Math.abs(enemy.x + enemy.width / 2 - attackX) < 40 &&
            Math.abs(enemy.y + enemy.height / 2 - (player.y + 16)) < 40
          ) {
            const died = enemyManager.damageEnemy(enemy.id, 10);
            if (died) {
              setScore(s => s + 100);
            }
          }
        }
      }

      if (player.attackCooldown > 0) {
        player.attackCooldown -= deltaTime;
      }

      // Check if player took damage (enemy collision)
      for (const enemy of enemyManager.getEnemies()) {
        if (
          player.x < enemy.x + enemy.width &&
          player.x + 32 > enemy.x &&
          player.y < enemy.y + enemy.height &&
          player.y + 32 > enemy.y &&
          enemy.state !== "dead"
        ) {
          player.health -= deltaTime * 5; // Take damage over time while touching enemy
          if (player.health <= 0) {
            setLives(l => l - 1);
            if (lives - 1 <= 0) {
              gameOver = true;
              setGameOverMessage("GAME OVER");
            } else {
              loadLevel(levelManager.getCurrentLevel().id);
              player.health = player.maxHealth;
            }
          }
        }
      }

      // Increment score over time
      setScore((current) => current + deltaTime * 10);
    }, () => {
      const level = levelManager.getCurrentLevel();
      
      // Render level
      levelManager.renderLevel(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Render platforms (already drawn by levelManager)
      
      // Render player
      const frame = sprite.getCurrentFrame();
      const row = sprite.getCurrentRow();

      ctx.save();
      if (player.direction === -1) {
        ctx.scale(-1, 1);
        ctx.translate(-player.x * 2 - 32, 0);
      }

      if (spriteSheet.complete && spriteSheet.naturalWidth > 0) {
        ctx.drawImage(
          spriteSheet,
          frame * 32,
          row * 32,
          32,
          32,
          player.x,
          player.y,
          32,
          32,
        );
      } else {
        ctx.fillStyle = "#ffcc66";
        ctx.fillRect(player.x, player.y, 32, 32);
      }

      ctx.restore();

      // Render player health bar
      ctx.fillStyle = "#ff0000";
      const healthBarWidth = (player.health / player.maxHealth) * 32;
      ctx.fillRect(player.x, player.y - 8, healthBarWidth, 4);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.strokeRect(player.x, player.y - 8, 32, 4);

      // Render enemies
      enemyManager.render(ctx);

      // Render level info
      ctx.fillStyle = "#ffffff";
      ctx.font = "16px monospace";
      ctx.fillText(`Level: ${level.name}`, 10, CANVAS_HEIGHT - 10);
    });

    return () => {
      loop.stop();
      input.destroy();
      levelManager.clear();
      enemyManager.clear();
    };
  }, [lives]);

  return (
    <div style={{ position: "relative", border: "2px solid #6b7280" }}>
      <HUD score={score} lives={lives} />
      {gameOverMessage && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: "48px",
            color: "red",
            textShadow: "2px 2px 4px black",
            zIndex: 100,
          }}
        >
          {gameOverMessage}
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{ imageRendering: "pixelated", display: "block" }}
      />
    </div>
  );
}
