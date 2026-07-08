from random import Random
from enum import Enum

from fastapi import FastAPI

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


@app.get("/generate-loot")
def generate_loot(seed: int = 42, quantity: int = 5) -> dict[str, object]:
    """Generate randomized loot drops with Diablo-style rarity and stat rolls."""
    rng = Random(seed)

    # Weapon base types available
    base_weapons = [
        "sword",
        "axe",
        "spear",
        "mace",
        "bow",
        "staff",
    ]

    # Stat modifiers by rarity
    stat_ranges = {
        Rarity.COMMON: {"damage": (5, 10), "crit_chance": (0, 5)},
        Rarity.UNCOMMON: {"damage": (10, 15), "crit_chance": (5, 10)},
        Rarity.RARE: {"damage": (15, 25), "crit_chance": (10, 20)},
        Rarity.EPIC: {"damage": (25, 40), "crit_chance": (20, 35)},
    }

    # Affixes that can spawn with items
    affixes = [
        "of Might",
        "of Swiftness",
        "Flaming",
        "Icy",
        "Draining",
        "Legendary",
    ]

    loot_table = []

    for i in range(quantity):
        # Roll rarity: heavily weighted towards common
        rarity_roll = rng.random()
        if rarity_roll < 0.6:
            rarity = Rarity.COMMON
        elif rarity_roll < 0.85:
            rarity = Rarity.UNCOMMON
        elif rarity_roll < 0.98:
            rarity = Rarity.RARE
        else:
            rarity = Rarity.EPIC

        # Select weapon type
        weapon_type = rng.choice(base_weapons)

        # Roll stats for this rarity
        stat_config = stat_ranges[rarity]
        damage = rng.randint(stat_config["damage"][0], stat_config["damage"][1])
        crit_chance = rng.randint(
            stat_config["crit_chance"][0], stat_config["crit_chance"][1]
        )

        # Optionally add an affix
        affix = ""
        if rng.random() < (0.3 if rarity == Rarity.COMMON else 0.7):
            affix = rng.choice(affixes)

        item_name = f"{affix} {weapon_type.capitalize()}".strip()

        loot_table.append(
            {
                "id": f"item-{i}",
                "name": item_name,
                "type": weapon_type,
                "rarity": rarity,
                "damage": damage,
                "crit_chance": crit_chance,
                "value": int(damage * crit_chance / 2),  # Sale value
            }
        )

    return {
        "seed": f"python-{seed}",
        "generated_at": "server",
        "loot_table": loot_table,
    }

