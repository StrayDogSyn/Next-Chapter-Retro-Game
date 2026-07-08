# Agentic Workflow — Living Documentation

> **Purpose:** This is the working record of how this project was built in collaboration with an AI coding agent — what was asked, what came back, what was kept, changed, or thrown out, and why. It's updated after every pairing session, not written retroactively at submission time.
>
> **Last updated:** _fill in date of last edit_
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
| Frontend scaffold | 🟡 in progress |
| Python service | 🟡 in progress |
| Sprite/audio assets | 🔴 placeholders only |
| Documentation | 🟢 living doc active |

## Session Log

<details open>
<summary><strong>Click to collapse/expand full session table</strong></summary>

| Date | Tool | Task | Human Role | Agent Role | Outcome | Notes |
|---|---|---|---|---|---|---|
| _YYYY-MM-DD_ | Copilot cloud agent | Initial scaffold (Next.js + FastAPI structure) | Wrote scoped prompt, reviewed PR | Generated file structure, boilerplate | ✅ merged | See [PROMPT_LIBRARY.md](PROMPT_LIBRARY.md#scaffold-prompt) |

Full history: [docs/SESSION_LOG.md](SESSION_LOG.md) — keep this table above to the 3-5 most recent sessions, archive the rest there.

</details>

## Prompt Library

A running collection of prompts that worked (and a few that didn't) — full detail lives in [docs/PROMPT_LIBRARY.md](PROMPT_LIBRARY.md).

<details>
<summary><strong>Preview: top prompts by usefulness</strong></summary>

- **Scaffold prompt** — structured, file-by-file spec → clean PR, minimal rework
- _(add more as sessions accumulate)_

</details>

## Decisions & Rationale

Architecture Decision Records (ADRs) — every time the agent's suggestion was accepted, modified, or rejected, it's logged with reasoning in [docs/DECISIONS.md](DECISIONS.md).

<details>
<summary><strong>Preview: latest decisions</strong></summary>

| # | Decision | Agent Suggested? | Outcome |
|---|---|---|---|
| ADR-001 | Python service isolated from Next.js API routes rather than embedded | Yes | Accepted — see full ADR |

</details>

## Human vs. Agent Contribution Map

This is the honesty section. Bootcamp reviewers care about this more than the code itself.

<details>
<summary><strong>Click to expand contribution breakdown</strong></summary>

| Component | Primary Author | Human Edits After |
|---|---|---|
| Project scaffold | Agent | Reviewed, minor path fixes |
| Game loop / render logic | _fill in_ | _fill in_ |
| Python service logic | _fill in_ | _fill in_ |
| Sprite animation state machine | _fill in_ | _fill in_ |
| This documentation system | Human (prompted structure to Claude) | N/A |

**Guiding rule:** if a component is >70% agent-generated, say so plainly here rather than letting the README imply otherwise.

</details>

## Retro & Learnings

<details>
<summary><strong>Click to expand — what worked, what didn't</strong></summary>

- **What worked:** Splitting sprite/SFX sourcing from asset-download automation into two distinct sessions kept scope manageable. Using a scraper script rather than manual downloads made the licensing/attribution tracking systematic instead of ad hoc.
- **What didn't:** Across two separate coding-agent sessions (Windsurf, then VS Copilot), both narrated task completion — "moved files," "created docs/CREDITS.md," "regenerated the manifest" — that didn't match the actual file tree or file contents afterward. In one case an agent's own script-fix summary was pasted back verbatim in a later turn as if it were a fresh run, with identical output, suggesting the fix had never actually been applied.
- **What I'd prompt differently next time:** Build a ground-truth verification step in from the start rather than bolting it on after multiple rounds of mismatched claims. `scripts/project-status.py` now exists for exactly this — it reads the filesystem/git state directly instead of relying on any agent's self-report, and every pairing session should run it before accepting a "done."

</details>

## Linked Documents

| Doc | Purpose |
|---|---|
| [SESSION_LOG.md](SESSION_LOG.md) | Full chronological pairing session history |
| [PROMPT_LIBRARY.md](PROMPT_LIBRARY.md) | Reusable prompts + what made them effective |
| [DECISIONS.md](DECISIONS.md) | ADR-style record of architecture decisions |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design and the Python-service rationale |
| [CREDITS.md](CREDITS.md) | Third-party sprite/audio sourcing, licenses, and attribution status |
| [../STATUS.txt](../STATUS.txt) | Ground-truth project snapshot — generated by `scripts/project-status.py`, not narrated by any agent |