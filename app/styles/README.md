# Runtime Style Modules

This folder mirrors the same modular strategy used by the portal styles.

- `tokens.css`: Design tokens and shared variables.
- `base.css`: Global element defaults and shared keyframes.
- `layout.css`: Shell, panel, canvas, and viewport structure.
- `hud.css`: HUD and in-run informational overlays.
- `menu.css`: Pause/menu/inventory and controls drawer styles.
- `touch.css`: Touch controls and coarse-pointer responsive rules.
- `start-screen.css`: Intro/start-screen visual stack and seed prompt.

## Import Order

Imported from `app/layout.tsx` in the exact order above so lower layers can intentionally override prior rules where needed.
