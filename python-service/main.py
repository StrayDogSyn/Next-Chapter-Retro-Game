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

from fastapi import FastAPI

from loot_tables import (
    BASE_WEAPONS,
    PREFIXES,
    RARITIES,
    UPGRADE_DROP_CHANCE,
    UPGRADES,
)

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
