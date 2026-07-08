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

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 360;
const PLAYER_SPEED = 140;
const GRAVITY = 500;
const JUMP_FORCE = -260;
const GROUND_Y = 270;

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [lives] = useState(3);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    // We keep these mutable values in one object so the beginner-facing update loop
    // can stay readable and not trigger a React render every frame.
    const player = { x: 80, y: GROUND_Y, velocityY: 0, onGround: true };
    const loop = new GameLoop();
    const input = new InputHandler(window);
    const sprite = new SpriteAnimationController();
    const audio = new AudioManager();
    const spriteSheet = new Image();
    spriteSheet.src = "/sprites/hero-placeholder.png";

    audio.load("jump", "/audio/jump-placeholder.wav").catch(() => {
      // Placeholder files may not exist yet during early art/audio iteration.
    });

    loop.start((deltaTime) => {
      const moveLeft = input.isPressed("left");
      const moveRight = input.isPressed("right");
      const shouldJump = input.isPressed("jump");

      if (moveLeft) {
        player.x -= PLAYER_SPEED * deltaTime;
      }

      if (moveRight) {
        player.x += PLAYER_SPEED * deltaTime;
      }

      if (shouldJump && player.onGround) {
        player.velocityY = JUMP_FORCE;
        player.onGround = false;
        audio.play("jump");
      }

      player.velocityY += GRAVITY * deltaTime;
      player.y += player.velocityY * deltaTime;

      if (player.y >= GROUND_Y) {
        player.y = GROUND_Y;
        player.velocityY = 0;
        player.onGround = true;
      }

      player.x = Math.max(0, Math.min(CANVAS_WIDTH - 32, player.x));

      let state: AnimationState = "idle";
      if (!player.onGround) {
        state = "jump";
      } else if (moveLeft || moveRight) {
        state = "walk";
      }

      sprite.setState(state);
      sprite.update(deltaTime);
      setScore((current) => current + deltaTime * 10);
    }, () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = "#1d4b67";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = "#3f7d20";
      ctx.fillRect(0, GROUND_Y + 32, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

      const frame = sprite.getCurrentFrame();
      const row = sprite.getCurrentRow();

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
        // Rectangle fallback keeps movement debuggable before real assets are added.
        ctx.fillStyle = "#ffcc66";
        ctx.fillRect(player.x, player.y, 32, 32);
      }
    });

    return () => {
      loop.stop();
      input.destroy();
    };
  }, [lives]);

  return (
    <div style={{ position: "relative", border: "2px solid #6b7280", width: CANVAS_WIDTH }}>
      <HUD snapshot={{ score: Math.floor(score), lives }} />
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{ imageRendering: "pixelated", display: "block", width: "100%", height: "auto" }}
      />
    </div>
  );
}
