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
---

## ADR-006: Unified input interface (InputState) for keyboard + gamepad

_(Renumbered from a duplicate "ADR-003" during the 2026-07-08 merge-conflict cleanup — two parallel sessions had each claimed 003. Content preserved as written.)_

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

---

## ADR-007: vitest as the JS/TS test runner

- **Date:** 2026-07-11
- **Status:** Accepted
- **Originated from:** Agent suggestion, during Phase 0 audit against `docs/MASTER_BUILD_SPEC.md`
- **Context:** `package.json` had no `test` script and no JS test framework installed at all — `npm test` failed immediately with "Missing script." `docs/MASTER_BUILD_SPEC.md`'s verification loop requires `npm test` to pass as a universal gate on every future increment, so this was the single hard blocker to running that loop as written. Note: this repo already had one ADR-numbering collision (see ADR-006's note) from two parallel sessions both claiming "ADR-003" — this entry uses the next free number rather than whatever number `MASTER_BUILD_SPEC.md`'s per-phase prose suggests, to avoid repeating that.
- **Decision:** Installed `vitest` as a devDependency, added `"test": "vitest run"`, and wrote the first real test file (`lib/game/rng.test.ts`) covering the seeded RNG's determinism and `.fork()` stream-independence guarantees — the property the procgen design (and the spec's two-stream RNG rule) depends on.
- **Alternatives considered:**
  - Jest — heavier config for an ESM/Next.js 14 + TypeScript project; vitest's Vite-based transform needs near-zero config here.
  - No config file — vitest runs `**/*.test.ts` out of the box; skipped adding `vitest.config.ts` until a real need (jsdom environment, path aliases in tests) appears.
- **Consequences:** `npm test` now exits 0 (12/12 passing) and is a trustworthy gate going forward. Does not touch the Python test suite (`scripts/tests/test_regression_contracts.py`), which remains separate.

---

## ADR-008: Browser calls the Python service directly; Next.js API-route proxy removed

- **Date:** 2026-07-11
- **Status:** Accepted (supersedes the API-route-proxy half of ADR-001; the "Python owns loot rolling" isolation itself is unchanged)
- **Originated from:** Agent suggestion, user confirmed via AskUserQuestion after being offered the alternative (drop static export instead)
- **Context:** `e35cbbc` added `output: "export"` to `next.config.mjs` for GitHub Pages hosting, which broke `npm run build`: static export has no server to run Next.js Route Handlers against at runtime, and `app/api/loot/route.ts` + `app/api/generate-loot/route.ts` both called `request.url`, which errored during prerender. A repo-wide grep showed only `/api/loot` had any caller (`lib/game/game.ts`, 2 call sites); `/api/generate-loot` and `/api/procedural-level` were unused dead code that happened to share (or, for procedural-level, quietly mask) the same incompatibility.
- **Decision:** Deleted all three `app/api/*` routes. Added `lib/game/loot-client.ts`, which the browser calls directly against the Python service (`NEXT_PUBLIC_PYTHON_SERVICE_URL`, default `http://127.0.0.1:8000`) — same request/response shape the deleted `/api/loot` route used, so `game.ts`'s call sites changed minimally. Added CORS (`fastapi.middleware.cors.CORSMiddleware`) to `python-service/main.py` allowing the local dev origins and `https://straydogsyn.github.io`, since this is now a cross-origin browser request instead of a server-to-server one.
- **Alternatives considered:**
  - Drop `output: "export"` and host somewhere with a Node runtime (Vercel, Railway) — keeps the proxy-route pattern intact, but gives up the already-wired GitHub Pages deploy workflow. Rejected by the user in favor of keeping static hosting.
  - Keep the unused `generate-loot`/`procedural-level` routes as dead code and only fix `/api/loot` — rejected because `generate-loot` independently fails the build the same way, so `npm run build` would still be red.
- **Consequences:** `npm run build` passes again. The Python service must now be reachable from wherever the static site is actually loaded (browser-to-service, not build-server-to-service) — for the deployed GitHub Pages site this means python-service needs to be hosted somewhere public and `NEXT_PUBLIC_PYTHON_SERVICE_URL` set at build time in `.github/workflows/deploy.yml`; until then the deployed site will always fall through to `client-fallback` loot rolls (this is graceful, not broken — see ADR-003). That deployment gap is real Phase 5 (persistence/hosting) territory per `MASTER_BUILD_SPEC.md`, not resolved by this ADR. CORS origins in `main.py` are a hardcoded list, not env-driven — revisit if the Pages URL or a custom domain changes.

---

## ADR-009: Anonymous UUID identity + JSONB run persistence on Neon

- **Date:** 2026-07-12
- **Status:** Accepted
- **Originated from:** Agent proposal (a "beta release" prompt assumed this layer already existed and asked to add anonymous identity on top of it; audit showed zero persistence code anywhere in the repo, so this ADR covers building the whole layer, not just identity)
- **Context:** Needed cross-session save persistence without an accounts system for a beta. The client already had a mature, versioned localStorage save format (`Game.SAVE_KEY`, `version: 1`, built in `saveGame()`/`loadSavedGame()` in `game.ts`) - the natural design was to mirror that shape server-side rather than inventing a normalized schema that would drift from it.
- **Decision:**
  - **Identity:** `lib/game/player-identity.ts` generates a `crypto.randomUUID()` on first boot, stored in `localStorage` under `ncrg:playerId`. No accounts, no login. Known limitation: clearing browser storage orphans the server-side save (acceptable for a beta; real auth is post-beta).
  - **Schema (Neon project "Metroidvania", `shy-tree-32297595`):** two tables only. `players(id, client_uuid UNIQUE, created_at)` and `run_state(player_id PRIMARY KEY, save_data JSONB, updated_at)` - one row per player, upserted on save (`ON CONFLICT (player_id) DO UPDATE`), matching the client's single-slot save design. `save_data` stores the client's save object verbatim (whatever shape `version: 1` currently is) rather than normalizing hp/coins/xp/etc. into columns - one shape to keep in sync, not two.
  - **Backend:** `python-service/db.py` (sync `psycopg` per-request connections against `DATABASE_URL_POOLED` - Neon's own PgBouncer already pools, no second pool on top). Three endpoints: `POST /players/register` (idempotent), `POST /save`, `GET /load`. Alembic (`python-service/alembic/`) migrates against `DATABASE_URL_DIRECT`; the initial schema was applied via the Neon MCP `prepare_database_migration`/`complete_database_migration` tools (reviewed on a temp branch first) and the matching Alembic revision was `stamp`ed rather than re-run.
  - **Frontend:** `lib/game/save-client.ts` (same direct-to-service pattern as `loot-client.ts`, ADR-008 - no Next.js proxy route, static export has no server at runtime). `game.ts`'s `loadSavedGame()` became async: tries the server first, falls back to localStorage on any failure/timeout (3s `AbortController`, same pattern as loot rolls). `saveGame()` still always writes localStorage first (unchanged, source of truth), then best-effort mirrors to the server. `HudSnapshot.saveSource` tracks `"python-service" | "client-fallback"` for a future degraded-mode indicator, mirroring the existing `lootSource` field.
- **Alternatives considered:**
  - Normalized SQL columns per save field (hp, coins, xp, ...) - rejected: doubles the places the save shape needs to change, no benefit at this scale.
  - `asyncpg` for the runtime driver (what `MASTER_BUILD_SPEC.md` originally suggested) - rejected: no prebuilt wheel for this machine's Python 3.14 on Windows, and building from source needs MSVC Build Tools that aren't installed. `psycopg[binary]==3.3.4` has prebuilt wheels and was a drop-in swap.
  - Accounts/login for the beta - deferred; adds real scope (password/OAuth handling) for a beta that just needs cross-session continuity.
- **Consequences:** Verified end-to-end against the real Neon project: two distinct UUIDs produce isolated `run_state` rows (SELECT pasted in `SESSION_LOG.md`), and a real browser boot (Playwright, not just curl) actually registers and lands a row. CORS (`ALLOWED_ORIGINS`, ADR-008) needed both `:3000` and `:3001` added - Next dev falls back to 3001 whenever 3000 is occupied, and the allowlist is exact-match. Deferred/out of scope here: rate limiting or abuse guards on the write endpoints (this service isn't publicly hosted yet - fine for local dev, must be addressed before any public deploy), and `meta_progression`/`settings` tables (nothing in the client persists those concepts yet - added if/when it does).

---

_Add new ADRs as decisions are made — including ones where you overrode an agent's suggestion. Those are often the most interesting entries for a reviewer._
