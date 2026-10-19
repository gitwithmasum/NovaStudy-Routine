# NovaStudy v3.5 — Course & Notes Manager

This release is additive. **It does not migrate or replace** `novastudy_state_v1`, the original Subjects library, routines, tasks, exams, revision, challenge data, or cloud backup tables.

## Teacher
1. Open **Course & Notes Manager** from the sidebar (mobile: **Courses**).
2. Sign in to Google from NovaStudy.
3. Select **+ Add Course** and enter a course title and description.
4. Copy the **Student join code** on the course page and share it privately.
5. Create chapters and topics; type topic notes and attach PDF, JPG, PNG, or WEBP files (10 MB max per file).
6. Open **Homework & Submissions**, select the course, enter the assignment title/instructions/deadline, and publish.
7. View enrolled students and their answer, submission time, and attachments below the relevant assignment.

## Student
1. Open the same NovaStudy app and sign in **with your own Google account**.
2. Select **Join Course**, paste the teacher's join code, and supply a display name.
3. Read shared notes under chapters/topics.
4. Select **Homework & Submissions**, enter your response, optionally attach one PDF/image, and submit.
5. The current submission can be edited and resubmitted. Teacher and student accounts see the same server record.

## Data separation & privacy
- Shared classes, chapters, topics, assignments, and submissions are in **Supabase**. Offline editing is **not** supported for this module.
- Files go to the **private** `novastudy-learning` Storage bucket; file viewing uses short-lived signed links.
- Database Row Level Security restricts Course changes to the course owner, course reading to enrolled students, and student submissions to the respective student and course owner. A short, server-generated join code is checked by the `ns_join_course` function.
- A teacher can remove a student from the enrollment list. Previously submitted records remain in the database until deleted through retention/administration workflows.
- Students must be signed in; accounts cannot share one browser session to simulate teacher and student at the same time. Use separate browser profiles for verification.
- Existing personal Cloud Backup is unchanged. Shared course data is **not** bundled into local JSON exports or restored by those exports.

## Release QA
- Use **two distinct Google accounts** to check teacher create → student join → assignment publish → student submit → teacher read → student resubmit → teacher refresh.
- Test JPG/PDF uploads, oversized file rejection, invalid code, membership removal, and unauthorized reads under separate accounts.
- Verify Cyber/Black & Gold, mobile and desktop navigation, and staged PWA update.
- The GitHub workflow checks source syntax, regression tests, and static PWA asset caching.
- The live Supabase schema was applied to the NovaStudy project's database on 2026-10-17. Be careful not to point another project's credentials at this database.

## Known limitations
- One uploaded file can accompany each homework submission; multiple chapter/topic note attachments are supported.
- This module currently has no offline course edit or offline submission queue.
- Course content and submissions are not included in existing JSON backup/restore.
- Email notifications, grading, comments, and student-specific homework allocation are not implemented in this release.

## v3.5.2 — Chapter, topic and written-note management
- Course owners see **Edit Chapter**, **Delete Chapter**, **Edit Topic** and **Delete Topic**.
- Existing written topic notes are read-only by default with explicit **Edit Notes** and **Delete Notes** controls. Blank notes show **Add Notes**.
- Delete confirmations identify affected topic and file counts. Chapter deletion cascades to its topics, note text and file metadata. Topic deletion cascades to its note text and attached file metadata. Private Storage cleanup is attempted after the database operation.
- Deleting only written notes clears the \`body\` field; it **does not** delete the topic, chapter, or uploaded files.
- Only the course owner can modify this content; students can read it.
- Existing routine, tasks, exams, homework, enrollment, and personal backup are preserved.

## v3.5.3 — Compact contextual title-row controls
- Chapter **Edit** and **Delete** buttons now live at the far right of the chapter title, outside the native disclosure summary, preserving independent click and keyboard behavior.
- Topic and written-note headings place short **Edit** and **Delete** buttons at the right, with spacing and compact responsive sizing.
- Button names include longer, screen-reader-only contextual labels; no database schemas or student files are changed.
- When notes are empty, the only note action is **Add**.

## v3.5.4 — Chapter actions always visible
- Chapter heading now has a true two-part flex layout: an accessible expand/collapse button and an adjacent independent Edit/Delete button group.
- The buttons are in the chapter's top-right on desktop and mobile, even when the chapter is collapsed. Topic count and title remain visible in the left heading.
- Expanded chapter content is controlled with aria-expanded, aria-controls and the hidden attribute.
- No academic data, course ownership permissions, or student submissions were modified.

## v3.5.5 — Teacher course header tools
- The course header places **Join Code**, **Enrolled Students (count)**, and **Refresh** together in that order at the top-right, with consistent gaps on desktop and mobile.
- The first two buttons are visible only to the course owner. Join Code opens a copyable invite code. Enrolled Students opens the enrolled list and Remove action.
- Only one information panel is expanded at a time; they are hidden by default. The former always-visible code box and native members disclosure are removed.
- The owner-only controls never appear for signed-in enrolled students; all RLS permissions remain unchanged.

## v3.5.6 — Profile Settings utility consolidation
- Desktop sidebar and mobile navigation show **Course & Notes Manager** and **My Profile & Settings** as before, but no longer list Reminders, App Diagnostics, or Backup & Data Portability as primary routes.
- **My Profile & Settings** has a responsive **Tools & utilities** card group with exactly those three options. Each opens its existing full-featured utility page; direct hash routes stay supported for bookmarks and recovery.
- Profile Settings is highlighted in navigation when a utility route is open. The notification bell in the topbar remains an alert shortcut.
- Existing reminder preferences, academic profile, UI settings, backup and restore, exams, routines, course data and Cloud backups are preserved.

## v3.5.8 — Side-by-side Account & Cloud Services cards
- Profile & Settings → Account & Cloud Services presents four selectable cards like Tools & Utilities: Google Account, Google Account Cloud Backup, Smart Sync v2.2, Automatic Sync v2.2.
- The desktop layout is 4 columns, medium screens 2 columns, and mobile a vertical stack. The currently selected card is highlighted and exposes its complete existing controls below.
- Only the selected detail panel is rendered; changing cards does not modify any existing cloud, authentication, smart sync or local user data. Defaults to Google Account on a fresh page load and preserves selection during in-app renders.
- The four original modules, event handlers, privacy controls, and update semantics are unchanged. Bilingual labels and accessibility attributes are preserved.


## v3.6.4 — Any File and Folder upload (20 MB)

- Owners can upload PDF, code, ZIP, docs, images, or any binary type to chapter and topic notes. The single-file limit is 20 MiB (20 × 1024 × 1024 bytes). Existing uploaded materials remain intact.
- Separate folder picker accepts at most 10,000 files and at most 20 MiB aggregated; browser-side uncompressed ZIP preserves subfolder paths and also must fit 20 MiB including overhead. Empty directories cannot be reconstructed.
- Replacing an existing note attachment and student homework attachment also accept a single arbitrary file up to 20 MiB.
- The private Supabase `novastudy-learning` bucket must permit all MIME types and 20 MiB. Existing RLS and course membership restrictions remain in place. HTML/scripts and unknown MIME types use `application/octet-stream` and download links; PDF and common images can still preview.
- Files are stored in private cloud storage rather than local IndexedDB. Signed links expire, existing cleanup/deletion behavior is retained, and ZIP creation happens in the browser with no external ZIP service.
- Verify folder uploading in a Chromium browser with directory selection support; test server-side bucket size/mime policy, signed links, boundary conditions and a storage quota rejection.
