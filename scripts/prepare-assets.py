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

from PIL import Image

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


def gif_frames(path: Path) -> list[Image.Image]:
    im = Image.open(path)
    frames = []
    try:
        while True:
            frames.append(im.convert("RGBA").copy())
            im.seek(im.tell() + 1)
    except EOFError:
        pass
    return frames


def main() -> None:
    for d in (SPRITES_OUT, AUDIO_OUT):
        d.mkdir(parents=True, exist_ok=True)
    if TMP.exists():
        shutil.rmtree(TMP, ignore_errors=True)
    TMP.mkdir(exist_ok=True)

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
    h2 = gob.height // 2  # 585 -> 292
    walk = [gob.crop((c * (gob.width // 4), h2, (c + 1) * (gob.width // 4), gob.height)) for c in range(4)]
    top_w = gob.width // 5
    idle = [gob.crop((0, 0, top_w, h2))]
    attack = [gob.crop((2 * top_w, 0, 3 * top_w, h2)), gob.crop((3 * top_w, 0, 4 * top_w, h2))]
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
    # (col,row) coords verified visually against a labeled grid overlay this session
    tiles = [
        ("top", (2, 10)),
        ("fill", (2, 11)),
        ("topLeft", (0, 4)),
        ("topRight", (15, 6)),
        ("wallLeft", (4, 8)),
        ("wallRight", (1, 7)),
        ("platform", (7, 8)),
        ("fillDark", (7, 11)),
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
    with zipfile.ZipFile(ASSETS / "sounds/sfx_pack_8bit_vol1.zip") as zf:
        zf.extractall(sfx1)
    WIRED.append("assets/sounds/sfx_pack_8bit_vol1.zip")
    wav_picks = {
        "jump.wav": "Jump 1.wav",
        "hit.wav": "Hit 2.wav",
        "coin.wav": "Coin 1.wav",
        "powerup.wav": "Powerup 1.wav",
        "explosion.wav": "Explosion 2.wav",
        "select.wav": "Select 1.wav",
        "shoot.wav": "Shoot 1.wav",
        "wrong.wav": "Wrong 1.wav",
        "door.wav": "Exit 3.wav",
    }
    for dst, src in wav_picks.items():
        shutil.copy(sfx1 / src, AUDIO_OUT / dst)

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
