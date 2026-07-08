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

import hashlib
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
STATUS_PATH = REPO_ROOT / "STATUS.txt"
HISTORY_MARKER = "=== PRIOR RUNS (most recent snapshot is always at the top) ==="


def sh(cmd: list[str]) -> str:
    try:
        result = subprocess.run(cmd, cwd=REPO_ROOT, capture_output=True, text=True, timeout=15)
        return (result.stdout + result.stderr).strip() or "(no output)"
    except Exception as e:
        return f"(command unavailable: {e})"


def file_tree_with_sizes(base: Path) -> list[str]:
    if not base.exists():
        return [f"  (directory does not exist: {base})"]
    lines = []
    for path in sorted(base.rglob("*")):
        if path.is_file():
            size_kb = path.stat().st_size / 1024
            flag = ""
            if size_kb < 20 and path.suffix.lower() in (".png", ".jpg", ".jpeg", ".gif"):
                flag = "   <-- SUSPECT: small image, may be a thumbnail, not the real asset"
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

    lines.append("--- assets/ TREE (actual sizes on disk) ---")
    lines.extend(file_tree_with_sizes(REPO_ROOT / "assets"))
    lines.append("")

    lines.append("--- docs/ TREE ---")
    lines.extend(file_tree_with_sizes(REPO_ROOT / "docs"))
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