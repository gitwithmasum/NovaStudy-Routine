# NovaStudy v3.6.1 — Skills & Modules Workspace

## User workflow
- New **Skills & Modules** tab inside CSE Learning Hub, and clickable Skills cards from Overview.
- Six initial Skills: Programming Practice, DSA & CP, AI & ML, Full Stack, Projects and Resources.
- Add your own skills, rename/edit descriptions, delete a skill, and open any skill for a course-like module view.
- Add, edit, delete and expand/collapse learning modules.
- Each module can contain Topic/Notes, Code snippets and PDF resources. Titles/content can be edited or deleted and each resource can be marked completed. Code displays in a fixed monospace preformatted panel.
- PDFs can be attached by HTTPS link (portable to other devices) or uploaded as local PDFs (maximum 8 MB each). Local uploads are saved in browser IndexedDB `novastudy-skill-pdfs` and downloaded by the resource's local PDF action.
- CSE 100 Challenge, programming practice, AI/Full Stack roadmaps, projects and resources keep their tabs. DSA & CP now has 14 built-in topic modules inside the DSA & CP skill, rather than a duplicate tab. The existing five-state learning statuses remain available inside those modules.

## Storage, data integrity and limitations
- v3.6.1 migrates valid previous Learning Hub records and older imported backups once, preserving existing DSA learning statuses and custom modules. Intentionally removed modules are not recreated.
- Skill and module metadata, notes and source code are stored in the existing validated browser `novastudy_learning_hub_v1` data key. New validation applies to nested Skills, Modules and Items, and **legacy v1 payloads without a Skills field remain valid**.
- Learning Hub JSON export/import and the combined local backup include metadata and source code. **They do NOT contain the bytes of locally uploaded PDFs stored in IndexedDB.** PDF links are portable. Users should retain original PDF files elsewhere for restore or device migration.
- Existing routine, exams, cloud backup, course manager, user identity and CSE 100 state remain unchanged.
- Each Skill allows up to 40 modules, each Module up to 80 resources, up to 48 Skills, a code/note item up to 12k characters, and the Learning Hub metadata storage limit remains 750k characters.
- Local PDF attachments require browser IndexedDB permission/storage quota. On devices without IndexedDB, use an HTTPS PDF link.
- This feature follows the uploaded reference's module list concept, not a copy of the Ostad site or its private course materials.
- No automatic cloud sync or cross-device PDF transfer has been added.

## QA
- Regression tests cover existing default Skills, legacy data, Skill and Module CRUD, Topic/Code/PDF URL items, done statuses, escaped HTML, safe URLs, duplicate skills, deletion confirmation, storage failure and combined backup compatibility.
- Static responsive styles in `learning-hub.css` maintain the existing Cyber, Black & Gold, Mint Halftone and Neon Wave themes.
- Cache/footer version: `v3.6.1`; check installed PWA Update & Reload.
- Manual Android PWA upload/open test and scroll FPS verification remain outstanding.
