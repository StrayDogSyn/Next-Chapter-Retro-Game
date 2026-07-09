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
