# NovaStudy × Masum-Chronos v2.5 integration

## Development-only

This integration is on `feature/chronos-widget-v2.5`; it does not change the production `main` branch until reviewed and merged.

## Features

- Loads the publisher-hosted Chronos widget loader only when the user opens the panel.
- Focus Timer works as a standalone widget and does not read or mutate NovaStudy state.
- Study Stats sharing is **off by default** and requires an explicit checkbox action.
- The only shared snapshot is a bounded list of task titles/completion flags and aggregate **completed focus sessions/minutes** read from NovaStudy's focus timer. Scheduled routine sessions are never misreported as focus sessions. No original IDs, notes, course documents, authentication tokens, Supabase credentials or user profile are passed.
- The pure projection lives in `chronos-widget-data.js`; `tests/chronos-widget-data.test.cjs` checks field minimization, limits, missing data and correct focus totals.
- Data flows from NovaStudy to the Chronos iframe as a read-only snapshot. No two-way sync and no Supabase schema/policy changes.
- Responsive layout, lazy loading, keyboard-operable controls and error status are included.

## Permission model

The host deliberately selects the data fields in `chronos-widget-integration.js`. The widget iframe cannot read NovaStudy localStorage, DOM or JS state. The external widget script is publisher-controlled third-party code and should be reviewed before production release. Uncheck sharing to destroy the stats iframe; use **Refresh shared snapshot** after editing tasks.

## QA checklist

- [ ] Open/close widget panel on desktop and mobile widths.
- [ ] Verify focus timer works while host task data sharing remains off.
- [ ] Confirm stats widget stays hidden until the sharing checkbox is checked.
- [ ] Confirm unchecking sharing destroys the stats iframe.
- [ ] Test offline loader failure and reload while offline.
- [ ] Test signed-out and different-account profiles; no tokens should cross the iframe boundary.
- [ ] Verify NovaStudy task/routine/subjects/exams/cloud data remain unchanged.
- [ ] Run existing NovaStudy regression suite and review CSP/third-party script policy before merge.

This branch is not production deployment approval. Real-device testing and CI must pass before merging.