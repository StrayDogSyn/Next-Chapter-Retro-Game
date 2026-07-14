# NCRG — Asset Inventory & Compatibility Ratings

Audited from the local art library as of 2026-07-14. Ratings target the game's established identity: SNES-era side-scrolling pixel art, dusk-purple palette, 32px world tiles, and dark fantasy-horror with Altered Beast / Space Marine energy.

This document is intentionally about **compatibility and integration value**, not ownership claims. For provenance posture, defer to `docs/ASSET_SOURCES.md` and keep the `assets/sprites/` folder under site-level attestation unless an exact page is explicitly re-found and documented.

> Measurement source: direct local inspection via Pillow (`Image.width`, `Image.height`, `Image.mode`) plus visual review of the sheets themselves.

**Rating scale**

- `STYLE`: `A` perfect, `B` workable with palette/scale care, `C` clashes or niche use only, `F` unusable/wrong medium
- `PROCGEN`: `High`, `Med`, `Low`
- `EFFORT`: `Ready` (alpha'd, grid-regular), `Prep` (keying/slicing needed), `Heavy` (redraw-adjacent)

---

## Headline finding

### The "swm" / "space-merc" material is one cohesive game's worth of art

What had been discussed as "space-merc" is not one file. It is a roughly 30-file matched kit spanning:

- `char-sheet-*`
- `oga-swm-*`
- `impacts-*`
- `weaponflash-*`
- `powerups-*`
- `projectiles-*`
- `palette.png`

One palette, one pixel density, side-view platformer-native.

Most important correction: `space_merc.png` (`1024x1024`, mode `P`) is the kit's **mockup/composite** sheet. Do **not** key it for the hero. The playable character source is `char-sheet-alpha.png`, which already has clean transparency (`RGBA`).

That changes the integration plan in a useful way:

- hero swap is easier than the old purple-box assumption implied
- the layered sheets make equipped-weapon-visible-on-character genuinely feasible
- tile variations, FX color tiers, powerups, and projectiles already line up with seeded variety work

---

## The cohesive swm kit

| Asset family | What it is | STYLE | PROCGEN | EFFORT | Notes |
|---|---|---|---|---|---|
| `char-sheet-alpha.png` (`384x2240`, `RGBA`) + 8 alt palettes | Full merc hero with run/jump/crouch/aim/death rows | `A` | — | `Ready` | Real hero source; visually reads as a regular `6x35` sheet of `64px` cells |
| `char-sheet-layer-{body,boots,gun,silhouette}` (`384x2240`, `RGBA`) | Same hero split into equipment layers | `A` | — | `Ready` | Strong future path for visible equipped gear |
| `enemies-sheet-alpha.png` (`320x528`, `RGBA`) + `extra-enemies*` + `brainguy` + `objectsandenemies` | 15+ matched side-view enemies | `A` | `High` | `Ready` | Recolors and family swaps are good seed material |
| `oga-swm-tiles-alpha.png` (`352x144`, `RGBA`) + `oga-swm-earth-tile-variations-alpha.png` (`288x240`, `RGBA`) + `extra-tiles` | Platformer tiles with explicit variation sets | `A` | `High` | `Ready` | Excellent procgen fuel |
| `impacts-sheet-colour-{1..5}` (`384x960`, `RGBA`) + `weaponflash-{1..5}` (`384x2608`, `RGBA`) | Hit / muzzle FX in 5 color tiers | `A` | `High` | `Ready` | Map directly onto loot rarity tiers |
| `powerups-sheet-alpha.png` (`640x544`, `RGBA`) | Pickup and powerup icons | `A` | `High` | `Ready` | Immediate treasure-drop upgrade path |
| `projectiles-sheet-alpha.png` (`616x544`, `RGBA`) + `projectiles-rotations.png` (`1280x1024`, `RGBA`) | Projectile sets including pre-rotated shots | `A` | `High` | `Ready` | Strong for weapon-family readability |
| `oga-swm-bg-blobby.png`, `oga-swm-bg-gradient-sky.png`, `blobbybg4cbase.png`, `desertbg-pal00.png` | Parallax/background layers | `A` | `Med` | `Ready` | Good biome support inside the same visual language |
| `diewhirl-sheet-alpha.png`, `swoosh.png`, `oga-swm-fx-sheet-alpha.png` | Death / whoosh / misc FX | `A` | `Med` | `Ready` | Ready-made polish layer |
| `oga-swm-shop.png` | Shop interior/stall art | `A` | — | `Ready` | Direct SYS-012 support |
| `all-mockups-all-palettes.png`, `space_merc.png`, `palette.png` | Mockups/reference/palette board | reference only | — | — | Use for direction, not direct runtime wiring |

### Strategic implications

- **Characters:** hero swap should use `char-sheet-alpha.png`, not `space_merc.png`. The 8 palette variants are obvious skin/unlock material.
- **Treasure drops:** `powerups-sheet-alpha.png` plus the 5-color impact/flash tiers give pre-made rarity juice.
- **Equipment visualization:** the separated gun/body layers make visible-on-character equipment practical.
- **Random generation:** tile variations and recolor-friendly enemies are exactly the kind of seed-driven visual variation procgen wants.
- **Levels:** the kit is coherent enough to support at least one full biome with one art direction.

---

## Character and enemy assets outside the kit

| Asset | What it is | STYLE | PROCGEN | EFFORT | Verdict |
|---|---|---|---|---|---|
| `hero_0.png` (`1024x1024`, `RGBA`) | Current hero sheet | `B` | — | wired | Retire on swap; higher-color rendering reads softer than the swm kit |
| `wyrmwolf.png` | Large beast art | `B+` as boss | — | `Prep` | High-color art clashes as a common mob but works as a showpiece boss; aligns with existing `wyrmSlain` naming |
| `biomech_dragon_splice.png` | Biomech dragon concept art | `B` | — | `Prep` | Potential Trampitous Rex reference; verify whether it is sheet-ready |
| darksaber werewolf zip | Boss pack | `B` pending extract | — | `Prep` | Strong marquee-boss candidate once extracted |
| `lpc_goblin`, `lpc_golem`, `lpc_wolf`, `lpc_imp`, `lpc_beetle` | LPC-style sheets | `C` | `Med` | `Heavy` | Three-quarter RPG perspective reads wrong in a side-scroller |
| `24x32_characters_with_faces` zip | Character pack | `B` pending extract | `Med` | `Prep` | Best reserved for NPC/shopkeeper sourcing |
| `bat_sprite.png` (`128x128`) | Current wired bat | `F` | — | — | Probable thumbnail; replace from a real sheet |
| `bloody_mary`, `monkey_lad`, `rpg_enemies_11_dragons` | 100–128px singles | `F` | — | — | Thumbnails / preview-class assets; purge or re-fetch |
| `npcs.png`, `characters.png`, `char-parts.png` | Small NPC/char sets | `B` | `Med` | `Ready` | Serviceable filler; `char-parts` has customization value |
| `2d_sprite_skins_walking_animation.jpg` | JPEG pseudo-sheet | `F` | — | — | JPEG artifacts + no alpha; unsuitable runtime sprite source |

---

## Tiles and level-development assets

| Asset | STYLE | PROCGEN | EFFORT | Verdict |
|---|---|---|---|---|
| swm tiles + variations | `A` | `High` | `Ready` | Primary new biome |
| `dirt_platformer_tiles.png` (`256x96`) | `A-` | `Med` | wired | Keep as current ground set |
| `minimalist_pixel_tileset.png` (`1024x1024`, 4 colors) | `B+` | `High` | `Ready` | Excellent stark / void biome candidate |
| `nature_tileset.png` (`320x240`) | `B` | `Med` | `Prep` | Likely useful after scale normalization |
| `outdoor_tiles_again.png` (`100x100`) | `C` | `Low` | `Prep` | Tiny and off-grid; marginal utility |
| `animated_ocean_water_tile.gif` | `B` | `Med` | `Prep` | Viable hazard-room material; falls into the GIF-transparency bug class |
| `truchet.png` | `B` | `High` | `Ready` | Literal procgen decor source |

---

## Backgrounds and environment art

| Asset | STYLE | EFFORT | Verdict |
|---|---|---|---|
| `forest.png` (`1024x768`, `P`), `mesa.png` (`1024x768`, `P`), `depths_of_terra.png` (`1024x768`, `RGB`) | `A-` | `Prep` | Three strong low-color zone backdrops with good tone fit |
| `sky_background.png`, `mountain_at_dusk` zip | `A` | wired / extract | Current look already fits; extract layered parallax from the zip |
| `abyss.jpg`, `desertnight.png` | `B` | `Prep` | Mood fit is good, but likely needs palette crunch/posterization |
| `fortress.png`, `gate.png`, `guardtower.png`, `shore.png` | `C` | `Heavy` | Painted / rendered style clashes with low-color runtime art; maybe only usable as distant silhouettes |
| `living_tissue_background` zip | `B+` | `Extract` | Horror-perfect flesh-zone support for the "I Am I" tone |
| `trees.jpg`, `mangrove.png`, `dead_tree_1.png` | `B` / `B` / `F` | `Prep` | Decor candidates; `dead_tree_1` appears thumbnail-like |
| `rpg_village_isometric.png` | `F` | — | Wrong projection for a side-scroller |
| `vintagebuggy.png`, `vintagehippievan.png`, `motorcycle.png` | `F` | — | Wrong era and wrong universe |
| `FantasyWorldMap.xcf` | — | `Heavy` | Potential pause-map / meta-map source after manual export |

---

## Audio

| Family | Count | Fit | Verdict |
|---|---|---|---|
| Combat SFX (sword hits, armor clanks, explosions, lasers) | 15 | `A` | Very strong fit, especially post-merc hero swap |
| Magic spell casts | 4 | `A` | Good mapping to weapon-prefix variety |
| Monster / beast roars | 9 | `A` | Immediate miniboss / boss aggro value |
| Traversal / world (footsteps, dungeon doors, chest, coin) | 8 | `A` | Atmosphere win with little implementation risk |
| Jingles (game-over, victory, level-up) | 5 | `A` | Rotation equals instant variety |
| Music (`Orbital Colossus`, `through space.ogg`, `society_in_ruins`, boss tracks) | 5 | `A/B` | Space-toned music actually reinforces the merc / Space Marine axis |
| Utility WAVs / curios | 7 | `B` | Selectively useful; not priority material |
| Unopened archives (`100_cc0_sfx.zip`, `8_bit_sound_effect_pack.zip`, `nes_shooter_music`) | 150+ est. | verify | High-value Tier 2 extraction target |

---

## Licensing note

CC0-first remains the project policy, but the entire `assets/sprites/` folder — including the swm kit — should currently stay documented as **platform confirmed, exact page unknown** unless and until exact item pages are recovered and committed into the repo docs.

The `oga-swm-` prefix is a strong clue, not a finished citation. One manual source-recovery pass could upgrade a large chunk of this folder at once, but until that work is actually done, the docs should keep the honest soft-attribution posture rather than promoting likely sources into definitive ones.

---

## Integration priority

1. **Characters:** swap to `char-sheet-alpha.png`; this supersedes any plan to color-key `space_merc.png` for the hero.
2. **Treasure drops:** use `powerups-sheet-alpha.png` plus the 5-tier `impacts` / `weaponflash` families for rarity-tinted pickup and hit feedback.
3. **Levels:** build one coherent swm biome, then use `forest.png`, `mesa.png`, and `depths_of_terra.png` as additional zone backdrops.
4. **Level development:** register tile-variation pools and `truchet.png` as seed-driven decor / variation sets.
5. **Random generation:** drive visual variety through tile variants, enemy recolors, and FX color tiers rather than through perspective-mismatched asset mixing.
6. **Bosses:** extract darksaber and keep `wyrmwolf.png` as a boss-tier showcase rather than a common enemy.
7. **Purge list:** keep thumbnails, vehicles, isometric village, and the JPEG pseudo-sheet out of the pipeline so procgen never rolls them.

---

## Exact measured files referenced in this review

```text
assets/sprites/char-sheet-alpha.png                           384x2240 RGBA
assets/sprites/char-sheet-alt-colours-1-alpha.png            384x2240 RGBA
assets/sprites/char-sheet-layer-body-and-head-alpha.png      384x2240 RGBA
assets/sprites/char-sheet-layer-boots-and-gloves-alpha.png   384x2240 RGBA
assets/sprites/char-sheet-layer-gun-alpha.png                384x2240 RGBA
assets/sprites/char-sheet-layer-silhouette-alpha.png         384x2240 RGBA
assets/sprites/enemies-sheet-alpha.png                       320x528 RGBA
assets/sprites/oga-swm-mainchar-sheet-alpha.png              288x546 RGBA
assets/sprites/oga-swm-tiles-alpha.png                       352x144 RGBA
assets/sprites/oga-swm-earth-tile-variations-alpha.png       288x240 RGBA
assets/sprites/oga-swm-fx-sheet-alpha.png                    416x436 RGBA
assets/sprites/oga-swm-objectsandenemies-sheet-alpha.png     320x536 RGBA
assets/sprites/powerups-sheet-alpha.png                      640x544 RGBA
assets/sprites/projectiles-sheet-alpha.png                   616x544 RGBA
assets/sprites/projectiles-rotations.png                     1280x1024 RGBA
assets/sprites/weaponflash-sheet-colour-1-alpha.png          384x2608 RGBA
assets/sprites/impacts-sheet-colour-1-alpha.png              384x960 RGBA
assets/sprites/forest.png                                    1024x768 P
assets/sprites/mesa.png                                      1024x768 P
assets/sprites/depths_of_terra.png                           1024x768 RGB
assets/sprites/space_merc.png                                1024x1024 P
```