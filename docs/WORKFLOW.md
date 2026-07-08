# Project Workflow & Documentation Guide

**Purpose:** Single source of truth for project workflow, documentation standards, and agent collaboration guidelines.

**Last updated:** 2026-07-08

---

## Documentation Structure

This project uses a consolidated documentation system to avoid agent confusion:

### Core Documentation Files

| File | Purpose | Maintainer |
|------|---------|------------|
| `README.md` | Project overview, setup, and current status | Human |
| `ARCHITECTURE.md` | System design, data flow, and technical decisions | Human + Agent |
| `WORKFLOW.md` | **This file** - Workflow guidelines and doc structure | Human |
| `CREDITS.md` | Asset licensing and attribution | Agent (script-generated) |
| `ASSET_SOURCES.md` | Asset sourcing plan and manifests | Human |

### Historical Documentation (Archive)

| File | Purpose | Status |
|------|---------|--------|
| `AGENTIC_WORKFLOW.md` | **DEPRECATED** - Content moved here | ⚠️ Remove |
| `SESSION_LOG.md` | **DEPRECATED** - Session history archived | ⚠️ Remove |
| `PROMPT_LIBRARY.md` | **DEPRECATED** - Prompts moved to WORKFLOW.md | ⚠️ Remove |
| `DECISIONS.md` | **DEPRECATED** - ADRs moved to ARCHITECTURE.md | ⚠️ Remove |

---

## Agent Collaboration Guidelines

### For AI Agents Working on This Project

1. **Documentation Updates:** Only update files listed in "Core Documentation Files" above
2. **No Parallel Systems:** Extend existing files, don't create duplicate documentation paths
3. **Ground Truth Verification:** Always run `python scripts/project-status.py` before claiming completion
4. **Status Reporting:** Update the status table in `README.md`, not deprecated workflow files

### Session Documentation Template

After each work session, update `README.md` with:

```markdown
### YYYY-MM-DD - [Session Title]

- **Work completed:** Brief description of changes
- **Files modified:** List of key files changed
- **Verification:** `python scripts/project-status.py` output summary
- **Next steps:** What remains to be done
```

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

## Cleanup Instructions

**To be completed after this file is created:**

1. Remove deprecated files:
   - `docs/AGENTIC_WORKFLOW.md`
   - `docs/SESSION_LOG.md` 
   - `docs/PROMPT_LIBRARY.md`
   - `docs/DECISIONS.md`

2. Update any remaining cross-references to point to this file

3. Archive any essential content from deprecated files in appropriate locations

---

This consolidated workflow system prevents agent confusion while maintaining all essential project documentation.
