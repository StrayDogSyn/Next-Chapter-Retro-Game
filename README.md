# Next-Chapter-Retro-Game

Retro SNES-inspired 2D platformer showcase for a coding bootcamp capstone.

## Tech Stack Rationale

- **Next.js 14 + TypeScript**: clear component model, App Router conventions, and typed game/UI code in one project.
- **HTML5 Canvas (hand-rolled loop)**: demonstrates core game-dev fundamentals (`requestAnimationFrame`, delta-time updates, input polling, sprite state handling) without hiding logic behind an engine.
- **Python (FastAPI) service**: Python is used specifically for **procedural level generation** to keep generation rules easy to experiment with separately from rendering.
- **Web Audio API**: browser-native low-level audio playback control suitable for short chiptune SFX.

## Project Structure

- `/app` - Next.js routes/pages and API routes
- `/components` - canvas renderer + HUD/menu UI
- `/lib` - game loop, sprite animation controller, input, audio manager
- `/python-service` - FastAPI app, isolated dependencies, docs
- `/public/sprites` and `/public/audio` - asset folders with naming conventions

## Frontend/Backend Communication

1. Next.js route `GET /api/procedural-level` calls the Python service at `PYTHON_SERVICE_URL` (defaults to `http://127.0.0.1:8000`).
2. Python endpoint `GET /generate-level` returns generated platform data.
3. Frontend page fetches `/api/procedural-level` to confirm service integration and show status.

If the Python service is unavailable, the API route returns a fallback level payload so frontend iteration can continue.

## Local Development

### Frontend

```bash
npm install
npm run dev
```

### Python service

```bash
cd python-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Features Scaffolded

- Canvas game loop with delta-time updates
- Sprite animation state machine (`idle`, `walk`, `jump`)
- Keyboard input handling (Arrow keys + WASD)
- React HUD overlay (score + lives)
- Working Next.js -> FastAPI integration path for level generation

## AI Collaboration Notes

- **Agent-generated**: initial Next.js/FastAPI scaffold, canvas loop wiring, sprite state machine scaffold, API integration route, baseline docs.
- **Intended hand-written follow-up**: final gameplay tuning, real sprite/audio assets, level design balancing, polish and bug fixing based on playtesting.
