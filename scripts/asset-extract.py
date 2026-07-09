#!/usr/bin/env python3
"""asset-extract.py — unpack downloaded asset zips into public/assets/extracted/
and generate a manifest.json the game can load at runtime.

Why public/: Next.js only serves files under public/. Anything left in the
repo-root assets/ folder is invisible to the browser (works locally in
screenshots, blank sprites on GitHub Pages).

Usage:
    python scripts/asset-extract.py            # extract new zips, rebuild manifest
    python scripts/asset-extract.py --force    # re-extract everything
    python scripts/asset-extract.py --dry-run  # show what would happen

House rules honored:
  - kebab-case filename, lives in /scripts
  - REPO_ROOT resolved relative to this file
  - prints real output for every action (no silent success)
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIRS = [REPO_ROOT / "assets", REPO_ROOT / "downloads"]
EXTRACT_ROOT = REPO_ROOT / "public" / "assets" / "extracted"
MANIFEST_PATH = REPO_ROOT / "public" / "assets" / "manifest.json"
LEGACY_MANIFEST_PATH = EXTRACT_ROOT / "manifest.json"

IMAGE_EXTS = {".png", ".gif", ".bmp", ".webp", ".jpg", ".jpeg"}
AUDIO_EXTS = {".wav", ".ogg", ".mp3", ".flac", ".it", ".xm", ".mod"}
DATA_EXTS = {".json", ".tmx", ".tsx", ".txt", ".xml"}

# Junk we never want served
SKIP_NAMES = {"__MACOSX", ".DS_Store", "Thumbs.db", "desktop.ini"}


def slugify(name: str) -> str:
    """DarkSaber.zip -> dark-saber ; 8_bit_sound_effect_pack.zip -> 8-bit-sound-effect-pack"""
    stem = Path(name).stem
    stem = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", "-", stem)  # camelCase boundary
    stem = re.sub(r"[^A-Za-z0-9]+", "-", stem)
    return stem.strip("-").lower()


def classify(path: Path) -> str:
    ext = path.suffix.lower()
    if ext in IMAGE_EXTS:
        return "image"
    if ext in AUDIO_EXTS:
        return "audio"
    if ext in DATA_EXTS:
        return "data"
    return "other"


def safe_extract(zf: zipfile.ZipFile, dest: Path) -> list[Path]:
    """Extract while guarding against zip-slip (../../ paths). Returns extracted files."""
    extracted: list[Path] = []
    dest_resolved = dest.resolve()
    for member in zf.infolist():
        if member.is_dir():
            continue
        parts = Path(member.filename).parts
        if any(p in SKIP_NAMES for p in parts):
            continue
        target = (dest / member.filename).resolve()
        if not str(target).startswith(str(dest_resolved)):
            print(f"  !! SKIPPED (zip-slip attempt): {member.filename}")
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        with zf.open(member) as src, open(target, "wb") as out:
            shutil.copyfileobj(src, out)
        extracted.append(target)
    return extracted


def find_zips() -> list[Path]:
    zips: list[Path] = []
    for d in SOURCE_DIRS:
        if d.is_dir():
            zips.extend(sorted(d.rglob("*.zip")))
    return zips


def build_manifest() -> dict:
    """Walk EXTRACT_ROOT and record every servable file with a path RELATIVE to
    public/, so the runtime can prefix BASE_PATH for GitHub Pages."""
    packs: dict[str, dict] = {}
    files_by_stem: dict[str, list[str]] = {}
    public_root = REPO_ROOT / "public"
    for pack_dir in sorted(p for p in EXTRACT_ROOT.iterdir() if p.is_dir()):
        entries = {"images": [], "audio": [], "data": [], "other": []}
        for f in sorted(pack_dir.rglob("*")):
            if not f.is_file() or f.name in SKIP_NAMES:
                continue
            rel = f.relative_to(public_root).as_posix()  # e.g. assets/extracted/dark-saber/idle.png
            kind = classify(f)
            key = {"image": "images", "audio": "audio", "data": "data", "other": "other"}[kind]
            entries[key].append(rel)

            stem_key = f.stem.lower()
            files_by_stem.setdefault(stem_key, []).append(rel)
        packs[pack_dir.name] = entries

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "note": "Paths are relative to public/. Prefix with BASE_PATH at runtime.",
        "packs": packs,
        "filesByStem": files_by_stem,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="re-extract even if pack dir exists")
    ap.add_argument("--dry-run", action="store_true", help="report without writing")
    args = ap.parse_args()

    zips = find_zips()
    if not zips:
        print(f"No .zip files found under: {', '.join(str(d) for d in SOURCE_DIRS)}")
        return 1

    print(f"Found {len(zips)} zip(s). Extract root: {EXTRACT_ROOT}")
    extracted_count = skipped_count = 0

    for zp in zips:
        slug = slugify(zp.name)
        dest = EXTRACT_ROOT / slug
        if dest.exists() and not args.force:
            print(f"  skip  {zp.name}  (already extracted -> {slug}/; use --force)")
            skipped_count += 1
            continue
        if args.dry_run:
            print(f"  would extract  {zp.name}  ->  {dest.relative_to(REPO_ROOT)}")
            continue
        if dest.exists():
            shutil.rmtree(dest)
        dest.mkdir(parents=True, exist_ok=True)
        try:
            with zipfile.ZipFile(zp) as zf:
                files = safe_extract(zf, dest)
            print(f"  ok    {zp.name}  ->  {dest.relative_to(REPO_ROOT)}  ({len(files)} files)")
            extracted_count += 1
        except zipfile.BadZipFile:
            print(f"  !! BAD ZIP: {zp} — skipping")
            shutil.rmtree(dest, ignore_errors=True)

    if args.dry_run:
        print("Dry run complete. Nothing written.")
        return 0

    manifest = build_manifest()
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    LEGACY_MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)

    manifest_text = json.dumps(manifest, indent=2)
    MANIFEST_PATH.write_text(manifest_text, encoding="utf-8")
    LEGACY_MANIFEST_PATH.write_text(manifest_text, encoding="utf-8")

    total_files = sum(
        len(v) for pack in manifest["packs"].values() for v in pack.values()
    )
    print(f"\nManifest: {MANIFEST_PATH.relative_to(REPO_ROOT)}")
    print(f"Legacy copy: {LEGACY_MANIFEST_PATH.relative_to(REPO_ROOT)}")
    print(f"  packs: {len(manifest['packs'])}  |  files listed: {total_files}")
    print(f"  extracted now: {extracted_count}  |  skipped (existing): {skipped_count}")
    print("\nNext: python scripts/project-status.py   # verify, per house rules")
    return 0


if __name__ == "__main__":
    sys.exit(main())
