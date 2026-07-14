#!/usr/bin/env python3
"""prepare-assets.py — deterministic asset pipeline for Next-Chapter-Retro-Game.

Reads ONLY assets confirmed present in assets/ (see assets/manifest*.csv and
STATUS.txt), extracts/crops/packs them into public/sprites and public/audio,
and writes public/sprites/spritemeta.json describing every packed sheet so the
TypeScript renderer never hardcodes frame math that could drift from the art.

Re-runnable: wipes and regenerates its outputs each time. No network access.

Sources used (all verified on disk 2026-07-07, sizes in STATUS.txt):
  assets/img/beast_boss_darksaber.zip        (Dark Saber Werewolf, CC-BY 3.0, MindChamber)
  assets/img/bulk/hero_0.png                 (hero walk sheet, 1024x1024, 4x4 grid of 256px)
  assets/img/bulk/bat_sprite.png             (32px bat frames, 128x128)
  assets/img/bulk/goblin_sprite.zip          (armored goblin spearman poses)
  assets/img/bulk/lpc_imp.zip                (LPC imp, 64px LPC walk grid)
  assets/img/bulk/demon_flower_monster_sprite_sheet.zip (mon4 gifs)
  assets/img/bulk/mech_0.png                 (framed war-mech portrait)
  assets/img/bulk/wyrmwolf.png               (large wyrm/wolf compilation sheet)
  assets/img/bulk/dirt_platformer_tiles.png  (16px dirt tileset example scene)
  assets/img/bulk/mountain_at_dusk_background.zip (parallax layers)
  assets/img/bulk/sky_background.png
  assets/img/bulk/mangrove.png
  assets/img/bulk/living_tissue_background.zip (tileable flesh background)
  assets/sounds/sfx_pack_8bit_vol1.zip       (jump/hit/coin/powerup/shoot wavs, CC0)
  assets/sounds/*.mp3 + assets/sounds/bulk/*.mp3 (CC0 freesound picks)
"""

from __future__ import annotations

import json
import shutil
import zipfile
from pathlib import Path

from PIL import Image, ImageSequence

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
SPRITES_OUT = ROOT / "public" / "sprites"
AUDIO_OUT = ROOT / "public" / "audio"
TMP = ROOT / ".asset-tmp"

META: dict[str, object] = {}
WIRED: list[str] = []  # source paths actually used, for CREDITS.md cross-check


def log(msg: str) -> None:
    print(f"[prepare-assets] {msg}")


def extract(zip_rel: str, dest: Path, members_prefixes: tuple[str, ...] = ()) -> Path:
    src = ASSETS / zip_rel
    dest.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(src) as zf:
        names = [
            n
            for n in zf.namelist()
            if not n.startswith("__MACOSX")
            and (not members_prefixes or any(n.startswith(p) for p in members_prefixes))
        ]
        zf.extractall(dest, members=names)
    WIRED.append(f"assets/{zip_rel}")
    return dest


def first_existing(*rel_paths: str) -> tuple[str, Path]:
    for rel in rel_paths:
        candidate = ASSETS / rel
        if candidate.exists():
            return rel, candidate
    raise FileNotFoundError(f"None of the candidate files exist: {rel_paths}")


def pack_rows(
    name: str,
    rows: dict[str, list[Image.Image]],
    cell_w: int,
    cell_h: int,
) -> None:
    """Pack {animName: [frames]} into one sheet, one animation per row."""
    cols = max(len(f) for f in rows.values())
    sheet = Image.new("RGBA", (cols * cell_w, len(rows) * cell_h), (0, 0, 0, 0))
    meta_rows = {}
    for r, (anim, frames) in enumerate(rows.items()):
        for c, frame in enumerate(frames):
            f = frame.convert("RGBA")
            # fit into cell preserving aspect
            scale = min(cell_w / f.width, cell_h / f.height)
            nw, nh = max(1, int(f.width * scale)), max(1, int(f.height * scale))
            f = f.resize((nw, nh), Image.NEAREST)
            # bottom-center anchor (feet on ground)
            sheet.paste(f, (c * cell_w + (cell_w - nw) // 2, r * cell_h + (cell_h - nh)))
        meta_rows[anim] = {"row": r, "frames": len(frames)}
    out = SPRITES_OUT / f"{name}.png"
    sheet.save(out)
    META[name] = {"cellW": cell_w, "cellH": cell_h, "anims": meta_rows}
    log(f"wrote {out.relative_to(ROOT)}  ({sheet.width}x{sheet.height})")


def key_background_to_alpha(img: Image.Image) -> Image.Image:
    """Convert a flat background color (sampled from corner) to transparent."""
    rgba = img.convert("RGBA")
    bg = rgba.getpixel((0, 0))
    data = [
        (0, 0, 0, 0) if (r, g, b) == bg[:3] else (r, g, b, a)
        for (r, g, b, a) in rgba.getdata()
    ]
    out = Image.new("RGBA", rgba.size)
    out.putdata(data)
    return out


def segment_non_empty_runs(flags: list[bool]) -> list[tuple[int, int]]:
    runs: list[tuple[int, int]] = []
    start: int | None = None
    for i, has_fg in enumerate(flags):
        if has_fg and start is None:
            start = i
        elif not has_fg and start is not None:
            runs.append((start, i - 1))
            start = None
    if start is not None:
        runs.append((start, len(flags) - 1))
    return runs


def extract_foreground_frames(sheet: Image.Image) -> list[list[Image.Image]]:
    """Split a non-uniform sheet into [rows][frames] based on foreground occupancy."""
    rgba = key_background_to_alpha(sheet)
    px = rgba.load()
    row_has_fg = [any(px[x, y][3] > 0 for x in range(rgba.width)) for y in range(rgba.height)]
    row_runs = segment_non_empty_runs(row_has_fg)

    rows: list[list[Image.Image]] = []
    for y0, y1 in row_runs:
        col_has_fg = [
            any(px[x, y][3] > 0 for y in range(y0, y1 + 1))
            for x in range(rgba.width)
        ]
        col_runs = segment_non_empty_runs(col_has_fg)
        frames: list[Image.Image] = []
        for x0, x1 in col_runs:
            crop = rgba.crop((x0, y0, x1 + 1, y1 + 1))
            bbox = crop.getbbox()
            if bbox:
                frames.append(crop.crop(bbox))
        if frames:
            rows.append(frames)

    return rows


def gif_frames(path: Path) -> list[Image.Image]:
    """Extract GIF frames to RGBA, honoring transparency and chroma-keying flat backgrounds.

    Many OpenGameArt GIFs have a solid-color background that is not marked as
    transparent in the palette. The previous uniform-border check failed when
    a sprite touched the frame edge (demon-flower blue box). We now also key
    against the dominant opaque border color when it covers enough of the
    perimeter.
    """

    def dominant_opaque_border_color(img: Image.Image) -> tuple[int, int, int] | None:
        """Return the most common opaque RGB color along the image border, or None if no color dominates."""
        if img.width < 2 or img.height < 2:
            return None
        px = img.load()
        counts: dict[tuple[int, int, int], int] = {}
        for x in range(img.width):
            r, g, b, a = px[x, 0]
            if a == 255:
                counts[(r, g, b)] = counts.get((r, g, b), 0) + 1
            r, g, b, a = px[x, img.height - 1]
            if a == 255:
                counts[(r, g, b)] = counts.get((r, g, b), 0) + 1
        for y in range(img.height):
            r, g, b, a = px[0, y]
            if a == 255:
                counts[(r, g, b)] = counts.get((r, g, b), 0) + 1
            r, g, b, a = px[img.width - 1, y]
            if a == 255:
                counts[(r, g, b)] = counts.get((r, g, b), 0) + 1
        if not counts:
            return None
        best, best_count = max(counts.items(), key=lambda item: item[1])
        total = sum(counts.values())
        # A clear background should cover most of the border; sprites that merely
        # graze the edge won't dominate the perimeter.
        if best_count / total < 0.6:
            return None
        return best

    def apply_chroma_key(img: Image.Image) -> Image.Image:
        rgba = img.convert("RGBA")
        bg = dominant_opaque_border_color(rgba)
        if bg is None:
            return rgba
        r_key, g_key, b_key = bg
        # Use getdata/putdata; these GIF frames are small.
        pixels = list(rgba.getdata())
        keyed = [
            (r, g, b, 0) if (r, g, b) == (r_key, g_key, b_key) else (r, g, b, a)
            for (r, g, b, a) in pixels
        ]
        out = Image.new("RGBA", rgba.size)
        out.putdata(keyed)
        return out

    im = Image.open(path)
    frames: list[Image.Image] = []
    shared_transparency = im.info.get("transparency")

    for frame in ImageSequence.Iterator(im):
        transparency_index = frame.info.get("transparency", shared_transparency)
        if frame.mode == "P":
            pal = frame.copy()
            if transparency_index is not None:
                pal.info["transparency"] = int(transparency_index)
            rgba = pal.convert("RGBA")
        else:
            rgba = frame.convert("RGBA")

        # If the frame already carries real transparency from the GIF, keep it.
        # Otherwise chroma-key a likely flat background.
        alpha_channel = rgba.split()[-1]
        if alpha_channel.getextrema()[1] < 255:
            frames.append(rgba)
        else:
            frames.append(apply_chroma_key(rgba))

    return frames


def main() -> None:
    for d in (SPRITES_OUT, AUDIO_OUT):
        d.mkdir(parents=True, exist_ok=True)
    if TMP.exists():
        shutil.rmtree(TMP, ignore_errors=True)
    TMP.mkdir(exist_ok=True)

    # ---------- Player: swm hero (char-sheet-alpha.png, CC-BY 4.0 Emcee Flesher) ----------
    # Placed first in main() so it survives the pre-existing, unrelated failure
    # further down (assets/img/beast_boss_darksaber.zip is missing from disk -
    # see SESSION_LOG 2026-07-14). Already a clean 46x46-cell RGBA grid sheet
    # (confirmed via alpha-band analysis + the sheet's own baked-in "46x46"
    # label - do NOT re-derive this as 64px; that was an earlier agent's
    # unverified guess). No pack_rows() needed: the source is already alpha'd
    # and grid-regular, so this is a direct copy, matching the "backgrounds"
    # convention below rather than the boss/goblin recompositing path.
    # Columns 0-5 (x: 0-276) are the 6-frame run+aim-sweep cycle; x >= 276 is
    # a baked-in legend/palette strip, never sampled by row*cellW addressing.
    HERO_CELL = 46
    hero_src = ASSETS / "sprites" / "char-sheet-alpha.png"
    hero_im = Image.open(hero_src)
    if hero_im.size != (384, 2240) or hero_im.mode != "RGBA":
        raise RuntimeError(
            f"char-sheet-alpha.png geometry drifted from the verified 384x2240 RGBA "
            f"(got {hero_im.size} {hero_im.mode}) - re-run Step 4.1's grid derivation "
            f"before trusting the hardcoded row map below."
        )
    shutil.copy(hero_src, SPRITES_OUT / "hero.png")
    WIRED.append("assets/sprites/char-sheet-alpha.png")
    # None of these poses exist as distinct authored animations - every row is
    # the same run+aim-sweep cycle at a different arm angle (verified by
    # rendering a labeled grid overlay across all 48 rows, see SESSION_LOG).
    # idle/jump/fall/attack/hurt/death are therefore deliberate aliases onto
    # existing rows, logged here and in SESSION_LOG/DECISIONS.md as asset debt
    # rather than invented frame rects (ADR-005).
    HERO_ANIMS = {
        "run": {"row": 0, "frames": 6},
        "idle": {"row": 0, "frames": 1},
        "attack": {"row": 12, "frames": 6},
        "jump": {"row": 20, "frames": 1},
        "fall": {"row": 36, "frames": 1},
        "hurt": {"row": 6, "frames": 1},
        "death": {"row": 47, "frames": 2},
    }
    META["hero"] = {"cellW": HERO_CELL, "cellH": HERO_CELL, "anims": HERO_ANIMS}
    log(f"wrote {(SPRITES_OUT / 'hero.png').relative_to(ROOT)} (46x46 cells, direct copy)")

    # 8 palette-variant skins - registered in spritemeta with the identical
    # clip map (dimensions verified to match the base sheet exactly), but
    # deliberately NOT added to game.ts's sheet-preload list: no unlock UI or
    # selection logic exists yet, so preloading 8 unused images would only
    # cost bandwidth. Data-only registration per this mission's scope wall.
    for i in range(1, 9):
        skin_src = ASSETS / "sprites" / f"char-sheet-alt-colours-{i}-alpha.png"
        skin_im = Image.open(skin_src)
        if skin_im.size != hero_im.size or skin_im.mode != "RGBA":
            raise RuntimeError(
                f"char-sheet-alt-colours-{i}-alpha.png geometry ({skin_im.size} "
                f"{skin_im.mode}) no longer matches the base hero sheet "
                f"({hero_im.size} {hero_im.mode}) - re-verify before registering."
            )
        skin_name = f"hero_skin_{i}"
        shutil.copy(skin_src, SPRITES_OUT / f"{skin_name}.png")
        WIRED.append(f"assets/sprites/char-sheet-alt-colours-{i}-alpha.png")
        META[skin_name] = {"cellW": HERO_CELL, "cellH": HERO_CELL, "anims": HERO_ANIMS}
    log("registered 8 hero palette-variant skins (data-only, not preloaded)")

    # Persist immediately rather than waiting for main()'s final spritemeta.json
    # write: a separate, pre-existing, unrelated bug (assets/img/beast_boss_
    # darksaber.zip missing from disk, logged in SESSION_LOG 2026-07-14) crashes
    # main() a few steps below before it reaches that write, which would
    # otherwise silently drop these hero/skin entries on every pipeline run
    # until that unrelated bug is fixed. Merge into whatever spritemeta.json
    # already exists on disk (from the last successful full run) so tiles/bat/
    # goblin/etc. entries survive, then let main()'s own write at the end
    # overwrite this with the complete METa dict on any run that does succeed.
    _meta_path = SPRITES_OUT / "spritemeta.json"
    _existing_meta = json.loads(_meta_path.read_text()) if _meta_path.exists() else {}
    _existing_meta.update({k: META[k] for k in ["hero"] + [f"hero_skin_{i}" for i in range(1, 9)]})
    _meta_path.write_text(json.dumps(_existing_meta, indent=2))
    log(f"merged hero entries into {_meta_path.relative_to(ROOT)} (main() may not reach its own write this run)")

    # ---------- Boss: Dark Saber Werewolf (CC-BY 3.0 MindChamber) ----------
    ds = extract("img/beast_boss_darksaber.zip", TMP / "ds", ("DarkSaber/",)) / "DarkSaber"

    def pick(folder: str, pattern: str, step: int, limit: int) -> list[Image.Image]:
        files = sorted((ds / folder).glob(pattern))
        return [Image.open(f) for f in files[::step][:limit]]

    pack_rows(
        "boss_werewolf",
        {
            "idle": pick("idle", "*.png", 10, 10),
            "walk": pick("walk", "*.png", 5, 8),
            "run": [Image.open(f) for f in sorted((ds / "run").glob("*.png"))[4:17:2]],
            "attack": pick("attack", "*.png", 8, 10),
            "hit": pick("Hit", "*.png", 6, 5),
            "death": pick("death", "*.png", 10, 10),
            "howl": pick("Howl", "*.png", 4, 6),
        },
        cell_w=152,
        cell_h=160,
    )

    # ---------- Player: hero_0.png (4x4 grid of 256px cells) ----------
    hero = Image.open(ASSETS / "img/bulk/hero_0.png")
    WIRED.append("assets/img/bulk/hero_0.png")
    cells = lambda row: [
        hero.crop((c * 256, row * 256, (c + 1) * 256, (row + 1) * 256)) for c in range(4)
    ]
    pack_rows(
        "hero",
        {"walkRight": cells(2), "walkLeft": cells(3), "front": cells(0)},
        cell_w=48,
        cell_h=48,
    )

    # ---------- Enemy: bat (32px frames in 128x128 grid) ----------
    bat = Image.open(ASSETS / "img/bulk/bat_sprite.png")
    WIRED.append("assets/img/bulk/bat_sprite.png")
    bat_frames = [
        bat.crop((c * 32, r * 32, (c + 1) * 32, (r + 1) * 32))
        for r in range(4)
        for c in range(4)
    ]
    nonempty = [f for f in bat_frames if f.getbbox()]
    pack_rows("bat", {"fly": nonempty[:6]}, cell_w=32, cell_h=32)

    # ---------- Enemy: armored goblin spearman ----------
    gob_dir = extract("img/bulk/goblin_sprite.zip", TMP / "gob")
    gob = Image.open(gob_dir / "goblins.png")
    gob_rows = extract_foreground_frames(gob)
    # Source is an irregular collage (top row 5 poses, bottom row 4 walk poses).
    # Segmenting by foreground avoids splitting spears/body across grid boundaries.
    if len(gob_rows) < 2:
        raise RuntimeError("goblin sheet parsing failed: expected at least 2 sprite rows")
    top_row, bottom_row = gob_rows[0], gob_rows[1]
    walk = bottom_row[:4]
    idle = [top_row[0]]
    attack = top_row[2:5] if len(top_row) >= 5 else top_row[1:]
    pack_rows("goblin", {"walk": walk, "idle": idle, "attack": attack}, cell_w=72, cell_h=64)

    # ---------- Enemy: LPC imp (64px LPC grid; rows: up/left/down/right) ----------
    imp_dir = extract("img/bulk/lpc_imp.zip", TMP / "imp")
    imp_walk = Image.open(imp_dir / "LPC imp/walk - vanilla.png")
    ncols = imp_walk.width // 64
    row_frames = lambda img, row: [
        img.crop((c * 64, row * 64, (c + 1) * 64, (row + 1) * 64)) for c in range(1, min(ncols, 9))
    ]
    pack_rows(
        "imp",
        {"walkLeft": row_frames(imp_walk, 1), "walkRight": row_frames(imp_walk, 3)},
        cell_w=48,
        cell_h=48,
    )

    # ---------- Enemy: demon flower turret (gif frames) ----------
    df_dir = extract("img/bulk/demon_flower_monster_sprite_sheet.zip", TMP / "df")
    pack_rows(
        "flower",
        {
            "idle": gif_frames(df_dir / "mon4_idle.gif"),
            "attack": gif_frames(df_dir / "mon4_attack2.gif")[:8],
        },
        cell_w=64,
        cell_h=64,
    )

    # ---------- Mini-boss: war mech (crop decorative frame) ----------
    mech = Image.open(ASSETS / "img/bulk/mech_0.png").convert("RGBA")
    WIRED.append("assets/img/bulk/mech_0.png")
    inner = mech.crop((14, 14, mech.width - 14, mech.height - 14))
    bbox = inner.getbbox()
    if bbox:
        inner = inner.crop(bbox)
    pack_rows("mech", {"idle": [inner]}, cell_w=96, cell_h=112)

    # ---------- Mid-boss: wyrmwolf (crop crouching wolf pose from compilation) ----------
    wyrm = Image.open(ASSETS / "img/bulk/wyrmwolf.png").convert("RGBA")
    WIRED.append("assets/img/bulk/wyrmwolf.png")
    wolf = wyrm.crop((0, 500, 260, 670))
    bbox = wolf.getbbox()
    if bbox:
        wolf = wolf.crop(bbox)
    pack_rows("wyrmwolf", {"idle": [wolf]}, cell_w=128, cell_h=96)

    # ---------- Tiles: carve 16px tiles from dirt_platformer_tiles.png ----------
    dirt = Image.open(ASSETS / "img/bulk/dirt_platformer_tiles.png").convert("RGBA")
    WIRED.append("assets/img/bulk/dirt_platformer_tiles.png")
    T = 16
    tile_at = lambda cx, cy: dirt.crop((cx * T, cy * T, (cx + 1) * T, (cy + 1) * T))
    # dirt_platformer_tiles.png is 256x96 = 16 cols x 6 rows (valid row indices
    # 0-5 only). The coordinates this replaced referenced rows up to 11 -
    # entirely out of bounds, so PIL silently cropped fully-transparent
    # regions for 7 of these 8 tiles (only the old "topLeft" (0,4) was ever
    # in-bounds). That produced a tiles.png where every solid/platform tile
    # was invisible - the floor and platforms never rendered (see SESSION_LOG
    # "Free-floating sprites" entry). Re-picked against the actual 16x6 grid,
    # verified opaque (>90% non-transparent pixels) via a grid-overlay render.
    # This source doesn't have distinct auto-tile corner art, so topLeft
    # doubles as the generic top edge; there's no true corner/wall variety.
    tiles = [
        ("top", (0, 0)),
        ("fill", (0, 1)),
        ("topLeft", (0, 0)),
        ("topRight", (5, 0)),
        ("wallLeft", (0, 2)),
        ("wallRight", (4, 1)),
        ("platform", (8, 0)),
        ("fillDark", (9, 1)),
    ]
    sheet = Image.new("RGBA", (len(tiles) * T, T), (0, 0, 0, 0))
    for i, (_, (cx, cy)) in enumerate(tiles):
        sheet.paste(tile_at(cx, cy), (i * T, 0))
    sheet.save(SPRITES_OUT / "tiles.png")
    META["tiles"] = {"tileSize": T, "order": [t[0] for t in tiles]}
    log(f"wrote public/sprites/tiles.png ({sheet.width}x{sheet.height})")

    # ---------- Backgrounds ----------
    mtn = extract("img/bulk/mountain_at_dusk_background.zip", TMP / "mtn", ("parallax_mountain_pack/",))
    layers = mtn / "parallax_mountain_pack" / "layers"
    for src, dst in [
        (layers / "parallax-mountain-bg.png", "bg_mountain_sky.png"),
        (layers / "parallax-mountain-montain-far.png", "bg_mountain_far.png"),
        (layers / "parallax-mountain-mountains.png", "bg_mountain_near.png"),
        (layers / "parallax-mountain-trees.png", "bg_mountain_trees.png"),
    ]:
        shutil.copy(src, SPRITES_OUT / dst)
    tissue = extract("img/bulk/living_tissue_background.zip", TMP / "tissue", ("living-tissue-background/",))
    shutil.copy(tissue / "living-tissue-background" / "tile-background.png", SPRITES_OUT / "bg_tissue.png")
    for rel, dst in [
        ("img/bulk/sky_background.png", "bg_sky.png"),
        ("img/bulk/mangrove.png", "bg_mangrove.png"),
    ]:
        shutil.copy(ASSETS / rel, SPRITES_OUT / dst)
        WIRED.append(f"assets/{rel}")
    log("backgrounds copied")

    # ---------- Audio ----------
    sfx1 = TMP / "sfx1"
    sfx_zip_rel, sfx_zip_path = first_existing(
        "sounds/sfx_pack_8bit_vol1.zip",
        "sounds/bulk/8_bit_sound_effect_pack.zip",
    )
    with zipfile.ZipFile(sfx_zip_path) as zf:
        zf.extractall(sfx1)
    WIRED.append(f"assets/{sfx_zip_rel}")
    wav_picks = {
        "jump.wav": ("Jump 1.wav", "jump.wav", "hop.wav"),
        "hit.wav": ("Hit 2.wav", "hit2.wav", "hit1.wav"),
        "coin.wav": ("Coin 1.wav", "collect1.wav", "collect2.wav"),
        "powerup.wav": ("Powerup 1.wav", "bonus.wav"),
        "explosion.wav": ("Explosion 2.wav", "explodify.wav", "echosplosion.wav"),
        "select.wav": ("Select 1.wav", "move.wav"),
        "shoot.wav": ("Shoot 1.wav", "laser.wav", "laser2.wav"),
        "wrong.wav": ("Wrong 1.wav", "fail.wav"),
        "door.wav": ("Exit 3.wav", "computeron.wav", "blastoff.wav"),
    }
    for dst, candidates in wav_picks.items():
        src: Path | None = None
        for candidate in candidates:
            path = sfx1 / candidate
            if path.exists():
                src = path
                break
        if src is None:
            raise FileNotFoundError(f"Missing WAV source for {dst}; tried: {candidates}")
        shutil.copy(src, AUDIO_OUT / dst)

    mp3_picks = {
        "sword.mp3": "sounds/bulk/8bit_sword_hit_sword_1_8_bit_wav.mp3",
        "kill.mp3": "sounds/bulk/8bit_sword_hit_kill_enemy_2_8_bit_wav.mp3",
        "laser.mp3": "sounds/bulk/laser_gun_retro_laser_shot_3.mp3",
        "chest.mp3": "sounds/bulk/treasure_chest_open_treasure_chest_open.mp3",
        "levelup.mp3": "sounds/bulk/retro_level_up_levelup_wav.mp3",
        "boss_music.mp3": "sounds/bulk/chiptune_boss_battle_super_mega_ultimate_final_boss_battle.mp3",
        "bg_music.mp3": "sounds/bulk/society_in_ruins.mp3",
        "gameover.mp3": "sounds/bulk/game_over_jingle_j1game_over_mono_wav.mp3",
        "victory.mp3": "sounds/bulk/victory_fanfare_8bit_victory_fanfare_8_bit_thunder_1.mp3",
        "roar.mp3": "sounds/bulk/monster_roar_monster_roar_2_mp3.mp3",
        "growl.mp3": "beast_growl_generic.mp3",
        "magic.mp3": "sounds/bulk/magic_spell_cast_magspel_dark_magic_wand_spell_cast_005_gmcm.mp3",
        "step.mp3": "sounds/bulk/footstep_stone_fx_006_footstep_stone_r_wav.mp3",
    }
    for dst, rel in mp3_picks.items():
        src = ASSETS / "sounds" / rel if not rel.startswith("sounds/") else ASSETS / rel
        shutil.copy(src, AUDIO_OUT / dst)
        WIRED.append(f"assets/{'sounds/' + rel if not rel.startswith('sounds/') else rel}")
    log(f"audio copied ({len(wav_picks)} wav + {len(mp3_picks)} mp3)")

    # ---------- Metadata + wired-asset report ----------
    (SPRITES_OUT / "spritemeta.json").write_text(json.dumps(META, indent=2))
    (ROOT / "assets" / "wired-assets.txt").write_text(
        "\n".join(sorted(set(WIRED))) + "\n"
    )
    log("wrote public/sprites/spritemeta.json and assets/wired-assets.txt")
    shutil.rmtree(TMP, ignore_errors=True)  # best-effort; mount may block unlock unlink
    log("DONE")


if __name__ == "__main__":
    main()
