# Session Log

Full chronological record of every AI-paired session on this project. The summary table in [AGENTIC_WORKFLOW.md](AGENTIC_WORKFLOW.md) shows the 3-5 most recent — this file is the complete archive.

**How to add an entry:** copy the template below, fill it in immediately after a session while it's fresh, don't batch these up.

---

## Template

```markdown
### YYYY-MM-DD — [Short session title]

- **Tool used:** [e.g. Copilot cloud agent, Claude, ChatGPT]
- **Goal:** What you asked the agent to do
- **Prompt summary:** One or two sentences (link to full prompt in PROMPT_LIBRARY.md if reusable)
- **What the agent produced:** Brief description
- **Human review/changes:** What you kept as-is, what you edited, what you rejected and why
- **Outcome:** ✅ merged / 🟡 partial / ❌ discarded
- **Time saved vs. hand-writing (rough estimate):**
- **Anything worth remembering:**
```

### Incident entry variant (for agent failures, false completions, verification catches)
Use heading format `### YYYY-MM-DD — [incident] <title>` with fields:
**What happened / Root cause of the failure / Resolution / Status of the underlying bug** (OPEN or FIXED-see-entry-dated-X).
An incident entry never doubles as the fix record — the fix gets its own dated entry with verification evidence.

```markdown
### YYYY-MM-DD — [incident] <title>

- **What happened:** What the agent did wrong and why it mattered.
- **Root cause of the failure:** The underlying reason (pattern-match, skipped audit, unverified claim, etc.).
- **Resolution:** What corrective action was taken (prompt rejection, redirect, re-run, etc.).
- **Status of the underlying bug:** OPEN — [brief description of what remains] / FIXED — see entry dated YYYY-MM-DD.
```

---

## Entries

### 2026-07-13 — Accepted risk: Neon credential rotation waived by user for hosting

User explicitly waived rotating the credential leaked/cleaned up in the `0fc8f0f` incident, choosing to proceed with hosting on the current value rather than delay launch. Rotation remains available anytime via the Neon dashboard + a corresponding Render env var update — no code change required when it happens. No credential value logged here or anywhere in this session.

### 2026-07-13 — F0/F1: double-jump audit found it already built; capped jumpPower instead (ADR-014)

- **Tool used:** Claude Code
- **Goal:** A prompt asked to build double-jump as an AV2-style binary-gate-plus-upgradeable-stat system. F0's audit found it already existed almost entirely — see ADR-014 for the full finding. Rescoped to just the real gap (capping `jumpPower`) per user confirmation.
- **What the agent produced:** `lib/game/jump-physics.ts` (pure module: `jumpVelocity`, `maxJumps`, `tickGroundedState`, `resolveJumpPress`), `game.ts` refactored to delegate to it, 14 new vitest cases including the explicit coyote-consumes-first-jump-not-second edge case. ADR-014.
- **Verification:** `npm test`: 34/34 (12 rng + 8 save-data + 14 jump-physics). `npm run build`: exit 0. Math checked: base jump 3.78 tiles, capped-max jumpPower 5.81 tiles, double-jump reach assumption 7 tiles — margin preserved.
- **Outcome:** ✅ merged. Superseded by a follow-up prompt shifting priority to shipping the beta live this session (space-merc hero swap, hosting, deploy) — F2 (asset utilization) and F3 (replayability) from the original prompt are deferred, not abandoned.

### 2026-07-13 — E0 finding + E1-E3: degraded-mode indicator, hosting prep, tester docs

- **Tool used:** Claude Code
- **Goal:** A follow-up prompt assumed the D2 push had already produced a live, working GitHub Pages deployment in degraded mode, and asked to verify that (E0) before doing the remaining beta apparatus (E1-E3) and a conditional hosting path (E4) if the Neon password had been rotated.
- **E0 finding - the premise was false, and nobody had checked:** queried the GitHub Actions API directly (`gh` CLI unavailable, used `curl` against the public REST API) rather than trusting that a push implies a live site. Every "Deploy to GitHub Pages" run in this repo's entire history - not just this session's - has failed at the deploy step, always in ~1 second, while the build step has always succeeded (including with D2's fix aboard). Root cause: `GET /repos/.../pages` returns 404 and `has_pages: false` - **GitHub Pages has never been enabled for this repository** (`Settings -> Pages -> Source -> GitHub Actions` is a one-time manual toggle only the repo owner can do). The live URL currently returns a genuine GitHub 404, not the app. This invalidated E0 entirely - there was nothing live to verify. Flagged to the user as a second Gate-Zero-style human-only blocker, separate from the Neon password.
- **Mid-session, an independent confirmation:** a GitHub Copilot coding-agent PR (`ff11ae9`, "[WIP] Fix failing GitHub Actions job deploy (#16)") landed on `origin/main` while this session was running, adding an `actions/configure-pages@v5` step to `deploy.yml`. Reasonable and worth keeping, but it doesn't enable Pages either (that action still requires Pages to already be on) - the same run continued to fail after that commit, confirming the diagnosis independently.
- **E1 (degraded-mode indicator, ADR-013):** `GameHudOverlay.tsx` now renders a status chip (dot + "online"/"offline mode"/"connecting…") from the already-existing `lootSource`/`saveSource` HudSnapshot fields, always visible (not just when degraded, so a tester can screenshot the baseline "online" state too). Verified live: with no python-service running, the chip correctly read "offline mode" with title `loot: client-fallback · save: unknown`.
- **E2 (hosting prep, ADR-012):** `render.yaml` (Render Blueprint, env var *names* only - values stay in Render's dashboard). `slowapi` rate limiting on the two write endpoints (`/players/register` 20/min, `/save` 30/min) - verified live with 25 rapid requests: exactly 20×200 then 5×429. A `Content-Length`-based 64KB cap on `POST /save` (413 if exceeded) - new test `test_oversized_save_payload_is_rejected`, 6/6 passing. Documented the Content-Length-spoofing gap (not a true streaming limit) as an accepted, scoped-out limitation.
- **E3 (tester docs):** `docs/BETA_TESTING.md` written now, honestly stating the site isn't live yet and why (both blockers named), rather than waiting until launch pressure to write it. Covers what to test, known limitations, bug-filing fields, and seed-sharing.
- **Housekeeping:** cleaned up 20 throwaway player rows from the live rate-limit test - the auto-mode classifier correctly blocked a broad time-window DELETE without fresh confirmation (twice, as real wall-clock time kept outpacing the approved window - the rows were ~74 minutes old by the time cleanup actually landed, not the ~10-30 minutes each successive attempt assumed).
- **Human review/changes:** confirmed test-row cleanup twice (widening the time window each time as elapsed time exceeded prior estimates).
- **Outcome:** 🟡 partial - E1/E2/E3 shippable and verified; E0 could not be completed as asked (nothing live to check) and instead surfaced a blocker of its own. E4 (conditional hosting) not attempted - still gated on the Neon password.
- **Anything worth remembering:** "the workflow ran" and "the site is live" are different claims - this project now has direct API-verified proof they diverged for the entire project history until someone checks. Worth adding an explicit Pages-status check to any future deploy-related session's audit step, the same way `project-status.py` already checks git/test state.

### 2026-07-13 — D2: asset-path fix for GitHub Pages base path (ADR-011)

- **Tool used:** Claude Code
- **Goal:** Fix the confirmed real bug flagged (but never fixed) across two prior sessions' Playwright console logs: root-absolute `/sprites`, `/audio`, `/assets/manifest.json` fetches bypass Next's `basePath`/`assetPrefix` and 404 once served from GitHub Pages' `/Next-Chapter-Retro-Game/` subpath.
- **What the agent produced:**
  - `lib/game/asset-url.ts`: `assetUrl(path)` prefixes with `NEXT_PUBLIC_BASE_PATH`. Routed every root-absolute reference in `game.ts` and `assetManifest.ts` through it.
  - Investigated the `/assets/manifest.json` 404 specifically (per the prompt's request to fix-or-remove, not just prefix): the file didn't exist at the fetched path at all, only a stale `public/assets/extracted/manifest.json` predating `asset-extract.py`'s dual-write and its `filesByStem` indexing feature - so even a successful fetch would have resolved nothing (`filesByStem` was empty). Regenerated via the script's own `build_manifest()` directly (no re-extraction needed, it only walks already-extracted files) - now 652 stem entries at both paths.
  - `.github/workflows/deploy.yml`: added `NEXT_PUBLIC_BASE_PATH=/Next-Chapter-Retro-Game` to the build step's env. Verified `next.config.mjs`'s `basePath`/`assetPrefix` were already correct from earlier work - not duplicated.
- **Verification:** `grep` confirms zero remaining root-absolute asset fetches outside the helper (the `audioFiles` map's literals are commented as deliberately-unprefixed raw lookup values, prefixed once at the point of use - documented in ADR-011 rather than wrapping all 21 individually). Real Pages rehearsal: production build, `out/` copied into a nested `Next-Chapter-Retro-Game/` subdirectory, served locally (`npx serve`), driven with Playwright - zero asset 404s, canvas renders with full parity to local dev (screenshot: player, bat, ground/platform tiles, moon/mountain background, HUD all correct). One rehearsal build was silently corrupted by Git Bash's automatic POSIX-path conversion turning the inline `NEXT_PUBLIC_BASE_PATH=/Next-Chapter-Retro-Game` into `C:/Program Files/Git/Next-Chapter-Retro-Game` before Next.js read it - caught via `[error] Fetch API cannot load file:///C:/Program Files/Git/...` in the browser console, not a passing-looking build log; the real rebuild used PowerShell instead, which doesn't do that conversion. `npm test`: 20/20 (unchanged). `npm run build`: exit 0.
- **Human review/changes:** none yet - reporting this turn.
- **Outcome:** ✅ merged - the deployed GitHub Pages site will now actually load its sprites, audio, and asset manifest instead of 404ing on all of them.
- **Anything worth remembering:** a passing `npm run build` says nothing about whether an env var actually reached the bundle correctly - only driving the built output in a browser (with console/network capture) caught the Git Bash path-mangling. Any future session building with a `NEXT_PUBLIC_*` value that starts with `/` from this project's Bash tool should use PowerShell instead, or verify the compiled bundle contains the literal expected string before trusting the build.

### 2026-07-13 — D1: save-trigger coverage (room transition, level-up, equip) + death/respawn semantics

- **Tool used:** Claude Code
- **Goal:** `grep -n ".saveGame()"` showed exactly one call site (`activateShrine()`) despite ADR-009's full persistence layer - most real progress was never actually being saved. Also needed to decide and document what death does to the save.
- **Gate Zero check (start of session):** password rotation still NOT done - tested the `.env` credential directly (`psycopg.connect()`, no value printed) and it still authenticates. D3 (public hosting) stays blocked. Branch divergence from the prior session's Gate Zero item turned out to already be resolved - `git fetch origin` showed `main` and `origin/main` identical at `87782e9`; whatever auto-commits this environment produces apparently also pushes.
- **What the agent produced:**
  - Read `goToRoom()`, `respawn()`, `awardXp()`, `applyLoot()` before changing anything. Confirmed `respawn()` already never saves - it heals, clears per-room enemy state, and teleports to `START_ROOM` while keeping level/weapon/upgrades/flags and never touching `runSeed`/`seedPhrase` (set once at construction) - so the death-screen seed-continuity contract was never actually at risk.
  - Added `saveGame()` calls at: `goToRoom()` (room transition - the primary checkpoint), `awardXp()` (once per XP award even across multi-level rollovers, not once per level), and `applyLoot()`'s weapon-auto-equip branch only (not stash/scrap/upgrade-pickup - too frequent to warrant a save+network round-trip each).
  - Extracted `buildSaveData()` into `lib/game/save-data.ts` - a pure function of its input, out of `saveGame()`'s previously-inline object construction. 8 new vitest cases (`save-data.test.ts`) covering clamping behavior (hp/coins/level/xp bounds, non-finite fallback, dropped-unknown-upgrade-ids, array-copy-not-alias, position clamping) without needing a running `Game` instance.
  - **Decision, logged as ADR-010:** death does NOT trigger a save. The most recent save after any of the new triggers is at most a few seconds/one room stale by the time of an in-session death, and `respawn()`'s existing in-memory behavior already fully resolves what death means during a live session - persistence only matters for resuming *between* sessions.
- **Verification:** `npm test`: 20/20 (12 existing + 8 new). `npm run build`: exit 0. `python -m unittest tests.test_persistence`: 5/5 (unaffected). Live Playwright proof, not just code review: booted the real game, confirmed **zero** `/save` requests before any movement, walked the player from `R01` into `R02` (holding right ~6s to cross the 640px-wide room), confirmed **one** `/save` POST fired, confirmed `localStorage`'s `next_chapter_save_v1.roomId === "R02"`, and confirmed via `mcp__Neon__run_sql` that the server-side row's `save_data->>'roomId'` also read `"R02"` - the full client → server → Neon path for the new trigger, not just the client-side half. Test row deleted after.
- **Human review/changes:** none yet - reporting this turn.
- **Outcome:** ✅ merged - save coverage now spans the moments that actually matter for a beta tester's session continuity, verified against the live database.
- **Anything worth remembering:** deliberately did NOT add a save on manual weapon-swap (V/L, swapping between already-owned primary/secondary) or on non-equip loot (upgrades/scraps) - those don't represent new progression and would multiply network calls for no real continuity benefit. Worth revisiting if a future increment adds save-related UX (e.g., an explicit "saving..." indicator) that would make frequent saves feel intentional rather than chatty.

### 2026-07-12 — Phase 5 from scratch: Neon persistence (players, run_state, anonymous UUID identity)

- **Tool used:** Claude Code
- **Goal:** A "beta release" prompt assumed a persistence layer, ~30 ADRs, and a merged "integration session" already existed. Audit (git log, grep for `player_id`/`run_state`/`DATABASE_URL`/`alembic` across real source, `docs/DECISIONS.md` ADR count) showed none of that existed - only 8 ADRs, zero persistence code anywhere outside third-party `.venv` files. User chose "build Phase 5 from scratch now" over descoping the beta or stopping at the one real, confirmed bug the prompt also surfaced (root-absolute asset paths breaking under the GitHub Pages base path - not addressed this session, still open).
- **What the agent produced:**
  - Found the user's existing (empty except Neon's demo table) "Metroidvania" Neon project via the Neon MCP tools rather than provisioning a new one. Schema (`players`, `run_state` - see ADR-009 for the full design and why it mirrors the client's JSONB save shape instead of normalizing columns) proposed via `prepare_database_migration`, reviewed on a temporary branch, applied via `complete_database_migration` only after explicit user confirmation.
  - `python-service/db.py`, three new endpoints (`/players/register`, `/save`, `/load`), Alembic wired to `DATABASE_URL_DIRECT` (`python-service/alembic/`), `psycopg[binary]` swapped in for the originally-planned `asyncpg` after `asyncpg` failed to build (no wheel for this machine's Python 3.14 on Windows, needs MSVC Build Tools that aren't installed).
  - Frontend: `lib/game/player-identity.ts` (UUID in localStorage), `lib/game/save-client.ts` (same direct-to-service pattern as `loot-client.ts`), refactored `game.ts`'s `loadSavedGame()` into an async server-first/localStorage-fallback flow plus a shared `applySaveData()` helper, wired best-effort server mirroring into `saveGame()`.
  - `python-service/tests/test_persistence.py`: 5 integration tests against the real Neon DB (idempotent registration, two-UUID isolation, load-before-save, save-without-registration rejected, save upserts not duplicates) - each test cleans up its own rows in `tearDown`.
- **Verification (evidence, not narration):**
  - `curl` round trip: register (same UUID twice → same `playerId`), load with no save (`{"ok":false}`), save, load again (`{"ok":true,"saveData":{...}}`) - all pasted in the turn.
  - Two distinct UUIDs → `SELECT p.id, p.client_uuid, r.save_data FROM players p LEFT JOIN run_state r ...` returned 2 rows with correctly isolated `save_data`.
  - Real browser test (Playwright, not just curl): booted the actual game against a live `npm run dev` + live `uvicorn`, confirmed `/players/register` fires on boot and returns 200 - initially failed with a CORS error (`ALLOWED_ORIGINS` only listed port 3000; Next fell back to 3001 because a stale process from an earlier session was still holding 3000 - the auto-mode classifier correctly blocked killing that PID since it wasn't verifiably this session's own process, so the allowlist was widened to cover 3001 too instead, a legitimate robustness fix either way). After the fix, confirmed via `mcp__Neon__run_sql` that the exact UUID generated in the browser's `localStorage` landed as a real row in Neon.
  - `python -m unittest tests.test_persistence -v`: 5/5 passing. `npm test`: 12/12. `npm run build`: exit 0.
  - All test rows (4 player rows created across curl + browser + automated tests) deleted from Neon before finishing - confirmed `SELECT count(*)` on both tables returns 0.
- **Human review/changes:** confirmed Neon schema apply after temp-branch review; explicitly authorized fetching live connection strings via MCP (classifier had blocked it by default - "credential materialization" risk) rather than pasting them in blind; confirmed test-row cleanup.
- **Outcome:** ✅ merged - full persistence loop (register → save → load, with graceful client-fallback) verified end-to-end against the real hosted database, not a local/mocked one.
- **Time saved vs. hand-writing (rough estimate):** high - the Neon MCP tools (temp-branch migration review, direct SQL verification) turned what's normally a slow, error-prone manual dashboard-and-`psql` workflow into a few reviewable tool calls.
- **Anything worth remembering:** the CORS/port-3001 failure is a good example of "verify against the live system, not the code" - the code review would have looked correct (env var, correct default) but the actual `.env` file's explicit `ALLOWED_ORIGINS` value silently shadowed the code-level default I'd "fixed" first, and only a real browser network capture caught that the fix hadn't actually taken effect. Also: this session confirmed (again) that the leaked Neon password from the 2026-07-11 security-cleanup entry is still unrotated - the fresh connection string fetched via MCP had the identical password. Not blocking for local dev, but must happen before this ever goes publicly live.

### 2026-07-11 — Root-caused "free-floating sprites": two independent bugs, no engine needed

- **Tool used:** Claude Code
- **Goal:** Corrective diagnosis after the Phaser-detour incident logged below — find the real cause of "sprites rendering free-floating / detached from the background" inside the existing hand-rolled canvas architecture, evidence first.
- **Reproduction:** No project skill existed for launching this app. Installed Playwright (`npx playwright install chromium`), started `npm run dev`, and drove a headless Chromium session against it (script + screenshots preserved in the session scratchpad). This surfaced two **independent, stacked** bugs — fixing only one would not have fully resolved the symptom:
  - **Bug 1 — Contract C (canvas/stage sizing), `app/globals.css`:** `.game-canvas-stage` had `flex: 1` but its parent `#game-stage-viewport` is `position: relative` / `display: block`, not a flex container, so `flex: 1` was dead. With no explicit height, CSS block layout auto-fills width but auto-sizes height to content — and the canvas inside reads `height: 100%` of *this* element, a circular reference. Measured via `getComputedStyle` + `getBoundingClientRect()` on the live page: `#game-stage-viewport` correctly resolved to 1217×684 (16:9, `aspect-ratio` working as intended), but `.game-canvas-stage` inside it resolved to 1217×**1177** — 493px taller than its own parent. `#game-stage-viewport` has `overflow: hidden`, so everything below roughly the top 58% of the canvas was silently clipped: the ground, platforms, and the player (all positioned near the bottom of each single-screen room) were being rendered every frame, just outside the visible box. Confirmed by live-patching `.game-canvas-stage { height: 100% }` via `page.addStyleTag` before touching real code — canvas immediately resolved to a correct 1216×684 and previously-invisible entities appeared. Fix: added the same `height: 100%` for real, with a comment explaining why `flex: 1` alone doesn't work here.
  - **Bug 2 — Contract A (sprite sheet geometry), `scripts/prepare-assets.py`:** even with Bug 1 fixed, the ground/platforms rendered as fully invisible (player visibly standing on nothing). Sampled `public/sprites/tiles.png` pixel-by-pixel: 7 of its 8 tiles were `(0,0,0,0)` — fully transparent — at every sampled pixel; only `topLeft` had real content. Traced to the crop table in `prepare-assets.py`'s tile-generation block: `dirt_platformer_tiles.png` is 256×96px = 16 cols × 6 rows at 16px tiles (valid row indices 0-5), but the table referenced row indices up to 11 for 6 of the 8 tiles (`top`@row10, `fill`@row11, `topRight`@row6, `wallLeft`@row8, `wallRight`@row7, `fillDark`@row11) — all out of bounds. PIL's `Image.crop()` doesn't error on an out-of-bounds box; it silently returns transparent pixels for the parts outside the source image, which is exactly what got baked into `tiles.png`. The code comment claimed the coordinates were "verified visually against a labeled grid overlay this session," which was true for `topLeft` (row 4, the one in-bounds coordinate) but not the rest — the source asset was likely swapped for a smaller one at some point after that verification. Rendered a labeled grid overlay of the actual source image (`ImageDraw`, 10x nearest-neighbor scale, green gridlines, red `col,row` labels) to inspect it directly, picked 6 replacement cells within the real 16x6 grid, and verified each was >90% opaque before committing to it. Regenerated `tiles.png` directly (the full `prepare-assets.py` pipeline currently fails on an unrelated missing zip removed in `e35cbbc`'s GitHub Pages cleanup — out of scope here, replicated just the tiles block standalone).
- **Verification:** Re-ran the Playwright capture against the real fixed code (no live CSS patch) — canvas correctly resolves to 1216×684 with no injection, and the screenshot shows a solid textured floor, side walls, and floating platforms, with the player standing on the ground and an enemy/pickups correctly positioned — matching the composition of the reference screenshot in `assets/img/screenshots/working-prototype00.png`. `npm test`: 12/12 passing. `npm run build`: exit 0. `python scripts/project-status.py`: exit 0. `git diff --stat`: `app/globals.css` (+10), `scripts/prepare-assets.py` (+27/-9 rewriting the crop table with a why-comment), `public/sprites/tiles.png` (regenerated, 375→1072 bytes — more real content compresses larger than mostly-transparent pixels).
- **Human review/changes:** none yet — reporting this turn.
- **Outcome:** ✅ both root causes fixed and verified, no engine/dependency/camera introduced, consistent with ADR-002 and ADR-004.
- **Anything worth remembering:** neither bug was in `game.ts`'s rendering math, which the original Phaser suggestion (and my own early hypotheses about the world-to-screen transform) assumed was the likely culprit. One was pure CSS layout (a `flex: 1` with no flex parent — a very ordinary mistake, easy to miss without measuring computed styles directly), the other was stale crop coordinates surviving a source-asset swap. Screenshots alone were **not** enough to fully diagnose this — the CSS fix alone produced a visually-plausible-but-still-wrong result (entities floating with no ground), which could easily have been mistaken for "fixed" without the pixel-opacity check on `tiles.png`. Measure computed layout and sample actual pixel data before concluding a visual bug is understood.

### 2026-07-12 — [incident] Agent pattern-match failure — Phaser prescribed for a hand-rolled-canvas symptom

- **What happened:** VS Code Copilot, given the "sprites free-floating" symptom, prescribed
  a Phaser + Tiled tilemap fix (`Phaser.Types.Core.GameConfig`, `addTilesetImage`,
  camera follow) for a project where Phaser is not a dependency, ADR-002 forbids
  engines, and ADR-004 forbids scrolling cameras.
- **Root cause of the failure:** symptom-level pattern matching to the most common
  tutorial stack, with no audit of package.json or DECISIONS.md before prescribing.
- **Resolution:** corrective prompt issued rejecting the engine detour and requiring
  an evidence-first diagnosis inside the existing architecture (three-contract method:
  spritemeta geometry / anchor convention / world-to-screen transform).
- **Status of the underlying bug:** OPEN as of this entry. Investigation in progress
  points at vertical clipping — ROOM_H (22) × tile size exceeds the canvas element's
  height, likely cutting the floor row. Root cause and fix will be logged in a
  separate dated entry when verified; do not treat this incident entry as evidence
  the render bug is resolved.

### 2026-07-11 — Fix pre-existing build break: browser now calls python-service directly (ADR-008)

- **Tool used:** Claude Code
- **Goal:** Resolve the `npm run build` failure logged as a VERIFICATION FAILURE in the previous entry — static export (`output: "export"`, for GitHub Pages) can't run Next.js API routes that read `request.url` at runtime.
- **Prompt summary:** User chose "move Python-proxy calls client-side" over "drop static export" when offered the choice.
- **What the agent produced:**
  - Repo-wide grep confirmed only `/api/loot` had any caller (`lib/game/game.ts`, 2 call sites: `probeLootService`, `fetchOrFallbackRoll`); `/api/generate-loot` and `/api/procedural-level` were unused.
  - Auto-mode classifier paused an `rm -rf` covering all three routes, since only `/api/loot`'s migration had been shown and the user's approval didn't explicitly name deleting the two unused ones — asked the user directly via AskUserQuestion; confirmed to delete all three (`generate-loot` independently breaks the build the same way, so leaving it would keep `npm run build` red).
  - Added `lib/game/loot-client.ts` — browser fetches `python-service`'s `/loot/roll` directly via `NEXT_PUBLIC_PYTHON_SERVICE_URL`, same request/response shape the deleted route used, so `game.ts`'s two call sites changed minimally.
  - Added CORS (`CORSMiddleware`) to `python-service/main.py` for `localhost:3000`, `127.0.0.1:3000`, and `https://straydogsyn.github.io` (derived from `git remote -v`), since this is now a cross-origin browser request instead of server-to-server.
  - Updated `scripts/tests/test_regression_contracts.py` (was pinning `app/api/generate-loot/route.ts`'s contents — rewrote to pin `loot-client.ts` instead), `docs/ARCHITECTURE.md` (diagram + data-flow text), and `README.md`. Logged as ADR-008 in `DECISIONS.md`.
- **Human review/changes:** confirmed scope (delete all 3 routes) via AskUserQuestion after the classifier pause; no other changes requested.
- **Outcome:** ✅ merged — `npm run build` exit 0 (confirmed real exit code this time, not piped through `tail`), `npm test` 12/12, `python -m unittest scripts.tests.test_regression_contracts` 2/2, `python scripts/project-status.py` exit 0.
- **Time saved vs. hand-writing (rough estimate):** moderate — the trickiest part (finding that 2 of 3 API routes were dead code and one independently duplicated the build failure) came from a repo-wide grep an agent runs reflexively; easy to miss by hand and ship a half-fix.
- **Anything worth remembering:** the deployed GitHub Pages site still can't reach a Python service anywhere (python-service only runs locally today) — the game will always fall through to `client-fallback` loot on the live deployed site until python-service is hosted somewhere public and `NEXT_PUBLIC_PYTHON_SERVICE_URL` is set in `.github/workflows/deploy.yml`. That's graceful (ADR-003), not silently broken, but it's real Phase 5 territory in `MASTER_BUILD_SPEC.md`, not resolved here.

### 2026-07-11 — Phase 0 increment: add vitest test runner; discovered pre-existing build break

- **Tool used:** Claude Code
- **Goal:** Close the single hard blocker identified in the same-day audit below — no JS test runner installed, so `npm test` (a universal gate in every future Step 3 of `MASTER_BUILD_SPEC.md`'s loop) failed immediately.
- **Prompt summary:** User picked "fix the test-runner gap" from three options (test runner / Neon persistence / narrative layer) after reviewing the audit.
- **What the agent produced:** Installed `vitest` as a devDependency, added `"test": "vitest run"` to `package.json`, wrote `lib/game/rng.test.ts` — 12 tests covering the RNG's core guarantees: same-seed determinism, different-seed divergence, `.fork()` stream independence (proved by consuming 5000 draws from a "layout" fork and showing a sibling "loot" fork is untouched — the exact property the spec's two-stream RNG rule and this project's procgen depend on), and `int()`/`pick()`/`shuffle()` bounds/purity. Logged as ADR-007 in `DECISIONS.md`.
- **VERIFICATION FAILURE (discovered, not introduced):** `npm run build` fails with exit 1. Confirmed via `git stash` + rebuild that this predates this session — already broken at commit `e35cbbc` ("update configuration for GitHub Pages deployment"), which added `output: "export"` to `next.config.mjs`. Static export is incompatible with `app/api/loot/route.ts` and `app/api/generate-loot/route.ts` (both call `new URL(request.url)`, which needs a live Node server; static export has none). This means `.github/workflows/deploy.yml`, added in the same commit, is currently failing on every push to `main`. **Not fixed in this session** — resolving it means picking one of: (a) drop static export and host somewhere with a Node runtime, or (b) keep static export and move the Python-service proxy calls client-side (CORS/exposed-URL tradeoffs). That's an architecture decision for the user, not something to patch silently.
- **Human review/changes:** flagged to user immediately after this entry for a decision on the build-break fix.
- **Outcome:** 🟡 partial — the test-runner increment itself is ✅ (`npm test`: 12/12 passing, `python scripts/project-status.py`: exit 0); `npm run build` remains ❌ from a pre-existing, separately-caused regression.
- **Time saved vs. hand-writing (rough estimate):** N/A.
- **Anything worth remembering:** the build failure was almost missed in this same session — an initial check piped `npm run build` through `tail` and echoed `$?`, which silently reported `tail`'s exit code (0) instead of `npm run build`'s (1). Caught by re-running with the pipe removed. A live example of exactly the failure mode `MASTER_BUILD_SPEC.md`'s Prime Directive exists to prevent — worth remembering when writing future verification commands in this repo: never pipe a gate command through anything before checking `$?`.

### 2026-07-11 — Adopted MASTER_BUILD_SPEC.md; Phase 0 ground-truth audit against the Phase 0-8 scheme

- **Tool used:** Claude Code
- **Goal:** A prior session (VS Code Copilot) drafted a nine-phase "Iterate → Audit → Proliferate" overhaul spec and left it as two untracked doc files (`docs/OVERHAUL_PHASE2.md`, `docs/PHASE2_OVERHAUL.md`) without adopting it. Asked to commit it as the project's forward plan and run its Step 1 audit for real, against actual repo state rather than assuming Phase 0 is a blank slate.
- **Prompt summary:** User pasted the full orchestrator prompt + spec; confirmed via AskUserQuestion to adopt it as the plan (rename the spec to `docs/MASTER_BUILD_SPEC.md`, which the orchestrator prompt references by that path, commit both docs, then map the real codebase onto the Phase 0-8 scheme instead of trusting the spec's implicit "fresh project" framing).
- **What the agent produced:** Ground-truth audit (git status/log, grep/read across `lib/game`, `python-service`, `components`, `package.json`) mapping each phase to real evidence:
  - **Phase 0 (Foundation):** Docs system (`DECISIONS.md`, `SESSION_LOG.md`, `PROMPT_LIBRARY.md`, `CREDITS.md`, `ARCHITECTURE.md`) already exists and is actively maintained — matches spec intent. `scripts/project-status.py` exists but does asset-manifest/thumbnail auditing, not the phase-gate check the new spec's loop assumes — it's the project's own evolved tool, kept as-is. **Kebab-case is not followed anywhere** — all files are PascalCase (`components/GameCanvas.tsx`) or camelCase (`lib/audioManager.ts`, `lib/game/assetManifest.ts`, `lib/gameLoop.ts`, `lib/game/levelLoader.ts`). Retrofitting an 86KB `game.ts` and its imports for a naming convention alone is pure churn with real regression risk — decision: kebab-case applies to new files only going forward, existing files are not renamed. **`package.json` has no `test` script and no JS test runner (jest/vitest) installed** — `npm test`, required by every Step 3 verify gate in the new loop, currently fails immediately with "Missing script." This is the one hard blocker to running the loop as literally written.
  - **ADR numbering collision:** `docs/DECISIONS.md` already has ADR-001 through ADR-006 with *different* content than the new spec's phase-keyed ADR scheme (e.g. existing ADR-003 is "client-side loot fallback when the Python service is down," not the new spec's "game-feel constants"). Decision: future ADRs use the next free number (ADR-007+), not the specific numbers the spec's phase prose suggests.
  - **Phase 1 (Rendering/Sprites):** Substantially further along than the spec assumes — full asset pipeline (`scripts/asset-fetch.py`, `asset-fetch-bulk.py`, `prepare-assets.py`, `asset-extract.py`), populated `CREDITS.md`, large sprite/sound library. `project-status.py`'s own triage flags a handful of thumbnail-not-real-asset files as a known small cleanup item (already tracked in `STATUS.txt`). Mostly done.
  - **Phase 2 (Game Feel):** Partial. `game.ts` has coyote time (`coyoteT`, hardcoded `0.1`) and i-frame/dash-i-frame handling, but as inline magic numbers, not named constants in a `game-constants.ts` (which doesn't exist). No named jump buffer, hitstop, or screen shake found.
  - **Phase 3 (Procgen/RNG):** Ahead of spec's baseline — `lib/game/rng.ts` already uses **sfc32** (the spec's own caveats section recommends sfc32 as the upgrade path *from* mulberry32 — already done) with arbitrary named `.fork(name)` streams, a more general version of the spec's fixed layout/loot two-stream split. `world.ts` (33KB) likely implements the layout graph; no test suite yet proves determinism/BFS-solvability per the spec's checkpoint.
  - **Phase 4 (Economy):** Partial, differently shaped than the spec's plan. `items.ts` is a data-driven weapon system (7 bases × 10 prefixes × 4 rarities = 280 variants) plus upgrades; `python-service/loot_tables.py` + `/loot/roll` + `/loot/table` are the authoritative roller. No level-gated shop/purchase endpoint or persistent-currency flow found — this is a roll-on-drop system, not a shop economy yet.
  - **Phase 5 (Persistence/Neon): not started.** No `DATABASE_URL`, no `neon.tech` reference anywhere, `python-service/requirements.txt` has only `fastapi` + `uvicorn`. Largest gap vs. spec, and the one with real architecture decisions still open (Alembic, pooled/direct URL split, ADR-001 enforcement).
  - **Phase 6 (Narrative — Jack/headband/Dragonslayer/song-title chapters): not started.** Zero references anywhere outside the spec documents themselves. The spec's most distinctive content and entirely greenfield.
  - **Phase 7 (GUI Frame):** `components/GameHudOverlay.tsx` and siblings exist, but no `zustand` dependency in `package.json` — the state bridge is built some other way (plain React state/props), not the spec's throttled zustand store. Canvas re-render isolation not verified either way.
  - **Phase 8 (Responsive/polish):** not audited in depth this pass.
- **Human review/changes:** User chose "adopt spec as the new plan" over the two alternatives (commit-docs-only, or explain more) via AskUserQuestion.
- **Outcome:** 🟡 partial — plan adopted, audit complete and evidence-backed, no code changes yet. Committing docs + this audit; next increment to be selected against the findings above rather than assumed.
- **Time saved vs. hand-writing (rough estimate):** N/A (audit/planning session).
- **Anything worth remembering:** The spec document, taken literally, assumes a blank-slate project (kebab-case from scratch, ADR numbers starting at 001, Phase 0 = nothing built). The actual repo had already organically built past several of these phases — in the RNG case, past the spec's own recommended baseline. Treat the Phase 0-8 labels as a *tracking scheme layered onto existing work*, not a literal build order to restart from. The recurring lesson from this project's earlier sessions (see the 2026-07-07 asset-sourcing entry below) generalizes here too: verify against the filesystem before trusting any prior plan's framing, including this one's.

### 2026-07-08 — Overnight architecture audit + combat-effect wiring + runtime proof pass

- **Tool used:** Copilot CLI runtime in VS Code (autonomous overnight session)
- **Goal:** Verify repo ground truth first, then harden gameplay against the current spec (20+ room world, unified keyboard+gamepad input, Python-authoritative loot), implement missing loot-effect mechanics, and produce proof-first status artifacts.
- **Prompt summary:** Follow strict verification workflow (`project-status.py` first and repeatedly), avoid claim-only summaries, run real lint/build/runtime checks, and align docs with actual wired assets.
- **What the agent produced:**
  - Ran required orientation reads and `python scripts/project-status.py` before edits.
  - Implemented all previously stubbed prefix effects in `lib/game/game.ts`:
    - `burn`: periodic DOT tick
    - `freeze`: temporary heavy slow
    - `shock`: short stun/slow plus local chain splash
    - `curse`: temporary vulnerability multiplier
    - (existing `crit` and `lifesteal` retained)
  - Added minimal in-combat status indicators (colored pips above affected enemies).
  - Updated docs to match real state:
    - `docs/ARCHITECTURE.md` open-questions now marks prefix-effect wiring complete
    - `docs/AGENTIC_WORKFLOW.md` weapon/loot status updated to 6/6 effects wired
    - `docs/CREDITS.md` rebuilt to include only currently wired runtime assets from `assets/wired-assets.txt` + manifests
- **Human review/changes:** Pending morning review; all changes validated by lint/build in-session.
- **Outcome:** 🟢 in progress (implementation + static verification complete; runtime/browser playproof and final morning report follow in same overnight run)
- **Time saved vs. hand-writing (rough estimate):** ~3–5 hours (cross-file gameplay + docs reconciliation + verification loop)
- **Anything worth remembering:** This repo’s safeguard is working: `project-status.py` was used as source-of-truth before and during edits; doc updates were explicitly tied to wired runtime assets, not candidate inventory.

### 2026-07-08 — Bug-fix overhaul: four review findings verified + fixed, sync-corruption repair

- **Tool used:** Claude (Cowork, autonomous overnight session)
- **Goal:** Fix four confirmed bugs from two independent code reviews, run a correctness pass on lib/game/game.ts, verify Python-service authority with real network inspection, and produce an honest content inventory.
- **What happened first (unplanned):** The workspace-mount copies of several files were corrupted relative to the real repo — `lib/game/game.ts` truncated mid-function, `components/GameCanvas.tsx` and `python-service/main.py` NUL-padded, `package.json`/`tsconfig.json`/`package-lock.json`/several docs truncated. Worse, **HEAD's committed main.py is itself truncated at 1,465 bytes** (a prior session committed from a corrupted state — the loot endpoints were never actually committed even though they run from the working tree), and **HEAD's .gitignore and DECISIONS.md contain committed merge-conflict markers**. All repaired this session: code from HEAD blobs/verified copies, docs rebuilt from HEAD, the DECISIONS.md conflict resolved by keeping both sides (duplicate "ADR-003" renumbered to ADR-006). The stale `.git/index` was corrupt with an undeletable `index.lock`; worked around via `GIT_INDEX_FILE`.
- **The four findings, verified with real reproductions (harness: 16/16 PASS):**
  1. `roomState()` non-null assertion — already guarded in HEAD; verified by triggering it: `roomState("R99")` → `Error: roomState: unknown room id "R99"` (descriptive, not a TypeError).
  2. Async loot roll vs `respawn()` — the kill path's identity guard already covers the respawn case (verified: kill → respawn → roll resolves → 0 ghost pickups in the rebuilt room). But the **chest path had the sibling bug**: it compared against `this.roomId` at *resolution* time, so loot was silently lost if the player changed rooms mid-roll. Fixed to capture the room at open time; verified: chest opened in R01, player walks to R02, loot lands in R01 (1 pickup), R02 clean (0).
  3. Luck weighting — TS fallback and Python implement the **same** formula; proved with 200k-roll Monte Carlo per side vs closed form (epic at luck 0/50/100: TS 4.01/5.03/5.78%, PY 4.00/5.03/5.80%, exact 4.00/5.00/5.71%). The sub-linear "dilution" is documented in both files as a shared, intentional property. The *actual* divergence found: the fallback ignored `enemy_level` damage scaling (`level_mult`) — fixed and verified (same seed, level 8 vs 1 → damage ratio exactly 1.5600).
  4. Stuck inputs — gamepad release was already handled (state rebuilt from scratch each poll; verified across held/release/silent-disconnect/stale-snapshot cases). But the **keyboard had the deleted-inputHandler's bug**: keys held across a window blur stayed held forever (keyup lost on alt-tab). Fixed with a `blur` listener; also hardened `pollGamepad()` against `connected=false` array slots with stale pressed buttons.
- **Correctness pass extras:** loot fetch now has a 3s abort-timeout (a hung request degrades to fallback instead of a drop that never lands); HUD snapshot copies the upgrades object instead of handing React a live mutable reference; werewolf howl summons are queued and appended after the enemy loop instead of mutating the array mid-iteration.
- **Python authority, verified on the wire:** with uvicorn up, `/api/loot` returned `source:"python-service"` and the uvicorn access log shows the request (`GET /loot/roll?...` 200 OK); with uvicorn down, the proxy returns `ok:false, source:"unavailable"` — it never fabricates loot; the client fallback is reached only then and tags drops `client-fallback`.
- **Honest content inventory (starting point for the gameplay/plot phase):**
  - Weapons: 7 behaviorally distinct bases × 10 prefixes × 4 rarities = 280 rollable identities + continuous stat rolls. **Placeholder flag:** 4 of 6 prefix effects (burn, freeze, shock, curse) are displayed on items but have NO combat implementation — only crit and lifesteal actually work.
  - Character mods: 12 upgrade types, all 12 genuinely wired into player stats (verified per-stat usage in game.ts).
  - Bosses: 3 with distinct AI (wyrmwolf charge, mech laser volleys, werewolf multi-phase with howl-summon + enrage). Werewolf fully animated (7 animation rows); **wyrmwolf and mech are single-frame sprites** — visual placeholders.
  - World: 24 rooms / 5 zones / 4 regular enemy types, ability-gated (double jump, dash, key, beast door).
  - Not present at all: consumables, save/persistence, economy beyond a coin counter, plot/NPC content.
- **Outcome:** ✅ all four findings fixed-or-proven-covered with pasted repro output; tsc clean; GET / 200 with both services; committed after diff review.
- **Anything worth remembering:** The workspace sync can truncate or NUL-pad files, and a prior session **committed** truncated/conflicted files without noticing (`git diff` flagging a source file as `Bin` is the tell). Verify byte counts and file tails before trusting — or committing — anything that crossed the mount.


### 2026-07-07 — Build core gameplay systems (input, levels, enemies, loot, boss)

- **Tool used:** Copilot CLI (autonomous overnight build)
- **Goal:** Implement the main gameplay loop foundations: multi-level world, enemy AI, weapon/loot system, and boss mechanics
- **What the agent produced:**
  - Extended InputHandler (lib/inputHandler.ts) to support Xbox gamepad via navigator.getGamepads() polling; unified keyboard and gamepad into abstracted InputState interface
  - Created LevelManager (lib/levelManager.ts) with 4 interconnected Metroidvania-style levels, collision detection, and level transitions
  - Implemented EnemyManager (lib/enemyManager.ts) with simple AI (idle/walking/attacking/dead states) including player tracking and jumping
  - Built ItemManager (lib/itemManager.ts) as data-driven weapon system; extended Python service with /generate-loot endpoint (rarity tiers + stat rolls)
  - Created BossManager (lib/bossManager.ts) with sophisticated multi-phase AI (idle/chasing/attacking/stunned/defeated), configurable per boss type (werewolf/dragon/cultist_lord)
  - Completely refactored GameCanvas.tsx to render full multi-level world with platforms, enemies, level exits, combat, and player/enemy health bars
  - Created Next.js API route (app/api/generate-loot/route.ts) as proxy to Python service

- **Architectural decisions**: Followed ADR-001 (Python isolation) — procedural loot generation lives in Python service, TypeScript consumes via HTTP. Input system unified in single interface for future controller rebinding (ADR mentoring for next phase).

- **Outcome:** ✅ Verified via project-status.py — all systems in place, Next.js dev server running without TypeScript errors, Python service responding on both endpoints

- **Time saved vs. hand-writing (rough estimate):** ~8 hours of manual coding, UI debugging, and API integration work condensed to ~90 minutes of focused autonomous iteration

- **Anything worth remembering:**
  - Gamepad API requires polling in render loop, not event-driven like keyboard — this was baked into the GameLoop from the start
  - Data-driven approach (item stats as JSON from Python) scales to "dozens of weapons" claim without per-weapon code
  - Metroidvania structure (4 interconnected levels with exits) is more interesting than linear progression; easy to add more levels by extending LEVELS object
  - Boss AI patterns (different attack ranges/cooldowns per boss type) set up well for future visual variety without code changes
  - LevelManager.render() draws platforms and exits; GameCanvas handles full render loop with player/enemies/HUD — clean separation between level data and rendering logic

### _YYYY-MM-DD — Initial project scaffold_

- **Tool used:** GitHub Copilot cloud agent
- **Goal:** Generate the base Next.js + FastAPI project structure per the architecture spec
- **Prompt summary:** Structured prompt specifying tech stack, folder layout, and five scaffolded features (see [PROMPT_LIBRARY.md](PROMPT_LIBRARY.md#scaffold-prompt))
- **What the agent produced:** _fill in after PR review_
- **Human review/changes:** _fill in_
- **Outcome:** _fill in_
- **Time saved vs. hand-writing (rough estimate):** _fill in_
- **Anything worth remembering:** _fill in_

### 2026-07-07 — Open-source asset sourcing + downloader script + multi-tool verification gap

- **Tools used:** Claude (asset research, script authoring, doc updates), Windsurf (local script editing/execution), VS Copilot (attempted handoff after Windsurf stalled)
- **Goal:** Source CC0/CC-BY sprites and SFX matching the beast-transformation/sci-fi-soldier/metroidvania aesthetic, build a downloader script to fetch them programmatically, and track licensing in `docs/CREDITS.md`
- **What happened:** Claude researched and shortlisted real OpenGameArt/Freesound assets, wrote `scripts/asset-fetch.py` (OGA scraper + Freesound API preview downloader), and drafted `docs/CREDITS.md`. Windsurf ran the script locally; the first run mis-scraped Drupal thumbnail-derivative URLs instead of real asset files (e.g. an SFX zip pack downloaded as a small `.png`). Claude patched the scraper to filter `/styles/` thumbnail paths and prefer real asset extensions.
- **The actual problem:** Both Windsurf and VS Copilot, in separate turns, reported task completion ("moved files," "created docs/CREDITS.md," "regenerated manifest") that didn't match the real file tree — `docs/CREDITS.md` was reported created twice but never appeared locally, and a later terminal paste showed the *exact same* stale output as a prior turn, suggesting a claimed fix had not actually been applied.
- **Resolution:** Rather than trust further narrated summaries, built `scripts/project-status.py` — a ground-truth snapshot generator that reads the filesystem and git state directly (file sizes, a hash + marker-string check on `scripts/asset-fetch.py` to confirm which version is actually on disk, manifest contents) with no agent self-reporting in the loop.
- **Outcome:** 🟡 partial — Freesound downloads (3/3) succeeded cleanly via the API and are verified real audio files. OpenGameArt downloads are still unconfirmed as of this entry; `project-status.py` is the next step to verify actual file sizes before trusting them.
- **Time saved vs. hand-writing (rough estimate):** Net negative so far on the asset-download portion specifically, due to the verification gap — a good illustration that agentic speed gains can be erased by unverified completion claims.
- **Anything worth remembering:** Treat "done" from any coding agent as a claim to verify against the actual file tree, not as ground truth on its own — especially across multi-tool handoffs, where one tool's summary of another tool's work compounds the risk of drift. This is arguably the most authentic "agentic collaboration" finding of the whole project.

_Add new entries above this line, most recent first or last — pick one convention and stay consistent._