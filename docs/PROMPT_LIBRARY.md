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

## v0.2.0 Overhaul & Polish Prompts

**Canonicalization note (2026-07-15):** Keep exactly one active v0.2.0 prompt section under this heading. If a variant section is superseded during future governance passes, archive it under `docs/archive/historical/legacy-imports/` rather than keeping parallel active copies.

### Template 1: Full-Bleed Responsive Viewport

```markdown
**Objective:** Remove the strict letterboxing constraints and update the game wrapper to responsively fill the browser container for various screen sizes.

**Instructions:**
1. In `app/globals.css`, locate `#game-stage-viewport`. Remove `max-width`, `aspect-ratio`, and `margin: auto`.
2. Implement Full-Bleed Sizing: Use `width: 100vw; height: 100dvh; margin: 0; padding: 0; position: relative; overflow: hidden;`.
3. Verify `.game-canvas-stage` and `<canvas>` are set to `width: 100%; height: 100%; position: absolute; top: 0; left: 0;`.
```

### Template 2: The "Space Marine" Physical Overhaul

```markdown
**Objective:** Completely overhaul the player character's physical scale, jump reach, and environmental clearance.

**Instructions:**
1. **Hero Scale & Hitbox:** Increase `pw` and `ph` for a heavier presence. Proportionally increase `drawW` and `drawH` to prevent visual clipping. Update `dx` and `dy` anchors.
2. **Jump Physics Buff:** Buff base jump (adjust `JUMP_BASE_VELOCITY` or `GRAVITY`) to guarantee apex clears 4 to 5 tiles. Update envelope constants (`JUMP_RISE_TILES`, etc.) in `levelLoader.ts`.
3. **Widen Door Apertures:** Adjust the parser logic in `levelLoader.ts` to increase vertical/horizontal clearance of doors and choke points by 1-2 tiles.
4. **Tests:** Update `jump-physics.test.ts` to match the new simulated jump heights.
```

### Template 3: Deep-Dive Logic Remediation

```markdown
**Objective:** Log newly discovered code review findings (CR-014 through CR-022) into the living documentation, and immediately patch the highest-priority logic bugs.

**Instructions:**
1. **Fix Mech Drift:** Clamp X-position: `enemy.x = Math.max(0, Math.min(enemy.x, VIEW_W - enemy.w));`.
2. **Fix Start Menu Stale Ref:** Stabilize `activateSelected` closure via `useCallback` or explicit index passing.
3. **Fix `respawnHoldT` Leak:** Reset `this.respawnHoldT = 0;` on respawn.
4. **Fix Burn DoT Frame Skip:** Snapshot phase before damage to prevent processing projectiles/pickups on a dead boss frame.
```

### Template 4: Start Menu Typography & Metadata

```markdown
**Objective:** Update start screen and browser metadata title to "RetroVania | Rogue-like Platformer".

**Instructions:**
1. Update start-screen canvas renderer to use a single larger line at `pixelFont(28)`. Adjust underline proportionally.
2. Update `layout.tsx` browser metadata title to match exactly.
```

### Template 5: Footer Branding Watermark & Version Bump

```markdown
**Objective:** Replace placeholder footer text with the StrayDog stencil watermark and bump game version to v0.2.0.

**Instructions:**
1. Copy `assets/img/branding/stray-stencil.png` to `public/assets/branding/stray-stencil.png`.
2. Update hardcoded version from `v0.1.0` to `v0.2.0`. Remove placeholder text.
3. Render the stencil image directly to the right of the version number with lowered opacity (`0.5`) as a watermark.
4. Update `package.json`, `BETA_TESTING.md`, and `README.md` to `0.2.0`.
```

### Template 6: Canvas Start-Screen Truth Sync

```markdown
**Objective:** Repair a canvas start screen that does not fill its container and synchronize its visible title and release branding across every authoritative source.

**Instructions:**
1. Inspect the parent flex/grid sizing and the canvas's replaced-element behavior before changing draw coordinates. Give the parent an explicit available height and use `position: absolute; inset: 0; width: 100%; height: 100%;` when the canvas must fill it without preserving its intrinsic ratio.
2. Keep one logical canvas coordinate system and resize only the backing buffer/CSS presentation; verify pointer hit-testing still maps client coordinates into logical coordinates.
3. Update the visible canvas title and `app/layout.tsx` metadata title together. Fit long one-line titles to the available region rather than clipping or silently splitting them.
4. Verify branding assets exist under `public/`, preserve their source aspect ratio when drawing, and place the watermark beside—not underneath—the version label.
5. Truth-sync `README.md`, `docs/BETA_TESTING.md`, `docs/AGENTIC_WORKFLOW.md`, and the session log. Do not claim the visual repair is complete until a fresh viewport screenshot and type/build checks pass.
```

**Why it worked:**
- It separates CSS/container diagnosis from canvas drawing changes, avoiding coordinate-system rewrites for a layout bug.
- It treats title, metadata, watermark, and docs as one branding contract instead of four independent strings/assets that can drift.
- It explicitly preserves honest verification status when source changes are complete but a fresh browser capture is still pending.

### Documentation governance sync prompt (2026-07-15)

**Used for:** Repeatable docs-maintenance passes (archive superseded docs, refresh living process docs, update README state, and validate internal links)

**Tool:** GitHub Copilot (GPT-5.3-Codex)

**Effectiveness:** ⭐⭐⭐⭐⭐

**Prompt:**
> Update all documentation to continue the logging of the AI-Augmentation process and development of this game application. Do not delete old documentation; move it to `<repo>/docs/archive`. Ensure links are valid, and enhance the root README.md with the current state of the project.
>
> Specifically:
> 1) Identify documentation files that are superseded or duplicated and move them to `docs/archive/historical/`.
> 2) Add a new dated entry to `docs/SESSION_LOG.md` describing the latest work.
> 3) Update `docs/AGENTIC_WORKFLOW.md` status and session tables.
> 4) Update `docs/PROMPT_LIBRARY.md` with any reusable prompts from this session.
> 5) Update `docs/BUGS_IMPROVEMENT_GUIDE.md` with any new bugs or findings.
> 6) Correct stale claims in `docs/BETA_TESTING.md`.
> 7) Refresh `docs/WORKFLOW.md` if its guidance conflicts with living docs.
> 8) Add an ADR in `docs/DECISIONS.md` if any architectural decision was made.
> 9) Enhance `README.md` with current features, tech stack, live URL, and roadmap.
> 10) Verify all internal documentation links resolve.

**Why it worked / didn't:**
- Forces an archive-first policy explicitly, which prevents accidental loss of historical process artifacts.
- Bundles process docs + product README sync into one pass, reducing drift between engineering reality and project narrative.
- The numbered checklist makes validation deterministic and review-friendly.
- Best results come from scoping link checks to first-party docs (`docs/` + root `README.md`) so vendored runtime markdown does not create false-positive failures.

**Workspace prompt file:** `.github/prompts/documentation-governance-sync.prompt.md`

---

### Scaffold prompt
<a name="scaffold-prompt"></a>
**Used for:** Initial repo scaffold (Next.js + FastAPI structure, canvas render loop, sprite state machine)
**Tool:** GitHub Copilot cloud agent
**Effectiveness:** ⭐⭐⭐⭐☆ _(update after reviewing the actual PR)_

**Prompt:**
> Build a retro SNES-styled 2D platformer/showcase game as a full-stack TypeScript + Python project for a coding bootcamp capstone. [full prompt condensed — see project setup conversation / commit history for the complete version]

**Why it worked / didn't:**
- Explicit file structure (`/app`, `/components`, `/lib`, `/python-service`) meant the agent didn't invent its own layout
- Forcing "pick ONE clear reason Python exists" prevented Python from being bolted on without justification
- _Add more notes once you've reviewed the actual generated PR_

---

_Add new prompts below as they prove reusable. Prompts that failed are just as valuable to log — note them under a "Didn't Work" subsection if a pattern emerges._

## UI refactor handoff brief (2026-07-08)

Full brief: [ui-refactor-brief-2026-07-08.md](archive/historical/session-briefs/ui-refactor-brief-2026-07-08.md) — responsive canvas
scaling, header/footer HUD chrome, arrow-key reliability investigation, GIF
transparency fix in the asset pipeline. Written for a VS Code agent session
after the first human playtest; includes per-task root-cause pointers into the
actual files, the no-parallel-systems ground rule, and evidence-required
verification steps. Reusable pattern: diagnose to the file/function level
BEFORE handing off, so the receiving agent starts from causes, not symptoms.

---

### Repository cleanup and restructuring prompt

**Used for:** Cleaning up and restructuring the repository root/worktree layout, normalizing names, archiving deprecated documentation, and preparing the project for long-term maintainability and CI/CD.

**Tool:** Claude / Cascade

**Effectiveness:** ⭐⭐⭐⭐☆ (to be validated after first run)

**Prompt:**
```markdown
You are a senior repository-architecture and refactoring agent operating inside VS Code: on Windows.

Your mission is to clean, simplify, and normalize the repository at:

C:\Users\Petro\repos\Next_Chapter\Next-Chapter-Retro-Game.worktrees

Primary objective:
Reduce directory confusion and restructure the repository into a professional, maintainable, CI/CD-friendly layout with semantic naming, preserved functionality, and complete path integrity.

Core end-state requirements:
1. The repository root should contain only:
   - ./downloads
   - ./Next-Chapter-Retro-Game
   - ./README.md
   - the local development startup entry file if it must live at root for user convenience
2. Any non-essential files currently at root must be either:
   - deleted if redundant/junk/generated and safe to remove, or
   - moved into the correct location inside the project structure
3. Any deprecated or superseded documentation must be moved into a historical archive location for generative documentation of the full build lifecycle
4. Any essential files inside folders slated for deletion must be preserved and relocated before deletion
5. Any renamed or moved files must have all import paths, script references, config references, README links, CI references, and internal documentation links updated so nothing breaks
6. Use professional semantic naming conventions across the codebase
7. Maintain or improve CI/CD readiness, developer onboarding, and local dev usability

Operating instructions:
- Think step by step for complex problems.
- Do not make destructive changes until you have completed a full inventory and classification plan.
- Prefer moving and consolidating over deleting when there is uncertainty.
- If a file appears historical, deprecated, duplicated, generated, experimental, or orphaned, verify before removal.
- Preserve game functionality, build scripts, asset pipelines, startup behavior, and documentation continuity.
- Keep changes deterministic, reversible where possible, and easy to review in git.

Required workflow:
Phase 1: Audit and classify
1. Inspect the full root and immediate subdirectory structure.
2. Produce a categorized inventory of:
   - essential application code
   - assets
   - downloads/source zips
   - documentation
   - deprecated or duplicate files
   - generated files
   - test/debug artifacts
   - CI/CD and config files
   - likely junk or misplaced files
3. Identify what should remain at root, what should move, what should be archived, and what can be deleted.
4. Identify all risky actions before making changes.

Phase 2: Propose target structure
1. Define the final desired folder structure.
2. Include a dedicated archive path for deprecated documentation, for example:
   - ./Next-Chapter-Retro-Game/docs/archive/historical/
3. Ensure the structure supports:
   - clean app source organization
   - documentation discoverability
   - asset management
   - future CI/CD
   - onboarding for human developers and AI agents

Phase 3: Execute safely
1. Move essential misplaced files into their proper homes.
2. Move deprecated documentation into the archive folder.
3. Remove only files confirmed to be non-essential, duplicated, obsolete, or generated noise.
4. Rename unclear files/folders using semantic, professional naming conventions.
5. Update every affected reference across the codebase, including:
   - imports/exports
   - package scripts
   - config files
   - documentation links
   - startup instructions
   - CI/CD workflow references
   - asset references
   - relative and absolute paths where applicable

Phase 4: Root README creation
Create or rewrite the root README.md so it serves as the master introduction and navigation document.
It must include:
- project overview
- purpose of the root layout
- quick start for local development
- exact startup command(s)
- where the main game code lives
- where downloads/source asset zips live
- where archived historical documentation lives
- links to key documentation
- notes for developers and agents about directory intent

Phase 5: Validation
After restructuring:
1. Verify the repo root matches the required final state.
2. Verify all links and internal references still resolve.
3. Verify app startup still works in local development.
4. Verify renamed paths do not break imports or scripts.
5. Verify archived docs are preserved and discoverable.
6. Verify no essential file was deleted.
7. Summarize all changes in a concise migration report.

Constraints:
- Do not delete ./downloads.
- Do not delete the main playable game project.
- Do not silently discard documentation; archive deprecated docs unless they are obvious junk duplicates.
- Do not leave broken paths.
- Do not leave ambiguous filenames if a semantic rename is warranted.
- Do not create a needlessly deep folder hierarchy.
- Do not change behavior unless required to preserve consistency after restructuring.

File/folder naming standards:
- Use clear, semantic, human-readable names
- Components: PascalCase
- Functions/variables: camelCase
- Folders and non-component files: kebab-case unless ecosystem conventions require otherwise
- Documentation files should have descriptive names, not vague placeholders like notes-final-new.md
- Archive folders should clearly indicate historical/deprecated status

Decision rules:
- If uncertain whether a file is essential, move it to a clearly labeled holding or archive location instead of deleting it.
- If multiple candidate locations exist, choose the one that best matches long-term maintainability and standard project structure.
- If documentation is still useful but outdated, archive it rather than removing it.
- If generated files are required for runtime, keep them; if reproducible and non-essential in source control, relocate or remove appropriately.

Deliverables:
1. Execute the cleanup and restructuring.
2. Create/update the root README.md.
3. Output a final migration report with:
   - files moved
   - files renamed
   - files archived
   - files deleted
   - references updated
   - validation results
   - any remaining risks or manual follow-up items

Output style:
- Be concise, professional, and explicit.
- Show the plan before destructive actions.
- Then execute in logical batches.
- After each major batch, report what changed and what was validated.
```

**Why it was added:**
- Consolidates a complex cleanup handoff into a single reusable prompt.
- Explicit "audit before delete" phases reduce accidental loss of essential files.
- The deliverables, naming standards, and validation checklist make the output deterministic and reviewable.

---

### Code review prompt (branch vs main)

**Used for:** Requesting a thorough, structured code review of a feature branch against main, focused on bugs and logic issues rather than style

**Tool:** Gemini Pro / Windsurf Cascade

**Effectiveness:** ⭐⭐⭐⭐⭐

**Prompt:**
> @[/review] @[agents/next-chapter-retro-game-setup (vs origin/main)]
>
> Perform a thorough code review of all changes in this branch versus origin/main.
>
> Focus on:
> - Logic errors and edge cases
> - Null / undefined references
> - Race conditions
> - Improper resource management
> - API contract violations
> - Incorrect caching
> - Violations of existing code patterns or conventions
>
> Report pre-existing bugs if found. Do not report speculative or low-confidence issues. Rank findings by severity.

**Why it worked:**
- Scoping to a branch diff keeps the surface area manageable and the output actionable.
- Explicit focus criteria prevent the agent from drifting into style suggestions.
- "Do not report speculative issues" cuts noise significantly.

---

### Systematic bug-fix agent prompt (multi-issue, staged)

**Used for:** Resolving a prioritized list of confirmed bugs and logic issues from a prior code review, with a rendering regression triage pass first

**Tool:** Gemini Pro / Windsurf Cascade

**Effectiveness:** ⭐⭐⭐⭐⭐ (to be updated after first complete run)

**Prompt (staged — paste each stage in sequence):**

#### Stage 0 — Agent identity and project context

> You are Gemini Pro operating as a senior game-engine debugging and refactoring agent inside Windsurf Cascade.
>
> Project context:
> - Repository: Next-Chapter-Retro-Game
> - Platform: browser-based retro platformer
> - Stack: React/Next.js/TypeScript/canvas rendering
> - Current observed regression: controller input is recognized and the canvas attempts to stretch to the available play area, but the game visually regressed from a multi-tile playable map into a single oversized stretched canvas where walls, sprites, and level composition are no longer visible
> - There is an existing review on this branch with a prioritized bug list and logic issues
> - Resolve issues one at a time in strict sequence, validating after each fix before moving on
>
> Primary objective:
> Stabilize rendering, scaling, gameplay correctness, and state integrity without introducing new regressions. Work issue-by-issue, audit after each change, iterate if needed, then proceed to the next issue only after the current one is fully resolved and validated.
>
> Non-negotiable working style:
> - Think step by step for complex problems
> - Do not batch-fix multiple unrelated issues in one pass unless a shared root cause requires it
> - Before editing, inspect the relevant files and explain the root cause briefly
> - Prefer minimal, targeted fixes over broad rewrites
> - Preserve intended architecture where possible
> - After each issue fix, run the audit-iterate-audit cycle before moving to the next issue
> - If a screenshot-described visual bug conflicts with the written code review, prioritize direct repo evidence and note the discrepancy
> - Do not claim success without validation evidence
>
>---

#### Stage 1 — Execution protocol (per-issue cycle)

> For EACH issue, follow this exact cycle:
>
> **1. Investigate**
> - Read only the files relevant to the current issue and any directly connected dependencies
> - Identify likely root cause
> - State whether the issue is isolated, shared-root-cause, or blocked by a prior issue
>
> **2. Plan**
> - Propose the smallest safe patch
> - Note any side effects, invariants, or follow-up checks
>
> **3. Implement**
> - Apply the fix cleanly
> - Keep naming semantic and consistent with the existing codebase
>
> **4. Audit**
> Run all relevant validation for that issue, such as:
> - typecheck (`npx tsc --noEmit`)
> - lint if configured
> - targeted runtime inspection
> - local dev startup
> - browser validation where appropriate
> - screenshot comparison where visual behavior matters
> - console error review
> - path/import verification
>
> **5. Iterate**
> - If the audit fails or reveals partial breakage, fix the issue again immediately
> - Re-run the audit
> - Repeat until the issue is resolved or you can prove it is blocked by a different root cause
>
> **6. Report**
> After each issue, provide:
> - what was wrong
> - what changed
> - evidence from validation
> - any remaining risk
> - whether it is safe to move to the next issue
>
> **7. Then and only then proceed to the next issue**
>
>---

#### Stage 2 — Issue 0 (rendering regression triage — resolve first)

> Before addressing numbered issues: determine whether the current branch has a rendering/scaling/root-canvas regression that is upstream of the listed review issues.
>
> If a visual regression exists (stretched canvas, missing walls, invisible sprites):
> - Isolate and fix that rendering regression first as **Issue 0**
> - Validate that the map, walls, tiles, and sprites are visible again
> - Then continue through the numbered issue list in sequence
>
> If the visual regression is caused by a recent responsive-scaling change, canvas sizing bug, transform bug, DPR bug, viewport calculation bug, CSS container bug, or draw-coordinate bug, treat that as Issue 0 and resolve it before Issue 1.
>
>---

#### Stage 3 — Issues 1–5 (RNG integrity, save/load correctness, pickup placement, visual dead code)

> Process these issues in order. Do not proceed to the next until audit passes.
>
> **Issue 1 — weaponDamage() RNG consumption**
> `weaponDamage()` consumes a `combatRng.next()` call on every damage calculation, including when crit chance is zero, breaking forked stream isolation.
> Goal: only consume RNG when a crit roll is actually needed.
>
> **Issue 2 — buyMysteryBox / rollLoot shared lootCounter**
> `buyMysteryBox()` and `rollLoot()` share `lootCounter` with different seed multipliers, creating seed collision risk and coupling.
> Goal: make loot generation deterministic, understandable, and safe for future expansion.
>
> **Issue 3 — saveGame hp validation**
> `saveGame()` serializes `hp` before validation; `loadSavedGame()` does not validate numeric fields. Corrupted or tampered `localStorage` data is accepted verbatim.
> Goal: clamp and validate saved state; prevent impossible or corrupted state from being restored into active play.
>
> **Issue 4 — findGroundY top-down scan**
> `findGroundY()` scans top-down and returns the ceiling tile's Y, not the floor, causing pit-rescued pickups to spawn offscreen above the room.
> Goal: ensure pit rescue and pickup placement always lands on reachable ground.
>
> **Issue 5 — drawPickups dead fillStyle**
> `drawPickups()` has a dead `fillStyle` assignment for opened chests — the first assignment is immediately overwritten by a second, so the opened/closed chest colors are never applied.
> Goal: remove dead assignment and restore intended opened/closed chest visual logic.
>
>---

#### Stage 4 — Issues 6–8 (UI correctness, modal coupling, minimap state)

> **Issue 6 — GameMenuModal weapon diff hardcoded**
> `diff` in `GameMenuModal` is always `+8 ATK / +3 DEF` regardless of actual weapon stats. The computation uses a boolean cast rather than real values.
> Goal: compute actual deltas from current and secondary equipment data surfaced in the snapshot.
>
> **Issue 7 — setUiModalOpen clears unrelated overlays**
> `setUiModalOpen(false)` unconditionally clears `inventoryOpen`, `helpOpen`, and `shopOpen`, silently closing in-game overlays that were not opened by the external modal.
> Goal: decouple modal state transitions so closing one UI layer does not incorrectly wipe unrelated UI state.
>
> **Issue 8 — respawn() minimap cleared-state inconsistency**
> `respawn()` calls `roomStates.clear()` so enemies respawn, but the minimap `cleared` field is computed from `roomStates`, causing all previously-cleared rooms to show as uncleared immediately after respawn.
> Goal: make minimap and room progression state internally consistent after respawn.
>
>---

#### Stage 5 — Issues 9–13 (RNG bias, pity fragility, mount race, gamepad safety, fetch hardening)

> **Issue 9 — generateSeedPhrase modulo bias**
> `generateSeedPhrase()` uses `h() % 16` and `h() % 10000` — both exhibit modulo bias since 2³² is not evenly divisible by 16 or 10000.
> Goal: remove avoidable bias using the project's safer integer-generation approach already present in `Rng.int`.
>
> **Issue 10 — lootPity hardcoded rarity check**
> `lootPity` only resets on `"rare"` or `"epic"`. Any future rarity tier above epic would silently continue accumulating pity after a high-tier drop.
> Goal: replace hardcoded rarity strings with tier-aware or rule-based logic so future rarities don't require edits here.
>
> **Issue 11 — ResizeObserver / Game init mount race**
> `ResizeObserver` and `Game` initialization run in separate `useEffect`s. Both fire synchronously at mount, but canvas sizing may not be DPR-correct before `game.start()` completes on slow loads.
> Goal: make first-render sizing deterministic; ensure canvas dimensions and DPR scaling are correct before or during startup.
>
> **Issue 12 — Gamepad polling loop post-unmount setState**
> The gamepad `useEffect` (deps `[]`) runs a `requestAnimationFrame` loop. On unmount, the last queued frame can call `setMenuOpen` after the component is gone. React 18 Strict Mode double-invokes effects, making this reliably triggerable in development.
> Goal: eliminate post-unmount state updates and make Strict Mode behavior safe.
>
> **Issue 13 — probeLootService missing resp.ok check**
> `probeLootService()` calls `resp.json()` without checking `resp.ok` first. A 500 with a non-JSON body throws, is silently caught, and sets `lootSource = "client-fallback"` with no warning log, making API misconfigurations invisible.
> Goal: harden error handling and improve debuggability without breaking fallback behavior.
>
>---

#### Stage 6 — Required output format per issue

> For each issue use exactly this structure:
>
> ```
> ## Issue N: <short title>
>
> ### Investigation
> - relevant files
> - root cause
> - whether blocked by another issue
>
> ### Patch plan
> - concise fix description
> - risk notes
>
> ### Implementation
> - summary of code changes
>
> ### Audit
> - commands run
> - runtime checks performed
> - browser or screenshot findings if applicable
> - result: pass / fail
>
> ### Iteration
> - what was adjusted after audit, or "no further iteration required"
>
> ### Status
> - resolved / partially resolved / blocked
> - remaining risk
> - safe to proceed: yes / no
> ```
>
>---

#### Stage 7 — Success criteria and final report

> Success criteria:
> - Canvas and viewport behavior are stable
> - Tiles, walls, sprites, and gameplay visuals render correctly
> - Input still works
> - No new type or runtime errors introduced
> - Each numbered issue is individually addressed with validation evidence
>
> Final output: a concise end report listing:
> - issues fixed
> - files changed
> - validations performed
> - unresolved risks
> - recommended next audit targets

**Why it works / design notes:**
- Breaking the prompt into numbered stages lets you hand off one stage at a time if the session context limit is hit, or run all stages as a single briefing for a capable long-context model.
- The Issue 0 rendering-regression gate prevents wasted effort patching RNG while the canvas is broken.
- The per-issue audit cycle prevents the agent from "fixing" ten issues and then discovering they introduced two new type errors across all of them simultaneously.
- The explicit output format makes each issue's resolution reviewable in isolation and creates a ready-made changelog.
- Separating identity/context (Stage 0), process (Stage 1), and issue groups (Stages 2–5) allows prompt reuse: Stages 0–1 are reusable boilerplate for any multi-issue debugging session; only Stages 2–5 are project-specific.

---

### Sequential sprints orchestration prompt suite

**Used for:** Translating a prioritized code-review bug list into structured single-issue engineering sprints, handed to an agent one sprint at a time with mandatory audit gates between each

**Tool:** Any capable long-context agent (Gemini Pro, Claude, GPT-4o) / Windsurf Cascade

**Effectiveness:** ⭐⭐⭐⭐⭐ (to be updated after first complete run)

**Prompt (hand each sprint separately — do not batch):**

---

#### Sprint 1 — Canvas scaling, coordinate space, and tile rendering restoration

```markdown
# Sprint 1: Canvas Scale Matching & Environment Layer Fix

## Objective
Fix the canvas configuration so the retro play area correctly expands to fill the inner
viewport area dynamically without stretching or blurring. Restore visual visibility to
missing walls, floors, and platforms.

## Execution Requirements
1. Dynamic Viewport Bounds Synchronization: Inside lib/game/game.ts (or the resize
   callback in GameCanvas.tsx), align the internal buffer to physical pixels each frame:
     const rect = canvas.getBoundingClientRect();
     canvas.width = rect.width;
     canvas.height = rect.height;

2. Virtual Coordinate Transformation: Enforce a fixed virtual resolution (e.g., 640×352).
   Scale all canvas draws by multiplying the context coordinate map scale:
     const scaleX = canvas.width / VIRTUAL_WIDTH;
     const scaleY = canvas.height / VIRTUAL_HEIGHT;
     ctx.scale(scaleX, scaleY);

3. Camera Coordinates Offset Restoration: Confirm all environmental tiles are drawn using
   camera-offset coordinates (tile.x - camera.x, tile.y - camera.y).

4. Solid Graphical Fallback: If a texture atlas or tile asset fails to resolve, substitute
   a colored fill (ctx.fillStyle = '#1e293b') so solid geometry remains visible.

## Verification Checklist
- Run npx tsc --noEmit and confirm zero type errors.
- Run python scripts/project-status.py and confirm no syntax crashes.
- Verify walls, floors, and tile geometry are rendered and correctly bounded in the viewport.
```

---

#### Sprint 2 — Player sprite inversion and character orientation repair

```markdown
# Sprint 2: Player Sprite Orientation Mirroring Logic

## Objective
Repair the player sprite rendering pipeline so the character mirrors left/right
directions correctly based on movement velocity.

## Execution Requirements
1. Ensure the player entity retains a stateful facing direction (facingRight: boolean
   or equivalent facing: -1 | 1 already present in the codebase).

2. Wrap the character draw call in a ctx.save() / ctx.restore() block. Apply a
   ctx.translate + ctx.scale(-1, 1) transform only when facing left:
     ctx.save();
     if (!player.facingRight) {
       ctx.translate(player.x + player.width, player.y);
       ctx.scale(-1, 1);
       ctx.drawImage(sheet, sx, sy, sw, sh, 0, 0, drawW, drawH);
     } else {
       ctx.drawImage(sheet, sx, sy, sw, sh, player.x, player.y, drawW, drawH);
     }
     ctx.restore();

3. Verify the existing drawSheetAnim helper already handles flip via the `flip`
   parameter before adding a second transform path — avoid creating a parallel
   sprite-drawing system.

## Verification Checklist
- Run npx tsc --noEmit.
- Move the player left and right in the browser; confirm the sprite mirrors correctly
  and does not break on direction change.
```

---

#### Sprint 3 — RNG branch isolation and shared counter seed collision (Issues 1 & 2)

```markdown
# Sprint 3: Deterministic Stream Isolation & Seed Collision Resolution

## Objective
Fix RNG leakage in weapon damage calculations and resolve the shared lootCounter
seed collision between buyMysteryBox() and rollLoot().

## Execution Requirements
1. Combat RNG Leak Fix (Issue 1):
   In lib/game/game.ts → weaponDamage(), guard the combatRng.next() call so it is
   only consumed when a crit roll is actually possible:
     const critPct = this.stat("critChance") + (this.weapon.effect === "crit" ? 10 : 0);
     if (critPct > 0 && this.combatRng.next() * 100 < critPct) dmg *= 2;

2. Counter De-confliction (Issue 2):
   buyMysteryBox() and rollLoot() both increment the shared lootCounter with
   different multipliers (104729 vs 7919), creating collision risk. Isolate shop
   purchases onto a separate counter (e.g., shopLootCounter) so the two seed
   sequences are fully independent.

## Verification Checklist
- Run npx tsc --noEmit.
- Confirm that loading the same run seed twice produces identical crit outcomes and
  identical loot sequences across both the kill-drop and shop-purchase paths.
```

---

#### Sprint 4 — State validation, pit-rescue floor scan, and dead draw call (Issues 3, 4, & 5)

```markdown
# Sprint 4: Storage Sanitation, Pit Coordinates Scan, and Palette Rendering

## Objective
Harden save/load state, fix the bottom-up floor scan in findGroundY, and remove the
dead fillStyle assignment in drawPickups.

## Execution Requirements
1. Save/Load Input Range Checks (Issue 3):
   In saveGame(), clamp hp to [1, maxHp()] before serializing if saving mid-play.
   In loadSavedGame(), validate all numeric fields (hp, coins, xp, level) — reject
   or clamp values that are NaN, negative, or outside plausible bounds before
   assigning to live state.

2. Bottom-Up Floor Scan (Issue 4):
   Rewrite findGroundY() to scan from ROOM_H - 1 downward to 0 so it finds the
   highest floor row rather than the first ceiling row:
     private findGroundY(x: number): number {
       const col = Math.floor(x / TILE);
       for (let row = ROOM_H - 1; row >= 0; row--) {
         if (this.isSolidTile(this.tileAt(col, row)) || this.tileAt(col, row) === T_PLATFORM) {
           return row * TILE;
         }
       }
       return VIEW_H / 2;
     }

3. Remove Dead fillStyle (Issue 5):
   In drawPickups() chest case, the first ctx.fillStyle assignment is immediately
   overwritten by the second. Remove the dead first line and confirm the remaining
   single assignment correctly distinguishes opened vs. closed chest color.

## Verification Checklist
- Run npx tsc --noEmit.
- Drop a pickup into a pit and confirm rescue places it on the floor, not the ceiling.
- Open and close a chest; confirm opened/closed chest colors differ as intended.
- Save at a shrine, reload the page, confirm HP and coins are restored correctly.
- Tamper the localStorage JSON (set hp to -999) and confirm the game does not restore
  a dead/invalid player state.
```

---

#### Sprint 5 — UI wiring, modal lifecycle, minimap state, RNG bias, and component cleanup (Issues 6–13)

```markdown
# Sprint 5: Equipment Snapshot Comparison, Navigation Overlay, and Loop Cleanup

## Objective
Wire real weapon deltas into the menu modal, fix modal state coupling, preserve
minimap cleared-room state through respawn, remove seed modulo bias, and resolve
React component lifecycle safety issues.

## Execution Requirements
1. Real Weapon Diff (Issue 6):
   In components/GameMenuModal.tsx, replace the hardcoded atkDelta / defDelta
   constants with computed values from snapshot data:
     const atkDelta = Math.round((snapshot.secondary.damage ?? 0) - (snapshot.weapon related damage));
   Use whatever damage/speed fields are present in HudSnapshot. If the snapshot does
   not yet expose these fields, add them before fixing the modal.

2. Modal State Decoupling (Issue 7):
   In setUiModalOpen(open: boolean), only close in-game overlays (inventoryOpen,
   helpOpen, shopOpen) when open is TRUE (the external modal is opening and should
   take focus). When open is FALSE, leave in-game overlay state untouched.

3. Minimap Cleared-State After Respawn (Issue 8):
   After respawn() calls roomStates.clear(), the minimap computes cleared from
   the now-empty map, showing all rooms as uncleared. Track cleared rooms in a
   separate Set<string> (clearedRooms) that is NOT wiped on respawn, and use
   that set for the minimap cleared field instead of re-deriving from roomStates.

4. Seed Modulo Bias Fix (Issue 9):
   In lib/game/rng.ts → generateSeedPhrase(), replace h() % SEED_WORDS.length and
   h() % 10000 with the existing Rng.int(min, max) method or equivalent rejection
   sampling to remove modulo bias.

5. Pity Tier-Aware Reset (Issue 10):
   In rollLoot(), replace the hardcoded rarity === "rare" || rarity === "epic" check
   with a tier-based comparison using the RARITIES map so any future rarity above
   the common/uncommon tier automatically resets pity without code changes here.

6. ResizeObserver / Game Init Race (Issue 11):
   In GameCanvas.tsx, ensure canvas dimensions are set to DPR-correct values before
   game.start() is called. Either merge the resize logic into the same useEffect that
   creates the Game instance, or call updateCanvasSize() synchronously before start().

7. Gamepad Loop Post-Unmount Safety (Issue 12):
   In the gamepad useEffect, introduce a mounted flag and check it before calling
   setMenuOpen inside the rAF callback:
     let mounted = true;
     // inside rAF callback:
     if (!mounted) return;
     // cleanup:
     return () => { mounted = false; cancelAnimationFrame(frame); };

8. probeLootService resp.ok Check (Issue 13):
   Before calling resp.json() in fetchOrFallbackRoll() and the probe path, check
   resp.ok. If false, log a console.warn with the status code and throw so the
   catch block falls back cleanly instead of trying to parse an HTML error page.

## Verification Checklist
- Run npx tsc --noEmit — zero errors required before moving on.
- Run npm run build — confirm production build is clean.
- Open the in-game menu with a secondary weapon equipped; verify the ATK/DEF diff
  shows real numbers, not always +8/+3.
- Open the external React menu, close it, and confirm the in-game inventory state
  is unchanged.
- Die and respawn; confirm the minimap still shows previously-cleared rooms as cleared.
- Unmount and remount GameCanvas in React Strict Mode (dev); confirm no console
  warnings about setState on unmounted component.
- Trigger a /api/loot 500 response (stop the Python service); confirm a console.warn
  is logged and the game falls back to the client roller without crashing.
```

---

**Why it works / design notes:**
- Sprint boundaries map directly to related bug groups: rendering first (Sprints 1–2), then game-logic correctness (Sprints 3–4), then UI and infrastructure hardening (Sprint 5). Each sprint is independently auditable.
- Handing sprints one at a time prevents an agent from silently carrying a broken intermediate state forward across unrelated fixes and discovering the failures only at the end.
- Each sprint's verification checklist is written as concrete observable outcomes (visual confirmation, specific localStorage tamper test, Strict Mode remount check) rather than just "run tsc" — this forces the agent to demonstrate behavior, not just compilation health.
- Sprint 2 explicitly guards against creating a parallel sprite-draw system, which is the failure mode documented in the "Vague make it better UI prompt" anti-pattern entry below.
- The separation of Sprints 1–2 (rendering) from Sprints 3–5 (logic) mirrors the Issue 0 rendering gate from the prior staged prompt entry — both patterns enforce the same discipline from different angles.

---

### Review-only code review prompt (main branch)

**Used for:** Senior-engineer code review without implementing fixes — surface logic errors, edge cases, null/undefined refs, race conditions, resource leaks, API contract violations, caching issues, and convention violations for a future fix sprint.

**Tool:** Windsurf Cascade

**Effectiveness:** ⭐⭐⭐⭐⭐

**Prompt:**
> Perform a thorough code review of all changes in the main branch.
>
> Focus on:
> - Logic errors and incorrect behavior
> - Edge cases that aren't handled
> - Null/undefined reference issues
> - Race conditions or concurrency issues
> - Security vulnerabilities
> - Improper resource management or resource leaks
> - API contract violations
> - Incorrect caching behavior
> - Violations of existing code patterns or conventions
>
> Do not report speculative or low-confidence issues.
>
> Meta: No code changes or implementations are requested, only review and reporting.

**Why it worked:**
- Explicitly excluding implementation prevents an agent from "fixing" findings mid-review and keeps the output focused.
- A ranked severity list with concrete file/line references gives the next fix sprint a clean backlog.

---

### Documentation update prompt

**Used for:** Refreshing all project documentation after a development or review session — archive old docs, update session logs, prompt library, ADRs, bug/improvement guide, and README, and validate internal links.

**Tool:** Cascade / Claude Code

**Effectiveness:** ⭐⭐⭐⭐☆ (to be validated after first complete run)

**Prompt:**
> Update all documentation to continue the logging of the AI-Augmentation process and development of this game application. Do not delete old documentation; move it to `<repo>/docs/archive`. Ensure links are valid, and enhance the root README.md with the current state of the project.
>
> Specifically:
> 1. Identify documentation files that are superseded or duplicated and move them to `docs/archive/historical/`.
> 2. Add a new dated entry to `docs/SESSION_LOG.md` describing the latest work.
> 3. Update `docs/AGENTIC_WORKFLOW.md` status and session tables.
> 4. Update `docs/PROMPT_LIBRARY.md` with any reusable prompts from this session.
> 5. Update `docs/BUGS_IMPROVEMENT_GUIDE.md` with any new bugs or findings.
> 6. Correct stale claims in `docs/BETA_TESTING.md`.
> 7. Refresh `docs/WORKFLOW.md` if its guidance conflicts with living docs.
> 8. Add an ADR in `docs/DECISIONS.md` if any architectural decision was made.
> 9. Enhance `README.md` with current features, tech stack, live URL, and roadmap.
> 10. Verify all internal documentation links resolve.

**Why it worked / design notes:**
- Treating docs as a deliverable with a checklist prevents the session from drifting into code changes.
- "Move, don't delete" preserves historical context for bootcamp reviewers and future audits.
- Link validation catches stale paths caused by the archive step.

---

### Documentation governance sync prompt

**Used for:** Follow-up docs-only maintenance after multiple rapid implementation sessions where stale claims can linger.

**Tool:** GitHub Copilot (GPT-5.3-Codex)

**Effectiveness:** ⭐⭐⭐⭐⭐

**Prompt:**
> Continue the 10-point documentation-governance checklist, but prioritize truth-sync over prose changes:
> 1) add a dated SESSION_LOG entry,
> 2) update AGENTIC_WORKFLOW quick table,
> 3) add reusable prompt notes,
> 4) reconcile BUGS_IMPROVEMENT_GUIDE status with actual code/test reality,
> 5) remove stale BETA_TESTING backlog bullets that are already fixed,
> 6) confirm WORKFLOW guidance still matches living docs,
> 7) add ADR only if a new architecture decision happened,
> 8) ensure README status/roadmap still matches,
> 9) preserve archive-first policy (move/redirect, don't delete),
> 10) validate internal markdown links.

**Why it worked / design notes:**
- "Truth-sync over prose" keeps the pass focused on correctness instead of cosmetic rewrites.
- Explicitly separating "log/update" tasks from "ADR only if needed" avoids unnecessary decision-noise.
- Calling out stale-beta cleanup as a first-class task prevents old review notes from contradicting fixed code.

**Latest use (2026-07-14):**
- Applied to a documentation-visual governance pass: root `README.md` updated to semantically named screenshots and `docs/VISUAL_PROGRESSION.md` added to preserve legacy screenshots as an iteration timeline.

---

### Hero Integration Mission prompt (M1-M3 self-contained)

**Used for:** Executing a multi-mission asset integration with gate/increment/commit protocol — provenance recovery (M1), hero sprite swap with grid verification (M2), and Tier-2 backlog documentation (M3).

**Tool:** Claude Code

**Effectiveness:** ⭐⭐⭐⭐⭐

**Prompt (abridged):**

> You are operating as the build agent for Next-Chapter-Retro-Game on branch `feature/hero-swm-integration`. Your mission is a self-contained "Hero Integration Mission" with three sub-missions, each with its own session protocol.
>
> **Session Protocol (applies to every increment):**
> 1. Session-start git ritual: `git fetch`, reconcile with `origin/main`, confirm branch is clean or stash WIP.
> 2. Universal gate before AND after every increment: `npm test`, `npm run build`, `python scripts/project-status.py`, working tree clean.
> 3. One commit per increment with conventional message format.
> 4. Ask before push — never push without explicit user confirmation.
>
> **M1 — Provenance:** Confirm the exact OpenGameArt source of the swm sprite kit and upgrade CREDITS.md only where exact page-level evidence is found. Do not force a match.
>
> **M2 — Hero Integration:** Replace the player character sprite using `char-sheet-alpha.png`. Before trusting any grid claim from prior docs, measure the actual image: read baked-in labels, verify column/row pitch with alpha-band occupancy analysis, produce a labeled grid overlay, visually inspect every row. Map clips to the actual available rows (aliased where the sheet has no distinct pose — log as asset debt, do not invent rects). Extract pure logic to `lib/game/player-sprite.ts` mirroring the `jump-physics.ts`/`save-data.ts` extraction pattern. Verify live: idle, walk-right, walk-left, jump screenshots; confirm no moonwalk/armband artifact on flip; confirm skin-variant geometry parity.
>
> **M3 — Tier-2 Backlog:** Add AST-014 through AST-020 to BUGS_IMPROVEMENT_GUIDE.md with goal/files/effort/verification-evidence-required for each. Explicitly mark items NOT consumed by M2's hero-only scope.
>
> **Commit discipline:** one commit per mission (652d352-pattern M1, 27bbed4-pattern M2, 7aede87-pattern M3). Do not batch missions. Do not push without asking.

**Why it worked:**
- Self-contained protocol with explicit session-start/finish gates prevents scope creep and working-tree drift.
- "Measure before trusting" discipline (alpha-band analysis, baked-in label cross-check, labeled grid overlay) caught two independent wrong claims from prior docs (cell size and pose count).
- The asset-debt logging convention (alias nearest available row, don't invent rects) keeps the spritemeta honest without blocking the visual swap.
- Separate M1/M2/M3 commits make the PR reviewable and allow partial rollback if any mission hits an unforeseen blocker.

---

## Prompts that didn't work as well

### Vague "make it better" UI prompt

**Used for:** Early UI polish attempt before the refactor brief existed

**Tool:** GitHub Copilot cloud agent

**Effectiveness:** ⭐⭐☆☆☆

**Prompt:**
> Make the game UI look better and more polished.

**Why it didn't work:**
- No constraints on which components to touch → agent rewrote the entire HUD from scratch
- No library constraints → agent introduced a heavy animation library that conflicted with the canvas render loop
- "Better" is not a spec — agent optimized for visual flair rather than the retro aesthetic the project requires
- Output required a full revert; zero net progress
- Lesson: always specify the aesthetic target, the files in scope, and what must NOT change
