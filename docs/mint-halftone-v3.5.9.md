# NovaStudy v3.5.9 — Mint Halftone Theme

## Design
- Third appearance option: **Mint Halftone** (light/white canvas and mint-green dotted wave background).
- Inspired by the supplied screenshot's wave geometry and palette, but the original mockup labels and editor controls are **not** embedded in the image.
- The background artwork is a clean, scalable local SVG at `assets/mint-halftone-waves.svg`, applied as a full-viewport background with a white overlay and translucent page UI.
- Reading contrast uses dark teal text on light panels; desktop sidebar, navbar, cards, input fields, modal, alerts, Course & Notes Manager, and mobile navigation are styled.
- Theme previews use a three-column gallery on desktop, two on tablets, one on narrow phones.

## Use
Go to **My Profile & Settings → Data & notifications → Choose your theme → Mint Halftone**.
The top-right Theme button cycles Cyber → Black Gold → Mint Halftone → Cyber.

## Data and compatibility
- Existing Cyber/Black & Gold themes and all academic/course data stay unchanged.
- Browser theme preference remains stored under `novastudy_theme_v1`; only a new valid value `halftone` is added.
- Combined JSON backup/restore validates `halftone` alongside existing `cyber` and `gold` choices.
- Theme preference switches are synchronized across tabs by the existing browser storage event.
- The new SVG and CSS are cached for the installed PWA (the app still requires an update/reload to install the new shell).

## Verification
- Tests check gallery selection, startup restoration, local storage persistence, PWA asset presence, backup validation, and CSS coverage for app shell, sidebar, and study panels.
- Manual review is still recommended for Chromium/Android and all modules, especially viewport-sized wallpaper and small-screen reading contrast.
