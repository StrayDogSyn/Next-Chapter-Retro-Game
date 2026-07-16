# Prompt History

This file contains a short, reviewer-friendly sample of prompts used during development.

For comprehensive history, session-by-session evidence, and architecture decisions, see the `docs/` folder:

- `docs/AGENTIC_WORKFLOW.md`
- `docs/SESSION_LOG.md`
- `docs/PROMPT_LIBRARY.md`
- `docs/DECISIONS.md`

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

## Notes

- Prompts shown here are intentionally condensed for readability.
- Full prompt variants and outcomes are documented in the linked `docs/` files.
