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
