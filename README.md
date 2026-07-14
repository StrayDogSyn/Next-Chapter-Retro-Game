# Bytefall: Segfault Summit

Bytefall: Segfault Summit is a retro-inspired full-stack showcase blending SNES-style 2D sprite art, open-source chiptune SFX, and Python-powered game logic inside a TypeScript/Next.js app — built in collaboration with AI coding agents to demonstrate agentic development workflows alongside core software engineering fundamentals.

![Start screen](assets/img/screenshots/starting-screen.png)

![Status](https://img.shields.io/badge/status-in--progress-yellow)
![Stack](https://img.shields.io/badge/stack-Next.js%2014%20%2B%20React%2018%20%2B%20TypeScript%205.9%20%2B%20FastAPI-blue)
![Tests](https://img.shields.io/badge/tests-vitest%204.1-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

> Built for the **Next Chapter bootcamp** capstone submission.

**🎮 Play the beta live: [straydogsyn.github.io/Next-Chapter-Retro-Game](https://straydogsyn.github.io/Next-Chapter-Retro-Game/)** — see [docs/BETA_TESTING.md](docs/BETA_TESTING.md) for what's being tested, known limitations, and how to file bugs.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Features](#features)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Screenshots](#screenshots)
- [AI Collaboration](#ai-collaboration)
- [Assets & Credits](#assets--credits)
- [Roadmap](#roadmap)
- [License](#license)

---

## Overview

This project is two things at once, on purpose:

1. **A playable retro game** — SNES-era pixel aesthetics, hand-rolled canvas rendering, chiptune SFX, and a 24-room Metroidvania-style world with three bosses.
2. **A demonstration of agentic pairing** — every major build phase was worked through with an AI coding agent, and that process is documented as a first-class part of the submission, not an afterthought.

The Python backend isn't decorative — it owns procedural loot and level generation, while the Next.js frontend owns rendering, input, and UI. See [Architecture](#architecture) for the full rationale.

![Updated gameplay model](assets/img/screenshots/updated-working-model.png)

## Tech Stack

| Layer | Tech | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript | Type-safe, modern React conventions, SSR-capable |
| Rendering | HTML5 Canvas (no game engine) | Demonstrates fundamentals — render loop, delta time, sprite state machines — rather than hiding them behind a library |
| Backend | Python (FastAPI) | Isolated service for logic that's a better fit in Python — see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Audio | Web Audio API | Native browser audio, no dependency needed for simple SFX playback |
| Sprites | Hand-authored/CC0 spritesheets | 16x16 / 32x32 grid, SNES-style palette constraints |

## Architecture

<details>
<summary><strong>Click to expand system overview</strong></summary>

```mermaid
flowchart LR
    A[Browser Canvas Renderer] -->|fetch| C[FastAPI Python Service]
    C -->|JSON| A
    A -->|fallback| D[Client-side loot roller]
    A --> E[Web Audio Manager]
    A --> F[localStorage save mirror]
```

The Next.js app owns rendering, input, and UI. The Python service owns logic that benefits from being outside the request/render cycle — see the full writeup and rationale in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

</details>

### Architecture diagram

![Phase one framework](assets/img/screenshots/phase-one-framework.png)

## Features

<details>
<summary><strong>Core gameplay loop</strong></summary>

- `requestAnimationFrame`-based game loop with delta-time movement
- 24 single-screen rooms across 5 zones, validated at load by `lib/game/levelLoader.ts`
- Sprite animation state machine (idle / walk / jump / attack); hero swapped to swm `char-sheet-alpha.png` + 8 palette variants (ADR-020), aliased clip map (run+aim-sweep sheet with no distinct idle/jump/crouch/hurt/death authored poses — logged as asset debt)
- Unified keyboard + Xbox gamepad + touch input handler; virtual gamepad and tactical tap modes (ADR-021)
- React HUD header and footer layered outside the canvas (HP, XP, coins, weapon, minimap, loot/save source, control hints)
- 4 regular enemy types + 3 bosses with distinct AI patterns
- Deterministic seeded RNG with forked loot/combat/shop streams; Daily Seed and Enter Seed modes
- Run-summary screen on death/victory showing seed, time, rooms visited, coins, level, and enemies defeated
- Save system: shrine checkpoints + server mirroring + `localStorage` fallback (ADR-010)
- Status chip showing online/degraded mode at a glance

</details>

<details>
<summary><strong>Frontend ↔ backend integration</strong></summary>

- The browser calls the Python FastAPI service directly (`lib/game/loot-client.ts` → `/loot/roll`, `lib/game/save-client.ts` → `/save`, `/load`, `/players/register`) — no Next.js API-route proxy, since the site deploys as a static export with no server at runtime (ADR-008/ADR-009); python-service has CORS enabled for the dev and GitHub Pages origins
- Client-side loot fallback mirrors the loot tables for offline resilience; every drop is tagged `python-service` or `client-fallback`
- Anonymous player identity via UUID stored in `localStorage`; saves round-trip to the hosted Render service and Neon database when online, or fall back to browser storage when offline

</details>

## Getting Started

```bash
# 1. Clone
git clone https://github.com/StrayDogSyn/Next-Chapter-Retro-Game.git
cd Next-Chapter-Retro-Game

# 2. Frontend
npm install
npm run dev          # http://localhost:3000

# 3. Backend (separate terminal)
cd python-service
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload  # http://localhost:8000
```

The browser fetches the Python service directly at `NEXT_PUBLIC_PYTHON_SERVICE_URL` (defaults to `http://127.0.0.1:8000` if unset — fine for local dev). Set it as a build-time env var if you deploy python-service somewhere other than localhost.

## Project Structure

```
├── app/                # Next.js routes and API routes
├── components/         # Canvas renderer, header/footer HUD, menu components, touch overlay
├── lib/                # Game loop, input, world, items, audio manager, save/loot clients
├── python-service/     # FastAPI app for loot rolling, persistence, and procedural generation
├── public/
│   ├── assets/          # Extracted asset packs + manifest.json
│   ├── sprites/         # Packed spritesheets + spritemeta.json
│   └── audio/           # CC0/open-source SFX and music
├── assets/              # Source asset zips, manifests, and screenshots
├── downloads/           # Archived source zip downloads
├── scripts/             # Asset pipeline and ground-truth status tools
└── docs/                # Living documentation
    └── archive/historical/  # Superseded briefs and legacy imports (not deleted)
```

## Screenshots

| Start Screen | Loading Sequence |
| --- | --- |
| ![Start screen](assets/img/screenshots/starting-screen.png) | ![Updated loading screen](assets/img/screenshots/updated-loading-screen.png) |

| Gameplay Loop | Controls Menu |
| --- | --- |
| ![Updated gameplay model](assets/img/screenshots/updated-working-model.png) | ![Control menu](assets/img/screenshots/control-menu.png) |

| High Scores | Revamped Level |
| --- | --- |
| ![High scores](assets/img/screenshots/high-scores.png) | ![Revamped level](assets/img/screenshots/revamped-level.png) |

| AI-Augmentation Workflow Capture |
| --- |
| ![Active workflow demonstration](assets/img/screenshots/active-workflow-demonstration.png) |

### Responsive canvas scaling

The canvas keeps its internal 640×352 resolution but scales to fit the viewport while preserving aspect ratio and crisp pixel art.

### Playtest

![Playtest](assets/img/screenshots/playtest01.png)

For a historical timeline of the game's visual evolution (including legacy captures), see [docs/VISUAL_PROGRESSION.md](docs/VISUAL_PROGRESSION.md).

## AI Collaboration

This project was built through paired programming with AI coding agents. Every session, prompt, and architectural decision made in that process is tracked as living documentation rather than folded silently into the commit history. A senior-engineer code review of the current main branch is also logged as a first-class artifact.

**Start here:** [docs/AGENTIC_WORKFLOW.md](docs/AGENTIC_WORKFLOW.md)

**Latest review backlog:** [docs/BUGS_IMPROVEMENT_GUIDE.md](docs/BUGS_IMPROVEMENT_GUIDE.md#cr-findings-2026-07-14)

## Assets & Credits

<details>
<summary><strong>Sprite & audio sourcing</strong></summary>

All third-party assets are CC0 or explicitly licensed for reuse. The runtime assets wired into the game are documented in [docs/CREDITS.md](docs/CREDITS.md), which is regenerated from the asset pipeline's ground-truth output (`assets/wired-assets.txt`) and the download manifests. For future sourcing, see [docs/ASSET_SOURCES.md](docs/ASSET_SOURCES.md).

- **Sprites:** OpenGameArt.org CC0 packs plus hand-authored edits (werewolf boss, wyrmwolf, mech, hero, goblin, imp, bat, flower, tilesets, backgrounds)
- **SFX / music:** Freesound and OpenGameArt CC0 chiptune packs (jump, hit, coin, shoot, sword, laser, boss music, etc.)

</details>

## Roadmap

### Shipped
- [x] Core render loop + sprite animation state machine
- [x] Python service wired to loot generation and persistence
- [x] Real sprite/audio assets swapped in via the asset pipeline
- [x] Living documentation structure and ADRs
- [x] Responsive canvas + header/footer HUD refactor
- [x] Level progression save state and inventory persistence (shrines + server + localStorage fallback, ADR-010)
- [x] Daily/Enter Seed modes and run-summary screen (ADR-017)
- [x] Touch controls — Pointer Events, auto/on/off policy (ADR-021)
- [x] Public deploy on GitHub Pages + Render + Neon
- [x] Hero sprite swapped to verified swm `char-sheet-alpha.png` + 8 palette variants (ADR-020)
- [x] Senior-engineer code review of main branch; CR-001..CR-013 findings logged

### In progress / next
- [ ] Code-review fix backlog (10/13 findings fixed; open: CR-001, CR-006, CR-011 — see [docs/BUGS_IMPROVEMENT_GUIDE.md](docs/BUGS_IMPROVEMENT_GUIDE.md#cr-findings-2026-07-14))
- [ ] Sprite asset utilization pass (AST-014..AST-020: powerups, impacts/weaponflash rarity FX, swm biome, tile-variation pools, zone backdrops, darksaber+wyrmwolf bosses, purge-list execution)
- [ ] Zone-specific ambient/music
- [ ] Bootcamp submission polish pass

## License

MIT — see `LICENSE`.
