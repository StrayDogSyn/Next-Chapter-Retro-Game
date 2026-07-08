"""Retro Game Python Service.

Owns the procedural / random-generation game logic per ADR-001:
  - /generate-level : procedural platform layout (original scaffold demo)
  - /loot/roll      : Diablo-style loot rolling -- rarity tiers + randomized
                      stat rolls. THIS is the authoritative loot source; the
                      TypeScript client only renders what this returns (its
                      local fallback is for offline resilience, see ADR-003).
  - /loot/table     : full loot table dump, handy for balancing/debugging.
"""

from random import Random
from enum import Enum

from fastapi import FastAPI

from loot_tables import (
    BASE_WEAPONS,
    PREFIXES,
    RARITIES,
    UPGRADE_DROP_CHANCE,
    UPGRADES,
)

app = FastAPI(title="Retro Game Python Service")


class Rarity(str, Enum):
    COMMON = "common"
    UNCOMMON = "uncommon"
    RARE = "rare"
    EPIC = "epic"


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
