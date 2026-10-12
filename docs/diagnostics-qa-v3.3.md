# NovaStudy v3.3 — Diagnostics & Accessibility QA

**Scope:** Manual checklist. Automated diagnostics only inspect browser capabilities; they do not certify WCAG accessibility or test your connection to Google Sync.

## Safe start
- [ ] Export your original Routine, Learning Hub and Focus Insights backups separately before testing on each origin.
- [ ] Update the installed PWA deliberately. Verify footer **3.3.0**.
- [ ] Open **App diagnostics** (mobile bottom nav: **Health**) and choose **Run diagnostics**.
- [ ] Confirm HTTPS, local storage, service worker and offline cache status are truthful on this device. A service worker may be unavailable in private browsing.

## Offline & browser permissions
- [ ] Load once while online, turn on Airplane Mode, reload the installed PWA, and run diagnostics again.
- [ ] Check that Browser connection says browser-reported offline rather than claiming it tested the Internet.
- [ ] Deny browser notification permission: app diagnostics should report denied. It must not prompt for permission when running diagnostics.
- [ ] Confirm no student data changes when re-running the localStorage probe.

## Mobile, keyboard & screen reader
- [ ] Test Android Chrome at 360 and 393 CSS px, mobile PWA, iPhone Safari and standalone iOS (where available).
- [ ] Tab through sidebar, footer, nav and Diagnostics. Check all controls' focus indicators and labels in English and Bangla.
- [ ] Open an Edit dialog using the keyboard; first input should receive focus; on Cancel focus should return to the launching control where it still exists.
- [ ] Press Escape on the native modal and verify it closes; then try another edit. Check keyboard focus returns to useful content.
- [ ] Verify no horizontal document overflow at 200% zoom and 150–200% system font sizes.
- [ ] With reduced motion requested, check the app does not use distracting transitions; test both Cyber and Black & Gold themes.
- [ ] Use TalkBack/VoiceOver to test page headings, checkbox labels, alert status and modal semantics. The built-in checks are only structural.

## Privacy & issue report
- [ ] Run diagnostics; optionally describe a benign bug without credentials or personal information.
- [ ] Copy or download JSON and inspect it. It must not contain your courses, tasks, exam notes, login tokens or browser storage contents.
- [ ] Confirm the report is **not** sent to any server automatically.
- [ ] Close/reopen the Diagnostics page and confirm the issue text is not stored across a browser reload.
- [ ] When an API is blocked (Storage, Notifications, Service Worker), Diagnostics should show warning/unsupported instead of pretending to pass.

Capture device model, browser version, viewport, steps to reproduce and screenshots **manually** for genuine bugs. Do not declare actual mobile/assistive-tech validation completed until the above tests have been performed.
