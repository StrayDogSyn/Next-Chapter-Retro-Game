#!/usr/bin/env python3
"""
asset_fetch.py — Downloads open-source sprite/SFX candidates for the
Next-Chapter-Retro-Game project (beast-transformation + sci-fi-soldier +
metroidvania aesthetic).

Run this on YOUR machine, not in a sandboxed environment — it needs live
network access to opengameart.org and freesound.org.

WHY IT'S STRUCTURED THIS WAY
- OpenGameArt pages embed a direct file link (usually under
  /sites/default/files/...). We scrape that link rather than hardcoding
  it, since OGA sometimes renames files on re-upload.
- Freesound requires an API key for programmatic access. Full-quality
  original downloads need OAuth2 (a multi-step user auth flow); the
  *preview* MP3 only needs a free API key. We default to previews here —
  see the FREESOUND SETUP section below to upgrade to OAuth2 if you want
  lossless originals later.
- Everything downloaded gets logged to manifest.csv so you can cross-
  reference against docs/CREDITS.md and flip status flags in one pass.

SETUP
    pip install requests beautifulsoup4

FREESOUND SETUP (required for the Freesound downloads to work)
    1. Create a free account at https://freesound.org
    2. Apply for an API key at https://freesound.org/apiv2/apply/
    3. Set it as an environment variable before running:
         export FREESOUND_API_KEY="your_key_here"       (macOS/Linux)
         setx FREESOUND_API_KEY "your_key_here"          (Windows)

USAGE
    python asset_fetch.py
"""

import csv
import os
import re
import sys
import time
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

# ---------------------------------------------------------------------------
# CONFIG — edit these lists to add/remove candidates
# ---------------------------------------------------------------------------

OUTPUT_DIR = Path("assets")
SPRITES_DIR = OUTPUT_DIR / "img"
AUDIO_DIR = OUTPUT_DIR / "sounds"
MANIFEST_PATH = OUTPUT_DIR / "manifest.csv"

# OpenGameArt content pages to scrape for a download link.
# (page_url, save_as_filename, category)
OGA_TARGETS = [
    (
        "https://opengameart.org/content/dark-saber-werewolf",
        "beast_boss_darksaber",
        SPRITES_DIR,
    ),
    (
        "https://opengameart.org/content/werewolf",
        "werewolf_base",
        SPRITES_DIR,
    ),
    (
        "https://opengameart.org/content/8-bit-sound-effect-pack-vol-001",
        "sfx_pack_8bit_vol1",
        AUDIO_DIR,
    ),
    (
        "https://opengameart.org/content/audio-cc0-8bit-chiptune",
        "chiptune_cc0_collection",
        AUDIO_DIR,
    ),
    (
        "https://opengameart.org/content/512-sound-effects-8-bit-style",
        "sfx_512_retro",
        AUDIO_DIR,
    ),
]

# Freesound sound IDs (from freesound.org/people/<user>/sounds/<id>/)
# (sound_id, save_as_filename)
FREESOUND_TARGETS = [
    (479380, "beast_roar_dragon"),      # Breviceps — dragon roars/growls/snarls, CC0
    (837799, "beast_roar_deep_kraken"), # Bikkit99 — layered sea-creature roar, CC0
    (366671, "beast_growl_generic"),    # cylon8472 — generic large-creature growl
]

HEADERS = {"User-Agent": "NextChapterRetroGame-AssetFetch/1.0 (educational bootcamp project)"}
REQUEST_DELAY_SECONDS = 1.5  # be polite to both APIs


# ---------------------------------------------------------------------------
# OPENGAMEART SCRAPER
# ---------------------------------------------------------------------------

def find_oga_download_link(page_url: str) -> str | None:
    """
    OpenGameArt file links live under /sites/default/files/... — but that
    same path prefix is ALSO used for auto-generated preview thumbnails,
    which live under /sites/default/files/styles/<style-name>/public/...
    (Drupal's image style derivative system). Grabbing the first match
    naively picks up a thumbnail image instead of the real asset.

    Stronger fix: OGA's real "File(s):" attachment link is distinguishable
    from inline body-content preview images because its visible link text
    includes a file size, e.g. "DarkSaber.zip 19.9 Mb" or "werewolf.png
    7 Kb". We prioritize that signal first, then fall back to preferred
    extensions, then the LAST non-thumbnail candidate (attachments
    typically appear after body content, not before it).
    """
    resp = requests.get(page_url, headers=HEADERS, timeout=20)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    candidates = []
    size_labeled = []
    for link in soup.find_all("a", href=True):
        href = link["href"]
        if "/sites/default/files/" in href and "/styles/" not in href:
            full = urljoin(page_url, href)
            candidates.append(full)
            link_text = link.get_text(" ", strip=True)
            if re.search(r"\d+(\.\d+)?\s*(KB|MB|Kb|Mb|kb|mb)\b", link_text):
                size_labeled.append(full)

    if size_labeled:
        return size_labeled[0]

    if not candidates:
        return None

    preferred_ext = (".zip", ".wav", ".ogg", ".mp3", ".rar", ".7z")
    for c in candidates:
        if c.lower().endswith(preferred_ext):
            return c
    return candidates[-1]


def download_oga_asset(page_url: str, save_stem: str, dest_dir: Path) -> dict:
    dest_dir.mkdir(parents=True, exist_ok=True)
    result = {
        "source": "opengameart",
        "page_url": page_url,
        "filename": None,
        "status": "failed",
        "note": "",
    }

    file_url = find_oga_download_link(page_url)
    if not file_url:
        result["note"] = "No direct file link found — check page manually"
        return result

    ext = Path(file_url).suffix or ".bin"
    filename = f"{save_stem}{ext}"
    dest_path = dest_dir / filename

    file_resp = requests.get(file_url, headers=HEADERS, timeout=60)
    file_resp.raise_for_status()
    dest_path.write_bytes(file_resp.content)

    size_kb = len(file_resp.content) / 1024
    if size_kb < 20 and ext in (".png", ".jpg", ".jpeg", ".gif"):
        note = f"{file_url}  [WARNING: only {size_kb:.1f}KB — likely a thumbnail, verify manually]"
        result.update(filename=filename, status="downloaded-unverified", note=note)
    else:
        result.update(filename=filename, status="downloaded", note=file_url)
    return result


# ---------------------------------------------------------------------------
# FREESOUND DOWNLOADER (preview quality — see docstring for OAuth2 upgrade)
# ---------------------------------------------------------------------------

def download_freesound_preview(sound_id: int, save_stem: str) -> dict:
    result = {
        "source": "freesound",
        "page_url": f"https://freesound.org/s/{sound_id}/",
        "filename": None,
        "status": "failed",
        "note": "",
    }

    api_key = os.environ.get("FREESOUND_API_KEY")
    if not api_key:
        result["note"] = "FREESOUND_API_KEY not set — skipped"
        return result

    meta_url = f"https://freesound.org/apiv2/sounds/{sound_id}/"
    resp = requests.get(meta_url, params={"token": api_key}, headers=HEADERS, timeout=20)

    if resp.status_code == 401:
        result["note"] = "Invalid or unauthorized API key"
        return result
    resp.raise_for_status()
    data = resp.json()

    preview_url = data.get("previews", {}).get("preview-hq-mp3")
    if not preview_url:
        result["note"] = "No preview URL in response"
        return result

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{save_stem}.mp3"
    dest_path = AUDIO_DIR / filename

    audio_resp = requests.get(preview_url, headers=HEADERS, timeout=30)
    audio_resp.raise_for_status()
    dest_path.write_bytes(audio_resp.content)

    license_note = data.get("license", "license unknown — verify on page")
    result.update(filename=filename, status="downloaded", note=f"license: {license_note}")
    return result


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main() -> None:
    SPRITES_DIR.mkdir(parents=True, exist_ok=True)
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    results = []

    print(f"Fetching {len(OGA_TARGETS)} OpenGameArt asset(s)...\n")
    for page_url, save_stem, dest_dir in OGA_TARGETS:
        print(f"  -> {page_url}")
        r = download_oga_asset(page_url, save_stem, dest_dir)
        results.append(r)
        print(f"     {r['status']}: {r.get('filename') or r['note']}")
        time.sleep(REQUEST_DELAY_SECONDS)

    print(f"\nFetching {len(FREESOUND_TARGETS)} Freesound preview(s)...\n")
    if not os.environ.get("FREESOUND_API_KEY"):
        print("  WARNING: FREESOUND_API_KEY is not set. Freesound downloads will be skipped.")
        print("  See the SETUP section at the top of this script.\n")

    for sound_id, save_stem in FREESOUND_TARGETS:
        print(f"  -> sound ID {sound_id}")
        r = download_freesound_preview(sound_id, save_stem)
        results.append(r)
        print(f"     {r['status']}: {r.get('filename') or r['note']}")
        time.sleep(REQUEST_DELAY_SECONDS)

    # Write manifest for cross-referencing against docs/CREDITS.md
    with open(MANIFEST_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["source", "page_url", "filename", "status", "note"])
        writer.writeheader()
        writer.writerows(results)

    succeeded = sum(1 for r in results if r["status"] == "downloaded")
    print(f"\nDone. {succeeded}/{len(results)} assets downloaded.")
    print(f"Manifest written to: {MANIFEST_PATH.resolve()}")
    print("Cross-reference this against docs/CREDITS.md and flip status flags to 🟡.")


if __name__ == "__main__":
    try:
        main()
    except requests.RequestException as e:
        print(f"Network error: {e}", file=sys.stderr)
        sys.exit(1)