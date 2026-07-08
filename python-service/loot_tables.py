"""Loot table definitions — authoritative copy for rolling (ADR-001).

Mirrors lib/game/items.ts (shared definitions so the TS client can render
whatever this service rolls). If you change one file, change the other —
each carries this header as the reminder.
"""

BASE_WEAPONS = [
    {"id": "sword", "name": "Sword", "kind": "melee", "damage": 10, "speed": 2.0, "range": 26, "sound": "sword"},
    {"id": "spear", "name": "Spear", "kind": "melee", "damage": 8, "speed": 1.6, "range": 40, "sound": "sword"},
    {"id": "claws", "name": "Beast Claws", "kind": "melee", "damage": 6, "speed": 3.2, "range": 20, "sound": "sword"},
    {"id": "hammer", "name": "Warhammer", "kind": "melee", "damage": 18, "speed": 0.9, "range": 28, "sound": "sword"},
    {"id": "pistol", "name": "Laser Pistol", "kind": "ranged", "damage": 7, "speed": 2.5, "range": 220, "projectileSpeed": 320, "sound": "laser"},
    {"id": "rifle", "name": "Laser Rifle", "kind": "ranged", "damage": 12, "speed": 1.4, "range": 300, "projectileSpeed": 420, "sound": "laser"},
    {"id": "wand", "name": "Chaos Wand", "kind": "magic", "damage": 9, "speed": 1.8, "range": 240, "projectileSpeed": 240, "sound": "magic"},
]

PREFIXES = [
    {"id": "plain", "name": "", "damageMult": 1.0, "speedMult": 1.0},
    {"id": "rusty", "name": "Rusty", "damageMult": 0.8, "speedMult": 0.95},
    {"id": "keen", "name": "Keen", "damageMult": 1.1, "speedMult": 1.05, "effect": "crit"},
    {"id": "vicious", "name": "Vicious", "damageMult": 1.25, "speedMult": 0.95},
    {"id": "blazing", "name": "Blazing", "damageMult": 1.15, "speedMult": 1.0, "effect": "burn"},
    {"id": "frozen", "name": "Frozen", "damageMult": 1.05, "speedMult": 0.9, "effect": "freeze"},
    {"id": "vampiric", "name": "Vampiric", "damageMult": 1.0, "speedMult": 1.0, "effect": "lifesteal"},
    {"id": "shock", "name": "Thunderstruck", "damageMult": 1.1, "speedMult": 1.1, "effect": "shock"},
    {"id": "cursed", "name": "Cursed", "damageMult": 1.5, "speedMult": 0.85, "effect": "curse"},
    {"id": "swift", "name": "Swift", "damageMult": 0.9, "speedMult": 1.35},
]

RARITIES = {
    "common": {"weight": 60, "statMult": 1.0, "rollSpread": 0.10},
    "uncommon": {"weight": 25, "statMult": 1.2, "rollSpread": 0.15},
    "rare": {"weight": 11, "statMult": 1.5, "rollSpread": 0.20},
    "epic": {"weight": 4, "statMult": 2.0, "rollSpread": 0.25},
}

UPGRADES = {
    "maxHp": {"name": "Heart Container", "baseValue": 20, "unit": "HP"},
    "moveSpeed": {"name": "Sprint Servos", "baseValue": 10, "unit": "%"},
    "jumpPower": {"name": "Coil Boots", "baseValue": 8, "unit": "%"},
    "doubleJump": {"name": "Aether Wings", "baseValue": 1, "unit": "jump"},
    "dash": {"name": "Phase Dash Module", "baseValue": 1, "unit": "dash"},
    "defense": {"name": "Plated Vest", "baseValue": 10, "unit": "%"},
    "luck": {"name": "Lucky Fang", "baseValue": 8, "unit": "%"},
    "attackSpeed": {"name": "Adrenal Gland", "baseValue": 10, "unit": "%"},
    "lifeSteal": {"name": "Leech Sigil", "baseValue": 4, "unit": "%"},
    "critChance": {"name": "Hunter's Eye", "baseValue": 6, "unit": "%"},
    "coinMagnet": {"name": "Greed Lodestone", "baseValue": 48, "unit": "px"},
    "thorns": {"name": "Spine Mail", "baseValue": 5, "unit": "dmg"},
}

UPGRADE_DROP_CHANCE = 0.35
