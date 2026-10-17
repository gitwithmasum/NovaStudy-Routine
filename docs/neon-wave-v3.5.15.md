# NovaStudy v3.5.15 — Neon Wave Theme

Neon Wave is an optional fourth appearance theme inspired by the cyan-and-magenta curved-line reference.

## Performance design
- Uses a single local vector image `assets/neon-wave.svg` (~21 KB, 117 simple static wave paths) instead of a large raster.
- There are no image animations, CSS blur filters, backdrop filters or fixed-background painting for the new theme.
- The full app background fills the viewport; sidebar, topbar, cards, course manager and forms use dark readable surfaces.
- Gallery layout has four columns on wide screens, two on tablets, one on small screens.

## Data safety
- Existing Cyber, Black & Gold and Mint Halftone themes are preserved.
- Theme is stored under the existing `novastudy_theme_v1` key, with valid `neonwave` added to settings, cross-tab behavior and JSON backup validation.
- Academic, course, note, reminder and cloud data structures are untouched.

## QA
- Regression tests cover picker options, theme state, language labels, backup validation, static SVG complexity, PWA cache references and old theme preservation.
- Mobile/desktop manual scroll FPS still needs device-level verification.
