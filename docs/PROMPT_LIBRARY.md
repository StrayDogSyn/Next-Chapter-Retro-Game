# Prompt Library

Reusable, effective prompts from this project's agentic workflow, with notes on *why* they worked — the goal is to build a personal pattern library, not just a scrapbook.

---

## How to add an entry

```markdown
### [Prompt name]
**Used for:** what task
**Tool:** which agent/model
**Effectiveness:** ⭐⭐⭐⭐☆ (rough gut rating)

**Prompt:**
> (paste the actual prompt)

**Why it worked / didn't:**
- Bullet the specific things that made the output good or bad — e.g. "specifying file structure prevented generic scaffolding" or "should have constrained the library choice, agent picked a heavy dependency I didn't want"
```

---

## Entries

### Scaffold prompt

**Used for:** Initial repo scaffold (Next.js + FastAPI structure, canvas render loop, sprite state machine)

**Tool:** GitHub Copilot cloud agent

**Effectiveness:** ⭐⭐⭐⭐☆

**Prompt:**
> Build a retro SNES-styled 2D platformer/showcase game as a full-stack TypeScript + Python project for a coding bootcamp capstone.
>
> Deliverables:
> - Next.js 14 App Router project in `/app`, `/components`, `/lib`, `/public`
> - Python FastAPI service in `/python-service` with one clearly justified endpoint that the frontend actually calls
> - Raw HTML5 Canvas render loop in a React component (no Phaser/PixiJS)
> - Sprite animation state machine with idle/walk/jump frames
> - Keyboard input handler
> - README, docs/ARCHITECTURE.md, and docs/AGENTIC_WORKFLOW.md living-doc stubs
>
> Constraints:
> - Python must have a defensible reason to exist, not be decorative
> - Keep the codebase small enough to reason about; prefer explicit code over heavy libraries
> - Every file gets a one-line comment explaining its role

**Why it worked:**
- Explicit file structure prevented the agent from inventing its own layout.
- Forcing "one clear reason Python exists" produced ADR-001 instead of a bolted-on backend.
- Listing deliverables as a checklist made the output reviewable against concrete criteria.

---

### Asset sourcing and pipeline prompt

**Used for:** Finding, downloading, packing, and attributing CC0 sprites and SFX

**Tool:** Claude + Windsurf / VS Copilot

**Effectiveness:** ⭐⭐⭐☆☆

**Prompt:**
> Source CC0/CC-BY sprites and SFX that fit a beast-transformation / sci-fi-soldier / Metroidvania aesthetic.
>
> Tasks:
> 1. Research real OpenGameArt and Freesound assets; shortlist candidates with license and source URL.
> 2. Write `scripts/asset-fetch.py` to download OpenGameArt assets and `scripts/asset-fetch-bulk.py` for batch hubs/searches.
> 3. Write `scripts/prepare-assets.py` to extract/crop/pack frames into `public/sprites/*.png` + `public/audio/*` and emit `public/sprites/spritemeta.json`.
> 4. Generate `assets/wired-assets.txt` as ground truth.
> 5. Rebuild `docs/CREDITS.md` from `wired-assets.txt` and the manifests.
> 6. After each step, run `python scripts/project-status.py` and paste the actual filesystem evidence; do not narrate completion without it.
>
> Watch for: thumbnail-derivative URLs on OpenGameArt (`/styles/`), GIF transparency indexes, and stale preview MP3s from Freesound.

**Why it worked / didn't:**
- Worked: specifying license + verification loop forced real downloads rather than fake "done" summaries.
- Didn't work perfectly: even with the loop, one session committed truncated/conflicted files because the verification output was ignored. Lesson: trust `project-status.py`, not the agent's summary.

---

### UI refactor handoff prompt

**Used for:** Responsive canvas scaling, persistent header/footer HUD, arrow-key reliability, GIF transparency fix

**Tool:** VS Code Copilot agent

**Effectiveness:** ⭐⭐⭐⭐⭐

**Prompt:**
> Refactor the UI layer only. Do not touch combat, loot, physics, or world data.
>
> 1. Make `components/GameCanvas.tsx` scale responsively: internal resolution stays 640×352, CSS/ResizeObserver scales to viewport, integer-multiple snaps when possible, `image-rendering: pixelated`.
> 2. Move the HUD out of the canvas: build `components/GameHeader.tsx` (HP, coins, weapon rarity, boss bar) and `components/GameFooter.tsx` (controls, input source, loot source, transient messages). Lift `HudSnapshot` state up to `app/page.tsx`.
> 3. Investigate the arrow-key reliability bug in `lib/game/input.ts`. Find the actual root cause before fixing; do not rebind keys or create a parallel input path.
> 4. Fix GIF transparency in `scripts/prepare-assets.py :: gif_frames()` so the demon-flower enemy loses its blue background.
> 5. Provide real browser screenshots for each fix and run `npx tsc --noEmit` and `python scripts/project-status.py`.
>
> Ground rule: no parallel systems. Extend existing files, don't create second canvas/input/HUD paths.

**Why it worked:**
- Diagnosing to the file/function level prevented symptom-chasing (the actual cause was the deleted inputHandler's blur bug).
- The "no parallel systems" rule preserved the architecture consolidated in earlier sessions.
- Requiring screenshots per task made verification concrete instead of claim-only.

Full brief: [UI_REFACTOR_BRIEF.md](UI_REFACTOR_BRIEF.md)

---

### Bug-fix / code review prompt

**Used for:** Independent review of `lib/game/game.ts` and related files for logic errors, race conditions, and parity issues

**Tool:** Claude / Cascade

**Effectiveness:** ⭐⭐⭐⭐⭐

**Prompt:**
> Perform a thorough code review of the current working tree. Focus on:
>
> - Logic errors and incorrect behavior
> - Edge cases and null/undefined references
> - Race conditions or concurrency issues
> - Security vulnerabilities and resource management
> - API contract violations and caching behavior
> - Violations of existing code patterns or conventions
>
> For each confirmed bug:
> 1. Reproduce it with a minimal harness or specific code path.
> 2. Fix the root cause upstream, not with a downstream workaround.
> 3. Add or update a regression test.
> 4. Run `npx tsc --noEmit`, `npm run lint`, and `python scripts/project-status.py`.
> 5. Report honestly if a finding is already covered or if you are uncertain.
>
> Do not report speculative issues. If git inspection is infeasible, explore the working tree directly.

**Why it worked:**
- The "reproduce before fix" rule caught a sibling bug in the chest path that the kill path had already solved.
- Forcing upstream fixes avoided fragile workarounds.
- The explicit "honest reporting" constraint prevented low-confidence noise.

---

### Combat effects wiring prompt

**Used for:** Implementing missing weapon prefix effects (burn, freeze, shock, curse)

**Tool:** Copilot CLI overnight agent

**Effectiveness:** ⭐⭐⭐⭐☆

**Prompt:**
> Implement the remaining weapon prefix effects in `lib/game/game.ts`.
>
> Required effects:
> - `burn`: periodic damage-over-time tick
> - `freeze`: temporary heavy slow
> - `shock`: short stun/slow plus a small chain splash to nearby enemies
> - `curse`: temporary vulnerability multiplier
> - Keep existing `crit` and `lifesteal` behavior intact.
>
> Also:
> - Add minimal in-combat status indicators (colored pips above affected enemies) so the effects are visible.
> - Do not weaken or remove existing tests.
> - Verify Python service authority with real network inspection (uvicorn access log + `source` tag).
> - Update `docs/ARCHITECTURE.md`, `docs/AGENTIC_WORKFLOW.md`, and `docs/CREDITS.md` to match the actual wired state.
> - Run `npx tsc --noEmit` and `python scripts/project-status.py`.

**Why it worked:**
- Bounding scope to combat only prevented scope creep into unrelated systems.
- Status indicators satisfied the "visible feedback" requirement without over-building a full particle system.
- The Python-authority verification step kept the authoritative-source contract honest.

---

### Documentation polish prompt

**Used for:** Updating README and living docs with screenshots, progress tracking, and prompt-library expansion

**Tool:** Claude / Cascade

**Effectiveness:** ⭐⭐⭐⭐☆

**Prompt:**
> Refine all Markdown documentation to track project progress. Do not modify any code, config, or asset files.
>
> Tasks:
> 1. Update `README.md` with current feature set, architecture, project structure, screenshots from `assets/img/screenshots`, and a refreshed roadmap.
> 2. Wire applicable screenshots into `docs/ARCHITECTURE.md`, `docs/UI_REFACTOR_BRIEF.md`, and other docs where relevant.
> 3. Backfill stale placeholders (dates, "_fill in_" fields) in ADRs and session logs.
> 4. Expand `docs/PROMPT_LIBRARY.md` with optimized, reusable prompts based on actual project sessions.
> 5. Add a current-session entry to `docs/SESSION_LOG.md`.
>
> Paths: from `docs/` files use `../assets/img/screenshots/...`; from root use `assets/img/screenshots/...`.

**Why it worked:**
- The explicit "docs only" boundary protected in-flight code from being touched.
- Specifying the relative-path convention prevented broken image links.
- Treating prompts themselves as a deliverable turned one-off session prompts into reusable patterns.

---

## Prompts that didn't work as well

### Vague "make it better" UI prompt

**Used for:** Early UI polish attempt before the refactor brief existed

**Tool:** GitHub Copilot cloud agent

**Effectiveness:** ⭐⭐☆☆☆

**Why it didn't work:**
- "Make the UI better" produced inconsistent, surface-level changes because the goal was unbounded.
- Without the "no parallel systems" rule the agent created overlapping HUD paths that had to be torn out later.
- Lesson: hand off UI work with explicit constraints, specific file pointers, and evidence requirements.
