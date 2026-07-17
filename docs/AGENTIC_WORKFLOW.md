# Agentic Workflow — Living Documentation

> **Purpose:** This is the working record of how this project was built in collaboration with an AI coding agent — what was asked, what came back, what was kept, changed, or thrown out, and why. It's updated after every pairing session, not written retroactively at submission time.
>
> **Last updated:** _2026-07-16 (added Project Post-Mortem, accuracy-checked against SESSION_LOG.md)_
> **Maintainer:** StrayDogSyn

---

## Table of Contents

- [How to Use This Doc](#how-to-use-this-doc)
- [Quick Status](#quick-status)
- [Session Log](#session-log)
- [Prompt Library](#prompt-library)
- [Decisions & Rationale](#decisions--rationale)
- [Human vs. Agent Contribution Map](#human-vs-agent-contribution-map)
- [Retro & Learnings](#retro--learnings)
- [Project Post-Mortem](#project-post-mortem)
- [Linked Documents](#linked-documents)

---

## How to Use This Doc

<details>
<summary><strong>Click to expand: update checklist (do this after every pairing session)</strong></summary>

1. Add a row to the [Session Log](#session-log) — date, tool, what you asked for, what you got.
2. If the prompt is reusable or taught you something about prompting, add it to [docs/archive/PROMPT_LIBRARY.md](archive/PROMPT_LIBRARY.md).
3. If the agent's output changed the architecture or you overrode it, log it in [docs/archive/DECISIONS.md](archive/DECISIONS.md).
4. Update the [Human vs. Agent Contribution Map](#human-vs-agent-contribution-map) — don't let this go stale, it's the part reviewers will actually read closely.
5. One line in [Quick Status](#quick-status) if the overall project state shifted.
6. **Before trusting any agent's "done" summary, run `python scripts/project-status.py`.** It reads the actual filesystem and git state — no self-reporting involved — and appends a timestamped snapshot to `STATUS.txt`. This project hit multiple cases where an agent narrated completed work that the file tree didn't back up; this step exists specifically to catch that class of gap before it costs you a debugging cycle.

</details>

## Quick Status

| Area | State |
|---|---|
| Frontend game (24 rooms, combat, loot, 3 bosses) | ✅ playable; Space Marine jump/gating rounds and seeded room-order shuffle landed (ADR-027/ADR-028/ADR-029) |
| Python service (loot + save endpoints) | 🟢 authoritative — verified on the wire 2026-07-13 |
| Live deployment | 🟢 https://straydogsyn.github.io/Next-Chapter-Retro-Game/ (Pages → Render → Neon) |
| Sprite/audio assets | 🟢 wired via scripts/prepare-assets.py + public/assets/manifest.json |
| Input system (keyboard + gamepad + touch) | 🟢 unified InputState; touch controls added 2026-07-13 |
| Level/world system | 🟢 24 single-screen rooms, 5 zones, validated exit graph |
| Enemy AI | 🟢 4 regular kinds + 3 bosses with distinct patterns |
| Weapon/loot system | 🟢 data-driven, Python-authoritative (280 combos; 6/6 prefix effects wired) |
| Start screen / branding | 🟡 source repaired: full-container canvas, canonical RetroVania title, square StrayDog v0.2.0 watermark; fresh deployed capture pending |
| Documentation | 🟢 living docs updated 2026-07-15; archive established at docs/archive/historical; title/features/roadmap truth-synced |

## Session Log

<details open>
<summary><strong>Click to collapse/expand full session table</strong></summary>

| Date | Tool | Task | Human Role | Agent Role | Outcome | Notes |
|---|---|---|---|---|---|---|
| 2026-07-17 | Claude Code | Discovered and fixed: submission portal (`index.html`) was never actually deployed — CI only uploads Next.js's `out/`, which never included it | Reported the README's entry-point link wasn't reaching the portal | Root-caused via reading `.github/workflows/deploy.yml` directly and confirming `styles/tokens.css` 404s live; added a `prebuild` hook (`scripts/copy-portal-assets.mjs`) that mirrors the portal into `public/portal/` so it rides along in the existing build with no workflow changes; live-verified via the local preview server with zero 404s | ✅ merged | See [SESSION_LOG.md](archive/SESSION_LOG.md) |
| 2026-07-16 | Claude Code | Visual juice sprint: sprite-backed projectile/muzzle/impact FX, pickup icons, and an animated mech boss replacement | Supplied the "Visual Juice, FX Integration & Mech Replacement" mission prompt | Wired `fx_projectile`/`fx_muzzle`/`fx_explosion`/`fx_diewhirl`/`mech_gunner`/`pickupIcons` sheets through `prepare-assets.py` and `game.ts`; replaced the static WAR MECH with an animated boss and multi-frame death explosion; live-verified via a temporary window-exposed test hook after a seeded-room-shuffle navigation detour proved unreliable | ✅ merged | See [SESSION_LOG.md](archive/SESSION_LOG.md) |
| 2026-07-16 | Claude Code | One-way platform diagnostic sprint (audit) + boss werewolf scale fix at the source | Pushed back with a structured re-audit request, then supplied the original sprite source archive | Confirmed the platform system clean via an instrumented diagnostic trap; fixed werewolf scale flicker with `crop_to_content`/`normalize_anim_scale` at the asset-prep source instead of a draw-time compensation table | ✅ merged | See [SESSION_LOG.md](archive/SESSION_LOG.md) |
| 2026-07-16 | Claude Code | One-way platforms removed game-wide (deliberate design change, not a bug fix) | Directed removal despite three prior clean audits, after weighing agent pushback | Converted `-` tiles to solid stone, preserved the ability-gated `T_DOOR_DASH`/`T_DOOR_DOUBLEJUMP` platforms, verified zero reachability regressions across all 24 rooms | ✅ merged | See [SESSION_LOG.md](archive/SESSION_LOG.md) |
| 2026-07-15 | Claude Code | Entity-interaction sprint audit: 2 of 4 claimed bugs refuted, 1 real bug found, 1 gap confirmed | Supplied a 4-item bug report drafted from screenshots | Refuted solid-NPC and broken-platform-landing claims with live proof; root-caused flaky interact triggers to a React StrictMode zombie game-loop bug and fixed it; redesigned shrine/shopkeeper primitives to a sci-fi theme | ✅ merged | See [SESSION_LOG.md](archive/SESSION_LOG.md) |

Full history: [docs/archive/SESSION_LOG.md](archive/SESSION_LOG.md) — keep this table above to the 3-5 most recent sessions, archive the rest there.

</details>

## Prompt Library

A running collection of prompts that worked (and a few that didn't) — full detail lives in [docs/archive/PROMPT_LIBRARY.md](archive/PROMPT_LIBRARY.md).

<details>
<summary><strong>Preview: top prompts by usefulness</strong></summary>

- **Scaffold prompt** — structured, file-by-file spec → clean PR, minimal rework
- **Code review prompt (branch vs main)** — scoping to a branch diff with explicit focus criteria cuts noise significantly
- **Documentation update prompt** — README + ARCHITECTURE refresh, session entry, link validation
- **Canvas start-screen truth-sync prompt** — diagnose CSS replaced-element sizing, then synchronize canvas title, metadata, watermark, README, and beta guidance

</details>

## Decisions & Rationale

Architecture Decision Records (ADRs) — every time the agent's suggestion was accepted, modified, or rejected, it's logged with reasoning in [docs/archive/DECISIONS.md](archive/DECISIONS.md).

<details>
<summary><strong>Preview: latest decisions</strong></summary>

| # | Decision | Agent Suggested? | Outcome |
|---|---|---|---|
| ADR-001 | Python service isolated from Next.js API routes rather than embedded | Yes | Accepted — see full ADR |
| ADR-014 | jumpPower cap to preserve double-jump gate identity | Yes | Accepted |
| ADR-016 | Asset-utilization pass — event-to-stem mapping conventions | Yes | Accepted |
| ADR-017 | Replayability architecture — run summary + daily seed | Yes | Accepted |
| ADR-028 | Ability-gating restored via explicit door tiles (decoupled from jump physics) | Yes | Accepted |
| ADR-029 | Seeded room-order shuffle via graph relabeling (no procgen rewiring) | Yes | Accepted |
| ADR-030 | Prompt-library canonicalization rule for v0.2.0 section | Yes | Accepted |
| ADR-031 | Full-container start-screen sizing + canonical RetroVania branding truth sources | Yes | Accepted |

</details>

## Human vs. Agent Contribution Map

This is the honesty section. Bootcamp reviewers care about this more than the code itself.

<details>
<summary><strong>Click to expand contribution breakdown</strong></summary>

| Component | Primary Author | Human Edits After |
|---|---|---|
| Project scaffold | Agent (prior session) | Reviewed, minor path fixes |
| Game loop / render logic | Agent (current) | Refactored from placeholder to full multi-level, platforms, combat |
| Python service (loot generation) | Agent (current) | Extended from simple level generation to rarity tiers + stat rolls |
| Level/tilemap system | Agent (current) | 100% agent-authored; human verified via project-status.py |
| Enemy AI system | Agent (current) | 100% agent-authored; includes walking, chasing, attacking, health |
| Boss AI system | Agent (current) | 100% agent-authored; includes multi-phase behavior, attack patterns |
| Weapon/loot system | Agent (current) | 100% agent-authored; data-driven JSON stat model |
| Input system (keyboard + gamepad) | Agent (current) | Extended from keyboard-only to unified InputState interface; gamepad polling in render loop |
| Start-screen responsive layout and branding repair | Agent (Windsurf Cascade) | Human supplied screenshot evidence and requested exact title/watermark correction |
| This documentation system | Human (prompted structure to Claude in prior session) | Agents maintain status tables, session log, README, prompt library, ADRs, QA guide, and archive index |

**Guiding rule:** if a component is >70% agent-generated, say so plainly here rather than letting the README imply otherwise.

**Specific note on this session's work:** The agent autonomously built all five major gameplay systems (input, levels, enemies, loot, boss) from scratch, verified compilation and endpoint connectivity, and documented its own work in SESSION_LOG.md. Human role was limited to: initial prompt scope, periodic project-status.py verification runs, and final session report writing.

</details>

## Retro & Learnings

<details>
<summary><strong>Click to expand — what worked, what didn't</strong></summary>

- **What worked:** Splitting sprite/SFX sourcing from asset-download automation into two distinct sessions kept scope manageable. Using a scraper script rather than manual downloads made the licensing/attribution tracking systematic instead of ad hoc.
- **What didn't:** Across two separate coding-agent sessions (Windsurf, then VS Copilot), both narrated task completion — "moved files," "created docs/archive/CREDITS.md," "regenerated the manifest" — that didn't match the actual file tree or file contents afterward. In one case an agent's own script-fix summary was pasted back verbatim in a later turn as if it were a fresh run, with identical output, suggesting the fix had never actually been applied.
- **What also didn't:** Stale tracking tables ([docs/archive/BUGS_IMPROVEMENT_GUIDE.md](archive/BUGS_IMPROVEMENT_GUIDE.md)) kept generating prompts that assumed features were missing when code already fixed them. A senior code review surfaced additional unverified claims (seed-entry UI, offline loot-source behavior) that had drifted from the code.
- **What I'd prompt differently next time:** Build a ground-truth verification step in from the start rather than bolting it on after multiple rounds of mismatched claims. `scripts/project-status.py` now exists for exactly this — it reads the filesystem/git state directly instead of relying on any agent's self-report, and every pairing session should run it before accepting a "done." For documentation sessions, cross-check every asserted UI/behavior claim against the current source before writing it down.

</details>

## Project Post-Mortem

> Every claim below is cross-checked against [SESSION_LOG.md](archive/SESSION_LOG.md) rather than narrated from memory — the same ground-truth discipline the rest of this doc holds itself to (see [Retro & Learnings](#retro--learnings) on why that check matters).

### 1. Agentic Workflow & Architecture Strategy

Development used a multi-agent workflow across seven tools, split by role rather than used interchangeably:

- **Claude Code, GitHub Copilot / VS Code CoPilot, and Windsurf Cascade** did the hands-on implementation work — coding, debugging, and verification-gated feature sprints. Their specific, session-by-session contributions are the [Session Log](#session-log) table above; the FX/mech-boss sprint, the StrictMode fix, the platform-removal decision, and the asset-pipeline work described below were all Claude Code sessions, and are traceable to specific dated entries in SESSION_LOG.md.
- **Gemini, Perplexity, and Comet Assistant (Browser)** handled prompt drafting, web search for open-source art/audio assets, and lightweight in-browser verification — work that didn't need a full implementation agent's context budget.
- **Devin Cloud** took on supplementary background/investigation tasks outside the main implementation loop.

**Documentation as source of truth:** [docs/MASTER_BUILD_SPEC.md](MASTER_BUILD_SPEC.md), this file, and [docs/archive/SESSION_LOG.md](archive/SESSION_LOG.md) were kept current throughout rather than reconstructed at submission time, specifically to keep long agent sessions grounded and prevent regressions from an agent re-deriving context incorrectly.

**Test-driven execution:** no agent output was accepted on narration alone. Every sprint closed with `npm test`, `npx tsc --noEmit`, and `python scripts/project-status.py` — the last one reads actual filesystem/git state rather than any agent's self-report, which is exactly what caught the false-completion pattern documented in [Retro & Learnings](#retro--learnings).

### 2. Audits & Deep Debugging

- **The StrictMode zombie loop.** Interaction triggers (shrine/shopkeeper activation) were failing intermittently — roughly 50% of the time, independent of how long a key was held. Live-instrumented tracing (frame-counter logging across repeated runs) caught the tell: the frame counter would reset mid-sequence with the player snapped back to spawn, proving a *second* `Game` instance was running its own physics/input/audio loop in parallel. Root cause: React 18 StrictMode's dev-only double-mount calls `Game.destroy()` on the first instance while its async `start()` (sprite/audio preloading) is still in flight; `destroy()` had no way to signal "abort," so `start()` finished anyway and spawned a zombie `requestAnimationFrame` loop plus a zombie `InputManager` listening on the same `document` key events for the rest of the session. Fix: a `private destroyed` flag on the `Game` class, checked immediately before `loop.start()` in `start()` — a plain guard clause, not a React hook (`Game` is intentionally a framework-free class per ADR-002, so no `useRef` lives inside it). This also explained a broader pattern of previously-isolated "intermittent/flaky" reports (duplicate audio, inconsistent input) that had been investigated one at a time before the shared root cause was found.
- **Bypassing the room-shuffle RNG for FX testing.** ADR-029's seeded room-order shuffle means a room's authored ID (e.g., the mech boss's home room) doesn't reliably map to the same content across runs, which made "walk to the boss and test the new FX" an unreliable test plan — one attempt hardcoded a room ID and found no boss there; a second, scripted-navigation attempt died to a stray bat mid-walk before arriving. The fix that actually worked: temporarily exposing the live `Game` instance on `window` with a debug spawn/kill hook, so entities and FX could be triggered directly in whatever room a test happened to load into, sidestepping level layout entirely. All temporary hooks were removed before merge, confirmed via a final grep for the debug markers.
- **Compliance auditing before submission.** Verification gates (`npm test`, `tsc --noEmit`, `project-status.py`) were re-run after every doc/asset change, not just after code changes, and a root-level `index.html` submission portal exists specifically so evaluators reach a working entry point regardless of Next.js static-export routing quirks.

### 3. Iteration & Pragmatic Scope Management (Cutting the Fat)

- **The one-way-platform pivot.** Beta feedback claimed a collision bug in one-way drop-through platforms. Three separate diagnostic passes — including a live instrumented trap stress-tested across ~30 jump/fall cycles in the platform-densest rooms — found the system clean, with zero reproductions. Rather than silently comply or silently refuse, the audit findings were laid out plainly and the trade-off was made explicit: removing one-way platforms entirely would guarantee 100% collision reliability at the cost of the drop-through mechanic. The user made an informed call to proceed anyway; the change was then scoped carefully (converting plain platforms to solid stone while preserving the ability-gated dash/double-jump door tiles that share the same rendering path) and verified against the world's reachability audit before merge.
- **Loot readability over complexity.** An early pass at dropped-powerup icons used color-coded capsules; direct pixel measurement showed the color differentiation lived only in tiny end-caps, not the dominant body color, so they read as visually identical at gameplay speed. Replaced with a legible letter-badge set (health/currency/key/double-jump/dash) instead.
- **Muzzle-flash simplification.** A full rotation-band mapping of the muzzle-flash sheet (matching projectile travel angle frame-by-frame) was scoped and then shelved in favor of one tightly-cropped static flash frame, shipping working visual feedback without the added risk of a more complex, less-tested rendering path.

### 4. Open-Source Asset Sourcing & Pipeline Integration

- **Sourcing:** replacing placeholder shapes and mismatched "ratchet" sprites meant sourcing permissively-licensed art from sites like OpenGameArt — tracked with attribution in [docs/archive/CREDITS.md](archive/CREDITS.md) and [assets/manifest.csv](../assets/manifest.csv).
- **Automated asset packing:** raw downloaded sheets never fit an engine's exact geometry out of the box, so `scripts/prepare-assets.py` parses, crops, scale-normalizes, and packs raw source art into production sheets. Every new pipeline section opens its source image and hard-fails with a measured-exact-size error if dimensions drift, so a bad crop offset fails loudly instead of shipping silently. The FX/mech-boss sheets (`fx_projectile`, `fx_muzzle`, `fx_explosion`, `fx_diewhirl`, `mech_gunner`, `pickupIcons`) were added this way, each crop region measured directly from the source pixels rather than trusted off a sheet's printed labels.
- **Unified metadata:** the script writes every sheet's cell size and animation frame layout into one `public/sprites/spritemeta.json`, which the TypeScript engine reads at runtime — so a new animated entity (like the mech boss's idle/attack rows, or the multi-frame boss-death explosion) is wired by adding data, not by hardcoding pixel offsets into the renderer.

## Linked Documents

| Doc | Purpose |
|---|---|
| [SESSION_LOG.md](archive/SESSION_LOG.md) | Full chronological pairing session history |
| [PROMPT_LIBRARY.md](archive/PROMPT_LIBRARY.md) | Reusable prompts + what made them effective |
| [DECISIONS.md](archive/DECISIONS.md) | ADR-style record of architecture decisions |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design and the Python-service rationale |
| [CREDITS.md](archive/CREDITS.md) | Third-party sprite/audio sourcing, licenses, and attribution status |
| [WORKFLOW.md](archive/WORKFLOW.md) | Project workflow, documentation structure, and agent collaboration guidelines |
| [archive/historical/HISTORICAL_CONTEXT.md](archive/historical/HISTORICAL_CONTEXT.md) | Archived/deprecated documentation index |
| [archive/historical/legacy-imports/status-root-snapshot-2026-07-16.txt](archive/historical/legacy-imports/status-root-snapshot-2026-07-16.txt) | Most recent archived root status snapshot captured during documentation cleanup |