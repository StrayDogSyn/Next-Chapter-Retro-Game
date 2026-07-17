# Asset Sources & Sourcing Plan

This document is the living guide for sourcing, categorizing, and integrating third-party assets for RetroVania | Rogue-like Platformer. It focuses on **CC0 / public-domain** libraries so the project can randomize visuals and audio without licensing friction.

> For the currently wired assets, see [CREDITS.md](CREDITS.md). For the pipeline that turns downloaded archives into game-ready files, see [scripts/prepare-assets.py](../scripts/prepare-assets.py).

---

## Licensing ground rule

Use **CC0 1.0 / public-domain** assets wherever possible. Keep attribution notes anyway for internal provenance tracking, especially when mixing itch.io and OpenGameArt sources. This makes the project reviewable and gives us a clear audit trail if a license ever changes.

---

## `assets/sprites/` provenance (2026-07-13, revised 2026-07-14, re-verified 2026-07-14)

The ~70 files directly under `assets/sprites/` (`space_merc.png`, `char-sheet-*.png`, `oga-swm-*.png`, `mainchar-*`, etc.) predate this project's tracked download pipeline (`scripts/asset-fetch.py`/`asset-extract.py`) and had no per-file entry in `CREDITS.md`, `manifest.csv`, or `manifest_bulk.csv`. The user confirmed these were sourced from three free/open platforms:

- https://opengameart.org (CC0/OGA-BY/CC-BY/CC-BY-SA per-asset, verified as the platform's licensing model)
- https://itch.io/game-assets/free/tag-sprites (the "free" tag specifically; per-creator license stated on each item page)
- Freesound.org, for the audio equivalent (a Google share link resolved here)

Most of this folder still has only **site-level attestation, not per-file page URLs** — the exact item page for any individual file in this set was not preserved at download time. Two clarifications now matter for integration planning:

- `space_merc.png` is **not** the actual hero source sheet. It is a `1024x1024` palette-mode composite/mockup image representing a larger matched kit. The integration-relevant hero sources are the already-transparent `char-sheet-alpha.png`, the eight `char-sheet-alt-colours-*-alpha.png` variants, and the `char-sheet-layer-*.png` equipment layers. Any future hero-swap or equipment-visibility work should start from those files, not from `space_merc.png`.
- **Update 2026-07-14 — two subsets are now page-verified, not just site-level attested:**
  - The hero kit (`char-sheet-alpha.png` + 8 palette variants + 4 equipment layers + `char-parts.png`, `powerups-sheet-alpha.png`, `projectiles-sheet-alpha.png`, `projectiles-rotations.png`, `impacts-sheet-colour-{1..5}-alpha.png`, `weaponflash-sheet-colour-{1..5}-alpha.png`, `palette.png`, `diewhirl-sheet-alpha.png`) is confirmed as **"Super Dead Space Gunner Merc Redux: Platform Shmup Hero"** by Emcee Flesher, https://opengameart.org/content/super-dead-space-gunner-merc-redux-platform-shmup-hero, CC-BY 4.0 (2021-10-23) — confirmed by an exact file-list match against the live page, not by filename-prefix inference. It derives from Surt's "Space Merc" (CC-BY 3.0) and JRob774's explosion sheet (CC-BY 3.0), both also requiring attribution.
  - `enemies-sheet-alpha.png`'s baked-in attribution text ("SUPER DEAD GUNNER" / BY EMCEE FLESHER / ON OPENGAMEART.ORG / 2021) was read directly off the image and confirmed against **"Super Dead Gunner: Platform Shmup Enemies"**, https://opengameart.org/content/super-dead-gunner-platform-shmup-enemies, CC-BY 4.0 (2021-06-23) — again an exact single-file match. It derives from Surt's "Dead Gunner", Surt's "Space Merc", and Redshrike's "Scifi Creature Tileset", all also requiring attribution.
  - See `docs/CREDITS.md` for the full attribution rows, including the upstream (Surt/JRob774/Redshrike) credits these two CC-BY 4.0 works pull in.
- The **remaining ~15 `oga-swm-*` files** (mainchar, tiles, fx, objects/enemies, brainguy boss, backgrounds, shop UI) are still unverified — the "Super Dead Gunner" collection index and its other 11 linked submissions were checked on 2026-07-14 and none matched these filenames. Keep this remaining subset under the honest label **"platform confirmed, exact page unknown"** until a matching page is actually found. Do not assume it shares the two verified pages' exact license just because it likely shares the same author/lineage.

That means `CREDITS.md` should keep the still-unverified files under site-level attestation, while the two subsets above now carry exact-page, exact-license attribution. See `docs/SPRITE_ART_INVENTORY.md` for measured dimensions, palette/mode notes, compatibility ratings, and the current integration priority order.

---

## Recommended asset directories

```text
assets/
  img/
    bulk/              # unpacked sprite sheets and tilesets
    kenney/            # Kenney Pixel Platformer sub-pack contents
    screenshots/       # browser verification screenshots
  sounds/
    bulk/              # CC0 sound effects and music
    sfx/               # normalized short SFX (post-pipeline)
    music/             # looping background tracks
  manifest/
    sprites.csv        # path, category, biome, size, rarity, source URL
    sounds.csv         # path, category, loudness, source URL
    wired-assets.txt   # generated by prepare-assets.py
```

The `prepare-assets.py` pipeline reads the `manifest/` files, normalizes sprite sizes and sound loudness, and emits deterministic outputs under `public/sprites/` and `public/audio/`.

---

## Sprite sources

| Source | License | Best for | Link |
|---|---|---|---|
| **Kenney Pixel Platformer** | CC0 1.0 | Tiles, blocks, items, HUD elements, characters, enemies, and environmental pieces. This is the cleanest general-purpose pack because a single pack covers every category the engine needs. | [https://kenney.nl/assets/pixel-platformer](https://kenney.nl/assets/pixel-platformer) |
| **Surt's CC0 Scraps** | CC0 1.0 | Secondary tilesets, terrain concepts, and character silhouettes for biome variety. | [itch.io CC0 platformer](https://itch.io/game-assets/assets-cc0/genre-platformer) |
| **itch.io CC0 platformer collections** | CC0 1.0 | Biome packs, enemy variants, coins, gems, and alternate tilesets for per-zone or per-room randomization. | [https://itch.io/game-assets/genre-platformer/tag-cc0](https://itch.io/game-assets/genre-platformer/tag-cc0) |
| **OpenGameArt Platformer sprites** | Public domain | Mixed platformer art plus sounds in the same archive; good for prototype randomization and fallback SFX. | [https://opengameart.org/content/platformer-sprites](https://opengameart.org/content/platformer-sprites) |

---

## Sound sources

| Source | License | Best for | Link |
|---|---|---|---|
| **OpenGameArt Platformer sprites** | Public domain | Mixed art and sound; good for jump, hit, pickup, and environmental fallback sounds. | [https://opengameart.org/content/platformer-sprites](https://opengameart.org/content/platformer-sprites) |
| **Free Interface/UI Sound Pack** | CC0 1.0 | Equipment swapping, menu modals, minimap toggles, inventory actions, and checkpoint confirmations. | [https://itch.io/t/22104/free-interfaceui-sound-pack-aimed-at-rpg-creators-cc0](https://itch.io/t/22104/free-interfaceui-sound-pack-aimed-at-rpg-creators-cc0) |

Before wiring, group sounds into gameplay buckets so the randomization logic stays intentional:

- `movement` — jump, land, step, dodge, wall-slide
- `combat` — sword swing, hit, kill, projectile, block
- `treasure` — coin, chest, power-up, level-up
- `ui` — select, confirm, back, error, equip
- `ambient` — zone background loops, wind, water, lava
- `boss` — warning cue, phase change, defeat, roar

---

## Category-to-source mapping

| Asset category | Best source | Why it fits randomization |
|---|---|---|
| Terrain, blocks, platforms | Kenney Pixel Platformer | Consistent tilesheets and separate sprites make room-theme swaps easy. |
| Alternate tilesets and biome flavor | itch.io CC0 platformer collections | Large pool of compatible CC0 packs for per-room or per-zone variation. |
| Enemies and NPC visual variety | Kenney + Surt CC0 Scraps | Enough breadth to rotate silhouettes and room encounters without custom art first. |
| Coins, treasure, pickups | Kenney + itch.io CC0 sprite listings | Good supply of item sprites and collectible-friendly pixel art. |
| HUD, minimap, inventory icons | Kenney Pixel Platformer | Includes HUD elements, lowering UI integration cost. |
| UI feedback sounds | itch.io Free Interface/UI Sound Pack | Best match for swapping, menus, confirmations, and modal actions. |
| General gameplay SFX | OpenGameArt mixed public-domain packs | Useful for jump, hit, pickup, and environmental fallback sounds. |

---

## Integration plan

1. **Build an asset manifest.** Tag every file in `assets/manifest/sprites.csv` and `assets/manifest/sounds.csv` with at least:
   - `type`: `platform`, `hazard`, `enemy`, `pickup`, `treasure`, `ui`, `sfx`, `biome`, `rarity`
   - `source_url`: the original download or license page
   - `size` / `tile_size`: for sprite normalization
   - `tags`: comma-separated descriptors for randomization (e.g., `forest,lava,cave`)
2. **Prioritize CC0/public domain first.** If a non-CC0 asset is considered, add it to `docs/DECISIONS.md` as an ADR explaining the exception.
3. **Use the existing `./downloads` or `./assets` zip collection as the ingestion point.** Run `python scripts/prepare-assets.py` to normalize sprite sizes, naming conventions, and sound loudness. The pipeline already writes `assets/wired-assets.txt` for cross-checking against `CREDITS.md`.
4. **Extend the loot tables.** Once pickups and weapons have more sprite variants, extend `lib/game/items.ts` and the Python `loot/roll` endpoint with variant references that map to the manifest.

---

## Highest-value targets

Locate these first to get the biggest immediate return on the asset pool:

1. **More coin/treasure sprites and pickup effects** for premium micro-interactions.
2. **Additional HUD/icon/UI assets** for equipment highlighting, minimap, hints modal, XP counter, and inventory/stat screens.
3. **More enemy, shopkeeper, and NPC sprites** to support replay value, checkpoints, and a coin-spend loop.

---

## Manifest template

Use this as the starting row format for `assets/manifest/sprites.csv`:

```csv
path,category,tile_size,width,height,tags,rarity,source_url
assets/img/kenney/tile.png,tile,16,16,16,ground,common,https://kenney.nl/assets/pixel-platformer
assets/img/kenney/coin.png,pickup,0,16,16,gold,common,https://kenney.nl/assets/pixel-platformer
```

And for `assets/manifest/sounds.csv`:

```csv
path,category,loudness,tags,source_url
assets/sounds/bulk/jump.wav,movement,0.7,movement,https://opengameart.org/content/platformer-sprites
assets/sounds/bulk/coin.wav,treasure,0.8,pickup,https://opengameart.org/content/platformer-sprites
```

---

*Last updated: 2026-07-08*
