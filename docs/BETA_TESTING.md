# Beta Testing

**Status as of 2026-07-13: not yet live.** GitHub Pages is not enabled for
this repository yet (`Settings → Pages → Source → GitHub Actions` needs to
be set once), so every deploy has failed at the final "Deploy to GitHub
Pages" step even though the build itself succeeds. The Python backend
(loot rolling, save persistence) isn't hosted anywhere public yet either
(see `docs/DECISIONS.md` ADR-012 - blocked on rotating a leaked database
credential, tracked in `SESSION_LOG.md`'s 2026-07-11 security entry).

**Live URL:** `https://straydogsyn.github.io/Next-Chapter-Retro-Game/` -
placeholder until the above is resolved. This document will be updated
with real status the moment it is.

Once live, the game is expected to run in **degraded mode** at first (no
hosted backend yet): client-side loot rolls and browser-local saves only,
by design (see ADR-003 and ADR-009) - not a bug. The HUD's status chip
(top-right, next to the seed/menu buttons) shows "online" vs "offline mode"
so you can tell which mode you're in at a glance; hover it for the raw
`lootSource`/`saveSource` values.

## What we're testing

- **Feel:** movement, jump timing (coyote time / jump buffering), combat
  weight, whether hits/knockback read as satisfying or floaty.
- **Difficulty:** is the pacing across the 24 rooms / 5 zones reasonable,
  are any fights spike-y or trivial, does loot progression feel earned.
- **Save reliability:** does "Continue Game" actually resume where you left
  off (room, HP, coins, level, equipment)? Save triggers on room transition,
  level-up, and equipping new gear (not on every pickup) - see ADR-010 for
  the full trigger map and why death itself doesn't save.
- **Death/respawn:** dying sends you back to the starting room with your
  level/gear intact (not a full reset) - does that feel fair, or should more
  of a "checkpoint" model be considered?

## Known limitations

- **Desktop-first.** No touch controls; keyboard + Xbox-style gamepad only.
  Mobile/tablet is untested and likely broken - not a bug report unless
  something crashes outright.
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

## Filing a bug

Include, if visible:
- **Version** (short commit SHA, shown in the footer once wired - if you
  don't see one yet, note the approximate date/time instead)
- **Seed** (death screen, or the "seed" button in the HUD - copies to
  clipboard)
- **Room** you were in
- **Browser** + OS
- **Online/offline mode** (the HUD status chip's current state)
- What happened vs. what you expected

File it as a [GitHub Issue on this repo](https://github.com/StrayDogSyn/Next-Chapter-Retro-Game/issues/new/choose) using the "Beta bug report" template.

## Sharing a seed

The death screen and the HUD's "seed" button both expose the current run's
seed phrase (e.g. `WOLF-4207`) - copy it and share it if you want someone
else to compare notes on the same world layout. There is currently no UI
to *enter* a specific seed to replay one; that would be a fast-follow if
testers want it.
