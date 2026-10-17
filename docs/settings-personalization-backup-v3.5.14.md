# NovaStudy v3.5.14 — Remove duplicate Backup controls from Personalization

- **My Profile & Settings → Tools & Utilities → Personalization** no longer displays the browser-only storage warning or the **Export JSON backup / Import backup** controls.
- Theme selection (Cyber, Black & Gold, Mint Halftone), language preference and UI display/accessibility settings remain.
- The separate **Backup & Data Portability** utility retains its combined JSON export/import, validation preview and restore/confirm controls.
- Backup exports remain possible through the existing dedicated utility. None of the existing user data, course materials, profile, study plans or login settings were changed.
- Regression tests verify the warning/export/import are absent from Personalization and that the dedicated Backup module remains accessible.
- PWA/cache and footer version updated to `3.5.14` for reliable refresh.
