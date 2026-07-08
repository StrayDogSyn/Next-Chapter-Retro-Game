#!/usr/bin/env python3
"""
asset_fetch_bulk.py — Expanded asset sourcing for a full platformer build
(20+ levels, weapons, character mods, bosses, loot/treasure SFX).

Run this on YOUR machine — it needs live network access to opengameart.org
and freesound.org, which a sandboxed environment can't reach.

WHAT THIS DOES DIFFERENTLY FROM asset-fetch.py
- asset-fetch.py hits a fixed list of specific asset pages.
- This crawls curated OpenGameArt "hub" pages (collections that link out
  to dozens of individual assets) and downloads a capped number from each,
  reusing the thumbnail-filtering fix (skips /styles/ derivative URLs,
  prefers real asset extensions).
- For Freesound, instead of hardcoded sound IDs, it runs keyword searches
  (sword hits, coin pickups, boss stingers, treasure chests, etc.) via the
  Search API and downloads preview-quality results for each.

WHAT THIS DOES NOT DO
- It does not design levels, balance weapons, script boss AI, or build
  loot tables. It sources raw art/audio material only. Level/loot/combat
  logic is a separate build step — likely Python-service work per this
  project's ADR-001.

SETUP
    pip install requests beautifulsoup4

FREESOUND SETUP (required for the Freesound portion)
    Set FREESOUND_API_KEY as an environment variable before running.

USAGE
    python scripts/asset-fetch-bulk.py

CAPS
Both sources are capped (see CONFIG below) to stay polite to these free
services. Raise the caps once you've confirmed the results look right —
don't max them out on a first run.
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
# CONFIG
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = REPO_ROOT / "assets"
SPRITES_DIR = OUTPUT_DIR / "img" / "bulk"
AUDIO_DIR = OUTPUT_DIR / "sounds" / "bulk"
MANIFEST_PATH = OUTPUT_DIR / "manifest_bulk.csv"

HEADERS = {"User-Agent": "NextChapterRetroGame-AssetFetchBulk/1.0 (educational bootcamp project)"}
REQUEST_DELAY_SECONDS = 2.0  # be polite — this script makes many more requests than asset-fetch.py

# OpenGameArt hub/collection pages to crawl for linked assets.
# (hub_url, dest_dir, max_downloads_from_this_hub)
OGA_HUBS = [
    ("https://opengameart.org/content/metroidvania-art", SPRITES_DIR, 8),
    ("https://opengameart.org/content/enemies-and-characters-pixel-art", SPRITES_DIR, 8),
    ("https://opengameart.org/content/34-directional-sprite-sets", SPRITES_DIR, 6),
    ("https://opengameart.org/content/animated-top-down-creatures", SPRITES_DIR, 6),
    ("https://opengameart.org/content/misc-dark-fantasy-scenery-sprites", SPRITES_DIR, 6),
    ("https://opengameart.org/content/dark-fantasy-item-sprites", SPRITES_DIR, 6),
    ("https://opengameart.org/content/tilesets-and-backgrounds-pixelart", SPRITES_DIR, 8),
    ("https://opengameart.org/content/cc0-sound-effects", AUDIO_DIR, 8),
    ("https://opengameart.org/content/audio-cc0-8bit-chiptune", AUDIO_DIR, 8),
]
MAX_OGA_TOTAL = 60

# Freesound keyword searches covering weapons, pickups, bosses, treasure, UI.
# (query, result_count)
FREESOUND_QUERIES = [
    ("8bit sword hit", 4),
    ("8bit explosion", 4),
    ("chiptune boss battle", 3),
    ("retro coin pickup", 4),
    ("retro level up", 3),
    ("retro power up", 4),
    ("laser gun retro", 4),
    ("treasure chest open", 3),
    ("monster roar", 4),
    ("footstep stone", 3),
    ("dungeon door open", 3),
    ("magic spell cast", 4),
    ("armor clank metal", 3),
    ("game over jingle", 3),
    ("victory fanfare 8bit", 3),
]
MAX_FREESOUND_TOTAL = 60


# ---------------------------------------------------------------------------
# SHARED HELPERS
# ---------------------------------------------------------------------------

def slugify(text: str) -> str:
    text = re.sub(r"[^a-zA-Z0-9]+", "_", text.strip().lower())
    return re.sub(r"_+", "_", text).strip("_")[:60]


def find_oga_download_link(page_url: str) -> tuple[str | None, str | None]:
    """Returns (file_url, page_title). Filters out /styles/ thumbnail
    derivatives, prefers real asset extensions over loose images."""
    resp = requests.get(page_url, headers=HEADERS, timeout=20)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    title_tag = soup.find("h1")
    title = title_tag.get_text(strip=True) if title_tag else Path(page_url).name

    candidates = []
    for link in soup.find_all("a", href=True):
        href = link["href"]
        if "/sites/default/files/" in href and "/styles/" not in href:
            candidates.append(urljoin(page_url, href))

    if not candidates:
        return None, title

    preferred_ext = (".zip", ".wav", ".ogg", ".mp3", ".rar", ".7z")
    for c in candidates:
        if c.lower().endswith(preferred_ext):
            return c, title
    return candidates[0], title


# ---------------------------------------------------------------------------
# PHASE 1 — OPENGAMEART HUB CRAWL
# ---------------------------------------------------------------------------

def discover_content_links(hub_url: str, cap: int) -> list[str]:
    resp = requests.get(hub_url, headers=HEADERS, timeout=20)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    links = []
    seen = set()
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "/content/" not in href:
            continue
        full = urljoin(hub_url, href).split("#")[0]
        if full == hub_url or full in seen:
            continue
        seen.add(full)
        links.append(full)
        if len(links) >= cap:
            break
    return links


def download_oga_file(page_url: str, dest_dir: Path, hub_url: str) -> dict:
    dest_dir.mkdir(parents=True, exist_ok=True)
    result = {
        "source": "opengameart",
        "hub_or_query": hub_url,
        "page_url": page_url,
        "title": "",
        "filename": None,
        "status": "failed",
        "note": "",
    }

    file_url, title = find_oga_download_link(page_url)
    result["title"] = title or ""

    if not file_url:
        result["note"] = "No direct file link found — check page manually"
        return result

    ext = Path(file_url).suffix or ".bin"
    stem = slugify(title) or slugify(Path(page_url).name)
    filename = f"{stem}{ext}"
    dest_path = dest_dir / filename

    if dest_path.exists():
        result.update(filename=filename, status="skipped-exists", note="already downloaded")
        return result

    file_resp = requests.get(file_url, headers=HEADERS, timeout=60)
    file_resp.raise_for_status()
    dest_path.write_bytes(file_resp.content)

    size_kb = len(file_resp.content) / 1024
    if size_kb < 20 and ext.lower() in (".png", ".jpg", ".jpeg", ".gif"):
        result.update(
            filename=filename,
            status="downloaded-unverified",
            note=f"{file_url}  [WARNING: {size_kb:.1f}KB — likely a thumbnail]",
        )
    else:
        result.update(filename=filename, status="downloaded", note=file_url)
    return result


def run_oga_phase() -> list[dict]:
    results = []
    total = 0

    print(f"Crawling {len(OGA_HUBS)} OpenGameArt hub(s)...\n")
    for hub_url, dest_dir, cap in OGA_HUBS:
        if total >= MAX_OGA_TOTAL:
            print(f"  Reached MAX_OGA_TOTAL ({MAX_OGA_TOTAL}), stopping OGA phase.")
            break

        print(f"Hub: {hub_url}")
        try:
            content_links = discover_content_links(hub_url, cap)
        except requests.RequestException as e:
            print(f"  Could not read hub page: {e}")
            continue

        print(f"  Found {len(content_links)} candidate link(s)")
        for page_url in content_links:
            if total >= MAX_OGA_TOTAL:
                break
            print(f"  -> {page_url}")
            try:
                r = download_oga_file(page_url, dest_dir, hub_url)
            except requests.RequestException as e:
                r = {
                    "source": "opengameart", "hub_or_query": hub_url, "page_url": page_url,
                    "title": "", "filename": None, "status": "failed", "note": f"network error: {e}",
                }
            results.append(r)
            print(f"     {r['status']}: {r.get('filename') or r['note']}")
            total += 1
            time.sleep(REQUEST_DELAY_SECONDS)
        print()

    return results


# ---------------------------------------------------------------------------
# PHASE 2 — FREESOUND KEYWORD SEARCH
# ---------------------------------------------------------------------------

def freesound_search(query: str, count: int, api_key: str) -> list[dict]:
    url = "https://freesound.org/apiv2/search/text/"
    params = {
        "query": query,
        "token": api_key,
        "page_size": count,
        "fields": "id,name,previews,license,duration",
    }
    resp = requests.get(url, params=params, headers=HEADERS, timeout=20)
    resp.raise_for_status()
    return resp.json().get("results", [])


def download_freesound_result(item: dict, query: str) -> dict:
    result = {
        "source": "freesound",
        "hub_or_query": query,
        "page_url": f"https://freesound.org/s/{item.get('id')}/",
        "title": item.get("name", ""),
        "filename": None,
        "status": "failed",
        "note": "",
    }

    preview_url = item.get("previews", {}).get("preview-hq-mp3")
    if not preview_url:
        result["note"] = "No preview URL in response"
        return result

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    stem = slugify(f"{query}_{item.get('name', item.get('id'))}")
    filename = f"{stem}.mp3"
    dest_path = AUDIO_DIR / filename

    if dest_path.exists():
        result.update(filename=filename, status="skipped-exists", note="already downloaded")
        return result

    audio_resp = requests.get(preview_url, headers=HEADERS, timeout=30)
    audio_resp.raise_for_status()
    dest_path.write_bytes(audio_resp.content)

    license_note = item.get("license", "license unknown — verify on page")
    result.update(filename=filename, status="downloaded", note=f"license: {license_note}")
    return result


def run_freesound_phase() -> list[dict]:
    results = []
    api_key = os.environ.get("FREESOUND_API_KEY")

    print(f"Searching {len(FREESOUND_QUERIES)} Freesound quer(y/ies)...\n")
    if not api_key:
        print("  WARNING: FREESOUND_API_KEY is not set. Freesound phase will be skipped entirely.\n")
        return results

    total = 0
    for query, count in FREESOUND_QUERIES:
        if total >= MAX_FREESOUND_TOTAL:
            print(f"  Reached MAX_FREESOUND_TOTAL ({MAX_FREESOUND_TOTAL}), stopping Freesound phase.")
            break

        print(f"Query: \"{query}\"")
        try:
            items = freesound_search(query, count, api_key)
        except requests.RequestException as e:
            print(f"  Search failed: {e}")
            continue

        for item in items:
            if total >= MAX_FREESOUND_TOTAL:
                break
            try:
                r = download_freesound_result(item, query)
            except requests.RequestException as e:
                r = {
                    "source": "freesound", "hub_or_query": query,
                    "page_url": f"https://freesound.org/s/{item.get('id')}/",
                    "title": item.get("name", ""), "filename": None,
                    "status": "failed", "note": f"network error: {e}",
                }
            results.append(r)
            print(f"  -> {r['title']}: {r['status']}")
            total += 1
            time.sleep(REQUEST_DELAY_SECONDS)
        print()

    return results


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main() -> None:
    SPRITES_DIR.mkdir(parents=True, exist_ok=True)
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    all_results = []
    all_results.extend(run_oga_phase())
    all_results.extend(run_freesound_phase())

    with open(MANIFEST_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f, fieldnames=["source", "hub_or_query", "page_url", "title", "filename", "status", "note"]
        )
        writer.writeheader()
        writer.writerows(all_results)

    downloaded = sum(1 for r in all_results if r["status"] == "downloaded")
    unverified = sum(1 for r in all_results if r["status"] == "downloaded-unverified")
    skipped = sum(1 for r in all_results if r["status"] == "skipped-exists")
    failed = sum(1 for r in all_results if r["status"] == "failed")

    print("=" * 60)
    print(f"Total items processed: {len(all_results)}")
    print(f"  Downloaded (verified size):   {downloaded}")
    print(f"  Downloaded but UNVERIFIED:    {unverified}  <- check these manually")
    print(f"  Skipped (already existed):    {skipped}")
    print(f"  Failed:                       {failed}")
    print(f"Manifest written to: {MANIFEST_PATH.resolve()}")
    print("Run `python scripts/project-status.py` next to confirm actual file sizes on disk.")


if __name__ == "__main__":
    try:
        main()
    except requests.RequestException as e:
        print(f"Network error: {e}", file=sys.stderr)
        sys.exit(1)