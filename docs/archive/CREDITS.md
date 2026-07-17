# Credits & Attribution (wired assets only)

This file tracks only assets currently wired into runtime output (`public/sprites`, `public/audio`) by `scripts/prepare-assets.py`.

Ground truth inputs used for this list:

- `assets/wired-assets.txt`
- `assets/manifest.csv`
- `assets/manifest_bulk.csv`
- `python scripts/project-status.py` on 2026-07-08

## Sprite/visual sources used in game

| Wired source file | Runtime output usage | Source page | Manifest state |
|---|---|---|---|
| `assets/img/beast_boss_darksaber.zip` | `public/sprites/boss_werewolf.png` | https://opengameart.org/content/dark-saber-werewolf | downloaded |
| `assets/img/bulk/wyrmwolf.png` | `public/sprites/wyrmwolf.png` | https://opengameart.org/content/wyrmwolf | skipped-exists |
| `assets/img/bulk/mech_0.png` | `public/sprites/mech.png` | https://opengameart.org/content/mech-0 | skipped-exists |
| `assets/img/bulk/hero_0.png` | `public/sprites/hero.png` | https://opengameart.org/content/hero-0 | skipped-exists |
| `assets/img/bulk/goblin_sprite.zip` | `public/sprites/goblin.png` | https://opengameart.org/content/goblin-sprite | skipped-exists |
| `assets/img/bulk/lpc_imp.zip` | `public/sprites/imp.png` | https://opengameart.org/content/lpc-imp | skipped-exists |
| `assets/img/bulk/bat_sprite.png` | `public/sprites/bat.png` | https://opengameart.org/content/bat-sprite | downloaded-unverified |
| `assets/img/bulk/demon_flower_monster_sprite_sheet.zip` | `public/sprites/flower.png` | https://opengameart.org/content/demon-flower-monster-sprite-sheet | skipped-exists |
| `assets/img/bulk/dirt_platformer_tiles.png` | `public/sprites/tiles.png` | https://opengameart.org/content/dirt-platformer-tiles | downloaded-unverified |
| `assets/img/bulk/mountain_at_dusk_background.zip` | `public/sprites/bg_mountain_*.png` | source not resolved in manifest (file present on disk) | not listed |
| `assets/img/bulk/sky_background.png` | `public/sprites/bg_sky.png` | https://opengameart.org/content/sky-background | skipped-exists |
| `assets/img/bulk/mangrove.png` | `public/sprites/bg_mangrove.png` | https://opengameart.org/content/mangrove | skipped-exists |
| `assets/img/bulk/living_tissue_background.zip` | `public/sprites/bg_tissue.png` | https://opengameart.org/content/living-tissue-background | skipped-exists |
| `assets/sprites/char-sheet-alpha.png` + 8 `char-sheet-alt-colours-{1..8}-alpha.png` + `char-sheet-layer-{body,boots,gun,silhouette}-alpha.png` + `char-parts.png` + `powerups-sheet-alpha.png` + `projectiles-sheet-alpha.png` + `projectiles-rotations.png` + `impacts-sheet-colour-{1..5}-alpha.png` + `weaponflash-sheet-colour-{1..5}-alpha.png` + `palette.png` + `diewhirl-sheet-alpha.png` | `public/sprites/hero.png` (ADR-020) + `public/sprites/lootIcon.png` (AST-014) + `public/sprites/impactBurst_{common,uncommon,rare,epic}.png` (AST-015, 4 of 5 colour tiers — `weaponflash-*` and `impacts-sheet-colour-5` remain unwired) | https://opengameart.org/content/super-dead-space-gunner-merc-redux-platform-shmup-hero | **verified 2026-07-14** — page-confirmed file list match. **CC-BY 4.0**, Emcee Flesher, submitted 2021-10-23. Derived from Surt's "Space Merc" (CC-BY 3.0) and JRob774's explosion sheet (CC-BY 3.0) — both upstream authors also require attribution. **Attribution required; no in-game credits screen exists yet** — this row is the attribution record until one ships. |
| `assets/sprites/enemies-sheet-alpha.png` | not yet wired | https://opengameart.org/content/super-dead-gunner-platform-shmup-enemies | **verified 2026-07-14** — page-confirmed file list match (single-file page). **CC-BY 4.0**, Emcee Flesher, submitted 2021-06-23. Derived from Surt's "Dead Gunner", Surt's "Space Merc", and Redshrike's (Stephen Challener) "Scifi Creature Tileset" — attribution required for all three. |
| `assets/sprites/oga-swm-*.png` remaining 15 files (`oga-swm-mainchar-sheet-alpha.png`, `oga-swm-tiles-alpha.png`, `oga-swm-earth-tile-variations-alpha.png`, `oga-swm-fx-sheet-alpha.png`, `oga-swm-objectsandenemies-sheet-alpha.png`, `oga-swm-bg-*`, brainguy, shop UI, etc.) | not yet wired | platform confirmed, exact page unknown | **re-searched 2026-07-14, still negative** — checked the "Super Dead Gunner" collection index and its 11 linked submissions (Batch 2, Batch 3, Space Junkyard Environment, and 8 single-enemy pages); none of their file lists matched these filenames. Site-level attestation stands; `oga-swm-` strongly suggests the same Emcee Flesher/OpenGameArt lineage as the two rows above, but this repo will not claim an exact page/license for these specific files until one is actually found and file-list-verified. |

## Audio sources used in game

| Wired source file | Runtime output usage | Source page | Manifest state |
|---|---|---|---|
| `assets/sounds/sfx_pack_8bit_vol1.zip` | `jump.wav`, `hit.wav`, `coin.wav`, `powerup.wav`, `explosion.wav`, `select.wav`, `shoot.wav`, `wrong.wav`, `door.wav` | https://opengameart.org/content/8-bit-sound-effect-pack-vol-001 | downloaded |
| `assets/sounds/bulk/8bit_sword_hit_sword_1_8_bit_wav.mp3` | `sword.mp3` | https://freesound.org/s/509480/ | skipped-exists |
| `assets/sounds/bulk/8bit_sword_hit_kill_enemy_2_8_bit_wav.mp3` | `kill.mp3` | https://freesound.org/s/506587/ | skipped-exists |
| `assets/sounds/bulk/laser_gun_retro_laser_shot_3.mp3` | `laser.mp3` | https://freesound.org/s/483508/ | skipped-exists |
| `assets/sounds/bulk/treasure_chest_open_treasure_chest_open.mp3` | `chest.mp3` | https://freesound.org/s/771164/ | skipped-exists |
| `assets/sounds/bulk/retro_level_up_levelup_wav.mp3` | `levelup.mp3` | https://freesound.org/s/609335/ | skipped-exists |
| `assets/sounds/bulk/chiptune_boss_battle_super_mega_ultimate_final_boss_battle.mp3` | `boss_music.mp3` | https://freesound.org/s/530064/ | skipped-exists |
| `assets/sounds/bulk/society_in_ruins.mp3` | `bg_music.mp3` | https://opengameart.org/content/society-in-ruins | skipped-exists |
| `assets/sounds/bulk/game_over_jingle_j1game_over_mono_wav.mp3` | `gameover.mp3` | https://freesound.org/s/173859/ | skipped-exists |
| `assets/sounds/bulk/victory_fanfare_8bit_victory_fanfare_8_bit_thunder_1.mp3` | `victory.mp3` | https://freesound.org/s/843043/ | skipped-exists |
| `assets/sounds/bulk/monster_roar_monster_roar_2_mp3.mp3` | `roar.mp3` | https://freesound.org/s/505127/ | skipped-exists |
| `assets/sounds/beast_growl_generic.mp3` | `growl.mp3` | https://freesound.org/s/366671/ | downloaded |
| `assets/sounds/bulk/magic_spell_cast_magspel_dark_magic_wand_spell_cast_005_gmcm.mp3` | `magic.mp3` | https://freesound.org/s/855440/ | skipped-exists |
| `assets/sounds/bulk/footstep_stone_fx_006_footstep_stone_r_wav.mp3` | `step.mp3` | https://freesound.org/s/390763/ | skipped-exists |
| `public/assets/extracted/100-cc0-sfx/*` and `public/assets/extracted/8-bit-sound-effect-pack/*` (stem-matched via `resolveManifestAsset()`, ADR-015/016: `shrineChime`, `enemyHit`, `deathBat/Goblin/Imp/Flower/Wyrmwolf/Mech/Werewolf`, `menuOpenSfx`, `menuCloseSfx`, `purchase`, `collectCommon/Uncommon/Rare/Epic`, `doubleJumpGet`, `dashGet`) | https://opengameart.org/content/100-cc0-sfx and https://opengameart.org/content/8-bit-sound-effect-pack, both sub-packs of "CC0 Sound Effects Collection" by OwlishMedia — https://opengameart.org/content/cc0-sound-effects | **CC0** ("attribution not required," confirmed on the collection page) |

## Notes

- This project currently trusts manifest-provided links and statuses; several image entries are marked `downloaded-unverified` in `manifest_bulk.csv`.
- `mountain_at_dusk_background.zip` is actively wired but currently lacks a matching manifest row with a filename field; keep this documented until the manifest is corrected.
- If additional assets are wired, re-run `scripts/prepare-assets.py`, then refresh this document from `assets/wired-assets.txt`.
