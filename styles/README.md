# Portal Styles Architecture

These files intentionally separate concerns so future updates are predictable and low-risk.

- `tokens.css`: Design tokens (color, typography, spacing primitives).
- `base.css`: Element defaults and full-page background effects.
- `layout.css`: Structural layout of portal regions and content flow.
- `components.css`: Reusable UI component styling (cards, mascot panel, footer strip).
- `animations.css`: Named keyframes and reduced-motion accessibility overrides.
- `responsive.css`: All breakpoint rules, grouped by viewport width.

## Load Order

Styles are linked in `index.html` in the exact order listed above.
Later files may override earlier files intentionally, especially responsive rules.

## Commenting Standard

Comments should explain *why* a rule exists (purpose/constraint), not restate *what* CSS already states.
Use short section-level comments instead of line-by-line narration.
