# Decisions & Rationale (ADRs)

Lightweight Architecture Decision Records. Each one captures a choice, whether it originated from the AI agent or from you, and why it stuck (or got reverted).

---

## Template

```markdown
## ADR-XXX: [Decision title]

- **Date:**
- **Status:** Proposed / Accepted / Rejected / Superseded
- **Originated from:** Agent suggestion / Human decision / Joint
- **Context:** What problem or question prompted this
- **Decision:** What was decided
- **Alternatives considered:**
- **Consequences:** Tradeoffs, what this makes easier/harder later
```

---

## ADR-001: Isolate Python service instead of embedding logic in Next.js API routes

- **Date:** _fill in_
- **Status:** Accepted
- **Originated from:** Human decision (specified in initial scaffold prompt)
- **Context:** Needed a clear, defensible reason for Python to exist in a TypeScript-first stack rather than it being decorative
- **Decision:** Python runs as a standalone FastAPI service, called via Next.js API routes as a client, rather than being embedded or serverless-bundled
- **Alternatives considered:**
  - Python serverless functions colocated in the Next.js project
  - Skipping Python entirely and doing all logic in TypeScript
- **Consequences:** Clean separation of concerns and a legitimate "software diversity" story for the submission; adds the overhead of running two services locally (documented in README's Getting Started)

---

## ADR-002: No game engine library — hand-rolled canvas render loop

- **Date:** _fill in_
- **Status:** Accepted
- **Originated from:** Human decision
- **Context:** Bootcamp submission is meant to demonstrate fundamentals, not library fluency
- **Decision:** Use raw HTML5 Canvas + `requestAnimationFrame`, no Phaser/PixiJS/etc.
- **Alternatives considered:** Phaser.js (faster to build, but hides the render loop and state machine mechanics being showcased)
- **Consequences:** More code to write and maintain, but every line is legible and demonstrates understanding rather than configuration

---

<<<<<<< HEAD
## ADR-003: Client-side loot fallback when the Python service is down

- **Date:** 2026-07-07
- **Status:** Accepted
- **Originated from:** Agent decision (Claude overnight session), flagged for human review
- **Context:** ADR-001 puts loot rolling in the Python service. But the game runs even when only `npm run dev` is up (no uvicorn), and hard-blocking all drops on a second local service makes the demo fragile for reviewers.
- **Decision:** The Python service (`/loot/roll`) remains the authoritative loot roller, proxied via `app/api/loot/route.ts`. The client keeps a minimal mirror of the tables (`lib/game/items.ts`) and a degraded-mode `fallbackRoll()`. Every drop is tagged `rolledBy: "python-service" | "client-fallback"` and the HUD shows which source is live, so the fallback can never silently masquerade as the real thing.
- **Alternatives considered:** Hard failure with an error banner (hostile demo experience); rolling everything client-side (violates ADR-001).
- **Consequences:** Two copies of the loot tables exist (TS + Python) with header comments pointing at each other; drift is possible and a sync script is listed as future work.

---

## ADR-004: Single-screen rooms for the Metroidvania world (no scrolling camera)

- **Date:** 2026-07-07
- **Status:** Accepted
- **Originated from:** Agent decision (Claude overnight session), flagged for human review
- **Context:** The spec calls for 20+ levels as an interconnected Metroidvania world. A scrolling camera plus large maps adds engine complexity (camera clamping, culling, larger hand-authored maps) without changing the interconnection structure being demonstrated.
- **Decision:** 24 single-screen rooms (40x22 tiles of 16px) connected by edge exits in a graph (`lib/game/world.ts`), with ability/key gating (double jump, dash, ancient key, beast door). Room maps are ASCII, validated at load by `lib/game/levelLoader.ts` so a malformed map fails loudly.
- **Alternatives considered:** Scrolling camera over multi-screen zones (richer feel, more engine surface area to get right overnight); procedural room layouts from the Python service (less authored variety, harder to guarantee traversability).
- **Consequences:** Simpler physics/render loop and testable rooms; the camera work is deferred. A future scrolling refactor only touches the render/transition layer since collision queries already go through room-local tile lookups.

---

## ADR-005: Deterministic asset pipeline (`scripts/prepare-assets.py`) + sprite metadata JSON

- **Date:** 2026-07-07
- **Status:** Accepted
- **Originated from:** Agent decision (Claude overnight session)
- **Context:** Raw sourced assets (see `assets/manifest*.csv`) are heterogeneous: 100+ individual werewolf frames in a zip, irregular compilation sheets, GIFs, example-scene tilesets. The renderer needs uniform sheets, and past sessions showed hand-maintained frame math drifts from the art.
- **Decision:** One re-runnable script extracts/crops/packs ONLY assets verified on disk into `public/sprites` + `public/audio`, and emits `public/sprites/spritemeta.json` (cell sizes, animation rows, frame counts) that the renderer consumes. It also writes `assets/wired-assets.txt` — the ground-truth list used to cross-check `docs/CREDITS.md`.
- **Alternatives considered:** Committing hand-cropped sheets (opaque provenance, not reproducible); hardcoding frame rects in TS (the drift problem this repo already got burned by).
- **Consequences:** Pillow becomes a dev-time dependency (not runtime); regenerating art changes is one command.
=======
## ADR-003: Unified input interface (InputState) for keyboard + gamepad

- **Date:** 2026-07-07
- **Status:** Accepted
- **Originated from:** Agent suggestion (during gamepad implementation)
- **Context:** Needed to support both keyboard and Xbox gamepad input without duplicating movement/action logic in the game loop
- **Decision:** Create a single `InputState` interface that both keyboard and gamepad handlers write into; gamepad polling happens every frame in the render loop via `updateGamepadState()`
- **Alternatives considered:**
  - Separate keyboard and gamepad branches in GameCanvas (would double the input-checking code every frame)
  - Use an event emitter pattern for gamepad input (would be async and mess with frame timing)
- **Consequences:** 
  - Clean separation between input handling (InputHandler) and game logic (GameCanvas) — game loop only reads from InputState
  - Future controller rebinding (ADR for next phase) will only need to touch InputHandler, not game logic
  - Gamepad must be polled every frame because there's no "gamepad button down" browser event; this is baked into GameLoop design
>>>>>>> agents/next-chapter-retro-game-setup

---

_Add new ADRs as decisions are made — including ones where you overrode an agent's suggestion. Those are often the most interesting entries for a reviewer._
