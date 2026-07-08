# Decisions & Rationale (ADRs)

Lightweight Architecture Decision Records. Each one captures a choice, whether it originated from the AI agent or from you, and why it stuck (or got reverted).

---

## Template

```markdown
## ADR-XXX: [Decision title]

- **Date:**
- **Status:** Proposed / Accepted / Rejected / Superseded
- **Originated from:** Agent suggestion / Human decision / Joint
- **Context:** What problem or question prompted this
- **Decision:** What was decided
- **Alternatives considered:**
- **Consequences:** Tradeoffs, what this makes easier/harder later
```

---

## ADR-001: Isolate Python service instead of embedding logic in Next.js API routes

- **Date:** _fill in_
- **Status:** Accepted
- **Originated from:** Human decision (specified in initial scaffold prompt)
- **Context:** Needed a clear, defensible reason for Python to exist in a TypeScript-first stack rather than it being decorative
- **Decision:** Python runs as a standalone FastAPI service, called via Next.js API routes as a client, rather than being embedded or serverless-bundled
- **Alternatives considered:**
  - Python serverless functions colocated in the Next.js project
  - Skipping Python entirely and doing all logic in TypeScript
- **Consequences:** Clean separation of concerns and a legitimate "software diversity" story for the submission; adds the overhead of running two services locally (documented in README's Getting Started)

---

## ADR-002: No game engine library — hand-rolled canvas render loop

- **Date:** _fill in_
- **Status:** Accepted
- **Originated from:** Human decision
- **Context:** Bootcamp submission is meant to demonstrate fundamentals, not library fluency
- **Decision:** Use raw HTML5 Canvas + `requestAnimationFrame`, no Phaser/PixiJS/etc.
- **Alternatives considered:** Phaser.js (faster to build, but hides the render loop and state machine mechanics being showcased)
- **Consequences:** More code to write and maintain, but every line is legible and demonstrates understanding rather than configuration

---

_Add new ADRs as decisions are made — including ones where you overrode an agent's suggestion. Those are often the most interesting entries for a reviewer._
