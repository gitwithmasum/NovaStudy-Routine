# NovaStudy v3.5.13 — Inline Tools & Utilities

## Interaction
- **My Profile & Settings → Tools & utilities** retains four cards: Reminders & notifications, App diagnostics, Backup & data portability and Personalization.
- Clicking one card expands its full existing module directly under the card grid, on the Settings page; clicking it again collapses it.
- Selecting another card closes the first and opens the selected one. All cards are collapsed initially.
- Dedicated legacy `#notifications`, `#diagnostics` and `#portability` routes remain supported for bookmarks and the topbar alert bell, but the Settings cards never navigate to them.
- Changing only the expanded utility updates just the Tools section, not the entire page or hash, and restores focus without scrolling.
- The expanded region uses `aria-expanded`, `aria-controls`, a labelled region and `hidden` when closed.

## Preserved behavior
- Reminders retains local notification preferences/history, unread badge and consent controls.
- Diagnostics retains Run, Copy Report, Download JSON and issue input.
- Backup & Data Portability retains export, import validation/preview, confirm and cancel controls.
- Personalization retains themes, language, local backup, and display settings, with Reminders Preferences absent as requested previously.
- No migration or changes to existing profile, course, notes, homework, routines, exams, cloud data or local backups.

## Verification
- New tests cover all four cards, open/close/one-at-a-time logic, lazy rendering, unchanged module action hooks, keyboard/ARIA markup, scroll-position-preserving partial UI refresh, and unaffected navigation.
- Responsive styles support inline panels on desktop, tablet and mobile.
- PWA cache bumped to `novastudy-v3.5.13`. After deployments complete, refresh the site or select PWA Update & Reload.
