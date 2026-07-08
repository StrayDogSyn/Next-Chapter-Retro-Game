# Architecture

## System Diagram

```mermaid
flowchart TD
    subgraph Browser
        A[Canvas Renderer] --> B[Sprite Animation State Machine]
        A --> C[Web Audio Manager]
        A --> D[Input Handler]
        A --> E[Level Manager]
        A --> F[Enemy Manager]
        A --> G[Boss Manager]
        A --> H[Item Manager]
    end
    subgraph "Next.js (TypeScript)"
        I[App Router Pages] --> J[API Routes]
        A <--> I
    end
    subgraph "Python Service (FastAPI)"
        K[/generate-level]
        L[/generate-loot]
    end
    J -->|HTTP fetch| K
    J -->|HTTP fetch| L
    K -->|JSON| J
    L -->|JSON| J
```

## Why Python Exists Here

The Python service owns procedural generation because:

1. **Level layout generation** — Uses random seeding for reproducible but varied platform layouts
2. **Loot table generation** — Rarity-weighted drops with stat rolls (damage/crit_chance), affixes, and sale values
3. **Scalability** — Data-driven approach (JSON stat blocks returned to TypeScript) allows "dozens of weapons/items" via stat rolls, not hardcoded per-item classes
4. **Python-specific advantage** — Random module with seed support; numpy/scipy available for future procedural generation (terrain, noise, etc.)

The service runs independently from Next.js and returns plain JSON consumed by Next.js API routes, maintaining clean boundaries per ADR-001.

## Frontend Responsibilities

- Render loop (`requestAnimationFrame`, delta-time based movement)
- Sprite animation state machine (idle / walk / jump)
- Input handling (keyboard + Xbox gamepad unified interface)
- Audio playback via Web Audio API
- HUD (React components layered over the canvas)
- **NEW:** Level management (LevelManager), enemy spawning and updates (EnemyManager), boss AI (BossManager), combat and item management (ItemManager)

## Backend Responsibilities

- FastAPI service, run independently from the Next.js dev server
- Exposes JSON endpoints consumed by Next.js API routes (not called directly from the browser)
- **/generate-level** — Returns platform positions for a given seed
- **/generate-loot** — Returns itemized loot table with rarity tiers and stat rolls

## Data Flow

1. Browser input → Canvas renderer updates local player state
2. LevelManager/EnemyManager/BossManager handle collision, AI updates, combat
3. ItemManager tracks player inventory; when player kills an enemy or finds treasure, ItemManager adds items
4. When game needs new loot, Next.js API route calls Python service → returns JSON → TypeScript consumes and instantiates Item objects
5. Canvas renders all entities and HUD

## Multi-Level World Structure

- **Metroidvania-style interconnected world:** 4 levels with exits that transition between levels
- **Level data format:** Platforms (for collision), enemies (with spawn positions), exits (with target level IDs), player spawn point
- **Reusability:** Levels reference a shared pool of platform sizes and enemy types; new levels can be added by extending the LEVELS object in LevelManager

## Open Questions / Future Work

- [ ] Real spritesheet integration (currently placeholder rectangles)
- [ ] Audio event wiring (jump SFX, combat SFX, boss theme music)
- [ ] Level progression save state (tracking which levels cleared, inventory persistence)
- [ ] Determine if more than 4 levels needed, or if reusing/recombining level sections more is better for scope
- [ ] Evaluate whether WebSocket communication is worth adding for real-time state sync (probably not needed for single-player local game)
