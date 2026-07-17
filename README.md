# RetroVania | Rogue-like Platformer

A retro-inspired full-stack rogue-like platformer built as a Next Chapter admissions project. It combines a hand-rolled canvas game engine, deterministic seeded runs, and Python-backed loot/persistence while documenting real AI-paired development end to end.

**Reviewer Quick Check**

- Live demo: https://straydogsyn.github.io/Next-Chapter-Retro-Game/
- Prompt history file: `prompt-history.md` (repo root)
- AI workflow evidence: `docs/AGENTIC_WORKFLOW.md`, `docs/SESSION_LOG.md`
- Build command: `npm run build` (generates `/out/index.html` for static export)

<div align="center">

![Current gameplay](assets/img/screenshots/updated-working-model.png)

![Status](https://img.shields.io/badge/status-in--progress-yellow)
![Stack](https://img.shields.io/badge/stack-Next.js%2014%20%2B%20React%2018%20%2B%20TypeScript%205.9%20%2B%20FastAPI-blue)
![Tests](https://img.shields.io/badge/tests-vitest%204.1-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

</div>

## Table of Contents

- [Project Name](#project-name)
- [Live Demo](#live-demo)
- [Problem](#problem)
- [Value](#value)
- [Project Plan](#project-plan)
- [Features](#features)
  - [Complete](#complete)
  - [Next Up](#next-up)
  - [Architecture Snapshot](#architecture-snapshot)
- [Technologies Used](#technologies-used)
- [AI Tools Used](#ai-tools-used)
- [Running the Project](#running-the-project)

---

## Project Name

RetroVania | Rogue-like Platformer

## Live Demo

Play the live build on GitHub Pages:

https://straydogsyn.github.io/Next-Chapter-Retro-Game/

For active testing scope and known limitations, see `docs/BETA_TESTING.md`.

## Problem

Many static portfolio projects are fast to skim but hard to evaluate for real engineering depth. They can show layout and styling, but often do not clearly demonstrate sustained logic design, state orchestration, debugging under pressure, and iterative delivery.

This project addresses that gap by shipping a playable, systems-heavy application where reviewers can directly observe collisions, combat loops, progression systems, persistence behavior, and resilience paths.

## Value

This project creates value in two ways:

1. For players/testers: a playable retro action game with deterministic seeds, progression, and replayability.
2. For admissions reviewers: direct evidence that complex software was planned, implemented, audited, debugged, and improved through effective AI collaboration rather than one-shot code generation.

The result is a submission that demonstrates:

- Complex logic composition (physics, combat, AI, inventory, room graph traversal).
- Real state management across runtime/UI/save flows.
- Structured AI usage with verification, iteration, and documented decisions.
- Maintainable engineering habits through ADRs, session logs, and repeatable verification checkpoints.

## Project Plan

This project followed the phased approach tracked in `docs/MASTER_BUILD_SPEC.md`:

1. Foundation and refactor: establish core structure, verification workflow, and living documentation.
2. Rendering and sprites: canvas rendering, sprite animation system, and visual pipeline integration.
3. Gameplay systems: world graph, enemy/boss behavior, loot/inventory systems, and progression mechanics.
4. Reliability and QA: targeted bug audits, collision and reachability checks, strict verification gates.
5. Deployment and docs hardening: static export, live demo readiness, and submission-facing documentation quality.

Scope discipline was intentional: prioritize the smallest complete demonstration of value, then iterate safely.

## Features

### Complete

<details>
<summary><b>Click to expand the full completed-feature breakdown</b></summary>

**Core gameplay**

- Hand-rolled `requestAnimationFrame` game loop (no Phaser/Pixi)
- 24 single-screen interconnected rooms across 5 zones
- 4 enemy types + 3 boss encounters, each with sprite-sheet idle/attack animation and a dedicated multi-frame death sequence
- Melee/projectile combat with sprite-backed projectiles, muzzle-flash and impact FX, and rarity-tinted hit feedback
- Loot-driven progression: rarity-tiered weapons with rolled stats and elemental affixes (burn/freeze/shock/curse)
- Real inventory with equip/sell/scrap flows
- Shrine save flow with server mirror + local fallback; NPC shop economy sink

**Replayability and progression**

- Deterministic seeded runs with forked RNG streams
- Daily seed and manual seed-entry modes
- Run summary on death/victory (seed, time, progress, combat stats)
- Ability/key gating system integrated with world traversal

**Platform and UX support**

- Keyboard + gamepad + touch input support
- React HUD (XP bar, mini-map) + modal UI layered over canvas runtime
- Degraded-mode resilience when backend is unavailable
- Public deployment model: static frontend + independent Python service

</details>

### Next Up

<details>
<summary><b>Click to expand planned enhancements</b></summary>

- **Coherent single biome**: unify tiles, backdrops, and enemies under one consistent art set — currently mixed across source sheets (see `docs/BUGS_IMPROVEMENT_GUIDE.md` AST-016)
- **Zone-specific backdrops**: distinct backgrounds per zone instead of one shared background family (AST-018)
- **Level-cleared tracking**: persist which rooms have already been looted so revisiting a cleared room doesn't imply infinite re-farming (open item in `docs/ARCHITECTURE.md`)
- **Equipment HUD polish**: stronger highlight/swap feedback when gear changes (UI-002)
- **Treasure micro-interactions**: richer pickup animation and currency visual variety (UX-006)
- **Remaining asset ingestion**: wire the unprocessed archives under `./downloads` into the asset pipeline (AST-010)

</details>

### Architecture Snapshot

<details>
<summary><b>Click to expand architecture diagram</b></summary>

<div align="center">

```mermaid
graph LR
    A[Browser Canvas Runtime] -- "fetch" --> B[FastAPI Python Service]
    B -- "JSON" --> A
    A --> C[Web Audio]
    A --> D[localStorage Fallback]
```

</div>

See `docs/ARCHITECTURE.md` for full detail.

</details>

## Technologies Used

- HTML5 Canvas
- CSS (global styling + responsive game shell)
- JavaScript/TypeScript (Next.js + React)
- Next.js 14 (App Router, static export workflow)
- Python FastAPI (loot and persistence services)
- Neon PostgreSQL (persistence target)
- Vitest + TypeScript compiler checks
- GitHub Pages (frontend), Render (service), Neon (database)

## AI Tools Used

This project deliberately used a range of AI tools rather than defaulting to one. Each tool has different strengths, weaknesses, and context/token budgets, and matching the tool to the task — implementation vs. research vs. asset sourcing vs. in-browser verification — kept token usage efficient and avoided asking any single model to do work it wasn't well-suited for.

<details>
<summary><b>Click to expand the full tool-by-tool breakdown</b></summary>

**Primary implementation agents** (hands-on coding, debugging, and verification-gated feature work — extensively logged in `docs/SESSION_LOG.md` / `docs/AGENTIC_WORKFLOW.md`):

- Claude Code
- GitHub Copilot / VS Code CoPilot
- Windsurf Cascade

**Research, prompting, and browser-based verification** (used for prompt drafting, sourcing open-source art/audio assets via web search, and running automated in-browser tests/reports where a lighter-weight tool was the better fit than burning implementation-agent context on it):

- Gemini
- Perplexity
- Comet Assistant (Browser)

**Supplementary cloud agent:**

- Devin Cloud — offloaded background/investigation tasks outside the main implementation loop.

</details>

Comprehensive AI collaboration evidence — including a full post-mortem on workflow strategy, debugging, and scope decisions — is documented in:

- `docs/AGENTIC_WORKFLOW.md` (see the [Project Post-Mortem](docs/AGENTIC_WORKFLOW.md#project-post-mortem) section)
- `docs/ITERATION_SPRINTS_ENGINEERING_PROCESS.md`
- `docs/SESSION_LOG.md`
- `docs/PROMPT_LIBRARY.md`
- `docs/DECISIONS.md`
- `prompt-history.md` (submission-ready condensed prompt sample)

## Running the Project

**Note for Reviewers: This project uses Next.js static export. The required `index.html` is automatically generated in the `/out` directory during the build process and correctly served by GitHub Pages.**

### Local development

```bash
# 1) Clone
git clone https://github.com/StrayDogSyn/Next-Chapter-Retro-Game.git
cd Next-Chapter-Retro-Game

# 2) Frontend
npm install
npm run dev

# 3) Backend (new terminal)
cd python-service
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Frontend defaults to `http://localhost:3000` and the Python service to `http://127.0.0.1:8000`.

### Production/static export check

```bash
npm run build
npm run preview
```

`npm run build` generates the static export output used for deployment (`/out`, including generated `index.html`). Since `next.config.mjs` bakes the production `basePath` (`/Next-Chapter-Retro-Game`) into every asset URL, **do not open `out/index.html` directly** (via `file://`, VS Code Live Server, `npx serve out`, etc.) — every `_next/` asset will 404 and the page will look frozen, since the browser looks for assets under that subpath, not wherever `out/` happens to sit locally. `npm run preview` serves `/out` rooted at that same subpath (`http://localhost:4173/Next-Chapter-Retro-Game/`), matching what GitHub Pages actually serves.

### Project structure (high level)

- `app/` - Next.js App Router pages/layout/styles
- `components/` - canvas host, HUD, menus, overlays
- `lib/` - game loop, systems, input, data clients
- `python-service/` - FastAPI service and persistence logic
- `public/` - runtime-served assets
- `docs/` - architecture, ADRs, session history, prompt library

---

MIT licensed. See `LICENSE`.
