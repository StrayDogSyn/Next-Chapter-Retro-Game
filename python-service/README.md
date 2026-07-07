# Python Service (FastAPI)

This service exists for **procedural level generation** so gameplay generation rules can be prototyped quickly in Python while the frontend remains focused on rendering/input.

## Run locally

```bash
cd python-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Endpoints

- `GET /health` - health check
- `GET /generate-level?seed=7` - returns a generated platform layout
