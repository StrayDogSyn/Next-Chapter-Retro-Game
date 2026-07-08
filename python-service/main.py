from random import Random

from fastapi import FastAPI

app = FastAPI(title="Retro Game Python Service")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/generate-level")
def generate_level(seed: int = 7) -> dict[str, object]:
    """Python owns procedural generation so level math stays easy to iterate."""
    rng = Random(seed)

    platforms = []
    start_x = 32

    for lane in range(4):
        width = rng.choice([96, 128, 160])
        platforms.append(
            {"x": start_x + lane * 130, "y": 280 - lane * 24, "width": width}
        )

    return {"seed": f"python-{seed}", "platforms": platforms}
