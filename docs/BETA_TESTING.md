# Beta Testing

**Live now:** **https://straydogsyn.github.io/Next-Chapter-Retro-Game/**

The Python backend (loot rolling, save persistence) is hosted on Render
and connected. Loot rolls come from the live service and runs persist to
Neon across sessions/devices via an anonymous per-browser identity (no
account needed) - see ADR-009. If the backend is ever briefly unreachable
(e.g. a cold start after idle - Render's free tier sleeps after ~15
minutes idle, so the very first request after a quiet period can take
30-60 seconds), the game runs in **degraded mode**: client-side loot rolls
and browser-local saves only, by design (ADR-003/ADR-009) - not a bug. The
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
- **Version** (short commit SHA, shown in the footer as `v<sha>`)
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

A 2026-07-14 senior-engineer pass surfaced several low-to-medium issues that do
not stop play but can produce edge-case glitches:

- Loot/save service calls lack a fetch timeout; a very slow or hanging backend
could stall the game briefly before fallback kicks in.
- `localStorage`/server save payloads are cast, not validated — tampering the
JSON could restore impossible state.
- Fullscreen API promise rejections are not caught.
- Repeated `GameCanvas` unmount/remount (e.g. React Strict Mode) leaks
`AudioContext` instances and recreates the `Game` object.

Full details and severity rankings are in
[docs/BUGS_IMPROVEMENT_GUIDE.md](BUGS_IMPROVEMENT_GUIDE.md#cr-findings-2026-07-14).
