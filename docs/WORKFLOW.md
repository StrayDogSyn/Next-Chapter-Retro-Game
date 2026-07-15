# Project Workflow & Documentation Guide

**Purpose:** Single source of truth for project workflow, documentation standards, and agent collaboration guidelines.

**Last updated:** 2026-07-15

---

## Documentation Structure

This project uses a consolidated documentation system to avoid agent confusion.
Superseded or duplicated docs are moved to the historical archive rather than
deleted so the AI-Augmentation trail stays traceable.

### Core Documentation Files

| File | Purpose | Maintainer |
|------|---------|------------|
| `README.md` | Project overview, setup, current status, and roadmap | Human + Agent |
| `ARCHITECTURE.md` | System design, data flow, and technical decisions | Human + Agent |
| `WORKFLOW.md` | **This file** - Workflow guidelines and doc structure | Human |
| `AGENTIC_WORKFLOW.md` | Living record of AI-paired sessions, status, and contribution map | Human + Agent |
| `SESSION_LOG.md` | Full chronological archive of every pairing session | Agent |
| `PROMPT_LIBRARY.md` | Reusable prompts and prompt-effectiveness notes | Agent |
| `DECISIONS.md` | Architecture Decision Records (ADRs) | Agent |
| `CREDITS.md` | Asset licensing and attribution | Agent (script-generated) |
| `ASSET_SOURCES.md` | Asset sourcing plan and manifests | Human |
| `BUGS_IMPROVEMENT_GUIDE.md` | Tracked bugs, QA findings, and improvement roadmap | Agent |
| `BETA_TESTING.md` | Beta-tester instructions, known limitations, and bug-filing guide | Human + Agent |
| `MASTER_BUILD_SPEC.md` | Forward build plan and phase-gate verification checklist | Human + Agent |

### Historical Documentation (Archive)

| Path | Purpose |
|------|---------|
| `docs/archive/historical/session-briefs/` | Point-in-time implementation briefs that are no longer active docs |
| `docs/archive/historical/legacy-imports/` | Preserved documents imported from retired branches/worktrees |
| `docs/archive/historical/README.md` | Index of all archived files |

---

## Agent Collaboration Guidelines

### For AI Agents Working on This Project

1. **Documentation Updates:** Only update files listed in "Core Documentation Files" above
2. **No Parallel Systems:** Extend existing files, don't create duplicate documentation paths
3. **Ground Truth Verification:** Always run `python scripts/project-status.py` before claiming completion
4. **Status Reporting:** Update the status table in `README.md`, not deprecated workflow files

### Session Documentation Template

After each work session:

1. Add a full entry to `docs/SESSION_LOG.md`.
2. Add or update reusable prompts in `docs/PROMPT_LIBRARY.md`.
3. Record any architecture/process decision in `docs/DECISIONS.md`.
4. Update `docs/AGENTIC_WORKFLOW.md` quick status and recent sessions table.
5. Update root `README.md` only when project-facing state (features/stack/roadmap/deploy posture) changed.

Optional accelerator:
- For repeatable docs maintenance, run `.github/prompts/documentation-governance-sync.prompt.md`.

---

## Key Architecture Decisions (ADRs)

### ADR-001: Python Service Isolation
- **Decision:** Python runs as standalone FastAPI service, not embedded in Next.js
- **Reasoning:** Clean separation of concerns, demonstrates software diversity
- **Implementation:** `/python-service` with `/generate-level` and `/loot/roll` endpoints

### ADR-002: No Game Engine Libraries
- **Decision:** Raw HTML5 Canvas + requestAnimationFrame, no Phaser/PixiJS
- **Reasoning:** Demonstrates fundamental understanding rather than configuration
- **Implementation:** Custom render loop in `components/GameCanvas.tsx`

### ADR-003: Client-Side Loot Fallback
- **Decision:** Python service is authoritative, client has minimal fallback
- **Reasoning:** Demo fragility - game must work even if Python service is down
- **Implementation:** Loot tagged with `rolledBy: "python-service" | "client-fallback"`

### ADR-004: Single-Screen Rooms
- **Decision:** 24 single-screen rooms, no scrolling camera
- **Reasoning:** Reduces engine complexity while demonstrating Metroidvania structure
- **Implementation:** ASCII tile maps in `lib/game/world.ts`

### ADR-005: Deterministic Asset Pipeline
- **Decision:** Script-based asset processing with metadata JSON
- **Reasoning:** Reproducible asset generation, prevents frame math drift
- **Implementation:** `scripts/prepare-assets.py` + `public/sprites/spritemeta.json`

### ADR-006: Unified Input Interface
- **Decision:** Single InputState for keyboard + gamepad
- **Reasoning:** Avoids duplicating input logic in game loop
- **Implementation:** `lib/game/input.ts` with per-frame gamepad polling

### ADR-007: Consolidated Documentation
- **Decision:** Single workflow file to prevent agent confusion
- **Reasoning:** Multiple overlapping documentation files were causing confusion
- **Implementation:** This consolidated WORKFLOW.md file

### ADR-008: Seeded Deterministic RNG (no external randomness APIs)
- **Decision:** All gameplay randomness derives from one per-run seed phrase (e.g. `WOLF-4207`) via `lib/game/rng.ts` (xmur3 + sfc32); subsystems use forked streams (`combat`, `loot`, `shop`, `vfx`). Rejected: external randomness API calls at runtime — wrong tool on static hosting (latency, rate limits, offline death, and no reproducibility).
- **Reasoning:** *Before:* `runSeed = Math.floor(Math.random() * 1e6)` — unreproducible runs, useless bug reports. *After:* seed phrase surfaced in HUD state → shareable runs, daily-challenge capability (`dailySeed()`), and "seed X, room 3" bug reports that replay exactly. Stream forking means opening an extra chest cannot shift combat crit sequences. Pity timer rides the existing luck formula (identical on Python + fallback paths per ADR-003) as bonus effective luck — +15 per sub-rare drop, capped at +300, reset on rare+ — so pity works on both roll paths with zero roller changes.
- **Implementation:** `lib/game/rng.ts`; `game.ts` root `Rng` + forked streams replacing all `Math.random()` call sites; `rollLoot()` pity accounting; `seed` field in HUD snapshot. Verified: same-seed sequence match, stream isolation, `tsc --strict`, longest rare+ drought 18 over 2,000 simulated opens.

### ADR-009: Assets Served From public/assets/extracted (build-time extraction)
- **Decision:** Asset zips in `assets/` are unpacked by `scripts/asset-extract.py` into `public/assets/extracted/<kebab-slug>/` with a generated `manifest.json`; the game discovers assets from the manifest instead of hardcoding paths.
- **Reasoning:** Next.js only serves files under `public/` — anything loaded from repo-root `assets/` works in local screenshots and ships blank on GitHub Pages. Manifest paths are public-relative so the Pages `BASE_PATH` prefix applies cleanly. Extraction guards against zip-slip and strips `__MACOSX`/`Thumbs.db` junk.
- **Implementation:** `scripts/asset-extract.py`; 10 packs / 652 files extracted 2026-07-08.

---

## Effective Prompts for This Project

### Scaffold Prompt
```text
Build a retro SNES-styled 2D platformer as a full-stack TypeScript + Python project.
Deliverables:
- Next.js 14 App Router project in `/app`, `/components`, `/lib`, `/public`
- Python FastAPI service in `/python-service` with justified endpoints
- Raw HTML5 Canvas render loop (no Phaser/PixiJS)
- Sprite animation state machine
- Keyboard + gamepad input
- README and ARCHITECTURE.md
Constraints:
- Python must have a defensible reason to exist
- Keep codebase small and explicit
- One-line comment per file
```

### Bug Fix Prompt
```text
Perform thorough code review focusing on:
- Logic errors and edge cases
- Race conditions and resource management
- API contract violations
For each bug:
1. Reproduce with minimal harness
2. Fix root cause upstream
3. Add regression test
4. Run `npx tsc --noEmit` and `python scripts/project-status.py`
5. Report honestly if uncertain
```

### Documentation Update Prompt
```text
Update project documentation only. Do not modify code.
1. Update README.md with current feature set and status
2. Update ARCHITECTURE.md if technical changes were made
3. Add session entry to README.md following the template
4. Run `python scripts/project-status.py` and include verification
```

---

## Verification Commands

Always run these before claiming completion:

```bash
# TypeScript compilation
npx tsc --noEmit

# Linting
npm run lint

# Ground truth verification
python scripts/project-status.py

# Build test
npm run build
```

---

## Archiving Old Documentation

When a core doc is superseded by a consolidated version or a one-time brief has
been addressed, **move it to `docs/archive/historical/`** rather than deleting it.
The AI-Augmentation process is itself a deliverable; preserving historical docs
lets reviewers trace how decisions evolved.

1. Move superseded briefs to `docs/archive/historical/session-briefs/`.
2. Move imported legacy docs to `docs/archive/historical/legacy-imports/`.
3. Update `docs/archive/historical/README.md` so the index lists every archived file.
4. Update any cross-references that broke because of the move.
5. Never delete a doc unless it is an exact byte-for-byte duplicate and is already
   present in the archive.

Status authority rule:
- Repo-root `STATUS.txt` is canonical (machine-generated by `scripts/project-status.py`).
- `docs/STATUS.txt` is a redirect stub only; historical dumps belong under `docs/archive/historical/legacy-imports/`.

---

This consolidated workflow system prevents agent confusion while maintaining all essential project documentation.
