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

### 2026-07-08 — Asset-pipeline integrity: suspect-thumbnail triage + scraper hardening

- **Tool used:** Claude (remote/cloud session, `claude/asset-pipeline-integrity-m6n3jn`)
- **Goal:** Investigate the 24 files `project-status.py` flagged as "SUSPECT: small image, may be a thumbnail" and fix them.
- **What happened first (network constraint discovered):** This session's environment blocks outbound access to `opengameart.org` at the proxy policy level (confirmed: requests to the host return `connect_rejected` / 403 CONNECT tunnel failure). `asset-fetch.py` and `asset-fetch-bulk.py` both say explicitly in their docstrings to run on a machine with real network access, not a sandbox — so re-fetching replacement assets was not possible here. Rather than claim a fix that couldn't be performed, the session pivoted to what was actually verifiable: is the flagged list even correct?
- **Finding — the heuristic was wrong more often than right:** `project-status.py`'s flag was pure byte-size (`< 20KB`), which false-positives hard on indexed-palette/low-complexity art (`base_character.png` is a genuine 1024×1024 sprite sheet at only 17.4KB). Reading actual pixel dimensions (stdlib PNG/GIF/JPEG header parsing, no Pillow needed) and cross-referencing `manifest.csv`/`manifest_bulk.csv`'s recorded source URLs narrowed 24 flagged files down to 9 real suspects:
  - 5 **confirmed** by direct manifest evidence — the recorded fetch URL itself ends in `preview.png`/`prev.png` (`lpc_beetle`, `lpc_goblin`, `lpc_golem`, `monkey_lad_in_magical_planet`, `rpg_enemies_11_dragons`).
  - 4 **likely** — exact classic Drupal auto-thumbnail dimensions (64×64/128×128) for assets that should be multi-frame sheets (`bat_sprite`, `bloody_mary`, `lpc_wolf_animation`, `simple_character_base_16x16`).
  - The other ~15 (e.g. `palette.png`, `oga-swm-bg-gradient-sky.png`) are almost certainly legitimate small assets, not thumbnails.
- **Root cause of the scraper bug:** `find_oga_download_link()` in both fetch scripts filters Drupal's `/styles/.../` derivative-thumbnail path, but doesn't catch OGA submissions whose *actual* attachment link is a small `preview.png`/`prev.png` companion image living directly under `/sites/default/files/` (no `/styles/` in the path). That case slipped through undetected until now.
- **What the agent produced:**
  - `scripts/project-status.py`: replaced the flat SUSPECT flag with a tiered CONFIRMED / LIKELY / worth-checking triage backed by real dimensions + manifest cross-reference, plus a summary count printed each run.
  - `scripts/asset-fetch.py` and `scripts/asset-fetch-bulk.py`: `find_oga_download_link()` now deprioritizes `preview`/`prev`-named candidate URLs in favor of other same-page links, and any download that still matches gets tagged `downloaded-preview-only` (definitive) instead of the old ambiguous `downloaded-unverified`.
  - New `docs/BUGS_IMPROVEMENT_GUIDE.md` entry (AST-013) recording the full triage and the concrete re-fetch checklist for whoever has real network access next.
- **Human review/changes:** Pending review; all script changes were syntax-checked and re-run against the live repo tree in-session (`python scripts/project-status.py` confirmed the new tiered counts: 5 confirmed / 4 likely / 23 low-priority, down from 24 undifferentiated).
- **Outcome:** 🟡 partial — detection and scraper hardening complete and verified; actual asset re-fetch is blocked by this environment's network policy and remains for a session with real network access.
- **Anything worth remembering:** A "24 suspect files" alert sounds alarming but was mostly noise — always check whether a heuristic's false-positive rate has been measured before trusting its count. Byte size alone is a bad proxy for "thumbnail" when the asset is indexed-palette pixel art; pixel dimensions + the manifest's own recorded fetch URL are much stronger, verifiable signals.

### 2026-07-08 — Documentation refinement and code review prep

- **Tool used:** Claude / Cascade
- **Goal:** Refine all Markdown documentation to track project progress, wire in existing screenshots, and prepare a thorough code review of the current working tree.
- **Prompt summary:** Used the documentation-polish prompt: docs-only scope, screenshot paths specified, stale placeholder backfill, prompt-library expansion, and a new session-log entry.
- **What the agent produced:**
  - Updated `README.md` with current features, architecture, project structure, a Screenshots gallery, and a refreshed roadmap.
  - Wired screenshots into `docs/ARCHITECTURE.md` (phase-one framework diagram) and `docs/UI_REFACTOR_BRIEF.md` (responsive scaling and HUD evidence).
  - Expanded `docs/PROMPT_LIBRARY.md` with six optimized, reusable prompts based on actual project sessions plus a "didn't work" lesson.
  - Backfilled ADR-001 and ADR-002 dates in `docs/DECISIONS.md`; added ADR-007 (living documentation as a first-class deliverable).
  - Updated `docs/AGENTIC_WORKFLOW.md` Quick Status, Session Log, prompt preview, decisions preview, and contribution map.
  - No code, config, or asset files were modified, preserving in-flight work by the VS Code agent.
- **Human review/changes:** Human scoped the work as docs-only and requested the code review focus; all doc changes were reviewed inline.
- **Outcome:** ✅ documentation merged; 🟡 code review findings pending
- **Time saved vs. hand-writing (rough estimate):** ~1–2 hours of cross-doc reconciliation and prompt curation
- **Anything worth remembering:** Treating docs as a bounded, verifiable deliverable prevents them from drifting behind the code. The prompt library is now a reusable asset for future agent sessions.

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