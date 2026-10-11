# NovaStudy v3.2 — Manual Mobile Release Checklist

This checklist is for **hands-on QA**. GitHub Actions static checks and Node benchmarks do **not** verify real Chrome/Safari PWA, Web Vitals, touch usability or WCAG compliance.

## Before testing
- [ ] On each origin (Vercel, GitHub Pages, Netlify) export **Routine JSON**, **Learning Hub JSON** and **Focus Insights JSON** separately; confirm file downloads.
- [ ] Note the displayed release and keep a copy of any local data. Different origins have independent browser storage and are **not** interchangeable.
- [ ] Test without personal production data where possible. Do not uninstall the app or clear storage before saving backups.

## Browsers and viewports
- [ ] Android Chrome: 360 × 800, 393 × 852, 412 × 915; portrait and landscape.
- [ ] Android installed PWA: fresh install and already-installed v3.1 upgrading to v3.2.
- [ ] iPhone Safari: 375 × 812 or similar; add to Home Screen and open standalone (if available).
- [ ] Desktop Chrome/Edge: 1280 × 720; keyboard-only navigation; narrow viewport 768 × 1024.
- [ ] Optional: Firefox on desktop, Android high font scaling (150–200%).

## PWA offline and update recovery
- [ ] Load v3.2 online, then enable airplane mode and reload: dashboard, Tasks, Focus and CSE Hub appear from cache.
- [ ] Confirm previous saved subjects, exams and challenge progress remain after offline reload.
- [ ] With v3.1 installed and in use, deploy v3.2; verify **Update and reload**, **Later**, **Retry update** and **Export routine backup** are accessible.
- [ ] With an editor containing unsaved changes open, tap Update: decline confirmation and confirm editor remains; accept to discard unfinished edits and install.
- [ ] Choose Later: app remains usable. Restart later while online: upgrade can be offered again.
- [ ] Temporarily interrupt a new release download (airplane mode) while v3.1 is running: previous cached app should remain usable. Restore connection, retry.
- [ ] Complete upgrade: release label shows 3.2.0 and routine data persists; ensure no repeated reload loop.
- [ ] Leave app open across a version release and verify no forced refresh happens without consent.

## Navigation and usability
- [ ] Mobile bottom nav swipes horizontally; active item remains visible; safe-area padding respects gesture bars/notches.
- [ ] Desktop sidebar independently scrolls with keyboard or mouse; final Settings entry reachable.
- [ ] All tappable controls have usable spacing and do not accidentally activate adjacent controls.
- [ ] Tasks search with 1,000 records keeps typed input and active focus; filters/checkboxes still work.
- [ ] No horizontal document overflow, clipped dialogs, unusable buttons or obscured input fields.
- [ ] Bangla and English labels remain legible at 150–200% text scaling; Cyber and Black & Gold both work.
- [ ] Focus Timer, notifications (foreground only), Dashboard widgets, Exam Prep, Reports and CSE Learning Hub load.

## Accessibility manual checks
- [ ] Tab to **Skip to main content**, activate, and verify the main view gets keyboard focus.
- [ ] Navigate sidebar, menu and dialogs by keyboard; inspect visible focus indicators.
- [ ] Verify meaningful headings/labels and notification/status live announcements with screen reader (TalkBack or VoiceOver).
- [ ] Test 200% browser zoom; no missing essential content or critical controls.
- [ ] Reduce Motion in system settings and NovaStudy settings; avoid unnecessary animations.
- [ ] Verify legible contrast on Cyber/Gold themes with an accessibility contrast checker. Static audit is not WCAG certification.

## Release acceptance record
- Record test date, device/browser/version, domain, viewport, PWA install status, pass/fail, screenshot and steps to reproduce.
- Run `node --test tests/*.test.cjs`, `node scripts/release-audit.cjs` and `node scripts/performance-benchmark.cjs` locally.
- Do **not** claim mobile or Lighthouse score results until real-device/browser measurements are collected.
