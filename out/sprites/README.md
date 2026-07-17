# Sprite Assets Naming Convention

Use 16x16 or 32x32 grid-based pixel art sprite sheets.

Recommended naming:

- `hero-<state>-sheet.png` (example: `hero-idle-sheet.png`)
- `enemy-<type>-sheet.png` (example: `enemy-slime-sheet.png`)
- `tileset-<zone>.png` (example: `tileset-forest.png`)

For the scaffold, `components/GameCanvas.tsx` expects `/sprites/hero-placeholder.png`.
