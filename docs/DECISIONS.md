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

## ADR-003: Unified input interface (InputState) for keyboard + gamepad

- **Date:** 2026-07-07
- **Status:** Accepted
- **Originated from:** Agent suggestion (during gamepad implementation)
- **Context:** Needed to support both keyboard and Xbox gamepad input without duplicating movement/action logic in the game loop
- **Decision:** Create a single `InputState` interface that both keyboard and gamepad handlers write into; gamepad polling happens every frame in the render loop via `updateGamepadState()`
- **Alternatives considered:**
  - Separate keyboard and gamepad branches in GameCanvas (would double the input-checking code every frame)
  - Use an event emitter pattern for gamepad input (would be async and mess with frame timing)
- **Consequences:** 
  - Clean separation between input handling (InputHandler) and game logic (GameCanvas) — game loop only reads from InputState
  - Future controller rebinding (ADR for next phase) will only need to touch InputHandler, not game logic
  - Gamepad must be polled every frame because there's no "gamepad button down" browser event; this is baked into GameLoop design

---

_Add new ADRs as decisions are made — including ones where you overrode an agent's suggestion. Those are often the most interesting entries for a reviewer._
