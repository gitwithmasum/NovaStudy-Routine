# NovaStudy v3.5.16 — Final UI Polish & Performance QA

## Changes (no new features)
- All four existing themes (Cyber, Black & Gold, Mint Halftone and Neon Wave) remain available.
- Theme changes no longer rebuild the entire current view; only theme CSS variables, selected indicators, the topbar label and browser theme color are updated. This reduces unnecessary DOM work, avoids losing unsaved form edits when changing themes, and keeps scroll position stable. The same holds for cross-tab theme changes.
- Theme-aware High Contrast settings now override theme-specific muted text and border tokens *after* theme styles load. The previous cascade made High Contrast less effective on some themes.
- Mobile theme cards have clearer labels and touch targets, and reduced-motion/touch preferences suppress hover translation.
- Long lists of Course & Notes topics can use supported browsers' offscreen paint skipping via `content-visibility:auto` and `contain-intrinsic-size`, without altering records.
- No cloud, authentication, sync, course or existing academic data structures changed.

## Automated checks
- Test harness exercises all four theme choices, validates browser theme persistence, checks the selected aria state, and asserts there was no full-page rerender and unsaved input was retained.
- WCAG AA 4.5:1 text-color checks for base panel text and secondary text on four theme palettes.
- Static asset budgets verify both backgrounds stay below 35 KB and contain a bounded number of simple paths.
- Regression tests check responsive CSS, PWA cached assets, old themes, and existing modules.
- Existing atomic PWA install/activate and rollback tests are retained.

## What is not verified automatically
- Static tests cannot measure actual browser scroll FPS, GPU paint cost, Android PWA behavior or visual screenshots at real screen sizes. These still need interactive/manual validation.
- Test the four themes at narrow phone widths and on Windows Chrome. Check navbar scroll, Settings cards, chapter/topic edits, backup and PWA offline/update.

## Release
Version/cache: `v3.5.16`. GitHub Pages/Vercel deployment and manual testing should be verified separately.
