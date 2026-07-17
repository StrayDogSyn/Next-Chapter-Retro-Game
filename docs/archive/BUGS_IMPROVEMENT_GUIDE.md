# Bugs & QA Findings — Living Improvement Roadmap

> **Purpose:** This document tracks usability issues, gameplay bugs, and feature enhancements identified during human playtesting and QA audits. Each item provides root-cause analysis, actionable step-by-step remediation aligned with the project architecture, and a strict verification checklist.
>
> **Last updated:** 2026-07-15 (RetroVania start-screen sizing/title/watermark repair + documentation truth sync)
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
| [AST-005](#ast-005-underutilized-sprite--audio-assets) | Asset Pipeline | Game engine only utilizes a small fraction of available sprites and SFX | Medium | 🟡 Partial — audio pass done 2026-07-13 (ADR-016); hero sprite swap done 2026-07-14 (ADR-020); remaining sprite/visual items broken out into AST-014..AST-020 |
| [UX-006](#ux-006-treasure--coin-micro-interactions) | Visuals / Polish | Coins and treasure lack premium micro-interactions and sprite variety | Medium | 🔴 Untracked |
| [UI-007](#ui-007-dashboard-mini-map-integration) | UI / Navigation | Lack of spatial orientation; mini-map needed in the dashboard | High | ✅ Fixed — minimap rendered in `GameHeader`/`GameHudOverlay` |
| [UI-008](#ui-008-fullscreen-unobtrusive-help-modal) | UI / Accessibility | Fullscreen hides instructions; persistent unobtrusive `?` modal needed | Medium | ✅ Fixed — in-canvas help overlay + controls footer; persistent `?` icon not wired |
| [SYS-009](#sys-009-xp-counter--inventorystats-modal) | Progression / UI | Missing XP counter from defeats and centralized inventory/stats modal | High | ✅ Fixed — XP bar in `GameHeader`; stats/gear in `GameMenuModal` |
| [AST-010](#ast-010-ingestion-of-downloads-archive-assets) | Asset Pipeline | Unprocessed asset archives in `./downloads` need pipeline integration | High | 🔴 Untracked |
| [SYS-011](#sys-011-persistent-checkpoints--save-states) | Persistence | No checkpoint system or persistent save data across sessions | High | ✅ Fixed — shrines + `localStorage` + server mirroring (ADR-010) |
| [SYS-012](#sys-012-npc-item-shop--coin-economy-sink) | Gameplay / Economy | Coins lack an economy sink; NPC shop needed for replay value | Medium | ✅ Fixed — shop NPC exists in hub with mystery-box + consumables |
| [AST-013](#ast-013-suspect-thumbnail-triage--scraper-hardening) | Asset Pipeline | `project-status.py`'s size-only heuristic flagged 24 assets as suspect; most were false positives | Medium | 🟡 Triage + scraper fix done, re-fetch pending |
| [AST-014](#ast-014-powerups-sheet--rarity-tiered-pickup-art) | Asset Pipeline | swm `powerups-sheet-alpha.png` isn't bound to loot tables; pickups still render as flat colored rects | Medium | ✅ Fixed (2026-07-14) |
| [AST-015](#ast-015-impactsweaponflash-5-color-tiers--rarity-fx) | Asset Pipeline | swm `impacts-*`/`weaponflash-*` 5-color-tier FX sheets are unused; hit/pickup feedback has no rarity-tinted juice | Medium | 🟡 Partial (2026-07-14) — impacts wired, weaponflash deferred |
| [AST-016](#ast-016-one-coherent-swm-biome-tiles--backgrounds--enemies) | Level Gen / Asset Pipeline | swm tiles, backgrounds, and `enemies-sheet-alpha.png` are unused; no single biome uses the coherent swm art language yet | High | 🔴 Untracked |
| [AST-017](#ast-017-tile-variation-pools-for-seeded-rooms) | Level Gen / Asset Pipeline | Tile-variation sets, `truchet.png`, and `minimalist_pixel_tileset.png` aren't registered as seed-driven variant pools | Medium | 🔴 Untracked |
| [AST-018](#ast-018-forestmesadepths-backdrops-for-zone-variety) | Asset Pipeline | `forest.png`/`mesa.png`/`depths_of_terra.png` backdrops are unused; every zone currently shares one background family | Medium | 🔴 Untracked |
| [AST-019](#ast-019-darksaber--wyrmwolf-boss-integration) | Bosses / Asset Pipeline | Darksaber werewolf pack and `wyrmwolf.png` aren't wired as distinct boss encounters beyond the existing single mid-boss crop | Medium | 🔴 Untracked |
| [AST-020](#ast-020-purge-list-execution-thumbnails--wrong-projection--wrong-era-assets) | Asset Pipeline | 5 known thumbnail/wrong-projection/wrong-era assets (incl. the currently-wired `bat_sprite.png`) should be moved out of pipeline reach, not left where procgen could roll them | Low | 🔴 Untracked |
| [DOC-021](#doc-021-stale-docsstatustxt-snapshot-duplicating-root-status) | Documentation Governance | `docs/STATUS.txt` contained a stale 2026-07-08 snapshot and risked being mistaken for current status | Low | ✅ Fixed (archived + redirected 2026-07-15) |
| [DOC-022](#doc-022-prompt-library-v020-duplicate-section-drift) | Documentation Governance | v0.2.0 prompt templates existed in parallel section variants, creating duplicate active guidance and merge churn | Low | ✅ Fixed (canonicalized + archived 2026-07-15) |
| [UI-023](#ui-023-start-screen-container-title--watermark-regression) | UI / Branding | Start canvas preserved its intrinsic ratio inside flex layout; old title and crushed/missing watermark remained visible | High | 🟡 Source fixed 2026-07-15; fresh browser capture pending |
| [CR-001](#cr-findings-2026-07-14) | Code Review | Thirteen logic/resource/API/edge-case findings from main-branch review | High | 🟡 Partial — 10 of 13 verified fixed 2026-07-14 (CR-002/003/004/005/007/008/009/010/012/013); CR-001/006/011 remain open |

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
- [ ] Python level-generator-side validation not present (static ASCII rooms only; no live proc-gen path exists yet to validate). `/generate-level` in `python-service/main.py` is a genuinely dead endpoint ("original scaffold demo" per its own comment), never called by the TS client - confirmed 2026-07-14, not just assumed.
- [x] Re-verified again 2026-07-14 (Fix Pack mission, ADR-023): the four tile constants (`JUMP_RISE_TILES`, `JUMP_GAP_TILES`, `UPGRADED_JUMP_RISE_TILES`, `UPGRADED_JUMP_GAP_TILES`) were cross-checked against a frame-stepped simulation of the *actual* game-loop integration order (not just the continuous analytic formula) - all four confirmed as safe conservative floors, none needed changing. A prompt asking to "constrain procedural platform/pickup generation" was found not to apply: no such generation exists (room layout and pickup positions are both static ASCII-map data, per ADR-004/ADR-017).
- [x] 2026-07-15 (Space Marine Physical Overhaul, ADR-025): `JUMP_BASE_VELOCITY` buffed 330→355px/s and, per this mission's explicit instruction, all four envelope constants raised in step (`JUMP_RISE_TILES` 3→4, `JUMP_GAP_TILES` 6→7, `UPGRADED_JUMP_RISE_TILES` 7→8, `UPGRADED_JUMP_GAP_TILES` 11→12) to match the buffed trajectory. Re-ran the live `loadWorld()` probe before/after: **still 0 dead-ends**, ability-gated item count moved 26→24 (2 items whose rise fell in the old 3-4 tile band reclassified from double-jump-gated to base-reachable - the intended, bounded consequence of raising the floor, not a regression). Also widened `ensureExitClearance()`'s carved portal from 2 to 3 tiles to fit the same mission's enlarged player hitbox (`pw`/`ph` 14×26→18×32); a new `door-clearance.test.ts` verifies every declared exit's actual carved width across the whole loaded world.
- [x] 2026-07-15 (Space Marine Physical Overhaul round 2, ADR-026): hitbox raised again to 24×44, `JUMP_BASE_VELOCITY` to 380px/s (`UPGRADED_JUMP_RISE_TILES`/`UPGRADED_JUMP_GAP_TILES` to 9/13; base-tier constants stayed valid at 4/7), `ensureExitClearance()` carve to 4 tiles. This round also hand-edited the `world.ts` ASCII maps directly (5 rooms: `R03`, `R04`, `R07`, `R16`, `R18`) to fix genuine interior choke points a headroom audit found, rather than relying on the exit-carve alone. A concurrently-edited, more ambitious "fully dynamic" velocity-derivation approach (scanning real level geometry for the worst-case platform step) was tried, found to derive an unsafe 13-tile jump requirement from room `R22` (the heuristic doesn't know about room entry points or multi-hop paths), and reverted in favor of the hand-verified constant - see ADR-026 for the full incident writeup, including a real `SIM_DT`-declared-after-use crash that was fixed regardless of the revert. Re-ran `loadWorld()` again post-revert: still 0 dead-ends.
- [x] 2026-07-15 (Space Marine Physical Overhaul round 3, ADR-027): direct user feedback ("about 1.5x higher") applied precisely - `JUMP_BASE_VELOCITY` 380→465px/s, simulated base apex 4.82→7.27 tiles (1.51x). `JUMP_RISE_TILES`/`JUMP_GAP_TILES` 4/7→7/9, `UPGRADED_JUMP_RISE_TILES`/`UPGRADED_JUMP_GAP_TILES` 9/13→14/16. Re-ran `loadWorld()`: still 0 dead-ends, but ability-gated item count went **24→0** - at this jump strength the base envelope alone reaches everything double-jump/dash used to gate. Reported to the user as a significant, deliberate consequence rather than applied silently (see ADR-027). A second claim ("platforms have no collision detection") was checked against `Game.moveBody()`'s actual one-way-platform logic, found correctly implemented (live-tested in-browser with zero errors and a visibly much higher jump); most likely explanation is the same root cause as the height complaint, not a separate collision bug.

- [x] 2026-07-15 (Ability-gating restoration, ADR-028): user asked to restore the 24→0 gating from round 3, plus investigated a report of "apertures that did not allow passage" (confirmed: the existing `T_DOOR_KEY`/`T_DOOR_BEAST` mechanic working as intended, not a bug - `R13`'s locked-door wall gates a bonus area, not main traversal). Rather than repositioning 24 items to re-fit the new jump envelope (fragile, would break again on the next physics retune), added `T_DOOR_DOUBLEJUMP`/`T_DOOR_DASH` gate-door tiles - the same "solid until a runtime ability flag is true" pattern as the existing key/beast doors - and placed them at all 24 original locations across 12 rooms. Caught and fixed a real collision-semantics bug during implementation: a solid-until-unlocked tile is still landable from above even while locked, so the first version wouldn't have gated anything; fixed by making the tile a genuine one-way platform that only exists once the ability is owned. `loadWorld()` still reports 0 dead-ends (tile-count math cross-checked: 83 double-jump + 60 dash gate cells, matching every converted platform run). Live-verified one gate renders correctly in-browser (Playwright screenshot, zero errors).

- [x] 2026-07-15 (Seeded room-order shuffle, ADR-029): `loadWorld()` gained an optional `seed` parameter that relabels which hand-authored room's content sits at each fixed graph position (signature-matched, start room pinned), wired to a new `layout` RNG fork in `Game`'s constructor so New Run/Daily Seed/Enter Seed all get distinct-but-reproducible room orders. Connectivity/dead-end-freedom holds by construction (edges are relabeled, never rewired) - verified anyway via 8 new tests including `loadWorld(seed)` across 4 different seeds, all reporting 0 dead-ends, same as the unshuffled baseline.

**Status note (2026-07-13, reconfirmed 2026-07-14, envelope re-tuned 2026-07-15 x3, gating restored 2026-07-15, room order seeded 2026-07-15):** Already fixed in an earlier session; table was stale. Verified fixed by running the real audit, not just reading code. Simulation cross-check (2026-07-14) found the envelope constants still hold under a more rigorous check than the original analytic derivation used. The 2026-07-15 Space Marine Overhaul (three rounds, ADR-025/026/027) deliberately raised those same constants further - status stays "Fixed," the audit shows 0 dead-ends after all three rounds. Round 3 eliminated ability-gating entirely (24→0 gated items), flagged prominently to the user in ADR-027; ADR-028 restored it via explicit door tiles decoupled from jump physics, so it won't break again on the next velocity change. ADR-029 added seed-driven room-order shuffling on top of the same, still-fully-verified graph - 0 dead-ends across every seed tested.

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

**Status: ✅ Fixed (2026-07-14, Sprint B).** The full sheet is a dense multi-section icon collage (badges/chalices/gems/pill capsules at several different cell sizes, confirmed by direct visual inspection - not a single uniform grid). Rather than derive the whole collage, this pass measured and verified one clean region: content-band row scanning located two 16px-tall gem-icon rows; a labeled grid overlay at y0=342 confirmed 12 columns with zero icons crossing a cell boundary (same discriminating test as ADR-020). `scripts/prepare-assets.py` crops row 0 into `public/sprites/lootIcon.png` (192×16, 12-frame `shimmer` clip), registered in `spritemeta.json`. `lib/game/items.ts` exports `LOOT_PICKUP_SPRITE` as the single source of truth for the sheet/anim name (mirrors how `RARITIES` already lives there rather than in the renderer); `game.ts`'s `drawPickups()` "loot" case now draws this sprite plus a `RARITIES[rarity].color`-tinted ring (preserving the existing color-coding scheme rather than inventing a second one).

**Verification:** `ast014-015-spritemeta.test.ts` (mirrors `hero-spritemeta.test.ts`) - clip validity, non-degenerate frame rects, geometry checks. `npm test` 74/74, `npm run build` exit 0. Live Playwright capture confirmed the sprite renders in-game (see AST-015's combined live-verification note below - both were captured in the same screenshot pass).

---

### AST-015: Impacts/Weaponflash 5-Color Tiers → Rarity FX
**Goal:** Map the 5-color-tier `impacts-sheet-colour-{1..5}-alpha.png` and `weaponflash-sheet-colour-{1..5}-alpha.png` families onto the game's existing 4-tier `Rarity` scale (`common/uncommon/rare/epic` — see `Game.RARITY_SOUND` in `game.ts` for the existing rarity-tier pattern to mirror) for hit and pickup visual feedback.

**Status: 🟡 Partial-fixed (2026-07-14, Sprint B).** `impacts-sheet-colour-*` is wired; `weaponflash-sheet-colour-*` is deliberately **not** — see below.

- **impacts (done):** `impacts-sheet-colour-N-alpha.png` (384×960) stacks four size tiers (16/24/32/48px cells) with irregular packing in the upper three. Rather than guess those boundaries, this pass used the one unambiguous region: a full-width empty-row gap isolates y=[624,960) as a self-contained, cleanly-verified 48×48 grid, 7 columns × 7 rows (confirmed via labeled overlay, zero icons cross a boundary). `scripts/prepare-assets.py` crops this region from 4 of the 5 colour files into `impactBurst_<rarity>.png` (336×336, 7-frame `burst` clip each). **Colour-to-rarity mapping is a documented design judgment call, not a measurement** (sampled dominant edge hue per file: colour1=cyan/teal, colour2=green, colour3=orange/red, colour4=cyan-green, colour5=orange/red-darker; none exactly match `RARITIES`' hex colors, so mapped by relative "heat": common→colour1, uncommon→colour2 [already matches `RARITIES.uncommon`'s green], rare→colour4, epic→colour3 [strongest contrast against common, satisfying the mission's explicit common-vs-epic requirement]). `game.ts` gained `spawnRarityBurst()`/`updateRarityBursts()`/`drawRarityBursts()` (a separate, sprite-animated list from the existing generic dot/text `Particle` system) and now calls it from both `damageEnemy()` (using `this.weapon.rarity` - a hit's FX reflects the weapon dealing it) and `applyLoot()` (using the drop's own rarity; new optional `x`/`y` params default to player-center for shop/mystery-box purchases).
- **weaponflash (deliberately deferred, not guessed):** measured too - 49 evenly-pitched ~16px-tall bands across 2608px - but its semantic frame-grouping (likely per-angle muzzle-flash variants, unconfirmed) did not resolve with the same confidence within this pass's time budget. Not wired. Impacts alone already covers both "hit" and "pickup" moments (a burst effect reads naturally for both), so this isn't blocking - logged as asset debt for a future pass.

**Verification:** `ast014-015-spritemeta.test.ts` - all 4 `impactBurst_<rarity>` sheets confirmed identical geometry (48×48, 7-frame) and 4 genuinely distinct files (byte-length check). `npm test` 74/74, `npm run build` exit 0, `python scripts/project-status.py` exit 0. **Live verification:** a temporary debug keybind (added, screenshotted, then fully reverted - confirmed via `grep` finding zero trace afterward) spawned a common-rarity and an epic-rarity burst side-by-side in the live game canvas via Playwright; the resulting screenshot shows a cyan/teal burst (common) directly next to a fiery orange/red burst (epic), same animation shape, clearly different color - see the SESSION_LOG entry for the full capture description. Getting this live capture also surfaced and required fixing an unrelated, pre-existing bug blocking the entire start screen (see SESSION_LOG "Sprint B" entry) - a minimal one-line clamp, not part of AST-014/015's own scope but necessary to reach a live game state at all.

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

### UI-023: Start-Screen Container, Title & Watermark Regression
**Issue Description:** Human screenshot evidence showed the start canvas centered between unused top/bottom bands instead of filling its glass-panel container. The canvas still rendered the retired `BYTEFALL / SEGFAULT SUMMIT / RETRO PLATFORMER` title while browser metadata also used the old name. The StrayDog stencil was absent because its square source was drawn into a very shallow rectangular destination, making the mark effectively unreadable.

**Root Cause:** `.start-screen-canvas` remained a positioned flex item with `width: 100%; height: 100%`; as a replaced element it retained its intrinsic canvas ratio while the parent centered it. Product naming existed as independent hardcoded strings in `components/StartMenu.tsx` and `app/layout.tsx`. The `512×512` stencil source was forced into a non-square destination rectangle.

**Remediation:**
1. Give `.game-panel` and `.start-screen-wrap` explicit full-viewport/full-container sizing.
2. Remove the start canvas from flex sizing with `position: absolute; inset: 0` while retaining its existing logical `800×520` draw system and pointer-coordinate mapping.
3. Render `RetroVania | Rogue-like Platformer` as one fitted line and synchronize `app/layout.tsx` metadata.
4. Draw the stencil into a square destination beside `v0.2.0` at `0.5` alpha.
5. Synchronize README, beta guidance, workflow status, prompt notes, and ADR history.

**Completion Checklist:**
- [x] Source-level CSS sizing repair applied.
- [x] Canvas and browser metadata titles match exactly.
- [x] Public stencil asset exists and square destination geometry is restored.
- [x] Living documentation truth-synced without rewriting historical session records.
- [ ] Fresh browser screenshot confirms no unused bands, no title clipping, and a visible watermark.
- [ ] TypeScript/build verification output captured after the repair.

---

### DOC-021: stale `docs/STATUS.txt` snapshot duplicating root status
**Issue Description:** `docs/STATUS.txt` was a point-in-time 2026-07-08 dump from a previous environment. Its location made it look canonical even though the current, machine-generated status authority is repo-root `STATUS.txt`.

**Step-by-Step Improvement Recommendations:**
1. Move the stale dump into `docs/archive/historical/legacy-imports/` with a date-stamped filename.
2. Replace `docs/STATUS.txt` with a redirect stub explaining where the archive copy lives and where current snapshots belong.
3. Update `docs/archive/historical/README.md` so the archive index remains accurate.
4. Record the policy in ADRs so future sessions do not reintroduce duplicate status authorities.

**Completion Checklist:**
- [x] Archived at `docs/archive/historical/legacy-imports/docs-status-snapshot-2026-07-08.txt`.
- [x] Replaced `docs/STATUS.txt` with a redirect stub.
- [x] Updated `docs/archive/historical/README.md` index.
- [x] Governance rationale recorded in ADR-024.

---

### DOC-022: prompt-library v0.2.0 duplicate section drift
**Issue Description:** Two differently titled v0.2.0 prompt-library sections were maintained in close sequence (`Overhaul & Polish` vs `Polish & Physics Overhaul`), which created parallel active guidance, duplicate search hits, and unnecessary merge-conflict risk during docs-only sprints.

**Step-by-Step Improvement Recommendations:**
1. Keep one canonical active heading for the v0.2.0 prompt set in `docs/PROMPT_LIBRARY.md`.
2. Archive superseded section variants under `docs/archive/historical/legacy-imports/` (no deletes).
3. Add a short canonicalization rule in `docs/PROMPT_LIBRARY.md` to prevent future parallel active copies.
4. Log the governance decision in ADRs so future sessions can follow a stable policy.

**Completion Checklist:**
- [x] Canonical active section retained as `## v0.2.0 Overhaul & Polish Prompts`.
- [x] Superseded duplicate variant archived as `docs/archive/historical/legacy-imports/prompt-library-v0.2.0-polish-duplicate-section-2026-07-15.md`.
- [x] Canonicalization note added in `docs/PROMPT_LIBRARY.md`.
- [x] Governance rationale recorded in ADR-030.

---

<a name="cr-findings-2026-07-14"></a>

## CR-001–CR-013: Code Review Findings (2026-07-14)

A senior-engineer pass over the main branch surfaced the following issues. **No code changes were applied in that original review session;** they were queued as a fix backlog. Each maps to the files/line ranges reviewed.

**Update 2026-07-14 (Sprint A — Stability & Security Pass):** CR-002, CR-003, CR-005, CR-008, CR-010, and CR-012 were re-verified against current source before writing any fix. All six were **already resolved** — by intervening commits between the original review and this pass (`7fe645a "fix(game): runtime safety..."` fixed CR-002/003/008/012/013/007; the mobile-touch-controls refactor obsoleted CR-010 entirely) — not by new code in this sprint. See each row's Notes column for the exact evidence, and the SESSION_LOG entry dated 2026-07-14 ("Sprint A") for the full verification trail. No source changes were made this sprint; this table update is the sprint's only diff.

**Update 2026-07-14 (Stability & Security Pass, round 2):** CR-004 and CR-007 were checked and found already fixed (CR-004 already try/catch-wrapped; CR-007 already throws on invalid weight, confirmed by reading the code rather than trusting `7fe645a`'s commit message as Sprint A had left it). **CR-013 and CR-009 were checked and found only partially fixed / not fixed**, and both got real new code this round: CR-013's existing fallback UUID generator produced a string the backend's strict `uuid.UUID` Pydantic field would reject, silently breaking persistence for any client without `crypto.randomUUID`; CR-009 had two independent Tab/KeyI listeners (verified low practical risk via a code trace, but not actually consolidated) — now reduced to one. See each row's Notes column and the dated SESSION_LOG entry for full evidence.

**Update 2026-07-14 (Documentation governance sync):** No new CR findings were introduced in this docs-only pass. This file was reviewed for consistency with the latest verified code/test state; statuses remain unchanged from round 2 (open: CR-001/006/011, fixed: 10 of 13 total).

**Update 2026-07-14 (Deep-Dive Logic Remediation sprint):** Added CR-014 through CR-022 from the latest audit. Immediate logic patches were applied for CR-014 (StartMenu stale activation path), CR-015 (burn DoT victory-frame guard), CR-017 (mech X clamp), and CR-018 (`respawnHoldT` reset on respawn). Remaining new findings are logged as open backlog items pending dedicated fixes.

| ID | File(s) | Issue | Severity | Notes |
|---|---|---|---|---|
| CR-001 | `lib/game/asset-url.ts`, `next.config.mjs` | `assetUrl()` reads `process.env.NEXT_PUBLIC_BASE_PATH`, but `next.config.mjs` only sets `basePath` and never writes `NEXT_PUBLIC_BASE_PATH`, relying on external injection. | Medium | Works in CI because `deploy.yml` injects it; local dev without it defaults to `''`. Not in this sprint's scope — still open. |
| CR-002 | `lib/game/save-client.ts`, `lib/game/game.ts` | ~~`loadFromServer()` casts the server response and `localStorage` payload without schema validation.~~ | Medium | ✅ **Fixed (verified 2026-07-14).** `Game.applySaveData()` (`lib/game/game.ts` ~line 1876) validates every field before applying: `isWeaponInstance()`/`isGameFlags()` type guards reject malformed `weapon`/`secondary`/`flags`; `level`/`xp`/`xpToNext`/`hp`/`coins`/`shopAtkBonus`/`px`/`py` are all range-clamped via `clampNumber()`; `upgrades` entries are filtered through `isUpgradeId()`; `visitedRooms` is filtered to known room ids. Wrapped in try/catch, returns `false` (save rejected, not applied) on any failure. A corrupted/tampered save cannot be restored verbatim — it is rejected or sanitized field-by-field. |
| CR-003 | `lib/audioManager.ts`, `lib/game/game.ts` | ~~Repeated construction of `AudioManager` leaks `AudioContext` instances instead of reusing or closing the prior context.~~ | Medium | ✅ **Fixed (verified 2026-07-14).** `AudioManager.close()` (`lib/audioManager.ts` line 99) stops all loops, closes the `AudioContext`, and nulls the reference. `Game.destroy()` (`lib/game/game.ts` line 498-502) calls `void this.audio.close()`, and `GameCanvas.tsx`'s mount `useEffect` cleanup (line 118-124) calls `game.destroy()` on every unmount/remount. No leak path found. |
| CR-004 | `components/GameCanvas.tsx` | ~~Fullscreen `requestFullscreen()` / `exitFullscreen()` promises are not caught, so a blocked call can throw an uncaught rejection.~~ | Low | ✅ **Fixed (verified 2026-07-14).** `toggleFullscreen()` (`components/GameCanvas.tsx` line 164-177) wraps both `await document.exitFullscreen()` and `await viewport.requestFullscreen()` in a single try/catch, functionally equivalent to `.catch(() => {})` on each — a denial/rejection from either call is silently swallowed, matching the existing comment ("Fullscreen can be denied by browser policy or embedding context"). |
| CR-005 | `components/GameCanvas.tsx` | ~~The `Game` instance is destroyed and recreated on every React render of the parent, losing transient state.~~ | Medium | ✅ **Verified not reproducible (2026-07-14).** The `Game` constructor lives inside a `useEffect` gated by `[onSnapshot, continueFromSave, seedOverride]` (`components/GameCanvas.tsx` line 79-125), not the render body. In `app/page.tsx`, `onSnapshot={setSnapshot}` is a React `useState` setter (referentially stable across renders by React's own guarantee); `continueFromSave`/`seedOverride` are primitive `useState` values compared by value. None of the three change on an ordinary re-render (e.g. the frequent `setSnapshot()` calls during gameplay), so the effect — and the `Game` instance — does not re-run/recreate on every render. |
| CR-006 | `components/HUD.tsx`, `GameHeader.tsx`, `GameFooter.tsx`, `GameHudOverlay.tsx` | Dead/duplicated HUD path: old `HUD.tsx` overlay still exists alongside the newer header/footer/HudOverlay components. | Low | Not in this sprint's scope — still open. |
| CR-007 | `lib/game/rng.ts` | ~~`Rng.weighted()` silently returns `undefined` when total weight is zero.~~ | Low | ✅ **Fixed (verified 2026-07-14, not just trusted from the commit message).** `Rng.weighted()` (`lib/game/rng.ts` line 93-105) throws `"Rng.weighted: empty entries"` for an empty entries array and `"Rng.weighted: total weight must be > 0"` when the summed weight is zero, negative, or non-finite — chose "throw" over "return a default" from CR-007's two suggested options, a valid resolution. Also has a safe floating-point-rounding fallback (returns the last entry) if the weighted loop somehow doesn't return early. |
| CR-008 | `lib/game/loot-client.ts` | ~~Loot fetch has no timeout, so a hanging Python service can stall the game.~~ | Medium | ✅ **Fixed (verified 2026-07-14).** `fetchLootRoll()` (`lib/game/loot-client.ts`) uses `withTimeout(3000)` (`AbortController` + `setTimeout`) and merges it with any caller-supplied signal via `mergeSignals()`, so a hanging python-service request aborts after 3s regardless of caller behavior. |
| CR-009 | `components/GameCanvas.tsx`, `lib/game/game.ts` | ~~Menu input is handled in two layers (`GameCanvas` polls `input.menu` and `Game`/`InputManager` also flushes it), risking double-toggle or missed presses.~~ | Low | ✅ **Fixed (2026-07-14).** `Tab`/`KeyI` were independently bound in both `InputManager` (the `"inventory"` action, consumed in `Game.update()` to toggle the in-canvas `inventoryOpen` overlay) and `GameCanvas.tsx`'s own raw keydown listener (driving the React `GameMenuModal`). Traced the actual risk: React's handler runs synchronously off the native keydown event, and `setUiModalOpen(true)` early-returns in `update()` before the inventory-toggle line - so the React modal always won in practice, and `input.ts`'s `"inventory"` action has no gamepad binding either, making `Game.update()`'s handling of it unreachable dead code. Removed that block so `GameCanvas.tsx` is the sole owner of `Tab`/`KeyI`; `inventoryOpen`/`drawInventoryOverlay()` left in place (still forced `false` by `setUiModalOpen(true)`) rather than torn out. Also removed a related anti-pattern: `setMenuOpenSynced()` called `setUiModalOpen()` as a side effect inside a `setState` updater, redundant with the existing `useEffect(() => game.setUiModalOpen(menuOpen), [menuOpen])`, now the single call site. Live-verified: Tab opens/closes the modal cleanly, no flicker or reopen, zero console errors. |
| CR-010 | `lib/game/touchInput.ts` | ~~`consumeTacticalFrame()` mutates `InputManager.state` directly instead of returning a delta.~~ | Low | ✅ **Fixed/obsoleted (verified 2026-07-14).** `consumeTacticalFrame()` (`lib/game/touchInput.ts` line 258-266) no longer touches any shared state — it returns a constant, empty `TacticalTouchFrame` (`{ tap: null, panDelta: null, zoomDelta: 1, quickSlotAction: null }`). Comment: "Tactical mode is deprecated; keep this method for compatibility with Game." A later mobile-touch-controls refactor removed the mutation entirely rather than converting it to a delta-return, a stronger fix than the original suggestion. |
| CR-011 | `lib/game/save-data.ts` | `buildSaveData()` returns mutable references for nested objects (`weapon`, `upgrades`, `visitedRooms`). | Low | Not in this sprint's scope — still open. |
| CR-012 | `lib/game/game.ts` | ~~`drawRunSummary()` and `drawOverlay()` mutate `ctx.textAlign` without `save()`/`restore()`, leaking canvas state.~~ | Low | ✅ **Fixed (verified 2026-07-14).** Both `drawRunSummary()` (line 2624-2664) and `drawOverlay()` (line 2666-2679) open with `ctx.save()` and close with `ctx.restore()`, bracketing every style mutation including `textAlign`. Confirmed via `git blame` this was NOT present when the CR review was written (the original ADR-017 commit `03e880d` manually reset `ctx.textAlign = "left"` instead, a weaker fix that didn't restore `fillStyle`/`font`) — commit `7fe645a` replaced that with proper save/restore. |
| CR-013 | `lib/game/player-identity.ts` | ~~`getOrCreatePlayerId()` silently gives up and returns `''` if `crypto.randomUUID` is unavailable.~~ | Low | ✅ **Fixed (2026-07-14) — the existing fallback was checked, not just trusted, and found incomplete.** A fallback already existed but produced `"fallback-<hex>-<hex>"`, which is not valid UUID syntax; `python-service/main.py` declares `client_uuid: uuid.UUID` (a Pydantic field), so every `/players/register`, `/save`, and `/load` call from a client without `crypto.randomUUID` (old browsers, or an insecure/non-HTTPS context) would be silently rejected by FastAPI's validation, permanently stuck in client-fallback/degraded mode with no indication why. New `fallbackUuidV4()` (`lib/game/player-identity.ts`) generates real RFC 4122 v4 syntax via `Math.random()`; `getOrCreatePlayerId()` also now heals a previously-stored invalid legacy ID rather than reusing it forever. 8 new vitest cases (`player-identity.test.ts`) cover format validity, version/variant nibbles, uniqueness, and the legacy-ID-healing path. |
| CR-014 | `components/StartMenu.tsx` | Start-menu activation path relied on a potentially stale menu closure/reference while click/key/gamepad events update selection state. | Medium | ✅ **Fixed (2026-07-14).** Activation now dispatches by explicit index (`activateMenuIndex(index)`) with `menuItems` stabilized via `useMemo`; click handler passes the clicked index directly, avoiding stale-closure activation mismatches. |
| CR-015 | `lib/game/game.ts` | Burn DoT kill could allow same-frame enemy processing after boss death/victory transition. | High | ✅ **Fixed (2026-07-14).** In `updateEnemies()`, burn tick now snapshots phase before damage and returns early if burn-kill flips from `playing` to `victory`, preventing additional enemy/projectile-side processing in that frame. |
| CR-016 | `lib/game/game.ts` | Loot seed stream collision risk between kill-drop and shop purchase counters in older flow. | Medium | ✅ **Fixed earlier (verified 2026-07-14).** Separate counters are in use: `dropLootCounter` (`* 7919`) and `shopLootCounter` (`* 104729`), with independent seed sequences. |
| CR-017 | `lib/game/game.ts` | Mech AI horizontal drift had no explicit bounds clamp and could slide beyond visible room bounds. | High | ✅ **Fixed (2026-07-14).** Added clamp in mech branch: `enemy.x = Math.max(0, Math.min(enemy.x, VIEW_W - enemy.w));`. |
| CR-018 | `lib/game/game.ts` | `respawnHoldT` charge leaked across death/respawn path. | High | ✅ **Fixed (2026-07-14).** `respawn()` now clears hold charge with `this.respawnHoldT = 0;`. |
| CR-019 | `components/GameCanvas.tsx` | `onSnapshot` dependency fragility may recreate game instance if callback identity is unstable in future refactors. | Medium | 🟡 Open — current callsite is stable (`setState`), but guardrails/tests should be added if callback wrapping changes. |
| CR-020 | `components/StartMenu.tsx` | Daily relic rotation day-of-year can drift around timezone/day-boundary edges (off-by-one behavior). | Low | 🟡 Open — not a gameplay blocker; consider UTC-normalized day key. |
| CR-021 | `lib/game/game.ts` | `applyLoot()` can trigger overlapping save checkpoints (equip-trigger save plus nearby transition-trigger save), causing redundant writes. | Low | 🟡 Open — functionally correct but noisy/duplicative; candidate for save debouncing/coalescing. |
| CR-022 | `components/GameCanvas.tsx` | `touchCapable` checks are duplicated across guards/paths, creating maintenance drift risk. | Low | 🟡 Open — consolidate to one derived capability source. |
| CR-023 | `lib/game/world.ts` | A handful of rooms (`R06` row 16, `R07` row 9, `R12`/`R16`/`R24` row 16, `R20` row 19) have a single interior row missing its left and/or right border-wall tile, found via a headroom-clearance audit run while widening doors for the Space Marine Overhaul (ADR-025, re-confirmed round 2 in ADR-026). | Low | 🟡 Open — pre-existing, predates both Space Marine rounds (not caused by either hitbox change - re-checked at 24x44, still there, still not worse). The gap creates a 1-tile-wide pocket that's very likely unreachable in normal play (the row is otherwise open with no floor beneath most of its width, so a player can't walk to it - the only path in would be a pixel-perfect fall onto a 16px-wide edge ledge). `R20` also has a second, similar borderless row (12-13) that's unrelated to its actual `right` exit (which uses a different row entirely and has full clearance - confirmed via headroom audit, not flagged). Not fixed here: out of scope and low-confidence that it's actually reachable; flagged for a dedicated pass if it turns out to matter. |

---

## Verification & Final Sign-Off Protocol

Before marking any task as complete in the dashboard above, the engineer or AI agent MUST execute the following terminal commands and attach actual output evidence to the project session logs:

1. **Type & Syntax Check:**
   ```bash
   npx tsc --noEmit