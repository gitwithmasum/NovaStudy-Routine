# NovaStudy v3.5.11 — Academic Profile in Account & Cloud Services

## What changed
- **My Profile & Settings → Account & Cloud Services** now includes a fifth card, **Academic Profile**.
- The original Academic Profile form is no longer displayed as a separate card below this section.
- Selecting Academic Profile opens the existing student name, institution, education category, class/year, group/department and week-start fields with **Save profile** unchanged.
- The earlier four account/cloud/sync services retain their existing behavior. The selected service stays active after in-app UI refresh.
- Account services use five columns on wide desktop and adaptive 3/2/1 columns on narrower screens.
- Bangla text and accessible selected-state information are included.

## Compatibility and verification
- Profile persistence continues through the existing `profileForm` submit listener; stored profile, routine, tasks, exams, course notes and backups are not migrated or reset.
- The PWA version advances to `3.5.11` to refresh cached assets.
- Regression tests check that Academic Profile is the fifth service, only one copy of the editable form exists, and the original form fields and save code are intact.
