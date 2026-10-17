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
