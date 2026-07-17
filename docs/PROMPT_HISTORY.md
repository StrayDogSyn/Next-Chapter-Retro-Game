# Prompt History

This file contains a short, reviewer-friendly sample of prompts used during development.

Use this as the quick version for admissions review; the full history remains in project docs.

For comprehensive history, session-by-session evidence, and architecture decisions, see:

- [AGENTIC_WORKFLOW.md](AGENTIC_WORKFLOW.md)
- [archive/SESSION_LOG.md](archive/SESSION_LOG.md)
- [archive/PROMPT_LIBRARY.md](archive/PROMPT_LIBRARY.md)
- [archive/DECISIONS.md](archive/DECISIONS.md)

---

## 1) Space Marine Physical Overhaul (planning + iteration)

**Intent:** Improve player feel by increasing hitbox readability, jump envelope, and room-clearance compatibility, while preserving stability and validating side effects.

**Prompt (condensed):**

> Perform a "Space Marine" physical overhaul. Increase player hitbox and render proportions, retune jump velocity to improve platform reach, and adjust doorway/corridor clearance where needed. Recalculate jump envelope constants, then run verification (`npm test`, `tsc --noEmit`, and project status) and report measurable effects on reachability and gating.

**Why this mattered:** Demonstrated iterative planning, measurement-driven tuning, and transparent tradeoff reporting instead of blind edits.

---

## 2) React StrictMode Zombie Loop Fix (deep debugging + verification)

**Intent:** Eliminate dev-mode double-mount side effects causing duplicate runtime loops/input listeners and flaky behavior.

**Prompt (condensed):**

> Investigate intermittent interaction/input failures under React StrictMode. Audit `GameCanvas` mount/unmount flow and async startup race conditions. Prevent zombie game loops after unmount by guarding startup/cleanup order, then validate with repeatable repro steps and full verification commands.

**Why this mattered:** Showed root-cause debugging of a timing/concurrency issue rather than superficial symptom patches.

---

## 3) Multi-Issue Audit Sprint Prompt

**Intent:** Run a structured bug-fix sprint with explicit investigation, patch, and audit phases.

**Prompt (excerpt):**

> For each numbered issue, use this structure:
> 1) Investigation
> 2) Patch plan
> 3) Implementation
> 4) Audit (commands + runtime checks)
> 5) Iteration
> 6) Status (resolved/partial/blocked)
>
> Success criteria: stable rendering, correct input, no new type/runtime errors, and evidence for each fix.

**Why this mattered:** Enforced disciplined engineering workflow and prevented "claimed fixes" without proof.

---

## 4) Documentation Governance Sync Prompt

**Intent:** Keep README and living docs aligned with actual source state after fast implementation cycles.

**Prompt (excerpt):**

> Update all documentation to continue logging AI-Augmentation work. Do not delete old docs; archive superseded files. Add session log entries, update workflow/prompt/bugs docs, enhance README with current state, and verify internal links.

**Why this mattered:** Preserved clear reviewer evidence and reduced documentation drift.

---

## 5) Review-Only Code Review Prompt

**Intent:** Request high-signal findings before implementation.

**Prompt (excerpt):**

> Perform a thorough code review of main branch changes. Focus on logic errors, edge cases, race conditions, resource leaks, and API contract violations. Do not implement fixes in this pass; report only confirmed issues with evidence.

**Why this mattered:** Improved fix quality by separating diagnosis from coding.

---

## AI Collaboration & Prompt History

The following selections highlight key interactions with Claude, GitHub Copilot, and Windsurf Cascade throughout the development of RetroVania. They demonstrate architectural planning, deep debugging, and strategic scope management when AI tools failed to resolve an issue.

### 1. Strategic Scope Management: The "Ghost Bug" and the Blue Platforms
**Context:** Live beta testing revealed an inconsistent collision bug with the one-way blue platforms (`-` tile). Despite multiple attempts to isolate it, the AI assistant could not reproduce the issue mathematically in its testing environment and pushed back against further blind fixes.

**The Prompt (Pivot):**
> "Claude has stated that three separate audits found zero evidence of a one-way-platform collision bug in its isolated environment, but the bug persists in the live build. We are pivoting. Completely remove the colored/one-way platforms from the parser. Locate the tile parsing logic where the ASCII character `-` is mapped to `T_PLATFORM`. Change this mapping so that `-` parses directly into the standard solid stone tile ID (`T_SOLID`). Accept that drop-through becomes dead input."

**Outcome:** Rather than burning development hours fighting an AI over a bug it couldn't see, I made the executive decision to cut the feature and replace the platforms with solid stone at the parser level, guaranteeing absolute stability for the submission build.

### 2. Deep Debugging: React StrictMode Zombie Loop
**Context:** The game loop was inexplicably doubling its execution speed and crashing the browser memory.

**The Prompt:**
> "The game loop is firing twice per frame, causing a memory leak and doubling physics gravity. I suspect Next.js/React `StrictMode` is double-mounting the `useEffect` that initializes the `requestAnimationFrame` loop. Refactor the `GameEngine` component to include a `useRef` mounting guard that prevents the loop from instantiating twice during development mode."

**Outcome:** The AI successfully implemented a mount-flag guard, stopping the zombie loop and stabilizing the physics engine without having to disable `StrictMode` globally.

### 3. Iterative Planning: Space Marine Physical Overhaul
**Context:** The default jump physics felt too floaty for a heavy, armored character. The AI initially suggested arbitrarily changing gravity values.

**The Prompt (Correction):**
> "Arbitrarily increasing gravity breaks the horizontal platforming arcs. Let's calculate this properly. Derive the exact vertical velocity required to achieve a maximum jump height of exactly 1.5x the player's bounding box height (`ph`), assuming a gravity constant of 0.4. Apply this specific derivation to the jump input trigger."

**Outcome:** By forcing the AI to use exact mathematical constraints based on the entity's bounding box, the jump arc was perfected without breaking the level design.

### 4. Creative Testing: The "Global Window" Bypass
**Context:** Implementing new visual FX (muzzle flashes, death whirls) required frequent testing, but ADR-029 procedural generation shuffled room layouts, making it tedious to find enemies to test on.

**The Prompt:**
> "Hardcoded room IDs aren't reliable test fixtures here since ADR-029 shuffles room content per-seed. Modify `lib/game/game.ts` to temporarily expose the live `Game` instance to the global `window` object in development mode. This will allow me to manually spawn enemies and trigger FX from the browser console without having to hunt them down in the procedural maze."

**Outcome:** The AI wired the instance to the window, completely bypassing the RNG dependency for testing and drastically speeding up the FX integration sprint.

---

## Notes

- Prompts shown here are intentionally condensed for readability.
- Full prompt variants and outcomes are documented in the linked `docs/` files.
- Verification artifacts referenced by these prompts are captured in [archive/SESSION_LOG.md](archive/SESSION_LOG.md) and [archive/BUGS_IMPROVEMENT_GUIDE.md](archive/BUGS_IMPROVEMENT_GUIDE.md).
