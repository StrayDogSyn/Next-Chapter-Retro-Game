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


def crop_to_content(img: Image.Image) -> Image.Image:
    """Crop to the opaque-content bounding box, dropping transparent padding.

    A frame that's fully transparent (bbox is None) is returned unchanged
    rather than crashing - pack_rows() already tolerates a blank frame.
    """
    rgba = img.convert("RGBA")
    bbox = rgba.getbbox()
    return rgba.crop(bbox) if bbox else rgba


def normalize_anim_scale(frame_groups: dict[str, list[Image.Image]], target_height: float) -> dict[str, float]:
    """Per-animation uniform resize factor so each group's *typical* (median)
    content height lands on target_height, computed from each frame's own
    content bbox - not its raw canvas.

    Why median, and why per-animation rather than per-frame: some animations
    (death's collapse, howl's neck extension) are SUPPOSED to have frames at
    very different heights than their neighbors - that's the animation, not
    noise. A per-frame normalization would flatten it out and look wrong.
    Median height is a robust stand-in for "this animation's typical/resting
    pose", so scaling the whole group by one factor derived from it preserves
    each animation's own internal motion while equalizing typical scale
    *across* animations - which is the actual bug (idle/walk render near-
    full-size, run/attack/howl render visibly smaller, because their raw
    source clips were captured on much wider canvases for stride/swing reach,
    and a naive fit-whole-canvas-to-cell scale punishes that padding as if it
    were part of the character).
    """
    scales: dict[str, float] = {}
    for name, frames in frame_groups.items():
        heights = []
        for f in frames:
            bbox = f.convert("RGBA").getbbox()
            if bbox:
                heights.append(bbox[3] - bbox[1])
        if not heights:
            scales[name] = 1.0
            continue
        median_h = sorted(heights)[len(heights) // 2]
        scales[name] = target_height / median_h if median_h > 0 else 1.0
    return scales


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
    # Placed first in main() so it survives any unrelated failure further down
    # the pipeline (historically: assets/img/beast_boss_darksaber.zip being
    # missing from disk, resolved 2026-07-16 - see SESSION_LOG). Already a
    # clean 46x46-cell RGBA grid sheet
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
    # write: a safety net against any unrelated failure a few steps below
    # crashing main() before it reaches that write, which would otherwise
    # silently drop these hero/skin entries on every pipeline run until fixed
    # (this bit anyone in practice when assets/img/beast_boss_darksaber.zip
    # was missing from disk, resolved 2026-07-16 - see SESSION_LOG). Merge
    # into whatever spritemeta.json already exists on disk (from the last
    # successful full run) so tiles/bat/goblin/etc. entries survive, then let
    # main()'s own write at the end
    # overwrite this with the complete METa dict on any run that does succeed.
    _meta_path = SPRITES_OUT / "spritemeta.json"
    _existing_meta = json.loads(_meta_path.read_text()) if _meta_path.exists() else {}
    _existing_meta.update({k: META[k] for k in ["hero"] + [f"hero_skin_{i}" for i in range(1, 9)]})
    _meta_path.write_text(json.dumps(_existing_meta, indent=2))
    log(f"merged hero entries into {_meta_path.relative_to(ROOT)} (main() may not reach its own write this run)")

    # ---------- AST-014: loot pickup icon (powerups-sheet-alpha.png) ----------
    # Grid verified empirically, not guessed: the sheet is a dense, multi-
    # section icon collage (badges/chalices/gems/pill capsules at several
    # different cell sizes - visually confirmed, NOT a single uniform grid
    # like the hero sheet). Rather than derive the whole collage, this pass
    # measured and uses only ONE clean, verified region: the "gem" icon rows.
    # Verification method: content-band row scan located two 16px-tall rows
    # of circular gem icons; a labeled grid overlay at y0=342 confirmed 12
    # columns with zero icons crossing a cell boundary (same discriminating
    # test as ADR-020's hero-sheet derivation). Row 0 (y=342-358) is a
    # teal/green palette; row 1 (y=358-374) is a red/orange palette - either
    # works as a generic "loot gem" pickup icon, row 0 was picked arbitrarily.
    POWERUPS_CELL = 16
    powerups_src = ASSETS / "sprites" / "powerups-sheet-alpha.png"
    powerups_im = Image.open(powerups_src)
    if powerups_im.size != (640, 544) or powerups_im.mode != "RGBA":
        raise RuntimeError(
            f"powerups-sheet-alpha.png geometry drifted from the verified "
            f"640x544 RGBA (got {powerups_im.size} {powerups_im.mode}) - "
            f"re-verify the gem-row y-offset (342) before trusting it."
        )
    gem_row = powerups_im.crop((0, 342, 12 * POWERUPS_CELL, 342 + POWERUPS_CELL))
    gem_sheet = Image.new("RGBA", gem_row.size, (0, 0, 0, 0))
    gem_sheet.paste(gem_row, (0, 0))
    gem_sheet.save(SPRITES_OUT / "lootIcon.png")
    WIRED.append("assets/sprites/powerups-sheet-alpha.png")
    META["lootIcon"] = {
        "cellW": POWERUPS_CELL,
        "cellH": POWERUPS_CELL,
        "anims": {"shimmer": {"row": 0, "frames": 12}},
    }
    log(f"wrote {(SPRITES_OUT / 'lootIcon.png').relative_to(ROOT)} (16x16 cells, 12-frame shimmer, cropped from powerups-sheet-alpha.png)")

    # ---------- AST-015: rarity-tiered impact burst FX ----------
    # Grid verified empirically: impacts-sheet-colour-N-alpha.png (384x960)
    # stacks FOUR size tiers (16/24/32/48px cells) with irregular packing in
    # the upper three tiers. Rather than guess those boundaries, this pass
    # used the one unambiguous, cleanly-isolated region: a full-width empty-
    # row gap (row-band scan) isolates y=[624,960) as a self-contained
    # 48x48 grid; a labeled overlay confirmed exactly 7 columns x 7 rows
    # with zero icons crossing a cell boundary. weaponflash-sheet-colour-*
    # was measured too (49 evenly-pitched ~16px bands across 2608px) but its
    # semantic frame-grouping did not resolve with the same confidence in
    # this pass's time budget - deliberately NOT wired this pass, logged as
    # asset debt (SESSION_LOG/BUGS_IMPROVEMENT_GUIDE) rather than guessed.
    #
    # Colour-to-rarity mapping (a design judgment call, not a measurement -
    # documented so it can be revisited): sampled each colour file's
    # dominant non-white edge hue. colour1=cyan/teal, colour2=green,
    # colour3=orange/red/yellow, colour4=cyan-green (close to colour1),
    # colour5=orange/red (close to colour3, darker). None are an exact hue
    # match for RARITIES' existing common/uncommon/rare/epic hex colors, so
    # this maps by relative visual "heat" instead: common gets the calmest
    # (colour1), uncommon keeps colour2's green (already matches
    # RARITIES.uncommon's green closely), rare gets colour4 (still cool,
    # distinct enough from common), epic gets colour3 (warmest/most
    # dramatic - the strongest available contrast against common's cyan,
    # satisfying the "common visibly differs from epic" requirement).
    # colour5 is measured/verified but unused.
    IMPACT_CELL = 48
    IMPACT_COLS = 7
    IMPACT_ROWS = 7
    IMPACT_Y0 = 624
    RARITY_TO_IMPACT_COLOUR = {"common": 1, "uncommon": 2, "rare": 4, "epic": 3}
    for rarity, colour_n in RARITY_TO_IMPACT_COLOUR.items():
        src = ASSETS / "sprites" / f"impacts-sheet-colour-{colour_n}-alpha.png"
        im = Image.open(src)
        if im.size != (384, 960) or im.mode != "RGBA":
            raise RuntimeError(
                f"impacts-sheet-colour-{colour_n}-alpha.png geometry drifted "
                f"from the verified 384x960 RGBA (got {im.size} {im.mode}) - "
                f"re-verify the y=624 section offset before trusting it."
            )
        region = im.crop((0, IMPACT_Y0, IMPACT_COLS * IMPACT_CELL, IMPACT_Y0 + IMPACT_ROWS * IMPACT_CELL))
        out_name = f"impactBurst_{rarity}"
        region.save(SPRITES_OUT / f"{out_name}.png")
        WIRED.append(f"assets/sprites/impacts-sheet-colour-{colour_n}-alpha.png")
        META[out_name] = {
            "cellW": IMPACT_CELL,
            "cellH": IMPACT_CELL,
            "anims": {"burst": {"row": 0, "frames": IMPACT_COLS}},
        }
    log("wrote 4 rarity-tiered impactBurst_<rarity>.png sheets (48x48 cells, 7-frame burst, cropped from impacts-sheet-colour-*)")

    _ast_keys = ["lootIcon"] + [f"impactBurst_{r}" for r in RARITY_TO_IMPACT_COLOUR]
    _existing_meta = json.loads(_meta_path.read_text())
    _existing_meta.update({k: META[k] for k in _ast_keys})
    _meta_path.write_text(json.dumps(_existing_meta, indent=2))
    log(f"merged AST-014/015 entries into {_meta_path.relative_to(ROOT)}")

    # ---------- FX sprint: projectiles, muzzle flash, explosion, enemy
    # death-whirl, and a proper animated mech boss (all measured directly,
    # not guessed) ----------

    # Projectile bolt (ranged weapons) + magic swirl (magic weapons).
    proj_src = ASSETS / "sprites" / "projectiles-sheet-alpha.png"
    proj_im = Image.open(proj_src)
    if proj_im.size != (616, 544) or proj_im.mode != "RGBA":
        raise RuntimeError(
            f"projectiles-sheet-alpha.png geometry drifted from the verified "
            f"616x544 RGBA (got {proj_im.size} {proj_im.mode}) - re-verify "
            f"the bolt/swirl frame offsets below before trusting them."
        )
    # 5th frame of the growing-bolt row - fullest silhouette at native 16x16.
    bolt_frame = proj_im.crop((64, 0, 80, 16))
    magic_frame = proj_im.crop((0, 355, 20, 375))  # teal energy-swirl row
    pack_rows("fx_projectile", {"bolt": [bolt_frame], "magic": [magic_frame]}, cell_w=20, cell_h=20)
    WIRED.append("assets/sprites/projectiles-sheet-alpha.png")

    # Muzzle flash: weaponflash-sheet-colour-1-alpha.png (384x2608) packs 49
    # near-identical rotation bands (48x54 cells) meant to align with a
    # rotating character sprite's own coordinate frame - AST-015's comment
    # above notes a full angle-to-facing mapping was tried in an earlier
    # pass and shelved as too ambiguous to trust. Sidestepped that problem
    # entirely: this game's weapons only ever face left/right (never a full
    # rotation sweep), so a single frame works fine as a small static flash
    # accent - cropped tight to its own measured content bbox (37,20)-
    # (46,27) within the first cell, not the full 48x54 cell.
    flash_src = ASSETS / "sprites" / "weaponflash-sheet-colour-1-alpha.png"
    flash_im = Image.open(flash_src)
    if flash_im.size != (384, 2608) or flash_im.mode != "RGBA":
        raise RuntimeError(
            f"weaponflash-sheet-colour-1-alpha.png geometry drifted from the "
            f"verified 384x2608 RGBA (got {flash_im.size} {flash_im.mode}) - "
            f"re-verify the (37,20)-(46,27) content bbox before trusting it."
        )
    flash_frame = flash_im.crop((37, 20, 46, 27))
    pack_rows("fx_muzzle", {"flash": [flash_frame]}, cell_w=9, cell_h=7)
    WIRED.append("assets/sprites/weaponflash-sheet-colour-1-alpha.png")

    # Explosion: jrob774-explosion_2-sheet-alpha.png (1152x200) stacks 4 size
    # tiers (24/32/48/96px cells stacked top-to-bottom, heights sum exactly
    # to 200 - verified, not assumed); the bottom 96x96x12 row is the
    # biggest/most dramatic tier, used for the boss death sequence.
    boom_src = ASSETS / "sprites" / "jrob774-explosion_2-sheet-alpha.png"
    boom_im = Image.open(boom_src)
    if boom_im.size != (1152, 200) or boom_im.mode != "RGBA":
        raise RuntimeError(
            f"jrob774-explosion_2-sheet-alpha.png geometry drifted from the "
            f"verified 1152x200 RGBA (got {boom_im.size} {boom_im.mode}) - "
            f"re-verify the bottom-row y-offset before trusting it."
        )
    BOOM_CELL = 96
    BOOM_FRAMES = 12
    boom_y0 = boom_im.height - BOOM_CELL
    boom_frames = [
        boom_im.crop((i * BOOM_CELL, boom_y0, (i + 1) * BOOM_CELL, boom_y0 + BOOM_CELL)) for i in range(BOOM_FRAMES)
    ]
    pack_rows("fx_explosion", {"burst": boom_frames}, cell_w=BOOM_CELL, cell_h=BOOM_CELL)
    WIRED.append("assets/sprites/jrob774-explosion_2-sheet-alpha.png")

    # Enemy death-whirl (regular, non-boss enemies): diewhirl-sheet-alpha.png
    # (336x240, 48x48 cells, 7 cols x 5 rows) - top row is a humanoid figure
    # dissolving into particles within a shrinking ring, the cleanest single
    # read of "this thing just died." Not explicitly requested beyond
    # "ensure this asset is loaded" - wired to an actual death-dissolve
    # effect rather than preloaded-and-unused, since an unused preload only
    # costs bandwidth for no benefit (same call as the hero-skins decision
    # earlier in this file).
    whirl_src = ASSETS / "sprites" / "diewhirl-sheet-alpha.png"
    whirl_im = Image.open(whirl_src)
    if whirl_im.size != (336, 240) or whirl_im.mode != "RGBA":
        raise RuntimeError(
            f"diewhirl-sheet-alpha.png geometry drifted from the verified "
            f"336x240 RGBA (got {whirl_im.size} {whirl_im.mode}) - re-verify "
            f"the top-row frame offsets before trusting them."
        )
    WHIRL_CELL = 48
    WHIRL_FRAMES = 7
    whirl_frames = [whirl_im.crop((i * WHIRL_CELL, 0, (i + 1) * WHIRL_CELL, WHIRL_CELL)) for i in range(WHIRL_FRAMES)]
    pack_rows("fx_diewhirl", {"whirl": whirl_frames}, cell_w=WHIRL_CELL, cell_h=WHIRL_CELL)
    WIRED.append("assets/sprites/diewhirl-sheet-alpha.png")

    # War Mech boss replacement: "Super Dero Gunner" from enemies-sheet-alpha
    # .png (320x528, CC-BY 4.0 Emcee Flesher - the same artist as the live
    # player sprite, char-sheet-alpha.png), a hovering mechanical gunner -
    # already animated (4 frames/row) and thematically exact for a boss that
    # "hovers in a slow sine, volleys lasers" (see game.ts). The previous
    # mech.png was a single static portrait frame with no animation at all,
    # visibly behind the rest of the cast after the boss_werewolf fix.
    # Bottom two rows verified via direct content-bbox measurement (not
    # guessed off the printed "68x60" label alone): both rows sit at
    # x=[0,272) in 68px-pitch columns, gold/olive row at y=[392,452), orange
    # row at y=[452,512) - reused as the boss's idle and attack states
    # respectively (a colour swap doubling as a "weapon-hot" tell needs no
    # extra art).
    enemies_src = ASSETS / "sprites" / "enemies-sheet-alpha.png"
    enemies_im = Image.open(enemies_src)
    if enemies_im.size != (320, 528) or enemies_im.mode != "RGBA":
        raise RuntimeError(
            f"enemies-sheet-alpha.png geometry drifted from the verified "
            f"320x528 RGBA (got {enemies_im.size} {enemies_im.mode}) - "
            f"re-verify the gunner row offsets (392/452) before trusting them."
        )
    GUNNER_CELL_W = 68
    GUNNER_CELL_H = 60
    gunner_cols = lambda y0: [
        enemies_im.crop((i * GUNNER_CELL_W, y0, (i + 1) * GUNNER_CELL_W, y0 + GUNNER_CELL_H)) for i in range(4)
    ]
    pack_rows(
        "mech_gunner",
        {"idle": gunner_cols(392), "attack": gunner_cols(452)},
        cell_w=GUNNER_CELL_W,
        cell_h=GUNNER_CELL_H,
    )
    WIRED.append("assets/sprites/enemies-sheet-alpha.png")

    # Pickup icons: powerups-sheet-alpha.png's letter-badge grid (18x18
    # cells, verified via row/column content scan - each letter repeats
    # twice consecutively, e.g. "A A B B C C..."). This "Super Dero Space
    # Gunner" sheet's own collectible-letter set skips several letters
    # (no full A-Z run), but H/D/C/K/J all exist in the same red-badge row
    # (y=[92,110)) - used as one-letter mnemonic icons (Health/Dash/Coin/
    # Key/(double-)Jump) in place of the flat canvas-primitive shapes
    # drawPickups() used before, all pulled from the same row so they read
    # as one coherent icon family rather than five mismatched styles.
    powerups_src2 = ASSETS / "sprites" / "powerups-sheet-alpha.png"
    powerups_im2 = Image.open(powerups_src2)
    if powerups_im2.size != (640, 544) or powerups_im2.mode != "RGBA":
        raise RuntimeError(
            f"powerups-sheet-alpha.png geometry drifted from the verified "
            f"640x544 RGBA (got {powerups_im2.size} {powerups_im2.mode}) - "
            f"re-verify the letter-badge row offset (y=92) before trusting it."
        )
    LETTER_CELL = 18
    LETTER_Y0 = 92
    letter_col = lambda col: powerups_im2.crop((col * LETTER_CELL, LETTER_Y0, (col + 1) * LETTER_CELL, LETTER_Y0 + LETTER_CELL))
    pickup_icon_rows = {
        "health": [letter_col(14)],  # H
        "dash": [letter_col(6)],  # D
        "coin": [letter_col(4)],  # C
        "key": [letter_col(20)],  # K
        "doubleJump": [letter_col(18)],  # J
    }
    pack_rows("pickupIcons", pickup_icon_rows, cell_w=LETTER_CELL, cell_h=LETTER_CELL)
    WIRED.append("assets/sprites/powerups-sheet-alpha.png")

    _fx_keys = ["fx_projectile", "fx_muzzle", "fx_explosion", "fx_diewhirl", "mech_gunner", "pickupIcons"]
    _existing_meta = json.loads(_meta_path.read_text())
    _existing_meta.update({k: META[k] for k in _fx_keys})
    _meta_path.write_text(json.dumps(_existing_meta, indent=2))
    log(f"merged FX/mech-gunner entries into {_meta_path.relative_to(ROOT)}")

    # ---------- Boss: Dark Saber Werewolf (CC-BY 3.0 MindChamber) ----------
    # Source is 7 separate clip folders (idle/walk/run/attack/hit/death/howl),
    # each shot on its own raw canvas size - run/attack/howl's canvases are
    # much WIDER (captured with room for stride/swing reach) than idle/walk's,
    # so naively fitting each frame's whole canvas into a fixed cell
    # (pack_rows()'s normal behavior, correct for every other sprite in this
    # file) punishes that padding as if it were part of the character: the
    # werewolf used to visibly shrink and grow switching between animations.
    # Fixed at the source instead of a draw-time compensation table (which is
    # what shipped previously, while this zip was missing from disk - see
    # SESSION_LOG): crop every frame to its own content bbox first (drop the
    # padding), then apply one uniform per-animation resize so each group's
    # median content height lands on the same target (normalize_anim_scale's
    # docstring explains why median/per-animation, not per-frame). What's left
    # after that is genuine pose-to-pose variation (an attack lunge IS wider
    # than an idle stance) - not scale drift, so it's left alone.
    ds = extract("img/beast_boss_darksaber.zip", TMP / "ds", ("DarkSaber/",)) / "DarkSaber"

    def pick(folder: str, pattern: str, step: int, limit: int) -> list[Image.Image]:
        files = sorted((ds / folder).glob(pattern))
        return [Image.open(f) for f in files[::step][:limit]]

    werewolf_rows: dict[str, list[Image.Image]] = {
        "idle": pick("idle", "*.png", 10, 10),
        "walk": pick("walk", "*.png", 5, 8),
        "run": [Image.open(f) for f in sorted((ds / "run").glob("*.png"))[4:17:2]],
        "attack": pick("attack", "*.png", 8, 10),
        "hit": pick("Hit", "*.png", 6, 5),
        "death": pick("death", "*.png", 10, 10),
        "howl": pick("Howl", "*.png", 4, 6),
    }
    werewolf_rows = {name: [crop_to_content(f) for f in frames] for name, frames in werewolf_rows.items()}
    # Target chosen empirically (see docs/SESSION_LOG.md): large enough for a
    # crisp downscale to the in-game draw size, small enough that the sheet
    # (and its widest poses - run/attack's stride/swing reach) stays a
    # reasonable file size rather than the ~9000x3600px a full-raw-resolution
    # normalization would produce.
    WEREWOLF_TARGET_H = 200.0
    werewolf_scale = normalize_anim_scale(werewolf_rows, WEREWOLF_TARGET_H)
    log(f"boss_werewolf per-animation normalization scale: {({k: round(v, 3) for k, v in werewolf_scale.items()})}")
    werewolf_rows = {
        name: [
            f.resize((max(1, round(f.width * werewolf_scale[name])), max(1, round(f.height * werewolf_scale[name]))), Image.LANCZOS)
            for f in frames
        ]
        for name, frames in werewolf_rows.items()
    }

    pack_rows(
        "boss_werewolf",
        werewolf_rows,
        cell_w=460,
        cell_h=280,
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
