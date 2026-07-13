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

_Add new ADRs as decisions are made — including ones where you overrode an agent's suggestion. Those are often the most interesting entries for a reviewer._
