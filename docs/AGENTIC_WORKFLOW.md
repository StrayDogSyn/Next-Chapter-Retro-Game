# Agentic Workflow — Living Documentation

> **Purpose:** This is the working record of how this project was built in collaboration with an AI coding agent — what was asked, what came back, what was kept, changed, or thrown out, and why. It's updated after every pairing session, not written retroactively at submission time.
>
> **Last updated:** _2026-07-15 (RetroVania start-screen repair and documentation truth sync)_
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
- [Linked Documents](#linked-documents)

---

## How to Use This Doc

<details>
<summary><strong>Click to expand: update checklist (do this after every pairing session)</strong></summary>

1. Add a row to the [Session Log](#session-log) — date, tool, what you asked for, what you got.
2. If the prompt is reusable or taught you something about prompting, add it to [docs/PROMPT_LIBRARY.md](PROMPT_LIBRARY.md).
3. If the agent's output changed the architecture or you overrode it, log it in [docs/DECISIONS.md](DECISIONS.md).
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
| 2026-07-15 | Windsurf Cascade | RetroVania start-screen repair + comprehensive documentation truth sync | Supplied visual regression evidence and requested archive-first repository documentation refresh | Fixed full-container canvas placement/title/watermark sources; synchronized living docs, README, beta guidance, QA finding, prompt pattern, and ADR | 🟡 edits complete; fresh visual/command verification pending | See [SESSION_LOG.md](SESSION_LOG.md) |
| 2026-07-15 | GitHub Copilot | Documentation governance sync: canonicalize v0.2.0 prompt section + archive duplicate variant note | Requested archive-first cleanup, living-doc refresh, and link validation | Archived duplicate prompt-section variant note under `docs/archive/historical/legacy-imports/`, updated workflow/session/prompt/bugs/beta/readme consistency | ✅ docs synchronized | See [SESSION_LOG.md](SESSION_LOG.md) |
| 2026-07-15 | GitHub Copilot | Documentation governance sync: archive stale status doc + align living process docs | Requested archive-first docs maintenance and reusable prompt extraction | Archived superseded docs/STATUS snapshot into historical archive, refreshed living docs and README, and added `.github/prompts/documentation-governance-sync.prompt.md` | ✅ docs synchronized | See [SESSION_LOG.md](SESSION_LOG.md) |
| 2026-07-14 | GitHub Copilot | Documentation governance follow-up (semantic screenshots + visual progression timeline) | Requested professional README visuals and preserved iteration history | Replaced README primary screenshots with semantically named captures; created docs/VISUAL_PROGRESSION.md to preserve legacy-to-current evolution | ✅ docs synchronized | See [SESSION_LOG.md](SESSION_LOG.md) |
| 2026-07-14 | GitHub Copilot | Documentation governance sync (living docs + stale-claim cleanup + link validation) | Directed docs-only maintenance pass | Updated SESSION_LOG/AGENTIC_WORKFLOW/PROMPT_LIBRARY/BETA_TESTING; confirmed BUGS/README consistency with current CR status | ✅ docs synchronized | See [SESSION_LOG.md](SESSION_LOG.md) |

Full history: [docs/SESSION_LOG.md](SESSION_LOG.md) — keep this table above to the 3-5 most recent sessions, archive the rest there.

</details>

## Prompt Library

A running collection of prompts that worked (and a few that didn't) — full detail lives in [docs/PROMPT_LIBRARY.md](PROMPT_LIBRARY.md).

<details>
<summary><strong>Preview: top prompts by usefulness</strong></summary>

- **Scaffold prompt** — structured, file-by-file spec → clean PR, minimal rework
- **Code review prompt (branch vs main)** — scoping to a branch diff with explicit focus criteria cuts noise significantly
- **Documentation update prompt** — README + ARCHITECTURE refresh, session entry, link validation
- **Canvas start-screen truth-sync prompt** — diagnose CSS replaced-element sizing, then synchronize canvas title, metadata, watermark, README, and beta guidance

</details>

## Decisions & Rationale

Architecture Decision Records (ADRs) — every time the agent's suggestion was accepted, modified, or rejected, it's logged with reasoning in [docs/DECISIONS.md](DECISIONS.md).

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
- **What didn't:** Across two separate coding-agent sessions (Windsurf, then VS Copilot), both narrated task completion — "moved files," "created docs/CREDITS.md," "regenerated the manifest" — that didn't match the actual file tree or file contents afterward. In one case an agent's own script-fix summary was pasted back verbatim in a later turn as if it were a fresh run, with identical output, suggesting the fix had never actually been applied.
- **What also didn't:** Stale tracking tables (`docs/BUGS_IMPROVEMENT_GUIDE.md`) kept generating prompts that assumed features were missing when code already fixed them. A senior code review surfaced additional unverified claims (seed-entry UI, offline loot-source behavior) that had drifted from the code.
- **What I'd prompt differently next time:** Build a ground-truth verification step in from the start rather than bolting it on after multiple rounds of mismatched claims. `scripts/project-status.py` now exists for exactly this — it reads the filesystem/git state directly instead of relying on any agent's self-report, and every pairing session should run it before accepting a "done." For documentation sessions, cross-check every asserted UI/behavior claim against the current source before writing it down.

</details>

## Linked Documents

| Doc | Purpose |
|---|---|
| [SESSION_LOG.md](SESSION_LOG.md) | Full chronological pairing session history |
| [PROMPT_LIBRARY.md](PROMPT_LIBRARY.md) | Reusable prompts + what made them effective |
| [DECISIONS.md](DECISIONS.md) | ADR-style record of architecture decisions |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design and the Python-service rationale |
| [CREDITS.md](CREDITS.md) | Third-party sprite/audio sourcing, licenses, and attribution status |
| [WORKFLOW.md](WORKFLOW.md) | Project workflow, documentation structure, and agent collaboration guidelines |
| [archive/historical/README.md](archive/historical/README.md) | Archived/deprecated documentation index |
| [../STATUS.txt](../STATUS.txt) | Ground-truth project snapshot — generated by `scripts/project-status.py`, not narrated by any agent |