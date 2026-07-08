#!/usr/bin/env python3
"""
project_status.py — Generates a ground-truth snapshot of the repo's ACTUAL
state. Run this instead of trusting any agent's narrated summary of what
it did.

WHY THIS EXISTS
Multiple agent sessions have reported "done" on tasks that didn't match
the real file tree afterward (files claimed created that weren't, a script
claimed fixed that still had the old bug, an old script's output line
still printing after an "overwrite"). This script reads the filesystem
and git state directly — no agent self-reporting involved — so any
status claim can be checked against ground truth in one command.

USAGE
    python scripts/project-status.py

Writes STATUS.txt to the repo root AND prints it to the terminal.
Each run prepends a fresh, timestamped snapshot above a preserved history
of prior runs — nothing gets silently overwritten, so you can see drift
over time instead of just the current moment.
"""

import csv
import hashlib
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
STATUS_PATH = REPO_ROOT / "STATUS.txt"
HISTORY_MARKER = "=== PRIOR RUNS (most recent snapshot is always at the top) ==="

# Matches a manifest "note" that records the actual upstream URL a file was
# fetched from. A URL basename ending in "preview.<ext>" or "prev.<ext>"
# (e.g. golem-preview.png, dragonsprev.png) is direct evidence the scraper
# grabbed OpenGameArt's small companion preview image instead of the real
# attachment — not a size-based guess, an actual recorded fact.
PREVIEW_URL_RE = re.compile(r"prev(?:iew)?\.[a-zA-Z0-9]+", re.IGNORECASE)

# Classic Drupal auto-generated thumbnail/derivative square dimensions.
CLASSIC_THUMBNAIL_DIMS = {(100, 100), (64, 64), (128, 128)}


def sh(cmd: list[str]) -> str:
    try:
        result = subprocess.run(cmd, cwd=REPO_ROOT, capture_output=True, text=True, timeout=15)
        return (result.stdout + result.stderr).strip() or "(no output)"
    except Exception as e:
        return f"(command unavailable: {e})"


def image_dimensions(path: Path) -> tuple[int, int] | None:
    """Pure-stdlib PNG/GIF/JPEG dimension reader (no Pillow dependency —
    this script is meant to run with zero setup, anywhere, always)."""
    try:
        with path.open("rb") as f:
            head = f.read(32)
    except OSError:
        return None

    if head[:8] == b"\x89PNG\r\n\x1a\n" and len(head) >= 24:
        return int.from_bytes(head[16:20], "big"), int.from_bytes(head[20:24], "big")

    if head[:6] in (b"GIF87a", b"GIF89a") and len(head) >= 10:
        return int.from_bytes(head[6:8], "little"), int.from_bytes(head[8:10], "little")

    if head[:2] == b"\xff\xd8":
        try:
            data = path.read_bytes()
        except OSError:
            return None
        i = 2
        while i + 9 < len(data):
            if data[i] != 0xFF:
                i += 1
                continue
            marker = data[i + 1]
            if marker in (0xC0, 0xC1, 0xC2, 0xC3):
                return int.from_bytes(data[i + 7:i + 9], "big"), int.from_bytes(data[i + 5:i + 7], "big")
            if marker in (0xD8, 0x01) or 0xD0 <= marker <= 0xD7:
                i += 2
                continue
            seg_len = int.from_bytes(data[i + 2:i + 4], "big")
            i += 2 + seg_len
        return None

    return None


def load_confirmed_preview_filenames(manifest_paths: list[Path]) -> dict[str, str]:
    """Cross-reference manifest CSVs: return {filename: source_url} for
    every entry whose recorded upstream URL is itself a preview/prev image
    — i.e. confirmed by the manifest's own data, not inferred from size."""
    hits: dict[str, str] = {}
    for manifest_path in manifest_paths:
        if not manifest_path.exists():
            continue
        try:
            with manifest_path.open(newline="", encoding="utf-8") as f:
                for row in csv.DictReader(f):
                    filename = (row.get("filename") or "").strip()
                    note = row.get("note") or ""
                    if filename and PREVIEW_URL_RE.search(note):
                        hits[filename] = note.split()[0]
        except (OSError, csv.Error):
            continue
    return hits


def file_tree_with_sizes(base: Path, confirmed_previews: dict[str, str], counts: dict[str, int]) -> list[str]:
    if not base.exists():
        return [f"  (directory does not exist: {base})"]
    lines = []
    for path in sorted(base.rglob("*")):
        if not path.is_file():
            continue
        size_kb = path.stat().st_size / 1024
        is_image = path.suffix.lower() in (".png", ".jpg", ".jpeg", ".gif")
        flag = ""

        if path.name in confirmed_previews:
            flag = (
                f"   <-- CONFIRMED THUMBNAIL: manifest shows this was fetched from "
                f"'{confirmed_previews[path.name]}' — a preview image, not the real asset. Re-fetch needed."
            )
            counts["confirmed"] += 1
        elif size_kb < 20 and is_image:
            dims = image_dimensions(path)
            if dims and dims in CLASSIC_THUMBNAIL_DIMS:
                flag = f"   <-- LIKELY THUMBNAIL: {dims[0]}x{dims[1]} matches classic auto-thumbnail dimensions"
                counts["likely"] += 1
            else:
                dim_note = f"{dims[0]}x{dims[1]}" if dims else "dimensions unreadable"
                flag = f"   <-- worth a manual look: small file ({dim_note}) — may just be simple/indexed-palette art"
                counts["worth_checking"] += 1

        lines.append(f"  {path.relative_to(REPO_ROOT)}  ({size_kb:.1f} KB){flag}")
    return lines or ["  (empty)"]


def sha256_short(path: Path) -> str:
    if not path.exists():
        return "(file not found)"
    return hashlib.sha256(path.read_bytes()).hexdigest()[:12]


def contains_marker(path: Path, marker: str) -> str:
    if not path.exists():
        return f"NOT FOUND at {path}"
    content = path.read_text(encoding="utf-8", errors="ignore")
    return "YES" if marker in content else "NO — marker absent, file may be an older/unpatched version"


def build_snapshot() -> str:
    now = datetime.now().isoformat(timespec="seconds")
    lines = []
    lines.append(f"PROJECT STATUS SNAPSHOT — {now}")
    lines.append(f"Repo root: {REPO_ROOT}")
    lines.append("")

    lines.append("--- GIT STATUS (uncommitted changes) ---")
    lines.append(sh(["git", "status", "--short"]))
    lines.append("")
    lines.append("--- GIT LAST 5 COMMITS ---")
    lines.append(sh(["git", "log", "--oneline", "-5"]))
    lines.append("")

    script_path = REPO_ROOT / "scripts" / "asset-fetch.py"
    lines.append("--- asset-fetch.py VERSION CHECK ---")
    lines.append(f"File: {script_path}")
    lines.append(f"SHA256 (first 12 chars): {sha256_short(script_path)}")
    lines.append(f"Thumbnail-filter fix present ('/styles/' check): {contains_marker(script_path, '/styles/')}")
    lines.append("")

    confirmed_previews = load_confirmed_preview_filenames(
        [REPO_ROOT / "assets" / "manifest.csv", REPO_ROOT / "assets" / "manifest_bulk.csv"]
    )
    counts = {"confirmed": 0, "likely": 0, "worth_checking": 0}

    lines.append("--- assets/ TREE (actual sizes on disk) ---")
    lines.extend(file_tree_with_sizes(REPO_ROOT / "assets", confirmed_previews, counts))
    lines.append("")

    lines.append("--- docs/ TREE ---")
    lines.extend(file_tree_with_sizes(REPO_ROOT / "docs", confirmed_previews, counts))
    lines.append("")

    lines.append("--- SUSPECT-ASSET TRIAGE SUMMARY ---")
    lines.append(
        f"  CONFIRMED thumbnail (manifest proves preview URL): {counts['confirmed']} — re-fetch on a machine with network access"
    )
    lines.append(f"  LIKELY thumbnail (classic auto-thumbnail dimensions): {counts['likely']} — probably needs re-fetch")
    lines.append(f"  Worth a manual look (small file, plausible real dims): {counts['worth_checking']} — low priority, may be fine")
    lines.append("")

    manifest_path = REPO_ROOT / "assets" / "manifest.csv"
    lines.append("--- assets/manifest.csv CONTENTS ---")
    lines.append(manifest_path.read_text(encoding="utf-8") if manifest_path.exists() else "  (not found)")
    lines.append("")

    lines.append("--- ENVIRONMENT ---")
    key_set = "SET (value hidden)" if os.environ.get("FREESOUND_API_KEY") else "NOT SET"
    lines.append(f"FREESOUND_API_KEY: {key_set}")
    lines.append(f"Python: {sys.version.split()[0]}")
    lines.append("")

    return "\n".join(lines)


def main() -> None:
    new_snapshot = build_snapshot()

    existing = STATUS_PATH.read_text(encoding="utf-8") if STATUS_PATH.exists() else ""
    prior_history = existing.split(HISTORY_MARKER, 1)[-1].strip() if HISTORY_MARKER in existing else existing.strip()

    combined = f"{new_snapshot}\n{HISTORY_MARKER}\n\n{prior_history}".strip() + "\n"
    STATUS_PATH.write_text(combined, encoding="utf-8")

    print(new_snapshot)
    print(f"\n[Full report — including prior-run history — written to {STATUS_PATH.resolve()}]")


if __name__ == "__main__":
    main()