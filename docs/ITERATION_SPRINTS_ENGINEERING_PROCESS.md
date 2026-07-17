# Iteration, Sprints & Engineering Process

This document highlights the methodology used to build RetroVania. Because this project leveraged AI pair-programming, strict processes were required to prevent architectural drift, AI bloat, and hallucinated regressions. The focus was on constraint-driven sprints, modular testing, and knowing when to strategically pivot.

## The Multi-Agent Workflow

No single AI model was trusted to handle the entire repository. The pipeline was strictly segmented based on tool strengths:

1. Architecture and Scope (Gemini): Used as the lead sounding board to draft strict sprint prompts, manage scope, generate python asset-packing scripts, and review codebase audits.
2. Deep Implementation (Claude / Windsurf): Tasked with dense state-machine logic, React hooks, physics derivations, and deterministic RNG integration.
3. Surgical Patching and UI (VS Code / GitHub Copilot): Used strictly for file-system manipulation, HTML/CSS glassmorphic UI generation, and deployment hygiene without risking the core engine logic.

## Case Studies: Blockers, Pivots, and Debugging

### 1. The Blue Platform Blockade (Pragmatic Scope Management)

The Problem:
Live testing revealed an unpredictable collision bug with the one-way blue platforms (`-` tile). Despite three separate diagnostic runs, the AI assistant could not reproduce the issue mathematically in its isolated environment and pushed back against blindly patching the physics engine.

The Pivot:
Rather than burning development hours fighting an AI over an invisible bug, an executive decision was made to cut the feature.

The Solution:
The map parser was overridden to seamlessly convert the `-` ASCII characters directly into standard solid stone (`T_SOLID`). This guaranteed absolute collision stability for the final submission build, prioritizing a playable core loop over a minor mechanical feature.

### 2. The StrictMode Zombie Loop (React Lifecycle Management)

The Problem:
Early in development, the game engine would double its execution speed and crash browser memory.

The Debugging Process:
Diagnostic tracing revealed that Next.js `StrictMode` was double-mounting the `useEffect` that initialized the `requestAnimationFrame` canvas loop, causing multiple concurrent instances.

The Solution:
Rather than taking the easy route of globally disabling `StrictMode` in the Next config, a `useRef` mounting guard was implemented to prevent the loop from instantiating twice. This stabilized the physics engine while maintaining strict development mode safety.

### 3. Bypassing Procedural RNG for FX Testing (Testability)

The Problem:
Integrating visual effects (muzzle flashes, death whirls) required rapid visual feedback. However, ADR-029 procedural generation shuffled room layouts per-seed, making it tedious to locate enemies and test weapon impacts.

The Solution:
The `lib/game/game.ts` initialization was temporarily modified to expose the live `Game` instance to the global `window` object in development mode. This allowed for manual console-command spawning of enemies and direct FX triggers, entirely bypassing the procedural maze and accelerating the visual polish sprint.

## The Zero Bloat Codebase Audit

Before the final deployment, a strict refactoring sprint was initiated to strip out AI bloat, a common anti-pattern in LLM-assisted projects characterized by excessive defensive null-checks, single-use wrappers, and narration comments.

The audit returned a zero-modification report. The codebase was verified clean because the project maintained strict engineering hygiene from day one:

- Documentation over Narration: Comments were restricted to explaining why, not what. (Example: documenting the canvas-Y-down sign convention, or referencing specific ADRs for jump velocity formulas).
- Trusting TypeScript: Defensive runtime checks were only used at API boundaries (untrusted JSON from the Python loot service, or hardware-specific Gamepad API quirks), avoiding redundant null-checks for types already guaranteed by TS.
- Imperative Isolation: `useEffect` hooks were strictly limited to inherently imperative tasks (canvas drawing, audio loading, polling) rather than unnecessary state derivation.

By treating the AI as a junior developer requiring strict mathematical constraints and architectural boundaries, the resulting codebase remains lean, human-readable, and highly maintainable.
