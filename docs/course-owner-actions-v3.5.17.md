# NovaStudy v3.5.17 — Per-course Edit and Delete

## UI
- In **Course & Notes Manager → My Courses**, selecting any owned course shows **Join Code**, **Enrolled Students**, **Edit Course**, **Delete Course**, and **Refresh** together in its owner header.
- Students / enrolled non-owners see **Refresh** only (no edit or delete controls). Switching courses resets any open editor or delete confirmation.
- **Edit Course** reveals a same-page form pre-filled with title (up to 120 chars) and description (up to 1,200 chars). Save updates that specific course; other courses, join codes, chapters and enrolled students are retained.
- **Delete Course** opens a same-page, cancelable confirmation requiring typing the exact course title. Deletion is not initiated by a single click.
- English and Bangla labels use the existing `tr()` translation helper, with responsive mobile layout and focus rings.

## Backend and Data Safety
- Verified the actual Supabase project's `ns_courses` RLS UPDATE/DELETE policies restrict mutations to `auth.uid() = owner_id`.
- Verified course-level foreign keys have `ON DELETE CASCADE` for enrollments, chapters/topics, assets, assignments and submissions. No migration was necessary.
- The client performs scoped UPDATE/DELETE by course ID and owner ID and rejects non-owner/crafted actions.
- On confirmed deletion, the app first lists stored note and submission file paths, deletes the database course (cascading dependent database records), then attempts Storage cleanup in batches.
- **Storage caveat:** Storage delete policies also depend on the existence of the course or student file ownership. Cleanup after database deletion can fail. The app explicitly warns that stored files may require administrative/manual cleanup rather than silently claiming success. A privileged or queued backend cleanup workflow would be needed for reliable physical file deletion.
- No existing student data or live courses were deleted during development. All tests use simulated in-memory records and authorization.
- Routine, Tasks, Exams, course notes, Google account settings, PWA reliability and other app modules remain otherwise unchanged.

## Verification
- Regression tests simulate multiple courses, owner-only header controls, editing only the selected course, deleting only a named/confirmed course, associated database cascade records, storage-path scope, student denial, and confirmation cancellation.
- The PWA cache and displayed version advance to `3.5.17`. On actual devices, verify manually before performing real deletion.
