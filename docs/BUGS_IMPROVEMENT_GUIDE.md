# Bugs & QA Findings — Living Improvement Roadmap

> **Purpose:** This document tracks usability issues, gameplay bugs, and feature enhancements identified during human playtesting and QA audits. Each item provides root-cause analysis, actionable step-by-step remediation aligned with the project architecture, and a strict verification checklist.
>
> **Last updated:** 2026-07-14 (Tier 2 swm asset-utilization backlog added: AST-014 through AST-020; see `docs/SESSION_LOG.md`)  
> **Maintainer:** StrayDogSyn / QA & Engineering Team  
> **Rule of Thumb:** All changes must respect existing architectural boundaries (no parallel canvas systems, unified `Game` class logic in `lib/game/game.ts`, asset ingestion strictly via `scripts/prepare-assets.py`).

---

## Quick Reference & Tracking Dashboard

| ID | Category | Issue / Enhancement Summary | Priority | Status |
|---|---|---|---|---|
| [BUG-001](#bug-001-pit-dropped-loot-persistence) | Physics / Loot | Items dropped over pits despawn or fail to persist during room transitions | High | ✅ Fixed (verified 2026-07-13) |
| [UI-002](#ui-002-equipment-dashboard-highlight--swap-effects) | UI / FX | Equipment needs stronger HUD highlighting and noticeable swap feedback | Medium | 🔴 Untracked |
| [BUG-003](#bug-003-unreachable-platform-generation--dead-ends) | Level Gen | Initial floors have unreachable platform heights causing navigation dead-ends | High | ✅ Fixed (verified 2026-07-13) |
| [UX-004](#ux-004-player-respawn--self-destruct-mechanism) | Controls / UX | No self-destruct/reset mechanism when trapped in soft-locks or dead-ends | High | ✅ Fixed (verified 2026-07-13) |
| [AST-005](#ast-005-underutilized-sprite--audio-assets) | Asset Pipeline | Game engine only utilizes a small fraction of available sprites and SFX | Medium | 🔴 Untracked |
| [UX-006](#ux-006-treasure--coin-micro-interactions) | Visuals / Polish | Coins and treasure lack premium micro-interactions and sprite variety | Medium | 🔴 Untracked |
| [UI-007](#ui-007-dashboard-mini-map-integration) | UI / Navigation | Lack of spatial orientation; mini-map needed in the dashboard | High | 🔴 Untracked |
| [UI-008](#ui-008-fullscreen-unobtrusive-help-modal) | UI / Accessibility | Fullscreen hides instructions; persistent unobtrusive `?` modal needed | Medium | 🔴 Untracked |
| [SYS-009](#sys-009-xp-counter--inventory-stats-modal) | Progression / UI | Missing XP counter from defeats and centralized inventory/stats modal | High | 🔴 Untracked |
| [AST-010](#ast-010-ingestion-of-downloads-archive-assets) | Asset Pipeline | Unprocessed asset archives in `./downloads` need pipeline integration | High | 🔴 Untracked |
| [SYS-011](#sys-011-persistent-checkpoints--save-states) | Persistence | No checkpoint system or persistent save data across sessions | High | 🔴 Untracked |
| [SYS-012](#sys-012-npc-item-shop--coin-economy-sink) | Gameplay / Economy | Coins lack an economy sink; NPC shop needed for replay value | Medium | 🔴 Untracked |
| [AST-013](#ast-013-suspect-thumbnail-triage--scraper-hardening) | Asset Pipeline | `project-status.py`'s size-only heuristic flagged 24 assets as suspect; most were false positives | Medium | 🟢 Triage + scraper fix done, re-fetch pending |
| [AST-014](#ast-014-powerups-sheet--rarity-tiered-pickup-art) | Asset Pipeline | swm `powerups-sheet-alpha.png` isn't bound to loot tables; pickups still render as flat colored rects | Medium | 🔴 Untracked |
| [AST-015](#ast-015-impactsweaponflash-5-color-tiers--rarity-fx) | Asset Pipeline | swm `impacts-*`/`weaponflash-*` 5-color-tier FX sheets are unused; hit/pickup feedback has no rarity-tinted juice | Medium | 🔴 Untracked |
| [AST-016](#ast-016-one-coherent-swm-biome-tiles--backgrounds--enemies) | Level Gen / Asset Pipeline | swm tiles, backgrounds, and `enemies-sheet-alpha.png` are unused; no single biome uses the coherent swm art language yet | High | 🔴 Untracked |
| [AST-017](#ast-017-tile-variation-pools-for-seeded-rooms) | Level Gen / Asset Pipeline | Tile-variation sets, `truchet.png`, and `minimalist_pixel_tileset.png` aren't registered as seed-driven variant pools | Medium | 🔴 Untracked |
| [AST-018](#ast-018-forestmesadepths-backdrops-for-zone-variety) | Asset Pipeline | `forest.png`/`mesa.png`/`depths_of_terra.png` backdrops are unused; every zone currently shares one background family | Medium | 🔴 Untracked |
| [AST-019](#ast-019-darksaber--wyrmwolf-boss-integration) | Bosses / Asset Pipeline | Darksaber werewolf pack and `wyrmwolf.png` aren't wired as distinct boss encounters beyond the existing single mid-boss crop | Medium | 🔴 Untracked |
| [AST-020](#ast-020-purge-list-execution-thumbnails--wrong-projectionera-assets) | Asset Pipeline | 5 known thumbnail/wrong-projection/wrong-era assets (incl. the currently-wired `bat_sprite.png`) should be moved out of pipeline reach, not left where procgen could roll them | Low | 🔴 Untracked |

---

## Detailed Remediation Plans & Checklists

### BUG-001: Pit-Dropped Loot Persistence
**Issue Description:** When enemies flying over pits or positioned near room edges are defeated, the loot generated via `/api/loot` drops into bottomless pits or out-of-bounds trigger zones. If the player attempts to chase the item or transitions to the next room, the item is permanently despawned, leading to frustrating rewards loss.

**Step-by-Step Improvement Recommendations:**
1. **Loot Clamping Physics:** Modify `lib/game/items.ts` so that when an item spawns, its initial raycast checks the vertical column below it. If the target drop zone is a pit/hazard tile (`#` or void), horizontally clamp the drop coordinates to the nearest solid platform edge.
2. **Room Transition Persistence:** In `lib/game/world.ts` and `game.ts`, decouple active floor items from temporary room state. Store active drops in a world-level map (`Map<roomId, Item[]>`).
3. **Safety Magnet Feature:** Implement a "pit rescue" behavior: if an item falls below the viewport floor limit (`y > stageHeight`), respawn it at the entrance threshold of the current room rather than destroying it.

**Completion Checklist:**
- [x] Pit-rescue clamping implemented — see `lib/game/game.ts` around line 1520 (`// Pit rescue (BUG-001)`): a loot drop with no floor below is relocated to the nearest solid ground instead of despawning.
- [x] Re-verified 2026-07-13: code and comment still present and wired into the live drop path; no despawn-on-pit path remains in `game.ts`.
- [ ] No fresh dev-tools screenshot captured this pass (prior session's fix predates this verification); functionally confirmed via source read, not a new live playtest.

**Status note (2026-07-13):** This was already fixed in an earlier session but this table was never updated, which caused a later planning prompt to re-flag it as an open bug. Verified fixed by reading the guarded code path in `game.ts`.

---

### UI-002: Equipment Dashboard Highlight & Swap Effects
**Issue Description:** Currently, equipped items in the header/footer HUD (`HudSnapshot`) lack visual prominence. When players swap weapons or armor, the transition occurs silently without visual or audio feedback, making it unclear whether an equipment change succeeded.

**Step-by-Step Improvement Recommendations:**
1. **HUD Active Styling:** Update `app/globals.css` to add a distinct animated glow border (`box-shadow: 0 0 8px var(--retro-gold)`) and scaled typography for active equipment chips in `.game-header` and `.game-footer`.
2. **Runtime Visual Feedback:** In `lib/game/game.ts`, when `equipItem()` is invoked, spawn a temporary 300ms particle burst around the hero sprite and trigger a quick white/gold sprite tint shader or overlay.
3. **Audio Wiring:** Call `audioManager.play('equip_sword')` or `audioManager.play('equip_armor')` during the swap event. Ensure sound fallbacks are robustly defined in `audioManager.ts`.

**Completion Checklist:**
- [ ] Added active-state CSS classes and animations for equipped HUD elements.
- [ ] Wired particle emitters and sprite flash effects to weapon/armor swap methods in `game.ts`.
- [ ] Connected equipment audio cues in `lib/game/audioManager.ts`.
- [ ] Captured browser screenshots demonstrating the highlighted equipment state and swap animation.
- [ ] Verified zero TypeScript compiler errors (`npx tsc --noEmit`).

---

### BUG-003: Unreachable Platform Generation & Dead-Ends
**Issue Description:** Initial rooms and procedurally generated platform layouts (from `/python-service/generate-level` or ASCII maps in `lib/game/world.ts`) sometimes generate platforms exceeding the player's maximum jump height parameter (`maxJumpHeight`), trapping the PC in dead-ends or making progression impossible.

**Step-by-Step Improvement Recommendations:**
1. **Jump Physics Auditing:** Calculate the exact parabolic jump reach of the PC based on gravity and initial jump velocity in `game.ts`. Document this constant (e.g., max vertical tile reach = 3.5 tiles; max horizontal gap = 4 tiles).
2. **Validator Integration:** In `lib/game/levelLoader.ts` (and the Python level generator algorithm), integrate a reachability validation step using a flood-fill or A* pathfinding check from the room entrance to all exits and key platforms.
3. **Auto-Correction / Fallback:** If a layout fails validation, automatically inject an intermediate jump platform or reject the seed and roll a new layout before rendering.

**Completion Checklist:**
- [x] Jump metrics standardized in `lib/game/jump-physics.ts` (`GRAVITY`, `JUMP_BASE_VELOCITY`, etc.), consumed by `levelLoader.ts`'s `BASE_PROFILE`/`UPGRADED_PROFILE`.
- [x] Reachability validator implemented in `lib/game/levelLoader.ts` (`// reachability validation (BUG-003)`, `floodReachable()`, `validateReachability()`) — BFS flood-fill from each room's entry points, run separately for base and fully-upgraded ability profiles.
- [x] Re-verified 2026-07-13 via a live `loadWorld()` probe (vitest): **0 dead-ends across all 24 rooms**, 26 items correctly reported as intentionally ability-gated. Console output: `"[world] Reachability audit: no dead-ends. 26 item(s) are intentionally ability-gated."` / `"[world] Loaded 24 rooms, all exits validated."`
- [x] `loadWorld()` throws on structural room errors (missing start room, wrong spawn count) and warns (does not crash) on any genuine dead-end, so a bad layout can't silently ship — no separate "client freeze" fallback path was needed since static rooms are audited at build/load time rather than proc-gen at runtime.
- [ ] Python level-generator-side validation not present (static ASCII rooms only; no live proc-gen path exists yet to validate).

**Status note (2026-07-13):** Already fixed in an earlier session; table was stale. Verified fixed by running the real audit, not just reading code.

---

### UX-004: Player Respawn & Self-Destruct Mechanism
**Issue Description:** When players become trapped in soft-locks or dead-end geometry, the only recourse is a hard browser refresh, which wipes out all session progress, collected loot, and memory state.

**Step-by-Step Improvement Recommendations:**
1. **Input Binding:** In `lib/game/input.ts`, register a secondary action keybind (e.g., Hold `R` for 2 seconds, or access via the Escape menu) mapped to `action: 'respawn'`.
2. **Penalty & Relocation Math:** In `lib/game/game.ts`, create a `handleRespawn()` method that deducts 10% of current coins or 1 HP (never reducing below 1 HP to prevent cheap game-overs), resets velocity to zero, and teleports the PC to the current room's designated safe entrance spawn point.
3. **Visual & Audio Cues:** Play a teleport/warp SFX (`magic.mp3`) and execute a fade-to-black screen transition during the relocation to make it feel like an intentional game mechanic rather than a debug hack.

**Completion Checklist:**
- [x] Hold-to-respawn input implemented — `input.held.respawn`, `RESPAWN_HOLD_SECONDS = 1.2`, exposed to the HUD as `respawnHoldPct` for a hold-progress indicator (`lib/game/game.ts` ~line 299-852).
- [x] `handleSelfDestruct()` implemented in `game.ts` (~line 1742), explicitly labeled `// UX-004: soft-lock recovery`.
- [ ] Screen-fade/SFX polish not independently re-verified this pass — mechanic itself confirmed present and wired, cosmetic treatment not re-audited.
- [ ] Not re-tested live in-browser this pass (source-level verification only).

**Status note (2026-07-13):** Already implemented in an earlier session; table was stale. Verified fixed by reading the guarded, explicitly-labeled code path in `game.ts`.

---

### AST-005: Underutilized Sprite & Audio Assets
**Issue Description:** A significant portion of downloaded sprites and sound effects present in `assets/manifest.csv` and `assets/wired-assets.txt` are ignored by the runtime engine, leading to repetitive visual presentation and monotonous audio.

**Step-by-Step Improvement Recommendations:**
1. **Manifest Audit:** Review `assets/wired-assets.txt` and compare against `assets/sounds/bulk/` and `assets/img/bulk/`. Identify unused enemy variants, environmental decorations, and combat SFX (e.g., distinct critical hit sounds, footstep loops, enemy death groans).
2. **Pipeline Expansion:** Update `scripts/prepare-assets.py` to process, slice, and export these latent assets into `public/sprites/` and `public/audio/`, automatically appending metadata to `spritemeta.json`.
3. **Runtime Wiring:** In `lib/game/audioManager.ts`, map new sound events (`crit_hit`, `enemy_death`, `chest_open`). In `game.ts`, assign diverse sprites to enemy subclasses and environmental tiles.

**Completion Checklist:**
- [ ] Updated `assets/wired-assets.txt` with at least 10 previously unused sprite and audio files.
- [ ] Executed `python scripts/prepare-assets.py` successfully and verified new files in `/public`.
- [ ] Wired new sound events into `audioManager.ts` and confirmed in-game playback.
- [ ] Assigned new sprite sheets to game entities without breaking animation state machines.
- [ ] Ran `python scripts/project-status.py` to verify asset hash consistency.

**Note (2026-07-14):** The player-character sprite specifically was swapped from `hero_0.png` to the swm kit's `char-sheet-alpha.png` (+ 8 palette variants) under ADR-020 — a real utilization win, but scoped separately from this item and not a substitute for it. The sprite/visual half of AST-005's original scope (unused enemy-sheet variants, per-zone tile/decor) is now further broken out into the concrete Tier-2 items below (AST-014 through AST-020).

---

### UX-006: Treasure & Coin Micro-Interactions
**Issue Description:** Coin and loot pickups currently lack satisfying tactile feedback. Collectibles vanish instantly upon contact without animation, particle effects, or audio variety, diminishing the reward sensation of looting.

**Step-by-Step Improvement Recommendations:**
1. **Sprite Diversity:** Wire multiple coin/gem denominations (bronze coin, silver coin, gold bar, ruby) from asset packs via `prepare-assets.py`, each with distinct value multipliers and looping shimmer animations.
2. **Visual Micro-Interactions:** When collected, trigger a floating text entity (`+10 COINS`) that drifts upward and fades out over 600ms, accompanied by a 4-particle sparkle burst rendered on the canvas.
3. **Audio Pitch Scaling:** In `audioManager.ts`, implement pitch chaining: when multiple coins are collected within a 1.5-second window, incrementally scale the playback rate of `coin.mp3` from `1.0x` up to `1.5x` for a combo effect.

**Completion Checklist:**
- [ ] Configured multi-frame shimmer animations for treasure items in `spritemeta.json`.
- [ ] Implemented floating value popups and sparkle particle emitters in `lib/game/game.ts`.
- [ ] Added audio pitch-scaling logic for rapid consecutive pickups in `audioManager.ts`.
- [ ] Captured video/gif or frame screenshots of the collection micro-interaction.
- [ ] Verified build stability with `npx tsc --noEmit`.

---

### UI-007: Dashboard Mini-Map Integration
**Issue Description:** Navigating a 24-room Metroidvania world across 5 zones without a map leads to disorientation. Players cannot track which rooms they have cleared, where unexplored exits lie, or where checkpoints are located.

**Step-by-Step Improvement Recommendations:**
1. **Map State Tracking:** In `lib/game/world.ts`, maintain a `visitedRooms: Set<string>` and `clearedRooms: Set<string>` state property updated whenever the player enters or clears an area.
2. **Mini-Map Rendering:** In `components/GameCanvas.tsx` (or as a dedicated HUD canvas overlay driven by `game.ts` snapshot data), render a 5x5 grid representing the zone layout.
3. **Visual Hierarchy:** Style visited rooms as slate blue squares, the active room with a pulsing gold outline, unexplored connecting rooms as dim outlines, and boss/shop rooms with specific icons. Keep this integrated into `.game-header` or as a top-right canvas HUD overlay.

**Completion Checklist:**
- [ ] Added room discovery and clearing tracking to world state.
- [ ] Built mini-map rendering logic cleanly integrated into the existing HUD structure (no parallel systems).
- [ ] Verified correct spatial mapping of exits and current player coordinates on the mini-map.
- [ ] Tested responsiveness across small and large viewport simulations.
- [ ] Confirmed zero type or linting errors via command line.

---

### UI-008: Fullscreen Unobtrusive Help Modal
**Issue Description:** When players toggle Fullscreen mode, surrounding browser HTML instructions and control hints vanish. Players are left without reference for keybindings, game objectives, or system options.

**Step-by-Step Improvement Recommendations:**
1. **Persistent HUD Trigger:** Render a semi-transparent, unobtrusive `?` icon button in the top-right corner of the active game stage (`opacity: 0.6`, hovering to `1.0`).
2. **Keybinding & Toggle:** In `lib/game/input.ts`, bind the `F1` key, `?` key, and gamepad `Start/Options` button to toggle a modal state (`isHelpModalOpen = !isHelpModalOpen`). When open, pause the main game loop (`GameLoop.pause()`).
3. **Modal UI Construction:** Create a clean, retro-styled overlay inside `components/GameCanvas.tsx` displaying:
   - Keyboard & Gamepad control mappings.
   - Current zone objectives and hints.
   - Volume sliders and Return to Menu options.

**Completion Checklist:**
- [ ] Integrated persistent `?` trigger icon into the game viewport overlay.
- [ ] Wired key/button listeners for toggling the help modal and pausing runtime execution.
- [ ] Styled the modal overlay to match SNES/retro aesthetic guidelines in `globals.css`.
- [ ] Tested modal functionality in both standard windowed and fullscreen modes.
- [ ] Verified git tree cleanliness and ran `npx tsc --noEmit`.

---

### SYS-009: XP Counter & Inventory/Stats Modal
**Issue Description:** Defeating enemies lacks long-term character progression, and players have no centralized interface to review accumulated loot affixes, overall stat bonuses (Damage, Defense, Crit Chance, Lifesteal), or stored inventory items.

**Step-by-Step Improvement Recommendations:**
1. **Experience & Leveling Math:** In `lib/game/game.ts`, define an XP curve (`requiredXP = level * 100 * 1.5`). Upon enemy defeat, award XP. On level-up, trigger a visual fanfare, fully restore HP, and increment base stats.
2. **HUD XP Bar:** Add a thin, animated gold/blue progress bar directly below the HP bar in the header HUD snapshot.
3. **Inventory Modal Screen:** Bind `I` or `Tab` to open an Inventory/Stats modal. Read the active player inventory array and render a grid of equipped/stored gear, detailed stat breakdowns, and item lore descriptions retrieved from the Python `/api/loot` metadata.

**Completion Checklist:**
- [ ] Implemented XP calculation, leveling progression, and stat scaling in `game.ts`.
- [ ] Added responsive XP progress bar to the runtime header HUD.
- [ ] Created modal inventory screen displaying live player stats and loot details.
- [ ] Verified that equipping items from the inventory correctly recalculates combat stats.
- [ ] Executed full build validation (`npm run dev` and `npx tsc --noEmit`).

---

### AST-010: Ingestion of `./downloads` Archive Assets
**Issue Description:** The `./downloads` directory contains a massive repository of raw zip archives (sprites, tilesets, SFX packs) that remain unintegrated into the active runtime, representing wasted UI/UX and gameplay potential.

**Step-by-Step Improvement Recommendations:**
1. **Archive Cataloging:** List and inspect contents of `./downloads/*.zip`. Categorize assets into UI frames, background layers, character animations, and sound effects.
2. **Automated Extraction in Pipeline:** Extend `scripts/prepare-assets.py` with an extraction module using Python's `zipfile` and `PIL` (Pillow). Configure it to unzip select targets, apply chroma-key transparency correction where needed, normalize file names, and copy them directly into `public/sprites/` and `public/audio/`.
3. **Manifest Update:** Record every ingested asset from `./downloads` into `assets/manifest.csv` with appropriate attribution metadata to maintain strict compliance with `docs/CREDITS.md`.

**Completion Checklist:**
- [ ] Audited `./downloads` archives and mapped target assets to gameplay features.
- [ ] Extended `scripts/prepare-assets.py` to handle automated archive extraction and formatting.
- [ ] Regenerated runtime assets and verified zero missing texture/audio references in console.
- [ ] Updated `docs/CREDITS.md` with source links and licensing info for all newly ingested files.
- [ ] Ran `python scripts/project-status.py` to confirm clean ingestion state.

---

### SYS-011: Persistent Checkpoints & Save States
**Issue Description:** The game currently operates as a permadeath session; refreshing the page or closing the browser resets all Metroidvania progression, cleared rooms, inventory, and character levels back to zero.

**Step-by-Step Improvement Recommendations:**
1. **State Serialization:** In `lib/game/game.ts`, implement `serializeState()` and `deserializeState()` methods that export/import a JSON object containing: `playerLevel`, `currentHP`, `maxHP`, `coins`, `inventory`, `equippedGear`, `currentRoomId`, and `visitedRooms`.
2. **Checkpoint Entity:** Design a Shrine/Checkpoint object placed in specific safe rooms in `lib/game/world.ts`. When the player interacts with it (`Up` arrow or `Action`), play a healing visual effect, save the serialized JSON string to `localStorage.getItem('next_chapter_save_v1')`, and display a "GAME SAVED" notification.
3. **Start Menu Integration:** In `components/StartMenu.tsx`, check `localStorage` on mount. If a valid save exists, render a "Continue Game (Room X - Level Y)" button alongside "Start New Game".

**Completion Checklist:**
- [ ] Created robust JSON serialization and deserialization methods for full game state.
- [ ] Added interactive Checkpoint Shrine entities to world maps with visual save feedback.
- [ ] Wired `localStorage` read/write capabilities safely handling browser privacy exceptions.
- [ ] Added "Continue Game" functionality to the Start Menu component.
- [ ] Verified loading a save accurately restores position, stats, and map exploration.

---

### SYS-012: NPC Item Shop & Coin Economy Sink
**Issue Description:** Collected coins currently serve as an arbitrary high-score metric without an economy sink or gameplay utility, reducing player incentive to hunt for treasure or defeat optional enemies.

**Step-by-Step Improvement Recommendations:**
1. **Shopkeeper NPC Entity:** Implement a friendly NPC entity (`Shopkeeper`) positioned in Room 1 (Hub Zone). Add an idle animation state and an interaction prompt (`Press UP to trade`).
2. **Shop Interface Modal:** When triggered, pause the game loop and render an interactive Shop Modal. List purchasable items:
   - Health Potion (+50% HP) — 50 Coins
   - Permanent Stat Booster (+2 ATK / +5 MAX HP) — 200 Coins
   - Mystery Weapon Box (Triggers Python `/api/loot` call with forced Rare/Epic rarity) — 300 Coins
3. **Transaction Logic:** Ensure purchase methods validate coin balances, deduct costs, instantly apply consumables or add equipment to the inventory, and play a satisfying cash-register/coin-clink SFX.

**Completion Checklist:**
- [ ] Spawns Shopkeeper NPC in designated hub rooms with interaction triggers.
- [ ] Built responsive Shop Modal UI integrated with player inventory and coin balance.
- [ ] Wired Mystery Box purchases directly to the backend Python `/api/loot` service.
- [ ] Tested transaction edge cases (insufficient funds, full inventory, rapid double-clicking).
- [ ] Performed full verification suite (`npx tsc --noEmit`, `npm run dev`, `project-status.py`).

---

### AST-013: Suspect-Thumbnail Triage & Scraper Hardening
**Issue Description:** `project-status.py` flagged 24 images across `assets/img/bulk/` and `assets/sprites/` as `SUSPECT: small image, may be a thumbnail` using a pure byte-size heuristic (`< 20KB`). That heuristic has a high false-positive rate — indexed-palette and low-complexity pixel art compresses extremely well (e.g. `base_character.png` is a genuine 1024×1024 asset at only 17.4KB), so most of the 24 flagged files are real assets, not thumbnails.

**Investigation performed (2026-07-08, remote session — no network access to opengameart.org in this environment; confirmed via the proxy status showing `connect_rejected` 403 for that host):**
1. Read actual pixel dimensions for every flagged file (pure-stdlib PNG/GIF/JPEG header parsing — no dependency needed).
2. Cross-referenced `assets/manifest.csv` / `assets/manifest_bulk.csv` `note` columns (which record the exact upstream URL each file was fetched from) for filenames ending in `preview.<ext>` / `prev.<ext>` — direct proof of a mis-fetched thumbnail, not a guess.
3. Result: only **9 of 24** flagged files have real evidence of being thumbnails:
   - **CONFIRMED** (manifest proves the source URL was itself a preview image — re-fetch the *real* attachment from the page, not this URL):
     - `assets/img/bulk/lpc_beetle.PNG` ← fetched from `.../beetlepreview.PNG`
     - `assets/img/bulk/lpc_goblin.png` ← fetched from `.../lpc_goblin_preview.png`
     - `assets/img/bulk/lpc_golem.png` ← fetched from `.../golem-preview.png`
     - `assets/img/bulk/monkey_lad_in_magical_planet.png` ← fetched from `.../monkeylad_preview.png`
     - `assets/img/bulk/rpg_enemies_11_dragons.png` ← fetched from `.../dragonsprev.png`
   - **LIKELY** (classic Drupal auto-thumbnail square dimensions — 64×64/100×100/128×128 — for an asset that should be a multi-frame sheet):
     - `assets/img/bulk/bat_sprite.png` (128×128), `assets/img/bulk/bloody_mary.png` (128×128), `assets/img/bulk/lpc_wolf_animation.png` (64×64 — too small to contain the claimed animation), `assets/img/bulk/simple_character_base_16x16.png` (64×64)
   - The remaining ~15 (e.g. `palette.png`, `oga-swm-bg-gradient-sky.png`, `swords.png`, `base_character.png`) are almost certainly fine — small file size only, with plausible real dimensions and/or indexed-palette compression explaining it.
4. Root-caused the scraper bug: `find_oga_download_link()` in both `scripts/asset-fetch.py` and `scripts/asset-fetch-bulk.py` filtered out Drupal's `/styles/.../` derivative-thumbnail paths, but some OGA submissions attach a small `preview.png`/`prev.png` companion image directly under `/sites/default/files/` (no `/styles/` in the path at all) — the filter never caught that case.

**Fixes applied this session:**
- `scripts/project-status.py`: replaced the flat SUSPECT flag with a three-tier, evidence-based triage (`CONFIRMED` / `LIKELY` / "worth a manual look") using real image dimensions + manifest cross-reference, plus a summary count. Zero new dependencies (stdlib-only PNG/GIF/JPEG header parser).
- `scripts/asset-fetch.py` and `scripts/asset-fetch-bulk.py`: `find_oga_download_link()` now deprioritizes any candidate URL matching `prev(iew)?\.<ext>` in favor of other same-page candidates, and downloads matching that pattern are tagged `downloaded-preview-only` (definitive) instead of the old ambiguous `downloaded-unverified` (size guess).

**Still required (needs a machine with real network access — this sandboxed session cannot reach opengameart.org):**
- [ ] Re-fetch the 5 CONFIRMED files from their OGA pages directly (manual download of the actual attachment, not the preview link).
- [ ] Manually verify the 4 LIKELY files in a browser and re-fetch if they are indeed thumbnails.
- [ ] Re-run `python scripts/prepare-assets.py` after any replacement, then `npx tsc --noEmit` and `npm run dev`.
- [ ] Re-run `python scripts/project-status.py` and confirm the CONFIRMED/LIKELY counts drop to 0.

---

## Tier 2 — swm Asset-Utilization Backlog

Sourced from the 2026-07-14 "Steam-Indie Program" asset audit and `docs/SPRITE_ART_INVENTORY.md`'s integration-priority list, turned into concrete checklists per the "Hero Integration Mission" prompt's M3. **None of these 7 items were consumed by the 2026-07-14 hero-integration session (ADR-020)** — that session integrated only `char-sheet-alpha.png` (the player character) and its 8 palette variants; the powerups/impacts/tiles/backgrounds/bosses/purge-list items below remain fully open. Each item lists its goal, the files involved, an effort note, and what verification evidence closing it requires — matching this doc's existing checklist convention.

### AST-014: Powerups Sheet → Rarity-Tiered Pickup Art
**Goal:** Bind `assets/sprites/powerups-sheet-alpha.png` (640×544, `RGBA`, page-verified CC-BY 4.0 per `docs/CREDITS.md`) to the loot system so pickups render as real sprite art instead of flat colored rects.

**Files involved:** `scripts/prepare-assets.py` (new pipeline block, grid-derive the sheet the same way ADR-020 did for the hero — do not assume a cell size, measure it), `public/sprites/spritemeta.json`, `lib/game/game.ts` (wherever loot/pickup entities currently render), `lib/game/items.ts`.

**Effort note:** `Prep` — sheet is `Ready` per the inventory doc, but its grid still needs independent verification (ADR-020's whole finding was that "looks like a regular grid" claims from this same audit round were wrong twice already for other sheets).

**Verification evidence required to close:** grid derivation method + labeled overlay (same discipline as ADR-020's Step 4.1), `npm test` clean, live screenshot showing at least 2 distinct pickup icons rendering in-game, `docs/CREDITS.md` row confirming this file's usage is now "wired" not "not yet wired".

---

### AST-015: Impacts/Weaponflash 5-Color Tiers → Rarity FX
**Goal:** Map the 5-color-tier `impacts-sheet-colour-{1..5}-alpha.png` and `weaponflash-sheet-colour-{1..5}-alpha.png` families onto the game's existing 4-tier `Rarity` scale (`common/uncommon/rare/epic` — see `Game.RARITY_SOUND` in `game.ts` for the existing rarity-tier pattern to mirror) for hit and pickup visual feedback.

**Files involved:** `scripts/prepare-assets.py`, `public/sprites/spritemeta.json`, `lib/game/game.ts` (`applyLoot()`, `damageEnemy()` — the same call sites ADR-016 wired rarity-tiered *audio* into; this is the visual half of that same idea).

**Effort note:** `Ready` per the inventory doc — 5 color tiers map cleanly onto the 4-tier rarity scale (one tier can double up, e.g. tier-5 reused for both epic and a future "legendary").

**Verification evidence required to close:** spritemeta clip validity test (mirror `hero-spritemeta.test.ts`'s pattern), live screenshot comparing a common-rarity hit/pickup against an epic-rarity one showing visibly different FX color.

---

### AST-016: One Coherent swm Biome (Tiles + Backgrounds + Enemies)
**Goal:** Build one full room/zone using only swm-family art (`oga-swm-tiles-alpha.png`, a swm background, `enemies-sheet-alpha.png`) so the kit's visual coherence (noted in `docs/SPRITE_ART_INVENTORY.md`'s headline finding) actually pays off in-game instead of staying scattered across unused files.

**Files involved:** `lib/game/world.ts` (new room definitions), `scripts/prepare-assets.py`, `public/sprites/spritemeta.json`, `lib/game/levelLoader.ts` (new rooms must pass the existing BUG-003 reachability audit — see that item's completion checklist above for the live-probe method).

**Effort note:** `High` — this is the largest Tier-2 item; it's a full room-authoring pass, not just a pipeline wire-up. `enemies-sheet-alpha.png`'s own grid needs independent derivation (15+ enemies per the inventory doc; do not assume uniform cell size across all of them without checking).

**Verification evidence required to close:** BUG-003's reachability probe passing for every new room (0 dead-ends), live screenshot of the new biome, `npm test`/`npm run build` clean.

---

### AST-017: Tile-Variation Pools for Seeded Rooms
**Goal:** Register `oga-swm-earth-tile-variations-alpha.png`, `truchet.png`, and `minimalist_pixel_tileset.png` as seed-driven variant pools so procedural/seeded room decoration (ADR-017's daily-seed mode) has real visual variety to draw from instead of a single fixed tileset.

**Files involved:** `scripts/prepare-assets.py`, `lib/game/rng.ts` (an existing forked stream, e.g. `vfxRng`, is the natural place to draw tile-variant picks from — deterministic per seed, matching ADR-017's design), `lib/game/world.ts` or wherever room decoration currently happens.

**Effort note:** `Ready`/`High` procgen value per the inventory doc — these were specifically called out as "literal procgen decor source" material.

**Verification evidence required to close:** two different seeds producing visibly different tile variants in the same room shape, `npm test` covering the pool-selection logic as a pure function (mirror `rng.test.ts`'s determinism-testing pattern).

---

### AST-018: forest/mesa/depths Backdrops for Zone Variety
**Goal:** Wire `forest.png`, `mesa.png`, and `depths_of_terra.png` (all `1024x768`, measured in `docs/SPRITE_ART_INVENTORY.md`) as additional zone backgrounds so different zones read as visually distinct instead of sharing one background family.

**Files involved:** `scripts/prepare-assets.py` (`forest.png`/`mesa.png` are palette-mode `P` — check whether they need the same chroma-key treatment the demon-flower sheet needed, per `gif_frames()`'s `apply_chroma_key()` in `prepare-assets.py`, or whether they're already fully opaque backgrounds that don't need keying at all), `lib/game/world.ts` (per-zone background assignment).

**Effort note:** `Prep` — needs a quick opacity/mode check per file before wiring (same discipline as ADR-020's `RuntimeError` guards on unexpected sheet geometry).

**Verification evidence required to close:** live screenshot showing at least 2 zones with visually distinct backdrops, `npm run build` clean.

---

### AST-019: Darksaber + Wyrmwolf Boss Integration
**Goal:** Give the Dark Saber Werewolf pack and `wyrmwolf.png` real, distinct boss encounters (beyond the existing single cropped `wyrmwolf` mid-boss pose) matching `docs/SPRITE_ART_INVENTORY.md`'s "showpiece boss" recommendation.

**Files involved:** `scripts/prepare-assets.py`, `lib/bossManager.ts` (already supports multi-phase boss AI per the project's original scaffold — reuse, don't rebuild), `lib/game/world.ts`.

**Effort note:** `Prep` pending extract — **blocked** by the pre-existing, logged bug: `assets/img/beast_boss_darksaber.zip` is missing from both the live `assets/` tree and the untracked `assets.zip` backup (see SESSION_LOG 2026-07-14, T1.1 precondition check entry). This item cannot proceed until that source file is recovered from somewhere (original download, a teammate's machine, or re-sourced from OpenGameArt) — do not attempt to fabricate a substitute.

**Verification evidence required to close:** confirm the source zip is present on disk before starting (`ls assets/img/beast_boss_darksaber.zip`), then the usual gate + live boss-encounter screenshot.

---

### AST-020: Purge List Execution (Thumbnails / Wrong-Projection / Wrong-Era Assets)
**Goal:** Move known-bad assets out of pipeline reach so procgen or a future asset-utilization pass never rolls them: the currently-**wired** `bat_sprite.png` (probable thumbnail per `docs/SPRITE_ART_INVENTORY.md` and AST-013's triage), `rpg_village_isometric.png` (wrong projection for a side-scroller), `vintagebuggy.png`/`vintagehippievan.png`/`motorcycle.png` (wrong era/universe), and `2d_sprite_skins_walking_animation.jpg` (JPEG, no alpha, unsuitable as a runtime sprite source).

**Files involved:** `assets/` (move, don't delete — mirrors ADR-019's documentation-archival policy: move flagged files to an `assets/_excluded/` or similar holding area with a note, rather than deleting), `scripts/prepare-assets.py` (the `bat_sprite.png` wiring specifically needs a *replacement* source, not just removal, since the bat enemy is live and currently uses this file).

**Effort note:** `Low` effort to move the never-wired files; the `bat_sprite.png` replacement is the one item here with real gameplay risk (removing it without a replacement breaks the bat enemy).

**Verification evidence required to close:** **do not delete anything without explicit user approval** (per this project's standing git-safety discipline — these are irreversible-if-wrong operations on asset files, not code). Confirm via `git status`/`ls` that flagged files were moved (not deleted) and that `bat_sprite.png`'s replacement (if done in the same pass) still renders the bat enemy correctly in a live screenshot.

---

## Verification & Final Sign-Off Protocol

Before marking any task as complete in the dashboard above, the engineer or AI agent MUST execute the following terminal commands and attach actual output evidence to the project session logs:

1. **Type & Syntax Check:**
   ```bash
   npx tsc --noEmit