# Session Log

Full chronological record of every AI-paired session on this project. The summary table in [AGENTIC_WORKFLOW.md](AGENTIC_WORKFLOW.md) shows the 3-5 most recent — this file is the complete archive.

**How to add an entry:** copy the template below, fill it in immediately after a session while it's fresh, don't batch these up.

---

## Template

```markdown
### YYYY-MM-DD — [Short session title]

- **Tool used:** [e.g. Copilot cloud agent, Claude, ChatGPT]
- **Goal:** What you asked the agent to do
- **Prompt summary:** One or two sentences (link to full prompt in PROMPT_LIBRARY.md if reusable)
- **What the agent produced:** Brief description
- **Human review/changes:** What you kept as-is, what you edited, what you rejected and why
- **Outcome:** ✅ merged / 🟡 partial / ❌ discarded
- **Time saved vs. hand-writing (rough estimate):**
- **Anything worth remembering:**
```

---

## Entries

### _YYYY-MM-DD — Initial project scaffold_

- **Tool used:** GitHub Copilot cloud agent
- **Goal:** Generate the base Next.js + FastAPI project structure per the architecture spec
- **Prompt summary:** Structured prompt specifying tech stack, folder layout, and five scaffolded features (see [PROMPT_LIBRARY.md](PROMPT_LIBRARY.md#scaffold-prompt))
- **What the agent produced:** _fill in after PR review_
- **Human review/changes:** _fill in_
- **Outcome:** _fill in_
- **Time saved vs. hand-writing (rough estimate):** _fill in_
- **Anything worth remembering:** _fill in_

### 2026-07-07 — Open-source asset sourcing + downloader script + multi-tool verification gap

- **Tools used:** Claude (asset research, script authoring, doc updates), Windsurf (local script editing/execution), VS Copilot (attempted handoff after Windsurf stalled)
- **Goal:** Source CC0/CC-BY sprites and SFX matching the beast-transformation/sci-fi-soldier/metroidvania aesthetic, build a downloader script to fetch them programmatically, and track licensing in `docs/CREDITS.md`
- **What happened:** Claude researched and shortlisted real OpenGameArt/Freesound assets, wrote `scripts/asset-fetch.py` (OGA scraper + Freesound API preview downloader), and drafted `docs/CREDITS.md`. Windsurf ran the script locally; the first run mis-scraped Drupal thumbnail-derivative URLs instead of real asset files (e.g. an SFX zip pack downloaded as a small `.png`). Claude patched the scraper to filter `/styles/` thumbnail paths and prefer real asset extensions.
- **The actual problem:** Both Windsurf and VS Copilot, in separate turns, reported task completion ("moved files," "created docs/CREDITS.md," "regenerated manifest") that didn't match the real file tree — `docs/CREDITS.md` was reported created twice but never appeared locally, and a later terminal paste showed the *exact same* stale output as a prior turn, suggesting a claimed fix had not actually been applied.
- **Resolution:** Rather than trust further narrated summaries, built `scripts/project-status.py` — a ground-truth snapshot generator that reads the filesystem and git state directly (file sizes, a hash + marker-string check on `scripts/asset-fetch.py` to confirm which version is actually on disk, manifest contents) with no agent self-reporting in the loop.
- **Outcome:** 🟡 partial — Freesound downloads (3/3) succeeded cleanly via the API and are verified real audio files. OpenGameArt downloads are still unconfirmed as of this entry; `project-status.py` is the next step to verify actual file sizes before trusting them.
- **Time saved vs. hand-writing (rough estimate):** Net negative so far on the asset-download portion specifically, due to the verification gap — a good illustration that agentic speed gains can be erased by unverified completion claims.
- **Anything worth remembering:** Treat "done" from any coding agent as a claim to verify against the actual file tree, not as ground truth on its own — especially across multi-tool handoffs, where one tool's summary of another tool's work compounds the risk of drift. This is arguably the most authentic "agentic collaboration" finding of the whole project.

_Add new entries above this line, most recent first or last — pick one convention and stay consistent._