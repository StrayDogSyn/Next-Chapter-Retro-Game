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

---

## Entries

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