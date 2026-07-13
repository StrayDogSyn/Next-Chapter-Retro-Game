"""Retro Game Python Service.

Owns the procedural / random-generation game logic per ADR-001:
  - /generate-level : procedural platform layout (original scaffold demo)
  - /loot/roll      : Diablo-style loot rolling -- rarity tiers + randomized
                      stat rolls. THIS is the authoritative loot source; the
                      TypeScript client only renders what this returns (its
                      local fallback is for offline resilience, see ADR-003).
  - /loot/table     : full loot table dump, handy for balancing/debugging.

Persistence (ADR-009):
  - /players/register : idempotent anonymous identity (client-generated UUID)
  - /save, /load       : run_state keyed on that identity, mirroring the
                          client's existing localStorage save shape 1:1
"""

import os
import uuid
from random import Random
from typing import Any

import psycopg
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from db import get_connection
from loot_tables import (
    BASE_WEAPONS,
    PREFIXES,
    RARITIES,
    UPGRADE_DROP_CHANCE,
    UPGRADES,
)

app = FastAPI(title="Retro Game Python Service")

# ADR-008: the browser calls this service directly (no Next.js proxy route,
# since the frontend is a static export with no server at runtime), so CORS
# must allow the deployed origins explicitly. Overridable via ALLOWED_ORIGINS
# (comma-separated) for hosts where the deploy origin isn't known ahead of
# time; falls back to the known dev + GitHub Pages origins.
_default_origins = (
    "http://localhost:3000,http://127.0.0.1:3000,"
    "http://localhost:3001,http://127.0.0.1:3001,"  # Next.js falls back here if 3000 is busy
    "https://straydogsyn.github.io"
)
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("ALLOWED_ORIGINS", _default_origins).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


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


def _pick_rarity(rng: Random, luck_pct: float) -> str:
    """Weighted rarity pick; luck multiplies the weight of every non-common tier."""
    weights = {
        name: tier["weight"] * (1.0 if name == "common" else 1.0 + luck_pct / 100.0)
        for name, tier in RARITIES.items()
    }
    total = sum(weights.values())
    point = rng.random() * total
    for name, weight in weights.items():
        point -= weight
        if point <= 0:
            return name
    return "common"


@app.get("/loot/roll")
def roll_loot(seed: int, luck: float = 0.0, enemy_level: int = 1) -> dict[str, object]:
    """Roll one drop. Deterministic for a given (seed, luck, enemy_level)."""
    rng = Random(f"{seed}:{round(luck, 3)}:{enemy_level}")
    rarity = _pick_rarity(rng, luck)
    tier = RARITIES[rarity]
    level_mult = 1.0 + 0.08 * max(0, enemy_level - 1)

    if rng.random() < UPGRADE_DROP_CHANCE:
        upgrade_id = rng.choice(list(UPGRADES.keys()))
        definition = UPGRADES[upgrade_id]
        spread = 1.0 + rng.uniform(-tier["rollSpread"], tier["rollSpread"])
        value = max(1, round(definition["baseValue"] * tier["statMult"] * spread))
        return {
            "itemType": "upgrade",
            "upgradeId": upgrade_id,
            "rarity": rarity,
            "name": definition["name"],
            "value": value,
            "rolledBy": "python-service",
        }

    base = rng.choice(BASE_WEAPONS)
    prefix = rng.choice(PREFIXES)
    spread = 1.0 + rng.uniform(-tier["rollSpread"], tier["rollSpread"])
    damage = base["damage"] * prefix["damageMult"] * tier["statMult"] * spread * level_mult
    name = f"{prefix['name']} {base['name']}".strip()

    drop: dict[str, object] = {
        "itemType": "weapon",
        "baseId": base["id"],
        "prefixId": prefix["id"],
        "rarity": rarity,
        "name": name,
        "damage": round(damage, 2),
        "speed": round(base["speed"] * prefix["speedMult"], 2),
        "range": base["range"],
        "kind": base["kind"],
        "sound": base["sound"],
        "rolledBy": "python-service",
    }
    if "projectileSpeed" in base:
        drop["projectileSpeed"] = base["projectileSpeed"]
    if "effect" in prefix:
        drop["effect"] = prefix["effect"]
    return drop


@app.get("/loot/table")
def loot_table() -> dict[str, object]:
    """Full table dump for balancing: every base x prefix x rarity combo count."""
    combos = len(BASE_WEAPONS) * len(PREFIXES) * len(RARITIES)
    return {
        "baseWeapons": BASE_WEAPONS,
        "prefixes": PREFIXES,
        "rarities": RARITIES,
        "upgrades": UPGRADES,
        "distinctWeaponCombos": combos,
        "upgradeDropChance": UPGRADE_DROP_CHANCE,
    }


class RegisterRequest(BaseModel):
    client_uuid: uuid.UUID


class SaveRequest(BaseModel):
    client_uuid: uuid.UUID
    save_data: dict[str, Any]


def _find_player_id(conn: psycopg.Connection, client_uuid: uuid.UUID) -> int | None:
    row = conn.execute(
        "SELECT id FROM players WHERE client_uuid = %s", (client_uuid,)
    ).fetchone()
    return row["id"] if row else None


@app.post("/players/register")
def register_player(body: RegisterRequest) -> dict[str, object]:
    """Idempotent: same client_uuid always resolves to the same player row."""
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO players (client_uuid) VALUES (%s)
            ON CONFLICT (client_uuid) DO NOTHING
            """,
            (body.client_uuid,),
        )
        player_id = _find_player_id(conn, body.client_uuid)
    return {"playerId": player_id, "clientUuid": str(body.client_uuid)}


@app.post("/save")
def save_run(body: SaveRequest) -> dict[str, object]:
    """Upserts the one active run for this player (mirrors the client's
    single-slot localStorage save - see Game.saveGame() in game.ts)."""
    with get_connection() as conn:
        player_id = _find_player_id(conn, body.client_uuid)
        if player_id is None:
            raise HTTPException(status_code=404, detail="player not registered")
        conn.execute(
            """
            INSERT INTO run_state (player_id, save_data, updated_at)
            VALUES (%s, %s, now())
            ON CONFLICT (player_id)
            DO UPDATE SET save_data = EXCLUDED.save_data, updated_at = now()
            """,
            (player_id, psycopg.types.json.Jsonb(body.save_data)),
        )
    return {"ok": True}


@app.get("/load")
def load_run(client_uuid: uuid.UUID) -> dict[str, object]:
    with get_connection() as conn:
        player_id = _find_player_id(conn, client_uuid)
        if player_id is None:
            raise HTTPException(status_code=404, detail="player not registered")
        row = conn.execute(
            "SELECT save_data, updated_at FROM run_state WHERE player_id = %s",
            (player_id,),
        ).fetchone()
    if row is None:
        return {"ok": False, "saveData": None}
    return {"ok": True, "saveData": row["save_data"], "updatedAt": row["updated_at"].isoformat()}
