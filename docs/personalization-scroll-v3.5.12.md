# NovaStudy v3.5.12 — Personalization & Scroll Performance

## Settings
- My Profile & Settings → Tools & Utilities → **Personalization** replaces the previous "Data & notifications" card.
- The Personalization section still provides theme picker (Cyber, Black & Gold, Mint Halftone), language selector, local JSON export/import and UI display preferences.
- The **Reminder Preferences** panel was removed from this section only. Reminder features and their preferences remain available in **Reminders & Notifications**, with all saved reminder data intact.
- Personalization now lazily generates its detailed UI only while its card is open, avoiding expensive DOM markup when Settings first loads.

## Scroll performance
- Mint background asset was reduced from ~1.03 MB of SVG source with 9,979 ellipses to ~14 KB and 75 dotted wave paths while keeping the white/mint dotted motif.
- Removed fixed background repaint pressure and `backdrop-filter` on large Mint theme surfaces; reduced card shadows.
- Turned off forced smooth window/menu navigation animation and horizontal mobile scroll snapping.
- Disabled dashboard widget entrance animations and lowered panel shadows on narrow screens. Existing list item `content-visibility:auto` remains in place.
- Updated PWA cache to `novastudy-v3.5.12` so refreshed installs receive the new optimized SVG/CSS.

## Verification and limitations
- Static regression checks cover Settings visibility, reminder isolation, SVG complexity, theme parity, layout and asset cache.
- Actual FPS/scroll smoothness varies by GPU/browser/device and should be checked manually on desktop, mobile and installed PWA.
- No changes to stored routine, task, exam, cloud, course, profile or reminder records.
