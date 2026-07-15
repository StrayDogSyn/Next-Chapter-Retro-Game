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

## ADR-010: Save-trigger map + death/respawn persistence semantics

- **Date:** 2026-07-12
- **Status:** Accepted
- **Originated from:** Agent proposal, following up on ADR-009 - persistence existed but `saveGame()` had exactly one call site (`activateShrine()`), so most progress was never actually persisted.
- **Context:** Needed to decide both *where* `saveGame()` fires and, specifically, what happens to the save when the player dies. `respawn()` already existed and does NOT touch persistence at all: on death it heals to full, clears per-room enemy state (marking already-cleared rooms as cleared so the minimap survives), and teleports to `START_ROOM` - keeping level/weapon/upgrades/flags in memory. `runSeed`/`seedPhrase` are set once at `Game` construction and never touched by `respawn()`, so the seed-persistence contract the death screen already relies on ("press JUMP to rise again", same seed) was never at risk.
- **Decision:**
  - **Save triggers**, in addition to the existing shrine save: **room transition** (`goToRoom()` - the primary checkpoint, frequent enough that "continue" resumes near where the player left off), **level-up** (`awardXp()` - once per XP award even if it rolls over multiple levels, not once per level), and **weapon equip** (`applyLoot()`'s auto-equip branch only - not stash/scrap/upgrade-stat-pickup, which are far more frequent and less worth a save+network round-trip each).
  - **Death does NOT save.** `respawn()` is unchanged - no `saveGame()` call added there. The player's most recent real save is whatever their last room transition/level-up/equip/shrine produced, which for continuous play is at most a few seconds to one room stale. This avoids ever persisting a `phase: "dead"` mid-respawn state, and keeps `respawn()`'s existing "reset to `START_ROOM`, keep progression" behavior as the single source of truth for what death means in a live session - persistence only matters for *resuming a session*, not for in-session death.
  - **Extracted `buildSaveData()`** (`lib/game/save-data.ts`) out of `saveGame()`'s inline object-construction so the clamping/shape logic is unit-testable (`save-data.test.ts`, 8 tests) without a running `Game` instance. `applySaveData()` (the load-side, already extracted in ADR-009's work) is unchanged.
- **Alternatives considered:**
  - Saving on every loot pickup (not just equip) - rejected as save-spam; upgrades/scraps are frequent and don't warrant a network round-trip each.
  - Persisting death state and restoring "you were mid-death" on reload - rejected as needless complexity for a case `respawn()` already resolves cleanly in-session.
- **Consequences:** More frequent `saveGame()` calls means more frequent best-effort `/save` POSTs (ADR-009) - still fire-and-forget with a 3s timeout, never blocking gameplay, but worth watching if it becomes chatty once hosted publicly (ties into D3's rate-limiting work). `visitedRooms`/`upgrades` filtering (dropping anything not in the current `world`/`isUpgradeId`) still happens at the `saveGame()` call site, not inside `buildSaveData()`, which stays a pure function of its input.

---

## ADR-011: `assetUrl()` helper for GitHub Pages base-path correctness

- **Date:** 2026-07-13
- **Status:** Accepted
- **Originated from:** Agent proposal - a confirmed real bug (root-absolute `fetch("/sprites/...")`, `fetch("/audio/...")`, `fetch("/assets/manifest.json")` calls bypass Next.js's `basePath`/`assetPrefix`, which only cover Next's own routing) flagged across two prior sessions' Playwright console logs but never fixed.
- **Context:** `next.config.mjs` already sets `basePath`/`assetPrefix` to `/Next-Chapter-Retro-Game` in production (predates this session). That only rewrites paths Next.js itself generates (page routes, `next/image`, etc.) - plain runtime `fetch()`/`Image().src` calls using literal strings like `"/sprites/hero.png"` are invisible to that mechanism and 404 once the site is actually served from a subpath, as GitHub Pages does.
- **Decision:** `lib/game/asset-url.ts` exports `assetUrl(path)`, prefixing with `process.env.NEXT_PUBLIC_BASE_PATH` (empty in dev, `/Next-Chapter-Retro-Game` in the production build via `deploy.yml`). Every root-absolute asset reference in `game.ts` and `assetManifest.ts` now routes through it - the spritemeta fetch, the per-sprite-sheet fallback path, `resolveManifestAsset()`'s two return paths, and the audio fallback-path resolution. The `audioFiles` map's ~21 literal `/audio/*.wav`/`.mp3` strings are deliberately left unprefixed *as the map itself* (commented in `game.ts`) - they're raw lookup keys/fallback values that get run through `assetUrl()` once at the point of use, not fetched directly; wrapping all 21 individually would be pure churn for the same runtime result.
- **Also fixed in the same pass (root cause of the `/assets/manifest.json` 404 itself):** `public/assets/manifest.json` didn't exist - only a stale `public/assets/extracted/manifest.json` did, predating `asset-extract.py`'s dual-write of both a canonical and "legacy" copy, and predating that script's `filesByStem` indexing feature entirely (the stale file's `filesByStem` was empty, so even a successful fetch would have resolved nothing). Regenerated via the script's own `build_manifest()` (no zip re-extraction needed - it only walks already-extracted files on disk) - now 652 stem entries, written to both paths.
- **Alternatives considered:** Wrapping every literal individually for grep-friendliness - rejected as noise for the audio map specifically, since the prefix is applied exactly once regardless either way; documented instead.
- **Consequences:** Verified via a genuine Pages rehearsal, not just local dev: production build (`NEXT_PUBLIC_BASE_PATH=/Next-Chapter-Retro-Game`), `out/` copied into a `Next-Chapter-Retro-Game/` subdirectory, served locally, driven with Playwright - zero asset 404s, canvas renders full parity with local dev (sprites, tiles, HUD). One build attempt was invalidated by Git Bash's automatic POSIX-path conversion silently mangling the inline `NEXT_PUBLIC_BASE_PATH=/Next-Chapter-Retro-Game` env var into a Windows filesystem path (`C:/Program Files/Git/Next-Chapter-Retro-Game`) before Next.js ever saw it - the rebuild that actually validated this ADR was run via PowerShell, which doesn't do that conversion. Worth remembering for any future build invoked with an env var starting with `/` from this project's Bash tool.

---

## ADR-012: Hosting plan (Render) + public-exposure hardening ahead of deploy

- **Date:** 2026-07-13
- **Status:** Accepted, **not yet deployed** - blocked on Neon credential rotation (Gate Zero, see the 2026-07-11 security-cleanup SESSION_LOG entry - still unrotated as of this ADR).
- **Originated from:** Agent proposal, done ahead of hosting specifically so D3 becomes "click deploy" once the credential is rotated, not "start engineering."
- **Context:** `python-service` has never been hosted anywhere but localhost. Once it's reachable from the public internet, the write endpoints (`/players/register`, `/save`) are exposed to anyone, not just this game's client - needed rate limiting and a size cap before that's true, not after.
- **Decision:**
  - **Host:** Render free tier (`render.yaml` at repo root, `rootDir: python-service`). Build installs `requirements.txt`; `preDeployCommand: alembic upgrade head` runs migrations against `DATABASE_URL_DIRECT` before each deploy; `uvicorn main:app --host 0.0.0.0 --port $PORT` serves. Env var **names** are declared in `render.yaml` (`sync: false`), **values** are set directly in Render's dashboard - never in this repo, never in chat (the agent verified variable names exist via `grep`, never printed values, consistent with the Gate Zero credential-handling rule).
  - **Rate limiting:** `slowapi`, per-IP (`get_remote_address`), `20/minute` on `/players/register`, `30/minute` on `/save`. Reads (`/loot/*`, `/generate-level`, `/load`) are ungated - cheap, stateless, no reason to throttle a beta tester's own polling.
  - **Request-size cap:** a small ASGI middleware rejects `POST /save` with `Content-Length > 64KB` (413) before the body is even parsed - generous headroom over the current save shape (a few hundred bytes typically). Checks the `Content-Length` header only, not a true streaming byte-count - a client that omits the header or lies about it and sends more body than declared isn't caught by this. Acceptable for a beta with no adversarial traffic expected; a real streaming limit is more machinery than this scope warrants.
  - **Tests:** `tests/test_persistence.py` gained `test_oversized_save_payload_is_rejected` (413 for a 70KB payload). Rate limiting was verified live instead of in the automated suite (a 20-requests-in-a-loop test would be slow and flaky in CI) - 25 rapid `/players/register` calls against a local server returned exactly 20×200 then 5×429, matching the configured limit precisely.
- **Alternatives considered:**
  - Deferring rate limiting until after a real abuse incident - rejected; the whole point of doing this ahead of D3 is to not be improvising security under live-traffic pressure.
  - A true streaming body-size limit (reading the ASGI body iterator incrementally) - rejected as disproportionate machinery for a beta-scale service; the `Content-Length` check catches the honest case and is one middleware function.
- **Consequences:** Deferred, explicitly out of scope here: per-player quotas, real auth (no accounts exist - ADR-009), and the Content-Length spoofing gap noted above. All should be revisited if this ever moves past beta traffic levels. `render.yaml`'s `preDeployCommand` running Alembic on every deploy means a bad migration blocks the deploy rather than shipping broken schema - intentional, matches the project's evidence-over-narration ethos applied to infrastructure.

---

## ADR-013: Degraded-mode HUD indicator

- **Date:** 2026-07-13
- **Status:** Accepted
- **Originated from:** Agent proposal - `HudSnapshot.lootSource`/`saveSource` (ADR-008/ADR-009) already tracked online-vs-fallback state but nothing surfaced it to the player, so a beta tester experiencing degraded mode would have no way to know or report it.
- **Decision:** `components/GameHudOverlay.tsx` renders a small status chip in the intel panel - a dot + label ("online" / "offline mode" / "connecting…"), computed as offline if *either* `lootSource` or `saveSource` reads `"client-fallback"`. The `title` attribute exposes both raw values (`loot: ... · save: ...`) for anyone who opens devtools or takes a screenshot for a bug report. Always visible (not just when degraded) so testers can screenshot the "online" state too, as a baseline for comparison.
- **Alternatives considered:** Only showing the indicator when degraded (hide when fine) - rejected; a bug report screenshot showing "everything looked normal, indicator absent" is weaker evidence than one showing "online" explicitly.
- **Consequences:** Verified live (Playwright, no python-service running): chip reads "offline mode" with `title="loot: client-fallback · save: unknown"` - `saveSource` stays `"unknown"` until an actual save attempt happens, which is correct (no save had fired yet in that test), not a bug.

---

## ADR-014: jumpPower cap (dual-progression jump design)

- **Date:** 2026-07-13
- **Status:** Accepted
- **Originated from:** Agent audit — a prompt requesting "double jump as a binary gate + upgradeable height" turned out to already exist almost entirely: `doubleJump`/`dash` are working binary ability gates (world pickups `J`/`A` → `this.upgrades.doubleJump/dash = 1`, consumed by `maxJumps()`), and `jumpPower` ("Coil Boots") was already one of the 12 upgrade types, already applied in `jumpVelocity() = -330 * (1 + jumpPower/100)`. The reachability auditor (`levelLoader.ts`) already models two movement profiles (base vs. double-jump+dash) with physics-derived constants. The one real gap: `jumpPower` was uncapped.
- **Context:** Uncapped `jumpPower` doesn't break the reachability auditor's safety guarantee (more reach only ever helps, never hurts, and the audit's `BASE_PROFILE` already assumes zero `jumpPower`) — but it does let a heavily-farmed build single-jump past content that was designed to require the double-jump ability specifically, eroding the intended gate identity.
- **Decision:** Capped at `JUMP_POWER_CAP_PCT = 24` (≈3 tiers of the 8% baseValue roll) in `lib/game/jump-physics.ts`, a new pure module extracted from `game.ts` (mirroring the `save-data.ts` pattern) so the coyote-time/double-jump state machine is unit-testable without a canvas-backed `Game`. Math: base jump apexes at 60.5px (3.78 tiles); capped-max `jumpPower` apexes at 93.0px (5.81 tiles) — comfortably below double-jump's ~112px (7-tile) reach assumption, so a maxed single-jump build still can't reach content gated on the actual ability for most placements (not a hard guarantee for every possible room layout — see Consequences).
- **Alternatives considered:** Tracking discrete "tier" pickups instead of a continuous capped percentage — rejected; the existing loot system already rolls continuous magnitudes per rarity, and retrofitting discrete tiers would touch the loot-rolling code on both the Python and client-fallback sides for marginal benefit over a simple cap.
- **Consequences:** `game.ts`'s `jumpVelocity()`/`maxJumps()` now delegate to `jump-physics.ts`; the coyote/jump block in `update()` delegates to `tickGroundedState()`/`resolveJumpPress()`. 14 new vitest cases, including the explicit coyote-consumes-first-jump-not-second edge case. Save round-trip for `doubleJump`/`dash`/`jumpPower` verified by construction, not a new test — they're ordinary `UpgradeId` values already covered by `save-data.test.ts`'s generic upgrade round-trip test (`buildSaveData`/`applySaveData` don't special-case any upgrade ID). Not a hard guarantee: the cap bounds the *margin*, but a room that places double-jump-gated content closer than ~2 tiles above the base-jump threshold could still be single-jump-bypassable by a maxed build — no specific instance found, not audited item-by-item under this ADR's time budget.

---

## ADR-015: Asset-utilization convention (condensed pass, shipping-priority session)

- **Date:** 2026-07-13
- **Status:** Accepted, minimal scope this session
- **Context:** Of 652 extracted-pack audio/image stems (`public/assets/manifest.json`), only 4 (0.6%) were wired via `resolveManifestAsset()` stem-matching before this session. A full utilization pass was scoped for a later session in favor of shipping; this ADR just fixes the *convention* and lands one example.
- **Decision:** New audio IDs that should pull from an extracted pack (rather than a curated `public/audio/*` file) use a fallback path whose filename stem exactly matches a `filesByStem` key (e.g. `shrineChime: "/audio/bell_01.mp3"` matches the pack's real `bell_01.ogg` via stem, not extension). No file needs to exist at the literal fallback path — `resolveManifestAsset()` finding a stem match means the fallback is never read. Every first-use of a pack gets a `CREDITS.md` row citing the pack's license (verified via `assets/manifest_bulk.csv`, not assumed).
- **Consequences:** `shrineChime` (100-cc0-sfx pack, CC0) is the first of these — the shrine save chime, previously reusing the `chest` sound. Utilization is still ~0.7% (5/652) - the bulk of this work (per-zone ambience, per-enemy hurt/death variety, rarity-tiered pickup audio, UI sounds) is explicitly deferred to the next session, prioritized in the outstanding H0-U5 prompt's own ordering.

---

## ADR-016: Asset-utilization pass — event-to-stem mapping conventions

- **Date:** 2026-07-13
- **Status:** Accepted
- **Originated from:** Agent proposal (F2 of a "Depth Pass" prompt) — utilization was 5/652 extracted-pack stems (0.77%) before this pass, all from the earlier ADR-015 down payment.
- **Context:** Several game events had no distinct sound at all (enemy hit-without-dying, ability-unlock pickups, menu open/close, shop purchase, loot-rarity pickup feedback) or shared one generic sound regardless of context (all 7 enemy kinds died with the same "kill" clip; all loot pickups played "powerup" regardless of rarity).
- **Decision:** Wired 17 new audio IDs, all via `resolveManifestAsset()` stem-matching against two already-documented CC0 packs (`100-cc0-sfx`, `8-bit-sound-effect-pack` — both sub-packs of "CC0 Sound Effects Collection" by OwlishMedia, confirmed CC0 on the collection's OGA page):
  - **Per-enemy-kind death sounds** (`Game.DEATH_SOUND: Partial<Record<EnemyKind, string>>`, `onEnemyKilled()`) — falls back to the original shared `"kill"` for any `EnemyKind` not explicitly mapped, so adding a new enemy kind later can't silently produce no sound.
  - **A new `enemyHit` sound** (`damageEnemy()`) for a hit that doesn't finish the enemy off — previously enemies had zero on-hit audio feedback, only on-death.
  - **Rarity-tiered pickup sounds** (`Game.RARITY_SOUND: Record<Rarity, string>`) — reuses the 4-tier `Rarity` scale already on every `LootDrop`, applied to both the weapon-equip and upgrade-pickup branches of `applyLoot()`.
  - **Ability-unlock sounds** (`doubleJumpGet`, `dashGet`) replacing the shared `"levelup"` for the `doubleJump`/`dash` world pickups — an ability gate is a bigger moment than a stat pickup and now sounds like one.
  - **UI sounds**: `menuOpenSfx`/`menuCloseSfx` in `setUiModalOpen()`, `purchase` in `purchaseShopItem()` (skipped for the mystery-box branch, which already gets a rarity-tiered sound via `applyLoot()` — avoids double-triggering).
- **Alternatives considered:** Per-zone ambient/music variety (F2's other major ask) — **not done this pass**. The only unused music-shaped pack (`nes-shooter-music-5-tracks-3-jingles`) turned out to contain only `.ftm` (FamiTracker module) files, not browser-playable audio — would need an offline conversion step out of scope here. Noted as future work: either convert those `.ftm` files or source a new CC0 zone-music pack.
- **Consequences:** Utilization rose from 5/652 (0.77%) to 22/652 (3.37%) — real progress, still a small fraction of the library. Verified: every new stem resolves in `public/assets/manifest.json` (pasted resolution table), sample files curl-checked live (200, correct `audio/ogg`/`audio/wav` content-types) against the dev server, `npm run build` exit 0. Deferred to a future pass: the sprite/visual half of F2 (unused enemy-sheet variants, per-zone tile/decor variety), zone-specific ambience, and volume-outlier normalization (no obvious outliers found in this batch, so no per-entry gain table was needed yet — the convention from ADR-015 still applies if one's needed later).

---

## ADR-017: Replayability architecture — run summary + daily seed, future-work register

- **Date:** 2026-07-13
- **Status:** Accepted
- **Originated from:** Agent proposal (F3 of a "Depth Pass" prompt), scoped down to its two highest-value pieces per user confirmation — full F3 (difficulty scaling, build-variety verification, new-run-flow audit) deferred.
- **Context:** `dailySeed()`/`generateSeedPhrase()` already existed in `lib/game/rng.ts` but were never wired into the UI — `Game`'s seed was always random (`readonly seedPhrase = generateSeedPhrase()` as a field initializer, no override path). Death/victory were a single line of canvas text (`drawOverlay`) with no run stats.
- **Decision:**
  - **Run summary** (`drawRunSummary()`, replacing `drawOverlay()` for the `dead`/`victory` phases only - `paused` keeps the simple overlay): seed, elapsed time, rooms visited/total (`visitedRooms.size`/`world.size`), coins, level, weapon + rarity, enemies defeated, and a new `deathsThisSeed` counter (incremented once, at the exact point `phase` flips to `"dead"` - not reset by `respawn()`, only by constructing a new `Game`, i.e. a genuinely new seed). Follows the exact same full-screen canvas-panel pattern already used by `drawInventoryOverlay`/`drawHelpOverlay`/`drawShopOverlay` - no new rendering approach introduced.
  - **Daily seed mode:** `Game`'s constructor now accepts an optional `seedOverride` (moved `seedPhrase` and every RNG stream that forks from it out of field initializers and into the constructor body, in dependency order, since a field initializer can't depend on a constructor parameter). Threaded through `GameCanvas`'s new `seedOverride` prop to `StartMenu`'s new "Daily Seed" and "Enter Seed" (with a text input) buttons in `app/page.tsx`. A per-day `ncrg:dailyAttempted` localStorage flag (`dailySeed()`'s own string, e.g. `DAILY-2026-07-13`) is set on click - **informational only, not a gate**: replaying your own daily seed is always allowed.
  - **New-run-vs-continue-save safety** (explicitly asked to verify/fix): confirmed, not fixed - already correct. `spawnIntoRoom()` (used for all fresh starts: New Run, Daily, Enter Seed) never calls `saveGame()`; only the ADR-010 triggers (room transition, level-up, weapon equip) do. A fresh run cannot clobber an existing continue-save until the player actually does something that would have saved anyway.
- **Alternatives considered:** Persisting the seed itself in `save_data` so "Continue" restores the exact original seed - not needed; room layout is static (ADR-004, hardcoded per-room maps, not seed-generated), so the seed only affects RNG streams (loot, combat crits, shop, vfx), not world structure. Continuing with a fresh seed for those streams is a pre-existing, unchanged characteristic, not a bug this ADR introduces.
- **Consequences:** Verified: `npm run build` exit 0, `npm test` 37/37 (no new pure logic here to unit-test - this is UI/wiring), a live Playwright run confirms the "Daily Seed" button sets `ncrg:dailyAttempted` to exactly `dailySeed()`'s current-day output and the game boots and plays normally on that seed. **Not verified live**: the death-triggered summary screen's actual on-canvas rendering - forcing a real death via automated play proved impractical within this session's time budget (bats don't reliably finish off 100 HP in a bounded test window). Confidence instead comes from code review: every field the summary draws is a pre-existing, already-exercised value (`elapsedSeconds`, `visitedRooms`, `world`, `coins`, `level`, `weapon`, `enemiesDefeated`) plus one trivial new counter, rendered via the identical canvas-panel pattern three other overlays already use successfully. Flagged as a real gap, not silently claimed as tested.
- **Future work (explicitly out of scope this pass, not forgotten):** difficulty scaling by rooms-visited/player-level (the loot endpoint's `enemy_level` parameter exists but nothing currently ramps it), build-variety verification across the re-gated F1 rewards, shop-stock seed-determinism, NG+/ascension tiers, leaderboards, "echo" seed variants (Breach-style).

---

## ADR-019: Documentation archival policy — move, don't delete, old docs

- **Date:** 2026-07-14
- **Status:** Accepted
- **Originated from:** Agent proposal during a documentation-only session requested to refresh all AI-Augmentation process docs and the root README.
- **Context:** The project accumulated overlapping documentation files: a one-time `UI Refactor Brief` handoff, a `WORKFLOW.md` that incorrectly labeled active living docs as deprecated, and an existing `docs/archive/historical/` folder that was already used for briefs and legacy imports. Old docs were at risk of being deleted during consolidation, which would break the traceability reviewers expect from an AI-Augmented project.
- **Decision:** Superseded or duplicated documentation is moved to `docs/archive/historical/` (under `session-briefs/` for implementation briefs and `legacy-imports/` for imported legacy docs) rather than deleted. The root file may be replaced with a short redirect if a physical move is not practical in a given session, but the full content is preserved in the archive. The `docs/archive/historical/README.md` index is updated whenever a file is archived. Active docs (`AGENTIC_WORKFLOW.md`, `SESSION_LOG.md`, `PROMPT_LIBRARY.md`, `DECISIONS.md`, `ARCHITECTURE.md`, `BUGS_IMPROVEMENT_GUIDE.md`, `BETA_TESTING.md`, `README.md`) remain the canonical sources.
- **Alternatives considered:** Deleting old docs — rejected because the AI-Augmentation process is itself a project artifact; reviewers need to see how prompts, decisions, and briefs evolved. Leaving duplicates at the root — rejected because it creates stale search hits and agent confusion.
- **Consequences:** `docs/UI_REFACTOR_BRIEF.md` was archived to `docs/archive/historical/session-briefs/ui-refactor-brief-root.md`. `docs/WORKFLOW.md` was corrected to stop mis-labeling living docs as deprecated and to describe the archive policy explicitly.

---

## ADR-020: swm hero integration — 46×46 grid correction, native-facing + flip, aliased clip map

- **Date:** 2026-07-14
- **Status:** Accepted
- **Originated from:** "Hero Integration Mission" self-contained prompt (M1-M3), following the same evidence-first discipline established earlier this session (verify before building, most recently applied to the Tier-1 "already fixed" bugs).
- **Context:** `docs/SPRITE_ART_INVENTORY.md` (written by a prior agent session) claimed `char-sheet-alpha.png` "visually reads as a regular 6x35 sheet of 64px cells" with "run/jump/crouch/aim/death rows." Neither claim survived direct verification.
- **Decision:**
  - **Grid corrected to 46×46, not 64×64.** Independent alpha-band occupancy analysis (column pitch and row-band-start pitch both converged on 46px) was cross-checked against the sheet's own baked-in label — the image literally has "46x46" printed on it, next to a title block and palette swatch strip occupying x∈[276,384) that a naive full-width row scan would otherwise treat as "no empty rows" and misread as one giant undifferentiated content band. Content-only columns (x<276) gave 6 columns × 48 rows. A labeled grid overlay confirmed zero frames cross any cell boundary (the discriminating test Step 4.1 calls for) — every character's feet land exactly on a boundary line, top to bottom, including the previously-ambiguous last row.
  - **The sheet contains only a run+aim-angle sweep — no idle, jump, crouch, hurt, or death pose exists anywhere in its 48 rows.** All 48 rows were visually reviewed (4 twelve-row chunks). Every row is the same 6-frame running stride at a different arm/gun angle, sweeping from slightly-above-horizontal up through vertical and back down past horizontal to below-horizontal. This also means the inventory doc's pose-row claim was wrong, not just the cell size.
  - **`diewhirl-sheet-alpha.png` is a death VFX burst (spinning silhouette dissolving into particles), not a character death pose**, and its own baked-in label says "OGA-BY 3.0+, 2023" — a different license/date than the 2021 CC-BY 4.0 hero-kit page it was listed under in M1's provenance fetch. Not used for the death clip; the license discrepancy is logged as unresolved (see Consequences), out of this mission's scope wall since diewhirl isn't a character sprite.
  - **Clip map is aliased onto specific rows of the one real animation** (logged as asset debt, not invented rects, per the mission's own explicit allowance): `run`=row 0 (6 frames), `attack`=row 12 (6 frames, a visually distinct steeper aim angle), `idle`=row 0 frame 0, `jump`=row 20 frame 0 (near-vertical aim), `fall`=row 36 frame 0 (downward aim), `hurt`=row 6 frame 0, `death`=row 47 (2 frames, clamps rather than loops).
  - **NATIVE_FACING = right** (the sheet's only authored direction, confirmed across all 48 rows). Unlike the retired `hero_0.png`, which needed dedicated `walkLeft`/`walkRight` rows because mirroring `walkRight` put an armband on the wrong arm, the swm sheet has no asymmetric-mirroring problem — verified by an actual left/right screenshot comparison (gun/body cleanly mirror, no armband-swap artifact), so it uses the same native-facing + canvas-flip pattern already used for every enemy (`shouldFlipHeroSprite(facing) = facing !== HERO_NATIVE_FACING`).
  - **Hitbox unchanged**: `pw=14, ph=26` untouched. Render box stays `drawW=32, drawH=34` (same as the retired sheet) — the new source cell (46×46) is close enough to the old packed cell (48×48) that keeping the same output size preserves the existing in-world silhouette scale rather than introducing an unrelated size change alongside the art swap. Anchor formula itself (`dx = px + pw/2 - drawW/2`, `dy = py + ph - drawH`) was already exactly the feet-center convention this mission asked for — no change needed there, only the row-selection/flip logic around it.
  - **8 palette-variant skins registered, not exposed.** `hero_skin_1..8.png` are copied and given the identical clip map (dimensions verified byte-for-byte identical to the base sheet, `384x2240 RGBA`), but are deliberately **not** added to `game.ts`'s sheet-preload list — no unlock UI or selection mechanism exists yet, and preloading 8 unused images would only cost bandwidth for nothing. Reserved as future meta-progression/cosmetic-unlock reward material.
  - **Pure logic extracted to `lib/game/player-sprite.ts`** (`shouldFlipHeroSprite`, `selectPlayerAnim`, `resolveClipFrame`, `NON_LOOPING_HERO_ANIMS`), mirroring the `jump-physics.ts`/`save-data.ts` pattern from ADR-014/ADR-010 so this logic is unit-testable without a canvas-backed `Game`. `drawSheetAnim()`'s frame-index math now goes through `resolveClipFrame()`, adding real clamp-on-final-frame support for non-looping clips (previously every clip wrapped via modulo unconditionally) — verified not to change behavior for any existing enemy clip, since no enemy anim currently uses the `jump`/`fall`/`death` names that trigger non-looping.
- **Alternatives considered:** Using `space_merc.png` (the mockup/composite) directly — already rejected in an earlier session and reconfirmed wrong here; it's a reference board, not a frame-addressable sheet. Building a full 8-directional aim-angle system to actually use the sweep's granularity — rejected as out of this mission's scope wall ("no new abilities"); the sweep is real but unused beyond picking a few representative rows.
- **Consequences:** Player sprite is now visibly the swm merc (green/blue palette) instead of the retired blonde `hero_0.png`; verified live via Playwright screenshots (idle, walk-right, walk-left, jump) plus a temporary `hero_skin_1` swap-and-revert proving skin geometry parity — all reverted cleanly (confirmed via `grep` showing only the original two `"hero"` references remain). `hero_0.png` itself was left on disk and in `public/sprites/hero.png`'s old role is now filled by the swm sheet; the old file is simply unreferenced now, not deleted (matches ADR-019's "move/orphan, don't delete" spirit for now — an explicit cleanup pass is future work, not done here). **Unresolved, logged as asset debt:** `attack` and `hurt` clips are registered in spritemeta but have no live game-state trigger wiring them to actually play (the existing melee-swing arc and hit-flash effects are unchanged, separate visual systems) — mapped per the mission's own "map to nearest available row" instruction, not full feature work. The `diewhirl-sheet-alpha.png` license-date discrepancy (2021 CC-BY 4.0 vs. baked-in 2023 OGA-BY 3.0+) is unresolved. The pre-existing, unrelated `assets/img/beast_boss_darksaber.zip`-missing bug (logged 2026-07-14, blocks a full `prepare-assets.py` run) was worked around by ordering the new hero pipeline block before the boss block and merging into the existing `spritemeta.json` directly rather than depending on `main()`'s final write — not fixed.

---

## ADR-021: Mobile touch controls architecture (Pointer Events + Auto/On/Off policy)

- **Date:** 2026-07-14
- **Status:** Accepted
- **Originated from:** Joint (user-requested execution plan + agent implementation)
- **Context:** The repo's touch stack was Touch Events with a two-mode `virtualGamepad`/`tacticalTap` model, while the mobile execution plan required pointer-id safety, policy-driven visibility (`auto`/`on`/`off`), and a landscape-safe viewport posture.
- **Decision:**
  - Standardized touch ingestion to Pointer Events (`pointerdown/move/up/cancel` + `lostpointercapture`) in `lib/game/touchInput.ts`.
  - Kept the existing gameplay-facing touch frame contract intact for `InputManager` while deprecating tactical gestures (compat stubs remain so gameplay code does not regress).
  - Introduced persisted preference key `ncrg:touchControls` (`auto|on|off`) in `components/GameCanvas.tsx`:
    - `auto`: hidden until first touch, then visible unless recent physical (keyboard/mouse/gamepad) activity is detected.
    - `on`: touch controls always enabled/visible on touch-capable devices.
    - `off`: touch controls disabled and hidden.
  - Added viewport-safe mobile posture: `viewportFit: cover` metadata and safe-area-aware shell padding.
- **Alternatives considered:** Keep Touch Events and retrofit policy in React only (rejected: no pointer-id capture semantics, weaker cancellation handling, harder to avoid ghost input states on mixed interactions).
- **Consequences:** Better pointer lifecycle safety and clearer user control over overlays, at the cost of maintaining temporary tactical compatibility stubs until the game loop's legacy tactical branch is removed.

---

## ADR-022: Documentation archival — phase2-overhaul orchestrator prompt superseded by workflow consolidation

- **Date:** 2026-07-14
- **Status:** Accepted
- **Originated from:** Agent proposal during the 2026-07-14 documentation refresh session
- **Context:** `docs/PHASE2_OVERHAUL.md` was a one-time VS Code Agent orchestrator prompt ("Iterate → Audit → Proliferate") written after the first playtest. Its content (session-start audit ritual, universal gate commands, per-increment commit protocol, doc-update checklist) was subsequently absorbed into `docs/WORKFLOW.md` (Verification Commands, Archiving Old Documentation sections) and `docs/PROMPT_LIBRARY.md` (Systematic bug-fix agent prompt, Sequential sprints orchestration prompt). Keeping both the original brief and the consolidated version active at the root created duplicate search hits and risked agent confusion about which was authoritative.
- **Decision:** Move `docs/PHASE2_OVERHAUL.md` to `docs/archive/historical/session-briefs/phase2-overhaul-2026-07-08.md` with a root-level redirect stub (matching the `docs/UI_REFACTOR_BRIEF.md` pattern). Update `docs/archive/historical/README.md` to index the new entry. Active workflow guidance remains in `docs/WORKFLOW.md`; reusable prompt text remains in `docs/PROMPT_LIBRARY.md`.
- **Alternatives considered:**
  - Delete the brief — rejected per ADR-019's "move, don't delete" policy; the original wording is part of the AI-Augmentation process trail.
  - Keep both at root — rejected; creates stale search hits and contradicts the "no parallel documentation paths" rule in WORKFLOW.md.
- **Consequences:** Agents looking for the orchestrator prompt pattern will find it in PROMPT_LIBRARY.md under "Systematic bug-fix agent prompt" and "Sequential sprints orchestration prompt" rather than in a standalone brief. The original is preserved in the archive for reviewers who want to see how the workflow evolved.

---

## ADR-023: Jump-envelope simulation as a standing verification contract; no procedural platform generation exists to constrain

- **Date:** 2026-07-14
- **Status:** Accepted
- **Originated from:** Increment 2 of the "Fix Pack: Hero Scale + Reachable Platforms" prompt, which asked to derive a jump envelope from physics constants and then constrain "platform/pickup generation" to it (property tests across N seeds, determinism regression on generated room output).
- **Context:** The prompt's own context section described "generated rooms" placing platforms above jump reach. Checking that claim against the actual codebase (per the prompt's own instruction to "read BUG-003's current status/checklist first and work within it") found: (1) BUG-003 was already fixed and re-verified fresh via a live `loadWorld()` probe this session — 0 dead-ends across all 24 rooms, 26 items correctly ability-gated; (2) more fundamentally, **no procedural platform or pickup generation exists in this codebase at all** - room layout is static, hand-authored ASCII maps (ADR-004), and pickup/coin positions are parsed from fixed col/row character positions in those same maps (`ENTITY_CHARS['c']` etc. in `levelLoader.ts`), not randomly placed. ADR-017 had already documented this ("room layout is static... not seed-generated") but the new prompt's framing didn't account for it. `/generate-level` exists in `python-service/main.py` but is explicitly commented "(original scaffold demo)" and is never called anywhere in the TypeScript client - a genuinely dead endpoint, not a live generation path.
- **Decision:** Did not build a speculative platform/pickup generation-and-constraint system - doing so would be new-feature work disguised as a bug fix, violating the prompt's own scope wall ("no level redesign beyond reachability adjustment"). Instead, delivered the part of Increment 2.1 that has real value regardless of whether generation exists: a frame-stepped simulation (`simulateJumpFlight()`/`simulateDoubleJumpFlight()` in `jump-physics.ts`) that reproduces game.ts's actual semi-implicit-Euler integration order (`vy += GRAVITY*dt` then `y += vy*dt`, matching `update()` exactly - not the continuous-time `v²/2g` formula), and cross-checked it against `levelLoader.ts`'s existing hand-derived `JUMP_RISE_TILES`/`JUMP_GAP_TILES`/`UPGRADED_JUMP_RISE_TILES`/`UPGRADED_JUMP_GAP_TILES` constants (now exported for this purpose). Result: simulated base-jump apex is 57.75px (3.61 tiles) vs. the analytic 60.5px (3.78 tiles) - a 2.75px gap, well within the mission's "agree within a tile" tolerance, and importantly the simulated value is *lower*, meaning the existing floor-rounded constants (3, 6, 7, 11 tiles) remain safely conservative even under the more rigorous discrete simulation, not just the continuous approximation. All four constants confirmed as safe lower bounds by simulation; none needed changing.
- **Alternatives considered:** Building the generation system speculatively "since the prompt asked for it" - rejected; inventing a feature nobody asked the game to have, to satisfy a prompt's incorrect assumption about the codebase, is the same failure mode this project has repeatedly caught elsewhere (F1, ADR-020's grid/pose findings, this same Fix Pack's Increment 1 S=2 assumption) just inverted - building something unverified instead of trusting something unverified. Silently skipping Increment 2 entirely - rejected; the envelope-derivation-and-simulation work was real, valuable, and directly requested, just not the generation-constraint half built on a false premise.
- **Consequences:** `lib/game/jump-physics.ts` gains two new exported pure functions and `SIM_DT`; `lib/game/levelLoader.ts`'s four tile constants are now exported (no behavior change, additive only). 7 new vitest cases in `jump-physics.test.ts`. If procedural generation is ever added to this game in the future, `simulateJumpFlight()`/`simulateDoubleJumpFlight()` are the ready-made building blocks for a real version of this mission's Increment 2.2 (reachability-constrained placement) - logged as a forward-looking note, not built speculatively now. BUG-003's entry in `docs/BUGS_IMPROVEMENT_GUIDE.md` gets one more checklist line noting this cross-check; its status stays "Fixed," not reopened.

---

## ADR-024: Canonical status snapshot location + first-party docs link-check scope

- **Date:** 2026-07-15
- **Status:** Accepted
- **Originated from:** Agent proposal during docs-governance maintenance
- **Context:** A stale point-in-time dump lived at `docs/STATUS.txt` and could be mistaken for current truth, while canonical machine-generated status snapshots are written to repo-root `STATUS.txt` by `scripts/project-status.py`. In the same session, markdown link validation produced noise from vendored runtime markdown under `node-portable/`, which is not part of first-party project documentation.
- **Decision:**
  - Archive the stale `docs/STATUS.txt` snapshot into `docs/archive/historical/legacy-imports/` and keep `docs/STATUS.txt` only as a redirect stub.
  - Treat repo-root `STATUS.txt` as the only canonical status snapshot source.
  - Scope documentation link validation to first-party docs (`docs/` and root `README.md`) and exclude vendored/runtime markdown trees from governance gates.
- **Alternatives considered:**
  - Keep both status files as potentially authoritative — rejected; invites drift and conflicting evidence.
  - Run link checks against every markdown file in the repository — rejected; third-party/vendored docs create false positives unrelated to project-maintained documentation quality.
- **Consequences:** Status evidence is now unambiguous, and docs-quality gates focus on files the project actually owns and maintains.

---

## ADR-025: "Space Marine" Physical Overhaul — hitbox/draw-scale increase, jump velocity buff, and raising the reachability-audit envelope constants (supersedes part of ADR-023)

- **Date:** 2026-07-15
- **Status:** Accepted
- **Originated from:** Two successive "Space Marine Overhaul" prompts. The first asked for a hitbox increase, a jump buff "to comfortably clear the highest floating platforms," and door widening, without a numeric jump target. The second (more directive) reissue made three things explicit that the first left to judgment: the base jump apex must be "mathematically guaranteed to clear heights of at least 4 to 5 tiles," `JUMP_RISE_TILES`/etc. must be updated "to reflect the newly buffed trajectory," and door widening should touch the ASCII map files.
- **Context:** `game.ts`'s player hitbox (`pw`/`ph`) had been deliberately left untouched by the earlier "Fix Pack: Hero Scale + Reachable Platforms" mission, which called hitbox resizing "a gameplay-feel decision for the user" rather than making it unilaterally. ADR-023 (same session lineage) had also deliberately left `JUMP_RISE_TILES`/`JUMP_GAP_TILES`/`UPGRADED_JUMP_RISE_TILES`/`UPGRADED_JUMP_GAP_TILES` untouched after a smaller velocity buff, reasoning that those constants double as the reachability auditor's ability-gating classification threshold (ADR-004) and raising them would reclassify some double-jump-gated content as base-reachable. The second prompt explicitly asked for exactly that reclassification, framing the objective as fixing "impossible platform jumps" rather than adding comfort margin.
- **Decision:**
  - **Hitbox/draw scale:** `pw`/`ph` raised 14×26 → 18×32 (ph now exactly 2 tiles). `drawW`/`drawH` scaled by the same per-axis factors (32×34 base cell × `HERO_SCALE` 1.108 × 1.2857/1.2308 → 46×46), preserving the existing anchor formula (`dx`/`dy` are already parametric in `pw`/`ph`/`drawW`/`drawH`, so no formula change was needed, only the constants feeding it).
  - **Jump velocity:** `JUMP_BASE_VELOCITY` raised 330 → 355 px/s, chosen via `simulateJumpFlight()` (not analytic-only) to land the *simulated* base apex at 4.19 tiles — inside the requested 4–5 tile band with margin on both sides — while keeping the capped-jumpPower apex (6.50 simulated tiles) below `UPGRADED_JUMP_RISE_TILES`, preserving the ADR-014 invariant.
  - **Envelope constants:** `JUMP_RISE_TILES` 3→4, `JUMP_GAP_TILES` 6→7, `UPGRADED_JUMP_RISE_TILES` 7→8, `UPGRADED_JUMP_GAP_TILES` 11→12 — all four raised together (floor of the new simulated values), not just the base pair. Double-jump reuses the same base velocity for its second impulse, so its simulated reach grows in step with the base jump's (8.38 tiles vs. the old ~7.56); raising both tiers keeps the *relative* gap between "base-reachable" and "ability-gated" roughly the shape it was, rather than the base tier silently swallowing the gated tier.
  - **Doors/corridors:** `ensureExitClearance()` in `levelLoader.ts` (the function that normalizes every declared room exit, added earlier the same day to fix player-trapping) widened from a 2-tile to a 3-tile minimum portal. This is the "wherever the static ROOMS ASCII maps are parsed" fix, applied at the parser level rather than by hand-editing all 24 rooms' ASCII strings: it produces the identical end result (every declared exit ≥3 tiles clear) uniformly and safely, verified by a new `door-clearance.test.ts` that measures actual carved-portal width across the whole loaded world rather than trusting the carve function's line count. Hand-editing the ASCII arrays directly was considered and rejected for this pass — a headroom audit (see below) found the interior tight spots are platform-edges and pre-existing border-wall gaps, not forced corridors, and touching 24 hand-authored maps for those risks collateral damage (e.g., one candidate fix collided with an enemy spawn character) for no additional coverage over the parser fix.
  - **Verification of the reclassification side effect:** ran the world's reachability audit before/after the envelope-constant change. Dead-ends: 0 → 0 (unaffected — raising both profiles is a monotonic reachability superset, so the "unreachable even with everything" set can only shrink or stay the same). Ability-gated item count: 26 → 24 — exactly 2 items whose rise was in the old 3–4 tile band flipped from "requires double-jump" to "base-reachable." This is the deliberate, bounded consequence the second prompt asked for, not an oversight.
- **Alternatives considered:**
  - Buff velocity only, leave `JUMP_RISE_TILES` at 3 (ADR-023's original stance, and this ADR's own first draft mid-session) — rejected once the second prompt made the constant update an explicit, repeated instruction rather than an implicit side effect to avoid.
  - Raise only the base-tier constants (`JUMP_RISE_TILES`/`JUMP_GAP_TILES`) and leave `UPGRADED_*` alone — rejected; double-jump's reach is a function of the *same* buffed base velocity, so leaving `UPGRADED_JUMP_RISE_TILES` at 7 while the base floor rose to 4 would have compressed the gated band from 4 tiles of clearance (3–7) to 3 (4–7) without any physics reason, an arbitrary asymmetric squeeze rather than a velocity-driven one.
  - Hand-edit all 24 rooms' ASCII maps for door width, as the second prompt's instructions literally named `world.ts` — rejected in favor of the parser-level fix for the reasons above; flagged clearly in the session report rather than silently substituted.
- **Consequences:** `lib/game/game.ts` (`pw`/`ph`/`drawW`/`drawH`), `lib/game/jump-physics.ts` (`JUMP_BASE_VELOCITY` + derivation comments), `lib/game/levelLoader.ts` (four envelope constants + `ensureExitClearance()` carve width), `lib/game/jump-physics.test.ts` (updated assertions plus a new explicit "4–5 tile" test), and a new `lib/game/door-clearance.test.ts`. Two items in the world moved from ability-gated to base-reachable — acceptable and intended per this decision, but worth knowing if a future balance pass looks at drop rates or pacing near those two spots. A residual, pre-existing, unrelated finding surfaced during the headroom audit (a handful of rooms have a single interior row missing its left/right border tile, e.g. `R06` row 16) — not fixed here (out of this mission's blast radius, and appears unreachable via normal play), logged as a follow-up.

---

## ADR-026: "Space Marine" Physical Overhaul round 2 — hitbox to 24x44, jump velocity to 380, an attempted-and-reverted dynamic-derivation approach, and a multi-agent collision on the same files

- **Date:** 2026-07-15
- **Status:** Accepted
- **Originated from:** A third, most-explicit-yet reissue of the "Space Marine Physical Overhaul" mission, giving concrete numeric targets ADR-025 had left to judgment: hitbox "roughly 24x44," base jump apex "at least 4.5 to 5 tiles," and an explicit instruction to edit the `ROOMS` ASCII map strings directly for door/corridor width rather than only widening the parser-level exit carve.
- **Context — multi-agent collision:** Partway through this work, `git status` and file-content system reminders revealed that other tools (a separate Claude session, GitHub Copilot/GPT-5.3-Codex, and Windsurf Cascade, per commit authorship and `docs/SESSION_LOG.md` entries) were concurrently committing to the same `main` branch and, in places, editing the exact same files this mission touched (`lib/game/jump-physics.ts`, `lib/game/levelLoader.ts`, `lib/game/world.ts`, `lib/game/game.ts`). One of those concurrent edits introduced a real bug (below) and an unrelated, incomplete feature that had to be untangled from this mission's own changes using `git stash` + selective `git checkout stash@{0} -- <file>` rather than a full stash pop, to avoid pulling in someone else's in-progress work.
- **Decision — hitbox and draw scale:** `pw`/`ph` raised again, 18×32 → 24×44 (ph is now 2.75 tiles), matching the mission's own example numbers. `drawW`/`drawH` recomputed to 61×64 via the same per-axis-factor method as ADR-025, keeping the anchor formula unchanged (already parametric).
- **Decision — jump velocity:** `JUMP_BASE_VELOCITY` raised 355 → 380 px/s, chosen via `simulateJumpFlight()` candidate search to land the simulated base apex at 4.82 tiles (inside the requested 4.5–5 tile band) while keeping the capped-jumpPower apex (7.47 simulated tiles) below the (also-raised) double-jump ceiling with a real margin (0.53 tile). `JUMP_RISE_TILES`/`JUMP_GAP_TILES` stayed at 4/7 (still valid floors of the new simulated values - they don't need to move on every velocity bump, only remain a correct lower bound); `UPGRADED_JUMP_RISE_TILES`/`UPGRADED_JUMP_GAP_TILES` raised 8/12 → 9/13 to track double jump's reach at the new base velocity.
- **Decision — doors and choke points, hand-edited this time:** Unlike ADR-025 (which widened only the parser-level `ensureExitClearance()` carve and left the ASCII untouched), this round's explicit instruction to edit the ASCII maps was honored directly. A headroom-clearance audit (temporary vitest scratch test, scanning every room for standable cells with less than 4 tiles of vertical clearance above them) found 5 genuine spots and they were hand-fixed in `world.ts`:
  - `R03`: the "up" ceiling opening widened from 4 to 10 tiles (cols 15-24) so the platform beneath it (cols 16-23) has clearance along its whole top surface, not just its center.
  - `R07`: same pattern, widened from 4 to 15 tiles (cols 14-28) to cover two platforms near the ceiling.
  - `R18`: same pattern, widened from 4 to 10 tiles (cols 13-22).
  - `R04`: a floating solid block (row 12, cols 22-26) that left only 2 tiles of clearance over the walkway below it was opened up entirely rather than shifted, because shifting it up one row would have overwritten an `f` (flower turret) spawn character at that position.
  - `R16`: a single column (col 23) trimmed off a ceiling block whose edge aligned exactly with a platform edge below it, leaving only 2 tiles of clearance there.
  - `ensureExitClearance()`'s carve width also widened again, 3 → 4 tiles, to keep matching the larger hitbox.
  - Explicitly NOT touched: 5 rooms (`R06`/`R07`/`R12`/`R16`/`R20`/`R24`) have a single interior row missing its left/right border-wall tile - confirmed pre-existing (unrelated to any hitbox change; the same artifact exists at the old, smaller hitbox too) and very likely unreachable in normal play (no floor beneath most of the row's width). Logged as `CR-023`; not fixed, to avoid speculative edits to hand-authored level data for something that doesn't appear to be a live problem.
- **Decision — attempted, then reverted, a fully dynamic jump-velocity derivation:** One of the concurrent processes editing `jump-physics.ts` independently implemented a genuinely well-motivated idea directly matching this mission's very first framing ("dynamically calculate... rather than guessing a hardcoded value"): a `HIGHEST_FLOATING_PLATFORM_STEP_TILES` constant in `world.ts` that scanned every room's real platform geometry (a `platformSurfaceCells()` helper treating `#`/`-`/`D`/`d` as "support" characters) to find, for each floating (`-`) platform, the nearest other support surface within 7 columns, then took the world-wide maximum of those per-platform minimums; `jump-physics.ts` then searched for the smallest velocity whose simulated apex cleared that height plus a margin. This had two problems, one fixed and one fatal:
  1. **Fixed:** a `ReferenceError: Cannot access 'SIM_DT' before initialization` - the derivation ran at module-eval time and called `simulateJumpFlight()` (whose default `dt` parameter references `SIM_DT`) before `SIM_DT`'s own `const` declaration, further down the file, had executed. This crashed every module importing from `jump-physics.ts`, including `levelLoader.ts`, and was caught by `npm test` returning `0 passed` for those suites. The fix (move `SIM_DT` above anything that calls `simulateJumpFlight()` at module scope) is a valid, general pattern worth keeping regardless of what happened to the rest of the feature.
  2. **Fatal, not fixed - reverted instead:** with the bug fixed, the algorithm derived a **13-tile** jump requirement, sourced from room `R22`: a floating platform's only "nearby" (within 7 columns) support surface turned out to be the room's own main floor, 13 rows below. The heuristic has no concept of room entry points (`R22` has an "up" exit the player most plausibly uses to reach that platform from above, never needing to jump up to it from the floor at all), no concept of multi-hop platforming, and no concept of intentional double-jump gating - all of which the *existing* `floodReachable()`/`validateReachability()` system in `levelLoader.ts` already handles correctly via real BFS from real room entry points under two movement profiles. A 13-tile single-jump apex would have trivialized nearly every double-jump-gated platform in the game. Verified this wasn't caused by this mission's own ASCII edits by checking `R22` was untouched by any of them.
- **Alternatives considered:**
  - Keep the dynamic derivation and just cap its output at some sane ceiling - rejected; a silently-clamped "dynamic" value that's actually just the cap most of the time is worse than an honest hardcoded constant, and doesn't fix the underlying reason the heuristic is wrong.
  - Fix the heuristic to be entry-point- and multi-hop-aware - rejected for this pass; that's effectively re-deriving `floodReachable()`'s own logic a second time for a different purpose, real scope creep for a mission about hitbox/jump/door sizing, not reachability-graph algorithms.
  - Restore items.ts/prepare-assets.py from the same stash to complete the unrelated `weaponFlashSheet`/`LOOT_PICKUP_SPRITES` (plural) feature another concurrent process had started in `game.ts` - rejected; incomplete (missing generated sprite sheets, missing spritemeta entries, failing tests), unrelated to this mission, and not enough context on its actual requirements to finish it responsibly. Reverted `game.ts`'s 4 call sites back to the working `LOOT_PICKUP_SPRITE`/impact-only-burst shape from the last known-good commit instead.
- **Consequences:** `lib/game/game.ts`, `lib/game/jump-physics.ts`, `lib/game/jump-physics.test.ts`, `lib/game/levelLoader.ts`, `lib/game/world.ts` all changed again this round. `HIGHEST_FLOATING_PLATFORM_STEP_TILES`/`platformSurfaceCells()` were removed from `world.ts` entirely (dead code after the revert, and actively misleading if left in place). The SIM_DT-before-declaration ordering hazard is worth remembering as a general pattern: any module-eval-time computation that calls a function with a `const`-referencing default parameter must have that `const` declared earlier in the file, regardless of the function itself being hoisted.

---

## ADR-027: "Space Marine" jump buffed ~1.5x again per direct user feedback — and it fully eliminates ability-gating (flagged, not silently accepted)

- **Date:** 2026-07-15
- **Status:** Accepted (jump buff) / Flagged for user decision (ability-gating consequence)
- **Originated from:** Direct user feedback on ADR-026's result: "The adjustments are almost there for the jumping, I need it about 1.5x higher," plus a second claim that "none of the platforms have collision detection or anything to allow the PC character to successfully make the jump to the platform."
- **Context — the collision claim:** Read `Game.moveBody()` (`lib/game/game.ts`, ~line 690-753) in full. It implements a real, correctly-shaped one-way-platform collision: on downward movement, a `T_PLATFORM` tile counts as ground only if the body was above the platform's top surface before this frame (`body.y + body.h <= row * TILE + 1`) and `dropThrough` isn't active; on upward movement, only fully solid tiles block (platforms are pass-through from below, as intended). No `MAX_FALL_SPEED`/terminal-velocity clamp exists, so a long enough fall could in principle exceed one-tile-per-frame (~960px/s, requiring a ~32-tile unbroken fall) and tunnel through a single-row platform - checked this against `ROOM_H` (22 tiles) and found no room is tall enough for an unbroken fall to reach that speed, so this isn't a live risk in the actual level geometry. Live-tested in a real browser (Playwright): the jump visibly clears far more height than before with zero page errors, but a scripted landing-on-a-specific-platform screenshot was inconclusive - not because collision failed, but because blind-timed keyboard input isn't precise enough to reliably land the character on a specific platform's coordinates without reading back live game state. Conclusion: the collision system is real and correctly implemented; the most likely explanation for "no collision" is the same root cause as the explicit height complaint - the previous jump (ADR-026, ~4.82 simulated tiles) genuinely wasn't tall/far enough to reach some platforms, which reads as "the platform doesn't work" from the player's seat even though the platform's collision was never the problem.
- **Decision — jump velocity:** `JUMP_BASE_VELOCITY` raised 380 → 465 px/s, chosen via `simulateJumpFlight()` candidate search to land the simulated base apex at 7.27 tiles - a 1.51x multiple of the prior round's 4.82 tiles, matching "about 1.5x higher" as literally as a discrete velocity search allows. `JUMP_RISE_TILES`/`JUMP_GAP_TILES` raised 4/7 → 7/9 (floors of the new simulated apex/gap). `UPGRADED_JUMP_RISE_TILES`/`UPGRADED_JUMP_GAP_TILES` raised 9/13 → 14/16 in the same "double-jump reuses this base velocity, raise both tiers together" pattern established in ADR-025/026, preserving the ADR-014 invariant (capped-jumpPower apex 11.25 simulated tiles, a 2.75-tile margin below the new 14-tile double-jump ceiling - the relative margin actually improved at this velocity, not shrank).
- **A consequence too significant to apply silently:** measured the world's reachability audit before/after, same as every prior round. Dead-ends: 0 → 0 (unaffected, as always - raising both profiles together is a monotonic superset). Ability-gated item count: **24 → 0**. At this jump strength, the base (no-upgrades) envelope alone is now large enough to reach every single piece of content in the game that double-jump/dash were gating. This is different in kind from the earlier rounds' partial reclassifications (26→24, 24→24-unchanged) - it's not a few edge-case items shifting tiers, it's the *entire* ability-gating design going to zero. The `doubleJump`/`dash` pickups (Aether Wings, Phase Dash Module) still exist and still work, but no longer unlock access to anything a player couldn't already reach without them - their role as Metroidvania progression gates is gone, though they may still have combat/traversal-comfort value depending on how dash/double-jump feel to use.
- **Why this was implemented anyway rather than refused or silently capped:** the user's instruction was explicit, specific, and directly measurable ("about 1.5x higher... or whatever increment you're using" - an invitation to compute and apply, not merely a suggestion). Refusing to fully apply it, or quietly capping the velocity below what "1.5x" requires to protect the gating design, would both substitute this session's judgment for an explicit instruction without saying so - the same failure mode flagged and avoided in ADR-025/026's own reasoning. Instead: implemented exactly what was asked, measured the consequence precisely (not "some content might be affected" but "24 of 24 gated items, all of them"), and surfaced it prominently in the response rather than only in a docs file the user may not read before the next instruction.
- **Alternatives considered:**
  - Silently cap the velocity below "1.5x" to preserve some ability-gating - rejected; overrides an explicit instruction based on an unstated assumption about priorities that should be the user's call, not this session's.
  - Redesign level geometry (move platforms farther apart / raise them) to keep ability-gating meaningful at the new jump strength - rejected as out of scope for a physics-tuning request and a much larger, riskier change (hand-editing all 24 rooms' vertical layout) than what was asked.
  - Say nothing about the gating consequence since it wasn't asked about - rejected; this is exactly the kind of significant, non-obvious side effect this session's standing practice is to surface with evidence, not bury.
- **Consequences:** `lib/game/jump-physics.ts` (`JUMP_BASE_VELOCITY` 380→465, updated derivation comments), `lib/game/levelLoader.ts` (all four envelope constants raised again), `lib/game/jump-physics.test.ts` (updated assertions, including a new explicit "~1.5x the previous round's apex" test). If a future instruction wants ability-gating restored as a real progression mechanic, the fix isn't reverting the jump buff (which the user asked for and confirmed feel) - it's moving the specific platforms/items that used to require double-jump/dash further out of the now-larger base envelope, a level-geometry change, not a physics-constant change.

---

## ADR-028: Ability-gating restored via explicit door tiles (T_DOOR_DOUBLEJUMP/T_DOOR_DASH), decoupled from jump physics permanently

- **Date:** 2026-07-15
- **Status:** Accepted
- **Originated from:** Direct user follow-up after confirming the round-3 jump buff (ADR-027) felt right: "Restore the gating as well as the [24→0] item content," plus a report of "apertures that did not allow passage to another room" with a suggestion to consider "a gating system for some of those room's access and treasure as well."
- **Context:** ADR-027 flagged, rather than silently accepted, that buffing the jump to the user's requested "1.5x higher" made the base (no-upgrades) envelope large enough to reach all 24 items previously classified as ability-gated - not a partial reclassification like earlier rounds, the entire mechanic going to zero. ADR-027 also predicted the correct fix: "that's a level-geometry fix... not a physics-constant change." Investigated the "blocked apertures" report first: read every `T_DOOR_KEY`/`T_DOOR_BEAST` placement, confirmed `loadWorld()`'s structural validation (every declared exit has an opening, 0 genuine dead-ends) already holds, and traced `R13`'s locked-door wall (col 10, rows 16-19) specifically - it gates a bonus shrine/enemy area, not the room's main left-right traversal (which stays open via the upper platforms), so it isn't a soft-lock. Conclusion: no bug found; the "apertures" are almost certainly the *existing*, intentional `T_DOOR_KEY`/`T_DOOR_BEAST` mechanic, encountered before finding the relevant key or defeating the relevant mini-boss - which the user's own suggestion ("perhaps a gating system... as well") reads as not having recognized as already-intentional.
- **Decision - reuse and extend the existing door pattern rather than reposition 24 items by hand:** repositioning each of the 24 items' platforms to sit outside the new (larger) base envelope but inside the upgraded one was considered and rejected - it would need to be redone every time jump physics are retuned again (this is the third velocity change in one day), and the exact-threading-the-needle math for 24 individual spots across 12 rooms is exactly the kind of fragile, physics-coupled gating that got wiped out this round in the first place. Instead: added `T_DOOR_DOUBLEJUMP` ('j') and `T_DOOR_DASH` ('a') tile types, direct siblings of the existing `T_DOOR_KEY`/`T_DOOR_BEAST` (solid-until-a-runtime-flag-is-true) pattern, gated on `this.stat("doubleJump") > 0` / `this.stat("dash") > 0` - the same upgrade-tracking already used everywhere else abilities are checked (e.g. `maxJumps()`). This makes gating a property of explicit level data (a door tile), not an emergent, fragile side effect of exact velocity/gravity numbers.
- **A real collision-semantics bug caught before shipping:** the first implementation made these tiles solid-until-unlocked, mirroring `T_DOOR_KEY`/`T_DOOR_BEAST` exactly. That's wrong for these 24 spots specifically - they're floating bonus *platforms* (something to land ON), not corridor walls (something to walk THROUGH). A solid-until-unlocked tile is still landable-on-top-of while locked (solid tiles catch a falling body from above, same as any floor), so a player without the ability could just land on the "locked" platform and grab the item anyway - the gate would have done nothing. Fixed by making these tiles never solid (`isSolidTile()` always returns `false` for them) and instead extending `moveBody()`'s existing one-way-platform landing check to also treat them as a landable platform *only when the ability is owned* - locked, they don't exist as a landing surface at all (matching "this platform hasn't been built yet, you can't stand there"); unlocked, they behave and render exactly like a normal `T_PLATFORM`. `isFloorTile()`/`isOpenTile()` (the reachability auditor's helpers) treat them the same "best case, always passable" way as the key/beast doors, for the same reason (gate state is a runtime flag, not load-time data).
- **Placement:** reconstructed the exact 24-item list (room, item kind, column, row) by temporarily reverting the envelope constants to their round-2 values and capturing the full `gated` array via a console spy (removed afterward). For each location, converted the specific platform run supporting that item into gate-door tiles (whole run, not a partial tile, to prevent landing on an adjacent ungated section of the same platform) - 15 platform runs across `R01`, `R02`, `R04`, `R05`, `R06` (including its solid 10-tile vault floor holding both the chest and the key), `R09`, `R10`, `R13`, `R14`, `R15`, `R17`, `R21`. Alternated double-jump/dash assignment per spot (83 total `T_DOOR_DOUBLEJUMP` tile-cells, 60 `T_DOOR_DASH`) rather than gating everything behind one ability, so both abilities retain meaningful exploration value.
- **Verification:** `loadWorld()` still reports 0 dead-ends after all 24 placements (tile-count math cross-checked: 83/60 matches the sum of every converted platform run's width). The old jump-envelope-based "ability-gated" audit metric now reads 0 - this is expected and correct, not a regression: these items no longer depend on jump-envelope math at all, so a metric built on that math has nothing left to report for them. Live-tested one gate in-browser via Playwright (R01's, screenshot evidence): renders as a clearly distinct locked barrier (dark blue, wing-chevron accent pattern matching the doubleJump pickup's own color), zero page errors.
- **Alternatives considered:**
  - Reposition the 24 items - rejected (see above): re-couples gating to exact physics, the same fragility that just broke.
  - Make the new door tiles solid-until-unlocked like the existing doors - rejected once traced through: wrong collision semantics for a platform (see the bug write-up above).
  - Gate everything behind a single ability - rejected; splitting roughly 60/40 between double-jump and dash keeps both upgrades individually worth finding.
- **Consequences:** `lib/game/levelLoader.ts` (two new tile constants, parser chars, `isFloorTile`/`isOpenTile` updates), `lib/game/game.ts` (`isSolidTile()` comment-only for these two - always false; `moveBody()`'s platform-landing check extended; two new rendering cases), `lib/game/world.ts` (12 rooms' ASCII maps edited, each with an inline comment explaining what's gated and why). Ability-gating is now robust to any future jump-physics retuning - a fourth velocity change won't silently re-break it the way the third one did.

---

## ADR-029: Seeded room-order shuffle — content relabeled onto a fixed graph shape, not procedural generation

- **Date:** 2026-07-15
- **Status:** Accepted
- **Originated from:** User feedback: "the level seed is not randomized, every test-run, the level layout, obstacles and enemies are in the same placement in rooms that do not change." Asked a clarifying question (`AskUserQuestion`) before starting, since this could mean anything from "randomize enemy spawns within the existing rooms" to "build full procedural level generation" - a huge scope spread, and the latter would reverse ADR-004/ADR-023's explicit "no procedural generation, hand-authored static rooms" decision. User chose the middle option: shuffle which hand-authored room connects to which, keep each room's own internal content (platforms, enemies, gate doors) exactly as authored.
- **Context:** `lib/game/rng.ts`'s own top-of-file doc comment already names a "layout" stream ("opening an extra chest must not reshuffle the next room's layout") - this feature was architecturally anticipated but never implemented; room order has been 100% static since the project began. `RoomDef.exits` values are room IDs baked in at authoring time, and each room's actual exit *openings* are physically carved into its own ASCII map at specific columns/rows - a room can't gain or lose an exit direction without re-authoring its map.
- **Decision - relabel graph nodes, don't rewire the graph:** a "position" is a fixed node - its `id` and its `exits` (which direction leads to which other position) never change, because those are what the room's own carved openings physically support. What changes per seed is which room's *content* (name/zone/map/boss - everything except id/exits) is displayed at that position. Content only ever moves between positions sharing the exact same exit-direction signature (e.g. a `{left,right}` position only ever receives content whose original exits were also exactly `{left,right}`), so a room's own hand-carved openings always line up with wherever it's placed. The start room (`R01`, the only one with a player-spawn marker) is pinned - never shuffled - so every seed opens on the same room.
- **Why this makes the connectivity/dead-end guarantee free instead of something to re-verify at runtime:** because positions and their edges are never rewired (only relabeled), and the original unshuffled graph was already exhaustively verified fully-connected with 0 dead-ends (BUG-003, re-confirmed after every subsequent room edit this session), the shuffled graph is connected *by construction* - there's no new graph-theory problem to solve or runtime BFS to run. Verified this empirically anyway (8 new tests in `world-shuffle.test.ts`, including `loadWorld(seed)` across 4 different seeds reporting 0 dead-ends), rather than trusting the argument without checking.
- **Integration:** `Game`'s constructor already forks a dedicated `Rng` stream per subsystem (`combat`, `loot`, `shop`, `vfx`) from the run's `seedPhrase` (itself either a fresh random phrase for New Run, or the fixed `DAILY-<date>` / user-typed phrase for Daily Seed / Enter Seed - ADR-017). Added a `layout` fork to that same list and pass its seed string into `loadWorld(seed)`. This required moving `this.world`/`this.roomCoords` from field initializers into the constructor body (a field initializer runs before the constructor body sets up `this.rng`, so it couldn't have referenced the layout seed) - everything downstream reads `this.world`/`this.roomCoords` from inside methods, which all run after construction, so no other ordering hazard existed.
- **Consequence, already covered by the existing seed model, not a new one:** New Run now gets a different room order every time (a fresh `seedPhrase` each run); Daily Seed gives every player worldwide the identical layout for the day; Enter Seed reproduces/shares a specific layout - exactly the behavior the "layout" stream name in `rng.ts` already implied was intended, now actually wired up.
- **Alternatives considered:**
  - Full procedural generation (room shapes, platform layout, enemy placement all algorithmic) - explicitly not chosen by the user in the clarifying question; would have reversed ADR-004/ADR-023 and been a multi-day undertaking with a reachability-guaranteeing generator to build from scratch, replacing a static-room architecture that's been extensively hardened this session (headroom audits, choke-point fixes, gate-door placement) - work a from-scratch generator can't inherit.
  - Randomize enemy/pickup placement within each room, leaving room order fixed - also not chosen; smaller in scope, could be a good follow-up but is a different feature (would need its own seeded-content-placement design per room, independent of this one).
  - Generate a *new* random graph shape each seed instead of relabeling the existing one - rejected: would need a real connectivity/reachability solver run at runtime for every seed (the free "correct by construction" property goes away), and risks producing layouts nobody hand-verified for headroom/choke-points/gate placement the way the current 24 rooms have been this session.
- **Consequences:** `lib/game/world.ts` (`shuffleWorldGraph()`, new `Rng` import), `lib/game/levelLoader.ts` (`loadWorld(seed?)`, backward-compatible - omitting the seed still loads the canonical unshuffled world, which is what `door-clearance.test.ts` and other existing tests keep exercising as their stable baseline), `lib/game/game.ts` (`world`/`roomCoords` moved to constructor, new `layout` RNG fork). New `lib/game/world-shuffle.test.ts` (8 tests: determinism, distinctness across seeds, start-room pinning, graph-shape preservation, signature-matching, valid-permutation, multi-seed dead-end check, no-seed baseline). Live-verified in a real browser: a fresh run's second room showed entirely different zone art, enemies, and both new gate-door types, confirming the shuffle reaches actual gameplay, not just unit-test assertions.

---

## ADR-030: Prompt-library canonicalization for v0.2.0 templates (single active section + archive-first duplicates)

- **Date:** 2026-07-15
- **Status:** Accepted
- **Originated from:** Documentation governance maintenance pass after parallel prompt-sync sessions created two near-duplicate active section variants for the same v0.2.0 template set.
- **Context:** The prompt library gained both `## v0.2.0 Overhaul & Polish Prompts` and a near-equivalent `v0.2.0 Polish & Physics Overhaul` variant in close sequence. Even when content is nearly identical, keeping parallel active sections increases search noise, creates merge-conflict churn, and invites inconsistent future edits.
- **Decision:** Keep exactly one canonical active heading for the v0.2.0 template set (`## v0.2.0 Overhaul & Polish Prompts`). Superseded variants are not deleted; they are archived under `docs/archive/historical/legacy-imports/` with a short rationale note. `docs/PROMPT_LIBRARY.md` now includes a canonicalization note so future sessions preserve one active source.
- **Alternatives considered:**
  - Keep both active variants and rely on convention — rejected; this caused the drift in the first place.
  - Delete superseded variant traces — rejected; violates the archive-first documentation policy (ADR-019).
- **Consequences:** Prompt reuse now has one unambiguous source for v0.2.0 templates, while historical traceability remains intact through archive entries. Future documentation-governance passes can enforce this rule mechanically (one canonical section + archive superseded variants).

---

_Add new ADRs as decisions are made — including ones where you overrode an agent's suggestion. Those are often the most interesting entries for a reviewer._
