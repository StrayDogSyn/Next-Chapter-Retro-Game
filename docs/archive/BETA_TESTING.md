# Beta Testing

**Live now (latest documented target):** **https://straydogsyn.github.io/Next-Chapter-Retro-Game/**

**Current milestone build:** **v0.2.0**, titled **RetroVania | Rogue-like Platformer** in browser metadata and on the canvas start screen. The footer loads the square StrayDog Syndications stencil watermark beside the version.

The intended production path is Python backend (Render) + Neon persistence,
with loot and saves routed through the service when reachable (ADR-009).
If the backend is briefly unreachable (for example a cold start after idle),
the game runs in **degraded mode**: client-side loot rolls and browser-local
saves only, by design (ADR-003/ADR-009) - not a bug. The
HUD's status chip (top-right, next to the seed/menu buttons) shows
"online" vs "offline mode" so you can tell which mode you're in at a
glance; hover it for the raw `lootSource`/`saveSource` values.

## What we're testing

- **Feel:** movement, jump timing (coyote time / jump buffering), combat
  weight, whether hits/knockback read as satisfying or floaty.
- **Difficulty:** is the pacing across the 24 rooms / 5 zones reasonable,
  are any fights spike-y or trivial, does loot progression feel earned.
- **Save reliability:** does "Continue Game" actually resume where you left
  off (room, HP, coins, level, equipment)? Save triggers on room transition,
  level-up, and equipping new gear (not on every pickup) — see ADR-010 for
  the full trigger map and why death itself doesn't save.
- **Death/respawn:** dying sends you back to the starting room with your
  level/gear intact (not a full reset) - does that feel fair, or should more
  of a "checkpoint" model be considered?

## Known limitations

- **Start-screen visual verification is pending a fresh deployed capture.** Source now uses a full-bleed container, one-line fitted RetroVania title, and square watermark, but testers should report any remaining top/bottom bands, clipped title text, or missing branding at their viewport size.
- **Touch controls are beta-quality.** Mobile now uses Pointer Events with a
  persisted touch-controls mode toggle (`auto`/`on`/`off`). `auto` reveals on
  first touch and may suppress while physical inputs are active. Report
  misfires, accidental browser gestures, mode confusion, and orientation-
  specific layout issues.
- **Cold-start delay (once hosted):** the Python backend will run on a free
  hosting tier that sleeps after ~15 minutes idle. The *first* loot roll or
  save after a period of inactivity may take several seconds while it wakes
  up - the game should keep playing in client-fallback mode during that
  window, not freeze.
- **Storage-clearing orphans your save.** Identity is an anonymous UUID in
  `localStorage` (no accounts) - clearing site data or switching browsers
  starts a fresh run. This is intentional for the beta (ADR-009), not a bug.
- **One save slot.** Starting a new run overwrites the previous save, both
  locally and on the server.
- **Hero sprite (2026-07-14, ADR-020):** Player character was swapped to
  `char-sheet-alpha.png` (swm "Super Dead Space Gunner" kit, CC-BY 4.0 Emcee
  Flesher). The sheet contains only a run+aim-angle sweep — idle/jump/crouch/
  hurt/death clips are single-frame aliases, not authored animations. The
  `diewhirl-sheet-alpha.png` death-VFX candidate has an unresolved license
  date discrepancy (baked-in label: OGA-BY 3.0+, 2023; listed under a 2021
  CC-BY 4.0 page) — not used for the death clip. Report any visual artifacts
  in the hero's walk/idle/jump rendering, or skin-variant palette mismatches.

## Filing a bug

Include, if visible:
- **Version** (`v0.2.0` milestone + short commit SHA chip shown in runtime footer as `v<sha>`)
- **Seed** (death screen, or the "seed" button in the HUD - copies to
  clipboard)
- **Room** you were in
- **Browser** + OS
- **Online/offline mode** (the HUD status chip's current state)
- What happened vs. what you expected

File it as a [GitHub Issue on this repo](https://github.com/StrayDogSyn/Next-Chapter-Retro-Game/issues/new/choose) using the "Beta bug report" template.

## Sharing a seed

The death/run-summary screen and the HUD's "seed" button both expose the
current run's seed phrase (e.g. `WOLF-4207`) - copy it and share it if you
want someone else to compare notes on the same loot/combat sequence.

The start menu also supports **Daily Seed** (a shared seed for the calendar day)
and **Enter Seed** (paste any seed phrase to replay it). Daily seed attempts are
recorded in `localStorage` as `ncrg:dailyAttempted`, but the mode is
informational — replaying your daily seed is always allowed.

## Code review backlog (not blockers, but worth knowing)

The 2026-07-14 senior-engineer pass originally reported 13 findings, with a
later deep-dive extending the tracked set to CR-023. Most were fixed and
re-verified in follow-up passes; as of the latest docs sync (2026-07-15),
the remaining open items are:

- Base-path configuration coupling (`assetUrl()` depends on
  `NEXT_PUBLIC_BASE_PATH` injection) — CR-001.
- Legacy/duplicated HUD path (`HUD.tsx` alongside current HUD components) — CR-006.
- `buildSaveData()` returns mutable nested references (`weapon`, `upgrades`,
  `visitedRooms`) instead of defensive copies — CR-011.
- `GameCanvas` callback/input maintenance-risk items (CR-019, CR-022).
- Time/day-boundary and save-write hygiene follow-ups (CR-020, CR-021).
- Minor border-wall consistency artifacts in selected rooms from world audit (CR-023).

Full details, severity ranking, and verification notes are tracked in
[docs/BUGS_IMPROVEMENT_GUIDE.md](BUGS_IMPROVEMENT_GUIDE.md#cr-findings-2026-07-14).
