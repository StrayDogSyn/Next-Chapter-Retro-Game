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
        H --> M[loot-client.ts]
    end
    subgraph "Next.js (TypeScript, static export)"
        I[App Router Pages]
        A <--> I
    end
    subgraph "Python Service (FastAPI)"
        L[/loot/roll]
    end
    M -->|HTTP fetch, cross-origin| L
    L -->|JSON| M
```

Note (ADR-008): the site deploys as a static export (`output: "export"`, GitHub Pages), which has no server to run Next.js API routes against at runtime. The browser therefore calls the Python service directly via `lib/game/loot-client.ts` instead of proxying through a Next.js route — python-service must have CORS enabled for the deployed origin. `/generate-level` and the old `/generate-loot`/`/procedural-level` routes are unused (world layout is generated client-side by `lib/game/world.ts` + `levelLoader.ts`, not by the Python service).

## Why Python Exists Here

The Python service owns procedural generation because:

1. **Level layout generation** — Uses random seeding for reproducible but varied platform layouts
2. **Loot table generation** — Rarity-weighted drops with stat rolls (damage/crit_chance), affixes, and sale values
3. **Scalability** — Data-driven approach (JSON stat blocks returned to TypeScript) allows "dozens of weapons/items" via stat rolls, not hardcoded per-item classes
4. **Python-specific advantage** — Random module with seed support; numpy/scipy available for future procedural generation (terrain, noise, etc.)

The service runs independently from Next.js and returns plain JSON. It was originally consumed via Next.js API routes (ADR-001); as of ADR-008 the browser calls it directly (`lib/game/loot-client.ts`) since static export has no server to run those routes against — the isolation (Python owns loot rolling, not embedded in TS) still holds, only the transport changed.

## Frontend Responsibilities

- Render loop (`requestAnimationFrame`, delta-time based movement)
- Sprite animation state machine (idle / walk / jump)
- Input handling (keyboard + Xbox gamepad unified interface)
- Audio playback via Web Audio API
- HUD (React components layered over the canvas)
- Combat status pips rendered above enemies for active affix effects (burn/freeze/shock/curse)
- Game orchestration consolidated in a single `Game` class (`lib/game/game.ts`) with supporting modules: `lib/game/input.ts` (unified InputState), `lib/game/world.ts` + `levelLoader.ts` (24-room validated world graph), `lib/game/items.ts` (data-driven weapons/upgrades). The earlier LevelManager/EnemyManager/BossManager/ItemManager parallel classes were consolidated away — see SESSION_LOG 2026-07-08 and the "no parallel systems" rule in AGENTIC_WORKFLOW.md.

## Backend Responsibilities

- FastAPI service, run independently from the Next.js dev server
- Exposes JSON endpoints called directly from the browser (ADR-008), with CORS enabled for the deployed origin
- **/generate-level** — Returns platform positions for a given seed (currently unused by the frontend; world generation happens client-side)
- **/loot/roll** — Rolls one drop (rarity tier + randomized stats); **/loot/table** — full table dump for balancing

## Data Flow

1. Browser input (keyboard events + per-frame gamepad poll) → shared InputState → `Game.update()`
2. `Game` handles physics/collision, enemy + boss AI, combat, and room transitions against the loaded world graph
3. On kill/chest-open, `Game.rollLoot()` calls `fetchLootRoll()` (`lib/game/loot-client.ts`) → Python service rolls the drop directly over HTTP → client renders/applies it (client fallback only if the service is unreachable, tagged `client-fallback` — ADR-003)
4. Canvas renders tiles/entities/HUD overlay each frame

## Multi-Level World Structure

- **Metroidvania-style interconnected world:** 24 single-screen rooms across 5 zones, connected by edge exits with ability/key gating (ADR-004)
- **Room data format:** ASCII tile maps (solid/platform/spike/door) + entity spawn characters, validated at load by `levelLoader.ts`
- **Reusability:** rooms share one carved tileset + zone backgrounds; new rooms are added by appending to `ROOMS` in `lib/game/world.ts` — the loader fails loudly on malformed maps or sealed exits

## Open Questions / Future Work

- [x] Real spritesheet integration (via `scripts/prepare-assets.py` + `spritemeta.json`)
- [x] Audio event wiring (jump/combat SFX, zone + boss music)
- [x] Prefix weapon effects wired in combat (burn/freeze/shock/curse + crit/lifesteal)
- [ ] Level progression save state (tracking which levels cleared, inventory persistence)
- [ ] Determine if more than 4 levels needed, or if reusing/recombining level sections more is better for scope
- [ ] Evaluate whether WebSocket communication is worth adding for real-time state sync (probably not needed for single-player local game)
