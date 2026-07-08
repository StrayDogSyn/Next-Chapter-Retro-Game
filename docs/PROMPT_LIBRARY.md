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
